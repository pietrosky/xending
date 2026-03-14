import { describe, it, expect } from 'vitest';
import type { EngineOutput, EngineInput } from '../types/engine.types';
import {
  summarizeEngineResults,
  summarizeTrends,
  buildSystemPrompt,
  buildUserPrompt,
  parseAIResponse,
  calculateDataConfidence,
  scoreToGrade,
  scoreToStatus,
  deriveScore,
  collectCriticalFlags,
  generateFallbackAnalysis,
  runAIRiskEngine,
} from './aiRisk';
import type { OpenAICaller } from './aiRisk';

// ============================================================
// Test fixtures
// ============================================================

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { cashflow: 0.16 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeEngineOutput(overrides: Partial<EngineOutput> = {}): EngineOutput {
  return {
    engine_name: 'test_engine',
    module_status: 'pass',
    module_score: 75,
    module_max_score: 100,
    module_grade: 'B',
    risk_flags: [],
    key_metrics: {},
    benchmark_comparison: {},
    trends: [],
    explanation: 'Test engine passed.',
    recommended_actions: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================
// summarizeEngineResults
// ============================================================

describe('summarizeEngineResults', () => {
  it('should produce a summary string with engine names and scores', () => {
    const results: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput({ engine_name: 'cashflow', module_score: 80, module_grade: 'A' }),
      buro: makeEngineOutput({ engine_name: 'buro', module_score: 60, module_grade: 'C' }),
    };
    const summary = summarizeEngineResults(results);
    expect(summary).toContain('cashflow');
    expect(summary).toContain('80/100');
    expect(summary).toContain('buro');
    expect(summary).toContain('60/100');
  });

  it('should include risk flags when present', () => {
    const results: Record<string, EngineOutput> = {
      sat: makeEngineOutput({
        engine_name: 'sat',
        risk_flags: [{ code: 'high_cancel', severity: 'warning', message: 'High cancellation rate' }],
      }),
    };
    const summary = summarizeEngineResults(results);
    expect(summary).toContain('high_cancel');
    expect(summary).toContain('High cancellation rate');
  });
});

// ============================================================
// summarizeTrends
// ============================================================

describe('summarizeTrends', () => {
  it('should count trend directions', () => {
    const results: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput({
        trends: [
          { metric_name: 'ebitda', metric_label: 'EBITDA', unit: '$', time_series: [], current_value: 100, previous_value: 90, direction: 'improving', speed: 'moderate', change_percent: 11, change_absolute: 10, slope: 0.5, r_squared: 0.9, trend_line: [], projection: [], classification: 'A', risk_flags: [], chart_config: { thresholds: {}, higher_is_better: true, y_axis_format: '$' } },
        ],
      }),
    };
    const summary = summarizeTrends(results);
    expect(summary).toContain('1 improving');
  });
});

// ============================================================
// Prompt building
// ============================================================

describe('buildSystemPrompt', () => {
  it('should return a non-empty system prompt', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.length).toBeGreaterThan(50);
    expect(prompt).toContain('Xending Capital');
  });
});

describe('buildUserPrompt', () => {
  it('should include engine results and trend analysis sections', () => {
    const results: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput({ engine_name: 'cashflow' }),
    };
    const prompt = buildUserPrompt(results);
    expect(prompt).toContain('ENGINE RESULTS');
    expect(prompt).toContain('TREND ANALYSIS');
    expect(prompt).toContain('risk_narrative');
  });
});

// ============================================================
// parseAIResponse
// ============================================================

describe('parseAIResponse', () => {
  it('should parse valid JSON response', () => {
    const raw = JSON.stringify({
      risk_narrative: 'Test narrative',
      top_risks: [{ title: 'Risk 1', description: 'Desc', severity: 'high', source_engine: 'cashflow' }],
      top_strengths: [{ title: 'Strength 1', description: 'Desc', severity: 'high', source_engine: 'buro' }],
      scenarios: [{ scenario_type: 'base_case', description: 'Base', impact: 'OK', probability: 'high' }],
      confidence_score: 0.85,
      trend_narrative: 'Trends are stable',
      hidden_risks: ['Hidden risk 1'],
    });
    const result = parseAIResponse(raw);
    expect(result.risk_narrative).toBe('Test narrative');
    expect(result.top_risks).toHaveLength(1);
    expect(result.confidence_score).toBe(0.85);
  });

  it('should handle markdown code fences', () => {
    const raw = '```json\n{"risk_narrative":"test","top_risks":[],"top_strengths":[],"scenarios":[],"confidence_score":0.5,"trend_narrative":"","hidden_risks":[]}\n```';
    const result = parseAIResponse(raw);
    expect(result.risk_narrative).toBe('test');
  });

  it('should clamp confidence_score to 0-1 range', () => {
    const raw = JSON.stringify({
      risk_narrative: '',
      top_risks: [],
      top_strengths: [],
      scenarios: [],
      confidence_score: 1.5,
      trend_narrative: '',
      hidden_risks: [],
    });
    const result = parseAIResponse(raw);
    expect(result.confidence_score).toBe(1);
  });

  it('should limit top_risks to 3 items', () => {
    const risks = Array.from({ length: 5 }, (_, i) => ({
      title: `Risk ${i}`, description: '', severity: 'high', source_engine: 'test',
    }));
    const raw = JSON.stringify({
      risk_narrative: '', top_risks: risks, top_strengths: [], scenarios: [],
      confidence_score: 0.5, trend_narrative: '', hidden_risks: [],
    });
    const result = parseAIResponse(raw);
    expect(result.top_risks).toHaveLength(3);
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseAIResponse('not json')).toThrow();
  });
});

// ============================================================
// calculateDataConfidence
// ============================================================

describe('calculateDataConfidence', () => {
  it('should return 1.0 when all expected engines are present and non-blocked', () => {
    const results: Record<string, EngineOutput> = {};
    const engines = [
      'compliance', 'sat_facturacion', 'buro', 'documentation', 'financial',
      'cashflow', 'working_capital', 'stability', 'network', 'guarantee',
      'fx_risk', 'employee',
    ];
    for (const name of engines) {
      results[name] = makeEngineOutput({ engine_name: name });
    }
    expect(calculateDataConfidence(results)).toBe(1.0);
  });

  it('should return lower confidence when engines are missing', () => {
    const results: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput({ engine_name: 'cashflow' }),
      buro: makeEngineOutput({ engine_name: 'buro' }),
    };
    const confidence = calculateDataConfidence(results);
    expect(confidence).toBeLessThanOrEqual(0.5);
    expect(confidence).toBeGreaterThan(0);
  });

  it('should penalize blocked engines', () => {
    const results: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput({ engine_name: 'cashflow', module_status: 'blocked' }),
    };
    const blocked = calculateDataConfidence(results);
    const results2: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput({ engine_name: 'cashflow', module_status: 'pass' }),
    };
    const nonBlocked = calculateDataConfidence(results2);
    expect(nonBlocked).toBeGreaterThan(blocked);
  });
});

// ============================================================
// Score helpers
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

  it('should return pass for high score', () => {
    expect(scoreToStatus(75, [])).toBe('pass');
  });

  it('should return warning for mid score', () => {
    expect(scoreToStatus(50, [])).toBe('warning');
  });
});

describe('deriveScore', () => {
  it('should calculate average score weighted by confidence', () => {
    const results: Record<string, EngineOutput> = {
      a: makeEngineOutput({ module_score: 80 }),
      b: makeEngineOutput({ module_score: 60 }),
    };
    // avg = 70, confidence = 0.8 => 56
    expect(deriveScore(results, 0.8)).toBe(56);
  });

  it('should return 0 when all engines are blocked', () => {
    const results: Record<string, EngineOutput> = {
      a: makeEngineOutput({ module_status: 'blocked' }),
    };
    expect(deriveScore(results, 1.0)).toBe(0);
  });
});

describe('collectCriticalFlags', () => {
  it('should collect critical and hard_stop flags from all engines', () => {
    const results: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput({
        risk_flags: [
          { code: 'dscr_low', severity: 'critical', message: 'DSCR below threshold' },
          { code: 'info_flag', severity: 'info', message: 'Informational' },
        ],
      }),
      buro: makeEngineOutput({
        risk_flags: [
          { code: 'hard_stop_flag', severity: 'hard_stop', message: 'Hard stop' },
        ],
      }),
    };
    const flags = collectCriticalFlags(results);
    expect(flags).toHaveLength(2);
    expect(flags[0]!.code).toBe('cashflow_dscr_low');
    expect(flags[1]!.code).toBe('buro_hard_stop_flag');
  });
});

// ============================================================
// generateFallbackAnalysis
// ============================================================

describe('generateFallbackAnalysis', () => {
  it('should generate analysis with top risks and strengths', () => {
    const results: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput({ module_score: 30, explanation: 'Weak cashflow' }),
      buro: makeEngineOutput({ module_score: 85, explanation: 'Strong buro' }),
      network: makeEngineOutput({ module_score: 50, explanation: 'Average network' }),
    };
    const analysis = generateFallbackAnalysis(results);
    expect(analysis.top_risks.length).toBeGreaterThan(0);
    expect(analysis.top_strengths.length).toBeGreaterThan(0);
    expect(analysis.scenarios).toHaveLength(3);
    expect(analysis.confidence_score).toBe(0.3);
  });

  it('should include critical flags as hidden risks', () => {
    const results: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput({
        risk_flags: [{ code: 'critical_flag', severity: 'critical', message: 'Critical issue' }],
      }),
    };
    const analysis = generateFallbackAnalysis(results);
    expect(analysis.hidden_risks.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runAIRiskEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no engine results provided', async () => {
    const result = await runAIRiskEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('ai_risk');
    expect(result.risk_flags[0]!.code).toBe('no_engine_results');
  });

  it('should use fallback when no OpenAI caller provided', async () => {
    const input: EngineInput = {
      ...baseInput,
      other_engine_results: {
        cashflow: makeEngineOutput({ engine_name: 'cashflow', module_score: 80 }),
        buro: makeEngineOutput({ engine_name: 'buro', module_score: 70 }),
      },
    };
    const result = await runAIRiskEngine(input);
    expect(result.module_status).not.toBe('blocked');
    expect(result.module_score).toBeGreaterThan(0);
    expect(result.explanation).toContain('reglas');
  });

  it('should use OpenAI caller when provided', async () => {
    const mockCaller: OpenAICaller = async () => JSON.stringify({
      risk_narrative: 'AI generated narrative',
      top_risks: [{ title: 'Risk A', description: 'Desc A', severity: 'high', source_engine: 'cashflow' }],
      top_strengths: [{ title: 'Strength A', description: 'Desc A', severity: 'high', source_engine: 'buro' }],
      scenarios: [{ scenario_type: 'base_case', description: 'Base', impact: 'OK', probability: 'high' }],
      confidence_score: 0.9,
      trend_narrative: 'Trends are positive',
      hidden_risks: [],
    });

    const input: EngineInput = {
      ...baseInput,
      other_engine_results: {
        cashflow: makeEngineOutput({ engine_name: 'cashflow', module_score: 80 }),
        buro: makeEngineOutput({ engine_name: 'buro', module_score: 70 }),
      },
    };
    const result = await runAIRiskEngine(input, mockCaller);
    expect(result.explanation).toBe('AI generated narrative');
    expect(result.module_score).toBeGreaterThan(0);
  });

  it('should fallback gracefully when OpenAI caller throws', async () => {
    const failingCaller: OpenAICaller = async () => {
      throw new Error('API rate limited');
    };

    const input: EngineInput = {
      ...baseInput,
      other_engine_results: {
        cashflow: makeEngineOutput({ engine_name: 'cashflow', module_score: 75 }),
      },
    };
    const result = await runAIRiskEngine(input, failingCaller);
    expect(result.module_status).not.toBe('blocked');
    expect(result.explanation).toContain('reglas');
  });

  it('should propagate critical flags from child engines', async () => {
    const input: EngineInput = {
      ...baseInput,
      other_engine_results: {
        cashflow: makeEngineOutput({
          engine_name: 'cashflow',
          risk_flags: [{ code: 'dscr_critical', severity: 'critical', message: 'DSCR below 1.0' }],
        }),
      },
    };
    const result = await runAIRiskEngine(input);
    expect(result.risk_flags.some((f) => f.code === 'cashflow_dscr_critical')).toBe(true);
  });
});
