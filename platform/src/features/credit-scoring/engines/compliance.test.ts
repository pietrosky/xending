import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ComplianceResult } from '../api/scoryClient';
import type { EngineInput, PolicyConfig } from '../types/engine.types';

// Hoisted mocks
const { mockValidateCompliance, mockSingle } = vi.hoisted(() => {
  const mockValidateCompliance = vi.fn();
  const mockSingle = vi.fn();
  return { mockValidateCompliance, mockSingle };
});

vi.mock('../api/scoryClient', () => ({
  validateCompliance: mockValidateCompliance,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSingle,
        }),
      }),
    }),
  },
}));

import { runComplianceEngine } from './compliance';

const POLICY_CONFIG: PolicyConfig = {
  guarantee_base_ratio: 2,
  score_weights: {},
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

const BASE_INPUT: EngineInput = {
  application_id: 'app-001',
  policy_config: POLICY_CONFIG,
};

function makeComplianceResult(
  overrides: Partial<ComplianceResult> = {},
): ComplianceResult {
  return {
    status: 'pass',
    checks: [],
    risk_flags: [],
    explanation: '',
    manual_override: false,
    ...overrides,
  };
}

describe('compliance engine — runComplianceEngine', () => {
  beforeEach(() => {
    mockSingle.mockResolvedValue({ data: { rfc: 'TEST000000XXX' }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns pass/A when all checks pass', async () => {
    mockValidateCompliance.mockResolvedValueOnce(
      makeComplianceResult({
        checks: [
          { check_type: 'listas_negras', result: 'pass', details: {} },
          { check_type: 'ofac', result: 'pass', details: {} },
          { check_type: 'peps', result: 'pass', details: {} },
        ],
      }),
    );

    const result = await runComplianceEngine(BASE_INPUT);

    expect(result.engine_name).toBe('compliance');
    expect(result.module_status).toBe('pass');
    expect(result.module_grade).toBe('A');
    expect(result.module_score).toBe(100);
    expect(result.risk_flags).toHaveLength(0);
    expect(result.trends).toHaveLength(0);
    expect(result.recommended_actions).toHaveLength(0);
  });

  it('returns blocked/F on OFAC hard stop', async () => {
    mockValidateCompliance.mockResolvedValueOnce(
      makeComplianceResult({
        checks: [
          { check_type: 'listas_negras', result: 'pass', details: {} },
          { check_type: 'ofac', result: 'fail', details: {} },
        ],
      }),
    );

    const result = await runComplianceEngine(BASE_INPUT);

    expect(result.module_status).toBe('blocked');
    expect(result.module_grade).toBe('F');
    expect(result.module_score).toBe(0);
    expect(result.risk_flags.some((f) => f.severity === 'hard_stop')).toBe(true);
    expect(result.recommended_actions.length).toBeGreaterThan(0);
  });

  it('returns blocked/F on listas_negras hard stop', async () => {
    mockValidateCompliance.mockResolvedValueOnce(
      makeComplianceResult({
        checks: [
          { check_type: 'listas_negras', result: 'fail', details: {} },
          { check_type: 'ofac', result: 'pass', details: {} },
        ],
      }),
    );

    const result = await runComplianceEngine(BASE_INPUT);

    expect(result.module_status).toBe('blocked');
    expect(result.module_grade).toBe('F');
  });

  it('returns blocked/F on 69b_definitivo hard stop', async () => {
    mockValidateCompliance.mockResolvedValueOnce(
      makeComplianceResult({
        checks: [
          { check_type: '69b_definitivo', result: 'fail', details: {} },
        ],
      }),
    );

    const result = await runComplianceEngine(BASE_INPUT);

    expect(result.module_status).toBe('blocked');
    expect(result.module_grade).toBe('F');
    expect(result.module_score).toBe(0);
  });

  it('returns fail/F when critical check (PEPs) fails', async () => {
    mockValidateCompliance.mockResolvedValueOnce(
      makeComplianceResult({
        checks: [
          { check_type: 'listas_negras', result: 'pass', details: {} },
          { check_type: 'peps', result: 'fail', details: {} },
        ],
      }),
    );

    const result = await runComplianceEngine(BASE_INPUT);

    expect(result.module_status).toBe('fail');
    expect(result.module_grade).toBe('F');
    expect(result.module_score).toBe(10);
  });

  it('returns fail/D when non-critical check fails', async () => {
    mockValidateCompliance.mockResolvedValueOnce(
      makeComplianceResult({
        checks: [
          { check_type: 'domicilio', result: 'fail', details: {} },
        ],
      }),
    );

    const result = await runComplianceEngine(BASE_INPUT);

    expect(result.module_status).toBe('fail');
    expect(result.module_grade).toBe('D');
    expect(result.module_score).toBe(30);
  });

  it('returns warning/C when critical check requires review', async () => {
    mockValidateCompliance.mockResolvedValueOnce(
      makeComplianceResult({
        checks: [
          { check_type: 'peps', result: 'review_required', details: {} },
          { check_type: 'ofac', result: 'pass', details: {} },
        ],
      }),
    );

    const result = await runComplianceEngine(BASE_INPUT);

    expect(result.module_status).toBe('warning');
    expect(result.module_grade).toBe('C');
    expect(result.module_score).toBe(60);
  });

  it('returns warning/B when non-critical check requires review', async () => {
    mockValidateCompliance.mockResolvedValueOnce(
      makeComplianceResult({
        checks: [
          { check_type: 'domicilio', result: 'review_required', details: {} },
        ],
      }),
    );

    const result = await runComplianceEngine(BASE_INPUT);

    expect(result.module_status).toBe('warning');
    expect(result.module_grade).toBe('B');
    expect(result.module_score).toBe(80);
  });

  it('adds manual_override flag when Scory API was unavailable', async () => {
    mockValidateCompliance.mockResolvedValueOnce(
      makeComplianceResult({
        status: 'fail',
        manual_override: true,
        risk_flags: [
          { code: 'scory_api_unavailable', severity: 'critical', message: 'API down' },
        ],
      }),
    );

    const result = await runComplianceEngine(BASE_INPUT);

    expect(result.risk_flags.some((f) => f.code === 'manual_override_required')).toBe(true);
    expect(result.risk_flags.some((f) => f.code === 'scory_api_unavailable')).toBe(true);
  });

  it('throws when application is not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

    await expect(runComplianceEngine(BASE_INPUT)).rejects.toThrow('not found');
  });

  it('generates explanation with check counts', async () => {
    mockValidateCompliance.mockResolvedValueOnce(
      makeComplianceResult({
        checks: [
          { check_type: 'listas_negras', result: 'pass', details: {} },
          { check_type: 'domicilio', result: 'fail', details: {} },
          { check_type: 'fotos', result: 'review_required', details: {} },
        ],
        explanation: 'Scory details here',
      }),
    );

    const result = await runComplianceEngine(BASE_INPUT);

    expect(result.explanation).toContain('1/3 checks passed');
    expect(result.explanation).toContain('1 check(s) failed');
    expect(result.explanation).toContain('1 check(s) require review');
    expect(result.explanation).toContain('Scory details here');
  });
});
