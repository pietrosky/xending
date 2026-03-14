import { describe, it, expect } from 'vitest';
import {
  ENGINE_PHASES,
  calculateConsolidatedScore,
  calculateDecision,
  hasHardStopFlags,
  isCompliancePassed,
  classifyEngineResults,
} from './orchestratorLogic';
import type { EngineOutput } from '../types/engine.types';
import { SCORE_WEIGHTS } from '../types/engine.types';

function makeEngineOutput(
  name: string,
  overrides: Partial<EngineOutput> = {},
): EngineOutput {
  return {
    engine_name: name,
    module_status: 'pass',
    module_score: 70,
    module_max_score: 100,
    module_grade: 'B',
    risk_flags: [],
    key_metrics: {},
    benchmark_comparison: {},
    trends: [],
    explanation: '',
    recommended_actions: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('ENGINE_PHASES', () => {
  it('has compliance as the first phase (gate)', () => {
    expect(ENGINE_PHASES[0]).toEqual(['compliance']);
  });

  it('has 6 phases total', () => {
    expect(ENGINE_PHASES).toHaveLength(6);
  });

  it('contains all expected engines across phases', () => {
    const allEngines = ENGINE_PHASES.flat();
    expect(allEngines).toContain('compliance');
    expect(allEngines).toContain('sat_facturacion');
    expect(allEngines).toContain('buro');
    expect(allEngines).toContain('documentation');
    expect(allEngines).toContain('financial');
    expect(allEngines).toContain('cashflow');
    expect(allEngines).toContain('guarantee');
    expect(allEngines).toContain('benchmark');
    expect(allEngines).toContain('portfolio');
    expect(allEngines).toContain('graph_fraud');
  });
});

describe('calculateConsolidatedScore', () => {
  it('returns 0 when no results provided', () => {
    expect(calculateConsolidatedScore({})).toBe(0);
  });

  it('returns 100 when all weighted engines score 100', () => {
    const results: Record<string, EngineOutput> = {};
    for (const key of Object.keys(SCORE_WEIGHTS)) {
      results[key] = makeEngineOutput(key, { module_score: 100 });
    }
    expect(calculateConsolidatedScore(results)).toBe(100);
  });

  it('ignores gate engines not in SCORE_WEIGHTS', () => {
    const results: Record<string, EngineOutput> = {
      compliance: makeEngineOutput('compliance', { module_score: 100 }),
      guarantee: makeEngineOutput('guarantee', { module_score: 100 }),
    };
    expect(calculateConsolidatedScore(results)).toBe(0);
  });

  it('calculates partial results correctly', () => {
    const results: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput('cashflow', { module_score: 80 }),
      buro: makeEngineOutput('buro', { module_score: 60 }),
    };
    // cashflow: 80 * 0.16 = 12.8, buro: 60 * 0.10 = 6.0
    expect(calculateConsolidatedScore(results)).toBe(18.8);
  });
});

describe('calculateDecision', () => {
  it('returns approved for score >= 75 with compliance passed', () => {
    expect(calculateDecision(75, true, false)).toBe('approved');
    expect(calculateDecision(90, true, false)).toBe('approved');
  });

  it('returns conditional for score 60-74', () => {
    expect(calculateDecision(60, true, false)).toBe('conditional');
    expect(calculateDecision(74, true, false)).toBe('conditional');
  });

  it('returns committee for score 50-59', () => {
    expect(calculateDecision(50, true, false)).toBe('committee');
    expect(calculateDecision(59, true, false)).toBe('committee');
  });

  it('returns rejected for score < 50', () => {
    expect(calculateDecision(49, true, false)).toBe('rejected');
  });

  it('returns rejected when compliance fails', () => {
    expect(calculateDecision(90, false, false)).toBe('rejected');
  });

  it('returns rejected when hard stops exist', () => {
    expect(calculateDecision(90, true, true)).toBe('rejected');
  });
});

describe('hasHardStopFlags', () => {
  it('returns false when no flags', () => {
    const results = { test: makeEngineOutput('test') };
    expect(hasHardStopFlags(results)).toBe(false);
  });

  it('returns true when a hard_stop flag exists', () => {
    const results = {
      test: makeEngineOutput('test', {
        risk_flags: [{ code: 'ofac', severity: 'hard_stop', message: 'OFAC match' }],
      }),
    };
    expect(hasHardStopFlags(results)).toBe(true);
  });

  it('returns false for non-hard_stop flags', () => {
    const results = {
      test: makeEngineOutput('test', {
        risk_flags: [{ code: 'warn', severity: 'warning', message: 'Warning' }],
      }),
    };
    expect(hasHardStopFlags(results)).toBe(false);
  });
});

describe('isCompliancePassed', () => {
  it('returns true when status is pass', () => {
    expect(isCompliancePassed(makeEngineOutput('compliance'))).toBe(true);
  });

  it('returns false when status is blocked', () => {
    expect(
      isCompliancePassed(makeEngineOutput('compliance', { module_status: 'blocked' })),
    ).toBe(false);
  });

  it('returns true when status is warning', () => {
    expect(
      isCompliancePassed(makeEngineOutput('compliance', { module_status: 'warning' })),
    ).toBe(true);
  });
});

describe('classifyEngineResults', () => {
  it('classifies passing engines as completed', () => {
    const results = {
      sat: makeEngineOutput('sat'),
      buro: makeEngineOutput('buro'),
    };
    const { completed, failed } = classifyEngineResults(results);
    expect(completed).toEqual(['sat', 'buro']);
    expect(failed).toEqual([]);
  });

  it('classifies blocked engines as failed', () => {
    const results = {
      sat: makeEngineOutput('sat'),
      buro: makeEngineOutput('buro', { module_status: 'blocked' }),
    };
    const { completed, failed } = classifyEngineResults(results);
    expect(completed).toEqual(['sat']);
    expect(failed).toEqual(['buro']);
  });
});
