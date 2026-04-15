// cs-orchestrator — Supabase Edge Function
// Coordinates the full credit scoring flow for a credit application.
// Receives applicationId via POST, runs engines in dependency order,
// updates application status at each step, and logs to cs_audit_log.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types (self-contained for Deno edge function — mirrors engine.types.ts)
// ---------------------------------------------------------------------------

type ApplicationStatus =
  | 'pending_scoring'
  | 'scoring_in_progress'
  | 'scored'
  | 'approved'
  | 'conditional'
  | 'committee'
  | 'rejected';

type ModuleStatus = 'pass' | 'fail' | 'warning' | 'blocked';
type ModuleGrade = 'A' | 'B' | 'C' | 'D' | 'F';
type FlagSeverity = 'info' | 'warning' | 'critical' | 'hard_stop';

interface RiskFlag {
  code: string;
  severity: FlagSeverity;
  message: string;
  source_metric?: string;
  value?: number;
  threshold?: number;
}

interface EngineOutput {
  engine_name: string;
  module_status: ModuleStatus;
  module_score: number;
  module_max_score: number;
  module_grade: ModuleGrade;
  risk_flags: RiskFlag[];
  key_metrics: Record<string, unknown>;
  benchmark_comparison: Record<string, unknown>;
  trends: unknown[];
  explanation: string;
  recommended_actions: string[];
  created_at: string;
}

interface OrchestratorResult {
  application_id: string;
  status: ApplicationStatus;
  compliance_passed: boolean;
  engines_completed: string[];
  engines_failed: string[];
  consolidated_score: number | null;
  final_decision: string | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Engine dependency phases — executed sequentially, engines within a phase
// run in parallel where possible.
// ---------------------------------------------------------------------------

/** Engines grouped by execution phase (dependency order from design doc) */
const ENGINE_PHASES: string[][] = [
  // Phase 0: Compliance gate (must pass before anything else)
  ['compliance'],
  // Phase 1: Data-independent engines (SAT, Buro, Documentation)
  ['sat_facturacion', 'buro', 'documentation'],
  // Phase 2: Depend on Phase 1 results
  ['financial', 'network', 'employee', 'cashflow'],
  // Phase 3: Depend on Phase 2
  ['working_capital', 'stability', 'operational', 'fx_risk'],
  // Phase 4: Guarantee (depends on score context)
  ['guarantee'],
  // Phase 5: Cross-cutting engines
  ['benchmark', 'portfolio', 'graph_fraud'],
];


// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

function getSupabaseClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  }
  return createClient(url, serviceKey);
}

/** Log an action to cs_audit_log */
async function auditLog(
  db: SupabaseClient,
  applicationId: string,
  action: string,
  details: Record<string, unknown>,
): Promise<void> {
  await db.from('cs_audit_log').insert({
    application_id: applicationId,
    action,
    details,
    created_at: new Date().toISOString(),
  });
}

/** Update application status and log the transition */
async function updateApplicationStatus(
  db: SupabaseClient,
  applicationId: string,
  newStatus: ApplicationStatus,
  reason?: string,
): Promise<void> {
  // Get current status
  const { data: app } = await db
    .from('cs_applications')
    .select('status')
    .eq('id', applicationId)
    .single();

  const oldStatus = (app as { status: string } | null)?.status ?? null;

  // Update application
  await db
    .from('cs_applications')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', applicationId);

  // Log status transition
  await db.from('cs_application_status_log').insert({
    application_id: applicationId,
    old_status: oldStatus,
    new_status: newStatus,
    reason: reason ?? `Orchestrator: status → ${newStatus}`,
    created_at: new Date().toISOString(),
  });
}


// ---------------------------------------------------------------------------
// Engine invocation (calls cs-engine-runner edge function)
// ---------------------------------------------------------------------------

/**
 * Invoke a single engine via the cs-engine-runner edge function.
 * Falls back to a blocked EngineOutput on failure.
 */
async function invokeEngine(
  db: SupabaseClient,
  applicationId: string,
  engineName: string,
  previousResults: Record<string, EngineOutput>,
): Promise<EngineOutput> {
  const start = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const response = await fetch(`${supabaseUrl}/functions/v1/cs-engine-runner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        application_id: applicationId,
        engine_name: engineName,
        previous_results: previousResults,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Engine runner returned ${response.status}: ${errorText}`);
    }

    const result = (await response.json()) as EngineOutput;
    const durationMs = Date.now() - start;

    await auditLog(db, applicationId, `engine_completed`, {
      engine: engineName,
      status: result.module_status,
      score: result.module_score,
      grade: result.module_grade,
      duration_ms: durationMs,
      flags_count: result.risk_flags.length,
    });

    return result;
  } catch (error: unknown) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Unknown error';

    await auditLog(db, applicationId, `engine_failed`, {
      engine: engineName,
      error: message,
      duration_ms: durationMs,
    });

    return {
      engine_name: engineName,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'engine_execution_error',
        severity: 'critical',
        message: `Engine ${engineName} failed: ${message}`,
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: `Engine "${engineName}" failed after ${durationMs}ms: ${message}`,
      recommended_actions: ['Review engine error and retry'],
      created_at: new Date().toISOString(),
    };
  }
}

/**
 * Run a phase of engines in parallel.
 * Returns results keyed by engine name.
 */
async function runPhase(
  db: SupabaseClient,
  applicationId: string,
  engineNames: string[],
  previousResults: Record<string, EngineOutput>,
): Promise<Record<string, EngineOutput>> {
  const results = await Promise.all(
    engineNames.map((name) => invokeEngine(db, applicationId, name, previousResults)),
  );

  const phaseResults: Record<string, EngineOutput> = {};
  engineNames.forEach((name, i) => {
    phaseResults[name] = results[i];
  });
  return phaseResults;
}


// ---------------------------------------------------------------------------
// Score calculation (mirrors scoreCalculator.ts logic for edge function)
// ---------------------------------------------------------------------------

const SCORE_WEIGHTS: Record<string, number> = {
  cashflow: 0.16,
  sat_facturacion: 0.14,
  financial: 0.11,
  buro: 0.10,
  stability: 0.09,
  operational: 0.09,
  network: 0.08,
  fx_risk: 0.07,
  portfolio: 0.05,
  working_capital: 0.04,
  documentation: 0.04,
  employee: 0.03,
};

function calculateConsolidatedScore(
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

function calculateDecision(
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

// ---------------------------------------------------------------------------
// Main orchestration flow
// ---------------------------------------------------------------------------

async function processApplication(applicationId: string): Promise<OrchestratorResult> {
  const db = getSupabaseClient();

  // Validate application exists
  const { data: application, error: appError } = await db
    .from('cs_applications')
    .select('id, rfc, status')
    .eq('id', applicationId)
    .single();

  if (appError || !application) {
    throw new Error(`Application ${applicationId} not found: ${appError?.message ?? 'no data'}`);
  }

  await auditLog(db, applicationId, 'orchestrator_started', {
    rfc: (application as Record<string, unknown>).rfc,
    previous_status: (application as Record<string, unknown>).status,
  });

  // Mark as scoring in progress
  await updateApplicationStatus(db, applicationId, 'scoring_in_progress', 'Scoring started by orchestrator');

  const allResults: Record<string, EngineOutput> = {};
  const enginesCompleted: string[] = [];
  const enginesFailed: string[] = [];

  // --- Phase 0: Compliance Gate ---
  await auditLog(db, applicationId, 'phase_started', { phase: 0, engines: ENGINE_PHASES[0] });

  const complianceResults = await runPhase(db, applicationId, ENGINE_PHASES[0], allResults);
  Object.assign(allResults, complianceResults);

  const complianceOutput = complianceResults['compliance'];
  const compliancePassed = complianceOutput.module_status !== 'blocked';
  enginesCompleted.push('compliance');

  if (!compliancePassed) {
    // Hard stop — reject immediately
    await updateApplicationStatus(db, applicationId, 'rejected', 'Compliance hard stop');
    await auditLog(db, applicationId, 'orchestrator_completed', {
      result: 'rejected',
      reason: 'compliance_hard_stop',
      flags: complianceOutput.risk_flags,
    });

    return {
      application_id: applicationId,
      status: 'rejected',
      compliance_passed: false,
      engines_completed: enginesCompleted,
      engines_failed: enginesFailed,
      consolidated_score: null,
      final_decision: 'rejected',
    };
  }

  // --- Phases 1-5: Run remaining engine phases sequentially ---
  for (let phaseIdx = 1; phaseIdx < ENGINE_PHASES.length; phaseIdx++) {
    const phaseEngines = ENGINE_PHASES[phaseIdx];

    await auditLog(db, applicationId, 'phase_started', {
      phase: phaseIdx,
      engines: phaseEngines,
    });

    const phaseResults = await runPhase(db, applicationId, phaseEngines, allResults);
    Object.assign(allResults, phaseResults);

    for (const [name, result] of Object.entries(phaseResults)) {
      if (result.module_status === 'blocked') {
        enginesFailed.push(name);
      } else {
        enginesCompleted.push(name);
      }
    }

    await auditLog(db, applicationId, 'phase_completed', {
      phase: phaseIdx,
      engines: phaseEngines,
      results: Object.fromEntries(
        Object.entries(phaseResults).map(([k, v]) => [k, {
          status: v.module_status,
          score: v.module_score,
          grade: v.module_grade,
        }]),
      ),
    });
  }

  // --- Calculate consolidated score ---
  const consolidatedScore = calculateConsolidatedScore(allResults);

  // Check for hard stops across all engines
  const hasHardStops = Object.values(allResults).some((r) =>
    r.risk_flags.some((f) => f.severity === 'hard_stop'),
  );

  const finalDecision = calculateDecision(consolidatedScore, compliancePassed, hasHardStops);

  // Update final status
  await updateApplicationStatus(
    db,
    applicationId,
    finalDecision,
    `Score: ${consolidatedScore}, Decision: ${finalDecision}`,
  );

  await auditLog(db, applicationId, 'orchestrator_completed', {
    consolidated_score: consolidatedScore,
    final_decision: finalDecision,
    engines_completed: enginesCompleted,
    engines_failed: enginesFailed,
    has_hard_stops: hasHardStops,
    total_flags: Object.values(allResults).reduce((sum, r) => sum + r.risk_flags.length, 0),
  });

  return {
    application_id: applicationId,
    status: finalDecision,
    compliance_passed: compliancePassed,
    engines_completed: enginesCompleted,
    engines_failed: enginesFailed,
    consolidated_score: consolidatedScore,
    final_decision: finalDecision,
  };
}


// ---------------------------------------------------------------------------
// HTTP handler (Deno.serve)
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } },
    );
  }

  try {
    const body = (await req.json()) as { application_id?: string };

    if (!body.application_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: application_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const result = await processApplication(body.application_id);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';

    // Try to log the error if we have an application_id
    try {
      const body = await req.clone().json() as { application_id?: string };
      if (body.application_id) {
        const db = getSupabaseClient();
        await auditLog(db, body.application_id, 'orchestrator_error', { error: message });
        await updateApplicationStatus(db, body.application_id, 'pending_scoring', `Error: ${message}`);
      }
    } catch {
      // Best-effort error logging
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
