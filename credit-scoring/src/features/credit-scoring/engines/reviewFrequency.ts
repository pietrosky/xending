/**
 * Review Frequency Engine — Decision Layer
 *
 * Determines how often an approved credit should be reviewed based on
 * consolidated risk score/grade, and defines automatic triggers that
 * force an early (extraordinary) review.
 *
 * Frequency rules (by consolidated score & grade):
 *   Score >= 75 (A/B)  → every 12 months
 *   Score 60-74 (C)    → every 6 months
 *   Score 50-59 (D)    → every 3 months
 *   Score < 50  (F)    → every 1 month (or reject)
 *
 * Automatic triggers for early review:
 *   - DSCR drops below 1.2
 *   - Score drops more than 10 points
 *   - Any new hard-stop flag
 *   - Covenant breach
 *   - Payment delay > 30 days
 *   - Buró score drop > 50 points
 *   - New legal incidents detected
 *   - Revenue decline > 20% quarter over quarter
 *
 * This engine does NOT contribute to the weighted score — it is a
 * decision-layer engine that consumes results from other engines.
 */

import type {
  EngineInput,
  EngineOutput,
  RiskFlag,
  MetricValue,
  ModuleGrade,
  ModuleStatus,
} from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENGINE_NAME = 'review_frequency';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EscalationLevel = 'standard' | 'elevated' | 'high' | 'critical';

export interface ReviewTrigger {
  code: string;
  label: string;
  condition: string;
  is_active: boolean;
}

export interface ReviewFrequencyResult {
  frequency_months: number;
  next_review_date: string;
  triggers: ReviewTrigger[];
  escalation_level: EscalationLevel;
}

export interface ReviewFrequencyInput {
  consolidated_score: number;
  grade: ModuleGrade;
  dscr?: number;
  previous_score?: number;
  buro_score?: number;
  previous_buro_score?: number;
  has_covenant_breach?: boolean;
  max_payment_delay_days?: number;
  has_new_legal_incidents?: boolean;
  revenue_change_pct?: number;
  has_usd_exposure_uncovered?: boolean;
  has_high_concentration?: boolean;
  risk_flags?: RiskFlag[];
  trend_results?: TrendResult[];
}

// ---------------------------------------------------------------------------
// Pure calculation helpers (exported for testability)
// ---------------------------------------------------------------------------

/**
 * Assign review frequency in months based on consolidated score.
 */
export function assignFrequency(score: number): number {
  if (score >= 75) return 12;
  if (score >= 60) return 6;
  if (score >= 50) return 3;
  return 1;
}

/**
 * Determine escalation level from frequency and active trigger count.
 */
export function determineEscalation(
  frequencyMonths: number,
  activeTriggerCount: number,
): EscalationLevel {
  if (frequencyMonths <= 1 || activeTriggerCount >= 3) return 'critical';
  if (frequencyMonths <= 3 || activeTriggerCount >= 2) return 'high';
  if (frequencyMonths <= 6 || activeTriggerCount >= 1) return 'elevated';
  return 'standard';
}

/**
 * Calculate the next review date from today + frequency months.
 */
export function calcNextReviewDate(
  frequencyMonths: number,
  fromDate: Date = new Date(),
): string {
  const next = new Date(fromDate);
  next.setMonth(next.getMonth() + frequencyMonths);
  return next.toISOString();
}

/**
 * Evaluate all automatic triggers and return the list with active status.
 */
export function evaluateTriggers(input: ReviewFrequencyInput): ReviewTrigger[] {
  const triggers: ReviewTrigger[] = [];

  // 1. DSCR drops below 1.2
  if (input.dscr !== undefined) {
    triggers.push({
      code: 'dscr_below_threshold',
      label: 'DSCR below 1.2',
      condition: `DSCR = ${input.dscr.toFixed(2)} (threshold: 1.20)`,
      is_active: input.dscr < 1.2,
    });
  }

  // 2. Score drops more than 10 points
  if (input.previous_score !== undefined) {
    const drop = input.previous_score - input.consolidated_score;
    triggers.push({
      code: 'score_drop',
      label: 'Score drop > 10 points',
      condition: `Drop = ${drop.toFixed(1)} pts (prev: ${input.previous_score}, current: ${input.consolidated_score})`,
      is_active: drop > 10,
    });
  }

  // 3. Any new hard-stop flag
  const hasHardStop = (input.risk_flags ?? []).some(
    (f) => f.severity === 'hard_stop',
  );
  triggers.push({
    code: 'new_hard_stop',
    label: 'New hard-stop flag detected',
    condition: hasHardStop ? 'Hard-stop flag present' : 'No hard-stop flags',
    is_active: hasHardStop,
  });

  // 4. Covenant breach
  if (input.has_covenant_breach !== undefined) {
    triggers.push({
      code: 'covenant_breach',
      label: 'Covenant breach',
      condition: input.has_covenant_breach ? 'Breach detected' : 'Covenants OK',
      is_active: input.has_covenant_breach,
    });
  }

  // 5. Payment delay > 30 days
  if (input.max_payment_delay_days !== undefined) {
    triggers.push({
      code: 'payment_delay',
      label: 'Payment delay > 30 days',
      condition: `Max delay = ${input.max_payment_delay_days} days (threshold: 30)`,
      is_active: input.max_payment_delay_days > 30,
    });
  }

  // 6. Buró score drop > 50 points
  if (
    input.buro_score !== undefined &&
    input.previous_buro_score !== undefined
  ) {
    const buroDrop = input.previous_buro_score - input.buro_score;
    triggers.push({
      code: 'buro_score_drop',
      label: 'Buró score drop > 50 points',
      condition: `Drop = ${buroDrop} pts (prev: ${input.previous_buro_score}, current: ${input.buro_score})`,
      is_active: buroDrop > 50,
    });
  }

  // 7. New legal incidents
  if (input.has_new_legal_incidents !== undefined) {
    triggers.push({
      code: 'new_legal_incidents',
      label: 'New legal incidents detected',
      condition: input.has_new_legal_incidents
        ? 'Legal incidents found'
        : 'No new incidents',
      is_active: input.has_new_legal_incidents,
    });
  }

  // 8. Revenue decline > 20% QoQ
  if (input.revenue_change_pct !== undefined) {
    triggers.push({
      code: 'revenue_decline',
      label: 'Revenue decline > 20% QoQ',
      condition: `Change = ${input.revenue_change_pct.toFixed(1)}% (threshold: -20%)`,
      is_active: input.revenue_change_pct < -20,
    });
  }

  return triggers;
}

/**
 * Override frequency to monthly for special conditions:
 * - USD credit without full FX coverage
 * - High client/supplier concentration
 */
export function applyFrequencyOverrides(
  baseFrequency: number,
  input: ReviewFrequencyInput,
): number {
  if (input.has_usd_exposure_uncovered) return Math.min(baseFrequency, 1);
  if (input.has_high_concentration) return Math.min(baseFrequency, 1);
  return baseFrequency;
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function scoreToGrade(score: number): ModuleGrade {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function scoreToStatus(score: number, flags: RiskFlag[]): ModuleStatus {
  if (flags.some((f) => f.severity === 'hard_stop')) return 'blocked';
  if (score >= 60) return 'pass';
  if (score >= 40) return 'warning';
  return 'fail';
}

// ---------------------------------------------------------------------------
// Risk flags
// ---------------------------------------------------------------------------

export function generateRiskFlags(
  result: ReviewFrequencyResult,
  input: ReviewFrequencyInput,
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const activeTriggers = result.triggers.filter((t) => t.is_active);

  if (result.frequency_months <= 1) {
    flags.push({
      code: 'monthly_review_required',
      severity: 'critical',
      message: `Monthly review required — score ${input.consolidated_score}, grade ${input.grade}`,
      value: result.frequency_months,
    });
  }

  if (activeTriggers.length > 0) {
    flags.push({
      code: 'active_review_triggers',
      severity: activeTriggers.length >= 3 ? 'critical' : 'warning',
      message: `${activeTriggers.length} active trigger(s): ${activeTriggers.map((t) => t.code).join(', ')}`,
      value: activeTriggers.length,
    });
  }

  if (result.escalation_level === 'critical') {
    flags.push({
      code: 'critical_escalation',
      severity: 'critical',
      message: 'Escalation level is critical — immediate attention required',
    });
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Key metrics builder
// ---------------------------------------------------------------------------

export function buildKeyMetrics(
  result: ReviewFrequencyResult,
  input: ReviewFrequencyInput,
): Record<string, MetricValue> {
  const m = (
    name: string,
    label: string,
    value: number,
    unit: string,
    interpretation: string,
    impact: MetricValue['impact_on_score'],
  ): MetricValue => ({
    name,
    label,
    value,
    unit,
    source: ENGINE_NAME,
    interpretation,
    impact_on_score: impact,
  });

  const activeTriggers = result.triggers.filter((t) => t.is_active).length;

  return {
    frequency_months: m(
      'frequency_months',
      'Review Frequency',
      result.frequency_months,
      'months',
      `Review every ${result.frequency_months} month(s)`,
      result.frequency_months <= 3 ? 'negative' : 'positive',
    ),
    consolidated_score: m(
      'consolidated_score',
      'Consolidated Score',
      input.consolidated_score,
      'pts',
      `Grade ${input.grade}`,
      input.consolidated_score >= 60 ? 'positive' : 'negative',
    ),
    active_triggers: m(
      'active_triggers',
      'Active Triggers',
      activeTriggers,
      'count',
      activeTriggers === 0
        ? 'No active triggers'
        : `${activeTriggers} trigger(s) active`,
      activeTriggers === 0 ? 'positive' : 'negative',
    ),
    escalation_level: m(
      'escalation_level',
      'Escalation Level',
      result.escalation_level === 'critical'
        ? 4
        : result.escalation_level === 'high'
          ? 3
          : result.escalation_level === 'elevated'
            ? 2
            : 1,
      'level',
      `Escalation: ${result.escalation_level}`,
      result.escalation_level === 'standard' ? 'positive' : 'negative',
    ),
  };
}

// ---------------------------------------------------------------------------
// Explanation & recommended actions
// ---------------------------------------------------------------------------

function buildExplanation(
  engineScore: number,
  grade: ModuleGrade,
  result: ReviewFrequencyResult,
  input: ReviewFrequencyInput,
): string {
  const activeTriggers = result.triggers.filter((t) => t.is_active);
  const parts: string[] = [
    `Review Frequency Engine score: ${engineScore}/100 (Grade ${grade}).`,
    `Consolidated score: ${input.consolidated_score} (${input.grade}).`,
    `Review frequency: every ${result.frequency_months} month(s).`,
    `Escalation level: ${result.escalation_level}.`,
  ];
  if (activeTriggers.length > 0) {
    parts.push(
      `Active triggers (${activeTriggers.length}): ${activeTriggers.map((t) => t.label).join('; ')}.`,
    );
  }
  return parts.join(' ');
}

function buildRecommendedActions(
  result: ReviewFrequencyResult,
  _flags: RiskFlag[],
): string[] {
  const actions: string[] = [];
  const activeTriggers = result.triggers.filter((t) => t.is_active);

  if (result.frequency_months <= 1) {
    actions.push(
      'Schedule monthly review — consider if credit should remain active',
    );
  }

  for (const t of activeTriggers) {
    switch (t.code) {
      case 'dscr_below_threshold':
        actions.push('Monitor DSCR closely — request updated financials');
        break;
      case 'score_drop':
        actions.push('Investigate cause of score deterioration');
        break;
      case 'new_hard_stop':
        actions.push('Immediate review — new hard-stop flag detected');
        break;
      case 'covenant_breach':
        actions.push('Initiate covenant breach resolution process');
        break;
      case 'payment_delay':
        actions.push('Contact borrower regarding payment delays');
        break;
      case 'buro_score_drop':
        actions.push('Review updated buró report for new delinquencies');
        break;
      case 'new_legal_incidents':
        actions.push('Review legal incidents and assess impact on credit');
        break;
      case 'revenue_decline':
        actions.push(
          'Request explanation for revenue decline — update projections',
        );
        break;
    }
  }

  if (result.escalation_level === 'critical' && actions.length === 0) {
    actions.push('Escalate to committee for immediate review');
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Engine score: reflects how "comfortable" the review schedule is
// ---------------------------------------------------------------------------

/**
 * The engine score reflects the overall review risk posture.
 * Higher score = lower review burden = healthier credit.
 */
export function calcEngineScore(
  frequencyMonths: number,
  activeTriggerCount: number,
): number {
  // Base score from frequency
  let score: number;
  if (frequencyMonths >= 12) score = 90;
  else if (frequencyMonths >= 6) score = 70;
  else if (frequencyMonths >= 3) score = 50;
  else score = 25;

  // Penalty per active trigger (-10 each, min 0)
  score = Math.max(0, score - activeTriggerCount * 10);

  return score;
}

// ---------------------------------------------------------------------------
// Main engine runner
// ---------------------------------------------------------------------------

export async function runReviewFrequencyEngine(
  input: EngineInput,
): Promise<EngineOutput> {
  // Extract review-specific input from extended properties
  const ext = input as unknown as Record<string, unknown>;
  const reviewInput: ReviewFrequencyInput = {
    consolidated_score:
      (ext['consolidated_score'] as number | undefined) ?? 0,
    grade: (ext['grade'] as ModuleGrade | undefined) ?? 'F',
    dscr: ext['dscr'] as number | undefined,
    previous_score: ext['previous_score'] as number | undefined,
    buro_score: ext['buro_score'] as number | undefined,
    previous_buro_score: ext['previous_buro_score'] as number | undefined,
    has_covenant_breach: ext['has_covenant_breach'] as boolean | undefined,
    max_payment_delay_days: ext['max_payment_delay_days'] as
      | number
      | undefined,
    has_new_legal_incidents: ext['has_new_legal_incidents'] as
      | boolean
      | undefined,
    revenue_change_pct: ext['revenue_change_pct'] as number | undefined,
    has_usd_exposure_uncovered: ext['has_usd_exposure_uncovered'] as
      | boolean
      | undefined,
    has_high_concentration: ext['has_high_concentration'] as
      | boolean
      | undefined,
    risk_flags: ext['risk_flags'] as RiskFlag[] | undefined,
    trend_results: ext['trend_results'] as TrendResult[] | undefined,
  };

  // 1. Assign base frequency from consolidated score
  const baseFrequency = assignFrequency(reviewInput.consolidated_score);

  // 2. Apply overrides for special conditions
  const adjustedFrequency = applyFrequencyOverrides(
    baseFrequency,
    reviewInput,
  );

  // 3. Evaluate all triggers
  const triggers = evaluateTriggers(reviewInput);
  const activeTriggerCount = triggers.filter((t) => t.is_active).length;

  // If any trigger fires, cap frequency to at most 3 months
  const finalFrequency =
    activeTriggerCount > 0
      ? Math.min(adjustedFrequency, 3)
      : adjustedFrequency;

  // 4. Determine escalation level
  const escalation = determineEscalation(finalFrequency, activeTriggerCount);

  // 5. Calculate next review date
  const nextReviewDate = calcNextReviewDate(finalFrequency);

  const result: ReviewFrequencyResult = {
    frequency_months: finalFrequency,
    next_review_date: nextReviewDate,
    triggers,
    escalation_level: escalation,
  };

  // 6. Score & grade
  const engineScore = calcEngineScore(finalFrequency, activeTriggerCount);
  const grade = scoreToGrade(engineScore);
  const flags = generateRiskFlags(result, reviewInput);
  const status = scoreToStatus(engineScore, flags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: engineScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: flags,
    key_metrics: buildKeyMetrics(result, reviewInput),
    benchmark_comparison: {},
    trends: reviewInput.trend_results ?? [],
    explanation: buildExplanation(engineScore, grade, result, reviewInput),
    recommended_actions: buildRecommendedActions(result, flags),
    created_at: new Date().toISOString(),
  };
}
