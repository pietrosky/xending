import { describe, it, expect } from 'vitest';
import {
  findSectorLimit,
  validateLimits,
  calcEffectiveGuaranteeRatio,
  evaluateHardStops,
  selectApplicableCovenants,
  validatePolicy,
  calcPolicyScore,
  generateRiskFlags,
  buildKeyMetrics,
  buildPolicySet,
  runPolicyEngine,
  DEFAULT_SECTOR_LIMITS,
  DEFAULT_GUARANTEE_POLICY,
  DEFAULT_HARD_STOPS,
  DEFAULT_COVENANT_TEMPLATES,
} from './policyEngine';
import type {
  PolicyEngineInput,
  PolicyValidationResult,
  SectorLimitConfig,
} from './policyEngine';
import type { EngineInput, RiskFlag, HardStopRule } from '../types/engine.types';

// ============================================================
// Helpers
// ============================================================

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: {},
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function basePolicyInput(overrides: Partial<PolicyEngineInput> = {}): PolicyEngineInput {
  return {
    requested_amount: 1_000_000,
    term_months: 24,
    currency: 'MXN',
    sector: 'services',
    consolidated_score: 72,
    grade: 'C',
    risk_flags: [],
    ...overrides,
  };
}

function baseValidationResult(overrides: Partial<PolicyValidationResult> = {}): PolicyValidationResult {
  return {
    is_within_limits: true,
    limit_violations: [],
    effective_guarantee_ratio: 2.0,
    active_hard_stops: [],
    applicable_covenants: [],
    ...overrides,
  };
}

// ============================================================
// findSectorLimit
// ============================================================

describe('findSectorLimit', () => {
  it('finds exact sector + currency match', () => {
    const result = findSectorLimit(DEFAULT_SECTOR_LIMITS, 'manufacturing', 'MXN');
    expect(result).toBeDefined();
    expect(result?.sector).toBe('manufacturing');
    expect(result?.currency).toBe('MXN');
  });

  it('finds USD limit for a sector', () => {
    const result = findSectorLimit(DEFAULT_SECTOR_LIMITS, 'services', 'USD');
    expect(result).toBeDefined();
    expect(result?.sector).toBe('services');
    expect(result?.currency).toBe('USD');
  });

  it('falls back to default sector when no exact match', () => {
    const result = findSectorLimit(DEFAULT_SECTOR_LIMITS, 'agriculture', 'MXN');
    expect(result).toBeDefined();
    expect(result?.sector).toBe('default');
  });

  it('returns undefined when no match at all', () => {
    const result = findSectorLimit(DEFAULT_SECTOR_LIMITS, 'agriculture', 'EUR');
    expect(result).toBeUndefined();
  });
});

// ============================================================
// validateLimits
// ============================================================

describe('validateLimits', () => {
  const limit: SectorLimitConfig = {
    sector: 'services',
    max_amount: 5_000_000,
    min_amount: 50_000,
    max_term_months: 48,
    currency: 'MXN',
  };

  it('returns no violations for valid request', () => {
    const violations = validateLimits(limit, 1_000_000, 24);
    expect(violations).toHaveLength(0);
  });

  it('flags amount below minimum', () => {
    const violations = validateLimits(limit, 10_000, 24);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('below minimum');
  });

  it('flags amount above maximum', () => {
    const violations = validateLimits(limit, 10_000_000, 24);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('exceeds maximum');
  });

  it('flags term exceeding maximum', () => {
    const violations = validateLimits(limit, 1_000_000, 60);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('exceeds maximum');
    expect(violations[0]).toContain('months');
  });

  it('returns multiple violations when both amount and term exceed', () => {
    const violations = validateLimits(limit, 10_000_000, 60);
    expect(violations).toHaveLength(2);
  });

  it('returns violation when no sector limit configured', () => {
    const violations = validateLimits(undefined, 1_000_000, 24);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain('No policy limit configured');
  });

  it('accepts exact boundary values', () => {
    expect(validateLimits(limit, 50_000, 48)).toHaveLength(0);
    expect(validateLimits(limit, 5_000_000, 48)).toHaveLength(0);
  });
});

// ============================================================
// calcEffectiveGuaranteeRatio
// ============================================================

describe('calcEffectiveGuaranteeRatio', () => {
  it('returns base ratio for mid-range score, neutral sector, short term', () => {
    const ratio = calcEffectiveGuaranteeRatio(DEFAULT_GUARANTEE_POLICY, 70, 'services', 12);
    expect(ratio).toBe(2.0);
  });

  it('reduces ratio for high score', () => {
    const ratio = calcEffectiveGuaranteeRatio(DEFAULT_GUARANTEE_POLICY, 85, 'services', 12);
    expect(ratio).toBe(1.75);
  });

  it('increases ratio for low score', () => {
    const ratio = calcEffectiveGuaranteeRatio(DEFAULT_GUARANTEE_POLICY, 40, 'services', 12);
    expect(ratio).toBe(2.5);
  });

  it('applies sector adjustment for manufacturing (reduces)', () => {
    const ratio = calcEffectiveGuaranteeRatio(DEFAULT_GUARANTEE_POLICY, 70, 'manufacturing', 12);
    expect(ratio).toBe(1.9);
  });

  it('applies sector adjustment for commerce (increases)', () => {
    const ratio = calcEffectiveGuaranteeRatio(DEFAULT_GUARANTEE_POLICY, 70, 'commerce', 12);
    expect(ratio).toBe(2.1);
  });

  it('applies term adjustment for long terms', () => {
    const ratio = calcEffectiveGuaranteeRatio(DEFAULT_GUARANTEE_POLICY, 70, 'services', 48);
    expect(ratio).toBe(2.25);
  });

  it('combines all adjustments', () => {
    // score 40 (+0.50) + commerce (+0.10) + 48m (+0.25) = 2.0 + 0.85 = 2.85
    const ratio = calcEffectiveGuaranteeRatio(DEFAULT_GUARANTEE_POLICY, 40, 'commerce', 48);
    expect(ratio).toBe(2.85);
  });

  it('never goes below 1.0x', () => {
    // score 90 (-0.25) + manufacturing (-0.10) + 6m (0) = 2.0 - 0.35 = 1.65
    const ratio = calcEffectiveGuaranteeRatio(DEFAULT_GUARANTEE_POLICY, 90, 'manufacturing', 6);
    expect(ratio).toBeGreaterThanOrEqual(1.0);
  });

  it('handles unknown sector with no adjustment', () => {
    const ratio = calcEffectiveGuaranteeRatio(DEFAULT_GUARANTEE_POLICY, 70, 'agriculture', 12);
    expect(ratio).toBe(2.0);
  });
});

// ============================================================
// evaluateHardStops
// ============================================================

describe('evaluateHardStops', () => {
  it('returns empty when no risk flags match', () => {
    const result = evaluateHardStops(DEFAULT_HARD_STOPS, []);
    expect(result).toHaveLength(0);
  });

  it('matches hard stop by code', () => {
    const flags: RiskFlag[] = [
      { code: 'compliance_fail', severity: 'hard_stop', message: 'Compliance failed' },
    ];
    const result = evaluateHardStops(DEFAULT_HARD_STOPS, flags);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((h) => h.code === 'compliance_fail')).toBe(true);
  });

  it('matches hard stop by engine source metric', () => {
    const flags: RiskFlag[] = [
      { code: 'some_flag', severity: 'hard_stop', message: 'test', source_metric: 'cashflow' },
    ];
    const result = evaluateHardStops(DEFAULT_HARD_STOPS, flags);
    expect(result.some((h) => h.engine === 'cashflow')).toBe(true);
  });

  it('ignores inactive hard stop rules', () => {
    const customStops: HardStopRule[] = [
      { code: 'test_stop', description: 'Test', engine: 'test', condition: 'true', active: false },
    ];
    const flags: RiskFlag[] = [
      { code: 'test_stop', severity: 'hard_stop', message: 'test' },
    ];
    const result = evaluateHardStops(customStops, flags);
    expect(result).toHaveLength(0);
  });

  it('does not match non-hard_stop severity flags by source_metric', () => {
    const flags: RiskFlag[] = [
      { code: 'warning_flag', severity: 'warning', message: 'test', source_metric: 'cashflow' },
    ];
    const result = evaluateHardStops(DEFAULT_HARD_STOPS, flags);
    expect(result).toHaveLength(0);
  });
});

// ============================================================
// selectApplicableCovenants
// ============================================================

describe('selectApplicableCovenants', () => {
  it('returns no covenants for high score A grade MXN', () => {
    const result = selectApplicableCovenants(DEFAULT_COVENANT_TEMPLATES, 85, 'A', false);
    expect(result).toHaveLength(0);
  });

  it('adds min_dscr for score < 80', () => {
    const result = selectApplicableCovenants(DEFAULT_COVENANT_TEMPLATES, 75, 'B', false);
    expect(result.some((c) => c.code === 'min_dscr')).toBe(true);
  });

  it('adds max_leverage for score < 65', () => {
    const result = selectApplicableCovenants(DEFAULT_COVENANT_TEMPLATES, 60, 'C', false);
    expect(result.some((c) => c.code === 'max_leverage')).toBe(true);
  });

  it('adds guarantee coverage for C/D grades', () => {
    const resultC = selectApplicableCovenants(DEFAULT_COVENANT_TEMPLATES, 55, 'C', false);
    expect(resultC.some((c) => c.code === 'min_guarantee_coverage')).toBe(true);

    const resultD = selectApplicableCovenants(DEFAULT_COVENANT_TEMPLATES, 40, 'D', false);
    expect(resultD.some((c) => c.code === 'min_guarantee_coverage')).toBe(true);
  });

  it('adds monthly reporting for D/F grades', () => {
    const result = selectApplicableCovenants(DEFAULT_COVENANT_TEMPLATES, 30, 'F', false);
    expect(result.some((c) => c.code === 'monthly_reporting')).toBe(true);
  });

  it('adds dividend restriction for score < 60', () => {
    const result = selectApplicableCovenants(DEFAULT_COVENANT_TEMPLATES, 55, 'D', false);
    expect(result.some((c) => c.code === 'no_dividend_restriction')).toBe(true);
  });

  it('adds FX hedge obligation for USD exposure', () => {
    const result = selectApplicableCovenants(DEFAULT_COVENANT_TEMPLATES, 85, 'A', true);
    expect(result.some((c) => c.code === 'fx_hedge_obligation')).toBe(true);
  });

  it('accumulates multiple covenants for low score', () => {
    const result = selectApplicableCovenants(DEFAULT_COVENANT_TEMPLATES, 35, 'D', true);
    // min_dscr + max_leverage + min_guarantee_coverage + monthly_reporting + no_dividend_restriction + fx_hedge
    expect(result.length).toBeGreaterThanOrEqual(5);
  });
});

// ============================================================
// validatePolicy (integration of all helpers)
// ============================================================

describe('validatePolicy', () => {
  const policySet = buildPolicySet();

  it('validates a healthy application', () => {
    const result = validatePolicy(policySet, basePolicyInput({ consolidated_score: 80, grade: 'A' }));
    expect(result.is_within_limits).toBe(true);
    expect(result.limit_violations).toHaveLength(0);
    expect(result.active_hard_stops).toHaveLength(0);
    expect(result.effective_guarantee_ratio).toBeLessThanOrEqual(2.0);
  });

  it('detects limit violations', () => {
    const result = validatePolicy(policySet, basePolicyInput({ requested_amount: 10_000_000 }));
    expect(result.is_within_limits).toBe(false);
    expect(result.limit_violations.length).toBeGreaterThan(0);
  });

  it('adjusts guarantee ratio for low score', () => {
    const result = validatePolicy(policySet, basePolicyInput({ consolidated_score: 40, grade: 'D' }));
    expect(result.effective_guarantee_ratio).toBeGreaterThan(2.0);
  });

  it('selects covenants based on grade', () => {
    const result = validatePolicy(policySet, basePolicyInput({ consolidated_score: 55, grade: 'C' }));
    expect(result.applicable_covenants.length).toBeGreaterThan(0);
  });
});

// ============================================================
// calcPolicyScore
// ============================================================

describe('calcPolicyScore', () => {
  it('returns 100 for perfect result', () => {
    expect(calcPolicyScore(baseValidationResult())).toBe(100);
  });

  it('penalizes limit violations', () => {
    const score = calcPolicyScore(baseValidationResult({ limit_violations: ['violation 1'] }));
    expect(score).toBe(75);
  });

  it('penalizes hard stops', () => {
    const hs: HardStopRule = { code: 'test', description: 'test', engine: 'test', condition: 'true', active: true };
    const score = calcPolicyScore(baseValidationResult({ active_hard_stops: [hs] }));
    expect(score).toBe(70);
  });

  it('penalizes high guarantee ratio', () => {
    const score = calcPolicyScore(baseValidationResult({ effective_guarantee_ratio: 2.6 }));
    expect(score).toBe(85);
  });

  it('penalizes many covenants', () => {
    const covenants = DEFAULT_COVENANT_TEMPLATES.slice(0, 5);
    const score = calcPolicyScore(baseValidationResult({ applicable_covenants: covenants }));
    expect(score).toBe(90);
  });

  it('never goes below 0', () => {
    const hs: HardStopRule = { code: 'test', description: 'test', engine: 'test', condition: 'true', active: true };
    const score = calcPolicyScore(baseValidationResult({
      limit_violations: ['v1', 'v2', 'v3'],
      active_hard_stops: [hs, hs, hs],
    }));
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// generateRiskFlags
// ============================================================

describe('generateRiskFlags', () => {
  it('returns no flags for clean result', () => {
    const flags = generateRiskFlags(baseValidationResult());
    expect(flags).toHaveLength(0);
  });

  it('generates hard_stop flags', () => {
    const hs: HardStopRule = { code: 'compliance_fail', description: 'Compliance failed', engine: 'compliance', condition: 'true', active: true };
    const flags = generateRiskFlags(baseValidationResult({ active_hard_stops: [hs] }));
    expect(flags.some((f) => f.severity === 'hard_stop')).toBe(true);
  });

  it('generates limit violation flags', () => {
    const flags = generateRiskFlags(baseValidationResult({ limit_violations: ['Amount exceeds max'] }));
    expect(flags.some((f) => f.code === 'policy_limit_violation')).toBe(true);
  });

  it('generates elevated guarantee flag', () => {
    const flags = generateRiskFlags(baseValidationResult({ effective_guarantee_ratio: 2.6 }));
    expect(flags.some((f) => f.code === 'elevated_guarantee_requirement')).toBe(true);
  });

  it('generates heavy covenant burden flag', () => {
    const covenants = DEFAULT_COVENANT_TEMPLATES.slice(0, 5);
    const flags = generateRiskFlags(baseValidationResult({ applicable_covenants: covenants }));
    expect(flags.some((f) => f.code === 'heavy_covenant_burden')).toBe(true);
  });
});

// ============================================================
// buildKeyMetrics
// ============================================================

describe('buildKeyMetrics', () => {
  it('builds metrics for a clean result', () => {
    const metrics = buildKeyMetrics(baseValidationResult(), basePolicyInput());
    expect(metrics['is_within_limits']).toBeDefined();
    expect(metrics['is_within_limits']?.value).toBe(1);
    expect(metrics['effective_guarantee_ratio']).toBeDefined();
    expect(metrics['active_hard_stops']).toBeDefined();
    expect(metrics['applicable_covenants']).toBeDefined();
    expect(metrics['consolidated_score']).toBeDefined();
  });

  it('reflects violations in metrics', () => {
    const metrics = buildKeyMetrics(
      baseValidationResult({ is_within_limits: false, limit_violations: ['test'] }),
      basePolicyInput(),
    );
    expect(metrics['is_within_limits']?.value).toBe(0);
    expect(metrics['is_within_limits']?.impact_on_score).toBe('negative');
  });
});

// ============================================================
// buildPolicySet
// ============================================================

describe('buildPolicySet', () => {
  it('returns defaults when no overrides', () => {
    const ps = buildPolicySet();
    expect(ps.sector_limits).toBe(DEFAULT_SECTOR_LIMITS);
    expect(ps.guarantee_policy).toBe(DEFAULT_GUARANTEE_POLICY);
    expect(ps.hard_stops).toBe(DEFAULT_HARD_STOPS);
    expect(ps.covenant_templates).toBe(DEFAULT_COVENANT_TEMPLATES);
  });

  it('applies overrides selectively', () => {
    const customLimits: SectorLimitConfig[] = [
      { sector: 'custom', max_amount: 999, min_amount: 1, max_term_months: 12, currency: 'MXN' },
    ];
    const ps = buildPolicySet({ sector_limits: customLimits });
    expect(ps.sector_limits).toBe(customLimits);
    expect(ps.guarantee_policy).toBe(DEFAULT_GUARANTEE_POLICY);
  });
});

// ============================================================
// runPolicyEngine (integration)
// ============================================================

describe('runPolicyEngine', () => {
  it('returns pass for a healthy application within limits', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-1',
      policy_config: defaultPolicyConfig,
      requested_amount: 1_000_000,
      term_months: 24,
      currency: 'MXN',
      sector: 'services',
      consolidated_score: 80,
      grade: 'A',
      risk_flags: [],
    };

    const result = await runPolicyEngine(input);

    expect(result.engine_name).toBe('policy_engine');
    expect(result.module_status).toBe('pass');
    expect(result.module_score).toBeGreaterThanOrEqual(80);
    expect(result.key_metrics['is_within_limits']?.value).toBe(1);
  });

  it('detects limit violations for excessive amount', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-2',
      policy_config: defaultPolicyConfig,
      requested_amount: 20_000_000,
      term_months: 24,
      currency: 'MXN',
      sector: 'services',
      consolidated_score: 70,
      grade: 'C',
    };

    const result = await runPolicyEngine(input);

    expect(result.key_metrics['is_within_limits']?.value).toBe(0);
    expect(result.risk_flags.some((f) => f.code === 'policy_limit_violation')).toBe(true);
  });

  it('increases guarantee ratio for low score', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-3',
      policy_config: defaultPolicyConfig,
      requested_amount: 500_000,
      term_months: 24,
      currency: 'MXN',
      sector: 'services',
      consolidated_score: 40,
      grade: 'D',
    };

    const result = await runPolicyEngine(input);

    expect(result.key_metrics['effective_guarantee_ratio']?.value).toBeGreaterThan(2.0);
  });

  it('assigns covenants for conditional approval grades', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-4',
      policy_config: defaultPolicyConfig,
      requested_amount: 500_000,
      term_months: 24,
      currency: 'MXN',
      sector: 'services',
      consolidated_score: 55,
      grade: 'C',
    };

    const result = await runPolicyEngine(input);

    expect(result.key_metrics['applicable_covenants']?.value).toBeGreaterThan(0);
  });

  it('triggers hard stop when matching risk flags present', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-5',
      policy_config: defaultPolicyConfig,
      requested_amount: 500_000,
      term_months: 24,
      currency: 'MXN',
      sector: 'services',
      consolidated_score: 60,
      grade: 'C',
      risk_flags: [
        { code: 'compliance_fail', severity: 'hard_stop', message: 'PLD check failed' },
      ],
    };

    const result = await runPolicyEngine(input);

    expect(result.module_status).toBe('blocked');
    expect(result.risk_flags.some((f) => f.severity === 'hard_stop')).toBe(true);
  });

  it('adds FX hedge covenant for USD applications', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-6',
      policy_config: defaultPolicyConfig,
      requested_amount: 100_000,
      term_months: 24,
      currency: 'USD',
      sector: 'services',
      consolidated_score: 75,
      grade: 'B',
    };

    const result = await runPolicyEngine(input);

    expect(result.explanation).toContain('fx_hedge_obligation');
  });

  it('handles minimal input gracefully', async () => {
    const input: EngineInput = {
      application_id: 'test-7',
      policy_config: defaultPolicyConfig,
    };

    const result = await runPolicyEngine(input);

    expect(result.engine_name).toBe('policy_engine');
    expect(result.module_score).toBeDefined();
    expect(result.created_at).toBeDefined();
  });

  it('accepts policy overrides', async () => {
    const customLimits: SectorLimitConfig[] = [
      { sector: 'default', max_amount: 100, min_amount: 1, max_term_months: 6, currency: 'MXN' },
    ];
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-8',
      policy_config: defaultPolicyConfig,
      requested_amount: 500,
      term_months: 3,
      currency: 'MXN',
      sector: 'default',
      consolidated_score: 80,
      grade: 'A',
      policy_overrides: { sector_limits: customLimits },
    };

    const result = await runPolicyEngine(input);

    // 500 > max 100, so should have violation
    expect(result.key_metrics['is_within_limits']?.value).toBe(0);
  });
});
