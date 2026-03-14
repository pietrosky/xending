import { describe, it, expect } from 'vitest';
import { runEngine, runEnginesParallel } from './engineRunner';
import type { EngineFn } from './engineRunner';
import type { EngineInput, EngineOutput } from '../types/engine.types';

const baseInput: EngineInput = {
  application_id: 'test-app-001',
  policy_config: {
    guarantee_base_ratio: 2,
    score_weights: {},
    hard_stop_rules: [],
    sector_limits: {},
    currency_limits: {},
  },
};

function makeOutput(name: string, score: number): EngineOutput {
  return {
    engine_name: name,
    module_status: 'pass',
    module_score: score,
    module_max_score: 100,
    module_grade: 'B',
    risk_flags: [],
    key_metrics: {},
    benchmark_comparison: {},
    trends: [],
    explanation: 'OK',
    recommended_actions: [],
    created_at: new Date().toISOString(),
  };
}

describe('runEngine', () => {
  it('returns engine output with execution time appended', async () => {
    const fn: EngineFn = async () => makeOutput('test', 80);
    const result = await runEngine('test', fn, baseInput);

    expect(result.module_score).toBe(80);
    expect(result.module_status).toBe('pass');
    expect(result.explanation).toMatch(/OK \[\d+ms\]/);
  });

  it('returns failed output when engine throws', async () => {
    const fn: EngineFn = async () => {
      throw new Error('API timeout');
    };
    const result = await runEngine('failing', fn, baseInput);

    expect(result.module_status).toBe('blocked');
    expect(result.module_score).toBe(0);
    expect(result.module_grade).toBe('F');
    expect(result.engine_name).toBe('failing');
    expect(result.explanation).toContain('API timeout');
    expect(result.risk_flags[0].code).toBe('engine_execution_error');
  });

  it('handles non-Error throws gracefully', async () => {
    const fn: EngineFn = async () => {
      throw 'string error';
    };
    const result = await runEngine('bad', fn, baseInput);

    expect(result.module_status).toBe('blocked');
    expect(result.explanation).toContain('Unknown error');
  });

  it('appends duration to empty explanation', async () => {
    const fn: EngineFn = async () => ({
      ...makeOutput('test', 90),
      explanation: '',
    });
    const result = await runEngine('test', fn, baseInput);

    expect(result.explanation).toMatch(/Completed in \d+ms/);
  });
});

describe('runEnginesParallel', () => {
  it('runs multiple engines and returns keyed results', async () => {
    const engines = {
      alpha: (async () => makeOutput('alpha', 70)) as EngineFn,
      beta: (async () => makeOutput('beta', 85)) as EngineFn,
    };
    const results = await runEnginesParallel(engines, baseInput);

    expect(Object.keys(results)).toEqual(['alpha', 'beta']);
    expect(results.alpha.module_score).toBe(70);
    expect(results.beta.module_score).toBe(85);
  });

  it('returns empty object for empty registry', async () => {
    const results = await runEnginesParallel({}, baseInput);
    expect(results).toEqual({});
  });

  it('isolates failures — one engine failing does not block others', async () => {
    const engines = {
      good: (async () => makeOutput('good', 90)) as EngineFn,
      bad: (async () => { throw new Error('boom'); }) as unknown as EngineFn,
    };
    const results = await runEnginesParallel(engines, baseInput);

    expect(results.good.module_status).toBe('pass');
    expect(results.good.module_score).toBe(90);
    expect(results.bad.module_status).toBe('blocked');
    expect(results.bad.module_score).toBe(0);
  });
});
