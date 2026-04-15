import type { EngineOutput, ModuleGrade } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';
import { SCORE_WEIGHTS } from '../types/engine.types';
import { trendUtils } from './trendUtils';

/** Decision types for credit applications */
export type DecisionType = 'approved' | 'conditional' | 'committee' | 'rejected';

/** Calculate consolidated score (Gate 3) with trend adjustments.
 *  Only engines in SCORE_WEIGHTS contribute; gate engines are excluded. */
export function calculateConsolidatedScore(
  engineResults: Record<string, EngineOutput>,
  trendResults: Record<string, TrendResult[]>,
): number {
  let totalScore = 0;

  for (const [engine, weight] of Object.entries(SCORE_WEIGHTS)) {
    const result = engineResults[engine];
    if (!result) continue;

    const trends = trendResults[engine] ?? [];
    const trendFactor = trendUtils.calculateTrendFactor(trends);
    const adjustedScore = result.module_score * trendFactor;
    totalScore += adjustedScore * weight;
  }

  return Math.round(totalScore * 100) / 100;
}

/** Map numeric score (0-100) to letter grade */
export function calculateGrade(score: number): ModuleGrade {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

/** Determine final decision based on score, gate results, and hard stops.
 *  - >= 75 + gate1 passed + no hard stops → APPROVED
 *  - 60-74 + gate1 passed + no hard stops → CONDITIONAL
 *  - 50-74 + complex crosses              → COMMITTEE
 *  - < 50 or hard stop                    → REJECTED */
export function calculateDecision(
  score: number,
  gate1Passed: boolean,
  hasHardStops: boolean,
): DecisionType {
  if (hasHardStops || !gate1Passed) return 'rejected';
  if (score < 50) return 'rejected';
  if (score >= 75) return 'approved';
  if (score >= 60) return 'conditional';
  return 'committee';
}

/** Determine approval routing by requested amount */
export function getApprovalLevel(
  amount: number,
): 'analyst' | 'manager' | 'committee' {
  if (amount < 500_000) return 'analyst';
  if (amount <= 2_000_000) return 'manager';
  return 'committee';
}
