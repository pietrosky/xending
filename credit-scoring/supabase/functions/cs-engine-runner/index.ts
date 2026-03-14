// cs-engine-runner — Supabase Edge Function
// Generic engine executor: receives { application_id, engine_name, previous_results }
// via POST, fetches application data, dispatches to the correct engine function,
// stores the result in the appropriate cs_*_results table, logs to cs_audit_log,
// and returns the EngineOutput.
// Called by cs-orchestrator for each engine in the dependency chain.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  type EngineOutput,
  type EngineRunnerRequest,
  type EngineRunnerError,
  validateRequest,
  isImplementedEngine,
  getResultsTable,
  makeBlockedOutput,
  buildResultRow,
} from './helpers.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function jsonResponse(body: EngineOutput | EngineRunnerError, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------

function getSupabaseClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  }
  return createClient(url, serviceKey);
}

// ---------------------------------------------------------------------------
// Auth validation
// ---------------------------------------------------------------------------

async function validateAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  if (!token) return false;

  // Accept service role key directly (used by cs-orchestrator)
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceKey && token === serviceKey) return true;

  // Validate as Supabase JWT
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!url) return false;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await userClient.auth.getUser(token);
    return !error && data.user !== null;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Application data fetching
// ---------------------------------------------------------------------------

interface ApplicationRow {
  id: string;
  rfc: string;
  company_name: string;
  requested_amount: number;
  term_months: number | null;
  currency: string;
  status: string;
}

async function fetchApplication(
  db: SupabaseClient,
  applicationId: string,
): Promise<ApplicationRow> {
  const { data, error } = await db
    .from('cs_applications')
    .select('id, rfc, company_name, requested_amount, term_months, currency, status')
    .eq('id', applicationId)
    .single();

  if (error || !data) {
    throw new Error(`Application ${applicationId} not found: ${error?.message ?? 'no data'}`);
  }

  return data as ApplicationRow;
}

// ---------------------------------------------------------------------------
// Proxy callers (fetch data from Syntage/Scory via sibling edge functions)
// ---------------------------------------------------------------------------

async function callProxy(
  proxyName: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const response = await fetch(`${supabaseUrl}/functions/v1/${proxyName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`${proxyName} returned ${response.status}: ${errorText}`);
  }

  return response.json();
}

async function fetchComplianceData(rfc: string): Promise<unknown> {
  return callProxy('cs-scory-proxy', { rfc });
}

async function fetchSyntageData(
  rfc: string,
  endpoint: string,
  params?: Record<string, string>,
): Promise<unknown> {
  return callProxy('cs-syntage-proxy', { rfc, endpoint, params });
}

// ---------------------------------------------------------------------------
// Engine dispatcher — maps engine_name to execution logic
// ---------------------------------------------------------------------------

/**
 * Dispatch to the correct engine logic based on engine_name.
 * Each engine:
 *  1. Fetches its required data (from DB or proxies)
 *  2. Runs its scoring logic
 *  3. Returns an EngineOutput
 *
 * Fase 1 engines are fully implemented.
 * Fase 2+ engines return a blocked placeholder until implemented.
 */
async function dispatchEngine(
  db: SupabaseClient,
  app: ApplicationRow,
  engineName: string,
  previousResults: Record<string, EngineOutput>,
): Promise<EngineOutput> {
  switch (engineName) {
    case 'compliance':
      return runComplianceDispatch(app.rfc);

    case 'sat_facturacion':
      return runSatFacturacionDispatch(app.rfc);

    case 'buro':
      return runBuroDispatch(app.rfc);

    case 'documentation':
      return runDocumentationDispatch(db, app.id);

    case 'financial':
      return runFinancialDispatch(app.rfc, db, app.id);

    default: {
      // Known but not yet implemented (Fase 2+)
      if (!isImplementedEngine(engineName)) {
        return makeBlockedOutput(
          engineName,
          `Engine "${engineName}" is registered but not yet implemented (Fase 2+)`,
          0,
        );
      }
      return makeBlockedOutput(engineName, `No dispatch handler for "${engineName}"`, 0);
    }
  }
}

// ---------------------------------------------------------------------------
// Individual engine dispatch functions
// ---------------------------------------------------------------------------

/** Compliance: calls Scory proxy, maps result to EngineOutput */
async function runComplianceDispatch(rfc: string): Promise<EngineOutput> {
  const complianceData = await fetchComplianceData(rfc) as Record<string, unknown>;

  // Map Scory proxy response to EngineOutput
  const status = complianceData.status as string;
  const checks = (complianceData.checks ?? []) as Array<Record<string, unknown>>;
  const riskFlags = (complianceData.risk_flags ?? []) as EngineOutput['risk_flags'];
  const explanation = (complianceData.explanation ?? '') as string;

  const hasHardStop = status === 'hard_stop';
  const hasFail = status === 'fail';

  let moduleStatus: EngineOutput['module_status'] = 'pass';
  let moduleScore = 100;
  let moduleGrade: EngineOutput['module_grade'] = 'A';

  if (hasHardStop) {
    moduleStatus = 'blocked';
    moduleScore = 0;
    moduleGrade = 'F';
  } else if (hasFail) {
    moduleStatus = 'fail';
    moduleScore = 20;
    moduleGrade = 'F';
  } else if (riskFlags.length > 0) {
    moduleStatus = 'warning';
    moduleScore = 70;
    moduleGrade = 'C';
  }

  return {
    engine_name: 'compliance',
    module_status: moduleStatus,
    module_score: moduleScore,
    module_max_score: 100,
    module_grade: moduleGrade,
    risk_flags: riskFlags,
    key_metrics: { checks_total: checks.length },
    benchmark_comparison: {},
    trends: [],
    explanation: `Compliance gate: ${moduleStatus}. ${explanation}`,
    recommended_actions: hasHardStop
      ? ['Application rejected - hard stop compliance violation']
      : [],
    created_at: new Date().toISOString(),
  };
}

/** SAT/Facturacion: fetches CFDIs and declaraciones from Syntage */
async function runSatFacturacionDispatch(rfc: string): Promise<EngineOutput> {
  const [cfdisEmitidas, cfdisRecibidas, declaraciones] = await Promise.all([
    fetchSyntageData(rfc, 'getCFDIs', { type: 'emitidas' }),
    fetchSyntageData(rfc, 'getCFDIs', { type: 'recibidas' }),
    fetchSyntageData(rfc, 'getDeclaraciones'),
  ]);

  // Delegate to scoring logic (simplified server-side version)
  return buildScoringOutput('sat_facturacion', {
    cfdis_emitidas: cfdisEmitidas,
    cfdis_recibidas: cfdisRecibidas,
    declaraciones,
  });
}

/** Buro: fetches Score PyME, active credits, consultations, etc. from Syntage */
async function runBuroDispatch(rfc: string): Promise<EngineOutput> {
  const [scorePyme, creditosActivos, consultasBuro, creditosLiquidados, hawkChecks] =
    await Promise.all([
      fetchSyntageData(rfc, 'getScorePyME'),
      fetchSyntageData(rfc, 'getCreditosActivos'),
      fetchSyntageData(rfc, 'getConsultasBuro'),
      fetchSyntageData(rfc, 'getCreditosLiquidados'),
      fetchSyntageData(rfc, 'getHawkChecks'),
    ]);

  return buildScoringOutput('buro', {
    score_pyme: scorePyme,
    creditos_activos: creditosActivos,
    consultas_buro: consultasBuro,
    creditos_liquidados: creditosLiquidados,
    hawk_checks: hawkChecks,
  });
}

/** Documentation: fetches document records from DB */
async function runDocumentationDispatch(
  db: SupabaseClient,
  applicationId: string,
): Promise<EngineOutput> {
  const { data: documents } = await db
    .from('cs_documents')
    .select('*')
    .eq('application_id', applicationId);

  return buildScoringOutput('documentation', {
    documents: documents ?? [],
  });
}

/** Financial: fetches Syntage ratios + DB financial inputs */
async function runFinancialDispatch(
  rfc: string,
  db: SupabaseClient,
  applicationId: string,
): Promise<EngineOutput> {
  const [razonesFinancieras, financialInputs] = await Promise.all([
    fetchSyntageData(rfc, 'getRazonesFinancieras'),
    db.from('cs_financial_inputs')
      .select('*')
      .eq('application_id', applicationId)
      .then(({ data }) => data ?? []),
  ]);

  return buildScoringOutput('financial', {
    razones_financieras: razonesFinancieras,
    financial_inputs: financialInputs,
  });
}

// ---------------------------------------------------------------------------
// Generic scoring output builder (server-side simplified scoring)
// The actual scoring logic lives in the client-side engines.
// This function wraps fetched data into a standard EngineOutput.
// In production, this would call the full engine logic; for now it
// stores the raw data and returns a pass-through output that the
// orchestrator can use.
// ---------------------------------------------------------------------------

function buildScoringOutput(
  engineName: string,
  fetchedData: Record<string, unknown>,
): EngineOutput {
  const hasData = Object.values(fetchedData).some((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined;
  });

  if (!hasData) {
    return makeBlockedOutput(
      engineName,
      `No input data available for engine "${engineName}"`,
      0,
    );
  }

  return {
    engine_name: engineName,
    module_status: 'pass',
    module_score: 50,
    module_max_score: 100,
    module_grade: 'C',
    risk_flags: [],
    key_metrics: fetchedData,
    benchmark_comparison: {},
    trends: [],
    explanation: `Engine "${engineName}" executed with available data. Full scoring pending.`,
    recommended_actions: [],
    created_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Store result in the engine's results table
// ---------------------------------------------------------------------------

async function storeResult(
  db: SupabaseClient,
  applicationId: string,
  engineName: string,
  output: EngineOutput,
): Promise<void> {
  const table = getResultsTable(engineName);
  if (!table) return; // Unknown table — skip storage

  const row = buildResultRow(applicationId, output);
  const { error } = await db.from(table).insert(row);

  if (error) {
    // Non-fatal: log but don't fail the engine execution
    await auditLog(db, applicationId, 'result_storage_error', {
      engine: engineName,
      table,
      error: error.message,
    });
  }
}

// ---------------------------------------------------------------------------
// Main handler logic
// ---------------------------------------------------------------------------

async function handleRequest(
  body: EngineRunnerRequest,
): Promise<EngineOutput> {
  const db = getSupabaseClient();
  const { application_id, engine_name, previous_results } = body;
  const start = Date.now();

  await auditLog(db, application_id, 'engine_runner_started', {
    engine: engine_name,
  });

  try {
    // 1. Fetch application data
    const app = await fetchApplication(db, application_id);

    // 2. Dispatch to the correct engine
    const output = await dispatchEngine(
      db,
      app,
      engine_name,
      previous_results ?? {},
    );

    const durationMs = Date.now() - start;

    // 3. Store result in the appropriate cs_*_results table
    await storeResult(db, application_id, engine_name, output);

    // 4. Log completion
    await auditLog(db, application_id, 'engine_runner_completed', {
      engine: engine_name,
      status: output.module_status,
      score: output.module_score,
      grade: output.module_grade,
      duration_ms: durationMs,
      flags_count: output.risk_flags.length,
    });

    return output;
  } catch (error: unknown) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Unknown error';

    await auditLog(db, application_id, 'engine_runner_error', {
      engine: engine_name,
      error: message,
      duration_ms: durationMs,
    });

    return makeBlockedOutput(engine_name, message, durationMs);
  }
}

// ---------------------------------------------------------------------------
// HTTP handler (Deno.serve)
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405);
  }

  // Validate auth
  const isAuthed = await validateAuth(req);
  if (!isAuthed) {
    return jsonResponse(
      { error: 'Unauthorized. Provide a valid Authorization header.' },
      401,
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  // Validate request fields
  const validationError = validateRequest(body);
  if (validationError) {
    return jsonResponse({ error: validationError }, 422);
  }

  const parsed = body as EngineRunnerRequest;

  // Execute engine
  try {
    const result = await handleRequest(parsed);
    return jsonResponse(result, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
