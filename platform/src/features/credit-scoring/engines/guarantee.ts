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

const ENGINE_NAME = 'guarantee';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  coverage_ratio: 0.40,
  guarantee_quality: 0.30,
  documentation_completeness: 0.20,
  fx_alignment: 0.10,
} as const;

/** Benchmarks for guarantee metrics */
const BENCHMARKS = {
  coverage_ratio: 2.0,
  guarantee_quality: 70,
  documentation_pct: 1.0,
} as const;

/**
 * Haircut midpoints by guarantee type (from design doc).
 * Range comments show the full range per requirement 12.3.
 */
export const HAIRCUT_BY_TYPE: Record<GuaranteeType, number> = {
  cash_collateral: 0.05,        // cash USD: 0-10%
  inmueble: 0.375,              // 30-45%
  vehiculo: 0.525,              // 45-60%
  cuentas_por_cobrar: 0.425,    // 35-50%
  inventario: 0.60,             // 50-70%
  aval_personal: 0.70,          // design: 70%
  aval_corporativo: 0.50,       // design: 50%
  garantia_prendaria: 0.55,     // design: 55%
  cesion_derechos: 0.45,        // design: 45%
  fideicomiso: 0.35,            // design: 35%
};

/** Additional FX haircut for MXN guarantees on USD loans */
const FX_HAIRCUT = 0.15;

/** Cash MXN haircut when loan is in USD (10-20%, midpoint 15%) */
const CASH_MXN_USD_LOAN_HAIRCUT = 0.15;

// ============================================================
// Input types
// ============================================================

export type GuaranteeType =
  | 'inmueble'
  | 'vehiculo'
  | 'cuentas_por_cobrar'
  | 'inventario'
  | 'cash_collateral'
  | 'aval_personal'
  | 'aval_corporativo'
  | 'garantia_prendaria'
  | 'cesion_derechos'
  | 'fideicomiso';

export interface GuaranteeItem {
  tipo: GuaranteeType;
  valor_comercial: number;
  valor_forzoso: number;
  liquidez: number;           // 0-1 liquidity factor
  documentacion_completa: boolean;
  moneda: 'MXN' | 'USD';
  jurisdiccion: string;
}

export interface GuaranteeInput {
  monto_solicitado: number;
  monto_aprobado_preliminar: number;
  moneda_credito: 'MXN' | 'USD';
  guarantees: GuaranteeItem[];
  /** Consolidated score from other engines (0-100) for dynamic coverage */
  consolidated_score?: number;
  /** Historical coverage ratios for trend analysis */
  historical_coverage?: Array<{ period: string; coverage_ratio: number }>;
}

// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

/** Determine the effective haircut for a guarantee considering FX mismatch */
export function calcEffectiveHaircut(
  tipo: GuaranteeType,
  moneda_garantia: 'MXN' | 'USD',
  moneda_credito: 'MXN' | 'USD',
): number {
  // Cash MXN against USD loan uses special haircut
  if (tipo === 'cash_collateral' && moneda_garantia === 'MXN' && moneda_credito === 'USD') {
    return CASH_MXN_USD_LOAN_HAIRCUT;
  }

  let haircut = HAIRCUT_BY_TYPE[tipo];

  // Additional FX haircut when guarantee currency differs from loan currency
  if (moneda_garantia !== moneda_credito) {
    haircut = Math.min(1, haircut + FX_HAIRCUT);
  }

  return haircut;
}

/** Calculate net eligible value after haircut */
export function calcNetEligibleValue(item: GuaranteeItem, moneda_credito: 'MXN' | 'USD'): number {
  const haircut = calcEffectiveHaircut(item.tipo, item.moneda, moneda_credito);
  const baseValue = Math.min(item.valor_comercial, item.valor_forzoso || item.valor_comercial);
  return Math.max(0, baseValue * (1 - haircut) * item.liquidez);
}

/** Calculate total net eligible value across all guarantees */
export function calcTotalNetEligible(guarantees: GuaranteeItem[], moneda_credito: 'MXN' | 'USD'): number {
  return guarantees.reduce((sum, g) => sum + calcNetEligibleValue(g, moneda_credito), 0);
}

/** Determine required coverage ratio based on consolidated score */
export function calcRequiredCoverageRatio(baseRatio: number, consolidatedScore: number | undefined): number {
  if (consolidatedScore === undefined) return baseRatio;
  if (consolidatedScore >= 75) return baseRatio;        // 2.0x
  if (consolidatedScore >= 60) return baseRatio * 1.125; // 2.25x
  return baseRatio * 1.25;                               // 2.5x
}

/** Calculate coverage ratio = total net eligible / approved amount */
export function calcCoverageRatio(totalNetEligible: number, montoAprobado: number): number {
  if (montoAprobado <= 0) return 0;
  return totalNetEligible / montoAprobado;
}

/** Calculate guarantee shortfall (positive = shortfall, 0 = sufficient) */
export function calcShortfall(totalNetEligible: number, montoAprobado: number, requiredRatio: number): number {
  const required = montoAprobado * requiredRatio;
  return Math.max(0, required - totalNetEligible);
}

/** Check if coverage meets the required ratio */
export function meetsCoverageRequirement(coverageRatio: number, requiredRatio: number): boolean {
  return coverageRatio >= requiredRatio;
}

// ============================================================
// Quality scoring helpers
// ============================================================

/** Quality tiers for guarantee types (higher = better quality) */
const QUALITY_TIERS: Record<GuaranteeType, number> = {
  cash_collateral: 100,
  fideicomiso: 85,
  inmueble: 80,
  aval_corporativo: 65,
  cesion_derechos: 60,
  garantia_prendaria: 55,
  cuentas_por_cobrar: 50,
  vehiculo: 45,
  inventario: 35,
  aval_personal: 30,
};

/** Weighted average quality of the guarantee portfolio */
export function calcGuaranteeQuality(guarantees: GuaranteeItem[]): number {
  if (guarantees.length === 0) return 0;
  const totalValue = guarantees.reduce((s, g) => s + g.valor_comercial, 0);
  if (totalValue === 0) return 0;
  return guarantees.reduce(
    (s, g) => s + QUALITY_TIERS[g.tipo] * (g.valor_comercial / totalValue),
    0,
  );
}

/** Documentation completeness percentage */
export function calcDocumentationCompleteness(guarantees: GuaranteeItem[]): number {
  if (guarantees.length === 0) return 0;
  const complete = guarantees.filter((g) => g.documentacion_completa).length;
  return complete / guarantees.length;
}

/** FX alignment score: % of guarantee value in same currency as loan */
export function calcFxAlignment(guarantees: GuaranteeItem[], moneda_credito: 'MXN' | 'USD'): number {
  if (guarantees.length === 0) return 0;
  const totalValue = guarantees.reduce((s, g) => s + g.valor_comercial, 0);
  if (totalValue === 0) return 0;
  const alignedValue = guarantees
    .filter((g) => g.moneda === moneda_credito)
    .reduce((s, g) => s + g.valor_comercial, 0);
  return alignedValue / totalValue;
}

// ============================================================
// Sub-score calculations
// ============================================================

/** Coverage ratio sub-score (40% weight) */
export function calcCoverageSubScore(coverageRatio: number, requiredRatio: number): number {
  if (coverageRatio <= 0) return 0;
  // Ratio of actual coverage to required coverage
  const fulfillment = coverageRatio / requiredRatio;
  if (fulfillment >= 1.5) return 100;
  if (fulfillment >= 1.0) return 70 + (fulfillment - 1.0) * 60; // 70-100
  if (fulfillment >= 0.75) return 40 + (fulfillment - 0.75) * 120; // 40-70
  if (fulfillment >= 0.5) return 15 + (fulfillment - 0.5) * 100;  // 15-40
  return Math.max(0, fulfillment * 30); // 0-15
}

/** Guarantee quality sub-score (30% weight) */
export function calcQualitySubScore(quality: number): number {
  // quality is 0-100 from calcGuaranteeQuality
  return Math.min(100, Math.max(0, quality));
}

/** Documentation completeness sub-score (20% weight) */
export function calcDocumentationSubScore(completeness: number): number {
  // completeness is 0-1
  return Math.min(100, Math.max(0, completeness * 100));
}

/** FX alignment sub-score (10% weight) */
export function calcFxAlignmentSubScore(alignment: number): number {
  // alignment is 0-1
  return Math.min(100, Math.max(0, alignment * 100));
}

// ============================================================
// Helpers: grade, status, flags, metrics
// ============================================================

export function scoreToGrade(score: number): ModuleGrade {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export function scoreToStatus(score: number, flags: RiskFlag[]): ModuleStatus {
  if (flags.some((f) => f.severity === 'hard_stop')) return 'fail';
  if (flags.some((f) => f.severity === 'critical')) return 'fail';
  if (score >= 60) return 'pass';
  if (score >= 40) return 'warning';
  return 'fail';
}

export function generateRiskFlags(
  guarantees: GuaranteeItem[],
  coverageRatio: number,
  requiredRatio: number,
  fxAlignment: number,
  docCompleteness: number,
  quality: number,
  moneda_credito: 'MXN' | 'USD',
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (guarantees.length === 0) {
    flags.push({
      code: 'no_guarantees',
      severity: 'critical',
      message: 'No guarantees provided for evaluation',
    });
    return flags;
  }

  if (coverageRatio < requiredRatio) {
    flags.push({
      code: 'insufficient_coverage',
      severity: coverageRatio < requiredRatio * 0.5 ? 'critical' : 'warning',
      message: `Coverage ratio ${(coverageRatio * 100).toFixed(1)}% below required ${(requiredRatio * 100).toFixed(1)}%`,
      source_metric: 'coverage_ratio',
      value: coverageRatio,
      threshold: requiredRatio,
    });
  }

  // FX currency mismatch
  const hasFxMismatch = guarantees.some((g) => g.moneda !== moneda_credito);
  if (hasFxMismatch && fxAlignment < 0.5) {
    flags.push({
      code: 'fx_currency_mismatch',
      severity: 'warning',
      message: `Only ${(fxAlignment * 100).toFixed(0)}% of guarantee value matches loan currency (${moneda_credito})`,
      source_metric: 'fx_alignment',
      value: fxAlignment,
      threshold: 0.5,
    });
  }

  if (quality < 40) {
    flags.push({
      code: 'low_quality_guarantees',
      severity: 'warning',
      message: `Weighted guarantee quality score ${quality.toFixed(0)} is below acceptable threshold`,
      source_metric: 'guarantee_quality',
      value: quality,
      threshold: 40,
    });
  }

  if (docCompleteness < 1.0) {
    flags.push({
      code: 'missing_documentation',
      severity: docCompleteness < 0.5 ? 'critical' : 'warning',
      message: `Documentation complete for only ${(docCompleteness * 100).toFixed(0)}% of guarantees`,
      source_metric: 'documentation_completeness',
      value: docCompleteness,
      threshold: 1.0,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

export function analyzeTrends(
  historicalCoverage: Array<{ period: string; coverage_ratio: number }> | undefined,
): TrendResult[] {
  if (!historicalCoverage || historicalCoverage.length < 2) return [];

  const timeSeries: TimeSeriesPoint[] = historicalCoverage.map((h) => ({
    period: h.period,
    value: h.coverage_ratio,
    benchmark: BENCHMARKS.coverage_ratio,
  }));

  const config: TrendConfig = {
    metric_name: 'coverage_ratio',
    metric_label: 'Coverage Ratio',
    unit: 'x',
    higher_is_better: true,
    warning_threshold: 1.5,
    critical_threshold: 1.0,
    benchmark_value: BENCHMARKS.coverage_ratio,
    projection_months: 6,
    y_axis_format: 'x',
  };

  return [trendUtils.analyze(timeSeries, config)];
}

// ============================================================
// Key metrics builder
// ============================================================

function buildKeyMetrics(data: {
  totalNetEligible: number;
  coverageRatio: number;
  requiredRatio: number;
  shortfall: number;
  meetsCoverage: boolean;
  quality: number;
  docCompleteness: number;
  fxAlignment: number;
  montoAprobado: number;
}): Record<string, MetricValue> {
  const m = (name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: MetricValue['impact_on_score']): MetricValue => ({
    name, label, value, unit, source: ENGINE_NAME, formula, interpretation, impact_on_score: impact,
  });

  return {
    valor_elegible_neto: m('valor_elegible_neto', 'Net Eligible Value', data.totalNetEligible, '$',
      'SUM(valor_base * (1 - haircut) * liquidez)', 'Total guarantee value after haircuts and liquidity adjustments',
      data.totalNetEligible > 0 ? 'positive' : 'negative'),
    coverage_ratio: m('coverage_ratio', 'Coverage Ratio', data.coverageRatio, 'x',
      'valor_elegible_neto / monto_aprobado', `Coverage ${data.coverageRatio.toFixed(2)}x vs required ${data.requiredRatio.toFixed(2)}x`,
      data.meetsCoverage ? 'positive' : 'negative'),
    required_coverage: m('required_coverage', 'Required Coverage', data.requiredRatio, 'x',
      'base_ratio * score_adjustment', `Minimum coverage required based on score and policy`,
      'neutral'),
    shortfall: m('shortfall', 'Guarantee Shortfall', data.shortfall, '$',
      'MAX(0, required - net_eligible)', data.shortfall > 0 ? `Shortfall of $${data.shortfall.toFixed(0)}` : 'No shortfall',
      data.shortfall > 0 ? 'negative' : 'positive'),
    guarantee_quality: m('guarantee_quality', 'Guarantee Quality', data.quality, 'pts',
      'weighted_avg(quality_tier * valor_comercial)', `Weighted quality score of guarantee portfolio`,
      data.quality >= 60 ? 'positive' : 'negative'),
    documentation_completeness: m('documentation_completeness', 'Documentation', data.docCompleteness, '%',
      'complete_docs / total_docs', `${(data.docCompleteness * 100).toFixed(0)}% of guarantees fully documented`,
      data.docCompleteness >= 1.0 ? 'positive' : 'negative'),
    fx_alignment: m('fx_alignment', 'FX Alignment', data.fxAlignment, '%',
      'aligned_value / total_value', `${(data.fxAlignment * 100).toFixed(0)}% of guarantee value in loan currency`,
      data.fxAlignment >= 0.8 ? 'positive' : 'neutral'),
  };
}

// ============================================================
// Benchmarks builder
// ============================================================

function buildBenchmarks(data: {
  coverageRatio: number;
  quality: number;
  docCompleteness: number;
}): Record<string, BenchmarkComparison> {
  const bc = (metric: string, applicant: number, benchmark: number): BenchmarkComparison => {
    const deviation = benchmark !== 0 ? ((applicant - benchmark) / benchmark) * 100 : 0;
    const status: BenchmarkComparison['status'] =
      deviation > 5 ? 'above' : deviation < -5 ? 'below' : 'at';
    return { metric, applicant_value: applicant, benchmark_value: benchmark, deviation_percent: deviation, status };
  };

  return {
    coverage_ratio: bc('coverage_ratio', data.coverageRatio, BENCHMARKS.coverage_ratio),
    guarantee_quality: bc('guarantee_quality', data.quality, BENCHMARKS.guarantee_quality),
    documentation: bc('documentation', data.docCompleteness, BENCHMARKS.documentation_pct),
  };
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[], meetsCoverage: boolean): string {
  const gateResult = meetsCoverage ? 'PASS' : 'FAIL';
  const flagSummary = flags.length > 0
    ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
    : ' No risk flags detected.';
  return `Guarantee engine score: ${score}/100 (Grade ${grade}). Gate: ${gateResult}.${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('no_guarantees')) actions.push('Provide guarantees to meet 2:1 coverage policy');
  if (codes.has('insufficient_coverage')) actions.push('Increase guarantee value or reduce loan amount to meet coverage requirement');
  if (codes.has('fx_currency_mismatch')) actions.push('Consider providing guarantees in the same currency as the loan');
  if (codes.has('low_quality_guarantees')) actions.push('Substitute low-quality guarantees (inventory, personal) with higher-quality collateral');
  if (codes.has('missing_documentation')) actions.push('Complete documentation for all pledged guarantees');

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runGuaranteeEngine(input: EngineInput): Promise<EngineOutput> {
  const guaranteeData = input.syntage_data as GuaranteeInput | undefined;

  if (!guaranteeData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_guarantee_data',
        severity: 'critical',
        message: 'No guarantee data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Guarantee engine blocked: no data provided.',
      recommended_actions: ['Provide guarantee information for collateral evaluation'],
      created_at: new Date().toISOString(),
    };
  }

  const {
    monto_aprobado_preliminar,
    moneda_credito,
    guarantees,
    consolidated_score,
    historical_coverage,
  } = guaranteeData;

  if (guarantees.length === 0) {
    const noGuaranteeFlags: RiskFlag[] = [{
      code: 'no_guarantees',
      severity: 'critical',
      message: 'No guarantees provided for evaluation',
    }];
    return {
      engine_name: ENGINE_NAME,
      module_status: 'fail',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: noGuaranteeFlags,
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Guarantee engine FAIL: no guarantees provided. Coverage requirement not met.',
      recommended_actions: ['Provide guarantees to meet 2:1 coverage policy'],
      created_at: new Date().toISOString(),
    };
  }

  // Core calculations
  const baseRatio = input.policy_config.guarantee_base_ratio;
  const requiredRatio = calcRequiredCoverageRatio(baseRatio, consolidated_score);
  const totalNetEligible = calcTotalNetEligible(guarantees, moneda_credito);
  const coverageRatio = calcCoverageRatio(totalNetEligible, monto_aprobado_preliminar);
  const shortfall = calcShortfall(totalNetEligible, monto_aprobado_preliminar, requiredRatio);
  const meetsCoverage = meetsCoverageRequirement(coverageRatio, requiredRatio);

  // Quality metrics
  const quality = calcGuaranteeQuality(guarantees);
  const docCompleteness = calcDocumentationCompleteness(guarantees);
  const fxAlignment = calcFxAlignment(guarantees, moneda_credito);

  // Sub-scores
  const subScores = {
    coverage_ratio: calcCoverageSubScore(coverageRatio, requiredRatio),
    guarantee_quality: calcQualitySubScore(quality),
    documentation_completeness: calcDocumentationSubScore(docCompleteness),
    fx_alignment: calcFxAlignmentSubScore(fxAlignment),
  };

  // Weighted raw score
  const rawScore =
    subScores.coverage_ratio * SUB_WEIGHTS.coverage_ratio +
    subScores.guarantee_quality * SUB_WEIGHTS.guarantee_quality +
    subScores.documentation_completeness * SUB_WEIGHTS.documentation_completeness +
    subScores.fx_alignment * SUB_WEIGHTS.fx_alignment;

  // Trends
  const trends = analyzeTrends(historical_coverage);
  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));

  const grade = scoreToGrade(finalScore);

  // Risk flags
  const riskFlags = generateRiskFlags(
    guarantees, coverageRatio, requiredRatio, fxAlignment, docCompleteness, quality, moneda_credito,
  );

  // Gate engine: status is primarily driven by coverage requirement
  const status: ModuleStatus = !meetsCoverage ? 'fail' : scoreToStatus(finalScore, riskFlags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics({
      totalNetEligible,
      coverageRatio,
      requiredRatio,
      shortfall,
      meetsCoverage,
      quality,
      docCompleteness,
      fxAlignment,
      montoAprobado: monto_aprobado_preliminar,
    }),
    benchmark_comparison: buildBenchmarks({
      coverageRatio,
      quality,
      docCompleteness,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags, meetsCoverage),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
