import type { RazonesFinancieras } from '../api/syntageClient';
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

const ENGINE_NAME = 'financial';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  liquidity: 0.20,
  profitability: 0.25,
  leverage: 0.20,
  coverage: 0.15,
  related_parties: 0.10,
  cross_validation: 0.10,
} as const;

/** Benchmarks for financial ratios */
const BENCHMARKS = {
  current_ratio: 1.5,
  quick_ratio: 1.0,
  debt_to_equity: 2.0,
  gross_margin: 0.30,
  operating_margin: 0.15,
  net_margin: 0.08,
  interest_coverage: 3.0,
  related_party_exposure: 0.20,
} as const;

// ============================================================
// Input types
// ============================================================

export interface BalanceData {
  fiscal_year: number;
  total_assets: number;
  current_assets: number;
  cash: number;
  accounts_receivable: number;
  inventory: number;
  fixed_assets: number;
  total_liabilities: number;
  current_liabilities: number;
  long_term_debt: number;
  equity: number;
}

export interface IncomeData {
  fiscal_year: number;
  revenue: number;
  cost_of_goods: number;
  gross_profit: number;
  operating_expenses: number;
  operating_income: number;
  interest_expense: number;
  net_income: number;
  ebitda: number;
  depreciation: number;
}

export interface RelatedPartiesData {
  total_exposure: number;
  total_revenue: number;
  exposure_pct: number;
  parties: Array<{ name: string; rfc: string; amount: number; type: string }>;
}

export interface FinancialInput {
  razones_financieras: RazonesFinancieras;
  balance_data: BalanceData[];
  income_data: IncomeData[];
  related_parties_data: RelatedPartiesData;
}

// ============================================================
// Balance sheet calculations (exported for testability)
// ============================================================

export function calcCurrentRatio(balance: BalanceData): number {
  if (balance.current_liabilities === 0) return balance.current_assets > 0 ? 10 : 0;
  return balance.current_assets / balance.current_liabilities;
}

export function calcQuickRatio(balance: BalanceData): number {
  if (balance.current_liabilities === 0) return (balance.current_assets - balance.inventory) > 0 ? 10 : 0;
  return (balance.current_assets - balance.inventory) / balance.current_liabilities;
}

export function calcDebtToEquity(balance: BalanceData): number {
  if (balance.equity === 0) return balance.total_liabilities > 0 ? 10 : 0;
  return balance.total_liabilities / balance.equity;
}

export function calcWorkingCapital(balance: BalanceData): number {
  return balance.current_assets - balance.current_liabilities;
}

// ============================================================
// Income statement calculations (exported for testability)
// ============================================================

export function calcGrossMargin(income: IncomeData): number {
  if (income.revenue === 0) return 0;
  return income.gross_profit / income.revenue;
}

export function calcOperatingMargin(income: IncomeData): number {
  if (income.revenue === 0) return 0;
  return income.operating_income / income.revenue;
}

export function calcNetMargin(income: IncomeData): number {
  if (income.revenue === 0) return 0;
  return income.net_income / income.revenue;
}

export function calcInterestCoverage(income: IncomeData): number {
  if (income.interest_expense === 0) return income.ebitda > 0 ? 10 : 0;
  return income.ebitda / income.interest_expense;
}

export function calcRevenueGrowth(incomes: IncomeData[]): number {
  if (incomes.length < 2) return 0;
  const sorted = [...incomes].sort((a, b) => a.fiscal_year - b.fiscal_year);
  const prev = sorted[sorted.length - 2]!;
  const curr = sorted[sorted.length - 1]!;
  if (prev.revenue === 0) return 0;
  return (curr.revenue - prev.revenue) / Math.abs(prev.revenue);
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

/** Liquidity sub-score (0-100) based on current ratio and quick ratio */
export function calcLiquiditySubScore(balance: BalanceData): number {
  const cr = calcCurrentRatio(balance);
  const qr = calcQuickRatio(balance);
  const wc = calcWorkingCapital(balance);

  let score = 0;

  // Current ratio scoring (50% of liquidity)
  if (cr >= 2.0) score += 50;
  else if (cr >= 1.5) score += 40;
  else if (cr >= 1.0) score += 25;
  else if (cr >= 0.5) score += 10;

  // Quick ratio scoring (30% of liquidity)
  if (qr >= 1.5) score += 30;
  else if (qr >= 1.0) score += 25;
  else if (qr >= 0.7) score += 15;
  else if (qr >= 0.3) score += 5;

  // Working capital positive bonus (20% of liquidity)
  if (wc > 0) score += 20;
  else if (wc === 0) score += 10;

  return Math.min(100, score);
}

/** Profitability sub-score (0-100) based on margins and revenue growth */
export function calcProfitabilitySubScore(_balance: BalanceData, incomes: IncomeData[]): number {
  if (incomes.length === 0) return 0;
  const latest = [...incomes].sort((a, b) => b.fiscal_year - a.fiscal_year)[0]!;

  const gm = calcGrossMargin(latest);
  const om = calcOperatingMargin(latest);
  const nm = calcNetMargin(latest);
  const growth = calcRevenueGrowth(incomes);

  let score = 0;

  // Gross margin (30%)
  if (gm >= 0.40) score += 30;
  else if (gm >= 0.30) score += 25;
  else if (gm >= 0.20) score += 15;
  else if (gm >= 0.10) score += 8;
  else if (gm > 0) score += 3;

  // Operating margin (25%)
  if (om >= 0.20) score += 25;
  else if (om >= 0.15) score += 20;
  else if (om >= 0.08) score += 12;
  else if (om > 0) score += 5;

  // Net margin (25%)
  if (nm >= 0.10) score += 25;
  else if (nm >= 0.08) score += 20;
  else if (nm >= 0.03) score += 12;
  else if (nm > 0) score += 5;

  // Revenue growth (20%)
  if (growth >= 0.15) score += 20;
  else if (growth >= 0.05) score += 15;
  else if (growth >= 0) score += 10;
  else if (growth >= -0.10) score += 5;

  return Math.min(100, score);
}

/** Leverage sub-score (0-100) — lower debt-to-equity is better */
export function calcLeverageSubScore(balance: BalanceData): number {
  const dte = calcDebtToEquity(balance);

  if (dte <= 0.5) return 100;
  if (dte <= 1.0) return 85;
  if (dte <= 1.5) return 70;
  if (dte <= 2.0) return 55;
  if (dte <= 3.0) return 35;
  if (dte <= 5.0) return 15;
  return 5;
}

/** Coverage sub-score (0-100) based on interest coverage ratio */
export function calcCoverageSubScore(income: IncomeData): number {
  const ic = calcInterestCoverage(income);

  if (ic >= 5.0) return 100;
  if (ic >= 3.0) return 80;
  if (ic >= 2.0) return 60;
  if (ic >= 1.5) return 40;
  if (ic >= 1.0) return 20;
  return 5;
}

/** Related parties sub-score (0-100) — lower exposure is better */
export function calcRelatedPartiesSubScore(rp: RelatedPartiesData): number {
  const pct = rp.exposure_pct;

  if (pct <= 0.05) return 100;
  if (pct <= 0.10) return 85;
  if (pct <= 0.15) return 70;
  if (pct <= 0.20) return 55;
  if (pct <= 0.30) return 35;
  if (pct <= 0.50) return 15;
  return 5;
}

// ============================================================
// Cross-validation: Syntage ratios vs own calculations
// ============================================================

export interface CrossValidationResult {
  metric: string;
  syntage_value: number;
  calculated_value: number;
  discrepancy_pct: number;
  match: boolean;
}

/** Compare Syntage pre-calculated ratios vs our own calculations */
export function crossValidateRatios(
  razones: RazonesFinancieras,
  balance: BalanceData,
  income: IncomeData,
): CrossValidationResult[] {
  const results: CrossValidationResult[] = [];

  const comparisons: Array<{ metric: string; syntageKey: string; category: keyof RazonesFinancieras; calculated: number }> = [
    { metric: 'current_ratio', syntageKey: 'coeficiente_solvencia', category: 'liquidez', calculated: calcCurrentRatio(balance) },
    { metric: 'quick_ratio', syntageKey: 'prueba_acida', category: 'liquidez', calculated: calcQuickRatio(balance) },
    { metric: 'gross_margin', syntageKey: 'margen_bruto', category: 'rentabilidad', calculated: calcGrossMargin(income) },
    { metric: 'debt_to_equity', syntageKey: 'coeficiente_endeudamiento', category: 'apalancamiento', calculated: calcDebtToEquity(balance) },
  ];

  for (const comp of comparisons) {
    const categoryData = razones[comp.category];
    if (typeof categoryData === 'object' && categoryData !== null && comp.syntageKey in categoryData) {
      const syntageVal = (categoryData as Record<string, number>)[comp.syntageKey]!;
      const denominator = Math.abs(syntageVal) || 1;
      const discrepancy = Math.abs(syntageVal - comp.calculated) / denominator;
      results.push({
        metric: comp.metric,
        syntage_value: syntageVal,
        calculated_value: Math.round(comp.calculated * 10000) / 10000,
        discrepancy_pct: Math.round(discrepancy * 10000) / 100,
        match: discrepancy <= 0.05,
      });
    }
  }

  return results;
}

/** Cross-validation sub-score (0-100) — more matches = higher score */
export function calcCrossValidationSubScore(
  razones: RazonesFinancieras,
  balance: BalanceData,
  income: IncomeData,
): number {
  const results = crossValidateRatios(razones, balance, income);
  if (results.length === 0) return 70; // No data to compare, neutral score

  const matchCount = results.filter((r) => r.match).length;
  const matchPct = matchCount / results.length;

  if (matchPct >= 1.0) return 100;
  if (matchPct >= 0.75) return 80;
  if (matchPct >= 0.50) return 60;
  if (matchPct >= 0.25) return 40;
  return 20;
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
  const hasCritical = flags.some((f) => f.severity === 'critical');
  if (hasCritical) return 'fail';
  if (score >= 60) return 'pass';
  if (score >= 40) return 'warning';
  return 'fail';
}

export function generateRiskFlags(
  balance: BalanceData,
  income: IncomeData,
  rp: RelatedPartiesData,
  crossResults: CrossValidationResult[],
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Low liquidity
  const cr = calcCurrentRatio(balance);
  if (cr < 1.0) {
    flags.push({
      code: 'low_liquidity',
      severity: cr < 0.5 ? 'critical' : 'warning',
      message: `Current ratio ${cr.toFixed(2)} is below 1.0`,
      source_metric: 'current_ratio',
      value: cr,
      threshold: 1.0,
    });
  }

  // Negative working capital
  const wc = calcWorkingCapital(balance);
  if (wc < 0) {
    flags.push({
      code: 'negative_working_capital',
      severity: 'warning',
      message: `Negative working capital: ${wc.toFixed(0)}`,
      source_metric: 'working_capital',
      value: wc,
      threshold: 0,
    });
  }

  // Negative margins
  const gm = calcGrossMargin(income);
  const om = calcOperatingMargin(income);
  const nm = calcNetMargin(income);
  if (nm < 0) {
    flags.push({
      code: 'negative_margins',
      severity: nm < -0.10 ? 'critical' : 'warning',
      message: `Net margin is negative: ${(nm * 100).toFixed(1)}%`,
      source_metric: 'net_margin',
      value: nm,
      threshold: 0,
    });
  } else if (om < 0) {
    flags.push({
      code: 'negative_margins',
      severity: 'warning',
      message: `Operating margin is negative: ${(om * 100).toFixed(1)}%`,
      source_metric: 'operating_margin',
      value: om,
      threshold: 0,
    });
  } else if (gm < 0) {
    flags.push({
      code: 'negative_margins',
      severity: 'critical',
      message: `Gross margin is negative: ${(gm * 100).toFixed(1)}%`,
      source_metric: 'gross_margin',
      value: gm,
      threshold: 0,
    });
  }

  // High leverage
  const dte = calcDebtToEquity(balance);
  if (dte > 3.0) {
    flags.push({
      code: 'high_leverage',
      severity: dte > 5.0 ? 'critical' : 'warning',
      message: `Debt-to-equity ratio ${dte.toFixed(2)} exceeds 3.0`,
      source_metric: 'debt_to_equity',
      value: dte,
      threshold: 3.0,
    });
  }

  // High related party exposure
  if (rp.exposure_pct > BENCHMARKS.related_party_exposure) {
    flags.push({
      code: 'high_related_party_exposure',
      severity: rp.exposure_pct > 0.40 ? 'critical' : 'warning',
      message: `Related party exposure ${(rp.exposure_pct * 100).toFixed(1)}% exceeds ${(BENCHMARKS.related_party_exposure * 100)}%`,
      source_metric: 'related_party_exposure',
      value: rp.exposure_pct,
      threshold: BENCHMARKS.related_party_exposure,
    });
  }

  // Cross-validation mismatch
  const mismatches = crossResults.filter((r) => !r.match);
  if (mismatches.length > 0) {
    flags.push({
      code: 'ratio_cross_validation_mismatch',
      severity: 'info',
      message: `${mismatches.length} ratio(s) differ >5% from Syntage: ${mismatches.map((m) => m.metric).join(', ')}`,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(
  balances: BalanceData[],
  incomes: IncomeData[],
  extractor: (b: BalanceData, i: IncomeData) => number,
): TimeSeriesPoint[] {
  const sorted = [...balances].sort((a, b) => a.fiscal_year - b.fiscal_year);
  return sorted.map((b) => {
    const matchingIncome = incomes.find((i) => i.fiscal_year === b.fiscal_year);
    const defaultIncome: IncomeData = {
      fiscal_year: b.fiscal_year, revenue: 0, cost_of_goods: 0, gross_profit: 0,
      operating_expenses: 0, operating_income: 0, interest_expense: 0,
      net_income: 0, ebitda: 0, depreciation: 0,
    };
    return {
      period: String(b.fiscal_year),
      value: Math.round(extractor(b, matchingIncome ?? defaultIncome) * 10000) / 10000,
    };
  });
}

export function analyzeTrends(balances: BalanceData[], incomes: IncomeData[]): TrendResult[] {
  if (balances.length < 2) return [];

  const configs: Array<{
    config: TrendConfig;
    extractor: (b: BalanceData, i: IncomeData) => number;
  }> = [
    {
      config: {
        metric_name: 'current_ratio', metric_label: 'Current Ratio', unit: 'x',
        higher_is_better: true, warning_threshold: 1.0, critical_threshold: 0.5,
        benchmark_value: BENCHMARKS.current_ratio, projection_months: 3, y_axis_format: 'x',
      },
      extractor: (b) => calcCurrentRatio(b),
    },
    {
      config: {
        metric_name: 'debt_to_equity', metric_label: 'Debt to Equity', unit: 'x',
        higher_is_better: false, warning_threshold: 3.0, critical_threshold: 5.0,
        benchmark_value: BENCHMARKS.debt_to_equity, projection_months: 3, y_axis_format: 'x',
      },
      extractor: (b) => calcDebtToEquity(b),
    },
    {
      config: {
        metric_name: 'gross_margin', metric_label: 'Gross Margin', unit: '%',
        higher_is_better: true, warning_threshold: 0.15, critical_threshold: 0,
        benchmark_value: BENCHMARKS.gross_margin, projection_months: 3, y_axis_format: '%',
      },
      extractor: (_b, i) => calcGrossMargin(i),
    },
    {
      config: {
        metric_name: 'net_margin', metric_label: 'Net Margin', unit: '%',
        higher_is_better: true, warning_threshold: 0.03, critical_threshold: 0,
        benchmark_value: BENCHMARKS.net_margin, projection_months: 3, y_axis_format: '%',
      },
      extractor: (_b, i) => calcNetMargin(i),
    },
  ];

  return configs.map(({ config, extractor }) => {
    const series = buildTimeSeries(balances, incomes, extractor);
    return trendUtils.analyze(series, config);
  });
}

// ============================================================
// Benchmarks and key metrics builders
// ============================================================

function buildBenchmarks(metrics: {
  currentRatio: number;
  quickRatio: number;
  debtToEquity: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  interestCoverage: number;
  relatedPartyExposure: number;
}): Record<string, BenchmarkComparison> {
  function compare(metric: string, value: number, benchmark: number, higherIsBetter: boolean): BenchmarkComparison {
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
    current_ratio: compare('current_ratio', metrics.currentRatio, BENCHMARKS.current_ratio, true),
    quick_ratio: compare('quick_ratio', metrics.quickRatio, BENCHMARKS.quick_ratio, true),
    debt_to_equity: compare('debt_to_equity', metrics.debtToEquity, BENCHMARKS.debt_to_equity, false),
    gross_margin: compare('gross_margin', metrics.grossMargin, BENCHMARKS.gross_margin, true),
    operating_margin: compare('operating_margin', metrics.operatingMargin, BENCHMARKS.operating_margin, true),
    net_margin: compare('net_margin', metrics.netMargin, BENCHMARKS.net_margin, true),
    interest_coverage: compare('interest_coverage', metrics.interestCoverage, BENCHMARKS.interest_coverage, true),
    related_party_exposure: compare('related_party_exposure', metrics.relatedPartyExposure, BENCHMARKS.related_party_exposure, false),
  };
}

function buildKeyMetrics(data: {
  balance: BalanceData;
  income: IncomeData;
  rp: RelatedPartiesData;
  revenueGrowth: number;
}): Record<string, MetricValue> {
  const { balance, income, rp, revenueGrowth } = data;

  function metric(name: string, label: string, value: number, unit: string, formula: string, interpretation: string, impact: 'positive' | 'neutral' | 'negative'): MetricValue {
    return { name, label, value: Math.round(value * 10000) / 10000, unit, source: 'financial_engine', formula, interpretation, impact_on_score: impact };
  }

  const cr = calcCurrentRatio(balance);
  const qr = calcQuickRatio(balance);
  const dte = calcDebtToEquity(balance);
  const wc = calcWorkingCapital(balance);
  const gm = calcGrossMargin(income);
  const om = calcOperatingMargin(income);
  const nm = calcNetMargin(income);
  const ic = calcInterestCoverage(income);

  return {
    current_ratio: metric('current_ratio', 'Current Ratio', cr, 'x', 'current_assets / current_liabilities', cr >= 1.5 ? 'Healthy liquidity' : 'Low liquidity', cr >= 1.0 ? 'positive' : 'negative'),
    quick_ratio: metric('quick_ratio', 'Quick Ratio', qr, 'x', '(current_assets - inventory) / current_liabilities', qr >= 1.0 ? 'Good acid test' : 'Weak acid test', qr >= 0.7 ? 'positive' : 'negative'),
    debt_to_equity: metric('debt_to_equity', 'Debt to Equity', dte, 'x', 'total_liabilities / equity', dte <= 2.0 ? 'Acceptable leverage' : 'High leverage', dte <= 2.0 ? 'positive' : 'negative'),
    working_capital: metric('working_capital', 'Working Capital', wc, '$', 'current_assets - current_liabilities', wc > 0 ? 'Positive working capital' : 'Negative working capital', wc > 0 ? 'positive' : 'negative'),
    gross_margin: metric('gross_margin', 'Gross Margin', gm, '%', 'gross_profit / revenue', gm >= 0.30 ? 'Strong gross margin' : 'Thin gross margin', gm >= 0.20 ? 'positive' : 'negative'),
    operating_margin: metric('operating_margin', 'Operating Margin', om, '%', 'operating_income / revenue', om >= 0.15 ? 'Healthy operations' : 'Tight operations', om >= 0.08 ? 'positive' : 'negative'),
    net_margin: metric('net_margin', 'Net Margin', nm, '%', 'net_income / revenue', nm >= 0.08 ? 'Good profitability' : 'Low profitability', nm >= 0.03 ? 'positive' : 'negative'),
    interest_coverage: metric('interest_coverage', 'Interest Coverage', ic, 'x', 'ebitda / interest_expense', ic >= 3.0 ? 'Strong coverage' : 'Weak coverage', ic >= 2.0 ? 'positive' : 'negative'),
    revenue_growth: metric('revenue_growth', 'Revenue Growth', revenueGrowth, '%', '(current_revenue - prev_revenue) / prev_revenue', revenueGrowth >= 0 ? 'Growing revenue' : 'Declining revenue', revenueGrowth >= 0 ? 'positive' : 'negative'),
    related_party_exposure: metric('related_party_exposure', 'Related Party Exposure', rp.exposure_pct, '%', 'total_rp_exposure / total_revenue', rp.exposure_pct <= 0.20 ? 'Acceptable exposure' : 'High exposure', rp.exposure_pct <= 0.20 ? 'positive' : 'negative'),
  };
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const flagSummary = flags.length > 0
    ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
    : ' No risk flags detected.';
  return `Financial engine score: ${score}/100 (Grade ${grade}).${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('low_liquidity')) actions.push('Review liquidity position and short-term obligations');
  if (codes.has('negative_working_capital')) actions.push('Assess working capital management and funding needs');
  if (codes.has('negative_margins')) actions.push('Investigate cost structure and pricing strategy');
  if (codes.has('high_leverage')) actions.push('Evaluate debt restructuring or equity injection');
  if (codes.has('high_related_party_exposure')) actions.push('Review related party transactions for arm-length compliance');
  if (codes.has('ratio_cross_validation_mismatch')) actions.push('Reconcile financial data discrepancies with Syntage ratios');

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runFinancialEngine(input: EngineInput): Promise<EngineOutput> {
  const financialData = input.syntage_data as FinancialInput | undefined;

  if (!financialData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_financial_data',
        severity: 'critical',
        message: 'No financial data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Financial engine blocked: no financial data provided.',
      recommended_actions: ['Ensure financial statements and Syntage data are available'],
      created_at: new Date().toISOString(),
    };
  }

  const { razones_financieras, balance_data, income_data, related_parties_data } = financialData;

  if (balance_data.length === 0 || income_data.length === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'insufficient_financial_data',
        severity: 'critical',
        message: 'Balance sheet or income statement data is empty',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Financial engine blocked: balance or income data is empty.',
      recommended_actions: ['Upload financial statements or ensure Syntage data includes balance and income'],
      created_at: new Date().toISOString(),
    };
  }

  // Use most recent year for scoring
  const latestBalance = [...balance_data].sort((a, b) => b.fiscal_year - a.fiscal_year)[0]!;
  const latestIncome = [...income_data].sort((a, b) => b.fiscal_year - a.fiscal_year)[0]!;

  // Calculate sub-scores
  const subScores = {
    liquidity: calcLiquiditySubScore(latestBalance),
    profitability: calcProfitabilitySubScore(latestBalance, income_data),
    leverage: calcLeverageSubScore(latestBalance),
    coverage: calcCoverageSubScore(latestIncome),
    related_parties: calcRelatedPartiesSubScore(related_parties_data),
    cross_validation: calcCrossValidationSubScore(razones_financieras, latestBalance, latestIncome),
  };

  // Weighted raw score
  const rawScore =
    subScores.liquidity * SUB_WEIGHTS.liquidity +
    subScores.profitability * SUB_WEIGHTS.profitability +
    subScores.leverage * SUB_WEIGHTS.leverage +
    subScores.coverage * SUB_WEIGHTS.coverage +
    subScores.related_parties * SUB_WEIGHTS.related_parties +
    subScores.cross_validation * SUB_WEIGHTS.cross_validation;

  // Trends
  const trends = analyzeTrends(balance_data, income_data);
  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));

  const grade = scoreToGrade(finalScore);

  // Cross-validation results for flags
  const crossResults = crossValidateRatios(razones_financieras, latestBalance, latestIncome);

  // Risk flags
  const riskFlags = generateRiskFlags(latestBalance, latestIncome, related_parties_data, crossResults);
  const status = scoreToStatus(finalScore, riskFlags);

  // Calculated metrics for benchmarks
  const cr = calcCurrentRatio(latestBalance);
  const qr = calcQuickRatio(latestBalance);
  const dte = calcDebtToEquity(latestBalance);
  const gm = calcGrossMargin(latestIncome);
  const om = calcOperatingMargin(latestIncome);
  const nm = calcNetMargin(latestIncome);
  const ic = calcInterestCoverage(latestIncome);
  const revenueGrowth = calcRevenueGrowth(income_data);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics({
      balance: latestBalance,
      income: latestIncome,
      rp: related_parties_data,
      revenueGrowth,
    }),
    benchmark_comparison: buildBenchmarks({
      currentRatio: cr,
      quickRatio: qr,
      debtToEquity: dte,
      grossMargin: gm,
      operatingMargin: om,
      netMargin: nm,
      interestCoverage: ic,
      relatedPartyExposure: related_parties_data.exposure_pct,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
