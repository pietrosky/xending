import { describe, it, expect } from 'vitest';
import {
  checkCovenantStatus,
  calcComplianceRate,
  calcBreachSeverity,
  calcAvgHeadroom,
  calcComplianceSubScore,
  calcBreachSeveritySubScore,
  calcTrendQualitySubScore,
  calcCoverageSubScore,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runCovenantEngine,
} from './covenantEngine';
import type { Covenant, CovenantPeriod } from './covenantEngine';
import type { EngineInput } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { covenant: 0.05 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeCovenant(overrides: Partial<Covenant> = {}): Covenant {
  return {
    type: 'financial',
    name: 'dscr',
    threshold: 1.25,
    current_value: 1.50,
    higher_is_better: true,
    ...overrides,
  };
}

function makeCompliantSet(): Covenant[] {
  return [
    makeCovenant({ name: 'dscr', threshold: 1.25, current_value: 1.80, higher_is_better: true }),
    makeCovenant({ name: 'leverage', type: 'financial', threshold: 0.60, current_value: 0.40, higher_is_better: false }),
    makeCovenant({ name: 'current_ratio', type: 'financial', threshold: 1.50, current_value: 2.00, higher_is_better: true }),
    makeCovenant({ name: 'revenue_growth', type: 'operational', threshold: 0.05, current_value: 0.12, higher_is_better: true }),
    makeCovenant({ name: 'timely_delivery', type: 'reporting', threshold: 1, current_value: 1.20, higher_is_better: true }),
  ];
}

function makeBreachedSet(): Covenant[] {
  return [
    makeCovenant({ name: 'dscr', threshold: 1.25, current_value: 0.90, higher_is_better: true }),
    makeCovenant({ name: 'leverage', type: 'financial', threshold: 0.60, current_value: 0.85, higher_is_better: false }),
    makeCovenant({ name: 'current_ratio', type: 'financial', threshold: 1.50, current_value: 1.00, higher_is_better: true }),
    makeCovenant({ name: 'revenue_growth', type: 'operational', threshold: 0.05, current_value: -0.03, higher_is_better: true }),
    makeCovenant({ name: 'timely_delivery', type: 'reporting', threshold: 1, current_value: 0, higher_is_better: true }),
  ];
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('checkCovenantStatus', () => {
  it('should return compliant when value exceeds threshold (higher_is_better)', () => {
    const c = makeCovenant({ threshold: 1.25, current_value: 1.80, higher_is_better: true });
    expect(checkCovenantStatus(c)).toBe('compliant');
  });

  it('should return warning when value is within 10% above threshold (higher_is_better)', () => {
    // threshold=1.25, warning bound=1.375, value=1.30 is between 1.25 and 1.375
    const c = makeCovenant({ threshold: 1.25, current_value: 1.30, higher_is_better: true });
    expect(checkCovenantStatus(c)).toBe('warning');
  });

  it('should return breach when value is below threshold (higher_is_better)', () => {
    const c = makeCovenant({ threshold: 1.25, current_value: 1.00, higher_is_better: true });
    expect(checkCovenantStatus(c)).toBe('breach');
  });

  it('should return compliant when value is below threshold (lower_is_better)', () => {
    const c = makeCovenant({ threshold: 0.60, current_value: 0.40, higher_is_better: false });
    expect(checkCovenantStatus(c)).toBe('compliant');
  });

  it('should return warning when value is within 10% below threshold (lower_is_better)', () => {
    // threshold=0.60, warning bound=0.54, value=0.55 is between 0.54 and 0.60
    const c = makeCovenant({ threshold: 0.60, current_value: 0.55, higher_is_better: false });
    expect(checkCovenantStatus(c)).toBe('warning');
  });

  it('should return breach when value exceeds threshold (lower_is_better)', () => {
    const c = makeCovenant({ threshold: 0.60, current_value: 0.80, higher_is_better: false });
    expect(checkCovenantStatus(c)).toBe('breach');
  });

  it('should return waived when covenant is waived', () => {
    const c = makeCovenant({ current_value: 0.50, threshold: 1.25, waived: true });
    expect(checkCovenantStatus(c)).toBe('waived');
  });

  it('should return compliant when threshold is 0', () => {
    const c = makeCovenant({ threshold: 0, current_value: 5 });
    expect(checkCovenantStatus(c)).toBe('compliant');
  });
});

describe('calcComplianceRate', () => {
  it('should return 1 for all compliant covenants', () => {
    const covenants = makeCompliantSet();
    expect(calcComplianceRate(covenants)).toBe(1);
  });

  it('should return 0 for all breached covenants', () => {
    const covenants = makeBreachedSet();
    expect(calcComplianceRate(covenants)).toBe(0);
  });

  it('should return 1 for empty array', () => {
    expect(calcComplianceRate([])).toBe(1);
  });

  it('should count waived as compliant', () => {
    const covenants = [
      makeCovenant({ current_value: 0.50, threshold: 1.25, waived: true }),
    ];
    expect(calcComplianceRate(covenants)).toBe(1);
  });
});

describe('calcBreachSeverity', () => {
  it('should return 0 for no breaches', () => {
    expect(calcBreachSeverity(makeCompliantSet())).toBe(0);
  });

  it('should return positive value for breached covenants', () => {
    const severity = calcBreachSeverity(makeBreachedSet());
    expect(severity).toBeGreaterThan(0);
  });
});

describe('calcAvgHeadroom', () => {
  it('should return positive headroom for compliant covenants', () => {
    const headroom = calcAvgHeadroom(makeCompliantSet());
    expect(headroom).toBeGreaterThan(0);
  });

  it('should return 0 for empty array', () => {
    expect(calcAvgHeadroom([])).toBe(0);
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcComplianceSubScore', () => {
  it('should return 100 for perfect compliance', () => {
    expect(calcComplianceSubScore(1.0)).toBe(100);
  });

  it('should return 85 for 90%+ compliance', () => {
    expect(calcComplianceSubScore(0.92)).toBe(85);
  });

  it('should return 5 for very low compliance', () => {
    expect(calcComplianceSubScore(0.10)).toBe(5);
  });
});

describe('calcBreachSeveritySubScore', () => {
  it('should return 100 for no severity', () => {
    expect(calcBreachSeveritySubScore(0)).toBe(100);
  });

  it('should return 5 for very high severity', () => {
    expect(calcBreachSeveritySubScore(0.80)).toBe(5);
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

describe('calcCoverageSubScore', () => {
  it('should return 100 for all 3 types covered', () => {
    const covenants = [
      makeCovenant({ type: 'financial' }),
      makeCovenant({ type: 'operational', name: 'revenue_growth' }),
      makeCovenant({ type: 'reporting', name: 'timely_delivery' }),
    ];
    expect(calcCoverageSubScore(covenants)).toBe(100);
  });

  it('should return 70 for 2 types covered', () => {
    const covenants = [
      makeCovenant({ type: 'financial' }),
      makeCovenant({ type: 'operational', name: 'revenue_growth' }),
    ];
    expect(calcCoverageSubScore(covenants)).toBe(70);
  });

  it('should return 0 for empty covenants', () => {
    expect(calcCoverageSubScore([])).toBe(0);
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
  it('should flag breached covenants', () => {
    const covenants = [
      makeCovenant({ name: 'dscr', threshold: 1.25, current_value: 0.90, higher_is_better: true }),
    ];
    const flags = generateRiskFlags({
      covenants,
      complianceRate: 0,
      breachSeverity: 0.28,
    });
    expect(flags.some((f) => f.code === 'covenant_breach_dscr')).toBe(true);
  });

  it('should flag warning covenants', () => {
    const covenants = [
      makeCovenant({ name: 'dscr', threshold: 1.25, current_value: 1.30, higher_is_better: true }),
    ];
    const flags = generateRiskFlags({
      covenants,
      complianceRate: 0.80,
      breachSeverity: 0,
    });
    expect(flags.some((f) => f.code === 'covenant_warning_dscr')).toBe(true);
  });

  it('should flag low compliance', () => {
    const flags = generateRiskFlags({
      covenants: [],
      complianceRate: 0.30,
      breachSeverity: 0,
    });
    expect(flags.some((f) => f.code === 'low_covenant_compliance')).toBe(true);
  });

  it('should flag severe breach', () => {
    const flags = generateRiskFlags({
      covenants: [],
      complianceRate: 0.80,
      breachSeverity: 0.40,
    });
    expect(flags.some((f) => f.code === 'severe_covenant_breach')).toBe(true);
  });

  it('should return no flags for healthy covenants', () => {
    const covenants = makeCompliantSet();
    const flags = generateRiskFlags({
      covenants,
      complianceRate: 1,
      breachSeverity: 0,
    });
    expect(flags.length).toBe(0);
  });
});

// ============================================================
// Trend analysis tests
// ============================================================

describe('analyzeTrends', () => {
  it('should return empty for single period', () => {
    const periods: CovenantPeriod[] = [
      { period: '2024-01', covenants: makeCompliantSet() },
    ];
    expect(analyzeTrends(periods)).toHaveLength(0);
  });

  it('should return trends for multiple periods', () => {
    const periods: CovenantPeriod[] = [
      { period: '2024-01', covenants: makeCompliantSet() },
      { period: '2024-02', covenants: makeCompliantSet() },
      { period: '2024-03', covenants: makeCompliantSet() },
    ];
    const trends = analyzeTrends(periods);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]!.metric_name).toBe('compliance_rate');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runCovenantEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runCovenantEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('covenant');
  });

  it('should return blocked when covenants array is empty', async () => {
    const result = await runCovenantEngine({
      ...baseInput,
      syntage_data: { covenants: [], periods: [] },
    });
    expect(result.module_status).toBe('blocked');
  });

  it('should calculate a healthy score for compliant covenants', async () => {
    const covenants = makeCompliantSet();
    const periods: CovenantPeriod[] = [
      { period: '2024-01', covenants: makeCompliantSet() },
      { period: '2024-02', covenants: makeCompliantSet() },
      { period: '2024-03', covenants: makeCompliantSet() },
    ];
    const result = await runCovenantEngine({
      ...baseInput,
      syntage_data: { covenants, periods },
    });
    expect(result.module_score).toBeGreaterThan(50);
    expect(result.module_grade).toMatch(/^[ABC]$/);
    expect(result.key_metrics['compliance_rate']).toBeDefined();
    expect(result.key_metrics['breach_count']).toBeDefined();
  });

  it('should flag breaches for non-compliant covenants', async () => {
    const covenants = makeBreachedSet();
    const result = await runCovenantEngine({
      ...baseInput,
      syntage_data: { covenants, periods: [] },
    });
    expect(result.risk_flags.some((f) => f.code.startsWith('covenant_breach_'))).toBe(true);
    expect(result.module_score).toBeLessThan(50);
  });

  it('should handle waived covenants correctly', async () => {
    const covenants = [
      makeCovenant({ name: 'dscr', threshold: 1.25, current_value: 0.90, waived: true }),
      makeCovenant({ name: 'leverage', type: 'financial', threshold: 0.60, current_value: 0.40, higher_is_better: false }),
    ];
    const result = await runCovenantEngine({
      ...baseInput,
      syntage_data: { covenants, periods: [] },
    });
    // Waived + compliant = 100% compliance
    expect(result.key_metrics['compliance_rate']!.value).toBe(1);
  });
});
