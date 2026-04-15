/**
 * Orchestrator pure logic — extracted for testability.
 * The Deno edge function (cs-orchestrator) mirrors this logic.
 * Changes here should be reflected in the edge function and vice versa.
 */

import type { EngineOutput, RiskFlag } from '../types/engine.types';
import type { ApplicationStatus } from '../types/application.types';
import { SCORE_WEIGHTS } from '../types/engine.types';

// ---------------------------------------------------------------------------
// Engine dependency phases
// ---------------------------------------------------------------------------

/** Engines grouped by execution phase (dependency order from design doc) */
export const ENGINE_PHASES: string[][] = [
  ['compliance'],
  ['sat_facturacion', 'buro', 'documentation'],
  ['financial', 'network', 'employee', 'cashflow'],
  ['working_capital', 'stability', 'operational', 'fx_risk'],
  ['guarantee'],
  ['benchmark', 'portfolio', 'graph_fraud'],
];

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

/** Calculate consolidated score from engine results (no trend factor in orchestrator) */
export function calculateConsolidatedScore(
  engineResults: Record<string, EngineOutput>,
): number {
  let totalScore = 0;

  for (const [engine, weight] of Object.entries(SCORE_WEIGHTS)) {
    const result = engineResults[engine];
    if (!result) continue;
    totalScore += result.module_score * weight;
  }

  return Math.round(totalScore * 100) / 100;
}

/** Determine final decision based on score, compliance gate, and hard stops */
export function calculateDecision(
  score: number,
  compliancePassed: boolean,
  hasHardStops: boolean,
): ApplicationStatus {
  if (hasHardStops || !compliancePassed) return 'rejected';
  if (score < 50) return 'rejected';
  if (score >= 75) return 'approved';
  if (score >= 60) return 'conditional';
  return 'committee';
}

/** Check if any engine result contains a hard_stop flag */
export function hasHardStopFlags(results: Record<string, EngineOutput>): boolean {
  return Object.values(results).some((r) =>
    r.risk_flags.some((f: RiskFlag) => f.severity === 'hard_stop'),
  );
}

/** Check if compliance engine passed (not blocked) */
export function isCompliancePassed(complianceOutput: EngineOutput): boolean {
  return complianceOutput.module_status !== 'blocked';
}

/** Classify engine results into completed vs failed */
export function classifyEngineResults(
  results: Record<string, EngineOutput>,
): { completed: string[]; failed: string[] } {
  const completed: string[] = [];
  const failed: string[] = [];

  for (const [name, result] of Object.entries(results)) {
    if (result.module_status === 'blocked') {
      failed.push(name);
    } else {
      completed.push(name);
    }
  }

  return { completed, failed };
}
