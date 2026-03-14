import { describe, it, expect } from 'vitest';
import {
  calcRevenueVariation,
  calcStdDev,
  calcCoefficientOfVariation,
  calcMargin,
  calcCancellationRatio,
  calcCreditNoteRatio,
  detectRevenueDropMonths,
  detectNegativeMarginMonths,
  calcRollingRevenue,
  isRevenueDecliningQuarters,
  classifyPattern,
  calcRevenueVariationSubScore,
  calcCVSubScore,
  calcSeasonalitySubScore,
  calcPatternSubScore,
  calcTrendQualitySubScore,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runStabilityEngine,
} from './stability';
import type { StabilityPeriod } from './stability';
import type { EngineInput } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';

// ============================================================
// Test fixtures
// ============================================================

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { stability: 0.09 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makePeriod(overrides: Partial<StabilityPeriod> = {}): StabilityPeriod {
  return {
    period: '2024-01',
    revenue: 1_000_000,
    expenses: 800_000,
    collections: 950_000,
    payments: 780_000,
    cancellations: 30_000,
    credit_notes: 15_000,
    active_clients: 25,
    ...overrides,
  };
}

function makeStablePeriods(count: number): StabilityPeriod[] {
  const periods: StabilityPeriod[] = [];
  for (let i = 0; i < count; i++) {
    const year = 2023 + Math.floor(i / 12);
    const m = ((i % 12) + 1).toString().padStart(2, '0');
    periods.push(makePeriod({
      period: `${year}-${m}`,
      revenue: 1_000_000 + (i * 5000),
      expenses: 800_000 + (i * 3000),
    }));
  }
  return periods;
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('calcRevenueVariation', () => {
  it('should calculate month-over-month variation', () => {
    expect(calcRevenueVariation(1_100_000, 1_000_000)).toBeCloseTo(0.10, 2);
  });

  it('should return negative for declining revenue', () => {
    expect(calcRevenueVariation(800_000, 1_000_000)).toBeCloseTo(-0.20, 2);
  });

  it('should return 0 for zero previous', () => {
    expect(calcRevenueVariation(100_000, 0)).toBe(0);
  });
});

describe('calcStdDev', () => {
  it('should calculate standard deviation', () => {
    const values = [100, 200, 300, 400, 500];
    expect(calcStdDev(values)).toBeCloseTo(158.11, 1);
  });

  it('should return 0 for single value', () => {
    expect(calcStdDev([100])).toBe(0);
  });

  it('should return 0 for identical values', () => {
    expect(calcStdDev([100, 100, 100])).toBe(0);
  });
});

describe('calcCoefficientOfVariation', () => {
  it('should calculate CV = stdDev / mean', () => {
    const values = [100, 100, 100, 100];
    expect(calcCoefficientOfVariation(values)).toBe(0);
  });

  it('should return higher CV for more variable data', () => {
    const stable = [100, 102, 98, 101];
    const volatile = [50, 150, 30, 200];
    expect(calcCoefficientOfVariation(volatile)).toBeGreaterThan(calcCoefficientOfVariation(stable));
  });

  it('should return 0 for single value', () => {
    expect(calcCoefficientOfVariation([100])).toBe(0);
  });
});

describe('calcMargin', () => {
  it('should calculate operating margin', () => {
    expect(calcMargin(1_000_000, 800_000)).toBeCloseTo(0.20, 2);
  });

  it('should return negative for losses', () => {
    expect(calcMargin(800_000, 1_000_000)).toBeCloseTo(-0.25, 2);
  });

  it('should return 0 for zero revenue', () => {
    expect(calcMargin(0, 100_000)).toBe(0);
  });
});

describe('calcCancellationRatio', () => {
  it('should calculate cancellations over revenue', () => {
    expect(calcCancellationRatio(50_000, 1_000_000)).toBeCloseTo(0.05, 3);
  });

  it('should return 0 for zero revenue', () => {
    expect(calcCancellationRatio(50_000, 0)).toBe(0);
  });
});

describe('calcCreditNoteRatio', () => {
  it('should calculate credit notes over revenue', () => {
    expect(calcCreditNoteRatio(30_000, 1_000_000)).toBeCloseTo(0.03, 3);
  });

  it('should return 0 for zero revenue', () => {
    expect(calcCreditNoteRatio(30_000, 0)).toBe(0);
  });
});

describe('detectRevenueDropMonths', () => {
  it('should detect months with >20% revenue drop', () => {
    const periods = [
      makePeriod({ period: '2024-01', revenue: 1_000_000 }),
      makePeriod({ period: '2024-02', revenue: 700_000 }),
      makePeriod({ period: '2024-03', revenue: 900_000 }),
    ];
    const drops = detectRevenueDropMonths(periods);
    expect(drops).toContain('2024-02');
    expect(drops).not.toContain('2024-03');
  });

  it('should return empty for stable revenue', () => {
    const periods = [
      makePeriod({ period: '2024-01', revenue: 1_000_000 }),
      makePeriod({ period: '2024-02', revenue: 950_000 }),
    ];
    expect(detectRevenueDropMonths(periods)).toHaveLength(0);
  });
});

describe('detectNegativeMarginMonths', () => {
  it('should detect months where expenses exceed revenue', () => {
    const periods = [
      makePeriod({ period: '2024-01', revenue: 1_000_000, expenses: 800_000 }),
      makePeriod({ period: '2024-02', revenue: 500_000, expenses: 600_000 }),
    ];
    const negMonths = detectNegativeMarginMonths(periods);
    expect(negMonths).toContain('2024-02');
    expect(negMonths).not.toContain('2024-01');
  });
});

describe('calcRollingRevenue', () => {
  it('should calculate rolling average for given window', () => {
    const periods = [
      makePeriod({ period: '2024-01', revenue: 100 }),
      makePeriod({ period: '2024-02', revenue: 200 }),
      makePeriod({ period: '2024-03', revenue: 300 }),
    ];
    const rolling = calcRollingRevenue(periods, 2);
    expect(rolling).toHaveLength(2);
    expect(rolling[0]).toBeCloseTo(150, 0);
    expect(rolling[1]).toBeCloseTo(250, 0);
  });
});

describe('isRevenueDecliningQuarters', () => {
  it('should detect 3 consecutive declining quarters', () => {
    const periods: StabilityPeriod[] = [];
    // Q1: 300k, Q2: 250k, Q3: 200k, Q4: 150k (4 quarters, 3 declines)
    const quarterRevenues = [100_000, 100_000, 100_000, 85_000, 85_000, 80_000, 70_000, 65_000, 65_000, 50_000, 50_000, 50_000];
    for (let i = 0; i < 12; i++) {
      const m = (i + 1).toString().padStart(2, '0');
      periods.push(makePeriod({ period: `2024-${m}`, revenue: quarterRevenues[i]! }));
    }
    expect(isRevenueDecliningQuarters(periods, 3)).toBe(true);
  });

  it('should return false for stable quarters', () => {
    const periods = makeStablePeriods(12);
    expect(isRevenueDecliningQuarters(periods, 3)).toBe(false);
  });

  it('should return false for insufficient data', () => {
    const periods = makeStablePeriods(6);
    expect(isRevenueDecliningQuarters(periods, 3)).toBe(false);
  });
});

describe('classifyPattern', () => {
  it('should classify as estable for low CV', () => {
    expect(classifyPattern(0.10, 1, 24, false, false)).toBe('estable');
  });

  it('should classify as ciclico for moderate CV with seasonality', () => {
    expect(classifyPattern(0.20, 2, 24, false, true)).toBe('ciclico');
  });

  it('should classify as erratico for high CV', () => {
    expect(classifyPattern(0.50, 8, 24, false, false)).toBe('erratico');
  });

  it('should classify as deteriorando when declining 3Q', () => {
    expect(classifyPattern(0.15, 3, 24, true, false)).toBe('deteriorando');
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcRevenueVariationSubScore', () => {
  it('should return 100 for very low variation', () => {
    expect(calcRevenueVariationSubScore(0.03)).toBe(100);
  });

  it('should return 10 for very high variation', () => {
    expect(calcRevenueVariationSubScore(0.50)).toBe(10);
  });
});

describe('calcCVSubScore', () => {
  it('should return 100 for low CV', () => {
    expect(calcCVSubScore(0.08)).toBe(100);
  });

  it('should return 10 for very high CV', () => {
    expect(calcCVSubScore(0.60)).toBe(10);
  });
});

describe('calcSeasonalitySubScore', () => {
  it('should give bonus for detected seasonality', () => {
    const withSeason = calcSeasonalitySubScore(true, 0, 24);
    const withoutSeason = calcSeasonalitySubScore(false, 0, 24);
    expect(withSeason).toBeGreaterThan(withoutSeason);
  });

  it('should penalize many negative margin months', () => {
    const few = calcSeasonalitySubScore(false, 1, 24);
    const many = calcSeasonalitySubScore(false, 8, 24);
    expect(few).toBeGreaterThan(many);
  });
});

describe('calcPatternSubScore', () => {
  it('should return 100 for estable', () => {
    expect(calcPatternSubScore('estable')).toBe(100);
  });

  it('should return 10 for deteriorando', () => {
    expect(calcPatternSubScore('deteriorando')).toBe(10);
  });
});

describe('calcTrendQualitySubScore', () => {
  it('should return 50 for empty trends', () => {
    expect(calcTrendQualitySubScore([])).toBe(50);
  });

  it('should return 10 for critical trends', () => {
    const trends = [{ direction: 'critical' }] as TrendResult[];
    expect(calcTrendQualitySubScore(trends)).toBe(10);
  });

  it('should return 90 for mostly improving trends', () => {
    const trends = [
      { direction: 'improving' },
      { direction: 'improving' },
      { direction: 'stable' },
    ] as TrendResult[];
    expect(calcTrendQualitySubScore(trends)).toBe(90);
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

  it('should return warning for mid-range score', () => {
    expect(scoreToStatus(45, [])).toBe('warning');
  });
});

// ============================================================
// Risk flags tests
// ============================================================

describe('generateRiskFlags', () => {
  it('should flag high volatility', () => {
    const flags = generateRiskFlags(0.50, 0.30, 0.05, 0.02, 1, 24, false, 'erratico');
    expect(flags.some((f) => f.code === 'high_volatility')).toBe(true);
  });

  it('should flag elevated volatility', () => {
    const flags = generateRiskFlags(0.30, 0.15, 0.05, 0.02, 1, 24, false, 'ciclico');
    expect(flags.some((f) => f.code === 'elevated_volatility')).toBe(true);
  });

  it('should flag declining 3 quarters', () => {
    const flags = generateRiskFlags(0.15, 0.08, 0.05, 0.02, 1, 24, true, 'deteriorando');
    expect(flags.some((f) => f.code === 'revenue_declining_3q')).toBe(true);
  });

  it('should flag high cancellation ratio', () => {
    const flags = generateRiskFlags(0.15, 0.08, 0.12, 0.02, 1, 24, false, 'estable');
    expect(flags.some((f) => f.code === 'high_cancellation_ratio')).toBe(true);
  });

  it('should flag high credit note ratio', () => {
    const flags = generateRiskFlags(0.15, 0.08, 0.05, 0.10, 1, 24, false, 'estable');
    expect(flags.some((f) => f.code === 'high_credit_note_ratio')).toBe(true);
  });

  it('should return no flags for healthy metrics', () => {
    const flags = generateRiskFlags(0.10, 0.05, 0.03, 0.02, 1, 24, false, 'estable');
    expect(flags.length).toBe(0);
  });
});

// ============================================================
// Trend analysis tests
// ============================================================

describe('analyzeTrends', () => {
  it('should return empty for single period', () => {
    expect(analyzeTrends([makePeriod()])).toHaveLength(0);
  });

  it('should return trends for multiple periods', () => {
    const periods = [
      makePeriod({ period: '2024-01' }),
      makePeriod({ period: '2024-02', revenue: 1_050_000 }),
      makePeriod({ period: '2024-03', revenue: 1_100_000 }),
    ];
    const trends = analyzeTrends(periods);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]!.metric_name).toBe('monthly_revenue');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runStabilityEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runStabilityEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('stability');
  });

  it('should return blocked when periods array is empty', async () => {
    const result = await runStabilityEngine({
      ...baseInput,
      syntage_data: { periods: [] },
    });
    expect(result.module_status).toBe('blocked');
  });

  it('should calculate a healthy score for stable business', async () => {
    const result = await runStabilityEngine({
      ...baseInput,
      syntage_data: { periods: makeStablePeriods(24) },
    });
    expect(result.module_status).toBe('pass');
    expect(result.module_score).toBeGreaterThan(50);
    expect(result.module_grade).toMatch(/^[ABC]$/);
    expect(result.key_metrics['coefficient_of_variation']).toBeDefined();
    expect(result.key_metrics['pattern_classification']).toBeDefined();
  });

  it('should flag volatile business with erratic revenue', async () => {
    const periods: StabilityPeriod[] = [];
    for (let i = 0; i < 24; i++) {
      const year = 2023 + Math.floor(i / 12);
      const m = ((i % 12) + 1).toString().padStart(2, '0');
      // Wildly varying revenue
      const revenue = i % 2 === 0 ? 2_000_000 : 400_000;
      periods.push(makePeriod({
        period: `${year}-${m}`,
        revenue,
        expenses: 700_000,
      }));
    }
    const result = await runStabilityEngine({
      ...baseInput,
      syntage_data: { periods },
    });
    expect(result.risk_flags.some((f) => f.code === 'high_volatility' || f.code === 'elevated_volatility')).toBe(true);
  });
});
