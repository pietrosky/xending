import { describe, it, expect } from 'vitest';
import {
  calcRevenuePerEmployee,
  calcPayrollToRevenue,
  calcAvgPayrollPerEmployee,
  calcHeadcountChange,
  isHeadcountDroppingOverWindow,
  detectShellCompanyRisk,
  isPayrollGrowingFasterThanRevenue,
  calcHeadcountTrendSubScore,
  calcProductivitySubScore,
  calcPayrollRatioSubScore,
  calcShellCompanySubScore,
  calcTrendQualitySubScore,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runEmployeeEngine,
} from './employee';
import type { EmployeePeriod } from './employee';
import type { EngineInput } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';

// ============================================================
// Test fixtures
// ============================================================

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { employee: 0.03 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makePeriod(overrides: Partial<EmployeePeriod> = {}): EmployeePeriod {
  return {
    period: '2024-01',
    headcount: 20,
    total_payroll: 200_000,
    revenue: 1_000_000,
    ...overrides,
  };
}

function makeHealthyPeriods(count: number): EmployeePeriod[] {
  const periods: EmployeePeriod[] = [];
  for (let i = 0; i < count; i++) {
    const year = 2023 + Math.floor(i / 12);
    const m = ((i % 12) + 1).toString().padStart(2, '0');
    periods.push(makePeriod({
      period: `${year}-${m}`,
      headcount: 15 + i,
      total_payroll: 200_000 + (i * 2000),
      revenue: 10_000_000 + (i * 50_000),
    }));
  }
  return periods;
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('calcRevenuePerEmployee', () => {
  it('should calculate revenue divided by headcount', () => {
    expect(calcRevenuePerEmployee(1_000_000, 10)).toBe(100_000);
  });

  it('should return 0 for zero headcount', () => {
    expect(calcRevenuePerEmployee(1_000_000, 0)).toBe(0);
  });
});

describe('calcPayrollToRevenue', () => {
  it('should calculate payroll as percentage of revenue', () => {
    expect(calcPayrollToRevenue(250_000, 1_000_000)).toBeCloseTo(0.25, 2);
  });

  it('should return 0 for zero revenue', () => {
    expect(calcPayrollToRevenue(250_000, 0)).toBe(0);
  });
});

describe('calcAvgPayrollPerEmployee', () => {
  it('should calculate average payroll per employee', () => {
    expect(calcAvgPayrollPerEmployee(200_000, 20)).toBe(10_000);
  });

  it('should return 0 for zero headcount', () => {
    expect(calcAvgPayrollPerEmployee(200_000, 0)).toBe(0);
  });
});

describe('calcHeadcountChange', () => {
  it('should calculate positive growth', () => {
    expect(calcHeadcountChange(25, 20)).toBeCloseTo(0.25, 2);
  });

  it('should calculate negative change', () => {
    expect(calcHeadcountChange(15, 20)).toBeCloseTo(-0.25, 2);
  });

  it('should return 0 for zero previous', () => {
    expect(calcHeadcountChange(10, 0)).toBe(0);
  });
});

describe('isHeadcountDroppingOverWindow', () => {
  it('should detect headcount drop > 20% over 6 months', () => {
    const periods: EmployeePeriod[] = [];
    for (let i = 0; i < 6; i++) {
      const m = (i + 1).toString().padStart(2, '0');
      periods.push(makePeriod({
        period: `2024-${m}`,
        headcount: 20 - (i * 3),
      }));
    }
    expect(isHeadcountDroppingOverWindow(periods, 6, 0.20)).toBe(true);
  });

  it('should return false for stable headcount', () => {
    const periods = makeHealthyPeriods(6);
    expect(isHeadcountDroppingOverWindow(periods, 6, 0.20)).toBe(false);
  });

  it('should return false for insufficient data', () => {
    const periods = makeHealthyPeriods(3);
    expect(isHeadcountDroppingOverWindow(periods, 6, 0.20)).toBe(false);
  });
});

describe('detectShellCompanyRisk', () => {
  it('should return critical for zero headcount with revenue', () => {
    expect(detectShellCompanyRisk(0, 500_000)).toBe('critical');
  });

  it('should return critical for 2 employees with high revenue', () => {
    expect(detectShellCompanyRisk(2, 2_000_000)).toBe('critical');
  });

  it('should return warning for 5 employees with very high revenue', () => {
    expect(detectShellCompanyRisk(5, 6_000_000)).toBe('warning');
  });

  it('should return none for adequate headcount', () => {
    expect(detectShellCompanyRisk(20, 1_000_000)).toBe('none');
  });
});

describe('isPayrollGrowingFasterThanRevenue', () => {
  it('should detect payroll outpacing revenue', () => {
    const periods: EmployeePeriod[] = [];
    for (let i = 0; i < 12; i++) {
      const m = (i + 1).toString().padStart(2, '0');
      periods.push(makePeriod({
        period: `2024-${m}`,
        total_payroll: 200_000 + (i * 30_000),
        revenue: 1_000_000 + (i * 5_000),
      }));
    }
    expect(isPayrollGrowingFasterThanRevenue(periods)).toBe(true);
  });

  it('should return false when revenue grows faster', () => {
    const periods: EmployeePeriod[] = [];
    for (let i = 0; i < 12; i++) {
      const m = (i + 1).toString().padStart(2, '0');
      periods.push(makePeriod({
        period: `2024-${m}`,
        total_payroll: 200_000 + (i * 1_000),
        revenue: 1_000_000 + (i * 100_000),
      }));
    }
    expect(isPayrollGrowingFasterThanRevenue(periods)).toBe(false);
  });

  it('should return false for insufficient data', () => {
    expect(isPayrollGrowingFasterThanRevenue([makePeriod()])).toBe(false);
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcHeadcountTrendSubScore', () => {
  it('should return high score for growing headcount', () => {
    const periods = [
      makePeriod({ period: '2024-01', headcount: 10 }),
      makePeriod({ period: '2024-06', headcount: 15 }),
    ];
    expect(calcHeadcountTrendSubScore(periods)).toBe(100);
  });

  it('should return low score for severe decline', () => {
    const periods = [
      makePeriod({ period: '2024-01', headcount: 20 }),
      makePeriod({ period: '2024-06', headcount: 10 }),
    ];
    expect(calcHeadcountTrendSubScore(periods)).toBe(15);
  });

  it('should return 50 for single period', () => {
    expect(calcHeadcountTrendSubScore([makePeriod()])).toBe(50);
  });
});

describe('calcProductivitySubScore', () => {
  it('should return 100 for high productivity', () => {
    expect(calcProductivitySubScore(900_000)).toBe(100);
  });

  it('should return 10 for very low productivity', () => {
    expect(calcProductivitySubScore(20_000)).toBe(10);
  });
});

describe('calcPayrollRatioSubScore', () => {
  it('should return 100 for low payroll ratio', () => {
    expect(calcPayrollRatioSubScore(0.10)).toBe(100);
  });

  it('should return 10 for very high payroll ratio', () => {
    expect(calcPayrollRatioSubScore(0.60)).toBe(10);
  });
});

describe('calcShellCompanySubScore', () => {
  it('should return 100 for no risk', () => {
    expect(calcShellCompanySubScore('none')).toBe(100);
  });

  it('should return 40 for warning', () => {
    expect(calcShellCompanySubScore('warning')).toBe(40);
  });

  it('should return 5 for critical', () => {
    expect(calcShellCompanySubScore('critical')).toBe(5);
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
  it('should flag possible shell company', () => {
    const flags = generateRiskFlags({
      avgHeadcount: 1,
      avgRevenue: 5_000_000,
      payrollToRevenue: 0.01,
      shellRisk: 'critical',
      isHeadcountDropping: false,
      isPayrollOutpacingRevenue: false,
      revenuePerEmployee: 5_000_000,
      revenuePerEmployeeChange: 0,
    });
    expect(flags.some((f) => f.code === 'possible_shell_company')).toBe(true);
  });

  it('should flag high payroll burden', () => {
    const flags = generateRiskFlags({
      avgHeadcount: 20,
      avgRevenue: 1_000_000,
      payrollToRevenue: 0.45,
      shellRisk: 'none',
      isHeadcountDropping: false,
      isPayrollOutpacingRevenue: false,
      revenuePerEmployee: 50_000,
      revenuePerEmployeeChange: 0,
    });
    expect(flags.some((f) => f.code === 'high_payroll_burden')).toBe(true);
  });

  it('should flag headcount contracting', () => {
    const flags = generateRiskFlags({
      avgHeadcount: 15,
      avgRevenue: 1_000_000,
      payrollToRevenue: 0.20,
      shellRisk: 'none',
      isHeadcountDropping: true,
      isPayrollOutpacingRevenue: false,
      revenuePerEmployee: 66_666,
      revenuePerEmployeeChange: 0,
    });
    expect(flags.some((f) => f.code === 'headcount_contracting')).toBe(true);
  });

  it('should flag payroll sustainability risk', () => {
    const flags = generateRiskFlags({
      avgHeadcount: 20,
      avgRevenue: 1_000_000,
      payrollToRevenue: 0.30,
      shellRisk: 'none',
      isHeadcountDropping: false,
      isPayrollOutpacingRevenue: true,
      revenuePerEmployee: 50_000,
      revenuePerEmployeeChange: 0,
    });
    expect(flags.some((f) => f.code === 'payroll_sustainability_risk')).toBe(true);
  });

  it('should flag productivity declining', () => {
    const flags = generateRiskFlags({
      avgHeadcount: 20,
      avgRevenue: 1_000_000,
      payrollToRevenue: 0.20,
      shellRisk: 'none',
      isHeadcountDropping: false,
      isPayrollOutpacingRevenue: false,
      revenuePerEmployee: 40_000,
      revenuePerEmployeeChange: -0.20,
    });
    expect(flags.some((f) => f.code === 'productivity_declining')).toBe(true);
  });

  it('should return no flags for healthy metrics', () => {
    const flags = generateRiskFlags({
      avgHeadcount: 25,
      avgRevenue: 1_000_000,
      payrollToRevenue: 0.20,
      shellRisk: 'none',
      isHeadcountDropping: false,
      isPayrollOutpacingRevenue: false,
      revenuePerEmployee: 500_000,
      revenuePerEmployeeChange: 0.05,
    });
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
      makePeriod({ period: '2024-02', headcount: 22, revenue: 1_100_000 }),
      makePeriod({ period: '2024-03', headcount: 24, revenue: 1_200_000 }),
    ];
    const trends = analyzeTrends(periods);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]!.metric_name).toBe('headcount');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runEmployeeEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runEmployeeEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('employee');
  });

  it('should return blocked when periods array is empty', async () => {
    const result = await runEmployeeEngine({
      ...baseInput,
      syntage_data: { periods: [] },
    });
    expect(result.module_status).toBe('blocked');
  });

  it('should calculate a healthy score for normal business', async () => {
    const result = await runEmployeeEngine({
      ...baseInput,
      syntage_data: { periods: makeHealthyPeriods(12) },
    });
    expect(result.module_status).toBe('pass');
    expect(result.module_score).toBeGreaterThan(50);
    expect(result.module_grade).toMatch(/^[ABC]$/);
    expect(result.key_metrics['avg_headcount']).toBeDefined();
    expect(result.key_metrics['revenue_per_employee']).toBeDefined();
    expect(result.key_metrics['payroll_to_revenue']).toBeDefined();
  });

  it('should flag shell company with very low headcount and high revenue', async () => {
    const periods: EmployeePeriod[] = [];
    for (let i = 0; i < 12; i++) {
      const m = (i + 1).toString().padStart(2, '0');
      periods.push(makePeriod({
        period: `2024-${m}`,
        headcount: 1,
        total_payroll: 15_000,
        revenue: 5_000_000,
      }));
    }
    const result = await runEmployeeEngine({
      ...baseInput,
      syntage_data: { periods },
    });
    expect(result.risk_flags.some((f) => f.code === 'possible_shell_company')).toBe(true);
  });
});
