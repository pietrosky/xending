import { describe, it, expect } from 'vitest';
import {
  calculateConsolidatedScore,
  calculateGrade,
  calculateDecision,
  getApprovalLevel,
} from './scoreCalculator';
import type { EngineOutput } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';
import { SCORE_WEIGHTS } from '../types/engine.types';

/** Helper: create a minimal EngineOutput with a given score */
function makeEngineOutput(score: number): EngineOutput {
  return {
    engine_name: 'test',
    module_status: 'pass',
    module_score: score,
    module_max_score: 100,
    module_grade: 'B',
    risk_flags: [],
    key_metrics: {},
    benchmark_comparison: {},
    trends: [],
    explanation: '',
    recommended_actions: [],
    created_at: new Date().toISOString(),
  };
}

describe('calculateConsolidatedScore', () => {
  it('returns 0 when no engine results are provided', () => {
    const score = calculateConsolidatedScore({}, {});
    expect(score).toBe(0);
  });

  it('calculates weighted score for all engines at 100', () => {
    const engines: Record<string, EngineOutput> = {};
    for (const key of Object.keys(SCORE_WEIGHTS)) {
      engines[key] = makeEngineOutput(100);
    }
    // All scores 100, all trend factors 1.0 (empty trends), weights sum to 1.0
    const score = calculateConsolidatedScore(engines, {});
    expect(score).toBe(100);
  });

  it('calculates weighted score for all engines at 50', () => {
    const engines: Record<string, EngineOutput> = {};
    for (const key of Object.keys(SCORE_WEIGHTS)) {
      engines[key] = makeEngineOutput(50);
    }
    const score = calculateConsolidatedScore(engines, {});
    expect(score).toBe(50);
  });

  it('applies trend factor to individual engine scores', () => {
    const engines: Record<string, EngineOutput> = {};
    for (const key of Object.keys(SCORE_WEIGHTS)) {
      engines[key] = makeEngineOutput(80);
    }
    // All improving trends for cashflow -> factor 1.05
    const trendResults: Record<string, TrendResult[]> = {
      cashflow: [
        { direction: 'improving' } as TrendResult,
        { direction: 'improving' } as TrendResult,
      ],
    };
    const score = calculateConsolidatedScore(engines, trendResults);
    // cashflow: 80 * 1.05 * 0.16 = 13.44, rest: 80 * 1.0 * (1 - 0.16) = 67.2
    // total = 13.44 + 67.2 = 80.64
    expect(score).toBe(80.64);
  });

  it('ignores gate engines not in SCORE_WEIGHTS', () => {
    const engines: Record<string, EngineOutput> = {
      compliance: makeEngineOutput(100),
      guarantee: makeEngineOutput(100),
      graph_fraud: makeEngineOutput(100),
    };
    const score = calculateConsolidatedScore(engines, {});
    expect(score).toBe(0);
  });

  it('handles partial engine results gracefully', () => {
    const engines: Record<string, EngineOutput> = {
      cashflow: makeEngineOutput(80),
      buro: makeEngineOutput(60),
    };
    const score = calculateConsolidatedScore(engines, {});
    // cashflow: 80 * 0.16 = 12.8, buro: 60 * 0.10 = 6.0
    expect(score).toBe(18.8);
  });

  it('applies critical trend factor (0.80) correctly', () => {
    const engines: Record<string, EngineOutput> = {};
    for (const key of Object.keys(SCORE_WEIGHTS)) {
      engines[key] = makeEngineOutput(100);
    }
    const trendResults: Record<string, TrendResult[]> = {
      financial: [{ direction: 'critical' } as TrendResult],
    };
    const score = calculateConsolidatedScore(engines, trendResults);
    // financial: 100 * 0.80 * 0.11 = 8.8, rest: 100 * 1.0 * 0.89 = 89
    expect(score).toBe(97.8);
  });
});

describe('calculateGrade', () => {
  it('returns A for score >= 80', () => {
    expect(calculateGrade(80)).toBe('A');
    expect(calculateGrade(100)).toBe('A');
    expect(calculateGrade(95.5)).toBe('A');
  });

  it('returns B for score 65-79', () => {
    expect(calculateGrade(65)).toBe('B');
    expect(calculateGrade(79.99)).toBe('B');
  });

  it('returns C for score 50-64', () => {
    expect(calculateGrade(50)).toBe('C');
    expect(calculateGrade(64.99)).toBe('C');
  });

  it('returns D for score 35-49', () => {
    expect(calculateGrade(35)).toBe('D');
    expect(calculateGrade(49.99)).toBe('D');
  });

  it('returns F for score < 35', () => {
    expect(calculateGrade(0)).toBe('F');
    expect(calculateGrade(34.99)).toBe('F');
  });
});

describe('calculateDecision', () => {
  it('returns approved for score >= 75 with gate1 passed and no hard stops', () => {
    expect(calculateDecision(75, true, false)).toBe('approved');
    expect(calculateDecision(90, true, false)).toBe('approved');
  });

  it('returns conditional for score 60-74 with gate1 passed', () => {
    expect(calculateDecision(60, true, false)).toBe('conditional');
    expect(calculateDecision(74, true, false)).toBe('conditional');
  });

  it('returns committee for score 50-59', () => {
    expect(calculateDecision(50, true, false)).toBe('committee');
    expect(calculateDecision(59, true, false)).toBe('committee');
  });

  it('returns rejected for score < 50', () => {
    expect(calculateDecision(49, true, false)).toBe('rejected');
    expect(calculateDecision(0, true, false)).toBe('rejected');
  });

  it('returns rejected when hard stops exist regardless of score', () => {
    expect(calculateDecision(90, true, true)).toBe('rejected');
    expect(calculateDecision(75, true, true)).toBe('rejected');
  });

  it('returns rejected when gate1 fails regardless of score', () => {
    expect(calculateDecision(90, false, false)).toBe('rejected');
    expect(calculateDecision(75, false, false)).toBe('rejected');
  });
});

describe('getApprovalLevel', () => {
  it('returns analyst for amounts < 500K', () => {
    expect(getApprovalLevel(499_999)).toBe('analyst');
    expect(getApprovalLevel(100_000)).toBe('analyst');
  });

  it('returns manager for amounts 500K-2M', () => {
    expect(getApprovalLevel(500_000)).toBe('manager');
    expect(getApprovalLevel(2_000_000)).toBe('manager');
  });

  it('returns committee for amounts > 2M', () => {
    expect(getApprovalLevel(2_000_001)).toBe('committee');
    expect(getApprovalLevel(10_000_000)).toBe('committee');
  });
});
