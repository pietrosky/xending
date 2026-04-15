import { describe, it, expect } from 'vitest';
import {
  calcHHI,
  aggregateByKey,
  calcConcentration,
  calcPostOriginationConcentration,
  calcExpectedLoss,
  calcExpectedLossPct,
  checkLimitBreach,
  calcSectorConcentrationSubScore,
  calcCurrencyConcentrationSubScore,
  calcGroupConcentrationSubScore,
  calcExpectedLossSubScore,
  calcTrendQualitySubScore,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runPortfolioEngine,
} from './portfolio';
import type { PortfolioPosition, PortfolioPeriod } from './portfolio';
import type { EngineInput } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { portfolio: 0.05 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makePosition(overrides: Partial<PortfolioPosition> = {}): PortfolioPosition {
  return {
    name: 'Company A',
    sector: 'manufacturing',
    currency: 'MXN',
    group: 'group_a',
    amount: 1_000_000,
    ...overrides,
  };
}

function makeDiversifiedPeriod(period: string): PortfolioPeriod {
  const sectors = ['manufacturing', 'services', 'retail', 'tech', 'agri'];
  const currencies = ['MXN', 'USD'];
  const groups = ['grp_a', 'grp_b', 'grp_c', 'grp_d', 'grp_e'];
  const positions: PortfolioPosition[] = [];
  for (let i = 0; i < 10; i++) {
    positions.push(makePosition({
      name: `Company ${i}`,
      sector: sectors[i % sectors.length]!,
      currency: currencies[i % currencies.length]!,
      group: groups[i % groups.length]!,
      amount: 500_000 + i * 50_000,
    }));
  }
  const total = positions.reduce((s, p) => s + p.amount, 0);
  return { period, positions, total_portfolio: total };
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('calcHHI', () => {
  it('should return 10000 for a single position (monopoly)', () => {
    expect(calcHHI([1_000_000])).toBeCloseTo(10000, 0);
  });

  it('should return 5000 for two equal positions', () => {
    expect(calcHHI([500_000, 500_000])).toBeCloseTo(5000, 0);
  });

  it('should return low HHI for many equal positions', () => {
    const shares = Array(10).fill(100_000) as number[];
    expect(calcHHI(shares)).toBeCloseTo(1000, 0);
  });

  it('should return 0 for empty array', () => {
    expect(calcHHI([])).toBe(0);
  });

  it('should return 0 for all-zero shares', () => {
    expect(calcHHI([0, 0, 0])).toBe(0);
  });
});

describe('aggregateByKey', () => {
  it('should aggregate amounts by sector', () => {
    const positions = [
      makePosition({ sector: 'manufacturing', amount: 100 }),
      makePosition({ sector: 'manufacturing', amount: 200 }),
      makePosition({ sector: 'services', amount: 300 }),
    ];
    const result = aggregateByKey(positions, (p) => p.sector);
    expect(result['manufacturing']).toBe(300);
    expect(result['services']).toBe(300);
  });

  it('should return empty object for empty positions', () => {
    expect(aggregateByKey([], (p) => p.sector)).toEqual({});
  });
});

describe('calcConcentration', () => {
  it('should calculate concentration fraction', () => {
    const agg = { manufacturing: 300, services: 700 };
    expect(calcConcentration(agg, 1000, 'manufacturing')).toBeCloseTo(0.30, 2);
  });

  it('should return 0 for missing key', () => {
    expect(calcConcentration({ a: 100 }, 100, 'b')).toBe(0);
  });

  it('should return 0 for zero total', () => {
    expect(calcConcentration({ a: 100 }, 0, 'a')).toBe(0);
  });
});

describe('calcPostOriginationConcentration', () => {
  it('should calculate post-origination concentration', () => {
    // Current: 300 out of 1000, adding 200 to same sector
    // Post: (300+200) / (1000+200) = 500/1200
    const result = calcPostOriginationConcentration(300, 200, 1000);
    expect(result).toBeCloseTo(500 / 1200, 4);
  });

  it('should return 0 for zero total', () => {
    expect(calcPostOriginationConcentration(0, 0, 0)).toBe(0);
  });
});

describe('calcExpectedLoss', () => {
  it('should calculate PD * LGD * EAD', () => {
    // PD=0.05, LGD=0.40, EAD=1_000_000 => 20_000
    expect(calcExpectedLoss(0.05, 0.40, 1_000_000)).toBeCloseTo(20_000, 0);
  });

  it('should return 0 when PD is 0', () => {
    expect(calcExpectedLoss(0, 0.40, 1_000_000)).toBe(0);
  });
});

describe('calcExpectedLossPct', () => {
  it('should calculate expected loss as fraction of portfolio', () => {
    expect(calcExpectedLossPct(20_000, 10_000_000)).toBeCloseTo(0.002, 4);
  });

  it('should return 0 for zero portfolio', () => {
    expect(calcExpectedLossPct(20_000, 0)).toBe(0);
  });
});

describe('checkLimitBreach', () => {
  it('should return true when concentration exceeds limit', () => {
    expect(checkLimitBreach(0.35, 0.30)).toBe(true);
  });

  it('should return false when concentration is within limit', () => {
    expect(checkLimitBreach(0.25, 0.30)).toBe(false);
  });

  it('should return false when exactly at limit', () => {
    expect(checkLimitBreach(0.30, 0.30)).toBe(false);
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcSectorConcentrationSubScore', () => {
  it('should return high score for diversified portfolio', () => {
    expect(calcSectorConcentrationSubScore(800, 0.15, false)).toBe(100);
  });

  it('should return low score for concentrated portfolio with breach', () => {
    const score = calcSectorConcentrationSubScore(3000, 0.50, true);
    expect(score).toBeLessThan(30);
  });
});

describe('calcCurrencyConcentrationSubScore', () => {
  it('should return high score for balanced currency mix', () => {
    expect(calcCurrencyConcentrationSubScore(0.35, false)).toBe(100);
  });

  it('should return low score for single currency with breach', () => {
    const score = calcCurrencyConcentrationSubScore(0.90, true);
    expect(score).toBeLessThan(20);
  });
});

describe('calcGroupConcentrationSubScore', () => {
  it('should return high score for low group concentration', () => {
    expect(calcGroupConcentrationSubScore(0.10, false)).toBe(100);
  });

  it('should return low score for high group concentration with breach', () => {
    const score = calcGroupConcentrationSubScore(0.40, true);
    expect(score).toBeLessThan(50);
  });
});

describe('calcExpectedLossSubScore', () => {
  it('should return 100 for very low expected loss', () => {
    expect(calcExpectedLossSubScore(0.003)).toBe(100);
  });

  it('should return 70 for moderate expected loss', () => {
    expect(calcExpectedLossSubScore(0.015)).toBe(70);
  });

  it('should return 10 for very high expected loss', () => {
    expect(calcExpectedLossSubScore(0.08)).toBe(10);
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

  it('should return fail for low score', () => {
    expect(scoreToStatus(30, [])).toBe('fail');
  });
});

// ============================================================
// Risk flags tests
// ============================================================

describe('generateRiskFlags', () => {
  it('should flag sector limit breach', () => {
    const flags = generateRiskFlags({
      sectorHHI: 1000, sectorBreached: true, currencyBreached: false,
      maxGroupPct: 0.15, groupBreached: false, expectedLossPct: 0.01,
      postSectorPct: 0.35, postCurrencyPct: 0.40,
    });
    expect(flags.some((f) => f.code === 'sector_limit_breach')).toBe(true);
  });

  it('should flag currency limit breach', () => {
    const flags = generateRiskFlags({
      sectorHHI: 1000, sectorBreached: false, currencyBreached: true,
      maxGroupPct: 0.15, groupBreached: false, expectedLossPct: 0.01,
      postSectorPct: 0.25, postCurrencyPct: 0.55,
    });
    expect(flags.some((f) => f.code === 'currency_limit_breach')).toBe(true);
  });

  it('should flag group concentration high', () => {
    const flags = generateRiskFlags({
      sectorHHI: 1000, sectorBreached: false, currencyBreached: false,
      maxGroupPct: 0.30, groupBreached: true, expectedLossPct: 0.01,
      postSectorPct: 0.25, postCurrencyPct: 0.40,
    });
    expect(flags.some((f) => f.code === 'group_concentration_high')).toBe(true);
  });

  it('should flag high expected loss', () => {
    const flags = generateRiskFlags({
      sectorHHI: 1000, sectorBreached: false, currencyBreached: false,
      maxGroupPct: 0.15, groupBreached: false, expectedLossPct: 0.04,
      postSectorPct: 0.25, postCurrencyPct: 0.40,
    });
    expect(flags.some((f) => f.code === 'high_expected_loss')).toBe(true);
  });

  it('should flag portfolio HHI high', () => {
    const flags = generateRiskFlags({
      sectorHHI: 3000, sectorBreached: false, currencyBreached: false,
      maxGroupPct: 0.15, groupBreached: false, expectedLossPct: 0.01,
      postSectorPct: 0.25, postCurrencyPct: 0.40,
    });
    expect(flags.some((f) => f.code === 'portfolio_hhi_high')).toBe(true);
  });

  it('should return no flags for healthy portfolio', () => {
    const flags = generateRiskFlags({
      sectorHHI: 1000, sectorBreached: false, currencyBreached: false,
      maxGroupPct: 0.15, groupBreached: false, expectedLossPct: 0.01,
      postSectorPct: 0.25, postCurrencyPct: 0.40,
    });
    expect(flags.length).toBe(0);
  });
});

// ============================================================
// Trend analysis tests
// ============================================================

describe('analyzeTrends', () => {
  it('should return empty for single period', () => {
    expect(analyzeTrends([makeDiversifiedPeriod('2024-01')])).toHaveLength(0);
  });

  it('should return trends for multiple periods', () => {
    const periods = [
      makeDiversifiedPeriod('2024-01'),
      makeDiversifiedPeriod('2024-02'),
      makeDiversifiedPeriod('2024-03'),
    ];
    const trends = analyzeTrends(periods);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]!.metric_name).toBe('sector_hhi');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runPortfolioEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runPortfolioEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('portfolio');
  });

  it('should return blocked when periods array is empty', async () => {
    const result = await runPortfolioEngine({
      ...baseInput,
      syntage_data: { periods: [], new_loan: { sector: 'x', currency: 'MXN', group: 'g', amount: 100, pd: 0.05 } },
    });
    expect(result.module_status).toBe('blocked');
  });

  it('should calculate a healthy score for diversified portfolio', async () => {
    const periods = [
      makeDiversifiedPeriod('2024-01'),
      makeDiversifiedPeriod('2024-02'),
      makeDiversifiedPeriod('2024-03'),
    ];
    const result = await runPortfolioEngine({
      ...baseInput,
      syntage_data: {
        periods,
        new_loan: { sector: 'manufacturing', currency: 'MXN', group: 'grp_a', amount: 200_000, pd: 0.03 },
      },
    });
    expect(result.module_status).toBe('pass');
    expect(result.module_score).toBeGreaterThan(50);
    expect(result.module_grade).toMatch(/^[ABC]$/);
    expect(result.key_metrics['sector_hhi']).toBeDefined();
    expect(result.key_metrics['expected_loss']).toBeDefined();
    expect(result.key_metrics['post_sector_concentration']).toBeDefined();
  });

  it('should flag sector breach for concentrated portfolio', async () => {
    const positions: PortfolioPosition[] = [
      makePosition({ sector: 'manufacturing', amount: 800_000 }),
      makePosition({ name: 'B', sector: 'services', amount: 200_000 }),
    ];
    const period: PortfolioPeriod = {
      period: '2024-01',
      positions,
      total_portfolio: 1_000_000,
    };
    const result = await runPortfolioEngine({
      ...baseInput,
      syntage_data: {
        periods: [period],
        new_loan: { sector: 'manufacturing', currency: 'MXN', group: 'group_a', amount: 500_000, pd: 0.05 },
      },
    });
    // Post-origination: (800k+500k)/(1M+500k) = 1.3M/1.5M = 86.7% > 30% limit
    expect(result.risk_flags.some((f) => f.code === 'sector_limit_breach')).toBe(true);
  });

  it('should calculate expected loss correctly', async () => {
    const period: PortfolioPeriod = {
      period: '2024-01',
      positions: [
        makePosition({ sector: 'manufacturing', currency: 'MXN', group: 'grp_a', amount: 5_000_000 }),
        makePosition({ name: 'B', sector: 'services', currency: 'USD', group: 'grp_b', amount: 5_000_000 }),
      ],
      total_portfolio: 10_000_000,
    };
    const result = await runPortfolioEngine({
      ...baseInput,
      syntage_data: {
        periods: [period],
        new_loan: { sector: 'retail', currency: 'MXN', group: 'grp_c', amount: 1_000_000, pd: 0.05 },
      },
    });
    // EL = 0.05 * 0.40 * 1_000_000 = 20_000
    // EL% = 20_000 / 11_000_000 = 0.00182
    const elMetric = result.key_metrics['expected_loss'];
    expect(elMetric).toBeDefined();
    expect(elMetric!.value).toBeCloseTo(20_000, 0);
  });
});
