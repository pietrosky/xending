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

const ENGINE_NAME = 'stability';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  revenue_variation: 0.30,
  coefficient_of_variation: 0.25,
  seasonality: 0.15,
  pattern_classification: 0.20,
  trend_quality: 0.10,
} as const;

/** Benchmarks for stability metrics */
const BENCHMARKS = {
  revenue_variation: 0.05,       // 5% month-over-month variation is healthy
  coefficient_of_variation: 0.15, // 15% CV is acceptable
  cancellation_ratio: 0.05,      // 5% cancellations over sales
  credit_note_ratio: 0.03,       // 3% credit notes over sales
} as const;

/** Pattern classification types */
export type PatternClassification = 'estable' | 'ciclico' | 'erratico' | 'deteriorando';

// ============================================================
// Input types
// ============================================================

export interface StabilityPeriod {
  period: string;          // "2024-01"
  revenue: number;
  expenses: number;
  collections: number;     // cobros
  payments: number;        // pagos
  cancellations: number;   // cancelaciones
  credit_notes: number;    // notas de credito
  active_clients: number;
}

export interface StabilityInput {
  periods: StabilityPeriod[];
}

// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

/** Monthly revenue variation: (current - previous) / previous */
export function calcRevenueVariation(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return (current - previous) / previous;
}

/** Standard deviation of an array of numbers */
export function calcStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Coefficient of Variation = stdDev / mean */
export function calcCoefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean <= 0) return 0;
  return calcStdDev(values) / mean;
}

/** Margin for a period: (revenue - expenses) / revenue */
export function calcMargin(revenue: number, expenses: number): number {
  if (revenue <= 0) return 0;
  return (revenue - expenses) / revenue;
}

/** Cancellation ratio: cancellations / revenue */
export function calcCancellationRatio(cancellations: number, revenue: number): number {
  if (revenue <= 0) return 0;
  return cancellations / revenue;
}

/** Credit note ratio: credit_notes / revenue */
export function calcCreditNoteRatio(creditNotes: number, revenue: number): number {
  if (revenue <= 0) return 0;
  return creditNotes / revenue;
}

/** Detect months with revenue drop > 20% vs previous month */
export function detectRevenueDropMonths(periods: StabilityPeriod[]): string[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  const drops: string[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (prev.revenue > 0) {
      const change = (curr.revenue - prev.revenue) / prev.revenue;
      if (change < -0.20) {
        drops.push(curr.period);
      }
    }
  }
  return drops;
}

/** Detect months with negative margin */
export function detectNegativeMarginMonths(periods: StabilityPeriod[]): string[] {
  return periods
    .filter((p) => p.revenue > 0 && p.expenses > p.revenue)
    .map((p) => p.period);
}

/** Calculate rolling average of revenue for a given window */
export function calcRollingRevenue(periods: StabilityPeriod[], window: number): number[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  const result: number[] = [];
  for (let i = window - 1; i < sorted.length; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += sorted[j]!.revenue;
    }
    result.push(sum / window);
  }
  return result;
}

/** Check if revenue is declining for N consecutive quarters */
export function isRevenueDecliningQuarters(periods: StabilityPeriod[], quarters: number): boolean {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  if (sorted.length < quarters * 3) return false;

  // Group into quarters by taking 3-month sums from the end
  const quarterSums: number[] = [];
  let idx = sorted.length;
  while (idx >= 3 && quarterSums.length < quarters + 1) {
    const q = sorted.slice(idx - 3, idx).reduce((s, p) => s + p.revenue, 0);
    quarterSums.unshift(q);
    idx -= 3;
  }

  if (quarterSums.length < quarters + 1) return false;

  // Check if last N quarters are each lower than the previous
  const recent = quarterSums.slice(quarterSums.length - (quarters + 1));
  for (let i = 1; i < recent.length; i++) {
    if (recent[i]! >= recent[i - 1]!) return false;
  }
  return true;
}

/** Classify business pattern based on CV, trend, and seasonality */
export function classifyPattern(
  cv: number,
  revenueDropMonths: number,
  totalMonths: number,
  isDeclining3Q: boolean,
  hasSeasonality: boolean,
): PatternClassification {
  // Deteriorating: declining 3+ quarters
  if (isDeclining3Q) return 'deteriorando';

  // Erratic: high CV and many drop months
  const dropRatio = totalMonths > 0 ? revenueDropMonths / totalMonths : 0;
  if (cv > 0.40 || dropRatio > 0.30) return 'erratico';

  // Cyclic: moderate CV with seasonality detected
  if (hasSeasonality && cv > 0.15) return 'ciclico';

  // Stable: low CV
  return 'estable';
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

/** Revenue variation sub-score (0-100): lower average absolute variation is better */
export function calcRevenueVariationSubScore(avgAbsVariation: number): number {
  if (avgAbsVariation <= 0.05) return 100;
  if (avgAbsVariation <= 0.10) return 80;
  if (avgAbsVariation <= 0.20) return 60;
  if (avgAbsVariation <= 0.35) return 35;
  return 10;
}

/** Coefficient of variation sub-score (0-100): lower CV is better */
export function calcCVSubScore(cv: number): number {
  if (cv <= 0.10) return 100;
  if (cv <= 0.20) return 80;
  if (cv <= 0.30) return 55;
  if (cv <= 0.50) return 30;
  return 10;
}

/** Seasonality sub-score (0-100): predictable seasonality is OK, erratic is bad */
export function calcSeasonalitySubScore(
  hasSeasonality: boolean,
  negativeMarginMonths: number,
  totalMonths: number,
): number {
  const negRatio = totalMonths > 0 ? negativeMarginMonths / totalMonths : 0;

  let score = 70; // base

  // Predictable seasonality is acceptable
  if (hasSeasonality) score += 15;

  // Negative margin months penalize
  if (negRatio > 0.25) score -= 40;
  else if (negRatio > 0.15) score -= 25;
  else if (negRatio > 0.05) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/** Pattern classification sub-score (0-100) */
export function calcPatternSubScore(pattern: PatternClassification): number {
  switch (pattern) {
    case 'estable': return 100;
    case 'ciclico': return 65;
    case 'erratico': return 25;
    case 'deteriorando': return 10;
  }
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
  cv: number,
  _avgAbsVariation: number,
  cancellationRatio: number,
  creditNoteRatio: number,
  negativeMarginMonths: number,
  totalMonths: number,
  isDeclining3Q: boolean,
  pattern: PatternClassification,
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // High volatility (CV covers avgAbsVariation)
  if (cv > 0.40) {
    flags.push({
      code: 'high_volatility',
      severity: 'critical',
      message: `Coefficient of variation ${(cv * 100).toFixed(1)}% indicates highly volatile revenue`,
      source_metric: 'coefficient_of_variation',
      value: cv,
      threshold: 0.40,
    });
  } else if (cv > 0.25) {
    flags.push({
      code: 'elevated_volatility',
      severity: 'warning',
      message: `Coefficient of variation ${(cv * 100).toFixed(1)}% indicates elevated revenue volatility`,
      source_metric: 'coefficient_of_variation',
      value: cv,
      threshold: 0.25,
    });
  }

  // Revenue declining 3+ quarters
  if (isDeclining3Q) {
    flags.push({
      code: 'revenue_declining_3q',
      severity: 'critical',
      message: 'Revenue has been declining for 3 or more consecutive quarters',
      source_metric: 'quarterly_revenue_trend',
    });
  }

  // High cancellations (> 10% of sales)
  if (cancellationRatio > 0.10) {
    flags.push({
      code: 'high_cancellation_ratio',
      severity: 'warning',
      message: `Cancellations represent ${(cancellationRatio * 100).toFixed(1)}% of sales (threshold: 10%)`,
      source_metric: 'cancellation_ratio',
      value: cancellationRatio,
      threshold: 0.10,
    });
  }

  // High credit notes (> 8% of sales)
  if (creditNoteRatio > 0.08) {
    flags.push({
      code: 'high_credit_note_ratio',
      severity: 'warning',
      message: `Credit notes represent ${(creditNoteRatio * 100).toFixed(1)}% of sales (threshold: 8%)`,
      source_metric: 'credit_note_ratio',
      value: creditNoteRatio,
      threshold: 0.08,
    });
  }

  // Negative margin months
  const negRatio = totalMonths > 0 ? negativeMarginMonths / totalMonths : 0;
  if (negRatio > 0.15) {
    flags.push({
      code: 'frequent_negative_margins',
      severity: 'critical',
      message: `${negativeMarginMonths} of ${totalMonths} months had negative margins (${(negRatio * 100).toFixed(0)}%)`,
      source_metric: 'negative_margin_months',
      value: negativeMarginMonths,
      threshold: Math.ceil(totalMonths * 0.15),
    });
  }

  // Erratic pattern
  if (pattern === 'erratico') {
    flags.push({
      code: 'erratic_pattern',
      severity: 'warning',
      message: 'Business revenue pattern classified as erratic — unpredictable cash flows',
      source_metric: 'pattern_classification',
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(
  periods: StabilityPeriod[],
  extractor: (p: StabilityPeriod) => number,
): TimeSeriesPoint[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  return sorted.map((p) => ({
    period: p.period,
    value: Math.round(extractor(p) * 10000) / 10000,
  }));
}

export function analyzeTrends(periods: StabilityPeriod[]): TrendResult[] {
  if (periods.length < 2) return [];

  const configs: Array<{
    config: TrendConfig;
    extractor: (p: StabilityPeriod) => number;
  }> = [
    {
      config: {
        metric_name: 'monthly_revenue',
        metric_label: 'Monthly Revenue',
        unit: '$',
        higher_is_better: true,
        warning_threshold: undefined,
        critical_threshold: undefined,
        benchmark_value: undefined,
        projection_months: 3,
        y_axis_format: '$',
      },
      extractor: (p) => p.revenue,
    },
    {
      config: {
        metric_name: 'operating_margin',
        metric_label: 'Operating Margin',
        unit: '%',
        higher_is_better: true,
        warning_threshold: 0.05,
        critical_threshold: 0,
        benchmark_value: 0.15,
        projection_months: 3,
        y_axis_format: '%',
      },
      extractor: (p) => calcMargin(p.revenue, p.expenses),
    },
    {
      config: {
        metric_name: 'active_clients',
        metric_label: 'Active Clients',
        unit: 'count',
        higher_is_better: true,
        warning_threshold: undefined,
        critical_threshold: undefined,
        benchmark_value: undefined,
        projection_months: 3,
        y_axis_format: 'count',
      },
      extractor: (p) => p.active_clients,
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
  avgAbsVariation: number;
  cv: number;
  cancellationRatio: number;
  creditNoteRatio: number;
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
    revenue_variation: compare('revenue_variation', metrics.avgAbsVariation, BENCHMARKS.revenue_variation, false),
    coefficient_of_variation: compare('coefficient_of_variation', metrics.cv, BENCHMARKS.coefficient_of_variation, false),
    cancellation_ratio: compare('cancellation_ratio', metrics.cancellationRatio, BENCHMARKS.cancellation_ratio, false),
    credit_note_ratio: compare('credit_note_ratio', metrics.creditNoteRatio, BENCHMARKS.credit_note_ratio, false),
  };
}

function buildKeyMetrics(data: {
  avgAbsVariation: number;
  stdDev: number;
  cv: number;
  cancellationRatio: number;
  creditNoteRatio: number;
  revenueDropCount: number;
  negativeMarginCount: number;
  pattern: PatternClassification;
  totalMonths: number;
}): Record<string, MetricValue> {
  function metric(
    name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: 'positive' | 'neutral' | 'negative',
  ): MetricValue {
    return {
      name, label, value: Math.round(value * 10000) / 10000, unit,
      source: 'stability_engine', formula, interpretation, impact_on_score: impact,
    };
  }

  return {
    avg_abs_variation: metric('avg_abs_variation', 'Avg Absolute Revenue Variation', data.avgAbsVariation, '%',
      'avg(abs((revenue[i] - revenue[i-1]) / revenue[i-1]))',
      data.avgAbsVariation <= 0.10 ? 'Stable revenue' : 'Volatile revenue',
      data.avgAbsVariation <= 0.10 ? 'positive' : 'negative'),
    std_dev: metric('std_dev', 'Revenue Std Deviation', data.stdDev, '$',
      'stddev(monthly_revenue)',
      'Dispersion of monthly revenue values',
      'neutral'),
    coefficient_of_variation: metric('coefficient_of_variation', 'Coefficient of Variation', data.cv, '%',
      'stddev / mean',
      data.cv <= 0.20 ? 'Acceptable variability' : 'High variability',
      data.cv <= 0.20 ? 'positive' : 'negative'),
    cancellation_ratio: metric('cancellation_ratio', 'Cancellations / Sales', data.cancellationRatio, '%',
      'total_cancellations / total_revenue',
      data.cancellationRatio <= 0.10 ? 'Normal cancellation level' : 'High cancellations',
      data.cancellationRatio <= 0.10 ? 'positive' : 'negative'),
    credit_note_ratio: metric('credit_note_ratio', 'Credit Notes / Sales', data.creditNoteRatio, '%',
      'total_credit_notes / total_revenue',
      data.creditNoteRatio <= 0.05 ? 'Normal credit note level' : 'Elevated credit notes',
      data.creditNoteRatio <= 0.05 ? 'neutral' : 'negative'),
    revenue_drop_months: metric('revenue_drop_months', 'Months with >20% Drop', data.revenueDropCount, 'count',
      'count(months where revenue drop > 20%)',
      data.revenueDropCount <= 2 ? 'Few significant drops' : 'Frequent revenue drops',
      data.revenueDropCount <= 2 ? 'positive' : 'negative'),
    negative_margin_months: metric('negative_margin_months', 'Negative Margin Months', data.negativeMarginCount, 'count',
      'count(months where expenses > revenue)',
      data.negativeMarginCount === 0 ? 'No negative margin months' : 'Some months with losses',
      data.negativeMarginCount === 0 ? 'positive' : 'negative'),
    pattern_classification: metric('pattern_classification', 'Business Pattern', patternToNumeric(data.pattern), 'classification',
      'classifyPattern(cv, drops, declining, seasonality)',
      `Pattern: ${data.pattern}`,
      data.pattern === 'estable' ? 'positive' : data.pattern === 'ciclico' ? 'neutral' : 'negative'),
  };
}

function patternToNumeric(pattern: PatternClassification): number {
  switch (pattern) {
    case 'estable': return 4;
    case 'ciclico': return 3;
    case 'erratico': return 2;
    case 'deteriorando': return 1;
  }
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, pattern: PatternClassification, flags: RiskFlag[]): string {
  const flagSummary = flags.length > 0
    ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
    : ' No risk flags detected.';
  return `Stability engine score: ${score}/100 (Grade ${grade}). Pattern: ${pattern}.${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('high_volatility')) actions.push('Investigate sources of revenue volatility and diversify income streams');
  if (codes.has('elevated_volatility')) actions.push('Monitor revenue volatility trends closely');
  if (codes.has('revenue_declining_3q')) actions.push('Urgent: revenue declining 3+ quarters — assess business viability');
  if (codes.has('high_cancellation_ratio')) actions.push('Review cancellation causes — high cancellations may indicate quality or client issues');
  if (codes.has('frequent_negative_margins')) actions.push('Address recurring negative margins — review cost structure');
  if (codes.has('erratic_pattern')) actions.push('Erratic revenue pattern — require additional guarantees or shorter term');

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runStabilityEngine(input: EngineInput): Promise<EngineOutput> {
  const stabData = input.syntage_data as StabilityInput | undefined;

  if (!stabData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_stability_data',
        severity: 'critical',
        message: 'No stability data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Stability engine blocked: no data provided.',
      recommended_actions: ['Ensure SAT invoicing data is available for stability analysis'],
      created_at: new Date().toISOString(),
    };
  }

  const { periods } = stabData;

  if (periods.length === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'insufficient_stability_data',
        severity: 'critical',
        message: 'No periods available for stability analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Stability engine blocked: no period data.',
      recommended_actions: ['Upload at least 12 months of invoicing data for stability analysis'],
      created_at: new Date().toISOString(),
    };
  }

  // Sort periods chronologically
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  const totalMonths = sorted.length;

  // Revenue values for statistical calculations
  const revenues = sorted.map((p) => p.revenue);

  // Monthly variations
  const variations: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    variations.push(calcRevenueVariation(sorted[i]!.revenue, sorted[i - 1]!.revenue));
  }
  const absVariations = variations.map(Math.abs);
  const avgAbsVariation = absVariations.length > 0
    ? absVariations.reduce((s, v) => s + v, 0) / absVariations.length
    : 0;

  // Statistical measures
  const stdDev = calcStdDev(revenues);
  const cv = calcCoefficientOfVariation(revenues);

  // Totals for ratios
  const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
  const totalCancellations = sorted.reduce((s, p) => s + p.cancellations, 0);
  const totalCreditNotes = sorted.reduce((s, p) => s + p.credit_notes, 0);
  const cancellationRatio = calcCancellationRatio(totalCancellations, totalRevenue);
  const creditNoteRatio = calcCreditNoteRatio(totalCreditNotes, totalRevenue);

  // Drop and margin analysis
  const revenueDropMonths = detectRevenueDropMonths(sorted);
  const negativeMarginMonths = detectNegativeMarginMonths(sorted);
  const isDeclining3Q = isRevenueDecliningQuarters(sorted, 3);

  // Seasonality detection via trendUtils
  const revenueSeries = buildTimeSeries(sorted, (p) => p.revenue);
  const seasonality = trendUtils.detectSeasonality(revenueSeries);
  const hasSeasonality = seasonality !== null;

  // Pattern classification
  const pattern = classifyPattern(cv, revenueDropMonths.length, totalMonths, isDeclining3Q, hasSeasonality);

  // Risk flags
  const riskFlags = generateRiskFlags(
    cv, avgAbsVariation, cancellationRatio, creditNoteRatio,
    negativeMarginMonths.length, totalMonths, isDeclining3Q, pattern,
  );

  // Trends
  const trends = analyzeTrends(sorted);
  const trendFactor = trendUtils.calculateTrendFactor(trends);

  // Sub-scores
  const subScores = {
    revenue_variation: calcRevenueVariationSubScore(avgAbsVariation),
    coefficient_of_variation: calcCVSubScore(cv),
    seasonality: calcSeasonalitySubScore(hasSeasonality, negativeMarginMonths.length, totalMonths),
    pattern_classification: calcPatternSubScore(pattern),
    trend_quality: calcTrendQualitySubScore(trends),
  };

  // Weighted raw score
  const rawScore =
    subScores.revenue_variation * SUB_WEIGHTS.revenue_variation +
    subScores.coefficient_of_variation * SUB_WEIGHTS.coefficient_of_variation +
    subScores.seasonality * SUB_WEIGHTS.seasonality +
    subScores.pattern_classification * SUB_WEIGHTS.pattern_classification +
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
      avgAbsVariation, stdDev, cv,
      cancellationRatio, creditNoteRatio,
      revenueDropCount: revenueDropMonths.length,
      negativeMarginCount: negativeMarginMonths.length,
      pattern, totalMonths,
    }),
    benchmark_comparison: buildBenchmarks({
      avgAbsVariation, cv, cancellationRatio, creditNoteRatio,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, pattern, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
