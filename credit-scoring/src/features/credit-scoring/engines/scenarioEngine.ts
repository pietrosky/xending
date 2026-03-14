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

const ENGINE_NAME = 'scenario';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  revenue_resilience: 0.25,
  margin_resilience: 0.20,
  dso_resilience: 0.20,
  fx_resilience: 0.15,
  combined_resilience: 0.10,
  trend_quality: 0.10,
} as const;

/** Stress levels for each scenario type */
const STRESS_LEVELS = {
  revenue: [-0.10, -0.20, -0.30],
  margin: [-0.05, -0.10, -0.15],
  dso: [15, 30, 45],
  fx: [-0.10, -0.20, -0.30],
} as const;

/** Benchmarks for scenario metrics */
const BENCHMARKS = {
  min_dscr: 1.20,
  min_cash_months: 3,
  revenue_breaking_pct: 0.30,
  margin_breaking_pp: 0.15,
} as const;

/** DSCR thresholds */
const DSCR_THRESHOLDS = {
  strong: 1.50,
  acceptable: 1.20,
  weak: 1.00,
} as const;

// ============================================================
// Input types
// ============================================================

export interface ScenarioInput {
  base_revenue: number;
  base_margin: number;
  base_dso: number;
  base_ebitda: number;
  annual_debt_service: number;
  cash_balance: number;
  monthly_fixed_costs: number;
  fx_exposure_pct: number;
  currency: string;
  periods?: ScenarioPeriod[];
}

export interface ScenarioPeriod {
  period: string;
  revenue: number;
  margin: number;
  dso: number;
  dscr: number;
}

export interface StressResult {
  stress_level: number;
  stressed_value: number;
  stressed_ebitda: number;
  stressed_dscr: number;
  cash_months_remaining: number;
  survives: boolean;
}

// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

/** Calculate DSCR = EBITDA / annual_debt_service */
export function calcDSCR(ebitda: number, annualDebtService: number): number {
  if (annualDebtService <= 0) return 99;
  return ebitda / annualDebtService;
}

/** Calculate months of cash remaining given fixed costs */
export function calcCashMonths(cashBalance: number, monthlyFixedCosts: number): number {
  if (monthlyFixedCosts <= 0) return 99;
  return cashBalance / monthlyFixedCosts;
}

/** Apply revenue stress: reduce revenue by a percentage */
export function applyRevenueStress(input: ScenarioInput, stressPct: number): StressResult {
  const stressedRevenue = input.base_revenue * (1 + stressPct);
  const stressedEbitda = stressedRevenue * input.base_margin;
  const stressedDscr = calcDSCR(stressedEbitda, input.annual_debt_service);
  const monthlyCashFlow = (stressedEbitda / 12) - (input.annual_debt_service / 12);
  const cashMonths = monthlyCashFlow >= 0
    ? 99
    : calcCashMonths(input.cash_balance, Math.abs(monthlyCashFlow));

  return {
    stress_level: stressPct,
    stressed_value: stressedRevenue,
    stressed_ebitda: stressedEbitda,
    stressed_dscr: stressedDscr,
    cash_months_remaining: cashMonths,
    survives: stressedDscr >= DSCR_THRESHOLDS.weak,
  };
}

/** Apply margin stress: reduce margin by percentage points */
export function applyMarginStress(input: ScenarioInput, stressPP: number): StressResult {
  const stressedMargin = Math.max(0, input.base_margin + stressPP);
  const stressedEbitda = input.base_revenue * stressedMargin;
  const stressedDscr = calcDSCR(stressedEbitda, input.annual_debt_service);
  const monthlyCashFlow = (stressedEbitda / 12) - (input.annual_debt_service / 12);
  const cashMonths = monthlyCashFlow >= 0
    ? 99
    : calcCashMonths(input.cash_balance, Math.abs(monthlyCashFlow));

  return {
    stress_level: stressPP,
    stressed_value: stressedMargin,
    stressed_ebitda: stressedEbitda,
    stressed_dscr: stressedDscr,
    cash_months_remaining: cashMonths,
    survives: stressedDscr >= DSCR_THRESHOLDS.weak,
  };
}

/** Apply DSO stress: increase DSO by days, reducing effective cash flow */
export function applyDSOStress(input: ScenarioInput, extraDays: number): StressResult {
  const stressedDSO = input.base_dso + extraDays;
  // Additional working capital tied up = (extra days / 365) * revenue
  const additionalWC = (extraDays / 365) * input.base_revenue;
  // Reduce effective EBITDA by the annualized cost of additional working capital
  const wcCostRate = 0.12; // assumed financing cost for working capital
  const stressedEbitda = input.base_ebitda - (additionalWC * wcCostRate);
  const stressedDscr = calcDSCR(stressedEbitda, input.annual_debt_service);
  const monthlyCashFlow = (stressedEbitda / 12) - (input.annual_debt_service / 12);
  const cashMonths = monthlyCashFlow >= 0
    ? 99
    : calcCashMonths(input.cash_balance, Math.abs(monthlyCashFlow));

  return {
    stress_level: extraDays,
    stressed_value: stressedDSO,
    stressed_ebitda: stressedEbitda,
    stressed_dscr: stressedDscr,
    cash_months_remaining: cashMonths,
    survives: stressedDscr >= DSCR_THRESHOLDS.weak,
  };
}

/** Apply FX stress: currency depreciation impact on costs/debt */
export function applyFXStress(input: ScenarioInput, depreciationPct: number): StressResult {
  // FX depreciation increases costs proportional to FX exposure
  const costIncrease = input.base_revenue * (1 - input.base_margin) * input.fx_exposure_pct * Math.abs(depreciationPct);
  const stressedEbitda = input.base_ebitda - costIncrease;
  const stressedDscr = calcDSCR(stressedEbitda, input.annual_debt_service);
  const monthlyCashFlow = (stressedEbitda / 12) - (input.annual_debt_service / 12);
  const cashMonths = monthlyCashFlow >= 0
    ? 99
    : calcCashMonths(input.cash_balance, Math.abs(monthlyCashFlow));

  return {
    stress_level: depreciationPct,
    stressed_value: input.fx_exposure_pct,
    stressed_ebitda: stressedEbitda,
    stressed_dscr: stressedDscr,
    cash_months_remaining: cashMonths,
    survives: stressedDscr >= DSCR_THRESHOLDS.weak,
  };
}

/** Apply combined worst-case stress */
export function applyCombinedStress(input: ScenarioInput): StressResult {
  // Worst case: -30% revenue, -15pp margin, +45 DSO, -30% FX
  const stressedRevenue = input.base_revenue * 0.70;
  const stressedMargin = Math.max(0, input.base_margin - 0.15);
  const stressedEbitdaFromRevMargin = stressedRevenue * stressedMargin;

  // DSO impact
  const additionalWC = (45 / 365) * stressedRevenue;
  const wcCost = additionalWC * 0.12;

  // FX impact on remaining costs
  const costBase = stressedRevenue * (1 - stressedMargin);
  const fxCost = costBase * input.fx_exposure_pct * 0.30;

  const stressedEbitda = stressedEbitdaFromRevMargin - wcCost - fxCost;
  const stressedDscr = calcDSCR(stressedEbitda, input.annual_debt_service);
  const monthlyCashFlow = (stressedEbitda / 12) - (input.annual_debt_service / 12);
  const cashMonths = monthlyCashFlow >= 0
    ? 99
    : calcCashMonths(input.cash_balance, Math.abs(monthlyCashFlow));

  return {
    stress_level: -1,
    stressed_value: stressedEbitda,
    stressed_ebitda: stressedEbitda,
    stressed_dscr: stressedDscr,
    cash_months_remaining: cashMonths,
    survives: stressedDscr >= DSCR_THRESHOLDS.weak,
  };
}

/** Find the breaking point: at what stress level does DSCR drop below 1.0 */
export function findBreakingPoint(
  input: ScenarioInput,
  stressFn: (input: ScenarioInput, level: number) => StressResult,
  levels: readonly number[],
): { breaking_level: number | null; last_surviving_level: number | null } {
  let lastSurviving: number | null = null;

  for (const level of levels) {
    const result = stressFn(input, level);
    if (result.survives) {
      lastSurviving = level;
    } else {
      return { breaking_level: level, last_surviving_level: lastSurviving };
    }
  }

  return { breaking_level: null, last_surviving_level: lastSurviving };
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

/** Revenue resilience sub-score (0-100): how many stress levels the company survives */
export function calcRevenueResilienceSubScore(results: StressResult[]): number {
  const survivingCount = results.filter((r) => r.survives).length;
  const total = results.length;
  if (total === 0) return 50;

  // All survive = 100, 2/3 = 75, 1/3 = 40, none = 10
  if (survivingCount === total) return 100;
  if (survivingCount >= total * 0.66) return 75;
  if (survivingCount >= total * 0.33) return 40;
  return 10;
}

/** Margin resilience sub-score (0-100) */
export function calcMarginResilienceSubScore(results: StressResult[]): number {
  const survivingCount = results.filter((r) => r.survives).length;
  const total = results.length;
  if (total === 0) return 50;

  if (survivingCount === total) return 100;
  if (survivingCount >= total * 0.66) return 75;
  if (survivingCount >= total * 0.33) return 40;
  return 10;
}

/** DSO resilience sub-score (0-100) */
export function calcDSOResilienceSubScore(results: StressResult[]): number {
  const survivingCount = results.filter((r) => r.survives).length;
  const total = results.length;
  if (total === 0) return 50;

  if (survivingCount === total) return 100;
  if (survivingCount >= total * 0.66) return 75;
  if (survivingCount >= total * 0.33) return 40;
  return 10;
}

/** FX resilience sub-score (0-100) */
export function calcFXResilienceSubScore(results: StressResult[], fxExposurePct: number): number {
  // If no FX exposure, full score
  if (fxExposurePct <= 0.05) return 100;

  const survivingCount = results.filter((r) => r.survives).length;
  const total = results.length;
  if (total === 0) return 50;

  if (survivingCount === total) return 100;
  if (survivingCount >= total * 0.66) return 75;
  if (survivingCount >= total * 0.33) return 40;
  return 10;
}

/** Combined stress sub-score (0-100) */
export function calcCombinedResilienceSubScore(combinedResult: StressResult): number {
  if (combinedResult.survives) return 100;
  if (combinedResult.stressed_dscr >= 0.80) return 50;
  if (combinedResult.stressed_dscr >= 0.50) return 25;
  return 5;
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
  revenueResults: StressResult[];
  marginResults: StressResult[];
  dsoResults: StressResult[];
  fxResults: StressResult[];
  combinedResult: StressResult;
  baseDscr: number;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Revenue stress flags
  const revSurviving = data.revenueResults.filter((r) => r.survives).length;
  if (revSurviving === 0) {
    flags.push({
      code: 'revenue_stress_critical',
      severity: 'critical',
      message: 'Company fails all revenue stress scenarios',
      source_metric: 'revenue_resilience',
    });
  } else if (revSurviving < data.revenueResults.length) {
    flags.push({
      code: 'revenue_stress_warning',
      severity: 'warning',
      message: `Company survives ${revSurviving}/${data.revenueResults.length} revenue stress levels`,
      source_metric: 'revenue_resilience',
      value: revSurviving,
    });
  }

  // Margin stress flags
  const marginSurviving = data.marginResults.filter((r) => r.survives).length;
  if (marginSurviving === 0) {
    flags.push({
      code: 'margin_stress_critical',
      severity: 'critical',
      message: 'Company fails all margin stress scenarios',
      source_metric: 'margin_resilience',
    });
  }

  // Combined stress flag
  if (!data.combinedResult.survives) {
    flags.push({
      code: 'combined_stress_failure',
      severity: data.combinedResult.stressed_dscr < 0.50 ? 'critical' : 'warning',
      message: `Combined worst-case DSCR: ${data.combinedResult.stressed_dscr.toFixed(2)}x`,
      source_metric: 'combined_resilience',
      value: data.combinedResult.stressed_dscr,
      threshold: DSCR_THRESHOLDS.weak,
    });
  }

  // Base DSCR already weak
  if (data.baseDscr < DSCR_THRESHOLDS.acceptable) {
    flags.push({
      code: 'base_dscr_weak',
      severity: data.baseDscr < DSCR_THRESHOLDS.weak ? 'critical' : 'warning',
      message: `Base DSCR ${data.baseDscr.toFixed(2)}x is below acceptable threshold`,
      source_metric: 'base_dscr',
      value: data.baseDscr,
      threshold: DSCR_THRESHOLDS.acceptable,
    });
  }

  // Cash runway concern from combined stress
  if (data.combinedResult.cash_months_remaining < 3 && data.combinedResult.cash_months_remaining < 99) {
    flags.push({
      code: 'cash_runway_critical',
      severity: 'critical',
      message: `Under combined stress, cash runs out in ${data.combinedResult.cash_months_remaining.toFixed(1)} months`,
      source_metric: 'cash_months',
      value: data.combinedResult.cash_months_remaining,
      threshold: 3,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(
  periods: ScenarioPeriod[],
  extractor: (p: ScenarioPeriod) => number,
): TimeSeriesPoint[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  return sorted.map((p) => ({
    period: p.period,
    value: Math.round(extractor(p) * 10000) / 10000,
  }));
}

export function analyzeTrends(periods: ScenarioPeriod[]): TrendResult[] {
  if (periods.length < 2) return [];

  const configs: Array<{
    config: TrendConfig;
    extractor: (p: ScenarioPeriod) => number;
  }> = [
    {
      config: {
        metric_name: 'dscr', metric_label: 'DSCR', unit: 'x',
        higher_is_better: true, warning_threshold: DSCR_THRESHOLDS.acceptable,
        critical_threshold: DSCR_THRESHOLDS.weak,
        benchmark_value: BENCHMARKS.min_dscr, projection_months: 3, y_axis_format: 'x',
      },
      extractor: (p) => p.dscr,
    },
    {
      config: {
        metric_name: 'revenue', metric_label: 'Revenue', unit: '$',
        higher_is_better: true,
        projection_months: 3, y_axis_format: '$',
      },
      extractor: (p) => p.revenue,
    },
    {
      config: {
        metric_name: 'margin', metric_label: 'Margin', unit: '%',
        higher_is_better: true, warning_threshold: 0.10, critical_threshold: 0.05,
        projection_months: 3, y_axis_format: '%',
      },
      extractor: (p) => p.margin,
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
  baseDscr: number;
  worstDscr: number;
  cashMonths: number;
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
    base_dscr: compare('base_dscr', metrics.baseDscr, BENCHMARKS.min_dscr, true),
    worst_case_dscr: compare('worst_case_dscr', metrics.worstDscr, DSCR_THRESHOLDS.weak, true),
    cash_months: compare('cash_months', metrics.cashMonths, BENCHMARKS.min_cash_months, true),
  };
}

function buildKeyMetrics(data: {
  baseDscr: number;
  revenueBreaking: number | null;
  marginBreaking: number | null;
  worstDscr: number;
  worstCashMonths: number;
  revSurviving: number;
  revTotal: number;
  marginSurviving: number;
  marginTotal: number;
  dsoSurviving: number;
  dsoTotal: number;
}): Record<string, MetricValue> {
  function metric(
    name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: 'positive' | 'neutral' | 'negative',
  ): MetricValue {
    return {
      name, label, value: Math.round(value * 10000) / 10000, unit,
      source: 'scenario_engine', formula, interpretation, impact_on_score: impact,
    };
  }

  const metrics: Record<string, MetricValue> = {
    base_dscr: metric('base_dscr', 'Base DSCR', data.baseDscr, 'x',
      'EBITDA / annual_debt_service',
      data.baseDscr >= DSCR_THRESHOLDS.strong ? 'Strong debt coverage' : data.baseDscr >= DSCR_THRESHOLDS.acceptable ? 'Acceptable debt coverage' : 'Weak debt coverage',
      data.baseDscr >= DSCR_THRESHOLDS.acceptable ? 'positive' : 'negative'),
    worst_case_dscr: metric('worst_case_dscr', 'Worst-Case DSCR', data.worstDscr, 'x',
      'Combined stress EBITDA / annual_debt_service',
      data.worstDscr >= DSCR_THRESHOLDS.weak ? 'Survives worst case' : 'Fails under worst case',
      data.worstDscr >= DSCR_THRESHOLDS.weak ? 'positive' : 'negative'),
    worst_cash_months: metric('worst_cash_months', 'Cash Runway (Worst Case)', Math.min(data.worstCashMonths, 99), 'months',
      'cash_balance / monthly_cash_burn',
      data.worstCashMonths >= 6 ? 'Adequate cash runway' : 'Limited cash runway',
      data.worstCashMonths >= 3 ? 'positive' : 'negative'),
    revenue_scenarios_passed: metric('revenue_scenarios_passed', 'Revenue Stress Passed', data.revSurviving, 'count',
      'count of surviving revenue stress levels',
      `${data.revSurviving}/${data.revTotal} revenue stress levels survived`,
      data.revSurviving === data.revTotal ? 'positive' : 'negative'),
    margin_scenarios_passed: metric('margin_scenarios_passed', 'Margin Stress Passed', data.marginSurviving, 'count',
      'count of surviving margin stress levels',
      `${data.marginSurviving}/${data.marginTotal} margin stress levels survived`,
      data.marginSurviving === data.marginTotal ? 'positive' : 'negative'),
    dso_scenarios_passed: metric('dso_scenarios_passed', 'DSO Stress Passed', data.dsoSurviving, 'count',
      'count of surviving DSO stress levels',
      `${data.dsoSurviving}/${data.dsoTotal} DSO stress levels survived`,
      data.dsoSurviving === data.dsoTotal ? 'positive' : 'negative'),
  };

  if (data.revenueBreaking !== null) {
    metrics['revenue_breaking_point'] = metric('revenue_breaking_point', 'Revenue Breaking Point', data.revenueBreaking, '%',
      'stress level where DSCR < 1.0',
      `DSCR drops below 1.0 at ${(data.revenueBreaking * 100).toFixed(0)}% revenue decline`,
      Math.abs(data.revenueBreaking) >= 0.20 ? 'positive' : 'negative');
  }

  if (data.marginBreaking !== null) {
    metrics['margin_breaking_point'] = metric('margin_breaking_point', 'Margin Breaking Point', data.marginBreaking, 'pp',
      'stress level where DSCR < 1.0',
      `DSCR drops below 1.0 at ${(Math.abs(data.marginBreaking) * 100).toFixed(0)}pp margin compression`,
      Math.abs(data.marginBreaking) >= 0.10 ? 'positive' : 'negative');
  }

  return metrics;
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const flagSummary = flags.length > 0
    ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
    : ' No risk flags detected.';
  return `Scenario engine score: ${score}/100 (Grade ${grade}).${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('revenue_stress_critical')) actions.push('Revenue too fragile - require additional guarantees or reduce loan amount');
  if (codes.has('margin_stress_critical')) actions.push('Margin compression risk is severe - consider shorter term or covenant protection');
  if (codes.has('combined_stress_failure')) actions.push('Company does not survive combined stress - strengthen collateral coverage');
  if (codes.has('base_dscr_weak')) actions.push('Base DSCR is already weak - reassess loan sizing');
  if (codes.has('cash_runway_critical')) actions.push('Cash runway under stress is critically short - require cash reserve covenant');

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runScenarioEngine(input: EngineInput): Promise<EngineOutput> {
  const scenarioData = input.syntage_data as ScenarioInput | undefined;

  if (!scenarioData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_scenario_data',
        severity: 'critical',
        message: 'No scenario data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Scenario engine blocked: no data provided.',
      recommended_actions: ['Ensure financial data is available for stress testing'],
      created_at: new Date().toISOString(),
    };
  }

  if (scenarioData.base_revenue <= 0 || scenarioData.annual_debt_service <= 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'insufficient_scenario_data',
        severity: 'critical',
        message: 'Revenue or debt service data is missing or zero',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Scenario engine blocked: insufficient financial data.',
      recommended_actions: ['Provide base revenue and annual debt service data'],
      created_at: new Date().toISOString(),
    };
  }

  // Run stress scenarios
  const revenueResults = STRESS_LEVELS.revenue.map((level) => applyRevenueStress(scenarioData, level));
  const marginResults = STRESS_LEVELS.margin.map((level) => applyMarginStress(scenarioData, level));
  const dsoResults = STRESS_LEVELS.dso.map((level) => applyDSOStress(scenarioData, level));
  const fxResults = STRESS_LEVELS.fx.map((level) => applyFXStress(scenarioData, level));
  const combinedResult = applyCombinedStress(scenarioData);

  // Breaking points
  const revenueBreaking = findBreakingPoint(scenarioData, applyRevenueStress, STRESS_LEVELS.revenue);
  const marginBreaking = findBreakingPoint(scenarioData, applyMarginStress, STRESS_LEVELS.margin);

  // Base DSCR
  const baseDscr = calcDSCR(scenarioData.base_ebitda, scenarioData.annual_debt_service);

  // Sub-scores
  const subScores = {
    revenue_resilience: calcRevenueResilienceSubScore(revenueResults),
    margin_resilience: calcMarginResilienceSubScore(marginResults),
    dso_resilience: calcDSOResilienceSubScore(dsoResults),
    fx_resilience: calcFXResilienceSubScore(fxResults, scenarioData.fx_exposure_pct),
    combined_resilience: calcCombinedResilienceSubScore(combinedResult),
    trend_quality: 50,
  };

  // Trends
  const trends = analyzeTrends(scenarioData.periods ?? []);
  subScores.trend_quality = calcTrendQualitySubScore(trends);

  // Weighted raw score
  const rawScore =
    subScores.revenue_resilience * SUB_WEIGHTS.revenue_resilience +
    subScores.margin_resilience * SUB_WEIGHTS.margin_resilience +
    subScores.dso_resilience * SUB_WEIGHTS.dso_resilience +
    subScores.fx_resilience * SUB_WEIGHTS.fx_resilience +
    subScores.combined_resilience * SUB_WEIGHTS.combined_resilience +
    subScores.trend_quality * SUB_WEIGHTS.trend_quality;

  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));

  const grade = scoreToGrade(finalScore);

  // Risk flags
  const riskFlags = generateRiskFlags({
    revenueResults,
    marginResults,
    dsoResults,
    fxResults,
    combinedResult,
    baseDscr,
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
      baseDscr,
      revenueBreaking: revenueBreaking.breaking_level,
      marginBreaking: marginBreaking.breaking_level,
      worstDscr: combinedResult.stressed_dscr,
      worstCashMonths: combinedResult.cash_months_remaining,
      revSurviving: revenueResults.filter((r) => r.survives).length,
      revTotal: revenueResults.length,
      marginSurviving: marginResults.filter((r) => r.survives).length,
      marginTotal: marginResults.length,
      dsoSurviving: dsoResults.filter((r) => r.survives).length,
      dsoTotal: dsoResults.length,
    }),
    benchmark_comparison: buildBenchmarks({
      baseDscr,
      worstDscr: combinedResult.stressed_dscr,
      cashMonths: combinedResult.cash_months_remaining,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
