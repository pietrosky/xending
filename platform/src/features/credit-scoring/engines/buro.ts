import type {
  ScorePyME,
  CreditoActivo,
  CreditoLiquidado,
  ConsultasBuro,
  CalificacionMensual,
  HawkResult,
} from '../api/syntageClient';
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

const ENGINE_NAME = 'buro';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  score_pyme: 0.30,
  debt_rotation: 0.20,
  active_credits_health: 0.15,
  consultation_frequency: 0.15,
  liquidation_quality: 0.10,
  hawk_results: 0.10,
} as const;

/** Score PyME mapping thresholds */
const SCORE_PYME_THRESHOLDS = {
  excellent: 700,
  good: 650,
  fair: 600,
  poor: 550,
} as const;

/** Benchmarks */
const BENCHMARKS = {
  score_pyme: 680,
  active_credits_count: 3,
  consultations_3m: 2,
  consultations_12m: 5,
  vigente_original_ratio: 0.60,
  bad_liquidation_pct: 0,
} as const;

// ============================================================
// Input types
// ============================================================

export interface BuroInput {
  score_pyme: ScorePyME;
  creditos_activos: CreditoActivo[];
  creditos_liquidados: CreditoLiquidado[];
  consultas_buro: ConsultasBuro;
  calificacion_cartera: CalificacionMensual[];
  hawk_checks: HawkResult[];
}

// ============================================================
// Metric calculation helpers (exported for testability)
// ============================================================

/** Score the PyME score on a 0-100 scale */
export function calcScorePymeSubScore(score: number): number {
  if (score >= SCORE_PYME_THRESHOLDS.excellent) return 100;
  if (score >= SCORE_PYME_THRESHOLDS.good) return 80;
  if (score >= SCORE_PYME_THRESHOLDS.fair) return 60;
  if (score >= SCORE_PYME_THRESHOLDS.poor) return 40;
  return 20;
}

/** Detect debt rotation pattern per Cruce 11:
 *  4+ active credits, 5+ consultations in 3 months,
 *  monto_vigente/monto_original > 90% */
export function detectDebtRotation(
  creditos: CreditoActivo[],
  consultas: ConsultasBuro,
): { detected: boolean; active_count: number; consult_3m: number; vigente_original_ratio: number } {
  const activeCount = creditos.length;
  const consult3m = consultas.ultimos_3_meses;

  const totalOriginal = creditos.reduce((s, c) => s + c.monto_original, 0);
  const totalVigente = creditos.reduce((s, c) => s + c.monto_vigente, 0);
  const ratio = totalOriginal > 0 ? totalVigente / totalOriginal : 0;

  const detected = activeCount >= 4 && consult3m >= 5 && ratio > 0.90;

  return { detected, active_count: activeCount, consult_3m: consult3m, vigente_original_ratio: ratio };
}

/** Score debt rotation on 0-100 (100 = no rotation detected) */
export function calcDebtRotationSubScore(
  creditos: CreditoActivo[],
  consultas: ConsultasBuro,
): number {
  const { detected, active_count, consult_3m, vigente_original_ratio } = detectDebtRotation(creditos, consultas);

  if (detected) return 10;

  let score = 100;

  // Partial penalties for approaching rotation thresholds
  if (active_count >= 5) score -= 25;
  else if (active_count >= 4) score -= 15;

  if (consult_3m >= 5) score -= 25;
  else if (consult_3m >= 3) score -= 10;

  if (vigente_original_ratio > 0.85) score -= 20;
  else if (vigente_original_ratio > 0.70) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/** Analyze active credits health: count, exposure, payment delays */
export function calcActiveCreditHealth(creditos: CreditoActivo[]): {
  count: number;
  total_exposure: number;
  total_original: number;
  avg_delay_days: number;
  credits_with_delay: number;
  institution_count: number;
} {
  if (creditos.length === 0) {
    return { count: 0, total_exposure: 0, total_original: 0, avg_delay_days: 0, credits_with_delay: 0, institution_count: 0 };
  }

  const totalExposure = creditos.reduce((s, c) => s + c.monto_vigente, 0);
  const totalOriginal = creditos.reduce((s, c) => s + c.monto_original, 0);
  const totalDelay = creditos.reduce((s, c) => s + c.atraso_dias, 0);
  const creditsWithDelay = creditos.filter((c) => c.atraso_dias > 0).length;
  const institutions = new Set(creditos.map((c) => c.institucion));

  return {
    count: creditos.length,
    total_exposure: totalExposure,
    total_original: totalOriginal,
    avg_delay_days: Math.round(totalDelay / creditos.length),
    credits_with_delay: creditsWithDelay,
    institution_count: institutions.size,
  };
}

/** Score active credits health on 0-100 */
export function calcActiveCreditSubScore(creditos: CreditoActivo[]): number {
  const health = calcActiveCreditHealth(creditos);

  let score = 100;

  // Over-leveraged: > 5 simultaneous credits
  if (health.count > 5) score -= 30;
  else if (health.count > 3) score -= 10;

  // Payment delays
  if (health.avg_delay_days > 90) score -= 35;
  else if (health.avg_delay_days > 30) score -= 20;
  else if (health.avg_delay_days > 0) score -= 10;

  // Not paying principal: vigente/original > 85% on credits > 6 months
  const longCredits = creditos.filter((c) => c.plazo_meses > 6);
  if (longCredits.length > 0) {
    const longOriginal = longCredits.reduce((s, c) => s + c.monto_original, 0);
    const longVigente = longCredits.reduce((s, c) => s + c.monto_vigente, 0);
    if (longOriginal > 0 && longVigente / longOriginal > 0.85) {
      score -= 15;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/** Score consultation frequency on 0-100 */
export function calcConsultationSubScore(consultas: ConsultasBuro): number {
  let score = 100;

  // > 5 in 3 months = excessive (Req 13: > 3 financial = desperate)
  if (consultas.ultimos_3_meses > 5) score -= 40;
  else if (consultas.ultimos_3_meses > 3) score -= 25;
  else if (consultas.ultimos_3_meses > 2) score -= 10;

  // > 8 in 12 months = excessive credit shopping (Req 14)
  if (consultas.ultimos_12_meses > 8) score -= 30;
  else if (consultas.ultimos_12_meses > 5) score -= 15;

  return Math.max(0, Math.min(100, score));
}

/** Analyze liquidated credits quality */
export function calcLiquidationQuality(liquidados: CreditoLiquidado[]): {
  total: number;
  normal: number;
  bad: number;
  bad_types: string[];
  bad_pct: number;
} {
  if (liquidados.length === 0) {
    return { total: 0, normal: 0, bad: 0, bad_types: [], bad_pct: 0 };
  }

  const badTypes = ['quita', 'dacion', 'quebranto'];
  const badCredits = liquidados.filter((c) => badTypes.includes(c.tipo_liquidacion));
  const normalCount = liquidados.length - badCredits.length;

  return {
    total: liquidados.length,
    normal: normalCount,
    bad: badCredits.length,
    bad_types: badCredits.map((c) => c.tipo_liquidacion),
    bad_pct: badCredits.length / liquidados.length,
  };
}

/** Score liquidation quality on 0-100 */
export function calcLiquidationSubScore(liquidados: CreditoLiquidado[]): number {
  const quality = calcLiquidationQuality(liquidados);

  if (quality.total === 0) return 80; // No history, neutral

  if (quality.bad === 0) return 100;
  if (quality.bad_pct <= 0.10) return 70;
  if (quality.bad_pct <= 0.25) return 45;
  return 15;
}

/** Score Hawk checks on 0-100 */
export function calcHawkSubScore(hawkChecks: HawkResult[]): number {
  if (hawkChecks.length === 0) return 90; // No checks available, slightly cautious

  const criticalMatches = hawkChecks.filter((h) => h.match_found && h.severity === 'critical');
  const warningMatches = hawkChecks.filter((h) => h.match_found && h.severity === 'warning');

  if (criticalMatches.length > 0) return 10;
  if (warningMatches.length > 0) return 50;
  return 100;
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

function generateRiskFlags(
  scorePyme: ScorePyME,
  creditos: CreditoActivo[],
  consultas: ConsultasBuro,
  liquidados: CreditoLiquidado[],
  hawkChecks: HawkResult[],
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Low PyME score (Req 4: < 550 = high_risk)
  if (scorePyme.score < SCORE_PYME_THRESHOLDS.poor) {
    flags.push({
      code: 'low_pyme_score',
      severity: scorePyme.score < 500 ? 'critical' : 'warning',
      message: `Score PyME ${scorePyme.score} below ${SCORE_PYME_THRESHOLDS.poor} threshold`,
      source_metric: 'score_pyme',
      value: scorePyme.score,
      threshold: SCORE_PYME_THRESHOLDS.poor,
    });
  }

  // Debt rotation (Cruce 11)
  const rotation = detectDebtRotation(creditos, consultas);
  if (rotation.detected) {
    flags.push({
      code: 'debt_rotation_detected',
      severity: 'critical',
      message: `Debt rotation pattern: ${rotation.active_count} active credits, ${rotation.consult_3m} consultations in 3m, vigente/original ${(rotation.vigente_original_ratio * 100).toFixed(0)}%`,
      source_metric: 'debt_rotation',
      value: rotation.vigente_original_ratio,
      threshold: 0.90,
    });
  }

  // Excessive consultations (Req 13: > 3 financial in 3m)
  if (consultas.ultimos_3_meses > 5) {
    flags.push({
      code: 'excessive_consultations',
      severity: 'critical',
      message: `${consultas.ultimos_3_meses} bureau consultations in last 3 months`,
      source_metric: 'consultations_3m',
      value: consultas.ultimos_3_meses,
      threshold: 5,
    });
  } else if (consultas.ultimos_3_meses > 3) {
    flags.push({
      code: 'excessive_consultations',
      severity: 'warning',
      message: `${consultas.ultimos_3_meses} bureau consultations in last 3 months`,
      source_metric: 'consultations_3m',
      value: consultas.ultimos_3_meses,
      threshold: 3,
    });
  }

  // Bad liquidations (Req 16: quita/quebranto in last 36 months)
  const liqQuality = calcLiquidationQuality(liquidados);
  if (liqQuality.bad > 0) {
    flags.push({
      code: 'bad_liquidations',
      severity: liqQuality.bad_pct > 0.25 ? 'critical' : 'warning',
      message: `${liqQuality.bad} credit(s) liquidated via ${liqQuality.bad_types.join(', ')}`,
      source_metric: 'liquidation_quality',
      value: liqQuality.bad_pct,
      threshold: 0,
    });
  }

  // Hawk alerts (Req 19)
  const hawkMatches = hawkChecks.filter((h) => h.match_found);
  if (hawkMatches.length > 0) {
    const maxSeverity = hawkMatches.some((h) => h.severity === 'critical') ? 'critical' : 'warning';
    flags.push({
      code: 'hawk_alert',
      severity: maxSeverity,
      message: `Hawk check matches: ${hawkMatches.map((h) => h.check_type).join(', ')}`,
      source_metric: 'hawk_checks',
      value: hawkMatches.length,
      threshold: 0,
    });
  }

  // Over-leveraged (Req 22: > 5 simultaneous credits)
  if (creditos.length > 5) {
    flags.push({
      code: 'over_leveraged',
      severity: 'warning',
      message: `${creditos.length} simultaneous active credits`,
      source_metric: 'active_credits_count',
      value: creditos.length,
      threshold: 5,
    });
  }

  // Not paying principal (Req 23)
  const longCredits = creditos.filter((c) => c.plazo_meses > 6);
  if (longCredits.length > 0) {
    const longOriginal = longCredits.reduce((s, c) => s + c.monto_original, 0);
    const longVigente = longCredits.reduce((s, c) => s + c.monto_vigente, 0);
    const ratio = longOriginal > 0 ? longVigente / longOriginal : 0;
    if (ratio > 0.85) {
      flags.push({
        code: 'not_paying_principal',
        severity: ratio > 0.95 ? 'critical' : 'warning',
        message: `Vigente/original ratio ${(ratio * 100).toFixed(0)}% on credits > 6 months`,
        source_metric: 'vigente_original_ratio',
        value: ratio,
        threshold: 0.85,
      });
    }
  }

  return flags;
}

// ============================================================
// Trend analysis helpers
// ============================================================

/** Build time series from calificacion cartera: % vigente over time */
function buildCarteraVigenteSeries(calificaciones: CalificacionMensual[]): TimeSeriesPoint[] {
  const sorted = [...calificaciones].sort((a, b) => a.periodo.localeCompare(b.periodo));
  return sorted.map((c) => {
    const total = c.vigente + c.vencido_1_29 + c.vencido_30_59 + c.vencido_60_89 + c.vencido_90_mas;
    return {
      period: c.periodo,
      value: total > 0 ? c.vigente / total : 0,
    };
  });
}

/** Build time series from calificacion cartera: % vencido 90+ over time */
function buildCarteraVencido90Series(calificaciones: CalificacionMensual[]): TimeSeriesPoint[] {
  const sorted = [...calificaciones].sort((a, b) => a.periodo.localeCompare(b.periodo));
  return sorted.map((c) => {
    const total = c.vigente + c.vencido_1_29 + c.vencido_30_59 + c.vencido_60_89 + c.vencido_90_mas;
    return {
      period: c.periodo,
      value: total > 0 ? c.vencido_90_mas / total : 0,
    };
  });
}

/** Run trend analysis for buro metrics */
function analyzeTrends(calificaciones: CalificacionMensual[]): TrendResult[] {
  const trends: TrendResult[] = [];

  const vigenteSeries = buildCarteraVigenteSeries(calificaciones);
  if (vigenteSeries.length >= 3) {
    const config: TrendConfig = {
      metric_name: 'cartera_vigente_pct',
      metric_label: 'Portfolio Current %',
      unit: '%',
      higher_is_better: true,
      warning_threshold: 0.80,
      critical_threshold: 0.60,
      projection_months: 3,
      y_axis_format: '%',
    };
    trends.push(trendUtils.analyze(vigenteSeries, config));
  }

  const vencido90Series = buildCarteraVencido90Series(calificaciones);
  if (vencido90Series.length >= 3) {
    const config: TrendConfig = {
      metric_name: 'cartera_vencido_90_pct',
      metric_label: 'Portfolio 90+ Days Past Due %',
      unit: '%',
      higher_is_better: false,
      warning_threshold: 0.10,
      critical_threshold: 0.20,
      projection_months: 3,
      y_axis_format: '%',
    };
    trends.push(trendUtils.analyze(vencido90Series, config));
  }

  return trends;
}

// ============================================================
// Benchmark comparison builder
// ============================================================

function buildBenchmarks(metrics: {
  scorePyme: number;
  activeCreditsCount: number;
  consultations3m: number;
  consultations12m: number;
  vigenteOriginalRatio: number;
  badLiquidationPct: number;
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
    score_pyme: compare('score_pyme', metrics.scorePyme, BENCHMARKS.score_pyme, false),
    active_credits_count: compare('active_credits_count', metrics.activeCreditsCount, BENCHMARKS.active_credits_count, true),
    consultations_3m: compare('consultations_3m', metrics.consultations3m, BENCHMARKS.consultations_3m, true),
    consultations_12m: compare('consultations_12m', metrics.consultations12m, BENCHMARKS.consultations_12m, true),
    vigente_original_ratio: compare('vigente_original_ratio', metrics.vigenteOriginalRatio, BENCHMARKS.vigente_original_ratio, true),
    bad_liquidation_pct: compare('bad_liquidation_pct', metrics.badLiquidationPct, BENCHMARKS.bad_liquidation_pct, true),
  };
}

// ============================================================
// Key metrics builder
// ============================================================

function buildKeyMetrics(data: {
  scorePyme: ScorePyME;
  creditHealth: ReturnType<typeof calcActiveCreditHealth>;
  rotation: ReturnType<typeof detectDebtRotation>;
  consultas: ConsultasBuro;
  liqQuality: ReturnType<typeof calcLiquidationQuality>;
  hawkMatches: number;
}): Record<string, MetricValue> {
  return {
    score_pyme: {
      name: 'score_pyme',
      label: 'Score PyME',
      value: data.scorePyme.score,
      unit: 'points',
      source: 'Syntage Buro',
      interpretation: data.scorePyme.score >= 700 ? 'Excellent credit score' :
        data.scorePyme.score >= 650 ? 'Good credit score' :
        data.scorePyme.score >= 600 ? 'Fair credit score' : 'Poor credit score',
      impact_on_score: data.scorePyme.score >= 650 ? 'positive' : 'negative',
    },
    active_credits_count: {
      name: 'active_credits_count',
      label: 'Active Credits',
      value: data.creditHealth.count,
      unit: 'count',
      source: 'Syntage Buro',
      interpretation: data.creditHealth.count <= 3 ? 'Manageable credit load' : 'High number of active credits',
      impact_on_score: data.creditHealth.count <= 5 ? 'neutral' : 'negative',
    },
    total_exposure: {
      name: 'total_exposure',
      label: 'Total Credit Exposure',
      value: data.creditHealth.total_exposure,
      unit: 'MXN',
      source: 'Syntage Buro',
      interpretation: 'Total outstanding balance across all active credits',
      impact_on_score: 'neutral',
    },
    vigente_original_ratio: {
      name: 'vigente_original_ratio',
      label: 'Outstanding/Original Ratio',
      value: Math.round(data.rotation.vigente_original_ratio * 10000) / 100,
      unit: '%',
      source: 'Syntage Buro',
      formula: 'total_vigente / total_original',
      interpretation: data.rotation.vigente_original_ratio > 0.85 ? 'Not paying down principal' : 'Paying down debt',
      impact_on_score: data.rotation.vigente_original_ratio > 0.85 ? 'negative' : 'positive',
    },
    consultations_3m: {
      name: 'consultations_3m',
      label: 'Bureau Consultations (3 months)',
      value: data.consultas.ultimos_3_meses,
      unit: 'count',
      source: 'Syntage Buro',
      interpretation: data.consultas.ultimos_3_meses > 5 ? 'Excessive credit seeking' :
        data.consultas.ultimos_3_meses > 3 ? 'Elevated credit seeking' : 'Normal consultation level',
      impact_on_score: data.consultas.ultimos_3_meses > 3 ? 'negative' : 'neutral',
    },
    consultations_12m: {
      name: 'consultations_12m',
      label: 'Bureau Consultations (12 months)',
      value: data.consultas.ultimos_12_meses,
      unit: 'count',
      source: 'Syntage Buro',
      interpretation: data.consultas.ultimos_12_meses > 8 ? 'Excessive credit shopping' : 'Normal consultation level',
      impact_on_score: data.consultas.ultimos_12_meses > 8 ? 'negative' : 'neutral',
    },
    bad_liquidation_pct: {
      name: 'bad_liquidation_pct',
      label: 'Bad Liquidation Rate',
      value: Math.round(data.liqQuality.bad_pct * 10000) / 100,
      unit: '%',
      source: 'Syntage Buro',
      formula: 'bad_liquidations / total_liquidations',
      interpretation: data.liqQuality.bad > 0 ? 'Prior default history detected' : 'Clean liquidation history',
      impact_on_score: data.liqQuality.bad > 0 ? 'negative' : 'positive',
    },
    hawk_matches: {
      name: 'hawk_matches',
      label: 'Hawk Alert Matches',
      value: data.hawkMatches,
      unit: 'count',
      source: 'Syntage Hawk',
      interpretation: data.hawkMatches > 0 ? 'Compliance alerts detected' : 'No compliance alerts',
      impact_on_score: data.hawkMatches > 0 ? 'negative' : 'positive',
    },
  };
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const parts: string[] = [
    `Buro engine score: ${score}/100 (Grade ${grade}).`,
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
      case 'low_pyme_score':
        actions.push('Request additional guarantees due to low PyME score');
        break;
      case 'debt_rotation_detected':
        actions.push('Reject or significantly reduce amount - debt rotation pattern detected');
        break;
      case 'excessive_consultations':
        actions.push('Investigate credit seeking behavior - multiple bureau consultations detected');
        break;
      case 'bad_liquidations':
        actions.push('Review prior default history - credits liquidated via quita/dacion/quebranto');
        break;
      case 'hawk_alert':
        actions.push('Escalate to compliance team - Hawk check matches found');
        break;
      case 'over_leveraged':
        actions.push('Assess total debt capacity - high number of simultaneous credits');
        break;
      case 'not_paying_principal':
        actions.push('Review repayment capacity - borrower not reducing principal balances');
        break;
    }
  }

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

/**
 * Run the Buro Engine.
 *
 * Analyzes credit bureau data: Score PyME, active credits, debt rotation,
 * consultation frequency, liquidation quality, Hawk checks, and cartera trends.
 *
 * Weight in consolidated score: 10% (0.10)
 */
export async function runBuroEngine(input: EngineInput): Promise<EngineOutput> {
  const buroData = input.syntage_data as BuroInput | undefined;

  if (!buroData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_buro_data',
        severity: 'critical',
        message: 'No Buro/Syntage data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Buro engine blocked: no Syntage buro data provided.',
      recommended_actions: ['Ensure Syntage API buro data is available before running Buro engine'],
      created_at: new Date().toISOString(),
    };
  }

  const {
    score_pyme,
    creditos_activos,
    creditos_liquidados,
    consultas_buro,
    calificacion_cartera,
    hawk_checks,
  } = buroData;

  // Calculate sub-scores
  const subScores = {
    score_pyme: calcScorePymeSubScore(score_pyme.score),
    debt_rotation: calcDebtRotationSubScore(creditos_activos, consultas_buro),
    active_credits_health: calcActiveCreditSubScore(creditos_activos),
    consultation_frequency: calcConsultationSubScore(consultas_buro),
    liquidation_quality: calcLiquidationSubScore(creditos_liquidados),
    hawk_results: calcHawkSubScore(hawk_checks),
  };

  // Weighted score
  const rawScore =
    subScores.score_pyme * SUB_WEIGHTS.score_pyme +
    subScores.debt_rotation * SUB_WEIGHTS.debt_rotation +
    subScores.active_credits_health * SUB_WEIGHTS.active_credits_health +
    subScores.consultation_frequency * SUB_WEIGHTS.consultation_frequency +
    subScores.liquidation_quality * SUB_WEIGHTS.liquidation_quality +
    subScores.hawk_results * SUB_WEIGHTS.hawk_results;

  // Apply trend factor
  const trends = analyzeTrends(calificacion_cartera);
  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));

  const grade = scoreToGrade(finalScore);

  // Risk flags
  const riskFlags = generateRiskFlags(
    score_pyme,
    creditos_activos,
    consultas_buro,
    creditos_liquidados,
    hawk_checks,
  );

  const status = scoreToStatus(finalScore, riskFlags);

  // Metrics for benchmarks and key metrics
  const creditHealth = calcActiveCreditHealth(creditos_activos);
  const rotation = detectDebtRotation(creditos_activos, consultas_buro);
  const liqQuality = calcLiquidationQuality(creditos_liquidados);
  const hawkMatches = hawk_checks.filter((h) => h.match_found).length;

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics({
      scorePyme: score_pyme,
      creditHealth,
      rotation,
      consultas: consultas_buro,
      liqQuality,
      hawkMatches,
    }),
    benchmark_comparison: buildBenchmarks({
      scorePyme: score_pyme.score,
      activeCreditsCount: creditos_activos.length,
      consultations3m: consultas_buro.ultimos_3_meses,
      consultations12m: consultas_buro.ultimos_12_meses,
      vigenteOriginalRatio: rotation.vigente_original_ratio,
      badLiquidationPct: liqQuality.bad_pct,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
