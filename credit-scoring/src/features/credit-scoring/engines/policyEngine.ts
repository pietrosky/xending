/**
 * Policy Engine — Decision Layer
 *
 * Manages configurable policies that other engines consume. Provides
 * dynamic configuration of:
 *   - Credit limits (min/max amounts, term limits by sector/currency)
 *   - Guarantee requirements (base ratio, adjustments by score/sector/term)
 *   - Hard stop rules (configurable conditions that block approval)
 *   - Covenant definitions (financial covenants for conditional approvals)
 *
 * Policies can be adjusted at runtime without code changes. All changes
 * are versioned with effective dates and stored in cs_policies,
 * cs_policy_versions, cs_policy_audit.
 *
 * This engine does NOT contribute to the weighted score — it is a
 * decision-layer engine that provides configuration to other engines.
 */

import type {
  EngineInput,
  EngineOutput,
  RiskFlag,
  MetricValue,
  ModuleGrade,
  ModuleStatus,
  HardStopRule,
} from '../types/engine.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENGINE_NAME = 'policy_engine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectorLimitConfig {
  sector: string;
  max_amount: number;
  min_amount: number;
  max_term_months: number;
  currency: string;
}

export interface GuaranteePolicy {
  base_ratio: number;
  score_adjustments: ScoreAdjustment[];
  sector_adjustments: Record<string, number>;
  term_adjustments: TermAdjustment[];
}

export interface ScoreAdjustment {
  min_score: number;
  max_score: number;
  ratio_adjustment: number;
}

export interface TermAdjustment {
  min_months: number;
  max_months: number;
  ratio_adjustment: number;
}

export interface CovenantTemplate {
  code: string;
  label: string;
  type: 'financial' | 'reporting' | 'operational';
  metric: string;
  operator: 'gte' | 'lte' | 'gt' | 'lt';
  threshold: number;
  frequency_months: number;
  description: string;
}

export interface PolicySet {
  sector_limits: SectorLimitConfig[];
  guarantee_policy: GuaranteePolicy;
  hard_stops: HardStopRule[];
  covenant_templates: CovenantTemplate[];
}

export interface PolicyValidationResult {
  is_within_limits: boolean;
  limit_violations: string[];
  effective_guarantee_ratio: number;
  active_hard_stops: HardStopRule[];
  applicable_covenants: CovenantTemplate[];
}

export interface PolicyEngineInput {
  requested_amount: number;
  term_months: number;
  currency: string;
  sector: string;
  consolidated_score: number;
  grade: ModuleGrade;
  risk_flags?: RiskFlag[];
  policy_overrides?: Partial<PolicySet>;
}

// ---------------------------------------------------------------------------
// Default policy configuration
// ---------------------------------------------------------------------------

export const DEFAULT_SECTOR_LIMITS: SectorLimitConfig[] = [
  { sector: 'manufacturing', max_amount: 10_000_000, min_amount: 100_000, max_term_months: 60, currency: 'MXN' },
  { sector: 'manufacturing', max_amount: 500_000, min_amount: 5_000, max_term_months: 60, currency: 'USD' },
  { sector: 'services', max_amount: 5_000_000, min_amount: 50_000, max_term_months: 48, currency: 'MXN' },
  { sector: 'services', max_amount: 250_000, min_amount: 2_500, max_term_months: 48, currency: 'USD' },
  { sector: 'commerce', max_amount: 8_000_000, min_amount: 100_000, max_term_months: 36, currency: 'MXN' },
  { sector: 'commerce', max_amount: 400_000, min_amount: 5_000, max_term_months: 36, currency: 'USD' },
  { sector: 'default', max_amount: 5_000_000, min_amount: 50_000, max_term_months: 36, currency: 'MXN' },
  { sector: 'default', max_amount: 250_000, min_amount: 2_500, max_term_months: 36, currency: 'USD' },
];

export const DEFAULT_GUARANTEE_POLICY: GuaranteePolicy = {
  base_ratio: 2.0,
  score_adjustments: [
    { min_score: 80, max_score: 100, ratio_adjustment: -0.25 },
    { min_score: 65, max_score: 79, ratio_adjustment: 0 },
    { min_score: 50, max_score: 64, ratio_adjustment: 0.25 },
    { min_score: 0, max_score: 49, ratio_adjustment: 0.50 },
  ],
  sector_adjustments: {
    manufacturing: -0.10,
    services: 0,
    commerce: 0.10,
  },
  term_adjustments: [
    { min_months: 1, max_months: 12, ratio_adjustment: 0 },
    { min_months: 13, max_months: 36, ratio_adjustment: 0.10 },
    { min_months: 37, max_months: 60, ratio_adjustment: 0.25 },
  ],
};

export const DEFAULT_HARD_STOPS: HardStopRule[] = [
  { code: 'compliance_fail', description: 'Compliance check failed (PLD/KYC)', engine: 'compliance', condition: 'module_status === hard_stop', active: true },
  { code: 'dscr_below_1', description: 'DSCR proforma below 1.0', engine: 'cashflow', condition: 'dscr_proforma < 1.0', active: true },
  { code: 'lista_69b', description: 'Applicant on SAT 69B list', engine: 'sat_facturacion', condition: 'lista_69b_status === positive', active: true },
  { code: 'buro_score_critical', description: 'Buro score below 450', engine: 'buro', condition: 'score_pyme < 450', active: true },
  { code: 'prior_default', description: 'Prior default with write-off in last 36 months', engine: 'buro', condition: 'prior_default_history === true', active: true },
];

export const DEFAULT_COVENANT_TEMPLATES: CovenantTemplate[] = [
  { code: 'min_dscr', label: 'Minimum DSCR', type: 'financial', metric: 'dscr', operator: 'gte', threshold: 1.2, frequency_months: 3, description: 'Maintain DSCR >= 1.2x at all times' },
  { code: 'max_leverage', label: 'Maximum Leverage', type: 'financial', metric: 'leverage_ratio', operator: 'lte', threshold: 0.7, frequency_months: 6, description: 'Total leverage must not exceed 70%' },
  { code: 'min_guarantee_coverage', label: 'Minimum Guarantee Coverage', type: 'financial', metric: 'guarantee_coverage', operator: 'gte', threshold: 2.0, frequency_months: 6, description: 'Guarantee coverage must remain >= 2.0x' },
  { code: 'monthly_reporting', label: 'Monthly Financial Reporting', type: 'reporting', metric: 'reporting_compliance', operator: 'gte', threshold: 1, frequency_months: 1, description: 'Submit monthly financial statements' },
  { code: 'no_dividend_restriction', label: 'Dividend Restriction', type: 'operational', metric: 'dividend_paid', operator: 'lte', threshold: 0, frequency_months: 12, description: 'No dividend distribution without prior approval' },
  { code: 'fx_hedge_obligation', label: 'FX Hedge Obligation', type: 'operational', metric: 'fx_hedge_ratio', operator: 'gte', threshold: 0.5, frequency_months: 3, description: 'Maintain FX hedge covering >= 50% of exposure' },
];

// ---------------------------------------------------------------------------
// Pure calculation helpers (exported for testability)
// ---------------------------------------------------------------------------

/**
 * Find the applicable sector limit config for a given sector and currency.
 * Falls back to 'default' sector if no specific match.
 */
export function findSectorLimit(
  limits: SectorLimitConfig[],
  sector: string,
  currency: string,
): SectorLimitConfig | undefined {
  const exact = limits.find(
    (l) => l.sector === sector && l.currency === currency,
  );
  if (exact) return exact;
  return limits.find(
    (l) => l.sector === 'default' && l.currency === currency,
  );
}

/**
 * Validate requested amount and term against sector limits.
 * Returns list of violation messages (empty = all OK).
 */
export function validateLimits(
  sectorLimit: SectorLimitConfig | undefined,
  requestedAmount: number,
  termMonths: number,
): string[] {
  const violations: string[] = [];
  if (!sectorLimit) {
    violations.push('No policy limit configured for this sector/currency combination');
    return violations;
  }
  if (requestedAmount < sectorLimit.min_amount) {
    violations.push(
      `Requested amount (${requestedAmount.toLocaleString()}) below minimum (${sectorLimit.min_amount.toLocaleString()}) for sector ${sectorLimit.sector}`,
    );
  }
  if (requestedAmount > sectorLimit.max_amount) {
    violations.push(
      `Requested amount (${requestedAmount.toLocaleString()}) exceeds maximum (${sectorLimit.max_amount.toLocaleString()}) for sector ${sectorLimit.sector}`,
    );
  }
  if (termMonths > sectorLimit.max_term_months) {
    violations.push(
      `Requested term (${termMonths} months) exceeds maximum (${sectorLimit.max_term_months} months) for sector ${sectorLimit.sector}`,
    );
  }
  return violations;
}

/**
 * Calculate the effective guarantee ratio by applying adjustments
 * for score, sector, and term on top of the base ratio.
 */
export function calcEffectiveGuaranteeRatio(
  policy: GuaranteePolicy,
  score: number,
  sector: string,
  termMonths: number,
): number {
  let ratio = policy.base_ratio;

  // Score adjustment
  const scoreAdj = policy.score_adjustments.find(
    (a) => score >= a.min_score && score <= a.max_score,
  );
  if (scoreAdj) ratio += scoreAdj.ratio_adjustment;

  // Sector adjustment
  const sectorAdj = policy.sector_adjustments[sector] ?? 0;
  ratio += sectorAdj;

  // Term adjustment
  const termAdj = policy.term_adjustments.find(
    (a) => termMonths >= a.min_months && termMonths <= a.max_months,
  );
  if (termAdj) ratio += termAdj.ratio_adjustment;

  // Never go below 1.0x
  return Math.max(1.0, Math.round(ratio * 100) / 100);
}

/**
 * Evaluate hard stop rules against current risk flags.
 * Returns the list of active hard stops that are triggered.
 */
export function evaluateHardStops(
  hardStops: HardStopRule[],
  riskFlags: RiskFlag[],
): HardStopRule[] {
  const activeRules = hardStops.filter((hs) => hs.active);
  const flagCodes = new Set(riskFlags.map((f) => f.code));

  return activeRules.filter((hs) => {
    // Match by code directly
    if (flagCodes.has(hs.code)) return true;
    // Match hard_stop severity flags from the engine
    if (
      riskFlags.some(
        (f) => f.severity === 'hard_stop' && f.source_metric === hs.engine,
      )
    )
      return true;
    // Match if any hard_stop flag references this engine's code pattern
    if (
      riskFlags.some(
        (f) => f.severity === 'hard_stop' && f.code.includes(hs.code),
      )
    )
      return true;
    return false;
  });
}

/**
 * Select applicable covenant templates based on score, grade, and sector.
 * Lower scores get more covenants. Grade A/B get fewer.
 */
export function selectApplicableCovenants(
  templates: CovenantTemplate[],
  score: number,
  grade: ModuleGrade,
  hasUsdExposure: boolean,
): CovenantTemplate[] {
  const applicable: CovenantTemplate[] = [];

  // Financial covenants: always for score < 80
  if (score < 80) {
    applicable.push(...templates.filter((t) => t.code === 'min_dscr'));
  }
  if (score < 65) {
    applicable.push(...templates.filter((t) => t.code === 'max_leverage'));
  }

  // Guarantee coverage covenant for conditional approvals (C/D grades)
  if (grade === 'C' || grade === 'D') {
    applicable.push(
      ...templates.filter((t) => t.code === 'min_guarantee_coverage'),
    );
  }

  // Reporting covenant for D/F grades
  if (grade === 'D' || grade === 'F') {
    applicable.push(
      ...templates.filter((t) => t.code === 'monthly_reporting'),
    );
  }

  // Dividend restriction for score < 60
  if (score < 60) {
    applicable.push(
      ...templates.filter((t) => t.code === 'no_dividend_restriction'),
    );
  }

  // FX hedge obligation for USD exposure
  if (hasUsdExposure) {
    applicable.push(
      ...templates.filter((t) => t.code === 'fx_hedge_obligation'),
    );
  }

  return applicable;
}

/**
 * Run full policy validation combining limits, guarantees, hard stops, and covenants.
 */
export function validatePolicy(
  policySet: PolicySet,
  input: PolicyEngineInput,
): PolicyValidationResult {
  const sectorLimit = findSectorLimit(
    policySet.sector_limits,
    input.sector,
    input.currency,
  );
  const limitViolations = validateLimits(
    sectorLimit,
    input.requested_amount,
    input.term_months,
  );
  const effectiveRatio = calcEffectiveGuaranteeRatio(
    policySet.guarantee_policy,
    input.consolidated_score,
    input.sector,
    input.term_months,
  );
  const activeHardStops = evaluateHardStops(
    policySet.hard_stops,
    input.risk_flags ?? [],
  );
  const hasUsdExposure = input.currency === 'USD';
  const applicableCovenants = selectApplicableCovenants(
    policySet.covenant_templates,
    input.consolidated_score,
    input.grade,
    hasUsdExposure,
  );

  return {
    is_within_limits: limitViolations.length === 0,
    limit_violations: limitViolations,
    effective_guarantee_ratio: effectiveRatio,
    active_hard_stops: activeHardStops,
    applicable_covenants: applicableCovenants,
  };
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

/**
 * Engine score reflects how well the application fits within policy constraints.
 * 100 = fully within limits, no hard stops, minimal covenants needed.
 */
export function calcPolicyScore(result: PolicyValidationResult): number {
  let score = 100;

  // Penalty for limit violations (-25 each)
  score -= result.limit_violations.length * 25;

  // Hard stops = severe penalty
  if (result.active_hard_stops.length > 0) {
    score -= result.active_hard_stops.length * 30;
  }

  // Higher guarantee ratio = more risk = lower score
  if (result.effective_guarantee_ratio > 2.5) score -= 15;
  else if (result.effective_guarantee_ratio > 2.0) score -= 5;

  // More covenants = more conditions = slight penalty
  if (result.applicable_covenants.length > 4) score -= 10;
  else if (result.applicable_covenants.length > 2) score -= 5;

  return Math.max(0, Math.min(100, score));
}

// ---------------------------------------------------------------------------
// Risk flags
// ---------------------------------------------------------------------------

export function generateRiskFlags(
  result: PolicyValidationResult,
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (result.active_hard_stops.length > 0) {
    for (const hs of result.active_hard_stops) {
      flags.push({
        code: `policy_hard_stop_${hs.code}`,
        severity: 'hard_stop',
        message: `Hard stop triggered: ${hs.description}`,
        source_metric: hs.engine,
      });
    }
  }

  for (const violation of result.limit_violations) {
    flags.push({
      code: 'policy_limit_violation',
      severity: 'critical',
      message: violation,
    });
  }

  if (result.effective_guarantee_ratio > 2.5) {
    flags.push({
      code: 'elevated_guarantee_requirement',
      severity: 'warning',
      message: `Guarantee ratio elevated to ${result.effective_guarantee_ratio}x due to risk profile`,
      value: result.effective_guarantee_ratio,
      threshold: 2.0,
    });
  }

  if (result.applicable_covenants.length > 4) {
    flags.push({
      code: 'heavy_covenant_burden',
      severity: 'warning',
      message: `${result.applicable_covenants.length} covenants required — high monitoring burden`,
      value: result.applicable_covenants.length,
    });
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Key metrics builder
// ---------------------------------------------------------------------------

export function buildKeyMetrics(
  result: PolicyValidationResult,
  input: PolicyEngineInput,
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

  return {
    is_within_limits: m(
      'is_within_limits',
      'Within Policy Limits',
      result.is_within_limits ? 1 : 0,
      'boolean',
      result.is_within_limits ? 'Application within all policy limits' : `${result.limit_violations.length} limit violation(s)`,
      result.is_within_limits ? 'positive' : 'negative',
    ),
    effective_guarantee_ratio: m(
      'effective_guarantee_ratio',
      'Effective Guarantee Ratio',
      result.effective_guarantee_ratio,
      'x',
      `${result.effective_guarantee_ratio}x coverage required (base 2.0x adjusted for score/sector/term)`,
      result.effective_guarantee_ratio <= 2.0 ? 'positive' : 'negative',
    ),
    active_hard_stops: m(
      'active_hard_stops',
      'Active Hard Stops',
      result.active_hard_stops.length,
      'count',
      result.active_hard_stops.length === 0
        ? 'No hard stops triggered'
        : `${result.active_hard_stops.length} hard stop(s) active`,
      result.active_hard_stops.length === 0 ? 'positive' : 'negative',
    ),
    applicable_covenants: m(
      'applicable_covenants',
      'Applicable Covenants',
      result.applicable_covenants.length,
      'count',
      result.applicable_covenants.length === 0
        ? 'No covenants required'
        : `${result.applicable_covenants.length} covenant(s) applicable`,
      result.applicable_covenants.length <= 2 ? 'positive' : 'negative',
    ),
    consolidated_score: m(
      'consolidated_score',
      'Consolidated Score',
      input.consolidated_score,
      'pts',
      `Grade ${input.grade}`,
      input.consolidated_score >= 60 ? 'positive' : 'negative',
    ),
  };
}

// ---------------------------------------------------------------------------
// Explanation & recommended actions
// ---------------------------------------------------------------------------

function buildExplanation(
  engineScore: number,
  grade: ModuleGrade,
  result: PolicyValidationResult,
  input: PolicyEngineInput,
): string {
  const parts: string[] = [
    `Policy Engine score: ${engineScore}/100 (Grade ${grade}).`,
    `Sector: ${input.sector}, Currency: ${input.currency}, Amount: ${input.requested_amount.toLocaleString()}, Term: ${input.term_months}m.`,
    result.is_within_limits
      ? 'Application is within all policy limits.'
      : `${result.limit_violations.length} limit violation(s) detected.`,
    `Effective guarantee ratio: ${result.effective_guarantee_ratio}x.`,
  ];
  if (result.active_hard_stops.length > 0) {
    parts.push(
      `Hard stops (${result.active_hard_stops.length}): ${result.active_hard_stops.map((h) => h.code).join(', ')}.`,
    );
  }
  if (result.applicable_covenants.length > 0) {
    parts.push(
      `Covenants (${result.applicable_covenants.length}): ${result.applicable_covenants.map((c) => c.code).join(', ')}.`,
    );
  }
  return parts.join(' ');
}

function buildRecommendedActions(
  result: PolicyValidationResult,
  _flags: RiskFlag[],
): string[] {
  const actions: string[] = [];

  if (result.active_hard_stops.length > 0) {
    actions.push('Resolve hard stop conditions before proceeding with approval');
  }

  if (!result.is_within_limits) {
    actions.push('Adjust requested amount or term to fit within policy limits');
  }

  if (result.effective_guarantee_ratio > 2.5) {
    actions.push('Strengthen guarantee position to meet elevated coverage requirement');
  }

  if (result.applicable_covenants.length > 4) {
    actions.push('Review covenant package — consider simplifying monitoring requirements');
  }

  if (result.applicable_covenants.some((c) => c.code === 'fx_hedge_obligation')) {
    actions.push('Require FX hedge documentation before disbursement');
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Build default policy set (merging with any overrides)
// ---------------------------------------------------------------------------

export function buildPolicySet(overrides?: Partial<PolicySet>): PolicySet {
  return {
    sector_limits: overrides?.sector_limits ?? DEFAULT_SECTOR_LIMITS,
    guarantee_policy: overrides?.guarantee_policy ?? DEFAULT_GUARANTEE_POLICY,
    hard_stops: overrides?.hard_stops ?? DEFAULT_HARD_STOPS,
    covenant_templates: overrides?.covenant_templates ?? DEFAULT_COVENANT_TEMPLATES,
  };
}

// ---------------------------------------------------------------------------
// Main engine runner
// ---------------------------------------------------------------------------

export async function runPolicyEngine(
  input: EngineInput,
): Promise<EngineOutput> {
  const ext = input as unknown as Record<string, unknown>;

  const policyInput: PolicyEngineInput = {
    requested_amount: (ext['requested_amount'] as number | undefined) ?? 0,
    term_months: (ext['term_months'] as number | undefined) ?? 24,
    currency: (ext['currency'] as string | undefined) ?? 'MXN',
    sector: (ext['sector'] as string | undefined) ?? 'default',
    consolidated_score: (ext['consolidated_score'] as number | undefined) ?? 0,
    grade: (ext['grade'] as ModuleGrade | undefined) ?? 'F',
    risk_flags: (ext['risk_flags'] as RiskFlag[] | undefined) ?? [],
    policy_overrides: ext['policy_overrides'] as Partial<PolicySet> | undefined,
  };

  // Build policy set from defaults + any overrides
  const policySet = buildPolicySet(policyInput.policy_overrides);

  // Run full validation
  const result = validatePolicy(policySet, policyInput);

  // Score & grade
  const engineScore = calcPolicyScore(result);
  const grade = scoreToGrade(engineScore);
  const flags = generateRiskFlags(result);
  const status = scoreToStatus(engineScore, flags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: engineScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: flags,
    key_metrics: buildKeyMetrics(result, policyInput),
    benchmark_comparison: {},
    trends: [],
    explanation: buildExplanation(engineScore, grade, result, policyInput),
    recommended_actions: buildRecommendedActions(result, flags),
    created_at: new Date().toISOString(),
  };
}
