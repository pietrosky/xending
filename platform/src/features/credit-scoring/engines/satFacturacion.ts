import type { CFDI, Declaracion } from '../api/syntageClient';
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

const ENGINE_NAME = 'sat_facturacion';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  revenue_quality: 0.25,
  payment_behavior: 0.20,
  cancellations: 0.15,
  facturado_vs_declarado: 0.20,
  product_diversification: 0.10,
  dso_dpo: 0.10,
} as const;

/** Industry benchmark defaults */
const BENCHMARKS = {
  cancellation_rate: 0.05,
  pue_ratio: 0.60,
  dso_days: 45,
  dpo_days: 35,
  top1_client_pct: 0.25,
  facturado_vs_declarado_ratio: 1.0,
} as const;

// ============================================================
// Input types
// ============================================================

export interface SatFacturacionInput {
  cfdis_emitidas: CFDI[];
  cfdis_recibidas: CFDI[];
  declaraciones: Declaracion[];
}

// ============================================================
// Metric calculation helpers
// ============================================================

/** Group CFDIs by month period string "YYYY-MM" */
function groupByMonth(cfdis: CFDI[]): Map<string, CFDI[]> {
  const map = new Map<string, CFDI[]>();
  for (const cfdi of cfdis) {
    const period = cfdi.fecha.substring(0, 7); // "YYYY-MM"
    const arr = map.get(period) ?? [];
    arr.push(cfdi);
    map.set(period, arr);
  }
  return map;
}

/** Calculate revenue concentration: top 1 client % and HHI */
export function calcRevenueConcentration(cfdis: CFDI[]): {
  top1_pct: number;
  top3_pct: number;
  hhi: number;
  total_revenue: number;
} {
  const active = cfdis.filter((c) => c.estatus !== 'cancelado');
  const totalRevenue = active.reduce((s, c) => s + c.total, 0);
  if (totalRevenue === 0) {
    return { top1_pct: 0, top3_pct: 0, hhi: 0, total_revenue: 0 };
  }

  // Group by receptor RFC
  const byClient = new Map<string, number>();
  for (const cfdi of active) {
    byClient.set(cfdi.rfc_receptor, (byClient.get(cfdi.rfc_receptor) ?? 0) + cfdi.total);
  }

  const shares = Array.from(byClient.values())
    .map((v) => v / totalRevenue)
    .sort((a, b) => b - a);

  const top1 = shares[0] ?? 0;
  const top3 = shares.slice(0, 3).reduce((s, v) => s + v, 0);
  const hhi = shares.reduce((s, v) => s + v * v * 10000, 0);

  return { top1_pct: top1, top3_pct: top3, hhi: Math.round(hhi), total_revenue: totalRevenue };
}

/** Calculate PUE vs PPD ratio from emitted CFDIs */
export function calcPaymentBehavior(cfdis: CFDI[]): {
  pue_ratio: number;
  ppd_ratio: number;
  pue_total: number;
  ppd_total: number;
} {
  const active = cfdis.filter((c) => c.estatus !== 'cancelado');
  const total = active.reduce((s, c) => s + c.total, 0);
  if (total === 0) return { pue_ratio: 0, ppd_ratio: 0, pue_total: 0, ppd_total: 0 };

  const pueTotal = active.filter((c) => c.metodo_pago === 'PUE').reduce((s, c) => s + c.total, 0);
  const ppdTotal = active.filter((c) => c.metodo_pago === 'PPD').reduce((s, c) => s + c.total, 0);

  return {
    pue_ratio: pueTotal / total,
    ppd_ratio: ppdTotal / total,
    pue_total: pueTotal,
    ppd_total: ppdTotal,
  };
}

/** Estimate DSO from emitted CFDIs (days sales outstanding) */
export function calcDSO(emitidas: CFDI[]): number {
  const active = emitidas.filter((c) => c.estatus !== 'cancelado');
  const ppdInvoices = active.filter((c) => c.metodo_pago === 'PPD');
  if (ppdInvoices.length === 0) return 0;

  // Estimate: PPD invoices represent credit sales
  // DSO = (PPD outstanding / total revenue) * 30 days (monthly approximation)
  const totalRevenue = active.reduce((s, c) => s + c.total, 0);
  const ppdTotal = ppdInvoices.reduce((s, c) => s + c.total, 0);
  if (totalRevenue === 0) return 0;

  return Math.round((ppdTotal / totalRevenue) * 30);
}

/** Estimate DPO from received CFDIs (days payable outstanding) */
export function calcDPO(recibidas: CFDI[]): number {
  const active = recibidas.filter((c) => c.estatus !== 'cancelado');
  const ppdInvoices = active.filter((c) => c.metodo_pago === 'PPD');
  if (ppdInvoices.length === 0) return 0;

  const totalExpenses = active.reduce((s, c) => s + c.total, 0);
  const ppdTotal = ppdInvoices.reduce((s, c) => s + c.total, 0);
  if (totalExpenses === 0) return 0;

  return Math.round((ppdTotal / totalExpenses) * 30);
}

/** Calculate cancellation rate */
export function calcCancellationRate(cfdis: CFDI[]): {
  rate: number;
  cancelled_count: number;
  total_count: number;
  cancelled_amount: number;
  total_amount: number;
} {
  const totalCount = cfdis.length;
  const totalAmount = cfdis.reduce((s, c) => s + c.total, 0);
  const cancelled = cfdis.filter((c) => c.estatus === 'cancelado');
  const cancelledCount = cancelled.length;
  const cancelledAmount = cancelled.reduce((s, c) => s + c.total, 0);

  return {
    rate: totalCount > 0 ? cancelledCount / totalCount : 0,
    cancelled_count: cancelledCount,
    total_count: totalCount,
    cancelled_amount: cancelledAmount,
    total_amount: totalAmount,
  };
}

/** Compare facturado vs declarado */
export function calcFacturadoVsDeclarado(
  emitidas: CFDI[],
  declaraciones: Declaracion[],
): { ratio: number; facturado: number; declarado: number } {
  const activeEmitidas = emitidas.filter((c) => c.estatus !== 'cancelado');
  const facturado = activeEmitidas.reduce((s, c) => s + c.total, 0);

  // Sum declared income from all declarations
  const declarado = declaraciones.reduce((s, d) => s + d.ingresos_totales, 0);

  if (declarado === 0) {
    return { ratio: facturado > 0 ? 999 : 1, facturado, declarado };
  }

  return {
    ratio: facturado / declarado,
    facturado,
    declarado,
  };
}

/** Calculate product/service diversification HHI from CFDIs */
export function calcProductDiversification(cfdis: CFDI[]): {
  hhi: number;
  product_count: number;
} {
  const active = cfdis.filter((c) => c.estatus !== 'cancelado');
  const total = active.reduce((s, c) => s + c.total, 0);
  if (total === 0) return { hhi: 10000, product_count: 0 };

  // Group by tipo_comprobante as proxy for product type
  const byType = new Map<string, number>();
  for (const cfdi of active) {
    const key = cfdi.tipo_comprobante || 'unknown';
    byType.set(key, (byType.get(key) ?? 0) + cfdi.total);
  }

  const shares = Array.from(byType.values()).map((v) => v / total);
  const hhi = shares.reduce((s, v) => s + v * v * 10000, 0);

  return { hhi: Math.round(hhi), product_count: byType.size };
}

// ============================================================
// Sub-score calculations (each returns 0-100)
// ============================================================

function scoreRevenueQuality(top1Pct: number, hhi: number): number {
  // Lower concentration = better
  let score = 100;
  if (top1Pct > 0.50) score -= 40;
  else if (top1Pct > 0.35) score -= 25;
  else if (top1Pct > 0.25) score -= 10;

  if (hhi > 2500) score -= 30;
  else if (hhi > 1500) score -= 15;

  return Math.max(0, Math.min(100, score));
}

function scorePaymentBehavior(pueRatio: number): number {
  // Higher PUE ratio = more immediate payments = better
  if (pueRatio >= 0.70) return 100;
  if (pueRatio >= 0.50) return 80;
  if (pueRatio >= 0.30) return 60;
  if (pueRatio >= 0.15) return 40;
  return 20;
}

function scoreCancellations(rate: number): number {
  if (rate <= 0.03) return 100;
  if (rate <= 0.05) return 85;
  if (rate <= 0.10) return 65;
  if (rate <= 0.15) return 40;
  return 20;
}

function scoreFacturadoVsDeclarado(ratio: number): number {
  const deviation = Math.abs(ratio - 1.0);
  if (deviation <= 0.05) return 100;
  if (deviation <= 0.10) return 85;
  if (deviation <= 0.15) return 65;
  if (deviation <= 0.25) return 40;
  return 20;
}

function scoreDsoDpo(dso: number, dpo: number): number {
  let score = 100;
  // DSO: lower is better
  if (dso > 90) score -= 35;
  else if (dso > 60) score -= 20;
  else if (dso > 45) score -= 10;

  // DPO: moderate is fine, very high may indicate cash issues
  if (dpo > 90) score -= 15;
  else if (dpo > 60) score -= 5;

  return Math.max(0, Math.min(100, score));
}

function scoreProductDiversification(hhi: number, productCount: number): number {
  if (productCount <= 1) return 30;
  if (hhi <= 2500) return 100;
  if (hhi <= 5000) return 70;
  if (hhi <= 7500) return 45;
  return 25;
}

// ============================================================
// Grade and status helpers
// ============================================================

function scoreToGrade(score: number): ModuleGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function scoreToStatus(score: number, flags: RiskFlag[]): ModuleStatus {
  const hasCritical = flags.some((f) => f.severity === 'critical');
  if (score < 40 || hasCritical) return 'fail';
  if (score < 60 || flags.some((f) => f.severity === 'warning')) return 'warning';
  return 'pass';
}

// ============================================================
// Risk flag generation
// ============================================================

function generateRiskFlags(metrics: {
  cancellationRateEmitidas: number;
  cancellationRateRecibidas: number;
  facturadoVsDeclaradoRatio: number;
  top1ClientPct: number;
  top3ClientPct: number;
  dso: number;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Req 19: cancelaciones emitidas > 10%
  if (metrics.cancellationRateEmitidas > 0.10) {
    flags.push({
      code: 'high_cancellation_risk',
      severity: metrics.cancellationRateEmitidas > 0.20 ? 'critical' : 'warning',
      message: `Cancellation rate ${(metrics.cancellationRateEmitidas * 100).toFixed(1)}% exceeds 10% threshold`,
      source_metric: 'cancellation_rate_emitidas',
      value: metrics.cancellationRateEmitidas,
      threshold: 0.10,
    });
  }

  // Req 20: cancelaciones recibidas > 12%
  if (metrics.cancellationRateRecibidas > 0.12) {
    flags.push({
      code: 'supplier_cancellation_risk',
      severity: 'warning',
      message: `Supplier cancellation rate ${(metrics.cancellationRateRecibidas * 100).toFixed(1)}% exceeds 12% threshold`,
      source_metric: 'cancellation_rate_recibidas',
      value: metrics.cancellationRateRecibidas,
      threshold: 0.12,
    });
  }

  // Req 21: facturado vs declarado discrepancy > 15%
  const fvdDeviation = Math.abs(metrics.facturadoVsDeclaradoRatio - 1.0);
  if (fvdDeviation > 0.15) {
    flags.push({
      code: 'fiscal_inconsistency_risk',
      severity: fvdDeviation > 0.30 ? 'critical' : 'warning',
      message: `Invoiced vs declared deviation ${(fvdDeviation * 100).toFixed(1)}% exceeds 15% threshold`,
      source_metric: 'facturado_vs_declarado_ratio',
      value: metrics.facturadoVsDeclaradoRatio,
      threshold: 1.15,
    });
  }

  // High client concentration
  if (metrics.top1ClientPct > 0.50) {
    flags.push({
      code: 'high_client_concentration',
      severity: 'critical',
      message: `Top client represents ${(metrics.top1ClientPct * 100).toFixed(1)}% of revenue`,
      source_metric: 'revenue_concentration_top1',
      value: metrics.top1ClientPct,
      threshold: 0.50,
    });
  } else if (metrics.top1ClientPct > 0.35) {
    flags.push({
      code: 'moderate_client_concentration',
      severity: 'warning',
      message: `Top client represents ${(metrics.top1ClientPct * 100).toFixed(1)}% of revenue`,
      source_metric: 'revenue_concentration_top1',
      value: metrics.top1ClientPct,
      threshold: 0.35,
    });
  }

  // High DSO
  if (metrics.dso > 90) {
    flags.push({
      code: 'high_dso',
      severity: 'warning',
      message: `DSO of ${metrics.dso} days indicates slow collections`,
      source_metric: 'dso',
      value: metrics.dso,
      threshold: 90,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis helpers
// ============================================================

/** Build monthly revenue time series from emitted CFDIs */
function buildRevenueTimeSeries(emitidas: CFDI[]): TimeSeriesPoint[] {
  const active = emitidas.filter((c) => c.estatus !== 'cancelado');
  const byMonth = groupByMonth(active);
  const periods = Array.from(byMonth.keys()).sort();

  return periods.map((period) => ({
    period,
    value: byMonth.get(period)!.reduce((s, c) => s + c.total, 0),
  }));
}

/** Build monthly cancellation rate time series */
function buildCancellationTimeSeries(cfdis: CFDI[]): TimeSeriesPoint[] {
  const byMonth = groupByMonth(cfdis);
  const periods = Array.from(byMonth.keys()).sort();

  return periods.map((period) => {
    const monthCfdis = byMonth.get(period)!;
    const total = monthCfdis.length;
    const cancelled = monthCfdis.filter((c) => c.estatus === 'cancelado').length;
    return { period, value: total > 0 ? cancelled / total : 0 };
  });
}

/** Build monthly DSO time series */
function buildDsoTimeSeries(emitidas: CFDI[]): TimeSeriesPoint[] {
  const byMonth = groupByMonth(emitidas.filter((c) => c.estatus !== 'cancelado'));
  const periods = Array.from(byMonth.keys()).sort();

  return periods.map((period) => {
    const monthCfdis = byMonth.get(period)!;
    const total = monthCfdis.reduce((s, c) => s + c.total, 0);
    const ppd = monthCfdis.filter((c) => c.metodo_pago === 'PPD').reduce((s, c) => s + c.total, 0);
    return { period, value: total > 0 ? Math.round((ppd / total) * 30) : 0 };
  });
}

/** Run trend analysis for key metrics */
function analyzeTrends(emitidas: CFDI[]): TrendResult[] {
  const trends: TrendResult[] = [];

  const revenueSeries = buildRevenueTimeSeries(emitidas);
  if (revenueSeries.length >= 3) {
    const revenueConfig: TrendConfig = {
      metric_name: 'monthly_revenue',
      metric_label: 'Monthly Revenue',
      unit: 'MXN',
      higher_is_better: true,
      projection_months: 3,
      y_axis_format: '$',
    };
    trends.push(trendUtils.analyze(revenueSeries, revenueConfig));
  }

  const cancellationSeries = buildCancellationTimeSeries(emitidas);
  if (cancellationSeries.length >= 3) {
    const cancConfig: TrendConfig = {
      metric_name: 'cancellation_rate',
      metric_label: 'Cancellation Rate',
      unit: '%',
      higher_is_better: false,
      warning_threshold: 0.10,
      critical_threshold: 0.20,
      projection_months: 3,
      y_axis_format: '%',
    };
    trends.push(trendUtils.analyze(cancellationSeries, cancConfig));
  }

  const dsoSeries = buildDsoTimeSeries(emitidas);
  if (dsoSeries.length >= 3) {
    const dsoConfig: TrendConfig = {
      metric_name: 'dso',
      metric_label: 'Days Sales Outstanding',
      unit: 'days',
      higher_is_better: false,
      warning_threshold: 60,
      critical_threshold: 90,
      benchmark_value: BENCHMARKS.dso_days,
      projection_months: 3,
      y_axis_format: 'days',
    };
    trends.push(trendUtils.analyze(dsoSeries, dsoConfig));
  }

  return trends;
}

// ============================================================
// Benchmark comparison builder
// ============================================================

function buildBenchmarks(metrics: {
  cancellationRate: number;
  pueRatio: number;
  dso: number;
  dpo: number;
  top1ClientPct: number;
  facturadoVsDeclaradoRatio: number;
}): Record<string, BenchmarkComparison> {
  function compare(
    metric: string,
    applicant: number,
    benchmark: number,
    lowerIsBetter: boolean,
  ): BenchmarkComparison {
    const deviation = benchmark !== 0 ? ((applicant - benchmark) / Math.abs(benchmark)) * 100 : 0;
    let status: 'above' | 'at' | 'below';
    if (Math.abs(deviation) < 5) status = 'at';
    else if (deviation > 0) status = lowerIsBetter ? 'below' : 'above';
    else status = lowerIsBetter ? 'above' : 'below';

    return {
      metric,
      applicant_value: Math.round(applicant * 10000) / 10000,
      benchmark_value: benchmark,
      deviation_percent: Math.round(deviation * 100) / 100,
      status,
    };
  }

  return {
    cancellation_rate: compare('cancellation_rate', metrics.cancellationRate, BENCHMARKS.cancellation_rate, true),
    pue_ratio: compare('pue_ratio', metrics.pueRatio, BENCHMARKS.pue_ratio, false),
    dso: compare('dso', metrics.dso, BENCHMARKS.dso_days, true),
    dpo: compare('dpo', metrics.dpo, BENCHMARKS.dpo_days, true),
    revenue_concentration: compare('revenue_concentration', metrics.top1ClientPct, BENCHMARKS.top1_client_pct, true),
    facturado_vs_declarado: compare('facturado_vs_declarado', metrics.facturadoVsDeclaradoRatio, BENCHMARKS.facturado_vs_declarado_ratio, false),
  };
}

// ============================================================
// Key metrics builder
// ============================================================

function buildKeyMetrics(data: {
  revenueConc: ReturnType<typeof calcRevenueConcentration>;
  paymentBeh: ReturnType<typeof calcPaymentBehavior>;
  dso: number;
  dpo: number;
  cancEmitidas: ReturnType<typeof calcCancellationRate>;
  fvd: ReturnType<typeof calcFacturadoVsDeclarado>;
  productDiv: ReturnType<typeof calcProductDiversification>;
}): Record<string, MetricValue> {
  return {
    revenue_concentration: {
      name: 'revenue_concentration',
      label: 'Top 1 Client Concentration',
      value: Math.round(data.revenueConc.top1_pct * 10000) / 100,
      unit: '%',
      source: 'CFDIs emitidas',
      formula: 'top_client_revenue / total_revenue',
      interpretation: data.revenueConc.top1_pct > 0.35 ? 'High concentration risk' : 'Acceptable diversification',
      impact_on_score: data.revenueConc.top1_pct > 0.35 ? 'negative' : 'positive',
    },
    pue_ratio: {
      name: 'pue_ratio',
      label: 'PUE Payment Ratio',
      value: Math.round(data.paymentBeh.pue_ratio * 10000) / 100,
      unit: '%',
      source: 'CFDIs emitidas',
      formula: 'pue_amount / total_amount',
      interpretation: data.paymentBeh.pue_ratio >= 0.50 ? 'Good immediate payment ratio' : 'High credit sales exposure',
      impact_on_score: data.paymentBeh.pue_ratio >= 0.50 ? 'positive' : 'negative',
    },
    dso: {
      name: 'dso',
      label: 'Days Sales Outstanding',
      value: data.dso,
      unit: 'days',
      source: 'CFDIs emitidas PPD',
      formula: '(ppd_total / total_revenue) * 30',
      interpretation: data.dso <= 45 ? 'Healthy collection period' : 'Slow collections',
      impact_on_score: data.dso <= 45 ? 'positive' : 'negative',
    },
    dpo: {
      name: 'dpo',
      label: 'Days Payable Outstanding',
      value: data.dpo,
      unit: 'days',
      source: 'CFDIs recibidas PPD',
      formula: '(ppd_total / total_expenses) * 30',
      interpretation: data.dpo <= 35 ? 'Prompt payment to suppliers' : 'Extended payment terms',
      impact_on_score: data.dpo <= 60 ? 'neutral' : 'negative',
    },
    cancellation_rate: {
      name: 'cancellation_rate',
      label: 'Cancellation Rate (Emitidas)',
      value: Math.round(data.cancEmitidas.rate * 10000) / 100,
      unit: '%',
      source: 'CFDIs emitidas',
      formula: 'cancelled_count / total_count',
      interpretation: data.cancEmitidas.rate <= 0.05 ? 'Low cancellation rate' : 'Elevated cancellations',
      impact_on_score: data.cancEmitidas.rate <= 0.10 ? 'positive' : 'negative',
    },
    facturado_vs_declarado_ratio: {
      name: 'facturado_vs_declarado_ratio',
      label: 'Invoiced vs Declared Ratio',
      value: Math.round(data.fvd.ratio * 10000) / 10000,
      unit: 'ratio',
      source: 'CFDIs emitidas vs Declaraciones',
      formula: 'total_facturado / total_declarado',
      interpretation: Math.abs(data.fvd.ratio - 1.0) <= 0.10 ? 'Consistent with declarations' : 'Discrepancy detected',
      impact_on_score: Math.abs(data.fvd.ratio - 1.0) <= 0.15 ? 'positive' : 'negative',
    },
    total_revenue: {
      name: 'total_revenue',
      label: 'Total Revenue (Active CFDIs)',
      value: Math.round(data.revenueConc.total_revenue * 100) / 100,
      unit: 'MXN',
      source: 'CFDIs emitidas',
      interpretation: 'Total invoiced revenue from active CFDIs',
      impact_on_score: 'neutral',
    },
    product_hhi: {
      name: 'product_hhi',
      label: 'Product Diversification HHI',
      value: data.productDiv.hhi,
      unit: 'index',
      source: 'CFDIs emitidas',
      formula: 'sum(share_i^2) * 10000',
      interpretation: data.productDiv.hhi <= 2500 ? 'Well diversified' : 'Concentrated product mix',
      impact_on_score: data.productDiv.hhi <= 5000 ? 'neutral' : 'negative',
    },
  };
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const parts: string[] = [
    `SAT/Facturacion engine score: ${score}/100 (Grade ${grade}).`,
  ];

  if (flags.length === 0) {
    parts.push('No risk flags detected.');
  } else {
    const criticalCount = flags.filter((f) => f.severity === 'critical').length;
    const warningCount = flags.filter((f) => f.severity === 'warning').length;
    if (criticalCount > 0) parts.push(`${criticalCount} critical flag(s).`);
    if (warningCount > 0) parts.push(`${warningCount} warning flag(s).`);
  }

  return parts.join(' ');
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];

  for (const flag of flags) {
    switch (flag.code) {
      case 'high_cancellation_risk':
        actions.push('Investigate high cancellation rate - review client disputes and billing quality');
        break;
      case 'supplier_cancellation_risk':
        actions.push('Review supplier cancellation patterns - may indicate supply chain issues');
        break;
      case 'fiscal_inconsistency_risk':
        actions.push('Reconcile invoiced amounts with tax declarations - significant discrepancy detected');
        break;
      case 'high_client_concentration':
        actions.push('Assess dependency on top client - request diversification plan');
        break;
      case 'moderate_client_concentration':
        actions.push('Monitor client concentration - consider requiring additional guarantees');
        break;
      case 'high_dso':
        actions.push('Review collection efficiency - DSO exceeds acceptable range');
        break;
    }
  }

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

/**
 * Run the SAT/Facturacion Engine.
 *
 * Analyzes invoicing patterns, payment behavior, cancellations,
 * fiscal consistency, and product diversification from Syntage CFDI data.
 *
 * Weight in consolidated score: 14% (0.14)
 */
export async function runSatFacturacionEngine(input: EngineInput): Promise<EngineOutput> {
  const syntageData = input.syntage_data as SatFacturacionInput | undefined;

  if (!syntageData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_sat_data',
        severity: 'critical',
        message: 'No SAT/Syntage data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'SAT/Facturacion engine blocked: no Syntage data provided.',
      recommended_actions: ['Ensure Syntage API data is available before running SAT engine'],
      created_at: new Date().toISOString(),
    };
  }

  const { cfdis_emitidas, cfdis_recibidas, declaraciones } = syntageData;

  // Calculate all metrics
  const revenueConc = calcRevenueConcentration(cfdis_emitidas);
  const paymentBeh = calcPaymentBehavior(cfdis_emitidas);
  const dso = calcDSO(cfdis_emitidas);
  const dpo = calcDPO(cfdis_recibidas);
  const cancEmitidas = calcCancellationRate(cfdis_emitidas);
  const cancRecibidas = calcCancellationRate(cfdis_recibidas);
  const fvd = calcFacturadoVsDeclarado(cfdis_emitidas, declaraciones);
  const productDiv = calcProductDiversification(cfdis_emitidas);

  // Calculate sub-scores
  const subScores = {
    revenue_quality: scoreRevenueQuality(revenueConc.top1_pct, revenueConc.hhi),
    payment_behavior: scorePaymentBehavior(paymentBeh.pue_ratio),
    cancellations: scoreCancellations(cancEmitidas.rate),
    facturado_vs_declarado: scoreFacturadoVsDeclarado(fvd.ratio),
    product_diversification: scoreProductDiversification(productDiv.hhi, productDiv.product_count),
    dso_dpo: scoreDsoDpo(dso, dpo),
  };

  // Weighted score
  const rawScore =
    subScores.revenue_quality * SUB_WEIGHTS.revenue_quality +
    subScores.payment_behavior * SUB_WEIGHTS.payment_behavior +
    subScores.cancellations * SUB_WEIGHTS.cancellations +
    subScores.facturado_vs_declarado * SUB_WEIGHTS.facturado_vs_declarado +
    subScores.product_diversification * SUB_WEIGHTS.product_diversification +
    subScores.dso_dpo * SUB_WEIGHTS.dso_dpo;

  // Apply trend factor
  const trends = analyzeTrends(cfdis_emitidas);
  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));

  const grade = scoreToGrade(finalScore);

  // Risk flags
  const riskFlags = generateRiskFlags({
    cancellationRateEmitidas: cancEmitidas.rate,
    cancellationRateRecibidas: cancRecibidas.rate,
    facturadoVsDeclaradoRatio: fvd.ratio,
    top1ClientPct: revenueConc.top1_pct,
    top3ClientPct: revenueConc.top3_pct,
    dso,
  });

  const status = scoreToStatus(finalScore, riskFlags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics({ revenueConc, paymentBeh, dso, dpo, cancEmitidas, fvd, productDiv }),
    benchmark_comparison: buildBenchmarks({
      cancellationRate: cancEmitidas.rate,
      pueRatio: paymentBeh.pue_ratio,
      dso,
      dpo,
      top1ClientPct: revenueConc.top1_pct,
      facturadoVsDeclaradoRatio: fvd.ratio,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
