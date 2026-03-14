// cs-report-generator — Supabase Edge Function
// Generates a JSON report payload with Xending branding metadata.
// The actual PDF rendering happens client-side using this structured data.
// POST { application_id }

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const XENDING_BRANDING = {
  company_name: 'Xending Capital',
  logo_url: '/brand/Logo Scory.png',
  primary_color: '#1a1a2e',
  secondary_color: '#16213e',
  accent_color: '#0f3460',
  report_title: 'Credit Scoring Report',
  footer_text: 'Confidential - Xending Capital',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportRequest {
  application_id: string;
}

interface ApplicationData {
  id: string;
  rfc: string;
  company_name: string;
  requested_amount: number;
  term_months: number | null;
  currency: string;
  status: string;
  created_at: string;
}

interface EngineResult {
  engine_name: string;
  module_status: string;
  module_score: number;
  module_grade: string;
  risk_flags: unknown[];
  key_metrics: Record<string, unknown>;
  explanation: string;
  recommended_actions: string[];
}

interface ReportPayload {
  branding: typeof XENDING_BRANDING;
  generated_at: string;
  application: ApplicationData;
  executive_summary: {
    overall_score: number;
    overall_grade: string;
    overall_status: string;
    total_engines: number;
    engines_passed: number;
    engines_failed: number;
    engines_warning: number;
    critical_flags_count: number;
    top_risks: string[];
    top_strengths: string[];
  };
  engine_results: EngineResult[];
  trend_summary: unknown[];
  recommended_actions: string[];
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function getSupabaseClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  }
  return createClient(url, serviceKey);
}

async function validateAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  if (!token) return false;

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (serviceKey && token === serviceKey) return true;

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
// Data fetching
// ---------------------------------------------------------------------------

async function fetchApplication(
  db: SupabaseClient,
  applicationId: string,
): Promise<ApplicationData> {
  const { data, error } = await db
    .from('cs_applications')
    .select('id, rfc, company_name, requested_amount, term_months, currency, status, created_at')
    .eq('id', applicationId)
    .single();

  if (error || !data) {
    throw new Error(`Application ${applicationId} not found`);
  }
  return data as ApplicationData;
}

/** Fetch all engine results from the audit log (latest per engine) */
async function fetchEngineResults(
  db: SupabaseClient,
  applicationId: string,
): Promise<EngineResult[]> {
  const { data } = await db
    .from('cs_audit_log')
    .select('details')
    .eq('application_id', applicationId)
    .eq('action', 'engine_runner_completed')
    .order('created_at', { ascending: false });

  if (!data || data.length === 0) return [];

  const seen = new Set<string>();
  const results: EngineResult[] = [];

  for (const row of data) {
    const d = row.details as Record<string, unknown>;
    const engineName = d.engine as string;
    if (!engineName || seen.has(engineName)) continue;
    seen.add(engineName);

    results.push({
      engine_name: engineName,
      module_status: (d.status as string) ?? 'blocked',
      module_score: (d.score as number) ?? 0,
      module_grade: (d.grade as string) ?? 'F',
      risk_flags: [],
      key_metrics: {},
      explanation: '',
      recommended_actions: [],
    });
  }

  return results;
}

async function fetchTrendSummary(
  db: SupabaseClient,
  applicationId: string,
): Promise<unknown[]> {
  const { data } = await db
    .from('cs_trend_results')
    .select('metric_name, direction, slope, classification')
    .eq('application_id', applicationId);

  return data ?? [];
}

// ---------------------------------------------------------------------------
// Report builder
// ---------------------------------------------------------------------------

function buildExecutiveSummary(results: EngineResult[]): ReportPayload['executive_summary'] {
  const passed = results.filter((r) => r.module_status === 'pass').length;
  const failed = results.filter((r) => r.module_status === 'fail' || r.module_status === 'blocked').length;
  const warning = results.filter((r) => r.module_status === 'warning').length;

  const totalScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.module_score, 0) / results.length)
    : 0;

  const overallGrade = totalScore >= 80 ? 'A' : totalScore >= 65 ? 'B' : totalScore >= 50 ? 'C' : totalScore >= 35 ? 'D' : 'F';
  const overallStatus = failed > 0 ? 'fail' : warning > 0 ? 'warning' : 'pass';

  const criticalFlags = results.reduce((count, r) => {
    const flags = r.risk_flags as Array<{ severity?: string }>;
    return count + flags.filter((f) => f.severity === 'critical' || f.severity === 'hard_stop').length;
  }, 0);

  // Top risks: engines with lowest scores
  const sorted = [...results].sort((a, b) => a.module_score - b.module_score);
  const topRisks = sorted.slice(0, 3).filter((r) => r.module_score < 60).map((r) => `${r.engine_name}: score ${r.module_score}/100`);

  // Top strengths: engines with highest scores
  const topStrengths = sorted.reverse().slice(0, 3).filter((r) => r.module_score >= 70).map((r) => `${r.engine_name}: score ${r.module_score}/100`);

  return {
    overall_score: totalScore,
    overall_grade: overallGrade,
    overall_status: overallStatus,
    total_engines: results.length,
    engines_passed: passed,
    engines_failed: failed,
    engines_warning: warning,
    critical_flags_count: criticalFlags,
    top_risks: topRisks,
    top_strengths: topStrengths,
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

async function handleRequest(body: ReportRequest): Promise<ReportPayload> {
  const db = getSupabaseClient();
  const { application_id } = body;

  await auditLog(db, application_id, 'report_generation_started', {});

  const application = await fetchApplication(db, application_id);
  const engineResults = await fetchEngineResults(db, application_id);
  const trendSummary = await fetchTrendSummary(db, application_id);
  const executiveSummary = buildExecutiveSummary(engineResults);

  const allActions = engineResults.flatMap((r) => r.recommended_actions);
  const uniqueActions = [...new Set(allActions)];

  const payload: ReportPayload = {
    branding: XENDING_BRANDING,
    generated_at: new Date().toISOString(),
    application,
    executive_summary: executiveSummary,
    engine_results: engineResults,
    trend_summary: trendSummary,
    recommended_actions: uniqueActions,
  };

  await auditLog(db, application_id, 'report_generation_completed', {
    engines_count: engineResults.length,
    overall_score: executiveSummary.overall_score,
    overall_grade: executiveSummary.overall_grade,
  });

  return payload;
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Use POST.' }, 405);
  }

  const isAuthed = await validateAuth(req);
  if (!isAuthed) {
    return jsonResponse({ error: 'Unauthorized.' }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const parsed = body as ReportRequest;
  if (!parsed.application_id) {
    return jsonResponse({ error: 'application_id is required' }, 422);
  }

  try {
    const result = await handleRequest(parsed);
    return jsonResponse(result, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
