/**
 * Credit Limit Engine — Decision Layer
 *
 * Calculates the maximum credit amount from 5 independent constraints
 * and selects the binding (lowest) one.
 *
 * Limits:
 *  1. limit_by_flow     — max amount supported by DSCR / free cash flow
 *  2. limit_by_sales    — 20% of annual sales
 *  3. limit_by_ebitda   — 2× EBITDA
 *  4. limit_by_guarantee — guarantee value after haircuts / required coverage
 *  5. limit_by_portfolio — portfolio concentration cap
 */

import type {
  EngineInput,
  EngineOutput,
  RiskFlag,
  MetricValue,
  ModuleGrade,
  ModuleStatus,
} from '../types/engine.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENGINE_NAME = 'credit_limit';

/** Default sales-based limit factor (20% of annual sales) */
const SALES_FACTOR = 0.20;

/** Default EBITDA multiplier */
const EBITDA_MULTIPLIER = 2.0;

/** Default portfolio concentration cap (as fraction of total portfolio) */
const DEFAULT_PORTFOLIO_CAP = 0.10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConstraintName =
  | 'limit_by_flow'
  | 'limit_by_sales'
  | 'limit_by_ebitda'
  | 'limit_by_guarantee'
  | 'limit_by_portfolio';

export interface CreditLimitResult {
  limit_by_flow: number;
  limit_by_sales: number;
  limit_by_ebitda: number;
  limit_by_guarantee: number;
  limit_by_portfolio: number;
  final_limit: number;
  binding_constraint: ConstraintName;
}

// ---------------------------------------------------------------------------
// Pure calculation helpers (exported for testability)
// ---------------------------------------------------------------------------

/**
 * Limit by flow: max sustainable amount from cashflow engine.
 * Falls back to max_payment_capacity × term if max_sustainable_amount unavailable.
 */
export function calcLimitByFlow(
  cashflowMetrics: Record<string, MetricValue> | undefined,
  termMonths: number,
): number {
  if (!cashflowMetrics) return 0;

  const maxSustainable = cashflowMetrics['max_sustainable_amount']?.value;
  if (maxSustainable !== undefined && maxSustainable > 0) return maxSustainable;

  const maxPayment = cashflowMetrics['max_payment_capacity']?.value;
  if (maxPayment !== undefined && maxPayment > 0) return maxPayment * termMonths;

  return 0;
}

/**
 * Limit by sales: salesFactor × annual revenue.
 */
export function calcLimitBySales(
  satMetrics: Record<string, MetricValue> | undefined,
  salesFactor: number = SALES_FACTOR,
): number {
  if (!satMetrics) return 0;
  const totalRevenue = satMetrics['total_revenue']?.value ?? 0;
  return totalRevenue * salesFactor;
}

/**
 * Limit by EBITDA: multiplier × EBITDA.
 */
export function calcLimitByEBITDA(
  cashflowMetrics: Record<string, MetricValue> | undefined,
  multiplier: number = EBITDA_MULTIPLIER,
): number {
  if (!cashflowMetrics) return 0;
  const ebitda = cashflowMetrics['ebitda']?.value ?? 0;
  return Math.max(0, ebitda * multiplier);
}

/**
 * Limit by guarantee: net eligible value / required coverage ratio.
 * For 2:1 coverage, the max amount = net_eligible / 2.
 */
export function calcLimitByGuarantee(
  guaranteeMetrics: Record<string, MetricValue> | undefined,
): number {
  if (!guaranteeMetrics) return 0;
  const netEligible = guaranteeMetrics['valor_elegible_neto']?.value ?? 0;
  const requiredCoverage = guaranteeMetrics['required_coverage']?.value ?? 2.0;
  if (requiredCoverage <= 0) return 0;
  return Math.max(0, netEligible / requiredCoverage);
}

/**
 * Limit by portfolio: total portfolio size × concentration cap.
 */
export function calcLimitByPortfolio(
  portfolioMetrics: Record<string, MetricValue> | undefined,
  concentrationCap: number = DEFAULT_PORTFOLIO_CAP,
): number {
  if (!portfolioMetrics) return 0;
  const totalPortfolio = portfolioMetrics['total_portfolio_size']?.value ?? 0;
  return totalPortfolio * concentrationCap;
}

/**
 * Determine the final limit = MIN(all 5 limits) and the binding constraint.
 * Limits that are 0 (no data) are excluded from the MIN calculation.
 * If all limits are 0, final_limit = 0 and binding is 'limit_by_flow' by default.
 */
export function determineFinalLimit(limits: Omit<CreditLimitResult, 'final_limit' | 'binding_constraint'>): {
  final_limit: number;
  binding_constraint: ConstraintName;
} {
  const entries: [ConstraintName, number][] = [
    ['limit_by_flow', limits.limit_by_flow],
    ['limit_by_sales', limits.limit_by_sales],
    ['limit_by_ebitda', limits.limit_by_ebitda],
    ['limit_by_guarantee', limits.limit_by_guarantee],
    ['limit_by_portfolio', limits.limit_by_portfolio],
  ];

  // Only consider positive limits
  const positive = entries.filter(([, v]) => v > 0);

  if (positive.length === 0) {
    return { final_limit: 0, binding_constraint: 'limit_by_flow' };
  }

  positive.sort((a, b) => a[1] - b[1]);
  return {
    final_limit: Math.round(positive[0]![1] * 100) / 100,
    binding_constraint: positive[0]![0],
  };
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function scoreToGrade(score: number): ModuleGrade {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function scoreToStatus(score: number, flags: RiskFlag[]): ModuleStatus {
  if (flags.some((f) => f.severity === 'hard_stop')) return 'blocked';
  if (score >= 60) return 'pass';
  if (score >= 40) return 'warning';
  return 'fail';
}

/**
 * Score reflects how well the final limit covers the requested amount.
 * 100 = final_limit >= requested, 0 = no capacity at all.
 */
export function calcCoverageScore(finalLimit: number, requestedAmount: number): number {
  if (finalLimit <= 0) return 0;
  if (requestedAmount <= 0) return 100;
  const ratio = finalLimit / requestedAmount;
  if (ratio >= 1.0) return 100;
  return Math.round(ratio * 100);
}

// ---------------------------------------------------------------------------
// Risk flags
// ---------------------------------------------------------------------------

export function generateRiskFlags(
  result: CreditLimitResult,
  requestedAmount: number,
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (result.final_limit <= 0) {
    flags.push({
      code: 'no_credit_capacity',
      severity: 'hard_stop',
      message: 'No positive credit limit could be calculated from any constraint',
    });
    return flags;
  }

  if (result.final_limit < requestedAmount) {
    const pct = Math.round((result.final_limit / requestedAmount) * 100);
    flags.push({
      code: 'limit_below_requested',
      severity: pct >= 70 ? 'warning' : 'critical',
      message: `Final limit ($${result.final_limit.toLocaleString()}) covers ${pct}% of requested amount ($${requestedAmount.toLocaleString()})`,
      source_metric: result.binding_constraint,
      value: result.final_limit,
      threshold: requestedAmount,
    });
  }

  if (result.limit_by_flow <= 0) {
    flags.push({
      code: 'no_flow_data',
      severity: 'warning',
      message: 'Cash flow limit could not be calculated — missing cashflow data',
    });
  }

  if (result.limit_by_guarantee <= 0) {
    flags.push({
      code: 'no_guarantee_data',
      severity: 'warning',
      message: 'Guarantee limit could not be calculated — missing guarantee data',
    });
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Key metrics builder
// ---------------------------------------------------------------------------

export function buildKeyMetrics(
  result: CreditLimitResult,
  requestedAmount: number,
): Record<string, MetricValue> {
  const m = (
    name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: MetricValue['impact_on_score'],
  ): MetricValue => ({
    name, label, value: Math.round(value * 100) / 100, unit,
    source: ENGINE_NAME, formula, interpretation, impact_on_score: impact,
  });

  return {
    limit_by_flow: m('limit_by_flow', 'Limit by Cash Flow', result.limit_by_flow, '$',
      'max_sustainable_amount from cashflow engine',
      result.limit_by_flow > 0 ? 'Flow-based capacity available' : 'No flow data',
      result.limit_by_flow > 0 ? 'positive' : 'negative'),
    limit_by_sales: m('limit_by_sales', 'Limit by Sales', result.limit_by_sales, '$',
      `${SALES_FACTOR * 100}% × annual_sales`,
      result.limit_by_sales > 0 ? 'Sales-based capacity available' : 'No sales data',
      result.limit_by_sales > 0 ? 'positive' : 'negative'),
    limit_by_ebitda: m('limit_by_ebitda', 'Limit by EBITDA', result.limit_by_ebitda, '$',
      `${EBITDA_MULTIPLIER}× EBITDA`,
      result.limit_by_ebitda > 0 ? 'EBITDA-based capacity available' : 'No EBITDA data',
      result.limit_by_ebitda > 0 ? 'positive' : 'negative'),
    limit_by_guarantee: m('limit_by_guarantee', 'Limit by Guarantee', result.limit_by_guarantee, '$',
      'net_eligible_value / required_coverage',
      result.limit_by_guarantee > 0 ? 'Guarantee-based capacity available' : 'No guarantee data',
      result.limit_by_guarantee > 0 ? 'positive' : 'negative'),
    limit_by_portfolio: m('limit_by_portfolio', 'Limit by Portfolio', result.limit_by_portfolio, '$',
      'total_portfolio × concentration_cap',
      result.limit_by_portfolio > 0 ? 'Portfolio capacity available' : 'No portfolio data',
      result.limit_by_portfolio > 0 ? 'positive' : 'negative'),
    final_limit: m('final_limit', 'Final Approved Limit', result.final_limit, '$',
      'MIN(all positive limits)',
      result.final_limit > 0
        ? `Binding constraint: ${result.binding_constraint}`
        : 'No credit capacity',
      result.final_limit >= requestedAmount ? 'positive' : 'negative'),
    binding_constraint: m('binding_constraint', 'Binding Constraint', result.final_limit, '$',
      result.binding_constraint,
      `The ${result.binding_constraint} is the most restrictive limit`,
      'neutral'),
  };
}

// ---------------------------------------------------------------------------
// Explanation & recommended actions
// ---------------------------------------------------------------------------

function buildExplanation(
  score: number, grade: ModuleGrade, result: CreditLimitResult, requestedAmount: number,
): string {
  const parts: string[] = [
    `Credit Limit Engine score: ${score}/100 (Grade ${grade}).`,
    `Final limit: $${result.final_limit.toLocaleString()} (binding: ${result.binding_constraint}).`,
  ];
  if (result.final_limit < requestedAmount) {
    parts.push(`Requested $${requestedAmount.toLocaleString()} exceeds calculated limit.`);
  }
  return parts.join(' ');
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  for (const f of flags) {
    if (f.code === 'no_credit_capacity') actions.push('Review all input engines — no positive limit found');
    if (f.code === 'limit_below_requested') actions.push('Consider reducing requested amount or strengthening guarantees');
    if (f.code === 'no_flow_data') actions.push('Ensure cashflow engine has run successfully');
    if (f.code === 'no_guarantee_data') actions.push('Ensure guarantee engine has run successfully');
  }
  return actions;
}

// ---------------------------------------------------------------------------
// Main engine runner
// ---------------------------------------------------------------------------

export async function runCreditLimitEngine(input: EngineInput): Promise<EngineOutput> {
  const otherResults = input.other_engine_results ?? {};

  const cashflowResult = otherResults['cashflow'];
  const satResult = otherResults['sat_facturacion'];
  const guaranteeResult = otherResults['guarantee'];
  const portfolioResult = otherResults['portfolio'];

  // Extract requested amount from extended input properties
  const requestedAmount = (input as unknown as Record<string, unknown>)['requested_amount'] as number | undefined ?? 0;
  const termMonths = (input as unknown as Record<string, unknown>)['term_months'] as number | undefined ?? 24;

  // Calculate 5 limits
  const limit_by_flow = calcLimitByFlow(cashflowResult?.key_metrics, termMonths);
  const limit_by_sales = calcLimitBySales(satResult?.key_metrics);
  const limit_by_ebitda = calcLimitByEBITDA(cashflowResult?.key_metrics);
  const limit_by_guarantee = calcLimitByGuarantee(guaranteeResult?.key_metrics);
  const limit_by_portfolio = calcLimitByPortfolio(portfolioResult?.key_metrics);

  const limits = { limit_by_flow, limit_by_sales, limit_by_ebitda, limit_by_guarantee, limit_by_portfolio };
  const { final_limit, binding_constraint } = determineFinalLimit(limits);

  const result: CreditLimitResult = { ...limits, final_limit, binding_constraint };

  // Score & grade
  const score = calcCoverageScore(final_limit, requestedAmount);
  const grade = scoreToGrade(score);
  const flags = generateRiskFlags(result, requestedAmount);
  const status = scoreToStatus(score, flags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: score,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: flags,
    key_metrics: buildKeyMetrics(result, requestedAmount),
    benchmark_comparison: {},
    trends: [],
    explanation: buildExplanation(score, grade, result, requestedAmount),
    recommended_actions: buildRecommendedActions(flags),
    created_at: new Date().toISOString(),
  };
}
