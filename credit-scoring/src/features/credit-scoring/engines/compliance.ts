import { supabase } from '@/lib/supabase';
import { validateCompliance } from '../api/scoryClient';
import type { ComplianceCheck, ComplianceResult } from '../api/scoryClient';
import type {
  EngineInput,
  EngineOutput,
  ModuleGrade,
  ModuleStatus,
  RiskFlag,
} from '../types/engine.types';

// --- Constants ---

const ENGINE_NAME = 'compliance';

/** Check types that trigger an immediate hard stop */
const HARD_STOP_CHECKS = new Set([
  'listas_negras',
  'ofac',
  '69b_definitivo',
]);

/** Check types considered critical but not an immediate hard stop */
const CRITICAL_CHECKS = new Set([
  'peps',
  'syger',
  'rug',
  '69b_presunto',
]);

// --- Helpers ---

/** Fetch the RFC for an application from the database */
async function getRfcForApplication(applicationId: string): Promise<string> {
  const { data, error } = await supabase
    .from('cs_applications')
    .select('rfc')
    .eq('id', applicationId)
    .single();

  if (error || !data) {
    throw new Error(`Application ${applicationId} not found: ${error?.message ?? 'no data'}`);
  }

  return (data as { rfc: string }).rfc;
}

/** Determine if a check type triggers a hard stop */
function isHardStop(checkType: string): boolean {
  return HARD_STOP_CHECKS.has(checkType.toLowerCase());
}

/** Determine if a check type is critical (but not hard stop) */
function isCriticalCheck(checkType: string): boolean {
  return CRITICAL_CHECKS.has(checkType.toLowerCase());
}

/** Map a failed/review ComplianceCheck to a RiskFlag */
function checkToRiskFlag(check: ComplianceCheck): RiskFlag {
  const type = check.check_type.toLowerCase();

  if (isHardStop(type)) {
    return {
      code: `compliance_${type}`,
      severity: 'hard_stop',
      message: `Hard stop: ${check.check_type} validation failed`,
      source_metric: check.check_type,
    };
  }

  if (isCriticalCheck(type)) {
    return {
      code: `compliance_${type}`,
      severity: 'critical',
      message: `Critical: ${check.check_type} requires review`,
      source_metric: check.check_type,
    };
  }

  return {
    code: `compliance_${type}`,
    severity: check.result === 'fail' ? 'warning' : 'info',
    message: `${check.check_type}: ${check.result}`,
    source_metric: check.check_type,
  };
}

/** Determine gate status and grade from compliance checks */
function resolveGateResult(checks: ComplianceCheck[]): {
  status: ModuleStatus;
  grade: ModuleGrade;
  score: number;
} {
  const hasHardStop = checks.some(
    (c) => c.result === 'fail' && isHardStop(c.check_type.toLowerCase()),
  );

  if (hasHardStop) {
    return { status: 'blocked', grade: 'F', score: 0 };
  }

  const failedChecks = checks.filter((c) => c.result === 'fail');
  const reviewChecks = checks.filter((c) => c.result === 'review_required');

  if (failedChecks.length > 0) {
    const hasCriticalFail = failedChecks.some((c) =>
      isCriticalCheck(c.check_type.toLowerCase()),
    );
    return {
      status: 'fail',
      grade: hasCriticalFail ? 'F' : 'D',
      score: hasCriticalFail ? 10 : 30,
    };
  }

  if (reviewChecks.length > 0) {
    const hasCriticalReview = reviewChecks.some((c) =>
      isCriticalCheck(c.check_type.toLowerCase()),
    );
    return {
      status: 'warning',
      grade: hasCriticalReview ? 'C' : 'B',
      score: hasCriticalReview ? 60 : 80,
    };
  }

  return { status: 'pass', grade: 'A', score: 100 };
}

/** Build explanation text from compliance result */
function buildExplanation(
  result: ComplianceResult,
  status: ModuleStatus,
): string {
  const total = result.checks.length;
  const passed = result.checks.filter((c) => c.result === 'pass').length;
  const failed = result.checks.filter((c) => c.result === 'fail').length;
  const review = result.checks.filter((c) => c.result === 'review_required').length;

  const parts: string[] = [
    `Compliance gate: ${status.toUpperCase()}.`,
    `${passed}/${total} checks passed.`,
  ];

  if (failed > 0) parts.push(`${failed} check(s) failed.`);
  if (review > 0) parts.push(`${review} check(s) require review.`);

  if (result.explanation) {
    parts.push(result.explanation);
  }

  return parts.join(' ');
}

/** Build recommended actions based on gate status */
function buildRecommendedActions(
  status: ModuleStatus,
  checks: ComplianceCheck[],
): string[] {
  if (status === 'pass') return [];

  const actions: string[] = [];

  if (status === 'blocked') {
    actions.push('Application rejected — hard stop compliance violation detected');
    const hardStops = checks.filter(
      (c) => c.result === 'fail' && isHardStop(c.check_type.toLowerCase()),
    );
    for (const hs of hardStops) {
      actions.push(`Review ${hs.check_type} finding before any further processing`);
    }
    return actions;
  }

  if (status === 'fail') {
    actions.push('Resolve all failed compliance checks before proceeding');
  }

  if (status === 'warning') {
    actions.push('Review flagged items — manual compliance review recommended');
  }

  return actions;
}

// --- Public API ---

/**
 * Run the Compliance Engine (Gate).
 *
 * Calls Scory API via scoryClient.validateCompliance(rfc) and maps
 * the result to the standard EngineOutput format.
 *
 * Gate logic:
 * - hard_stop (OFAC, listas negras, 69B definitivo) → blocked / F
 * - fail (critical checks) → fail / D or F
 * - review_required (PEPs, non-critical) → warning / B or C
 * - all pass → pass / A
 */
export async function runComplianceEngine(input: EngineInput): Promise<EngineOutput> {
  const rfc = await getRfcForApplication(input.application_id);
  const complianceResult = await validateCompliance(rfc);

  const { status, grade, score } = resolveGateResult(complianceResult.checks);

  // Build risk flags from non-passing checks + any flags from Scory
  const riskFlags: RiskFlag[] = complianceResult.checks
    .filter((c) => c.result !== 'pass')
    .map(checkToRiskFlag);

  // Merge Scory-provided risk flags (avoid duplicates by code)
  const existingCodes = new Set(riskFlags.map((f) => f.code));
  for (const flag of complianceResult.risk_flags) {
    if (!existingCodes.has(flag.code)) {
      riskFlags.push(flag);
    }
  }

  // If manual override was triggered (API unavailable), add flag
  if (complianceResult.manual_override) {
    riskFlags.push({
      code: 'manual_override_required',
      severity: 'critical',
      message: 'Scory API unavailable — manual compliance review required',
    });
  }

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: score,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: {},
    benchmark_comparison: {},
    trends: [],
    explanation: buildExplanation(complianceResult, status),
    recommended_actions: buildRecommendedActions(status, complianceResult.checks),
    created_at: new Date().toISOString(),
  };
}
