// cs-trend-analyzer — Supabase Edge Function
// Batch trend analysis: fetches time series data from cs_trend_timeseries,
// runs trend analysis for each metric, stores results in cs_trend_results.
// POST { application_id } for single app, or { batch: true } for all.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrendAnalyzerRequest {
  application_id?: string;
  batch?: boolean;
}

interface TimeSeriesRow {
  id: string;
  application_id: string;
  metric_name: string;
  period: string;
  value: number;
}

interface TrendResultRow {
  application_id: string;
  metric_name: string;
  direction: string;
  slope: number;
  classification: string;
  projected_values: number[];
  breakpoints: number[];
  analyzed_at: string;
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
// Trend analysis logic (simplified server-side version)
// ---------------------------------------------------------------------------

function calcSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i]! - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function classifyDirection(slope: number, avgValue: number): string {
  if (avgValue === 0) return 'stable';
  const normalizedSlope = slope / Math.abs(avgValue);
  if (normalizedSlope > 0.05) return 'improving';
  if (normalizedSlope < -0.10) return 'critical';
  if (normalizedSlope < -0.03) return 'deteriorating';
  return 'stable';
}

function projectValues(values: number[], slope: number, months: number): number[] {
  const last = values[values.length - 1] ?? 0;
  const projected: number[] = [];
  for (let i = 1; i <= months; i++) {
    projected.push(Math.round((last + slope * i) * 100) / 100);
  }
  return projected;
}

function detectBreakpoints(values: number[]): number[] {
  const breakpoints: number[] = [];
  if (values.length < 3) return breakpoints;
  for (let i = 1; i < values.length - 1; i++) {
    const prev = values[i - 1]!;
    const curr = values[i]!;
    const next = values[i + 1]!;
    const avgNeighbor = (prev + next) / 2;
    if (avgNeighbor !== 0 && Math.abs(curr - avgNeighbor) / Math.abs(avgNeighbor) > 0.20) {
      breakpoints.push(i);
    }
  }
  return breakpoints;
}

function analyzeMetric(
  rows: TimeSeriesRow[],
): Omit<TrendResultRow, 'application_id' | 'analyzed_at'> {
  const sorted = [...rows].sort((a, b) => a.period.localeCompare(b.period));
  const values = sorted.map((r) => r.value);
  const slope = calcSlope(values);
  const avg = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  const direction = classifyDirection(slope, avg);
  const projected = projectValues(values, slope, 3);
  const breakpoints = detectBreakpoints(values);

  return {
    metric_name: rows[0]!.metric_name,
    direction,
    slope: Math.round(slope * 10000) / 10000,
    classification: direction === 'improving' ? 'positive' : direction === 'critical' ? 'negative' : 'neutral',
    projected_values: projected,
    breakpoints,
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

async function handleRequest(body: TrendAnalyzerRequest): Promise<{
  analyzed_count: number;
  applications_processed: number;
  results: TrendResultRow[];
}> {
  const db = getSupabaseClient();
  const now = new Date().toISOString();

  let applicationIds: string[] = [];

  if (body.application_id) {
    applicationIds = [body.application_id];
  } else if (body.batch) {
    const { data } = await db
      .from('cs_applications')
      .select('id')
      .eq('status', 'in_review');
    applicationIds = (data ?? []).map((r: { id: string }) => r.id);
  }

  if (applicationIds.length === 0) {
    return { analyzed_count: 0, applications_processed: 0, results: [] };
  }

  const allResults: TrendResultRow[] = [];

  for (const appId of applicationIds) {
    await auditLog(db, appId, 'trend_analysis_started', {});

    const { data: timeSeries } = await db
      .from('cs_trend_timeseries')
      .select('id, application_id, metric_name, period, value')
      .eq('application_id', appId)
      .order('period', { ascending: true });

    if (!timeSeries || timeSeries.length === 0) {
      await auditLog(db, appId, 'trend_analysis_skipped', { reason: 'no_data' });
      continue;
    }

    // Group by metric_name
    const byMetric = new Map<string, TimeSeriesRow[]>();
    for (const row of timeSeries as TimeSeriesRow[]) {
      if (!byMetric.has(row.metric_name)) byMetric.set(row.metric_name, []);
      byMetric.get(row.metric_name)!.push(row);
    }

    const appResults: TrendResultRow[] = [];

    for (const [, metricRows] of byMetric) {
      if (metricRows.length < 2) continue;
      const analysis = analyzeMetric(metricRows);
      const resultRow: TrendResultRow = {
        application_id: appId,
        ...analysis,
        analyzed_at: now,
      };
      appResults.push(resultRow);
    }

    // Upsert results
    if (appResults.length > 0) {
      // Delete old results for this application
      await db
        .from('cs_trend_results')
        .delete()
        .eq('application_id', appId);

      await db.from('cs_trend_results').insert(appResults);
    }

    await auditLog(db, appId, 'trend_analysis_completed', {
      metrics_analyzed: appResults.length,
    });

    allResults.push(...appResults);
  }

  return {
    analyzed_count: allResults.length,
    applications_processed: applicationIds.length,
    results: allResults,
  };
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

  const parsed = body as TrendAnalyzerRequest;
  if (!parsed.application_id && !parsed.batch) {
    return jsonResponse({ error: 'Provide application_id or batch: true' }, 422);
  }

  try {
    const result = await handleRequest(parsed);
    return jsonResponse(result, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
