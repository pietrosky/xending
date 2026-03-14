import { describe, it, expect } from 'vitest';
import {
  calcDSCR,
  calcCashMonths,
  applyRevenueStress,
  applyMarginStress,
  applyDSOStress,
  applyFXStress,
  applyCombinedStress,
  findBreakingPoint,
  calcRevenueResilienceSubScore,
  calcFXResilienceSubScore,
  calcCombinedResilienceSubScore,
  calcTrendQualitySubScore,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runScenarioEngine,
} from './scenarioEngine';
import type { ScenarioInput, StressResult, ScenarioPeriod } from './scenarioEngine';
import type { EngineInput } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';

// ============================================================
// Test data helpers
// ============================================================

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { scenario: 0.05 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeHealthyInput(): ScenarioInput {
  return {
    base_revenue: 10_000_000,
    base_margin: 0.25,
    base_dso: 45,
    base_ebitda: 2_500_000,
    annual_debt_service: 800_000,
    cash_balance: 1_500_000,
    monthly_fixed_costs: 200_000,
    fx_exposure_pct: 0.10,
    currency: 'MXN',
  };
}

function makeWeakInput(): ScenarioInput {
  return {
    base_revenue: 5_000_000,
    base_margin: 0.12,
    base_dso: 60,
    base_ebitda: 600_000,
    annual_debt_service: 550_000,
    cash_balance: 200_000,
    monthly_fixed_costs: 150_000,
    fx_exposure_pct: 0.30,
    currency: 'USD',
  };
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('calcDSCR', () => {
  it('should calculate EBITDA / debt service', () => {
    expect(calcDSCR(2_500_000, 800_000)).toBeCloseTo(3.125, 2);
  });

  it('should return 99 when debt service is zero', () => {
    expect(calcDSCR(1_000_000, 0)).toBe(99);
  });

  it('should return value below 1 for weak coverage', () => {
    expect(calcDSCR(400_000, 500_000)).toBeCloseTo(0.80, 2);
  });
});

describe('calcCashMonths', () => {
  it('should calculate months of cash remaining', () => {
    expect(calcCashMonths(600_000, 200_000)).toBeCloseTo(3, 0);
  });

  it('should return 99 when costs are zero', () => {
    expect(calcCashMonths(1_000_000, 0)).toBe(99);
  });
});

describe('applyRevenueStress', () => {
  it('should reduce revenue by stress percentage', () => {
    const input = makeHealthyInput();
    const result = applyRevenueStress(input, -0.10);
    expect(result.stressed_value).toBeCloseTo(9_000_000, 0);
    expect(result.stressed_ebitda).toBeCloseTo(9_000_000 * 0.25, 0);
  });

  it('should survive mild stress with healthy input', () => {
    const input = makeHealthyInput();
    const result = applyRevenueStress(input, -0.10);
    expect(result.survives).toBe(true);
  });

  it('should fail severe stress with weak input', () => {
    const input = makeWeakInput();
    const result = applyRevenueStress(input, -0.30);
    expect(result.survives).toBe(false);
  });
});

describe('applyMarginStress', () => {
  it('should reduce margin by percentage points', () => {
    const input = makeHealthyInput();
    const result = applyMarginStress(input, -0.05);
    expect(result.stressed_value).toBeCloseTo(0.20, 2);
  });

  it('should not go below zero margin', () => {
    const input = makeWeakInput();
    const result = applyMarginStress(input, -0.15);
    expect(result.stressed_value).toBeGreaterThanOrEqual(0);
  });
});

describe('applyDSOStress', () => {
  it('should increase DSO and reduce effective EBITDA', () => {
    const input = makeHealthyInput();
    const result = applyDSOStress(input, 15);
    expect(result.stressed_value).toBe(60);
    expect(result.stressed_ebitda).toBeLessThan(input.base_ebitda);
  });

  it('should survive mild DSO increase with healthy input', () => {
    const input = makeHealthyInput();
    const result = applyDSOStress(input, 15);
    expect(result.survives).toBe(true);
  });
});

describe('applyFXStress', () => {
  it('should reduce EBITDA based on FX exposure', () => {
    const input = makeHealthyInput();
    const result = applyFXStress(input, -0.10);
    expect(result.stressed_ebitda).toBeLessThan(input.base_ebitda);
  });

  it('should have larger impact with higher FX exposure', () => {
    const lowFx = makeHealthyInput();
    lowFx.fx_exposure_pct = 0.10;
    const highFx = makeHealthyInput();
    highFx.fx_exposure_pct = 0.50;

    const resultLow = applyFXStress(lowFx, -0.20);
    const resultHigh = applyFXStress(highFx, -0.20);
    expect(resultHigh.stressed_ebitda).toBeLessThan(resultLow.stressed_ebitda);
  });
});

describe('applyCombinedStress', () => {
  it('should apply worst-case combination', () => {
    const input = makeHealthyInput();
    const result = applyCombinedStress(input);
    expect(result.stressed_ebitda).toBeLessThan(input.base_ebitda);
    expect(result.stressed_dscr).toBeLessThan(calcDSCR(input.base_ebitda, input.annual_debt_service));
  });

  it('should fail for weak input under combined stress', () => {
    const input = makeWeakInput();
    const result = applyCombinedStress(input);
    expect(result.survives).toBe(false);
  });
});

describe('findBreakingPoint', () => {
  it('should find breaking level for weak input', () => {
    const input = makeWeakInput();
    const levels = [-0.10, -0.20, -0.30] as const;
    const result = findBreakingPoint(input, applyRevenueStress, levels);
    expect(result.breaking_level).not.toBeNull();
  });

  it('should return null breaking level for very strong input', () => {
    const input = makeHealthyInput();
    input.base_ebitda = 5_000_000;
    input.annual_debt_service = 500_000;
    const levels = [-0.10, -0.20, -0.30] as const;
    const result = findBreakingPoint(input, applyRevenueStress, levels);
    expect(result.breaking_level).toBeNull();
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcRevenueResilienceSubScore', () => {
  it('should return 100 when all scenarios survive', () => {
    const results: StressResult[] = [
      { stress_level: -0.10, stressed_value: 0, stressed_ebitda: 0, stressed_dscr: 1.5, cash_months_remaining: 99, survives: true },
      { stress_level: -0.20, stressed_value: 0, stressed_ebitda: 0, stressed_dscr: 1.2, cash_months_remaining: 99, survives: true },
      { stress_level: -0.30, stressed_value: 0, stressed_ebitda: 0, stressed_dscr: 1.1, cash_months_remaining: 99, survives: true },
    ];
    expect(calcRevenueResilienceSubScore(results)).toBe(100);
  });

  it('should return 10 when no scenarios survive', () => {
    const results: StressResult[] = [
      { stress_level: -0.10, stressed_value: 0, stressed_ebitda: 0, stressed_dscr: 0.8, cash_months_remaining: 5, survives: false },
      { stress_level: -0.20, stressed_value: 0, stressed_ebitda: 0, stressed_dscr: 0.5, cash_months_remaining: 3, survives: false },
      { stress_level: -0.30, stressed_value: 0, stressed_ebitda: 0, stressed_dscr: 0.3, cash_months_remaining: 1, survives: false },
    ];
    expect(calcRevenueResilienceSubScore(results)).toBe(10);
  });

  it('should return 50 for empty results', () => {
    expect(calcRevenueResilienceSubScore([])).toBe(50);
  });
});

describe('calcFXResilienceSubScore', () => {
  it('should return 100 for no FX exposure', () => {
    expect(calcFXResilienceSubScore([], 0.03)).toBe(100);
  });

  it('should score based on survival with FX exposure', () => {
    const results: StressResult[] = [
      { stress_level: -0.10, stressed_value: 0, stressed_ebitda: 0, stressed_dscr: 1.5, cash_months_remaining: 99, survives: true },
      { stress_level: -0.20, stressed_value: 0, stressed_ebitda: 0, stressed_dscr: 0.9, cash_months_remaining: 5, survives: false },
      { stress_level: -0.30, stressed_value: 0, stressed_ebitda: 0, stressed_dscr: 0.5, cash_months_remaining: 2, survives: false },
    ];
    const score = calcFXResilienceSubScore(results, 0.30);
    expect(score).toBe(40);
  });
});

describe('calcCombinedResilienceSubScore', () => {
  it('should return 100 when combined stress survives', () => {
    const result: StressResult = {
      stress_level: -1, stressed_value: 0, stressed_ebitda: 1_000_000,
      stressed_dscr: 1.2, cash_months_remaining: 12, survives: true,
    };
    expect(calcCombinedResilienceSubScore(result)).toBe(100);
  });

  it('should return 5 for very low DSCR', () => {
    const result: StressResult = {
      stress_level: -1, stressed_value: 0, stressed_ebitda: 100_000,
      stressed_dscr: 0.30, cash_months_remaining: 1, survives: false,
    };
    expect(calcCombinedResilienceSubScore(result)).toBe(5);
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
  it('should flag revenue stress critical when none survive', () => {
    const noSurvive: StressResult = {
      stress_level: -0.10, stressed_value: 0, stressed_ebitda: 0,
      stressed_dscr: 0.8, cash_months_remaining: 5, survives: false,
    };
    const flags = generateRiskFlags({
      revenueResults: [noSurvive, noSurvive, noSurvive],
      marginResults: [noSurvive],
      dsoResults: [noSurvive],
      fxResults: [noSurvive],
      combinedResult: { ...noSurvive, stressed_dscr: 0.3, cash_months_remaining: 1 },
      baseDscr: 0.9,
    });
    expect(flags.some((f) => f.code === 'revenue_stress_critical')).toBe(true);
  });

  it('should flag combined stress failure', () => {
    const survive: StressResult = {
      stress_level: -0.10, stressed_value: 0, stressed_ebitda: 0,
      stressed_dscr: 1.5, cash_months_remaining: 99, survives: true,
    };
    const combinedFail: StressResult = {
      stress_level: -1, stressed_value: 0, stressed_ebitda: 0,
      stressed_dscr: 0.7, cash_months_remaining: 4, survives: false,
    };
    const flags = generateRiskFlags({
      revenueResults: [survive, survive, survive],
      marginResults: [survive, survive, survive],
      dsoResults: [survive, survive, survive],
      fxResults: [survive, survive, survive],
      combinedResult: combinedFail,
      baseDscr: 1.5,
    });
    expect(flags.some((f) => f.code === 'combined_stress_failure')).toBe(true);
  });

  it('should flag base DSCR weak', () => {
    const survive: StressResult = {
      stress_level: -0.10, stressed_value: 0, stressed_ebitda: 0,
      stressed_dscr: 1.5, cash_months_remaining: 99, survives: true,
    };
    const flags = generateRiskFlags({
      revenueResults: [survive],
      marginResults: [survive],
      dsoResults: [survive],
      fxResults: [survive],
      combinedResult: survive,
      baseDscr: 0.95,
    });
    expect(flags.some((f) => f.code === 'base_dscr_weak')).toBe(true);
  });

  it('should return no flags for healthy scenario', () => {
    const survive: StressResult = {
      stress_level: -0.10, stressed_value: 0, stressed_ebitda: 0,
      stressed_dscr: 1.5, cash_months_remaining: 99, survives: true,
    };
    const flags = generateRiskFlags({
      revenueResults: [survive, survive, survive],
      marginResults: [survive, survive, survive],
      dsoResults: [survive, survive, survive],
      fxResults: [survive, survive, survive],
      combinedResult: survive,
      baseDscr: 2.0,
    });
    expect(flags.length).toBe(0);
  });
});

// ============================================================
// Trend analysis tests
// ============================================================

describe('analyzeTrends', () => {
  it('should return empty for single period', () => {
    const periods: ScenarioPeriod[] = [
      { period: '2024-01', revenue: 1_000_000, margin: 0.25, dso: 45, dscr: 1.5 },
    ];
    expect(analyzeTrends(periods)).toHaveLength(0);
  });

  it('should return trends for multiple periods', () => {
    const periods: ScenarioPeriod[] = [
      { period: '2024-01', revenue: 1_000_000, margin: 0.25, dso: 45, dscr: 1.5 },
      { period: '2024-02', revenue: 1_050_000, margin: 0.26, dso: 43, dscr: 1.6 },
      { period: '2024-03', revenue: 1_100_000, margin: 0.27, dso: 42, dscr: 1.7 },
    ];
    const trends = analyzeTrends(periods);
    expect(trends.length).toBe(3);
    expect(trends[0]!.metric_name).toBe('dscr');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runScenarioEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runScenarioEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('scenario');
  });

  it('should return blocked when revenue is zero', async () => {
    const result = await runScenarioEngine({
      ...baseInput,
      syntage_data: {
        ...makeHealthyInput(),
        base_revenue: 0,
      },
    });
    expect(result.module_status).toBe('blocked');
  });

  it('should calculate a healthy score for strong company', async () => {
    const result = await runScenarioEngine({
      ...baseInput,
      syntage_data: makeHealthyInput(),
    });
    expect(result.module_status).toBe('pass');
    expect(result.module_score).toBeGreaterThan(50);
    expect(result.module_grade).toMatch(/^[ABC]$/);
    expect(result.key_metrics['base_dscr']).toBeDefined();
    expect(result.key_metrics['worst_case_dscr']).toBeDefined();
  });

  it('should produce low score for weak company', async () => {
    const result = await runScenarioEngine({
      ...baseInput,
      syntage_data: makeWeakInput(),
    });
    expect(result.module_score).toBeLessThan(60);
    expect(result.risk_flags.length).toBeGreaterThan(0);
  });

  it('should include breaking point metrics when applicable', async () => {
    const weakInput = makeWeakInput();
    const result = await runScenarioEngine({
      ...baseInput,
      syntage_data: weakInput,
    });
    // Weak input should have at least one breaking point
    const hasBreakingPoint = result.key_metrics['revenue_breaking_point'] !== undefined
      || result.key_metrics['margin_breaking_point'] !== undefined;
    expect(hasBreakingPoint).toBe(true);
  });

  it('should include trends when periods are provided', async () => {
    const input = makeHealthyInput();
    const periods: ScenarioPeriod[] = [
      { period: '2024-01', revenue: 9_000_000, margin: 0.23, dso: 48, dscr: 2.8 },
      { period: '2024-02', revenue: 9_500_000, margin: 0.24, dso: 46, dscr: 3.0 },
      { period: '2024-03', revenue: 10_000_000, margin: 0.25, dso: 45, dscr: 3.1 },
    ];
    const result = await runScenarioEngine({
      ...baseInput,
      syntage_data: { ...input, periods },
    });
    expect(result.trends.length).toBeGreaterThan(0);
  });
});
