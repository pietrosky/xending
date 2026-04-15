import { describe, it, expect } from 'vitest';
import {
  calcEffectiveHaircut,
  calcNetEligibleValue,
  calcTotalNetEligible,
  calcRequiredCoverageRatio,
  calcCoverageRatio,
  calcShortfall,
  meetsCoverageRequirement,
  calcGuaranteeQuality,
  calcDocumentationCompleteness,
  calcFxAlignment,
  calcCoverageSubScore,
  calcQualitySubScore,
  calcDocumentationSubScore,
  calcFxAlignmentSubScore,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runGuaranteeEngine,
} from './guarantee';
import type { GuaranteeItem } from './guarantee';
import type { EngineInput } from '../types/engine.types';

// ============================================================
// Test fixtures
// ============================================================

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { guarantee: 0 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeGuarantee(overrides: Partial<GuaranteeItem> = {}): GuaranteeItem {
  return {
    tipo: 'inmueble',
    valor_comercial: 5_000_000,
    valor_forzoso: 4_000_000,
    liquidez: 0.9,
    documentacion_completa: true,
    moneda: 'MXN',
    jurisdiccion: 'CDMX',
    ...overrides,
  };
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('calcEffectiveHaircut', () => {
  it('should return base haircut when currencies match', () => {
    expect(calcEffectiveHaircut('inmueble', 'MXN', 'MXN')).toBe(0.375);
  });

  it('should add FX haircut when currencies differ', () => {
    // inmueble 0.375 + FX 0.15 = 0.525
    expect(calcEffectiveHaircut('inmueble', 'MXN', 'USD')).toBe(0.525);
  });

  it('should use special cash MXN haircut for USD loans', () => {
    expect(calcEffectiveHaircut('cash_collateral', 'MXN', 'USD')).toBe(0.15);
  });

  it('should use base cash haircut when currencies match', () => {
    expect(calcEffectiveHaircut('cash_collateral', 'USD', 'USD')).toBe(0.05);
  });

  it('should cap haircut at 1.0', () => {
    // aval_personal 0.70 + FX 0.15 = 0.85 (under 1.0)
    expect(calcEffectiveHaircut('aval_personal', 'MXN', 'USD')).toBe(0.85);
  });
});

describe('calcNetEligibleValue', () => {
  it('should apply haircut and liquidity to min of comercial/forzoso', () => {
    const g = makeGuarantee({ valor_comercial: 5_000_000, valor_forzoso: 4_000_000, liquidez: 0.9 });
    // base = min(5M, 4M) = 4M, haircut inmueble MXN/MXN = 0.375
    // 4M * (1 - 0.375) * 0.9 = 4M * 0.625 * 0.9 = 2,250,000
    expect(calcNetEligibleValue(g, 'MXN')).toBe(2_250_000);
  });

  it('should return 0 for zero value guarantee', () => {
    const g = makeGuarantee({ valor_comercial: 0, valor_forzoso: 0 });
    expect(calcNetEligibleValue(g, 'MXN')).toBe(0);
  });
});

describe('calcTotalNetEligible', () => {
  it('should sum net eligible values across guarantees', () => {
    const guarantees = [
      makeGuarantee({ valor_comercial: 4_000_000, valor_forzoso: 4_000_000, liquidez: 1.0 }),
      makeGuarantee({ tipo: 'cash_collateral', valor_comercial: 1_000_000, valor_forzoso: 1_000_000, liquidez: 1.0 }),
    ];
    const total = calcTotalNetEligible(guarantees, 'MXN');
    expect(total).toBeGreaterThan(0);
  });

  it('should return 0 for empty array', () => {
    expect(calcTotalNetEligible([], 'MXN')).toBe(0);
  });
});

describe('calcRequiredCoverageRatio', () => {
  it('should return base ratio for high score (>=75)', () => {
    expect(calcRequiredCoverageRatio(2.0, 80)).toBe(2.0);
  });

  it('should return 2.25x for mid score (60-74)', () => {
    expect(calcRequiredCoverageRatio(2.0, 65)).toBe(2.25);
  });

  it('should return 2.5x for low score (<60)', () => {
    expect(calcRequiredCoverageRatio(2.0, 50)).toBe(2.5);
  });

  it('should return base ratio when score is undefined', () => {
    expect(calcRequiredCoverageRatio(2.0, undefined)).toBe(2.0);
  });
});

describe('calcCoverageRatio', () => {
  it('should calculate ratio correctly', () => {
    expect(calcCoverageRatio(4_000_000, 2_000_000)).toBe(2.0);
  });

  it('should return 0 for zero approved amount', () => {
    expect(calcCoverageRatio(1_000_000, 0)).toBe(0);
  });
});

describe('calcShortfall', () => {
  it('should return 0 when coverage is sufficient', () => {
    // required = 2M * 2.0 = 4M, eligible = 5M → no shortfall
    expect(calcShortfall(5_000_000, 2_000_000, 2.0)).toBe(0);
  });

  it('should return positive shortfall when insufficient', () => {
    // required = 2M * 2.0 = 4M, eligible = 3M → shortfall 1M
    expect(calcShortfall(3_000_000, 2_000_000, 2.0)).toBe(1_000_000);
  });
});

describe('meetsCoverageRequirement', () => {
  it('should return true when ratio meets requirement', () => {
    expect(meetsCoverageRequirement(2.5, 2.0)).toBe(true);
  });

  it('should return false when ratio is below requirement', () => {
    expect(meetsCoverageRequirement(1.5, 2.0)).toBe(false);
  });

  it('should return true when exactly at requirement', () => {
    expect(meetsCoverageRequirement(2.0, 2.0)).toBe(true);
  });
});

// ============================================================
// Quality and alignment tests
// ============================================================

describe('calcGuaranteeQuality', () => {
  it('should return weighted quality score', () => {
    const guarantees = [makeGuarantee({ tipo: 'cash_collateral', valor_comercial: 1_000_000 })];
    expect(calcGuaranteeQuality(guarantees)).toBe(100); // cash_collateral = 100
  });

  it('should return 0 for empty array', () => {
    expect(calcGuaranteeQuality([])).toBe(0);
  });

  it('should weight by valor_comercial', () => {
    const guarantees = [
      makeGuarantee({ tipo: 'cash_collateral', valor_comercial: 3_000_000 }), // quality 100
      makeGuarantee({ tipo: 'inventario', valor_comercial: 1_000_000 }),       // quality 35
    ];
    // (100 * 3/4) + (35 * 1/4) = 75 + 8.75 = 83.75
    expect(calcGuaranteeQuality(guarantees)).toBeCloseTo(83.75, 2);
  });
});

describe('calcDocumentationCompleteness', () => {
  it('should return 1.0 when all docs complete', () => {
    const guarantees = [makeGuarantee(), makeGuarantee()];
    expect(calcDocumentationCompleteness(guarantees)).toBe(1.0);
  });

  it('should return 0.5 when half complete', () => {
    const guarantees = [
      makeGuarantee({ documentacion_completa: true }),
      makeGuarantee({ documentacion_completa: false }),
    ];
    expect(calcDocumentationCompleteness(guarantees)).toBe(0.5);
  });

  it('should return 0 for empty array', () => {
    expect(calcDocumentationCompleteness([])).toBe(0);
  });
});

describe('calcFxAlignment', () => {
  it('should return 1.0 when all guarantees match loan currency', () => {
    const guarantees = [makeGuarantee({ moneda: 'MXN' })];
    expect(calcFxAlignment(guarantees, 'MXN')).toBe(1.0);
  });

  it('should return 0 when no guarantees match', () => {
    const guarantees = [makeGuarantee({ moneda: 'MXN' })];
    expect(calcFxAlignment(guarantees, 'USD')).toBe(0);
  });

  it('should return 0 for empty array', () => {
    expect(calcFxAlignment([], 'MXN')).toBe(0);
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcCoverageSubScore', () => {
  it('should return 100 for very high coverage', () => {
    expect(calcCoverageSubScore(3.0, 2.0)).toBe(100); // fulfillment 1.5
  });

  it('should return score between 70-100 for meeting requirement', () => {
    const score = calcCoverageSubScore(2.0, 2.0); // fulfillment 1.0
    expect(score).toBe(70);
  });

  it('should return 0 for zero coverage', () => {
    expect(calcCoverageSubScore(0, 2.0)).toBe(0);
  });
});

describe('calcQualitySubScore', () => {
  it('should pass through quality value clamped 0-100', () => {
    expect(calcQualitySubScore(80)).toBe(80);
    expect(calcQualitySubScore(120)).toBe(100);
    expect(calcQualitySubScore(-5)).toBe(0);
  });
});

describe('calcDocumentationSubScore', () => {
  it('should convert 0-1 to 0-100', () => {
    expect(calcDocumentationSubScore(1.0)).toBe(100);
    expect(calcDocumentationSubScore(0.5)).toBe(50);
  });
});

describe('calcFxAlignmentSubScore', () => {
  it('should convert 0-1 to 0-100', () => {
    expect(calcFxAlignmentSubScore(1.0)).toBe(100);
    expect(calcFxAlignmentSubScore(0.0)).toBe(0);
  });
});

// ============================================================
// Helpers tests
// ============================================================

describe('scoreToGrade', () => {
  it('should map scores to grades', () => {
    expect(scoreToGrade(85)).toBe('A');
    expect(scoreToGrade(70)).toBe('B');
    expect(scoreToGrade(55)).toBe('C');
    expect(scoreToGrade(40)).toBe('D');
    expect(scoreToGrade(20)).toBe('F');
  });
});

describe('scoreToStatus', () => {
  it('should return fail for hard_stop flags', () => {
    expect(scoreToStatus(80, [{ code: 'x', severity: 'hard_stop', message: '' }])).toBe('fail');
  });

  it('should return pass for high score without critical flags', () => {
    expect(scoreToStatus(75, [])).toBe('pass');
  });

  it('should return warning for mid score', () => {
    expect(scoreToStatus(45, [])).toBe('warning');
  });
});

describe('generateRiskFlags', () => {
  it('should flag no_guarantees when empty', () => {
    const flags = generateRiskFlags([], 0, 2.0, 0, 0, 0, 'MXN');
    expect(flags.some((f) => f.code === 'no_guarantees')).toBe(true);
  });

  it('should flag insufficient_coverage', () => {
    const g = [makeGuarantee()];
    const flags = generateRiskFlags(g, 1.5, 2.0, 1.0, 1.0, 80, 'MXN');
    expect(flags.some((f) => f.code === 'insufficient_coverage')).toBe(true);
  });

  it('should flag fx_currency_mismatch when alignment low', () => {
    const g = [makeGuarantee({ moneda: 'MXN' })];
    const flags = generateRiskFlags(g, 2.5, 2.0, 0.3, 1.0, 80, 'USD');
    expect(flags.some((f) => f.code === 'fx_currency_mismatch')).toBe(true);
  });

  it('should flag missing_documentation', () => {
    const g = [makeGuarantee({ documentacion_completa: false })];
    const flags = generateRiskFlags(g, 2.5, 2.0, 1.0, 0.0, 80, 'MXN');
    expect(flags.some((f) => f.code === 'missing_documentation')).toBe(true);
  });

  it('should return no flags for healthy guarantees', () => {
    const g = [makeGuarantee()];
    const flags = generateRiskFlags(g, 2.5, 2.0, 1.0, 1.0, 80, 'MXN');
    expect(flags.length).toBe(0);
  });
});

// ============================================================
// Trend analysis tests
// ============================================================

describe('analyzeTrends', () => {
  it('should return empty for insufficient data', () => {
    expect(analyzeTrends(undefined)).toHaveLength(0);
    expect(analyzeTrends([])).toHaveLength(0);
    expect(analyzeTrends([{ period: '2024-01', coverage_ratio: 2.0 }])).toHaveLength(0);
  });

  it('should return trends for multiple periods', () => {
    const history = [
      { period: '2024-01', coverage_ratio: 1.8 },
      { period: '2024-06', coverage_ratio: 2.0 },
      { period: '2024-12', coverage_ratio: 2.2 },
    ];
    const trends = analyzeTrends(history);
    expect(trends.length).toBe(1);
    expect(trends[0]!.metric_name).toBe('coverage_ratio');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runGuaranteeEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runGuaranteeEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('guarantee');
  });

  it('should return fail when no guarantees provided', async () => {
    const result = await runGuaranteeEngine({
      ...baseInput,
      syntage_data: {
        monto_solicitado: 2_000_000,
        monto_aprobado_preliminar: 2_000_000,
        moneda_credito: 'MXN',
        guarantees: [],
      },
    });
    expect(result.module_status).toBe('fail');
    expect(result.risk_flags.some((f) => f.code === 'no_guarantees')).toBe(true);
  });

  it('should pass with sufficient high-quality guarantees', async () => {
    const result = await runGuaranteeEngine({
      ...baseInput,
      syntage_data: {
        monto_solicitado: 1_000_000,
        monto_aprobado_preliminar: 1_000_000,
        moneda_credito: 'MXN',
        guarantees: [
          makeGuarantee({
            tipo: 'cash_collateral',
            valor_comercial: 3_000_000,
            valor_forzoso: 3_000_000,
            liquidez: 1.0,
            moneda: 'MXN',
          }),
        ],
        consolidated_score: 80,
      },
    });
    expect(result.module_status).toBe('pass');
    expect(result.module_score).toBeGreaterThan(60);
    expect(result.key_metrics['coverage_ratio']).toBeDefined();
  });

  it('should fail when coverage is insufficient', async () => {
    const result = await runGuaranteeEngine({
      ...baseInput,
      syntage_data: {
        monto_solicitado: 5_000_000,
        monto_aprobado_preliminar: 5_000_000,
        moneda_credito: 'MXN',
        guarantees: [
          makeGuarantee({
            tipo: 'inventario',
            valor_comercial: 2_000_000,
            valor_forzoso: 1_500_000,
            liquidez: 0.5,
          }),
        ],
        consolidated_score: 80,
      },
    });
    expect(result.module_status).toBe('fail');
    expect(result.risk_flags.some((f) => f.code === 'insufficient_coverage')).toBe(true);
  });

  it('should increase required coverage for low consolidated score', async () => {
    const highScoreResult = await runGuaranteeEngine({
      ...baseInput,
      syntage_data: {
        monto_solicitado: 1_000_000,
        monto_aprobado_preliminar: 1_000_000,
        moneda_credito: 'MXN',
        guarantees: [makeGuarantee({
          tipo: 'cash_collateral',
          valor_comercial: 2_200_000,
          valor_forzoso: 2_200_000,
          liquidez: 1.0,
        })],
        consolidated_score: 80,
      },
    });

    const lowScoreResult = await runGuaranteeEngine({
      ...baseInput,
      syntage_data: {
        monto_solicitado: 1_000_000,
        monto_aprobado_preliminar: 1_000_000,
        moneda_credito: 'MXN',
        guarantees: [makeGuarantee({
          tipo: 'cash_collateral',
          valor_comercial: 2_200_000,
          valor_forzoso: 2_200_000,
          liquidez: 1.0,
        })],
        consolidated_score: 50,
      },
    });

    // With low score, required coverage is 2.5x so same guarantee may not be enough
    const highRequired = highScoreResult.key_metrics['required_coverage']?.value ?? 0;
    const lowRequired = lowScoreResult.key_metrics['required_coverage']?.value ?? 0;
    expect(lowRequired).toBeGreaterThan(highRequired);
  });
});
