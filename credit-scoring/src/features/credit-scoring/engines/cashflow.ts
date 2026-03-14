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

const ENGINE_NAME = 'cashflow';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  ebitda: 0.20,
  dscr: 0.30,
  free_cash_flow: 0.20,
  payment_capacity: 0.15,
  scenarios: 0.15,
} as const;

/** Benchmarks for cashflow metrics */
const BENCHMARKS = {
  ebitda_margin: 0.15,
  dscr: 1.50,
  dscr_proforma: 1.30,
  fcf_margin: 0.08,
} as const;

/** DSCR classification thresholds per requirement 6.4 */
const DSCR_THRESHOLDS = {
  strong: 1.50,
  acceptable: 1.20,
  weak: 1.00,
} as const;

// ============================================================
// Input types
// ============================================================

export interface CashFlowPeriod {
  fiscal_year: number;
  revenue: number;
  costs: number;
  operating_expenses: number;
  depreciation: number;
  amortization: number;
  interest_expense: number;
  taxes: number;
  capex: number;
}

export interface DebtInfo {
  existing_debt_service_monthly: number;
}

export interface LoanRequest {
  requested_amount: number;
  term_months: number;
  annual_interest_rate: number;
  currency: 'MXN' | 'USD';
}

export interface CashFlowInput {
  periods: CashFlowPeriod[];
  debt_info: DebtInfo;
  loan_request: LoanRequest;
}

export interface ScenarioResult {
  scenario_type: 'base' | 'stress';
  label: string;
  revenue: number;
  ebitda: number;
  free_cash_flow: number;
  dscr_proforma: number;
  viable: boolean;
}

// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

/** EBITDA = Revenue - Costs - OpEx + Depreciation + Amortization */
export function calcEBITDA(p: CashFlowPeriod): number {
  const operatingIncome = p.revenue - p.costs - p.operating_expenses;
  return operatingIncome + p.depreciation + p.amortization;
}

/** EBITDA Margin = EBITDA / Revenue */
export function calcEBITDAMargin(p: CashFlowPeriod): number {
  if (p.revenue === 0) return 0;
  return calcEBITDA(p) / p.revenue;
}

/** Operating Cash Flow = EBITDA - Taxes */
export function calcOperatingCashFlow(p: CashFlowPeriod): number {
  return calcEBITDA(p) - p.taxes;
}

/** Free Cash Flow = Operating Cash Flow - CAPEX */
export function calcFreeCashFlow(p: CashFlowPeriod): number {
  return calcOperatingCashFlow(p) - p.capex;
}

/** Monthly payment for a loan using standard amortization formula */
export function calcMonthlyPayment(amount: number, annualRate: number, termMonths: number): number {
  if (termMonths <= 0) return 0;
  if (annualRate <= 0) return amount / termMonths;
  const monthlyRate = annualRate / 12;
  return (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
}

/** Annual debt service for the new loan */
export function calcProjectedDebtService(loan: LoanRequest): number {
  return calcMonthlyPayment(loan.requested_amount, loan.annual_interest_rate, loan.term_months) * 12;
}

/** DSCR actual = Free Cash Flow / Existing Annual Debt Service */
export function calcDSCR(freeCashFlow: number, annualDebtService: number): number {
  if (annualDebtService <= 0) return freeCashFlow > 0 ? 10 : 0;
  return freeCashFlow / annualDebtService;
}

/** DSCR proforma = Free Cash Flow / (Existing + Projected Annual Debt Service) */
export function calcDSCRProforma(
  freeCashFlow: number,
  existingAnnualDebtService: number,
  projectedAnnualDebtService: number,
): number {
  const totalService = existingAnnualDebtService + projectedAnnualDebtService;
  if (totalService <= 0) return freeCashFlow > 0 ? 10 : 0;
  return freeCashFlow / totalService;
}

/** Max monthly payment capacity = (FCF - existing debt service) / 12 */
export function calcMaxPaymentCapacity(freeCashFlow: number, existingAnnualDebtService: number): number {
  const available = freeCashFlow - existingAnnualDebtService;
  return Math.max(0, available / 12);
}

/** Max sustainable loan amount given FCF, existing debt, rate, and term */
export function calcMaxSustainableAmount(
  freeCashFlow: number,
  existingAnnualDebtService: number,
  annualRate: number,
  termMonths: number,
): number {
  const maxMonthly = calcMaxPaymentCapacity(freeCashFlow, existingAnnualDebtService);
  if (maxMonthly <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return maxMonthly * termMonths;
  const monthlyRate = annualRate / 12;
  return (maxMonthly * (Math.pow(1 + monthlyRate, termMonths) - 1)) /
    (monthlyRate * Math.pow(1 + monthlyRate, termMonths));
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

/** EBITDA sub-score (0-100) based on EBITDA margin */
export function calcEBITDASubScore(period: CashFlowPeriod): number {
  const margin = calcEBITDAMargin(period);

  if (margin >= 0.25) return 100;
  if (margin >= 0.20) return 85;
  if (margin >= 0.15) return 70;
  if (margin >= 0.10) return 55;
  if (margin >= 0.05) return 35;
  if (margin > 0) return 15;
  return 5;
}

/** DSCR sub-score (0-100) based on DSCR proforma classification */
export function calcDSCRSubScore(dscrActual: number, dscrProforma: number): number {
  let score = 0;

  // Actual DSCR (40% of DSCR sub-score)
  if (dscrActual >= DSCR_THRESHOLDS.strong) score += 40;
  else if (dscrActual >= DSCR_THRESHOLDS.acceptable) score += 30;
  else if (dscrActual >= DSCR_THRESHOLDS.weak) score += 15;
  else score += 5;

  // Proforma DSCR (60% of DSCR sub-score)
  if (dscrProforma >= DSCR_THRESHOLDS.strong) score += 60;
  else if (dscrProforma >= DSCR_THRESHOLDS.acceptable) score += 45;
  else if (dscrProforma >= DSCR_THRESHOLDS.weak) score += 20;
  else score += 0;

  return Math.min(100, score);
}

/** Free cash flow sub-score (0-100) based on FCF margin */
export function calcFCFSubScore(period: CashFlowPeriod): number {
  if (period.revenue === 0) return 0;
  const fcf = calcFreeCashFlow(period);
  const fcfMargin = fcf / period.revenue;

  if (fcfMargin >= 0.15) return 100;
  if (fcfMargin >= 0.10) return 85;
  if (fcfMargin >= 0.05) return 65;
  if (fcfMargin > 0) return 40;
  if (fcfMargin > -0.05) return 15;
  return 5;
}

/** Payment capacity sub-score (0-100) based on max sustainable amount vs requested */
export function calcPaymentCapacitySubScore(
  maxSustainable: number,
  requestedAmount: number,
): number {
  if (requestedAmount <= 0) return 50;
  const ratio = maxSustainable / requestedAmount;

  if (ratio >= 2.0) return 100;
  if (ratio >= 1.5) return 85;
  if (ratio >= 1.2) return 70;
  if (ratio >= 1.0) return 55;
  if (ratio >= 0.8) return 30;
  if (ratio >= 0.5) return 15;
  return 5;
}

/** Scenario sub-score (0-100) based on stress scenario viability */
export function calcScenarioSubScore(scenarios: ScenarioResult[]): number {
  const base = scenarios.find((s) => s.scenario_type === 'base');
  const stress = scenarios.find((s) => s.scenario_type === 'stress');

  let score = 0;

  // Base scenario (50%)
  if (base) {
    if (base.dscr_proforma >= DSCR_THRESHOLDS.strong) score += 50;
    else if (base.dscr_proforma >= DSCR_THRESHOLDS.acceptable) score += 40;
    else if (base.dscr_proforma >= DSCR_THRESHOLDS.weak) score += 20;
    else score += 5;
  }

  // Stress scenario (50%)
  if (stress) {
    if (stress.viable && stress.dscr_proforma >= DSCR_THRESHOLDS.acceptable) score += 50;
    else if (stress.viable && stress.dscr_proforma >= DSCR_THRESHOLDS.weak) score += 35;
    else if (stress.viable) score += 15;
    else score += 0;
  }

  return Math.min(100, score);
}

// ============================================================
// Scenario generation
// ============================================================

export function generateScenarios(
  period: CashFlowPeriod,
  existingAnnualDebtService: number,
  projectedAnnualDebtService: number,
): ScenarioResult[] {
  const fcf = calcFreeCashFlow(period);
  const totalDebtService = existingAnnualDebtService + projectedAnnualDebtService;

  // Base scenario: current numbers
  const baseDSCR = totalDebtService > 0 ? fcf / totalDebtService : (fcf > 0 ? 10 : 0);
  const base: ScenarioResult = {
    scenario_type: 'base',
    label: 'Base scenario — current performance',
    revenue: period.revenue,
    ebitda: calcEBITDA(period),
    free_cash_flow: fcf,
    dscr_proforma: Math.round(baseDSCR * 100) / 100,
    viable: baseDSCR >= DSCR_THRESHOLDS.weak,
  };

  // Stress scenario: revenue -20%, costs stay
  const stressRevenue = period.revenue * 0.80;
  const stressPeriod: CashFlowPeriod = { ...period, revenue: stressRevenue };
  const stressFCF = calcFreeCashFlow(stressPeriod);
  const stressDSCR = totalDebtService > 0 ? stressFCF / totalDebtService : (stressFCF > 0 ? 10 : 0);
  const stress: ScenarioResult = {
    scenario_type: 'stress',
    label: 'Stress scenario — revenue -20%',
    revenue: stressRevenue,
    ebitda: calcEBITDA(stressPeriod),
    free_cash_flow: stressFCF,
    dscr_proforma: Math.round(stressDSCR * 100) / 100,
    viable: stressDSCR >= DSCR_THRESHOLDS.weak,
  };

  return [base, stress];
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
  period: CashFlowPeriod,
  dscrActual: number,
  dscrProforma: number,
  scenarios: ScenarioResult[],
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // DSCR proforma < 1.0 = hard stop (Requirement 6.5)
  if (dscrProforma < DSCR_THRESHOLDS.weak) {
    flags.push({
      code: 'dscr_proforma_hard_stop',
      severity: 'hard_stop',
      message: `DSCR proforma ${dscrProforma.toFixed(2)} is below 1.0 — insufficient repayment capacity`,
      source_metric: 'dscr_proforma',
      value: dscrProforma,
      threshold: DSCR_THRESHOLDS.weak,
    });
  }

  // DSCR proforma weak (1.00-1.19)
  if (dscrProforma >= DSCR_THRESHOLDS.weak && dscrProforma < DSCR_THRESHOLDS.acceptable) {
    flags.push({
      code: 'dscr_proforma_weak',
      severity: 'warning',
      message: `DSCR proforma ${dscrProforma.toFixed(2)} is weak (1.00-1.19)`,
      source_metric: 'dscr_proforma',
      value: dscrProforma,
      threshold: DSCR_THRESHOLDS.acceptable,
    });
  }

  // DSCR actual < 1.0
  if (dscrActual < DSCR_THRESHOLDS.weak) {
    flags.push({
      code: 'dscr_actual_critical',
      severity: 'critical',
      message: `Current DSCR ${dscrActual.toFixed(2)} is below 1.0 — existing debt service exceeds cash flow`,
      source_metric: 'dscr_actual',
      value: dscrActual,
      threshold: DSCR_THRESHOLDS.weak,
    });
  }

  // Negative EBITDA
  const ebitda = calcEBITDA(period);
  if (ebitda < 0) {
    flags.push({
      code: 'negative_ebitda',
      severity: 'critical',
      message: `Negative EBITDA: ${ebitda.toFixed(0)}`,
      source_metric: 'ebitda',
      value: ebitda,
      threshold: 0,
    });
  }

  // Low EBITDA margin
  const margin = calcEBITDAMargin(period);
  if (margin >= 0 && margin < 0.10) {
    flags.push({
      code: 'low_ebitda_margin',
      severity: 'warning',
      message: `EBITDA margin ${(margin * 100).toFixed(1)}% is below 10%`,
      source_metric: 'ebitda_margin',
      value: margin,
      threshold: 0.10,
    });
  }

  // Negative free cash flow
  const fcf = calcFreeCashFlow(period);
  if (fcf < 0) {
    flags.push({
      code: 'negative_free_cash_flow',
      severity: 'critical',
      message: `Negative free cash flow: ${fcf.toFixed(0)}`,
      source_metric: 'free_cash_flow',
      value: fcf,
      threshold: 0,
    });
  }

  // Stress scenario not viable
  const stress = scenarios.find((s) => s.scenario_type === 'stress');
  if (stress && !stress.viable) {
    flags.push({
      code: 'stress_scenario_not_viable',
      severity: 'warning',
      message: `Stress scenario (revenue -20%) results in DSCR ${stress.dscr_proforma.toFixed(2)} — not viable`,
      source_metric: 'stress_dscr_proforma',
      value: stress.dscr_proforma,
      threshold: DSCR_THRESHOLDS.weak,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(
  periods: CashFlowPeriod[],
  extractor: (p: CashFlowPeriod) => number,
): TimeSeriesPoint[] {
  const sorted = [...periods].sort((a, b) => a.fiscal_year - b.fiscal_year);
  return sorted.map((p) => ({
    period: String(p.fiscal_year),
    value: Math.round(extractor(p) * 10000) / 10000,
  }));
}

export function analyzeTrends(
  periods: CashFlowPeriod[],
  existingAnnualDebtService: number,
  projectedAnnualDebtService: number,
): TrendResult[] {
  if (periods.length < 2) return [];

  const configs: Array<{
    config: TrendConfig;
    extractor: (p: CashFlowPeriod) => number;
  }> = [
    {
      config: {
        metric_name: 'ebitda_margin', metric_label: 'EBITDA Margin', unit: '%',
        higher_is_better: true, warning_threshold: 0.10, critical_threshold: 0,
        benchmark_value: BENCHMARKS.ebitda_margin, projection_months: 3, y_axis_format: '%',
      },
      extractor: (p) => calcEBITDAMargin(p),
    },
    {
      config: {
        metric_name: 'dscr_proforma', metric_label: 'DSCR Proforma', unit: 'x',
        higher_is_better: true, warning_threshold: DSCR_THRESHOLDS.acceptable,
        critical_threshold: DSCR_THRESHOLDS.weak,
        benchmark_value: BENCHMARKS.dscr_proforma, projection_months: 3, y_axis_format: 'x',
      },
      extractor: (p) => {
        const fcf = calcFreeCashFlow(p);
        return calcDSCRProforma(fcf, existingAnnualDebtService, projectedAnnualDebtService);
      },
    },
    {
      config: {
        metric_name: 'free_cash_flow_margin', metric_label: 'FCF Margin', unit: '%',
        higher_is_better: true, warning_threshold: 0.03, critical_threshold: 0,
        benchmark_value: BENCHMARKS.fcf_margin, projection_months: 3, y_axis_format: '%',
      },
      extractor: (p) => p.revenue > 0 ? calcFreeCashFlow(p) / p.revenue : 0,
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
  ebitdaMargin: number;
  dscrActual: number;
  dscrProforma: number;
  fcfMargin: number;
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
    ebitda_margin: compare('ebitda_margin', metrics.ebitdaMargin, BENCHMARKS.ebitda_margin, true),
    dscr_actual: compare('dscr_actual', metrics.dscrActual, BENCHMARKS.dscr, true),
    dscr_proforma: compare('dscr_proforma', metrics.dscrProforma, BENCHMARKS.dscr_proforma, true),
    fcf_margin: compare('fcf_margin', metrics.fcfMargin, BENCHMARKS.fcf_margin, true),
  };
}

function classifyDSCR(dscr: number): string {
  if (dscr >= DSCR_THRESHOLDS.strong) return 'Strong';
  if (dscr >= DSCR_THRESHOLDS.acceptable) return 'Acceptable';
  if (dscr >= DSCR_THRESHOLDS.weak) return 'Weak';
  return 'Critical';
}

function buildKeyMetrics(data: {
  period: CashFlowPeriod;
  dscrActual: number;
  dscrProforma: number;
  maxPaymentCapacity: number;
  maxSustainableAmount: number;
  existingDebtService: number;
  projectedDebtService: number;
}): Record<string, MetricValue> {
  const { period, dscrActual, dscrProforma, maxPaymentCapacity, maxSustainableAmount } = data;
  const ebitda = calcEBITDA(period);
  const ebitdaMargin = calcEBITDAMargin(period);
  const ocf = calcOperatingCashFlow(period);
  const fcf = calcFreeCashFlow(period);

  function metric(
    name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: 'positive' | 'neutral' | 'negative',
  ): MetricValue {
    return {
      name, label, value: Math.round(value * 100) / 100, unit,
      source: 'cashflow_engine', formula, interpretation, impact_on_score: impact,
    };
  }

  return {
    ebitda: metric('ebitda', 'EBITDA', ebitda, '$',
      'revenue - costs - opex + depreciation + amortization',
      ebitda > 0 ? 'Positive operating earnings' : 'Negative operating earnings',
      ebitda > 0 ? 'positive' : 'negative'),
    ebitda_margin: metric('ebitda_margin', 'EBITDA Margin', ebitdaMargin, '%',
      'ebitda / revenue',
      ebitdaMargin >= 0.15 ? 'Healthy margin' : 'Thin margin',
      ebitdaMargin >= 0.10 ? 'positive' : 'negative'),
    operating_cash_flow: metric('operating_cash_flow', 'Operating Cash Flow', ocf, '$',
      'ebitda - taxes', ocf > 0 ? 'Positive operating flow' : 'Negative operating flow',
      ocf > 0 ? 'positive' : 'negative'),
    capex: metric('capex', 'CAPEX', period.capex, '$',
      'capital expenditures', 'Capital investment level', 'neutral'),
    free_cash_flow: metric('free_cash_flow', 'Free Cash Flow', fcf, '$',
      'operating_cash_flow - capex', fcf > 0 ? 'Positive FCF' : 'Negative FCF',
      fcf > 0 ? 'positive' : 'negative'),
    dscr_actual: metric('dscr_actual', 'DSCR Actual', dscrActual, 'x',
      'fcf / existing_debt_service', classifyDSCR(dscrActual) + ' debt coverage',
      dscrActual >= DSCR_THRESHOLDS.acceptable ? 'positive' : 'negative'),
    dscr_proforma: metric('dscr_proforma', 'DSCR Proforma', dscrProforma, 'x',
      'fcf / (existing + projected debt service)',
      classifyDSCR(dscrProforma) + ' proforma coverage',
      dscrProforma >= DSCR_THRESHOLDS.acceptable ? 'positive' : 'negative'),
    max_payment_capacity: metric('max_payment_capacity', 'Max Monthly Payment', maxPaymentCapacity, '$/mo',
      '(fcf - existing_debt_service) / 12', 'Maximum affordable monthly payment', 'neutral'),
    max_sustainable_amount: metric('max_sustainable_amount', 'Max Sustainable Amount', maxSustainableAmount, '$',
      'PV of max monthly payments at given rate and term',
      'Maximum loan amount supported by cash flow', 'neutral'),
  };
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const flagSummary = flags.length > 0
    ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
    : ' No risk flags detected.';
  return `CashFlow engine score: ${score}/100 (Grade ${grade}).${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('dscr_proforma_hard_stop')) actions.push('HARD STOP: DSCR proforma below 1.0 — loan not viable at requested terms');
  if (codes.has('dscr_proforma_weak')) actions.push('Consider reducing loan amount or extending term to improve DSCR');
  if (codes.has('dscr_actual_critical')) actions.push('Review existing debt obligations — current debt service exceeds cash flow');
  if (codes.has('negative_ebitda')) actions.push('Investigate operating losses — business not generating positive earnings');
  if (codes.has('low_ebitda_margin')) actions.push('Assess cost structure and pricing to improve operating margins');
  if (codes.has('negative_free_cash_flow')) actions.push('Evaluate CAPEX levels and working capital needs');
  if (codes.has('stress_scenario_not_viable')) actions.push('Require additional guarantees — loan not viable under stress conditions');

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runCashFlowEngine(input: EngineInput): Promise<EngineOutput> {
  const cashflowData = input.syntage_data as CashFlowInput | undefined;

  if (!cashflowData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_cashflow_data',
        severity: 'critical',
        message: 'No cash flow data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'CashFlow engine blocked: no data provided.',
      recommended_actions: ['Ensure financial and SAT data are available for cash flow analysis'],
      created_at: new Date().toISOString(),
    };
  }

  const { periods, debt_info, loan_request } = cashflowData;

  if (periods.length === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'insufficient_cashflow_data',
        severity: 'critical',
        message: 'No fiscal periods available for cash flow analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'CashFlow engine blocked: no fiscal period data.',
      recommended_actions: ['Upload financial statements or ensure Syntage data includes income periods'],
      created_at: new Date().toISOString(),
    };
  }

  // Use most recent period for scoring
  const latestPeriod = [...periods].sort((a, b) => b.fiscal_year - a.fiscal_year)[0]!;

  // Core calculations
  const fcf = calcFreeCashFlow(latestPeriod);
  const existingAnnualDebtService = debt_info.existing_debt_service_monthly * 12;
  const projectedAnnualDebtService = calcProjectedDebtService(loan_request);

  const dscrActual = calcDSCR(fcf, existingAnnualDebtService);
  const dscrProforma = calcDSCRProforma(fcf, existingAnnualDebtService, projectedAnnualDebtService);
  const maxPayment = calcMaxPaymentCapacity(fcf, existingAnnualDebtService);
  const maxSustainable = calcMaxSustainableAmount(
    fcf, existingAnnualDebtService, loan_request.annual_interest_rate, loan_request.term_months,
  );

  // Scenarios
  const scenarios = generateScenarios(latestPeriod, existingAnnualDebtService, projectedAnnualDebtService);

  // Sub-scores
  const subScores = {
    ebitda: calcEBITDASubScore(latestPeriod),
    dscr: calcDSCRSubScore(dscrActual, dscrProforma),
    free_cash_flow: calcFCFSubScore(latestPeriod),
    payment_capacity: calcPaymentCapacitySubScore(maxSustainable, loan_request.requested_amount),
    scenarios: calcScenarioSubScore(scenarios),
  };

  // Weighted raw score
  const rawScore =
    subScores.ebitda * SUB_WEIGHTS.ebitda +
    subScores.dscr * SUB_WEIGHTS.dscr +
    subScores.free_cash_flow * SUB_WEIGHTS.free_cash_flow +
    subScores.payment_capacity * SUB_WEIGHTS.payment_capacity +
    subScores.scenarios * SUB_WEIGHTS.scenarios;

  // Trends
  const trends = analyzeTrends(periods, existingAnnualDebtService, projectedAnnualDebtService);
  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));

  const grade = scoreToGrade(finalScore);

  // Risk flags
  const riskFlags = generateRiskFlags(latestPeriod, dscrActual, dscrProforma, scenarios);
  const status = scoreToStatus(finalScore, riskFlags);

  // Metrics for benchmarks
  const ebitdaMargin = calcEBITDAMargin(latestPeriod);
  const fcfMargin = latestPeriod.revenue > 0 ? fcf / latestPeriod.revenue : 0;

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics({
      period: latestPeriod,
      dscrActual,
      dscrProforma,
      maxPaymentCapacity: maxPayment,
      maxSustainableAmount: maxSustainable,
      existingDebtService: existingAnnualDebtService,
      projectedDebtService: projectedAnnualDebtService,
    }),
    benchmark_comparison: buildBenchmarks({
      ebitdaMargin,
      dscrActual,
      dscrProforma,
      fcfMargin,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
