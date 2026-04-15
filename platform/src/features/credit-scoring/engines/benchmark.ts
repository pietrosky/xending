import type {
  EngineInput,
  EngineOutput,
  MetricValue,
  BenchmarkComparison,
  RiskFlag,
  ModuleGrade,
  ModuleStatus,
  BenchmarkStatus,
} from '../types/engine.types';
import type { TimeSeriesPoint, TrendConfig, TrendResult } from '../types/trend.types';
import { trendUtils } from '../lib/trendUtils';

// ============================================================
// Constants
// ============================================================

const ENGINE_NAME = 'benchmark';

const SUB_WEIGHTS = {
  sector_comparison: 0.30,
  size_comparison: 0.25,
  cross_validation: 0.30,
  trend_quality: 0.15,
} as const;

const THRESHOLDS = {
  at_tolerance_pct: 5,
  warning_deviation_pct: 20,
  critical_deviation_pct: 40,
  cross_validation_warning_pct: 15,
  cross_validation_critical_pct: 30,
} as const;

// Conservative benchmarks for Mexican SOFOM lending to SMEs.
// These represent the minimum "healthy" thresholds Xending considers
// acceptable for credit approval. They serve as Fase 1 (static defaults)
// and will be superseded by portfolio data (Fase 2) or industry data (Fase 3)
// once available.
const DEFAULT_BENCHMARKS: Record<string, IndustryBenchmark> = {
  // --- Financial (Fase 1: conservative SOFOM thresholds) ---
  dscr: { category: 'financial', metric_name: 'dscr', benchmark_value: 1.3, higher_is_better: true },
  current_ratio: { category: 'financial', metric_name: 'current_ratio', benchmark_value: 1.2, higher_is_better: true },
  quick_ratio: { category: 'financial', metric_name: 'quick_ratio', benchmark_value: 0.8, higher_is_better: true },
  leverage: { category: 'financial', metric_name: 'leverage', benchmark_value: 0.65, higher_is_better: false },
  debt_equity_ratio: { category: 'financial', metric_name: 'debt_equity_ratio', benchmark_value: 2.0, higher_is_better: false },
  margin: { category: 'financial', metric_name: 'margin', benchmark_value: 0.10, higher_is_better: true },
  gross_margin: { category: 'financial', metric_name: 'gross_margin', benchmark_value: 0.25, higher_is_better: true },
  roa: { category: 'financial', metric_name: 'roa', benchmark_value: 0.05, higher_is_better: true },
  roe: { category: 'financial', metric_name: 'roe', benchmark_value: 0.10, higher_is_better: true },
  interest_coverage: { category: 'financial', metric_name: 'interest_coverage', benchmark_value: 2.0, higher_is_better: true },
  // --- Operational ---
  dso: { category: 'operational', metric_name: 'dso', benchmark_value: 60, higher_is_better: false },
  dpo: { category: 'operational', metric_name: 'dpo', benchmark_value: 45, higher_is_better: true },
  inventory_days: { category: 'operational', metric_name: 'inventory_days', benchmark_value: 90, higher_is_better: false },
  revenue_growth: { category: 'operational', metric_name: 'revenue_growth', benchmark_value: 0.05, higher_is_better: true },
  cash_conversion_cycle: { category: 'operational', metric_name: 'cash_conversion_cycle', benchmark_value: 90, higher_is_better: false },
  // --- Efficiency ---
  employee_productivity: { category: 'efficiency', metric_name: 'employee_productivity', benchmark_value: 400000, higher_is_better: true },
  working_capital_efficiency: { category: 'efficiency', metric_name: 'working_capital_efficiency', benchmark_value: 0.15, higher_is_better: true },
  asset_turnover: { category: 'efficiency', metric_name: 'asset_turnover', benchmark_value: 0.8, higher_is_better: true },
};

/** Benchmark source priority: industry > portfolio (n>=5) > static */
export type BenchmarkSource = 'industry' | 'portfolio' | 'static';

/** Minimum portfolio sample size to prefer portfolio benchmarks over static */
const MIN_PORTFOLIO_SAMPLE = 5;

// ============================================================
// Input types
// ============================================================

export interface IndustryBenchmark {
  category: 'financial' | 'operational' | 'efficiency';
  metric_name: string;
  benchmark_value: number;
  higher_is_better: boolean;
}

export interface ApplicantMetric {
  metric_name: string;
  value: number;
}

export interface SyntageRatio {
  metric_name: string;
  syntage_value: number;
}

export interface BenchmarkPeriod {
  period: string;
  applicant_metrics: ApplicantMetric[];
}

export interface BenchmarkMetricResult {
  category: string;
  metric_name: string;
  applicant_value: number;
  benchmark_value: number;
  percentile: number;
  deviation_pct: number;
}

export interface BenchmarkInput {
  sector: string;
  company_size: 'micro' | 'small' | 'medium' | 'large';
  region: string;
  applicant_metrics: ApplicantMetric[];
  /** Industry-level benchmarks (Fase 3) — highest priority */
  industry_benchmarks?: Record<string, IndustryBenchmark>;
  /** Portfolio-derived benchmarks (Fase 2) — used when sample >= MIN_PORTFOLIO_SAMPLE */
  portfolio_benchmarks?: Record<string, IndustryBenchmark>;
  /** Number of approved companies in same sector used to build portfolio benchmarks */
  portfolio_sample_size?: number;
  /** Legacy alias for industry_benchmarks */
  sector_benchmarks?: Record<string, IndustryBenchmark>;
  syntage_ratios?: SyntageRatio[];
  periods?: BenchmarkPeriod[];
}

// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

export function calcDeviation(applicantValue: number, benchmarkValue: number): number {
  if (benchmarkValue === 0) return applicantValue === 0 ? 0 : 100;
  return ((applicantValue - benchmarkValue) / Math.abs(benchmarkValue)) * 100;
}

export function calcPercentile(deviation: number, higherIsBetter: boolean): number {
  const adjustedDev = higherIsBetter ? deviation : -deviation;
  const percentile = 50 + adjustedDev * 1.5;
  return Math.max(0, Math.min(100, Math.round(percentile)));
}

export function crossValidateRatio(
  applicantValue: number,
  syntageValue: number,
): { deviation_pct: number; consistent: boolean } {
  if (syntageValue === 0 && applicantValue === 0) {
    return { deviation_pct: 0, consistent: true };
  }
  const base = syntageValue !== 0 ? Math.abs(syntageValue) : Math.abs(applicantValue);
  const devPct = base > 0 ? (Math.abs(applicantValue - syntageValue) / base) * 100 : 0;
  return {
    deviation_pct: Math.round(devPct * 100) / 100,
    consistent: devPct <= THRESHOLDS.cross_validation_warning_pct,
  };
}

export function compareMetric(
  metric: ApplicantMetric,
  benchmark: IndustryBenchmark,
): BenchmarkMetricResult {
  const devPct = calcDeviation(metric.value, benchmark.benchmark_value);
  const percentile = calcPercentile(devPct, benchmark.higher_is_better);
  return {
    category: benchmark.category,
    metric_name: metric.metric_name,
    applicant_value: metric.value,
    benchmark_value: benchmark.benchmark_value,
    percentile,
    deviation_pct: Math.round(devPct * 100) / 100,
  };
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

export function calcSectorComparisonSubScore(results: BenchmarkMetricResult[]): number {
  if (results.length === 0) return 50;
  const aboveCount = results.filter((r) => r.percentile >= 55).length;
  const belowCount = results.filter((r) => r.percentile < 40).length;
  const ratio = aboveCount / results.length;
  if (belowCount > results.length / 2) return 20;
  if (ratio >= 0.7) return 90;
  if (ratio >= 0.5) return 70;
  if (ratio >= 0.3) return 50;
  return 30;
}

export function calcSizeComparisonSubScore(results: BenchmarkMetricResult[]): number {
  if (results.length === 0) return 50;
  const avgAbsDev = results.reduce((sum, r) => sum + Math.abs(r.deviation_pct), 0) / results.length;
  if (avgAbsDev <= 10) return 95;
  if (avgAbsDev <= 20) return 80;
  if (avgAbsDev <= 35) return 60;
  if (avgAbsDev <= 50) return 40;
  return 20;
}

export function calcCrossValidationSubScore(
  applicantMetrics: ApplicantMetric[],
  syntageRatios: SyntageRatio[],
): number {
  if (syntageRatios.length === 0) return 50;
  const syntageMap = new Map(syntageRatios.map((r) => [r.metric_name, r.syntage_value]));
  let matchCount = 0;
  let totalCompared = 0;
  for (const metric of applicantMetrics) {
    const syntageVal = syntageMap.get(metric.metric_name);
    if (syntageVal === undefined) continue;
    totalCompared++;
    const { consistent } = crossValidateRatio(metric.value, syntageVal);
    if (consistent) matchCount++;
  }
  if (totalCompared === 0) return 50;
  const consistencyRatio = matchCount / totalCompared;
  if (consistencyRatio >= 0.9) return 95;
  if (consistencyRatio >= 0.7) return 75;
  if (consistencyRatio >= 0.5) return 50;
  if (consistencyRatio >= 0.3) return 30;
  return 15;
}

export function calcTrendQualitySubScore(trends: TrendResult[]): number {
  if (trends.length === 0) return 50;
  const hasCritical = trends.some((t) => t.direction === 'critical');
  if (hasCritical) return 10;
  const improvingCount = trends.filter((t) => t.direction === 'improving').length;
  const deterioratingCount = trends.filter((t) => t.direction === 'deteriorating').length;
  const ratio = improvingCount / trends.length;
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
  benchmarkResults: BenchmarkMetricResult[];
  crossValidations: Array<{ metric_name: string; deviation_pct: number; consistent: boolean }>;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  for (const r of data.benchmarkResults) {
    if (r.percentile < 20) {
      flags.push({
        code: 'below_benchmark_' + r.metric_name,
        severity: r.percentile < 10 ? 'critical' : 'warning',
        message: r.metric_name + ' at percentile ' + r.percentile,
        source_metric: r.metric_name,
        value: r.applicant_value,
        threshold: r.benchmark_value,
      });
    }
  }

  for (const cv of data.crossValidations) {
    if (!cv.consistent) {
      const sev = cv.deviation_pct > THRESHOLDS.cross_validation_critical_pct ? 'critical' : 'warning';
      flags.push({
        code: 'cross_validation_mismatch_' + cv.metric_name,
        severity: sev,
        message: cv.metric_name + ' deviates ' + cv.deviation_pct.toFixed(1) + '% from Syntage',
        source_metric: cv.metric_name,
        value: cv.deviation_pct,
        threshold: THRESHOLDS.cross_validation_warning_pct,
      });
    }
  }

  const belowCount = data.benchmarkResults.filter((r) => r.percentile < 40).length;
  if (data.benchmarkResults.length > 0 && belowCount > data.benchmarkResults.length / 2) {
    flags.push({
      code: 'majority_below_benchmark',
      severity: 'warning',
      message: belowCount + ' of ' + data.benchmarkResults.length + ' metrics below benchmark',
      value: belowCount,
      threshold: Math.ceil(data.benchmarkResults.length / 2),
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(periods: BenchmarkPeriod[], metricName: string): TimeSeriesPoint[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  return sorted
    .map((p) => {
      const m = p.applicant_metrics.find((x) => x.metric_name === metricName);
      if (!m) return null;
      return { period: p.period, value: m.value };
    })
    .filter((pt): pt is TimeSeriesPoint => pt !== null);
}

export function analyzeTrends(
  periods: BenchmarkPeriod[],
  benchmarks: Record<string, IndustryBenchmark>,
): TrendResult[] {
  if (periods.length < 2) return [];
  const metricNames = new Set<string>();
  for (const p of periods) {
    for (const m of p.applicant_metrics) {
      metricNames.add(m.metric_name);
    }
  }
  const results: TrendResult[] = [];
  for (const metricName of metricNames) {
    const series = buildTimeSeries(periods, metricName);
    if (series.length < 2) continue;
    const bm = benchmarks[metricName] ?? DEFAULT_BENCHMARKS[metricName];
    const config: TrendConfig = {
      metric_name: metricName,
      metric_label: metricName.replace(/_/g, ' '),
      unit: 'value',
      higher_is_better: bm?.higher_is_better ?? true,
      benchmark_value: bm?.benchmark_value,
      projection_months: 3,
      y_axis_format: 'value',
    };
    results.push(trendUtils.analyze(series, config));
  }
  return results;
}

// ============================================================
// Benchmarks and key metrics builders
// ============================================================

function buildBenchmarkComparisons(
  results: BenchmarkMetricResult[],
): Record<string, BenchmarkComparison> {
  const comparisons: Record<string, BenchmarkComparison> = {};
  for (const r of results) {
    const absDev = Math.abs(r.deviation_pct);
    let status: BenchmarkStatus;
    if (absDev <= THRESHOLDS.at_tolerance_pct) {
      status = 'at';
    } else if (r.percentile >= 50) {
      status = 'above';
    } else {
      status = 'below';
    }
    comparisons[r.metric_name] = {
      metric: r.metric_name,
      applicant_value: r.applicant_value,
      benchmark_value: r.benchmark_value,
      deviation_percent: r.deviation_pct,
      status,
    };
  }
  return comparisons;
}

function buildKeyMetrics(data: {
  benchmarkResults: BenchmarkMetricResult[];
  crossValidations: Array<{ metric_name: string; deviation_pct: number; consistent: boolean }>;
  sector: string;
  companySize: string;
  avgPercentile: number;
  consistencyRate: number;
  benchmarkSource: BenchmarkSource;
  portfolioSampleSize: number;
}): Record<string, MetricValue> {
  function m(
    name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: 'positive' | 'neutral' | 'negative',
  ): MetricValue {
    return {
      name, label, value: Math.round(value * 10000) / 10000, unit,
      source: 'benchmark_engine', formula, interpretation, impact_on_score: impact,
    };
  }
  const aboveCount = data.benchmarkResults.filter((r) => r.percentile >= 55).length;
  const belowCount = data.benchmarkResults.filter((r) => r.percentile < 40).length;
  const atCount = data.benchmarkResults.length - aboveCount - belowCount;
  return {
    avg_percentile: m('avg_percentile', 'Average Percentile', data.avgPercentile, 'percentile',
      'avg of all metric percentiles',
      data.avgPercentile >= 50 ? 'Above average vs industry' : 'Below average vs industry',
      data.avgPercentile >= 50 ? 'positive' : 'negative'),
    metrics_above: m('metrics_above', 'Metrics Above Benchmark', aboveCount, 'count',
      'count of metrics with percentile >= 55',
      aboveCount + ' metrics above benchmark', aboveCount > belowCount ? 'positive' : 'neutral'),
    metrics_at: m('metrics_at', 'Metrics At Benchmark', atCount, 'count',
      'count of metrics with percentile 40-54',
      atCount + ' metrics at benchmark', 'neutral'),
    metrics_below: m('metrics_below', 'Metrics Below Benchmark', belowCount, 'count',
      'count of metrics with percentile < 40',
      belowCount + ' metrics below benchmark', belowCount > 0 ? 'negative' : 'positive'),
    cross_validation_rate: m('cross_validation_rate', 'Cross-Validation Consistency', data.consistencyRate, '%',
      'consistent ratios / total compared',
      data.consistencyRate >= 0.7 ? 'Good consistency with Syntage data' : 'Significant deviations from Syntage data',
      data.consistencyRate >= 0.7 ? 'positive' : 'negative'),
    sector: m('sector', 'Sector', 0, 'text',
      'applicant sector', 'Benchmarked against ' + data.sector + ' sector', 'neutral'),
    company_size: m('company_size', 'Company Size', 0, 'text',
      'applicant size', 'Size category: ' + data.companySize, 'neutral'),
    benchmark_source: m('benchmark_source', 'Benchmark Source', 0, 'text',
      'priority: industry > portfolio > static',
      'Using ' + data.benchmarkSource + ' benchmarks' + (data.benchmarkSource === 'portfolio' ? ' (n=' + data.portfolioSampleSize + ')' : ''),
      'neutral'),
  };
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[], source: BenchmarkSource): string {
  const flagSummary = flags.length > 0
    ? ' Risk flags: ' + flags.map((f) => f.code).join(', ') + '.'
    : ' No risk flags detected.';
  return 'Benchmark engine score: ' + score + '/100 (Grade ' + grade + '). Source: ' + source + '.' + flagSummary;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));
  if (codes.has('majority_below_benchmark')) {
    actions.push('Review overall financial health - majority of metrics are below industry benchmarks');
  }
  const hasCrossVal = [...codes].some((c) => c.startsWith('cross_validation_mismatch_'));
  if (hasCrossVal) {
    actions.push('Investigate discrepancies between applicant-reported and Syntage-derived financial ratios');
  }
  const hasBelowBm = [...codes].some((c) => c.startsWith('below_benchmark_'));
  if (hasBelowBm) {
    actions.push('Request additional documentation for metrics significantly below industry benchmarks');
  }
  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runBenchmarkEngine(input: EngineInput): Promise<EngineOutput> {
  const raw = input.syntage_data as BenchmarkInput | undefined;
  const now = new Date().toISOString();

  if (!raw) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{ code: 'no_benchmark_data', severity: 'critical', message: 'No benchmark data available' }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Benchmark engine blocked: no data provided.',
      recommended_actions: ['Ensure applicant metrics and sector benchmarks are available'],
      created_at: now,
    };
  }

  const {
    sector, company_size, applicant_metrics,
    industry_benchmarks, portfolio_benchmarks, portfolio_sample_size,
    sector_benchmarks, syntage_ratios, periods,
  } = raw;

  if (applicant_metrics.length === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{ code: 'insufficient_benchmark_data', severity: 'critical', message: 'No applicant metrics available' }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Benchmark engine blocked: no applicant metrics.',
      recommended_actions: ['Upload applicant financial metrics'],
      created_at: now,
    };
  }

  // Resolve benchmarks with 3-layer priority:
  // 1. Industry benchmarks (Fase 3) — external data, highest trust
  // 2. Portfolio benchmarks (Fase 2) — own portfolio, if sample >= MIN_PORTFOLIO_SAMPLE
  // 3. Static defaults (Fase 1) — conservative SOFOM thresholds
  const activeBm: Record<string, IndustryBenchmark> = { ...DEFAULT_BENCHMARKS };

  // Layer: portfolio (overrides static when enough sample)
  const sampleSize = portfolio_sample_size ?? 0;
  if (portfolio_benchmarks && sampleSize >= MIN_PORTFOLIO_SAMPLE) {
    for (const [key, val] of Object.entries(portfolio_benchmarks)) {
      activeBm[key] = val;
    }
  }

  // Layer: sector_benchmarks (legacy) or industry_benchmarks (overrides portfolio)
  const industryLayer = industry_benchmarks ?? sector_benchmarks;
  if (industryLayer) {
    for (const [key, val] of Object.entries(industryLayer)) {
      activeBm[key] = val;
    }
  }

  // Determine which source was used for reporting
  let benchmarkSource: BenchmarkSource = 'static';
  if (industryLayer && Object.keys(industryLayer).length > 0) {
    benchmarkSource = 'industry';
  } else if (portfolio_benchmarks && sampleSize >= MIN_PORTFOLIO_SAMPLE) {
    benchmarkSource = 'portfolio';
  }

  // Compare each applicant metric against benchmarks
  const bmResults: BenchmarkMetricResult[] = [];
  for (const met of applicant_metrics) {
    const bm = activeBm[met.metric_name];
    if (!bm) continue;
    bmResults.push(compareMetric(met, bm));
  }

  // Cross-validate with Syntage ratios
  const cvResults: Array<{ metric_name: string; deviation_pct: number; consistent: boolean }> = [];
  if (syntage_ratios && syntage_ratios.length > 0) {
    for (const met of applicant_metrics) {
      const sr = syntage_ratios.find((r) => r.metric_name === met.metric_name);
      if (!sr) continue;
      const cv = crossValidateRatio(met.value, sr.syntage_value);
      cvResults.push({ metric_name: met.metric_name, ...cv });
    }
  }

  const avgPercentile = bmResults.length > 0
    ? bmResults.reduce((sum, r) => sum + r.percentile, 0) / bmResults.length
    : 50;

  const consistencyRate = cvResults.length > 0
    ? cvResults.filter((cv) => cv.consistent).length / cvResults.length
    : 1;

  // Sub-scores
  const subScores = {
    sector_comparison: calcSectorComparisonSubScore(bmResults),
    size_comparison: calcSizeComparisonSubScore(bmResults),
    cross_validation: calcCrossValidationSubScore(applicant_metrics, syntage_ratios ?? []),
    trend_quality: 50,
  };

  const trends = analyzeTrends(periods ?? [], activeBm);
  subScores.trend_quality = calcTrendQualitySubScore(trends);

  const rawScore =
    subScores.sector_comparison * SUB_WEIGHTS.sector_comparison +
    subScores.size_comparison * SUB_WEIGHTS.size_comparison +
    subScores.cross_validation * SUB_WEIGHTS.cross_validation +
    subScores.trend_quality * SUB_WEIGHTS.trend_quality;

  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));
  const grade = scoreToGrade(finalScore);
  const riskFlags = generateRiskFlags({ benchmarkResults: bmResults, crossValidations: cvResults });
  const status = scoreToStatus(finalScore, riskFlags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics({
      benchmarkResults: bmResults,
      crossValidations: cvResults,
      sector,
      companySize: company_size,
      avgPercentile,
      consistencyRate,
      benchmarkSource,
      portfolioSampleSize: sampleSize,
    }),
    benchmark_comparison: buildBenchmarkComparisons(bmResults),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags, benchmarkSource),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: now,
  };
}
