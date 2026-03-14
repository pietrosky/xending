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

const ENGINE_NAME = 'working_capital';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  ccc: 0.30,
  aging: 0.25,
  collection_efficiency: 0.20,
  negotiation_power: 0.15,
  trend_quality: 0.10,
} as const;

/** Benchmarks for working capital metrics */
const BENCHMARKS = {
  dso: 45,
  dio: 30,
  dpo: 35,
  ccc: 40,
  collection_efficiency: 0.85,
  negotiation_power: 0.70,
} as const;

/** CCC classification thresholds */
const CCC_THRESHOLDS = {
  excellent: 30,
  good: 45,
  acceptable: 60,
  poor: 90,
} as const;

// ============================================================
// Input types
// ============================================================

export interface AgingBucket {
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_90_plus: number;
}

export interface WorkingCapitalPeriod {
  period: string;
  revenue: number;
  cost_of_goods_sold: number;
  accounts_receivable: number;
  inventory: number;
  accounts_payable: number;
  cxc_aging: AgingBucket;
  cxp_aging: AgingBucket;
  collections_received: number;
  total_invoiced: number;
  early_payment_discounts_taken: number;
  early_payment_discounts_offered: number;
  total_purchases: number;
}

export interface WorkingCapitalInput {
  periods: WorkingCapitalPeriod[];
}

// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

/** DSO = (Accounts Receivable / Revenue) * 365 */
export function calcDSO(accountsReceivable: number, revenue: number): number {
  if (revenue <= 0) return 0;
  return (accountsReceivable / revenue) * 365;
}

/** DIO = (Inventory / COGS) * 365 */
export function calcDIO(inventory: number, cogs: number): number {
  if (cogs <= 0) return 0;
  return (inventory / cogs) * 365;
}

/** DPO = (Accounts Payable / COGS) * 365 */
export function calcDPO(accountsPayable: number, cogs: number): number {
  if (cogs <= 0) return 0;
  return (accountsPayable / cogs) * 365;
}

/** CCC = DSO + DIO - DPO */
export function calcCCC(dso: number, dio: number, dpo: number): number {
  return dso + dio - dpo;
}

/** Collection Efficiency = Collections Received / Total Invoiced */
export function calcCollectionEfficiency(collectionsReceived: number, totalInvoiced: number): number {
  if (totalInvoiced <= 0) return 0;
  return Math.min(1, collectionsReceived / totalInvoiced);
}

/** Negotiation Power = (Early Payment Discounts Taken / Total Purchases) relative to (Discounts Offered / Revenue) */
export function calcNegotiationPower(
  discountsTaken: number,
  totalPurchases: number,
  discountsOffered: number,
  revenue: number,
): number {
  const supplierLeverage = totalPurchases > 0 ? discountsTaken / totalPurchases : 0;
  const clientLeverage = revenue > 0 ? discountsOffered / revenue : 0;
  // Higher supplier leverage + lower client leverage = better negotiation power
  const raw = supplierLeverage - clientLeverage + 0.5;
  return Math.max(0, Math.min(1, raw));
}

/** Aging concentration: % of total in 60+ day buckets */
export function calcAgingConcentration(aging: AgingBucket): number {
  const total = aging.current + aging.days_1_30 + aging.days_31_60 + aging.days_61_90 + aging.days_90_plus;
  if (total <= 0) return 0;
  return (aging.days_61_90 + aging.days_90_plus) / total;
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

/** CCC sub-score (0-100) based on cash conversion cycle days */
export function calcCCCSubScore(ccc: number): number {
  if (ccc <= CCC_THRESHOLDS.excellent) return 100;
  if (ccc <= CCC_THRESHOLDS.good) return 80;
  if (ccc <= CCC_THRESHOLDS.acceptable) return 60;
  if (ccc <= CCC_THRESHOLDS.poor) return 35;
  return 10;
}

/** Aging sub-score (0-100) based on CxC and CxP aging concentration */
export function calcAgingSubScore(cxcAging: AgingBucket, cxpAging: AgingBucket): number {
  const cxcConcentration = calcAgingConcentration(cxcAging);
  const cxpConcentration = calcAgingConcentration(cxpAging);

  let score = 0;

  // CxC aging (60% weight) — lower old receivables is better
  if (cxcConcentration <= 0.05) score += 60;
  else if (cxcConcentration <= 0.10) score += 48;
  else if (cxcConcentration <= 0.20) score += 36;
  else if (cxcConcentration <= 0.35) score += 20;
  else score += 8;

  // CxP aging (40% weight) — some old payables can be strategic
  if (cxpConcentration <= 0.10) score += 40;
  else if (cxpConcentration <= 0.20) score += 32;
  else if (cxpConcentration <= 0.35) score += 22;
  else if (cxpConcentration <= 0.50) score += 12;
  else score += 5;

  return Math.min(100, score);
}

/** Collection efficiency sub-score (0-100) */
export function calcCollectionEfficiencySubScore(efficiency: number): number {
  if (efficiency >= 0.95) return 100;
  if (efficiency >= 0.85) return 80;
  if (efficiency >= 0.75) return 60;
  if (efficiency >= 0.60) return 40;
  if (efficiency >= 0.40) return 20;
  return 5;
}

/** Negotiation power sub-score (0-100) */
export function calcNegotiationPowerSubScore(power: number): number {
  if (power >= 0.80) return 100;
  if (power >= 0.65) return 80;
  if (power >= 0.50) return 60;
  if (power >= 0.35) return 40;
  if (power >= 0.20) return 20;
  return 5;
}

/** Trend quality sub-score (0-100) based on trend directions */
export function calcTrendQualitySubScore(trends: TrendResult[]): number {
  if (trends.length === 0) return 50;
  const improving = trends.filter((t) => t.direction === 'improving').length;
  const deteriorating = trends.filter((t) => t.direction === 'deteriorating').length;
  const critical = trends.filter((t) => t.direction === 'critical').length;
  const total = trends.length;

  if (critical > 0) return 10;
  if (deteriorating / total > 0.5) return 25;
  if (deteriorating > 0) return 45;
  if (improving / total > 0.5) return 90;
  return 60;
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

export function generateRiskFlags(
  latestPeriod: WorkingCapitalPeriod,
  ccc: number,
  dso: number,
  dpo: number,
  previousDSO: number | undefined,
  previousDPO: number | undefined,
  cxcAgingConcentration: number,
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // CCC > 60 days
  if (ccc > CCC_THRESHOLDS.acceptable) {
    flags.push({
      code: 'ccc_high',
      severity: ccc > CCC_THRESHOLDS.poor ? 'critical' : 'warning',
      message: `Cash Conversion Cycle ${Math.round(ccc)} days exceeds ${CCC_THRESHOLDS.acceptable}-day threshold`,
      source_metric: 'ccc',
      value: ccc,
      threshold: CCC_THRESHOLDS.acceptable,
    });
  }

  // DSO deteriorating (increasing)
  if (previousDSO !== undefined && dso > previousDSO * 1.15) {
    flags.push({
      code: 'dso_deteriorating',
      severity: 'warning',
      message: `DSO increased from ${Math.round(previousDSO)} to ${Math.round(dso)} days (${Math.round(((dso - previousDSO) / previousDSO) * 100)}% increase)`,
      source_metric: 'dso',
      value: dso,
      threshold: previousDSO,
    });
  }

  // DPO shrinking (decreasing — losing negotiation power)
  if (previousDPO !== undefined && previousDPO > 0 && dpo < previousDPO * 0.85) {
    flags.push({
      code: 'dpo_shrinking',
      severity: 'warning',
      message: `DPO decreased from ${Math.round(previousDPO)} to ${Math.round(dpo)} days — potential loss of supplier terms`,
      source_metric: 'dpo',
      value: dpo,
      threshold: previousDPO,
    });
  }

  // Aging concentration — high % of receivables in 60+ days
  if (cxcAgingConcentration > 0.30) {
    flags.push({
      code: 'aging_concentration_high',
      severity: cxcAgingConcentration > 0.50 ? 'critical' : 'warning',
      message: `${Math.round(cxcAgingConcentration * 100)}% of receivables are 60+ days old`,
      source_metric: 'cxc_aging_concentration',
      value: cxcAgingConcentration,
      threshold: 0.30,
    });
  }

  // Low collection efficiency
  const collEff = calcCollectionEfficiency(latestPeriod.collections_received, latestPeriod.total_invoiced);
  if (collEff < 0.60) {
    flags.push({
      code: 'low_collection_efficiency',
      severity: 'critical',
      message: `Collection efficiency ${Math.round(collEff * 100)}% is critically low`,
      source_metric: 'collection_efficiency',
      value: collEff,
      threshold: 0.60,
    });
  } else if (collEff < 0.75) {
    flags.push({
      code: 'weak_collection_efficiency',
      severity: 'warning',
      message: `Collection efficiency ${Math.round(collEff * 100)}% is below 75% threshold`,
      source_metric: 'collection_efficiency',
      value: collEff,
      threshold: 0.75,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(
  periods: WorkingCapitalPeriod[],
  extractor: (p: WorkingCapitalPeriod) => number,
): TimeSeriesPoint[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  return sorted.map((p) => ({
    period: p.period,
    value: Math.round(extractor(p) * 10000) / 10000,
  }));
}

export function analyzeTrends(periods: WorkingCapitalPeriod[]): TrendResult[] {
  if (periods.length < 2) return [];

  const configs: Array<{
    config: TrendConfig;
    extractor: (p: WorkingCapitalPeriod) => number;
  }> = [
    {
      config: {
        metric_name: 'ccc', metric_label: 'Cash Conversion Cycle', unit: 'days',
        higher_is_better: false, warning_threshold: CCC_THRESHOLDS.acceptable,
        critical_threshold: CCC_THRESHOLDS.poor,
        benchmark_value: BENCHMARKS.ccc, projection_months: 3, y_axis_format: 'days',
      },
      extractor: (p) => {
        const dso = calcDSO(p.accounts_receivable, p.revenue);
        const dio = calcDIO(p.inventory, p.cost_of_goods_sold);
        const dpo = calcDPO(p.accounts_payable, p.cost_of_goods_sold);
        return calcCCC(dso, dio, dpo);
      },
    },
    {
      config: {
        metric_name: 'dso', metric_label: 'Days Sales Outstanding', unit: 'days',
        higher_is_better: false, warning_threshold: 60, critical_threshold: 90,
        benchmark_value: BENCHMARKS.dso, projection_months: 3, y_axis_format: 'days',
      },
      extractor: (p) => calcDSO(p.accounts_receivable, p.revenue),
    },
    {
      config: {
        metric_name: 'collection_efficiency', metric_label: 'Collection Efficiency', unit: '%',
        higher_is_better: true, warning_threshold: 0.75, critical_threshold: 0.60,
        benchmark_value: BENCHMARKS.collection_efficiency, projection_months: 3, y_axis_format: '%',
      },
      extractor: (p) => calcCollectionEfficiency(p.collections_received, p.total_invoiced),
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
  dso: number;
  dio: number;
  dpo: number;
  ccc: number;
  collectionEfficiency: number;
  negotiationPower: number;
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
      applicant_value: Math.round(value * 100) / 100,
      benchmark_value: benchmark,
      deviation_percent: Math.round(deviation * 100) / 100,
      status,
    };
  }

  return {
    dso: compare('dso', metrics.dso, BENCHMARKS.dso, false),
    dio: compare('dio', metrics.dio, BENCHMARKS.dio, false),
    dpo: compare('dpo', metrics.dpo, BENCHMARKS.dpo, false),
    ccc: compare('ccc', metrics.ccc, BENCHMARKS.ccc, false),
    collection_efficiency: compare('collection_efficiency', metrics.collectionEfficiency, BENCHMARKS.collection_efficiency, true),
    negotiation_power: compare('negotiation_power', metrics.negotiationPower, BENCHMARKS.negotiation_power, true),
  };
}

function buildKeyMetrics(data: {
  dso: number;
  dio: number;
  dpo: number;
  ccc: number;
  collectionEfficiency: number;
  negotiationPower: number;
  cxcAgingConcentration: number;
  cxpAgingConcentration: number;
}): Record<string, MetricValue> {
  function metric(
    name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: 'positive' | 'neutral' | 'negative',
  ): MetricValue {
    return {
      name, label, value: Math.round(value * 100) / 100, unit,
      source: 'working_capital_engine', formula, interpretation, impact_on_score: impact,
    };
  }

  return {
    dso: metric('dso', 'Days Sales Outstanding', data.dso, 'days',
      '(accounts_receivable / revenue) * 365',
      data.dso <= BENCHMARKS.dso ? 'Healthy collection speed' : 'Slow collection',
      data.dso <= BENCHMARKS.dso ? 'positive' : 'negative'),
    dio: metric('dio', 'Days Inventory Outstanding', data.dio, 'days',
      '(inventory / cogs) * 365',
      data.dio <= BENCHMARKS.dio ? 'Efficient inventory turnover' : 'Slow inventory turnover',
      data.dio <= BENCHMARKS.dio ? 'positive' : 'negative'),
    dpo: metric('dpo', 'Days Payable Outstanding', data.dpo, 'days',
      '(accounts_payable / cogs) * 365',
      data.dpo >= BENCHMARKS.dpo ? 'Good supplier terms' : 'Short payment terms',
      data.dpo >= BENCHMARKS.dpo ? 'positive' : 'negative'),
    ccc: metric('ccc', 'Cash Conversion Cycle', data.ccc, 'days',
      'DSO + DIO - DPO',
      classifyCCC(data.ccc),
      data.ccc <= CCC_THRESHOLDS.good ? 'positive' : 'negative'),
    collection_efficiency: metric('collection_efficiency', 'Collection Efficiency', data.collectionEfficiency, '%',
      'collections_received / total_invoiced',
      data.collectionEfficiency >= 0.85 ? 'Strong collections' : 'Weak collections',
      data.collectionEfficiency >= 0.75 ? 'positive' : 'negative'),
    negotiation_power: metric('negotiation_power', 'Negotiation Power', data.negotiationPower, 'ratio',
      'supplier_leverage - client_leverage + 0.5',
      data.negotiationPower >= 0.65 ? 'Good negotiation position' : 'Weak negotiation position',
      data.negotiationPower >= 0.50 ? 'positive' : 'negative'),
    cxc_aging_concentration: metric('cxc_aging_concentration', 'CxC Aging 60+ Days', data.cxcAgingConcentration, '%',
      '(days_61_90 + days_90_plus) / total_cxc',
      data.cxcAgingConcentration <= 0.10 ? 'Healthy receivables aging' : 'Aged receivables concern',
      data.cxcAgingConcentration <= 0.20 ? 'positive' : 'negative'),
    cxp_aging_concentration: metric('cxp_aging_concentration', 'CxP Aging 60+ Days', data.cxpAgingConcentration, '%',
      '(days_61_90 + days_90_plus) / total_cxp',
      data.cxpAgingConcentration <= 0.20 ? 'Normal payables aging' : 'Delayed payments to suppliers',
      data.cxpAgingConcentration <= 0.35 ? 'neutral' : 'negative'),
  };
}

function classifyCCC(ccc: number): string {
  if (ccc <= CCC_THRESHOLDS.excellent) return 'Excellent cash conversion';
  if (ccc <= CCC_THRESHOLDS.good) return 'Good cash conversion';
  if (ccc <= CCC_THRESHOLDS.acceptable) return 'Acceptable cash conversion';
  if (ccc <= CCC_THRESHOLDS.poor) return 'Poor cash conversion';
  return 'Critical cash conversion — cash trapped in operations';
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const flagSummary = flags.length > 0
    ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
    : ' No risk flags detected.';
  return `Working Capital engine score: ${score}/100 (Grade ${grade}).${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('ccc_high')) actions.push('Reduce Cash Conversion Cycle by improving collections or negotiating longer payment terms');
  if (codes.has('dso_deteriorating')) actions.push('Investigate increasing DSO — tighten credit terms or improve collection processes');
  if (codes.has('dpo_shrinking')) actions.push('Renegotiate supplier payment terms to maintain or extend DPO');
  if (codes.has('aging_concentration_high')) actions.push('Address aged receivables — consider factoring or stricter credit policies for slow payers');
  if (codes.has('low_collection_efficiency')) actions.push('Urgently improve collection processes — efficiency is critically low');
  if (codes.has('weak_collection_efficiency')) actions.push('Strengthen collection follow-up procedures');

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runWorkingCapitalEngine(input: EngineInput): Promise<EngineOutput> {
  const wcData = input.syntage_data as WorkingCapitalInput | undefined;

  if (!wcData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_working_capital_data',
        severity: 'critical',
        message: 'No working capital data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Working Capital engine blocked: no data provided.',
      recommended_actions: ['Ensure SAT and financial data are available for working capital analysis'],
      created_at: new Date().toISOString(),
    };
  }

  const { periods } = wcData;

  if (periods.length === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'insufficient_working_capital_data',
        severity: 'critical',
        message: 'No periods available for working capital analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Working Capital engine blocked: no period data.',
      recommended_actions: ['Upload financial statements or ensure Syntage data includes balance sheet periods'],
      created_at: new Date().toISOString(),
    };
  }

  // Sort periods and get latest + previous
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  const latestPeriod = sorted[sorted.length - 1]!;
  const previousPeriod = sorted.length >= 2 ? sorted[sorted.length - 2] : undefined;

  // Core calculations on latest period
  const dso = calcDSO(latestPeriod.accounts_receivable, latestPeriod.revenue);
  const dio = calcDIO(latestPeriod.inventory, latestPeriod.cost_of_goods_sold);
  const dpo = calcDPO(latestPeriod.accounts_payable, latestPeriod.cost_of_goods_sold);
  const ccc = calcCCC(dso, dio, dpo);

  const collectionEfficiency = calcCollectionEfficiency(latestPeriod.collections_received, latestPeriod.total_invoiced);
  const negotiationPower = calcNegotiationPower(
    latestPeriod.early_payment_discounts_taken,
    latestPeriod.total_purchases,
    latestPeriod.early_payment_discounts_offered,
    latestPeriod.revenue,
  );

  const cxcAgingConcentration = calcAgingConcentration(latestPeriod.cxc_aging);
  const cxpAgingConcentration = calcAgingConcentration(latestPeriod.cxp_aging);

  // Previous period DSO/DPO for trend flags
  const previousDSO = previousPeriod ? calcDSO(previousPeriod.accounts_receivable, previousPeriod.revenue) : undefined;
  const previousDPO = previousPeriod ? calcDPO(previousPeriod.accounts_payable, previousPeriod.cost_of_goods_sold) : undefined;

  // Risk flags
  const riskFlags = generateRiskFlags(latestPeriod, ccc, dso, dpo, previousDSO, previousDPO, cxcAgingConcentration);

  // Trends
  const trends = analyzeTrends(periods);
  const trendFactor = trendUtils.calculateTrendFactor(trends);

  // Sub-scores
  const subScores = {
    ccc: calcCCCSubScore(ccc),
    aging: calcAgingSubScore(latestPeriod.cxc_aging, latestPeriod.cxp_aging),
    collection_efficiency: calcCollectionEfficiencySubScore(collectionEfficiency),
    negotiation_power: calcNegotiationPowerSubScore(negotiationPower),
    trend_quality: calcTrendQualitySubScore(trends),
  };

  // Weighted raw score
  const rawScore =
    subScores.ccc * SUB_WEIGHTS.ccc +
    subScores.aging * SUB_WEIGHTS.aging +
    subScores.collection_efficiency * SUB_WEIGHTS.collection_efficiency +
    subScores.negotiation_power * SUB_WEIGHTS.negotiation_power +
    subScores.trend_quality * SUB_WEIGHTS.trend_quality;

  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));
  const grade = scoreToGrade(finalScore);
  const status = scoreToStatus(finalScore, riskFlags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics({
      dso, dio, dpo, ccc,
      collectionEfficiency,
      negotiationPower,
      cxcAgingConcentration,
      cxpAgingConcentration,
    }),
    benchmark_comparison: buildBenchmarks({
      dso, dio, dpo, ccc,
      collectionEfficiency,
      negotiationPower,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
