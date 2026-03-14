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

const ENGINE_NAME = 'covenant';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  compliance_rate: 0.35,
  breach_severity: 0.30,
  trend_quality: 0.20,
  coverage: 0.15,
} as const;

/** Warning zone: within 10% of threshold */
const WARNING_ZONE_PCT = 0.10;

/** Benchmarks for covenant metrics */
const BENCHMARKS = {
  compliance_rate: 0.90,
  breach_count: 0,
  avg_headroom: 0.20,
  financial_compliance: 0.95,
} as const;

// ============================================================
// Input types
// ============================================================

export type CovenantType = 'financial' | 'operational' | 'reporting';

export type CovenantName =
  | 'dscr'
  | 'leverage'
  | 'current_ratio'
  | 'net_worth'
  | 'revenue_growth'
  | 'margin'
  | 'timely_delivery';

export type CovenantStatus = 'compliant' | 'warning' | 'breach' | 'waived';

export interface Covenant {
  type: CovenantType;
  name: CovenantName;
  threshold: number;
  current_value: number;
  higher_is_better: boolean;
  waived?: boolean;
}

export interface CovenantPeriod {
  period: string;
  covenants: Covenant[];
}

export interface CovenantInput {
  covenants: Covenant[];
  periods: CovenantPeriod[];
}


// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

/** Determine covenant status by comparing current_value against threshold */
export function checkCovenantStatus(covenant: Covenant): CovenantStatus {
  if (covenant.waived) return 'waived';

  const { threshold, current_value, higher_is_better } = covenant;
  if (threshold === 0) return 'compliant';

  if (higher_is_better) {
    // e.g. DSCR: current must be >= threshold
    if (current_value >= threshold) {
      // Check warning zone: within 10% above threshold
      const warningBound = threshold * (1 + WARNING_ZONE_PCT);
      return current_value < warningBound ? 'warning' : 'compliant';
    }
    return 'breach';
  } else {
    // e.g. leverage: current must be <= threshold
    if (current_value <= threshold) {
      // Check warning zone: within 10% below threshold
      const warningBound = threshold * (1 - WARNING_ZONE_PCT);
      return current_value > warningBound ? 'warning' : 'compliant';
    }
    return 'breach';
  }
}

/** Calculate compliance rate: fraction of covenants that are compliant or waived */
export function calcComplianceRate(covenants: Covenant[]): number {
  if (covenants.length === 0) return 1;
  const statuses = covenants.map((c) => checkCovenantStatus(c));
  const compliantCount = statuses.filter((s) => s === 'compliant' || s === 'waived').length;
  return compliantCount / covenants.length;
}

/** Calculate breach severity: weighted penalty based on how far breached covenants deviate */
export function calcBreachSeverity(covenants: Covenant[]): number {
  const breached = covenants.filter((c) => checkCovenantStatus(c) === 'breach');
  if (breached.length === 0) return 0;

  let totalDeviation = 0;
  for (const c of breached) {
    if (c.threshold === 0) continue;
    const deviation = Math.abs(c.current_value - c.threshold) / Math.abs(c.threshold);
    totalDeviation += deviation;
  }
  return totalDeviation / breached.length;
}

/** Calculate average headroom across compliant covenants */
export function calcAvgHeadroom(covenants: Covenant[]): number {
  const compliant = covenants.filter((c) => {
    const status = checkCovenantStatus(c);
    return status === 'compliant' || status === 'warning';
  });
  if (compliant.length === 0) return 0;

  let totalHeadroom = 0;
  for (const c of compliant) {
    if (c.threshold === 0) continue;
    if (c.higher_is_better) {
      totalHeadroom += (c.current_value - c.threshold) / Math.abs(c.threshold);
    } else {
      totalHeadroom += (c.threshold - c.current_value) / Math.abs(c.threshold);
    }
  }
  return totalHeadroom / compliant.length;
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

/** Compliance rate sub-score (0-100) */
export function calcComplianceSubScore(complianceRate: number): number {
  if (complianceRate >= 1.0) return 100;
  if (complianceRate >= 0.90) return 85;
  if (complianceRate >= 0.75) return 65;
  if (complianceRate >= 0.50) return 40;
  if (complianceRate >= 0.25) return 20;
  return 5;
}

/** Breach severity sub-score (0-100): lower severity = higher score */
export function calcBreachSeveritySubScore(severity: number): number {
  if (severity <= 0) return 100;
  if (severity <= 0.05) return 85;
  if (severity <= 0.15) return 65;
  if (severity <= 0.30) return 40;
  if (severity <= 0.50) return 20;
  return 5;
}

/** Trend quality sub-score (0-100) based on trend directions */
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

/** Coverage sub-score (0-100) based on covenant type coverage */
export function calcCoverageSubScore(covenants: Covenant[]): number {
  if (covenants.length === 0) return 0;
  const types = new Set(covenants.map((c) => c.type));
  const typeCount = types.size;
  // 3 types = full coverage, 2 = good, 1 = limited
  if (typeCount >= 3) return 100;
  if (typeCount === 2) return 70;
  return 40;
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
  covenants: Covenant[];
  complianceRate: number;
  breachSeverity: number;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Flag each breached covenant
  for (const c of data.covenants) {
    const status = checkCovenantStatus(c);
    if (status === 'breach') {
      flags.push({
        code: `covenant_breach_${c.name}`,
        severity: 'critical',
        message: `Covenant ${c.name} breached: value ${c.current_value} vs threshold ${c.threshold}`,
        source_metric: c.name,
        value: c.current_value,
        threshold: c.threshold,
      });
    }
    if (status === 'warning') {
      flags.push({
        code: `covenant_warning_${c.name}`,
        severity: 'warning',
        message: `Covenant ${c.name} in warning zone: value ${c.current_value} near threshold ${c.threshold}`,
        source_metric: c.name,
        value: c.current_value,
        threshold: c.threshold,
      });
    }
  }

  // Overall compliance flag
  if (data.complianceRate < 0.50) {
    flags.push({
      code: 'low_covenant_compliance',
      severity: 'critical',
      message: `Overall covenant compliance rate ${(data.complianceRate * 100).toFixed(1)}% is critically low`,
      value: data.complianceRate,
    });
  }

  // Severe breach flag
  if (data.breachSeverity > 0.30) {
    flags.push({
      code: 'severe_covenant_breach',
      severity: 'critical',
      message: `Average breach severity ${(data.breachSeverity * 100).toFixed(1)}% is high`,
      value: data.breachSeverity,
      threshold: 0.30,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(
  periods: CovenantPeriod[],
  extractor: (p: CovenantPeriod) => number,
): TimeSeriesPoint[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  return sorted.map((p) => ({
    period: p.period,
    value: Math.round(extractor(p) * 10000) / 10000,
  }));
}

export function analyzeTrends(periods: CovenantPeriod[]): TrendResult[] {
  if (periods.length < 2) return [];

  const configs: Array<{
    config: TrendConfig;
    extractor: (p: CovenantPeriod) => number;
  }> = [
    {
      config: {
        metric_name: 'compliance_rate',
        metric_label: 'Compliance Rate',
        unit: '%',
        higher_is_better: true,
        warning_threshold: 0.75,
        critical_threshold: 0.50,
        benchmark_value: BENCHMARKS.compliance_rate,
        projection_months: 3,
        y_axis_format: '%',
      },
      extractor: (p) => calcComplianceRate(p.covenants),
    },
    {
      config: {
        metric_name: 'breach_count',
        metric_label: 'Breach Count',
        unit: 'count',
        higher_is_better: false,
        warning_threshold: 1,
        critical_threshold: 3,
        benchmark_value: BENCHMARKS.breach_count,
        projection_months: 3,
        y_axis_format: 'count',
      },
      extractor: (p) =>
        p.covenants.filter((c) => checkCovenantStatus(c) === 'breach').length,
    },
    {
      config: {
        metric_name: 'avg_headroom',
        metric_label: 'Average Headroom',
        unit: '%',
        higher_is_better: true,
        warning_threshold: 0.05,
        critical_threshold: 0,
        benchmark_value: BENCHMARKS.avg_headroom,
        projection_months: 3,
        y_axis_format: '%',
      },
      extractor: (p) => calcAvgHeadroom(p.covenants),
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
  complianceRate: number;
  breachCount: number;
  avgHeadroom: number;
  financialCompliance: number;
}): Record<string, BenchmarkComparison> {
  function compare(
    metric: string,
    value: number,
    benchmark: number,
    higherIsBetter: boolean,
  ): BenchmarkComparison {
    const deviation =
      benchmark !== 0 ? ((value - benchmark) / Math.abs(benchmark)) * 100 : 0;
    const tolerance = Math.abs(benchmark) * 0.05;
    let status: 'above' | 'at' | 'below';
    if (higherIsBetter) {
      status =
        value > benchmark + tolerance
          ? 'above'
          : value < benchmark - tolerance
            ? 'below'
            : 'at';
    } else {
      status =
        value < benchmark - tolerance
          ? 'above'
          : value > benchmark + tolerance
            ? 'below'
            : 'at';
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
    compliance_rate: compare(
      'compliance_rate',
      metrics.complianceRate,
      BENCHMARKS.compliance_rate,
      true,
    ),
    breach_count: compare(
      'breach_count',
      metrics.breachCount,
      BENCHMARKS.breach_count,
      false,
    ),
    avg_headroom: compare(
      'avg_headroom',
      metrics.avgHeadroom,
      BENCHMARKS.avg_headroom,
      true,
    ),
    financial_compliance: compare(
      'financial_compliance',
      metrics.financialCompliance,
      BENCHMARKS.financial_compliance,
      true,
    ),
  };
}

function buildKeyMetrics(data: {
  complianceRate: number;
  breachCount: number;
  warningCount: number;
  waivedCount: number;
  avgHeadroom: number;
  breachSeverity: number;
  totalCovenants: number;
  financialCompliance: number;
}): Record<string, MetricValue> {
  function metric(
    name: string,
    label: string,
    value: number,
    unit: string,
    formula: string,
    interpretation: string,
    impact: 'positive' | 'neutral' | 'negative',
  ): MetricValue {
    return {
      name,
      label,
      value: Math.round(value * 10000) / 10000,
      unit,
      source: 'covenant_engine',
      formula,
      interpretation,
      impact_on_score: impact,
    };
  }

  return {
    compliance_rate: metric(
      'compliance_rate',
      'Compliance Rate',
      data.complianceRate,
      '%',
      'compliant_or_waived / total_covenants',
      data.complianceRate >= 0.90
        ? 'Strong covenant compliance'
        : 'Covenant compliance needs attention',
      data.complianceRate >= 0.90 ? 'positive' : 'negative',
    ),
    breach_count: metric(
      'breach_count',
      'Breach Count',
      data.breachCount,
      'count',
      'count of breached covenants',
      data.breachCount === 0
        ? 'No covenant breaches'
        : `${data.breachCount} covenant(s) breached`,
      data.breachCount === 0 ? 'positive' : 'negative',
    ),
    warning_count: metric(
      'warning_count',
      'Warning Count',
      data.warningCount,
      'count',
      'count of covenants in warning zone',
      data.warningCount === 0
        ? 'No covenants in warning zone'
        : `${data.warningCount} covenant(s) near threshold`,
      data.warningCount === 0 ? 'positive' : 'negative',
    ),
    waived_count: metric(
      'waived_count',
      'Waived Count',
      data.waivedCount,
      'count',
      'count of waived covenants',
      `${data.waivedCount} covenant(s) waived`,
      'neutral',
    ),
    avg_headroom: metric(
      'avg_headroom',
      'Average Headroom',
      data.avgHeadroom,
      '%',
      'avg distance from threshold for compliant covenants',
      data.avgHeadroom >= 0.20
        ? 'Comfortable headroom above thresholds'
        : 'Tight headroom on covenants',
      data.avgHeadroom >= 0.20 ? 'positive' : 'negative',
    ),
    breach_severity: metric(
      'breach_severity',
      'Breach Severity',
      data.breachSeverity,
      '%',
      'avg deviation of breached covenants from threshold',
      data.breachSeverity <= 0
        ? 'No breaches'
        : 'Average severity of covenant breaches',
      data.breachSeverity <= 0 ? 'positive' : 'negative',
    ),
    total_covenants: metric(
      'total_covenants',
      'Total Covenants',
      data.totalCovenants,
      'count',
      'total number of covenants monitored',
      `${data.totalCovenants} covenants being monitored`,
      'neutral',
    ),
  };
}


// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(
  score: number,
  grade: ModuleGrade,
  flags: RiskFlag[],
): string {
  const flagSummary =
    flags.length > 0
      ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
      : ' No risk flags detected.';
  return `Covenant engine score: ${score}/100 (Grade ${grade}).${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('low_covenant_compliance'))
    actions.push(
      'Urgently address covenant breaches to restore compliance above 50%',
    );
  if (codes.has('severe_covenant_breach'))
    actions.push(
      'Negotiate covenant waivers or restructure terms to reduce breach severity',
    );

  // Specific covenant breach actions
  for (const code of codes) {
    if (code === 'covenant_breach_dscr')
      actions.push('Improve DSCR through cost reduction or revenue increase');
    if (code === 'covenant_breach_leverage')
      actions.push('Reduce leverage by paying down debt or increasing equity');
    if (code === 'covenant_breach_current_ratio')
      actions.push('Improve liquidity by managing working capital');
    if (code === 'covenant_breach_net_worth')
      actions.push('Strengthen net worth through retained earnings');
    if (code === 'covenant_breach_revenue_growth')
      actions.push('Address declining revenue growth trend');
    if (code === 'covenant_breach_margin')
      actions.push('Improve margins through cost optimization');
    if (code === 'covenant_breach_timely_delivery')
      actions.push('Ensure timely delivery of required reports');
  }

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runCovenantEngine(
  input: EngineInput,
): Promise<EngineOutput> {
  const covenantData = input.syntage_data as CovenantInput | undefined;

  if (!covenantData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [
        {
          code: 'no_covenant_data',
          severity: 'critical',
          message: 'No covenant data available for analysis',
        },
      ],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Covenant engine blocked: no data provided.',
      recommended_actions: ['Ensure covenant data is available'],
      created_at: new Date().toISOString(),
    };
  }

  const { covenants, periods } = covenantData;

  if (covenants.length === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [
        {
          code: 'no_covenants_defined',
          severity: 'critical',
          message: 'No covenants defined for monitoring',
        },
      ],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Covenant engine blocked: no covenants defined.',
      recommended_actions: ['Define covenants for the credit facility'],
      created_at: new Date().toISOString(),
    };
  }

  // Core calculations
  const complianceRate = calcComplianceRate(covenants);
  const breachSeverity = calcBreachSeverity(covenants);
  const avgHeadroom = calcAvgHeadroom(covenants);

  const breachCount = covenants.filter(
    (c) => checkCovenantStatus(c) === 'breach',
  ).length;
  const warningCount = covenants.filter(
    (c) => checkCovenantStatus(c) === 'warning',
  ).length;
  const waivedCount = covenants.filter(
    (c) => checkCovenantStatus(c) === 'waived',
  ).length;

  // Financial covenants compliance
  const financialCovenants = covenants.filter((c) => c.type === 'financial');
  const financialCompliance =
    financialCovenants.length > 0
      ? calcComplianceRate(financialCovenants)
      : 1;

  // Sub-scores
  const subScores = {
    compliance_rate: calcComplianceSubScore(complianceRate),
    breach_severity: calcBreachSeveritySubScore(breachSeverity),
    trend_quality: 50, // placeholder, updated below
    coverage: calcCoverageSubScore(covenants),
  };

  // Trends
  const trends = analyzeTrends(periods);
  subScores.trend_quality = calcTrendQualitySubScore(trends);

  // Weighted raw score
  const rawScore =
    subScores.compliance_rate * SUB_WEIGHTS.compliance_rate +
    subScores.breach_severity * SUB_WEIGHTS.breach_severity +
    subScores.trend_quality * SUB_WEIGHTS.trend_quality +
    subScores.coverage * SUB_WEIGHTS.coverage;

  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));

  const grade = scoreToGrade(finalScore);

  // Risk flags
  const riskFlags = generateRiskFlags({
    covenants,
    complianceRate,
    breachSeverity,
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
      complianceRate,
      breachCount,
      warningCount,
      waivedCount,
      avgHeadroom,
      breachSeverity,
      totalCovenants: covenants.length,
      financialCompliance,
    }),
    benchmark_comparison: buildBenchmarks({
      complianceRate,
      breachCount,
      avgHeadroom,
      financialCompliance,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
