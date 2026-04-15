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

const ENGINE_NAME = 'employee';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  headcount_trend: 0.25,
  productivity: 0.30,
  payroll_ratio: 0.25,
  shell_company: 0.10,
  trend_quality: 0.10,
} as const;

/** Benchmarks for employee metrics */
const BENCHMARKS = {
  payroll_to_revenue: 0.25,        // 25% payroll/revenue is healthy
  revenue_per_employee: 500_000,   // $500K MXN per employee benchmark
  headcount_growth: 0.05,          // 5% annual growth is healthy
} as const;

// ============================================================
// Input types
// ============================================================

export interface EmployeePeriod {
  period: string;          // "2024-01"
  headcount: number;       // unique RFCs with CFDI tipo N
  total_payroll: number;   // total payroll cost
  revenue: number;         // company revenue for the period
  operating_cash_flow?: number; // optional: for payroll sustainability
}

export interface EmployeeInput {
  periods: EmployeePeriod[];
}

// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

/** Revenue per employee */
export function calcRevenuePerEmployee(revenue: number, headcount: number): number {
  if (headcount <= 0) return 0;
  return revenue / headcount;
}

/** Payroll as percentage of revenue */
export function calcPayrollToRevenue(payroll: number, revenue: number): number {
  if (revenue <= 0) return 0;
  return payroll / revenue;
}

/** Average payroll per employee */
export function calcAvgPayrollPerEmployee(payroll: number, headcount: number): number {
  if (headcount <= 0) return 0;
  return payroll / headcount;
}

/** Headcount change between two periods */
export function calcHeadcountChange(current: number, previous: number): number {
  if (previous <= 0) return 0;
  return (current - previous) / previous;
}

/** Detect if headcount dropped > threshold over a window of months */
export function isHeadcountDroppingOverWindow(
  periods: EmployeePeriod[],
  windowMonths: number,
  threshold: number,
): boolean {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  if (sorted.length < windowMonths) return false;

  const recent = sorted.slice(-windowMonths);
  const first = recent[0]!.headcount;
  const last = recent[recent.length - 1]!.headcount;

  if (first <= 0) return false;
  const change = (last - first) / first;
  return change < -threshold;
}

/** Detect possible shell company: very low headcount with high revenue */
export function detectShellCompanyRisk(
  avgHeadcount: number,
  avgRevenue: number,
): 'none' | 'warning' | 'critical' {
  if (avgHeadcount <= 0 && avgRevenue > 0) return 'critical';
  if (avgHeadcount <= 2 && avgRevenue > 1_000_000) return 'critical';
  if (avgHeadcount <= 5 && avgRevenue > 5_000_000) return 'warning';
  return 'none';
}

/** Check if payroll is growing faster than revenue */
export function isPayrollGrowingFasterThanRevenue(periods: EmployeePeriod[]): boolean {
  if (periods.length < 3) return false;
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));

  const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

  const avgPayrollFirst = firstHalf.reduce((s, p) => s + p.total_payroll, 0) / firstHalf.length;
  const avgPayrollSecond = secondHalf.reduce((s, p) => s + p.total_payroll, 0) / secondHalf.length;
  const avgRevenueFirst = firstHalf.reduce((s, p) => s + p.revenue, 0) / firstHalf.length;
  const avgRevenueSecond = secondHalf.reduce((s, p) => s + p.revenue, 0) / secondHalf.length;

  if (avgPayrollFirst <= 0 || avgRevenueFirst <= 0) return false;

  const payrollGrowth = (avgPayrollSecond - avgPayrollFirst) / avgPayrollFirst;
  const revenueGrowth = (avgRevenueSecond - avgRevenueFirst) / avgRevenueFirst;

  return payrollGrowth > revenueGrowth && payrollGrowth > 0;
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

/** Headcount trend sub-score (0-100): stable or growing is better */
export function calcHeadcountTrendSubScore(periods: EmployeePeriod[]): number {
  if (periods.length < 2) return 50;
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));

  const first = sorted[0]!.headcount;
  const last = sorted[sorted.length - 1]!.headcount;

  if (first <= 0) return 30;

  const change = (last - first) / first;

  // Growing or stable
  if (change >= 0.10) return 100;
  if (change >= 0) return 85;
  // Slight decline
  if (change >= -0.10) return 65;
  // Moderate decline
  if (change >= -0.20) return 40;
  // Severe decline
  return 15;
}

/** Productivity sub-score (0-100): higher revenue per employee is better */
export function calcProductivitySubScore(revenuePerEmployee: number): number {
  if (revenuePerEmployee >= 800_000) return 100;
  if (revenuePerEmployee >= 500_000) return 85;
  if (revenuePerEmployee >= 300_000) return 70;
  if (revenuePerEmployee >= 150_000) return 50;
  if (revenuePerEmployee >= 50_000) return 30;
  return 10;
}

/** Payroll ratio sub-score (0-100): lower payroll/revenue is better */
export function calcPayrollRatioSubScore(payrollToRevenue: number): number {
  if (payrollToRevenue <= 0.15) return 100;
  if (payrollToRevenue <= 0.25) return 85;
  if (payrollToRevenue <= 0.35) return 65;
  if (payrollToRevenue <= 0.40) return 40;
  if (payrollToRevenue <= 0.50) return 20;
  return 10;
}

/** Shell company detection sub-score (0-100): no risk is best */
export function calcShellCompanySubScore(
  shellRisk: 'none' | 'warning' | 'critical',
): number {
  switch (shellRisk) {
    case 'none': return 100;
    case 'warning': return 40;
    case 'critical': return 5;
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

export function generateRiskFlags(data: {
  avgHeadcount: number;
  avgRevenue: number;
  payrollToRevenue: number;
  shellRisk: 'none' | 'warning' | 'critical';
  isHeadcountDropping: boolean;
  isPayrollOutpacingRevenue: boolean;
  revenuePerEmployee: number;
  revenuePerEmployeeChange: number;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Shell company detection
  if (data.shellRisk === 'critical') {
    flags.push({
      code: 'possible_shell_company',
      severity: 'critical',
      message: `Very low headcount (${Math.round(data.avgHeadcount)}) with high revenue — possible shell company`,
      source_metric: 'headcount_vs_revenue',
      value: data.avgHeadcount,
    });
  } else if (data.shellRisk === 'warning') {
    flags.push({
      code: 'low_headcount_high_revenue',
      severity: 'warning',
      message: `Low headcount (${Math.round(data.avgHeadcount)}) relative to revenue — review operational substance`,
      source_metric: 'headcount_vs_revenue',
      value: data.avgHeadcount,
    });
  }

  // Headcount dropping > 20% in 6 months
  if (data.isHeadcountDropping) {
    flags.push({
      code: 'headcount_contracting',
      severity: 'warning',
      message: 'Headcount dropped >20% in last 6 months — company may be contracting',
      source_metric: 'headcount_trend',
    });
  }

  // Payroll > 40% of revenue
  if (data.payrollToRevenue > 0.40) {
    flags.push({
      code: 'high_payroll_burden',
      severity: 'warning',
      message: `Payroll represents ${(data.payrollToRevenue * 100).toFixed(1)}% of revenue (threshold: 40%)`,
      source_metric: 'payroll_to_revenue',
      value: data.payrollToRevenue,
      threshold: 0.40,
    });
  }

  // Payroll growing faster than revenue
  if (data.isPayrollOutpacingRevenue) {
    flags.push({
      code: 'payroll_sustainability_risk',
      severity: 'warning',
      message: 'Payroll costs growing faster than revenue — sustainability concern',
      source_metric: 'payroll_growth_vs_revenue_growth',
    });
  }

  // Revenue per employee declining
  if (data.revenuePerEmployeeChange < -0.15) {
    flags.push({
      code: 'productivity_declining',
      severity: 'warning',
      message: `Revenue per employee declined ${(Math.abs(data.revenuePerEmployeeChange) * 100).toFixed(1)}% — productivity loss`,
      source_metric: 'revenue_per_employee',
      value: data.revenuePerEmployee,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(
  periods: EmployeePeriod[],
  extractor: (p: EmployeePeriod) => number,
): TimeSeriesPoint[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  return sorted.map((p) => ({
    period: p.period,
    value: Math.round(extractor(p) * 10000) / 10000,
  }));
}

export function analyzeTrends(periods: EmployeePeriod[]): TrendResult[] {
  if (periods.length < 2) return [];

  const configs: Array<{
    config: TrendConfig;
    extractor: (p: EmployeePeriod) => number;
  }> = [
    {
      config: {
        metric_name: 'headcount',
        metric_label: 'Headcount',
        unit: 'employees',
        higher_is_better: true,
        projection_months: 3,
        y_axis_format: 'count',
      },
      extractor: (p) => p.headcount,
    },
    {
      config: {
        metric_name: 'revenue_per_employee',
        metric_label: 'Revenue per Employee',
        unit: '$',
        higher_is_better: true,
        warning_threshold: 200_000,
        projection_months: 3,
        y_axis_format: '$',
      },
      extractor: (p) => calcRevenuePerEmployee(p.revenue, p.headcount),
    },
    {
      config: {
        metric_name: 'payroll_to_revenue',
        metric_label: 'Payroll / Revenue',
        unit: '%',
        higher_is_better: false,
        warning_threshold: 0.35,
        critical_threshold: 0.40,
        benchmark_value: BENCHMARKS.payroll_to_revenue,
        projection_months: 3,
        y_axis_format: '%',
      },
      extractor: (p) => calcPayrollToRevenue(p.total_payroll, p.revenue),
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
  payrollToRevenue: number;
  revenuePerEmployee: number;
  headcountGrowth: number;
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
    payroll_to_revenue: compare('payroll_to_revenue', metrics.payrollToRevenue, BENCHMARKS.payroll_to_revenue, false),
    revenue_per_employee: compare('revenue_per_employee', metrics.revenuePerEmployee, BENCHMARKS.revenue_per_employee, true),
    headcount_growth: compare('headcount_growth', metrics.headcountGrowth, BENCHMARKS.headcount_growth, true),
  };
}

function buildKeyMetrics(data: {
  avgHeadcount: number;
  revenuePerEmployee: number;
  payrollToRevenue: number;
  avgPayrollPerEmployee: number;
  headcountGrowth: number;
  shellRisk: 'none' | 'warning' | 'critical';
  totalMonths: number;
}): Record<string, MetricValue> {
  function metric(
    name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: 'positive' | 'neutral' | 'negative',
  ): MetricValue {
    return {
      name, label, value: Math.round(value * 10000) / 10000, unit,
      source: 'employee_engine', formula, interpretation, impact_on_score: impact,
    };
  }

  return {
    avg_headcount: metric('avg_headcount', 'Average Headcount', data.avgHeadcount, 'employees',
      'avg(unique_rfcs_with_cfdi_n)',
      data.avgHeadcount > 10 ? 'Adequate workforce size' : 'Small workforce',
      data.avgHeadcount > 5 ? 'positive' : 'negative'),
    revenue_per_employee: metric('revenue_per_employee', 'Revenue per Employee', data.revenuePerEmployee, '$',
      'total_revenue / headcount',
      data.revenuePerEmployee >= 500_000 ? 'Good productivity' : 'Low productivity',
      data.revenuePerEmployee >= 300_000 ? 'positive' : 'negative'),
    payroll_to_revenue: metric('payroll_to_revenue', 'Payroll / Revenue', data.payrollToRevenue, '%',
      'total_payroll / total_revenue',
      data.payrollToRevenue <= 0.35 ? 'Healthy payroll ratio' : 'High payroll burden',
      data.payrollToRevenue <= 0.35 ? 'positive' : 'negative'),
    avg_payroll_per_employee: metric('avg_payroll_per_employee', 'Avg Payroll per Employee', data.avgPayrollPerEmployee, '$',
      'total_payroll / headcount',
      'Average monthly cost per employee',
      'neutral'),
    headcount_growth: metric('headcount_growth', 'Headcount Growth', data.headcountGrowth, '%',
      '(last_headcount - first_headcount) / first_headcount',
      data.headcountGrowth >= 0 ? 'Workforce stable or growing' : 'Workforce contracting',
      data.headcountGrowth >= -0.10 ? 'positive' : 'negative'),
    shell_company_risk: metric('shell_company_risk', 'Shell Company Risk', data.shellRisk === 'none' ? 0 : data.shellRisk === 'warning' ? 1 : 2, 'level',
      'headcount_vs_revenue_analysis',
      data.shellRisk === 'none' ? 'No shell company indicators' : 'Shell company risk detected',
      data.shellRisk === 'none' ? 'positive' : 'negative'),
  };
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const flagSummary = flags.length > 0
    ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
    : ' No risk flags detected.';
  return `Employee engine score: ${score}/100 (Grade ${grade}).${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('possible_shell_company')) actions.push('CRITICAL: Investigate operational substance — very low headcount vs revenue suggests possible shell company');
  if (codes.has('low_headcount_high_revenue')) actions.push('Review workforce size relative to revenue — verify operational substance with Scory data');
  if (codes.has('headcount_contracting')) actions.push('Investigate reasons for workforce reduction — company may be downsizing');
  if (codes.has('high_payroll_burden')) actions.push('Payroll exceeds 40% of revenue — assess cost structure sustainability');
  if (codes.has('payroll_sustainability_risk')) actions.push('Payroll growing faster than revenue — monitor cost control measures');
  if (codes.has('productivity_declining')) actions.push('Revenue per employee declining — assess operational efficiency');

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runEmployeeEngine(input: EngineInput): Promise<EngineOutput> {
  const empData = input.syntage_data as EmployeeInput | undefined;

  if (!empData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_employee_data',
        severity: 'critical',
        message: 'No employee/payroll data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Employee engine blocked: no data provided.',
      recommended_actions: ['Ensure Syntage nomina CFDI data is available for employee analysis'],
      created_at: new Date().toISOString(),
    };
  }

  const { periods } = empData;

  if (periods.length === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'insufficient_employee_data',
        severity: 'critical',
        message: 'No periods available for employee analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Employee engine blocked: no period data.',
      recommended_actions: ['Upload at least 6 months of nomina CFDI data for employee analysis'],
      created_at: new Date().toISOString(),
    };
  }

  // Sort periods chronologically
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  const totalMonths = sorted.length;

  // Aggregate metrics
  const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
  const totalPayroll = sorted.reduce((s, p) => s + p.total_payroll, 0);
  const avgHeadcount = sorted.reduce((s, p) => s + p.headcount, 0) / totalMonths;
  const avgRevenue = totalRevenue / totalMonths;

  // Key calculations
  const revenuePerEmployee = calcRevenuePerEmployee(avgRevenue, avgHeadcount);
  const payrollToRevenue = calcPayrollToRevenue(totalPayroll, totalRevenue);
  const avgPayrollPerEmployee = calcAvgPayrollPerEmployee(
    totalPayroll / totalMonths,
    avgHeadcount,
  );

  // Headcount growth (first vs last)
  const firstHeadcount = sorted[0]!.headcount;
  const lastHeadcount = sorted[sorted.length - 1]!.headcount;
  const headcountGrowth = calcHeadcountChange(lastHeadcount, firstHeadcount);

  // Revenue per employee change (first half vs second half)
  const firstHalf = sorted.slice(0, Math.floor(totalMonths / 2));
  const secondHalf = sorted.slice(Math.floor(totalMonths / 2));
  const rpeFirst = firstHalf.length > 0
    ? (firstHalf.reduce((s, p) => s + p.revenue, 0) / firstHalf.length) /
      (firstHalf.reduce((s, p) => s + p.headcount, 0) / firstHalf.length || 1)
    : 0;
  const rpeSecond = secondHalf.length > 0
    ? (secondHalf.reduce((s, p) => s + p.revenue, 0) / secondHalf.length) /
      (secondHalf.reduce((s, p) => s + p.headcount, 0) / secondHalf.length || 1)
    : 0;
  const revenuePerEmployeeChange = rpeFirst > 0 ? (rpeSecond - rpeFirst) / rpeFirst : 0;

  // Detection flags
  const shellRisk = detectShellCompanyRisk(avgHeadcount, avgRevenue);
  const isHeadcountDropping = isHeadcountDroppingOverWindow(sorted, 6, 0.20);
  const isPayrollOutpacingRevenue = isPayrollGrowingFasterThanRevenue(sorted);

  // Risk flags
  const riskFlags = generateRiskFlags({
    avgHeadcount,
    avgRevenue,
    payrollToRevenue,
    shellRisk,
    isHeadcountDropping,
    isPayrollOutpacingRevenue,
    revenuePerEmployee,
    revenuePerEmployeeChange,
  });

  // Trends
  const trends = analyzeTrends(sorted);
  const trendFactor = trendUtils.calculateTrendFactor(trends);

  // Sub-scores
  const subScores = {
    headcount_trend: calcHeadcountTrendSubScore(sorted),
    productivity: calcProductivitySubScore(revenuePerEmployee),
    payroll_ratio: calcPayrollRatioSubScore(payrollToRevenue),
    shell_company: calcShellCompanySubScore(shellRisk),
    trend_quality: calcTrendQualitySubScore(trends),
  };

  // Weighted raw score
  const rawScore =
    subScores.headcount_trend * SUB_WEIGHTS.headcount_trend +
    subScores.productivity * SUB_WEIGHTS.productivity +
    subScores.payroll_ratio * SUB_WEIGHTS.payroll_ratio +
    subScores.shell_company * SUB_WEIGHTS.shell_company +
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
      avgHeadcount,
      revenuePerEmployee,
      payrollToRevenue,
      avgPayrollPerEmployee,
      headcountGrowth,
      shellRisk,
      totalMonths,
    }),
    benchmark_comparison: buildBenchmarks({
      payrollToRevenue,
      revenuePerEmployee,
      headcountGrowth,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
