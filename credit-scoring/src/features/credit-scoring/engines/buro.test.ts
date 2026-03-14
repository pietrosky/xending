import { describe, it, expect } from 'vitest';
import type {
  ScorePyME,
  CreditoActivo,
  CreditoLiquidado,
  ConsultasBuro,
  CalificacionMensual,
  HawkResult,
} from '../api/syntageClient';
import type { EngineInput, PolicyConfig } from '../types/engine.types';
import {
  calcScorePymeSubScore,
  detectDebtRotation,
  calcActiveCreditHealth,
  calcActiveCreditSubScore,
  calcConsultationSubScore,
  calcLiquidationQuality,
  calcLiquidationSubScore,
  calcHawkSubScore,
  runBuroEngine,
} from './buro';
import type { BuroInput } from './buro';

// ============================================================
// Test helpers
// ============================================================

const POLICY_CONFIG: PolicyConfig = {
  guarantee_base_ratio: 2,
  score_weights: {},
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeScorePyME(overrides: Partial<ScorePyME> = {}): ScorePyME {
  return {
    score: 700,
    califica_rating: 'A',
    causas: [],
    fecha_consulta: '2025-01-15',
    raw: {},
    ...overrides,
  };
}

function makeCredito(overrides: Partial<CreditoActivo> = {}): CreditoActivo {
  return {
    institucion: 'Banco Test',
    tipo_credito: 'empresarial',
    moneda: 'MXN',
    monto_original: 100000,
    monto_vigente: 50000,
    plazo_meses: 12,
    atraso_dias: 0,
    historico_pagos: 'VVVVVVVVVVVV',
    raw: {},
    ...overrides,
  };
}

function makeLiquidado(overrides: Partial<CreditoLiquidado> = {}): CreditoLiquidado {
  return {
    institucion: 'Banco Test',
    tipo_credito: 'empresarial',
    monto_original: 100000,
    fecha_liquidacion: '2024-06-01',
    tipo_liquidacion: 'normal',
    raw: {},
    ...overrides,
  };
}

function makeConsultas(overrides: Partial<ConsultasBuro> = {}): ConsultasBuro {
  return {
    ultimos_3_meses: 1,
    ultimos_12_meses: 3,
    ultimos_24_meses: 5,
    mas_24_meses: 2,
    detalle: [],
    raw: {},
    ...overrides,
  };
}

function makeCalificacion(overrides: Partial<CalificacionMensual> = {}): CalificacionMensual {
  return {
    periodo: '2025-01',
    vigente: 90,
    vencido_1_29: 5,
    vencido_30_59: 3,
    vencido_60_89: 1,
    vencido_90_mas: 1,
    raw: {},
    ...overrides,
  };
}

function makeHawk(overrides: Partial<HawkResult> = {}): HawkResult {
  return {
    check_type: 'juicios_civiles',
    match_found: false,
    severity: 'info',
    details: {},
    ...overrides,
  };
}

function makeBuroInput(overrides: Partial<BuroInput> = {}): BuroInput {
  return {
    score_pyme: makeScorePyME(),
    creditos_activos: [makeCredito()],
    creditos_liquidados: [],
    consultas_buro: makeConsultas(),
    calificacion_cartera: [],
    hawk_checks: [makeHawk()],
    ...overrides,
  };
}

function makeEngineInput(buroData: BuroInput): EngineInput {
  return {
    application_id: 'app-001',
    syntage_data: buroData,
    policy_config: POLICY_CONFIG,
  };
}

// ============================================================
// Unit tests: calcScorePymeSubScore
// ============================================================

describe('calcScorePymeSubScore', () => {
  it('returns 100 for excellent score', () => {
    expect(calcScorePymeSubScore(750)).toBe(100);
  });

  it('returns 80 for good score', () => {
    expect(calcScorePymeSubScore(670)).toBe(80);
  });

  it('returns 60 for fair score', () => {
    expect(calcScorePymeSubScore(620)).toBe(60);
  });

  it('returns 40 for poor score', () => {
    expect(calcScorePymeSubScore(560)).toBe(40);
  });

  it('returns 20 for very low score', () => {
    expect(calcScorePymeSubScore(400)).toBe(20);
  });
});

// ============================================================
// Unit tests: detectDebtRotation
// ============================================================

describe('detectDebtRotation', () => {
  it('detects rotation when all thresholds met', () => {
    const creditos = [
      makeCredito({ monto_original: 100000, monto_vigente: 95000 }),
      makeCredito({ monto_original: 100000, monto_vigente: 92000 }),
      makeCredito({ monto_original: 100000, monto_vigente: 93000 }),
      makeCredito({ monto_original: 100000, monto_vigente: 91000 }),
    ];
    const consultas = makeConsultas({ ultimos_3_meses: 6 });
    const result = detectDebtRotation(creditos, consultas);
    expect(result.detected).toBe(true);
    expect(result.vigente_original_ratio).toBeGreaterThan(0.90);
  });

  it('does not detect rotation with few credits', () => {
    const creditos = [makeCredito({ monto_original: 100000, monto_vigente: 95000 })];
    const consultas = makeConsultas({ ultimos_3_meses: 6 });
    const result = detectDebtRotation(creditos, consultas);
    expect(result.detected).toBe(false);
  });

  it('does not detect rotation with low consultations', () => {
    const creditos = Array.from({ length: 4 }, () =>
      makeCredito({ monto_original: 100000, monto_vigente: 95000 }),
    );
    const consultas = makeConsultas({ ultimos_3_meses: 2 });
    const result = detectDebtRotation(creditos, consultas);
    expect(result.detected).toBe(false);
  });

  it('does not detect rotation with low vigente/original ratio', () => {
    const creditos = Array.from({ length: 4 }, () =>
      makeCredito({ monto_original: 100000, monto_vigente: 50000 }),
    );
    const consultas = makeConsultas({ ultimos_3_meses: 6 });
    const result = detectDebtRotation(creditos, consultas);
    expect(result.detected).toBe(false);
    expect(result.vigente_original_ratio).toBe(0.5);
  });
});

// ============================================================
// Unit tests: calcActiveCreditHealth
// ============================================================

describe('calcActiveCreditHealth', () => {
  it('returns zeros for empty array', () => {
    const result = calcActiveCreditHealth([]);
    expect(result.count).toBe(0);
    expect(result.total_exposure).toBe(0);
  });

  it('calculates correct metrics', () => {
    const creditos = [
      makeCredito({ institucion: 'A', monto_vigente: 50000, monto_original: 100000, atraso_dias: 10 }),
      makeCredito({ institucion: 'B', monto_vigente: 30000, monto_original: 80000, atraso_dias: 0 }),
    ];
    const result = calcActiveCreditHealth(creditos);
    expect(result.count).toBe(2);
    expect(result.total_exposure).toBe(80000);
    expect(result.total_original).toBe(180000);
    expect(result.avg_delay_days).toBe(5);
    expect(result.credits_with_delay).toBe(1);
    expect(result.institution_count).toBe(2);
  });
});

// ============================================================
// Unit tests: calcConsultationSubScore
// ============================================================

describe('calcConsultationSubScore', () => {
  it('returns 100 for low consultations', () => {
    expect(calcConsultationSubScore(makeConsultas({ ultimos_3_meses: 1, ultimos_12_meses: 3 }))).toBe(100);
  });

  it('penalizes high 3-month consultations', () => {
    const score = calcConsultationSubScore(makeConsultas({ ultimos_3_meses: 6, ultimos_12_meses: 3 }));
    expect(score).toBeLessThan(70);
  });

  it('penalizes high 12-month consultations', () => {
    const score = calcConsultationSubScore(makeConsultas({ ultimos_3_meses: 1, ultimos_12_meses: 10 }));
    expect(score).toBeLessThan(80);
  });
});

// ============================================================
// Unit tests: calcLiquidationQuality
// ============================================================

describe('calcLiquidationQuality', () => {
  it('returns zeros for empty array', () => {
    const result = calcLiquidationQuality([]);
    expect(result.total).toBe(0);
    expect(result.bad).toBe(0);
  });

  it('detects bad liquidations', () => {
    const liquidados = [
      makeLiquidado({ tipo_liquidacion: 'normal' }),
      makeLiquidado({ tipo_liquidacion: 'quita' }),
      makeLiquidado({ tipo_liquidacion: 'quebranto' }),
    ];
    const result = calcLiquidationQuality(liquidados);
    expect(result.total).toBe(3);
    expect(result.bad).toBe(2);
    expect(result.normal).toBe(1);
    expect(result.bad_pct).toBeCloseTo(2 / 3);
  });

  it('returns 0 bad for all normal liquidations', () => {
    const liquidados = [makeLiquidado(), makeLiquidado()];
    const result = calcLiquidationQuality(liquidados);
    expect(result.bad).toBe(0);
    expect(result.bad_pct).toBe(0);
  });
});

// ============================================================
// Unit tests: calcHawkSubScore
// ============================================================

describe('calcHawkSubScore', () => {
  it('returns 90 for no checks', () => {
    expect(calcHawkSubScore([])).toBe(90);
  });

  it('returns 100 for no matches', () => {
    const checks = [makeHawk({ match_found: false })];
    expect(calcHawkSubScore(checks)).toBe(100);
  });

  it('returns 10 for critical match', () => {
    const checks = [makeHawk({ match_found: true, severity: 'critical' })];
    expect(calcHawkSubScore(checks)).toBe(10);
  });

  it('returns 50 for warning match', () => {
    const checks = [makeHawk({ match_found: true, severity: 'warning' })];
    expect(calcHawkSubScore(checks)).toBe(50);
  });
});

// ============================================================
// Unit tests: calcActiveCreditSubScore
// ============================================================

describe('calcActiveCreditSubScore', () => {
  it('returns 100 for single healthy credit', () => {
    const creditos = [makeCredito({ monto_original: 100000, monto_vigente: 50000, atraso_dias: 0 })];
    expect(calcActiveCreditSubScore(creditos)).toBe(100);
  });

  it('penalizes over-leveraged (>5 credits)', () => {
    const creditos = Array.from({ length: 6 }, () => makeCredito());
    expect(calcActiveCreditSubScore(creditos)).toBeLessThan(80);
  });

  it('penalizes payment delays', () => {
    const creditos = [makeCredito({ atraso_dias: 45 })];
    expect(calcActiveCreditSubScore(creditos)).toBeLessThan(90);
  });
});

// ============================================================
// Unit tests: calcLiquidationSubScore
// ============================================================

describe('calcLiquidationSubScore', () => {
  it('returns 80 for no history', () => {
    expect(calcLiquidationSubScore([])).toBe(80);
  });

  it('returns 100 for all normal liquidations', () => {
    expect(calcLiquidationSubScore([makeLiquidado(), makeLiquidado()])).toBe(100);
  });

  it('returns low score for mostly bad liquidations', () => {
    const liquidados = [
      makeLiquidado({ tipo_liquidacion: 'quita' }),
      makeLiquidado({ tipo_liquidacion: 'quebranto' }),
      makeLiquidado({ tipo_liquidacion: 'dacion' }),
    ];
    expect(calcLiquidationSubScore(liquidados)).toBeLessThanOrEqual(15);
  });
});

// ============================================================
// Integration tests: runBuroEngine
// ============================================================

describe('runBuroEngine', () => {
  it('returns blocked when no syntage_data', async () => {
    const input: EngineInput = {
      application_id: 'app-001',
      policy_config: POLICY_CONFIG,
    };
    const result = await runBuroEngine(input);

    expect(result.engine_name).toBe('buro');
    expect(result.module_status).toBe('blocked');
    expect(result.module_score).toBe(0);
    expect(result.module_grade).toBe('F');
    expect(result.risk_flags[0]?.code).toBe('no_buro_data');
  });

  it('returns high score for healthy company', async () => {
    const buroData = makeBuroInput({
      score_pyme: makeScorePyME({ score: 750 }),
      creditos_activos: [makeCredito({ monto_original: 100000, monto_vigente: 40000, atraso_dias: 0 })],
      creditos_liquidados: [makeLiquidado({ tipo_liquidacion: 'normal' })],
      consultas_buro: makeConsultas({ ultimos_3_meses: 1, ultimos_12_meses: 2 }),
      hawk_checks: [makeHawk({ match_found: false })],
    });
    const input = makeEngineInput(buroData);
    const result = await runBuroEngine(input);

    expect(result.module_score).toBeGreaterThanOrEqual(75);
    expect(['A', 'B']).toContain(result.module_grade);
    expect(result.module_status).toBe('pass');
    expect(result.risk_flags).toHaveLength(0);
    expect(result.key_metrics.score_pyme).toBeDefined();
    expect(result.key_metrics.active_credits_count).toBeDefined();
  });

  it('flags debt rotation pattern', async () => {
    const creditos = Array.from({ length: 5 }, () =>
      makeCredito({ monto_original: 100000, monto_vigente: 95000 }),
    );
    const buroData = makeBuroInput({
      creditos_activos: creditos,
      consultas_buro: makeConsultas({ ultimos_3_meses: 6, ultimos_12_meses: 10 }),
    });
    const input = makeEngineInput(buroData);
    const result = await runBuroEngine(input);

    expect(result.risk_flags.some((f) => f.code === 'debt_rotation_detected')).toBe(true);
  });

  it('flags excessive consultations', async () => {
    const buroData = makeBuroInput({
      consultas_buro: makeConsultas({ ultimos_3_meses: 7, ultimos_12_meses: 12 }),
    });
    const input = makeEngineInput(buroData);
    const result = await runBuroEngine(input);

    expect(result.risk_flags.some((f) => f.code === 'excessive_consultations')).toBe(true);
  });

  it('flags bad liquidations', async () => {
    const buroData = makeBuroInput({
      creditos_liquidados: [
        makeLiquidado({ tipo_liquidacion: 'quita' }),
        makeLiquidado({ tipo_liquidacion: 'quebranto' }),
      ],
    });
    const input = makeEngineInput(buroData);
    const result = await runBuroEngine(input);

    expect(result.risk_flags.some((f) => f.code === 'bad_liquidations')).toBe(true);
  });

  it('flags hawk alerts', async () => {
    const buroData = makeBuroInput({
      hawk_checks: [makeHawk({ match_found: true, severity: 'critical', check_type: 'interpol' })],
    });
    const input = makeEngineInput(buroData);
    const result = await runBuroEngine(input);

    expect(result.risk_flags.some((f) => f.code === 'hawk_alert')).toBe(true);
  });

  it('includes benchmark comparisons', async () => {
    const buroData = makeBuroInput();
    const input = makeEngineInput(buroData);
    const result = await runBuroEngine(input);

    expect(result.benchmark_comparison.score_pyme).toBeDefined();
    expect(result.benchmark_comparison.active_credits_count).toBeDefined();
    expect(result.benchmark_comparison.consultations_3m).toBeDefined();
  });

  it('includes trends when calificacion_cartera provided', async () => {
    const calificaciones: CalificacionMensual[] = [
      makeCalificacion({ periodo: '2024-10', vigente: 95, vencido_90_mas: 0 }),
      makeCalificacion({ periodo: '2024-11', vigente: 93, vencido_90_mas: 1 }),
      makeCalificacion({ periodo: '2024-12', vigente: 90, vencido_90_mas: 2 }),
      makeCalificacion({ periodo: '2025-01', vigente: 88, vencido_90_mas: 3 }),
    ];
    const buroData = makeBuroInput({ calificacion_cartera: calificaciones });
    const input = makeEngineInput(buroData);
    const result = await runBuroEngine(input);

    expect(result.trends.length).toBeGreaterThan(0);
  });

  it('score is between 0 and 100', async () => {
    const buroData = makeBuroInput();
    const input = makeEngineInput(buroData);
    const result = await runBuroEngine(input);

    expect(result.module_score).toBeGreaterThanOrEqual(0);
    expect(result.module_score).toBeLessThanOrEqual(100);
    expect(result.module_max_score).toBe(100);
  });
});
