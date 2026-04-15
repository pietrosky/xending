import type {
  EngineInput,
  EngineOutput,
  MetricValue,
  BenchmarkComparison,
  RiskFlag,
  ModuleGrade,
  ModuleStatus,
} from '../types/engine.types';
import type { TimeSeriesPoint, TrendConfig, TrendResult } from '../types/trend.types';
import { trendUtils } from '../lib/trendUtils';

// ============================================================
// Constants
// ============================================================

const ENGINE_NAME = 'portfolio';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  sector_concentration: 0.30,
  currency_concentration: 0.25,
  group_concentration: 0.20,
  expected_loss: 0.15,
  trend_quality: 0.10,
} as const;

/** Default LGD per Requirement 13 */
const DEFAULT_LGD = 0.40;

/** Benchmarks for portfolio metrics */
const BENCHMARKS = {
  sector_hhi: 1500,
  max_sector_pct: 0.25,
  max_currency_pct: 0.50,
  max_group_pct: 0.20,
  expected_loss_pct: 0.02,
} as const;

/** HHI thresholds */
const HHI_THRESHOLDS = {
  low: 1000,
  moderate: 1500,
  high: 2500,
} as const;

/** Default policy limits (used when policy_config doesn't specify) */
const DEFAULT_LIMITS = {
  sector: 0.30,
  currency: 0.50,
  group: 0.25,
} as const;

// ============================================================
// Input types
// ============================================================

export interface PortfolioPosition {
  name: string;
  sector: string;
  currency: string;
  group: string;
  amount: number;
}

export interface NewLoanDetails {
  sector: string;
  currency: string;
  group: string;
  amount: number;
  pd: number;
  lgd?: number;
  ead?: number;
}

export interface PortfolioPeriod {
  period: string;
  positions: PortfolioPosition[];
  total_portfolio: number;
}

export interface PortfolioInput {
  periods: PortfolioPeriod[];
  new_loan: NewLoanDetails;
}

// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

/** HHI = sum of squared market shares (each share as percentage 0-100, max HHI = 10000) */
export function calcHHI(shares: number[]): number {
  const total = shares.reduce((s, v) => s + v, 0);
  if (total <= 0) return 0;
  return shares.reduce((hhi, share) => {
    const pct = (share / total) * 100;
    return hhi + pct * pct;
  }, 0);
}

/** Aggregate amounts by a grouping key */
export function aggregateByKey(
  positions: PortfolioPosition[],
  keyFn: (p: PortfolioPosition) => string,
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const pos of positions) {
    const key = keyFn(pos);
    result[key] = (result[key] ?? 0) + pos.amount;
  }
  return result;
}

/** Calculate concentration as fraction for a specific key value */
export function calcConcentration(
  aggregated: Record<string, number>,
  totalPortfolio: number,
  key: string,
): number {
  if (totalPortfolio <= 0) return 0;
  return (aggregated[key] ?? 0) / totalPortfolio;
}

/** Calculate post-origination concentration for a key after adding new loan */
export function calcPostOriginationConcentration(
  currentAmount: number,
  newLoanAmount: number,
  currentTotal: number,
): number {
  const newTotal = currentTotal + newLoanAmount;
  if (newTotal <= 0) return 0;
  return (currentAmount + newLoanAmount) / newTotal;
}

/** Expected Loss = PD * LGD * EAD */
export function calcExpectedLoss(pd: number, lgd: number, ead: number): number {
  return pd * lgd * ead;
}

/** Expected loss as percentage of total portfolio */
export function calcExpectedLossPct(expectedLoss: number, totalPortfolio: number): number {
  if (totalPortfolio <= 0) return 0;
  return expectedLoss / totalPortfolio;
}

/** Check if adding new loan breaches a limit */
export function checkLimitBreach(
  postConcentration: number,
  limit: number,
): boolean {
  return postConcentration > limit;
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

/** Sector concentration sub-score (0-100) based on HHI and max sector share */
export function calcSectorConcentrationSubScore(
  sectorHHI: number,
  maxSectorPct: number,
  sectorBreached: boolean,
): number {
  let score = 0;

  // HHI component (50% of sub-score)
  if (sectorHHI < HHI_THRESHOLDS.low) score += 50;
  else if (sectorHHI < HHI_THRESHOLDS.moderate) score += 35;
  else if (sectorHHI < HHI_THRESHOLDS.high) score += 20;
  else score += 5;

  // Max sector share (30% of sub-score)
  if (maxSectorPct <= 0.20) score += 30;
  else if (maxSectorPct <= 0.30) score += 20;
  else if (maxSectorPct <= 0.40) score += 10;
  else score += 0;

  // Breach penalty (20% of sub-score)
  if (!sectorBreached) score += 20;

  return Math.min(100, score);
}

/** Currency concentration sub-score (0-100) */
export function calcCurrencyConcentrationSubScore(
  maxCurrencyPct: number,
  currencyBreached: boolean,
): number {
  let score = 0;

  // Max currency share (70% of sub-score)
  if (maxCurrencyPct <= 0.40) score += 70;
  else if (maxCurrencyPct <= 0.50) score += 50;
  else if (maxCurrencyPct <= 0.65) score += 30;
  else if (maxCurrencyPct <= 0.80) score += 15;
  else score += 5;

  // Breach penalty (30% of sub-score)
  if (!currencyBreached) score += 30;

  return Math.min(100, score);
}

/** Group concentration sub-score (0-100) */
export function calcGroupConcentrationSubScore(
  maxGroupPct: number,
  groupBreached: boolean,
): number {
  let score = 0;

  // Max group share (70% of sub-score)
  if (maxGroupPct <= 0.15) score += 70;
  else if (maxGroupPct <= 0.25) score += 50;
  else if (maxGroupPct <= 0.35) score += 30;
  else score += 10;

  // Breach penalty (30% of sub-score)
  if (!groupBreached) score += 30;

  return Math.min(100, score);
}

/** Expected loss sub-score (0-100) */
export function calcExpectedLossSubScore(expectedLossPct: number): number {
  if (expectedLossPct <= 0.005) return 100;
  if (expectedLossPct <= 0.01) return 85;
  if (expectedLossPct <= 0.02) return 70;
  if (expectedLossPct <= 0.03) return 50;
  if (expectedLossPct <= 0.05) return 30;
  return 10;
}

/** Trend quality sub-score (0-100) based on trend directions */
export function calcTrendQualitySubScore(trends: TrendResult[]): number {
  if (trends.length === 0) return 50;

  const hasCritical = trends.some((t) => t.direction === 'critical');
  if (hasCritical) return 10;

  const improvingCount = trends.filter((t) => t.direction === 'improving').length;
  const deterioratingCount = trends.filter((t) => t.direction === 'deteriorating').length;
  const ratio = trends.length > 0 ? improvingCount / trends.length : 0;

  if (deterioratingCount > trends.length / 2) return 25;
  if (ratio >= 0.6) return 90;
  if (ratio >= 0.3) return 70;
  return 50;
}

// ============================================================
// Helpers: grade, status, risk flags
// ============================================================

export function scoreToGrade(score: number): ModuleGrade {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export function scoreToStatus(score: number, flags: RiskFlag[]): ModuleStatus {
  const hasHardStop = flags.some((f) => f.severity === 'hard_stop');
  if (hasHardStop) return 'fail';
  const hasCritical = flags.some((f) => f.severity === 'critical');
  if (hasCritical) return 'fail';
  if (score >= 60) return 'pass';
  if (score >= 40) return 'warning';
  return 'fail';
}

export function generateRiskFlags(data: {
  sectorHHI: number;
  sectorBreached: boolean;
  currencyBreached: boolean;
  maxGroupPct: number;
  groupBreached: boolean;
  expectedLossPct: number;
  postSectorPct: number;
  postCurrencyPct: number;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (data.sectorBreached) {
    flags.push({
      code: 'sector_limit_breach',
      severity: 'critical',
      message: `Post-origination sector concentration ${(data.postSectorPct * 100).toFixed(1)}% exceeds limit`,
      source_metric: 'sector_concentration',
      value: data.postSectorPct,
    });
  }

  if (data.currencyBreached) {
    flags.push({
      code: 'currency_limit_breach',
      severity: 'warning',
      message: `Post-origination currency concentration ${(data.postCurrencyPct * 100).toFixed(1)}% exceeds limit`,
      source_metric: 'currency_concentration',
      value: data.postCurrencyPct,
    });
  }

  if (data.groupBreached) {
    flags.push({
      code: 'group_concentration_high',
      severity: 'warning',
      message: `Group concentration ${(data.maxGroupPct * 100).toFixed(1)}% is high`,
      source_metric: 'group_concentration',
      value: data.maxGroupPct,
    });
  }

  if (data.expectedLossPct > 0.03) {
    flags.push({
      code: 'high_expected_loss',
      severity: data.expectedLossPct > 0.05 ? 'critical' : 'warning',
      message: `Expected loss ${(data.expectedLossPct * 100).toFixed(2)}% is elevated`,
      source_metric: 'expected_loss_pct',
      value: data.expectedLossPct,
      threshold: 0.03,
    });
  }

  if (data.sectorHHI > HHI_THRESHOLDS.high) {
    flags.push({
      code: 'portfolio_hhi_high',
      severity: 'warning',
      message: `Portfolio sector HHI ${Math.round(data.sectorHHI)} exceeds ${HHI_THRESHOLDS.high}`,
      source_metric: 'sector_hhi',
      value: data.sectorHHI,
      threshold: HHI_THRESHOLDS.high,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(
  periods: PortfolioPeriod[],
  extractor: (p: PortfolioPeriod) => number,
): TimeSeriesPoint[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  return sorted.map((p) => ({
    period: p.period,
    value: Math.round(extractor(p) * 10000) / 10000,
  }));
}

export function analyzeTrends(periods: PortfolioPeriod[]): TrendResult[] {
  if (periods.length < 2) return [];

  const configs: Array<{
    config: TrendConfig;
    extractor: (p: PortfolioPeriod) => number;
  }> = [
    {
      config: {
        metric_name: 'sector_hhi', metric_label: 'Sector HHI', unit: 'index',
        higher_is_better: false, warning_threshold: HHI_THRESHOLDS.moderate,
        critical_threshold: HHI_THRESHOLDS.high,
        benchmark_value: BENCHMARKS.sector_hhi, projection_months: 3, y_axis_format: 'index',
      },
      extractor: (p) => {
        const bySector = aggregateByKey(p.positions, (pos) => pos.sector);
        return calcHHI(Object.values(bySector));
      },
    },
    {
      config: {
        metric_name: 'total_portfolio', metric_label: 'Total Portfolio', unit: '$',
        higher_is_better: true,
        projection_months: 3, y_axis_format: '$',
      },
      extractor: (p) => p.total_portfolio,
    },
    {
      config: {
        metric_name: 'position_count', metric_label: 'Active Positions', unit: 'count',
        higher_is_better: true,
        projection_months: 3, y_axis_format: 'count',
      },
      extractor: (p) => p.positions.length,
    },
  ];

  return configs.map(({ config, extractor }) => {
    const series = buildTimeSeries(periods, extractor);
    return trendUtils.analyze(series, config);
  });
}

// ============================================================
// Benchmarks and key metrics builders
// ============================================================

function buildBenchmarks(metrics: {
  sectorHHI: number;
  maxSectorPct: number;
  maxCurrencyPct: number;
  maxGroupPct: number;
  expectedLossPct: number;
}): Record<string, BenchmarkComparison> {
  function compare(
    metric: string, value: number, benchmark: number, higherIsBetter: boolean,
  ): BenchmarkComparison {
    const deviation = benchmark !== 0 ? ((value - benchmark) / Math.abs(benchmark)) * 100 : 0;
    const tolerance = Math.abs(benchmark) * 0.05;
    let status: 'above' | 'at' | 'below';
    if (higherIsBetter) {
      status = value > benchmark + tolerance ? 'above' : value < benchmark - tolerance ? 'below' : 'at';
    } else {
      status = value < benchmark - tolerance ? 'above' : value > benchmark + tolerance ? 'below' : 'at';
    }
    return {
      metric,
      applicant_value: Math.round(value * 10000) / 10000,
      benchmark_value: benchmark,
      deviation_percent: Math.round(deviation * 100) / 100,
      status,
    };
  }

  return {
    sector_hhi: compare('sector_hhi', metrics.sectorHHI, BENCHMARKS.sector_hhi, false),
    max_sector_pct: compare('max_sector_pct', metrics.maxSectorPct, BENCHMARKS.max_sector_pct, false),
    max_currency_pct: compare('max_currency_pct', metrics.maxCurrencyPct, BENCHMARKS.max_currency_pct, false),
    max_group_pct: compare('max_group_pct', metrics.maxGroupPct, BENCHMARKS.max_group_pct, false),
    expected_loss_pct: compare('expected_loss_pct', metrics.expectedLossPct, BENCHMARKS.expected_loss_pct, false),
  };
}

function buildKeyMetrics(data: {
  sectorHHI: number;
  maxSectorPct: number;
  maxSectorName: string;
  maxCurrencyPct: number;
  maxCurrencyName: string;
  maxGroupPct: number;
  maxGroupName: string;
  expectedLoss: number;
  expectedLossPct: number;
  postSectorPct: number;
  postCurrencyPct: number;
  postGroupPct: number;
  totalPortfolio: number;
  positionCount: number;
}): Record<string, MetricValue> {
  function metric(
    name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: 'positive' | 'neutral' | 'negative',
  ): MetricValue {
    return {
      name, label, value: Math.round(value * 10000) / 10000, unit,
      source: 'portfolio_engine', formula, interpretation, impact_on_score: impact,
    };
  }

  return {
    sector_hhi: metric('sector_hhi', 'Sector HHI', data.sectorHHI, 'index',
      'sum of squared sector shares',
      data.sectorHHI < HHI_THRESHOLDS.moderate ? 'Diversified sector exposure' : 'Concentrated sector exposure',
      data.sectorHHI < HHI_THRESHOLDS.moderate ? 'positive' : 'negative'),
    max_sector_pct: metric('max_sector_pct', 'Max Sector Exposure', data.maxSectorPct, '%',
      'largest sector amount / total portfolio',
      `Largest sector: ${data.maxSectorName}`,
      data.maxSectorPct <= 0.30 ? 'positive' : 'negative'),
    max_currency_pct: metric('max_currency_pct', 'Max Currency Exposure', data.maxCurrencyPct, '%',
      'largest currency amount / total portfolio',
      `Largest currency: ${data.maxCurrencyName}`,
      data.maxCurrencyPct <= 0.50 ? 'positive' : 'negative'),
    max_group_pct: metric('max_group_pct', 'Max Group Exposure', data.maxGroupPct, '%',
      'largest group amount / total portfolio',
      `Largest group: ${data.maxGroupName}`,
      data.maxGroupPct <= 0.25 ? 'positive' : 'negative'),
    expected_loss: metric('expected_loss', 'Expected Loss', data.expectedLoss, '$',
      'PD * LGD * EAD',
      'Incremental expected loss from new loan', 'neutral'),
    expected_loss_pct: metric('expected_loss_pct', 'Expected Loss %', data.expectedLossPct, '%',
      'expected_loss / total_portfolio',
      data.expectedLossPct <= 0.02 ? 'Acceptable expected loss' : 'Elevated expected loss',
      data.expectedLossPct <= 0.02 ? 'positive' : 'negative'),
    post_sector_concentration: metric('post_sector_concentration', 'Post-Origination Sector %', data.postSectorPct, '%',
      '(current_sector + new_loan) / (total + new_loan)',
      'Sector concentration after adding new loan', 'neutral'),
    post_currency_concentration: metric('post_currency_concentration', 'Post-Origination Currency %', data.postCurrencyPct, '%',
      '(current_currency + new_loan) / (total + new_loan)',
      'Currency concentration after adding new loan', 'neutral'),
    post_group_concentration: metric('post_group_concentration', 'Post-Origination Group %', data.postGroupPct, '%',
      '(current_group + new_loan) / (total + new_loan)',
      'Group concentration after adding new loan', 'neutral'),
    total_portfolio: metric('total_portfolio', 'Total Portfolio', data.totalPortfolio, '$',
      'sum of all positions', 'Current total portfolio exposure', 'neutral'),
    position_count: metric('position_count', 'Active Positions', data.positionCount, 'count',
      'count of positions', 'Number of active portfolio positions', 'neutral'),
  };
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const flagSummary = flags.length > 0
    ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
    : ' No risk flags detected.';
  return `Portfolio engine score: ${score}/100 (Grade ${grade}).${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('sector_limit_breach')) actions.push('Reduce loan amount or diversify sector exposure before approval');
  if (codes.has('currency_limit_breach')) actions.push('Consider currency hedging or reduce USD exposure');
  if (codes.has('group_concentration_high')) actions.push('Evaluate group-level exposure and consider reducing allocation');
  if (codes.has('high_expected_loss')) actions.push('Require additional guarantees to offset expected loss');
  if (codes.has('portfolio_hhi_high')) actions.push('Portfolio sector concentration is high — prioritize diversification');

  return actions;
}

/** Find the key with the maximum value in an aggregated record */
function findMaxEntry(aggregated: Record<string, number>): { name: string; amount: number } {
  let maxName = '';
  let maxAmount = 0;
  for (const [name, amount] of Object.entries(aggregated)) {
    if (amount > maxAmount) {
      maxName = name;
      maxAmount = amount;
    }
  }
  return { name: maxName, amount: maxAmount };
}

// ============================================================
// Main engine function
// ============================================================

export async function runPortfolioEngine(input: EngineInput): Promise<EngineOutput> {
  const portfolioData = input.syntage_data as PortfolioInput | undefined;

  if (!portfolioData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_portfolio_data',
        severity: 'critical',
        message: 'No portfolio data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Portfolio engine blocked: no data provided.',
      recommended_actions: ['Ensure portfolio position data is available'],
      created_at: new Date().toISOString(),
    };
  }

  const { periods, new_loan } = portfolioData;

  if (periods.length === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'insufficient_portfolio_data',
        severity: 'critical',
        message: 'No periods available for portfolio analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Portfolio engine blocked: no period data.',
      recommended_actions: ['Upload portfolio position data'],
      created_at: new Date().toISOString(),
    };
  }

  // Use most recent period for scoring
  const latestPeriod = [...periods].sort((a, b) => b.period.localeCompare(a.period))[0]!;
  const totalPortfolio = latestPeriod.total_portfolio;

  // Aggregate by sector, currency, group
  const bySector = aggregateByKey(latestPeriod.positions, (p) => p.sector);
  const byCurrency = aggregateByKey(latestPeriod.positions, (p) => p.currency);
  const byGroup = aggregateByKey(latestPeriod.positions, (p) => p.group);

  // Sector metrics
  const sectorHHI = calcHHI(Object.values(bySector));
  const maxSector = findMaxEntry(bySector);
  const maxSectorPct = totalPortfolio > 0 ? maxSector.amount / totalPortfolio : 0;

  // Currency metrics
  const maxCurrency = findMaxEntry(byCurrency);
  const maxCurrencyPct = totalPortfolio > 0 ? maxCurrency.amount / totalPortfolio : 0;

  // Group metrics
  const maxGroup = findMaxEntry(byGroup);
  const maxGroupPct = totalPortfolio > 0 ? maxGroup.amount / totalPortfolio : 0;

  // Post-origination concentrations
  const currentSectorAmount = bySector[new_loan.sector] ?? 0;
  const postSectorPct = calcPostOriginationConcentration(currentSectorAmount, new_loan.amount, totalPortfolio);

  const currentCurrencyAmount = byCurrency[new_loan.currency] ?? 0;
  const postCurrencyPct = calcPostOriginationConcentration(currentCurrencyAmount, new_loan.amount, totalPortfolio);

  const currentGroupAmount = byGroup[new_loan.group] ?? 0;
  const postGroupPct = calcPostOriginationConcentration(currentGroupAmount, new_loan.amount, totalPortfolio);

  // Policy limits
  const sectorLimit = input.policy_config.sector_limits[new_loan.sector] ?? DEFAULT_LIMITS.sector;
  const currencyLimit = input.policy_config.currency_limits[new_loan.currency] ?? DEFAULT_LIMITS.currency;
  const groupLimit = DEFAULT_LIMITS.group;

  // Breach checks
  const sectorBreached = checkLimitBreach(postSectorPct, sectorLimit);
  const currencyBreached = checkLimitBreach(postCurrencyPct, currencyLimit);
  const groupBreached = checkLimitBreach(postGroupPct, groupLimit);

  // Expected loss
  const lgd = new_loan.lgd ?? DEFAULT_LGD;
  const ead = new_loan.ead ?? new_loan.amount;
  const expectedLoss = calcExpectedLoss(new_loan.pd, lgd, ead);
  const expectedLossPct = calcExpectedLossPct(expectedLoss, totalPortfolio + new_loan.amount);

  // Sub-scores
  const subScores = {
    sector_concentration: calcSectorConcentrationSubScore(sectorHHI, maxSectorPct, sectorBreached),
    currency_concentration: calcCurrencyConcentrationSubScore(maxCurrencyPct, currencyBreached),
    group_concentration: calcGroupConcentrationSubScore(maxGroupPct, groupBreached),
    expected_loss: calcExpectedLossSubScore(expectedLossPct),
    trend_quality: 50, // placeholder, updated below
  };

  // Trends
  const trends = analyzeTrends(periods);
  subScores.trend_quality = calcTrendQualitySubScore(trends);

  // Weighted raw score
  const rawScore =
    subScores.sector_concentration * SUB_WEIGHTS.sector_concentration +
    subScores.currency_concentration * SUB_WEIGHTS.currency_concentration +
    subScores.group_concentration * SUB_WEIGHTS.group_concentration +
    subScores.expected_loss * SUB_WEIGHTS.expected_loss +
    subScores.trend_quality * SUB_WEIGHTS.trend_quality;

  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));

  const grade = scoreToGrade(finalScore);

  // Risk flags
  const riskFlags = generateRiskFlags({
    sectorHHI, sectorBreached, currencyBreached,
    maxGroupPct: postGroupPct, groupBreached,
    expectedLossPct, postSectorPct, postCurrencyPct,
  });
  const status = scoreToStatus(finalScore, riskFlags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics({
      sectorHHI, maxSectorPct, maxSectorName: maxSector.name,
      maxCurrencyPct, maxCurrencyName: maxCurrency.name,
      maxGroupPct, maxGroupName: maxGroup.name,
      expectedLoss, expectedLossPct,
      postSectorPct, postCurrencyPct, postGroupPct,
      totalPortfolio, positionCount: latestPeriod.positions.length,
    }),
    benchmark_comparison: buildBenchmarks({
      sectorHHI, maxSectorPct, maxCurrencyPct, maxGroupPct, expectedLossPct,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
