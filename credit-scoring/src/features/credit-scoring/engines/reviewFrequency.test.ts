import { describe, it, expect } from 'vitest';
import {
  assignFrequency,
  determineEscalation,
  calcNextReviewDate,
  evaluateTriggers,
  applyFrequencyOverrides,
  calcEngineScore,
  generateRiskFlags,
  buildKeyMetrics,
  runReviewFrequencyEngine,
} from './reviewFrequency';
import type {
  ReviewFrequencyInput,
  ReviewFrequencyResult,
} from './reviewFrequency';
import type { EngineInput, RiskFlag } from '../types/engine.types';

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

function baseInput(overrides: Partial<ReviewFrequencyInput> = {}): ReviewFrequencyInput {
  return {
    consolidated_score: 72,
    grade: 'C',
    ...overrides,
  };
}

// ============================================================
// assignFrequency
// ============================================================

describe('assignFrequency', () => {
  it('returns 12 months for score >= 75', () => {
    expect(assignFrequency(75)).toBe(12);
    expect(assignFrequency(90)).toBe(12);
    expect(assignFrequency(100)).toBe(12);
  });

  it('returns 6 months for score 60-74', () => {
    expect(assignFrequency(60)).toBe(6);
    expect(assignFrequency(74)).toBe(6);
  });

  it('returns 3 months for score 50-59', () => {
    expect(assignFrequency(50)).toBe(3);
    expect(assignFrequency(59)).toBe(3);
  });

  it('returns 1 month for score < 50', () => {
    expect(assignFrequency(49)).toBe(1);
    expect(assignFrequency(0)).toBe(1);
  });
});

// ============================================================
// determineEscalation
// ============================================================

describe('determineEscalation', () => {
  it('returns standard for 12-month frequency with no triggers', () => {
    expect(determineEscalation(12, 0)).toBe('standard');
  });

  it('returns elevated for 6-month frequency', () => {
    expect(determineEscalation(6, 0)).toBe('elevated');
  });

  it('returns elevated when 1 trigger fires on 12-month', () => {
    expect(determineEscalation(12, 1)).toBe('elevated');
  });

  it('returns high for 3-month frequency', () => {
    expect(determineEscalation(3, 0)).toBe('high');
  });

  it('returns high when 2 triggers fire', () => {
    expect(determineEscalation(12, 2)).toBe('high');
  });

  it('returns critical for 1-month frequency', () => {
    expect(determineEscalation(1, 0)).toBe('critical');
  });

  it('returns critical when 3+ triggers fire', () => {
    expect(determineEscalation(12, 3)).toBe('critical');
  });
});

// ============================================================
// calcNextReviewDate
// ============================================================

describe('calcNextReviewDate', () => {
  it('adds frequency months to the given date', () => {
    const from = new Date('2025-01-15T00:00:00Z');
    const result = calcNextReviewDate(6, from);
    expect(result).toContain('2025-07');
  });

  it('handles 1-month frequency', () => {
    const from = new Date('2025-06-01T00:00:00Z');
    const result = calcNextReviewDate(1, from);
    expect(result).toContain('2025-07');
  });

  it('handles 12-month frequency', () => {
    const from = new Date('2025-01-01T00:00:00Z');
    const result = calcNextReviewDate(12, from);
    expect(result).toContain('2026-01');
  });
});

// ============================================================
// evaluateTriggers
// ============================================================

describe('evaluateTriggers', () => {
  it('flags DSCR below 1.2', () => {
    const triggers = evaluateTriggers(baseInput({ dscr: 1.1 }));
    const dscr = triggers.find((t) => t.code === 'dscr_below_threshold');
    expect(dscr?.is_active).toBe(true);
  });

  it('does not flag DSCR at 1.2 or above', () => {
    const triggers = evaluateTriggers(baseInput({ dscr: 1.2 }));
    const dscr = triggers.find((t) => t.code === 'dscr_below_threshold');
    expect(dscr?.is_active).toBe(false);
  });

  it('flags score drop > 10 points', () => {
    const triggers = evaluateTriggers(
      baseInput({ consolidated_score: 60, previous_score: 75 }),
    );
    const drop = triggers.find((t) => t.code === 'score_drop');
    expect(drop?.is_active).toBe(true);
  });

  it('does not flag score drop of exactly 10', () => {
    const triggers = evaluateTriggers(
      baseInput({ consolidated_score: 65, previous_score: 75 }),
    );
    const drop = triggers.find((t) => t.code === 'score_drop');
    expect(drop?.is_active).toBe(false);
  });

  it('flags hard-stop risk flags', () => {
    const hardStopFlag: RiskFlag = {
      code: 'test_hard_stop',
      severity: 'hard_stop',
      message: 'test',
    };
    const triggers = evaluateTriggers(
      baseInput({ risk_flags: [hardStopFlag] }),
    );
    const hs = triggers.find((t) => t.code === 'new_hard_stop');
    expect(hs?.is_active).toBe(true);
  });

  it('flags covenant breach', () => {
    const triggers = evaluateTriggers(
      baseInput({ has_covenant_breach: true }),
    );
    const cb = triggers.find((t) => t.code === 'covenant_breach');
    expect(cb?.is_active).toBe(true);
  });

  it('flags payment delay > 30 days', () => {
    const triggers = evaluateTriggers(
      baseInput({ max_payment_delay_days: 45 }),
    );
    const pd = triggers.find((t) => t.code === 'payment_delay');
    expect(pd?.is_active).toBe(true);
  });

  it('does not flag payment delay of 30 days', () => {
    const triggers = evaluateTriggers(
      baseInput({ max_payment_delay_days: 30 }),
    );
    const pd = triggers.find((t) => t.code === 'payment_delay');
    expect(pd?.is_active).toBe(false);
  });

  it('flags buro score drop > 50 points', () => {
    const triggers = evaluateTriggers(
      baseInput({ buro_score: 650, previous_buro_score: 710 }),
    );
    const bd = triggers.find((t) => t.code === 'buro_score_drop');
    expect(bd?.is_active).toBe(true);
  });

  it('does not flag buro score drop of exactly 50', () => {
    const triggers = evaluateTriggers(
      baseInput({ buro_score: 660, previous_buro_score: 710 }),
    );
    const bd = triggers.find((t) => t.code === 'buro_score_drop');
    expect(bd?.is_active).toBe(false);
  });

  it('flags new legal incidents', () => {
    const triggers = evaluateTriggers(
      baseInput({ has_new_legal_incidents: true }),
    );
    const li = triggers.find((t) => t.code === 'new_legal_incidents');
    expect(li?.is_active).toBe(true);
  });

  it('flags revenue decline > 20%', () => {
    const triggers = evaluateTriggers(
      baseInput({ revenue_change_pct: -25 }),
    );
    const rd = triggers.find((t) => t.code === 'revenue_decline');
    expect(rd?.is_active).toBe(true);
  });

  it('does not flag revenue decline of exactly -20%', () => {
    const triggers = evaluateTriggers(
      baseInput({ revenue_change_pct: -20 }),
    );
    const rd = triggers.find((t) => t.code === 'revenue_decline');
    expect(rd?.is_active).toBe(false);
  });

  it('returns no active triggers for healthy input', () => {
    const triggers = evaluateTriggers(
      baseInput({
        dscr: 1.5,
        previous_score: 70,
        buro_score: 720,
        previous_buro_score: 730,
        has_covenant_breach: false,
        max_payment_delay_days: 5,
        has_new_legal_incidents: false,
        revenue_change_pct: 5,
        risk_flags: [],
      }),
    );
    const active = triggers.filter((t) => t.is_active);
    expect(active.length).toBe(0);
  });
});

// ============================================================
// applyFrequencyOverrides
// ============================================================

describe('applyFrequencyOverrides', () => {
  it('overrides to 1 month for uncovered USD exposure', () => {
    const result = applyFrequencyOverrides(
      6,
      baseInput({ has_usd_exposure_uncovered: true }),
    );
    expect(result).toBe(1);
  });

  it('overrides to 1 month for high concentration', () => {
    const result = applyFrequencyOverrides(
      12,
      baseInput({ has_high_concentration: true }),
    );
    expect(result).toBe(1);
  });

  it('does not override when no special conditions', () => {
    const result = applyFrequencyOverrides(6, baseInput());
    expect(result).toBe(6);
  });

  it('keeps 1 month if already 1 month', () => {
    const result = applyFrequencyOverrides(
      1,
      baseInput({ has_usd_exposure_uncovered: true }),
    );
    expect(result).toBe(1);
  });
});

// ============================================================
// calcEngineScore
// ============================================================

describe('calcEngineScore', () => {
  it('returns 90 for 12-month frequency with no triggers', () => {
    expect(calcEngineScore(12, 0)).toBe(90);
  });

  it('returns 70 for 6-month frequency with no triggers', () => {
    expect(calcEngineScore(6, 0)).toBe(70);
  });

  it('returns 50 for 3-month frequency with no triggers', () => {
    expect(calcEngineScore(3, 0)).toBe(50);
  });

  it('returns 25 for 1-month frequency with no triggers', () => {
    expect(calcEngineScore(1, 0)).toBe(25);
  });

  it('deducts 10 per active trigger', () => {
    expect(calcEngineScore(12, 2)).toBe(70);
  });

  it('does not go below 0', () => {
    expect(calcEngineScore(1, 5)).toBe(0);
  });
});

// ============================================================
// generateRiskFlags
// ============================================================

describe('generateRiskFlags', () => {
  it('flags monthly review as critical', () => {
    const result: ReviewFrequencyResult = {
      frequency_months: 1,
      next_review_date: '2025-08-01T00:00:00Z',
      triggers: [],
      escalation_level: 'critical',
    };
    const flags = generateRiskFlags(result, baseInput({ consolidated_score: 40, grade: 'F' }));
    expect(flags.some((f) => f.code === 'monthly_review_required')).toBe(true);
  });

  it('flags active triggers', () => {
    const result: ReviewFrequencyResult = {
      frequency_months: 3,
      next_review_date: '2025-10-01T00:00:00Z',
      triggers: [
        { code: 'dscr_below_threshold', label: 'DSCR', condition: '', is_active: true },
        { code: 'score_drop', label: 'Score', condition: '', is_active: true },
      ],
      escalation_level: 'high',
    };
    const flags = generateRiskFlags(result, baseInput());
    expect(flags.some((f) => f.code === 'active_review_triggers')).toBe(true);
  });

  it('returns no flags for healthy 12-month schedule', () => {
    const result: ReviewFrequencyResult = {
      frequency_months: 12,
      next_review_date: '2026-07-01T00:00:00Z',
      triggers: [],
      escalation_level: 'standard',
    };
    const flags = generateRiskFlags(result, baseInput({ consolidated_score: 80, grade: 'A' }));
    expect(flags.length).toBe(0);
  });
});

// ============================================================
// runReviewFrequencyEngine (integration)
// ============================================================

describe('runReviewFrequencyEngine', () => {
  it('assigns 12-month review for high-score application', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-1',
      policy_config: defaultPolicyConfig,
      consolidated_score: 82,
      grade: 'A',
    };

    const result = await runReviewFrequencyEngine(input);

    expect(result.engine_name).toBe('review_frequency');
    expect(result.key_metrics['frequency_months']?.value).toBe(12);
    expect(result.module_score).toBe(90);
    expect(result.module_grade).toBe('A');
    expect(result.module_status).toBe('pass');
  });

  it('assigns 6-month review for medium-score application', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-2',
      policy_config: defaultPolicyConfig,
      consolidated_score: 65,
      grade: 'C',
    };

    const result = await runReviewFrequencyEngine(input);

    expect(result.key_metrics['frequency_months']?.value).toBe(6);
    expect(result.module_score).toBe(70);
  });

  it('caps frequency to 3 months when triggers fire', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-3',
      policy_config: defaultPolicyConfig,
      consolidated_score: 80,
      grade: 'A',
      dscr: 1.0,
      revenue_change_pct: -30,
    };

    const result = await runReviewFrequencyEngine(input);

    // Base would be 12 months, but triggers cap it to 3
    expect(result.key_metrics['frequency_months']?.value).toBe(3);
    expect(result.key_metrics['active_triggers']?.value).toBe(2);
  });

  it('assigns 1-month for low score with USD exposure', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-4',
      policy_config: defaultPolicyConfig,
      consolidated_score: 45,
      grade: 'F',
      has_usd_exposure_uncovered: true,
    };

    const result = await runReviewFrequencyEngine(input);

    expect(result.key_metrics['frequency_months']?.value).toBe(1);
    expect(result.module_status).toBe('fail');
  });

  it('generates recommended actions for active triggers', async () => {
    const input: EngineInput & Record<string, unknown> = {
      application_id: 'test-5',
      policy_config: defaultPolicyConfig,
      consolidated_score: 70,
      grade: 'C',
      has_covenant_breach: true,
      max_payment_delay_days: 45,
    };

    const result = await runReviewFrequencyEngine(input);

    expect(result.recommended_actions.length).toBeGreaterThan(0);
    expect(result.recommended_actions.some((a) => a.includes('covenant'))).toBe(true);
    expect(result.recommended_actions.some((a) => a.includes('payment'))).toBe(true);
  });

  it('handles minimal input gracefully', async () => {
    const input: EngineInput = {
      application_id: 'test-6',
      policy_config: defaultPolicyConfig,
    };

    const result = await runReviewFrequencyEngine(input);

    // Score 0, grade F → 1 month
    expect(result.key_metrics['frequency_months']?.value).toBe(1);
    expect(result.engine_name).toBe('review_frequency');
  });
});
