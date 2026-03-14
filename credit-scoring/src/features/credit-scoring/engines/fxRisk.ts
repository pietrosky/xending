import type { EngineInput, EngineOutput } from '../types/engine.types';

const ENGINE_NAME = 'fx_risk';

export interface CurrencyBreakdown {
  usd: number;
  mxn: number;
}

export interface FxRiskInput {
  moneda_credito: 'MXN' | 'USD';
  revenue: CurrencyBreakdown;
  costs: CurrencyBreakdown;
  accounts_receivable: CurrencyBreakdown;
  debt: CurrencyBreakdown;
  ebitda: number;
  annual_debt_service: number;
  guarantee_value_mxn: number;
  loan_amount: number;
  historical_mismatch?: Array<{ period: string; mismatch_ratio: number }>;
}

export interface ScenarioResult {
  name: string;
  depreciation: number;
  adjusted_revenue_usd_equivalent: number;
  adjusted_costs_usd_equivalent: number;
  adjusted_ebitda: number;
  dscr_stressed: number;
  ltv_stressed: number;
}

export function calcTotalRevenue(r: CurrencyBreakdown): number {
  return r.usd + r.mxn;
}

export function calcTotalCosts(c: CurrencyBreakdown): number {
  return c.usd + c.mxn;
}

export function calcCurrencyMismatchRatio(
  revenue: CurrencyBreakdown,
  moneda: 'MXN' | 'USD',
): number {
  const total = calcTotalRevenue(revenue);
  if (total <= 0) return 0;
  return (moneda === 'USD' ? revenue.usd : revenue.mxn) / total;
}


export function calcNaturalHedgeRatio(
  revenue: CurrencyBreakdown,
  costs: CurrencyBreakdown,
): number {
  const maxVal = Math.max(revenue.usd, costs.usd);
  if (maxVal <= 0) return 0;
  return Math.min(revenue.usd, costs.usd) / maxVal;
}

export function calcUncoveredExposure(
  revenue: CurrencyBreakdown,
  costs: CurrencyBreakdown,
  debt: CurrencyBreakdown,
): number {
  const totalUsdObligations = costs.usd + debt.usd;
  const hedgeAmount = Math.min(revenue.usd, costs.usd);
  return Math.max(0, totalUsdObligations - hedgeAmount);
}

/** Stub - full engine not implemented yet. Orchestrator mocks this. */
export async function runFxRiskEngine(_input: EngineInput): Promise<EngineOutput> {
  void ENGINE_NAME;
  throw new Error('FX Risk engine not fully implemented');
}
