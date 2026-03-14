import { describe, it, expect } from 'vitest';
import {
  calcDSO,
  calcDIO,
  calcDPO,
  calcCCC,
  calcCollectionEfficiency,
  calcNegotiationPower,
  calcAgingConcentration,
  calcCCCSubScore,
  calcAgingSubScore,
  calcCollectionEfficiencySubScore,
  calcNegotiationPowerSubScore,
  calcTrendQualitySubScore,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runWorkingCapitalEngine,
} from './workingCapital';
import type { WorkingCapitalPeriod, AgingBucket } from './workingCapital';
import type { EngineInput } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';

// ============================================================
// Test fixtures
// ============================================================

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { working_capital: 0.04 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeAging(overrides: Partial<AgingBucket> = {}): AgingBucket {
  return {
    current: 500_000,
    days_1_30: 200_000,
    days_31_60: 100_000,
    days_61_90: 30_000,
    days_90_plus: 10_000,
    ...overrides,
  };
}

function makePeriod(overrides: Partial<WorkingCapitalPeriod> = {}): WorkingCapitalPeriod {
  return {
    period: '2024',
    revenue: 10_000_000,
    cost_of_goods_sold: 6_000_000,
    accounts_receivable: 1_200_000,
    inventory: 500_000,
    accounts_payable: 800_000,
    cxc_aging: makeAging(),
    cxp_aging: makeAging(),
    collections_received: 9_000_000,
    total_invoiced: 10_000_000,
    early_payment_discounts_taken: 50_000,
    early_payment_discounts_offered: 30_000,
    total_purchases: 6_000_000,
    ...overrides,
  };
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('calcDSO', () => {
  it('should calculate days sales outstanding', () => {
    // (1,200,000 / 10,000,000) * 365 = 43.8
    expect(calcDSO(1_200_000, 10_000_000)).toBeCloseTo(43.8, 1);
  });

  it('should return 0 for zero revenue', () => {
    expect(calcDSO(100_000, 0)).toBe(0);
  });
});

describe('calcDIO', () => {
  it('should calculate days inventory outstanding', () => {
    // (500,000 / 6,000,000) * 365 = 30.42
    expect(calcDIO(500_000, 6_000_000)).toBeCloseTo(30.42, 1);
  });

  it('should return 0 for zero COGS', () => {
    expect(calcDIO(100_000, 0)).toBe(0);
  });
});

describe('calcDPO', () => {
  it('should calculate days payable outstanding', () => {
    // (800,000 / 6,000,000) * 365 = 48.67
    expect(calcDPO(800_000, 6_000_000)).toBeCloseTo(48.67, 1);
  });

  it('should return 0 for zero COGS', () => {
    expect(calcDPO(100_000, 0)).toBe(0);
  });
});

describe('calcCCC', () => {
  it('should calculate CCC = DSO + DIO - DPO', () => {
    expect(calcCCC(45, 30, 35)).toBe(40);
  });

  it('should handle negative CCC (favorable)', () => {
    expect(calcCCC(20, 10, 50)).toBe(-20);
  });
});

describe('calcCollectionEfficiency', () => {
  it('should calculate ratio of collections to invoiced', () => {
    expect(calcCollectionEfficiency(9_000_000, 10_000_000)).toBeCloseTo(0.9, 2);
  });

  it('should cap at 1.0', () => {
    expect(calcCollectionEfficiency(11_000_000, 10_000_000)).toBe(1);
  });

  it('should return 0 for zero invoiced', () => {
    expect(calcCollectionEfficiency(100, 0)).toBe(0);
  });
});

describe('calcNegotiationPower', () => {
  it('should return value between 0 and 1', () => {
    const power = calcNegotiationPower(50_000, 6_000_000, 30_000, 10_000_000);
    expect(power).toBeGreaterThanOrEqual(0);
    expect(power).toBeLessThanOrEqual(1);
  });
});

describe('calcAgingConcentration', () => {
  it('should calculate percentage in 60+ day buckets', () => {
    const aging = makeAging();
    // total = 840,000; 60+ = 40,000; concentration = 40,000/840,000 ~ 0.0476
    expect(calcAgingConcentration(aging)).toBeCloseTo(0.0476, 3);
  });

  it('should return 0 for zero total', () => {
    expect(calcAgingConcentration({ current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_90_plus: 0 })).toBe(0);
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcCCCSubScore', () => {
  it('should return 100 for excellent CCC (<=30)', () => {
    expect(calcCCCSubScore(25)).toBe(100);
  });

  it('should return 60 for acceptable CCC (<=60)', () => {
    expect(calcCCCSubScore(55)).toBe(60);
  });

  it('should return 10 for very poor CCC (>90)', () => {
    expect(calcCCCSubScore(120)).toBe(10);
  });
});

describe('calcAgingSubScore', () => {
  it('should return high score for healthy aging', () => {
    const healthy = makeAging({ days_61_90: 0, days_90_plus: 0 });
    expect(calcAgingSubScore(healthy, healthy)).toBe(100);
  });

  it('should return low score for heavily aged receivables', () => {
    const bad = makeAging({ current: 100, days_1_30: 100, days_31_60: 100, days_61_90: 400, days_90_plus: 300 });
    expect(calcAgingSubScore(bad, bad)).toBeLessThan(40);
  });
});

describe('calcCollectionEfficiencySubScore', () => {
  it('should return 100 for 95%+ efficiency', () => {
    expect(calcCollectionEfficiencySubScore(0.96)).toBe(100);
  });

  it('should return 5 for very low efficiency', () => {
    expect(calcCollectionEfficiencySubScore(0.30)).toBe(5);
  });
});

describe('calcNegotiationPowerSubScore', () => {
  it('should return 100 for high power', () => {
    expect(calcNegotiationPowerSubScore(0.85)).toBe(100);
  });

  it('should return 5 for very low power', () => {
    expect(calcNegotiationPowerSubScore(0.10)).toBe(5);
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
  it('should flag high CCC', () => {
    const p = makePeriod();
    const flags = generateRiskFlags(p, 75, 50, 30, undefined, undefined, 0.05);
    expect(flags.some((f) => f.code === 'ccc_high')).toBe(true);
  });

  it('should flag DSO deteriorating', () => {
    const p = makePeriod();
    const flags = generateRiskFlags(p, 40, 55, 35, 40, 35, 0.05);
    expect(flags.some((f) => f.code === 'dso_deteriorating')).toBe(true);
  });

  it('should flag DPO shrinking', () => {
    const p = makePeriod();
    const flags = generateRiskFlags(p, 40, 30, 25, 30, 40, 0.05);
    expect(flags.some((f) => f.code === 'dpo_shrinking')).toBe(true);
  });

  it('should flag high aging concentration', () => {
    const p = makePeriod();
    const flags = generateRiskFlags(p, 40, 30, 35, undefined, undefined, 0.40);
    expect(flags.some((f) => f.code === 'aging_concentration_high')).toBe(true);
  });

  it('should return no flags for healthy metrics', () => {
    const p = makePeriod();
    const flags = generateRiskFlags(p, 35, 40, 35, 42, 33, 0.05);
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
      makePeriod({ period: '2022' }),
      makePeriod({ period: '2023' }),
      makePeriod({ period: '2024' }),
    ];
    const trends = analyzeTrends(periods);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]!.metric_name).toBe('ccc');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runWorkingCapitalEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runWorkingCapitalEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('working_capital');
  });

  it('should return blocked when periods array is empty', async () => {
    const result = await runWorkingCapitalEngine({
      ...baseInput,
      syntage_data: { periods: [] },
    });
    expect(result.module_status).toBe('blocked');
  });

  it('should calculate a healthy score for good working capital', async () => {
    const result = await runWorkingCapitalEngine({
      ...baseInput,
      syntage_data: {
        periods: [
          makePeriod({ period: '2023' }),
          makePeriod({ period: '2024' }),
        ],
      },
    });
    expect(result.module_status).toBe('pass');
    expect(result.module_score).toBeGreaterThan(50);
    expect(result.module_grade).toMatch(/^[ABC]$/);
    expect(result.key_metrics['ccc']).toBeDefined();
    expect(result.key_metrics['dso']).toBeDefined();
  });

  it('should flag poor working capital with high CCC', async () => {
    const result = await runWorkingCapitalEngine({
      ...baseInput,
      syntage_data: {
        periods: [
          makePeriod({
            period: '2023',
            accounts_receivable: 4_000_000,
            inventory: 3_000_000,
            accounts_payable: 500_000,
          }),
          makePeriod({
            period: '2024',
            accounts_receivable: 5_000_000,
            inventory: 3_500_000,
            accounts_payable: 400_000,
          }),
        ],
      },
    });
    expect(result.risk_flags.some((f) => f.code === 'ccc_high')).toBe(true);
  });
});
