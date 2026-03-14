// cs-scory-proxy — Supabase Edge Function
// Secure proxy to Scory API for PLD/KYC compliance validation.
// Receives RFC via POST, validates auth, checks cache, calls Scory with retry,
// logs to cs_api_calls, caches in cs_api_cache (24h TTL).
// SCORY_API_KEY is never exposed to the client.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types (self-contained for Deno edge function — mirrors scoryClient.ts)
// ---------------------------------------------------------------------------

type ComplianceStatus = 'pass' | 'fail' | 'hard_stop';
type FlagSeverity = 'info' | 'warning' | 'critical' | 'hard_stop';

interface ComplianceCheck {
  check_type: string;
  result: 'pass' | 'fail' | 'review_required';
  details: Record<string, unknown>;
}

interface RiskFlag {
  code: string;
  severity: FlagSeverity;
  message: string;
  source_metric?: string;
  value?: number;
  threshold?: number;
}

interface ComplianceResult {
  status: ComplianceStatus;
  checks: ComplianceCheck[];
  risk_flags: RiskFlag[];
  explanation: string;
  manual_override: boolean;
}

interface RequestBody {
  rfc?: string;
}

interface CacheRow {
  response_data: ComplianceResult;
  expires_at: string;
}

interface ErrorResponse {
  error: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROVIDER = 'scory';
const ENDPOINT = 'validateCompliance';
const MAX_RETRIES = 3;
const CACHE_HOURS = 24;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Exponential backoff delay: 1s, 2s, 4s */
function backoffDelay(attempt: number): number {
  return Math.pow(2, attempt) * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Validate RFC format (Mexican tax ID: 12-13 alphanumeric chars) */
function isValidRfc(rfc: string): boolean {
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i.test(rfc);
}

function jsonResponse(body: ComplianceResult | ErrorResponse, status: number): Response {
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

/**
 * Validate the Authorization header.
 * Accepts a valid Supabase JWT or the service role key.
 */
async function validateAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  if (!token) return false;

  // Accept service role key directly
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
// Cache (cs_api_cache — 24h TTL)
// ---------------------------------------------------------------------------

async function getCachedResult(
  db: SupabaseClient,
  rfc: string,
): Promise<ComplianceResult | null> {
  const { data, error } = await db
    .from('cs_api_cache')
    .select('response_data, expires_at')
    .eq('provider', PROVIDER)
    .eq('endpoint', ENDPOINT)
    .eq('rfc', rfc)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return (data as CacheRow).response_data;
}

async function setCacheResult(
  db: SupabaseClient,
  rfc: string,
  result: ComplianceResult,
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + CACHE_HOURS * 60 * 60 * 1000,
  ).toISOString();

  await db.from('cs_api_cache').insert({
    provider: PROVIDER,
    endpoint: ENDPOINT,
    rfc,
    response_data: result,
    expires_at: expiresAt,
  });
}

// ---------------------------------------------------------------------------
// API call logging (cs_api_calls)
// ---------------------------------------------------------------------------

async function logApiCall(
  db: SupabaseClient,
  statusCode: number,
  latencyMs: number,
  errorMessage?: string,
): Promise<void> {
  await db.from('cs_api_calls').insert({
    provider: PROVIDER,
    endpoint: ENDPOINT,
    status_code: statusCode,
    latency_ms: latencyMs,
    error_message: errorMessage ?? null,
  });
}

// ---------------------------------------------------------------------------
// Scory API call with exponential backoff retry (max 3)
// ---------------------------------------------------------------------------

async function callScoryApi(
  db: SupabaseClient,
  rfc: string,
): Promise<ComplianceResult> {
  const apiKey = Deno.env.get('SCORY_API_KEY');
  if (!apiKey) {
    throw new Error('Missing SCORY_API_KEY environment variable');
  }

  const baseUrl = Deno.env.get('SCORY_API_URL') ?? 'https://api.scory.mx';
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(backoffDelay(attempt));
    }

    const start = performance.now();

    try {
      const response = await fetch(`${baseUrl}/v1/compliance/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ rfc }),
      });

      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        await logApiCall(db, response.status, latencyMs, errorText);
        lastError = new Error(`Scory API ${response.status}: ${errorText}`);
        continue;
      }

      const data = (await response.json()) as ComplianceResult;
      await logApiCall(db, response.status, latencyMs);
      return data;
    } catch (error: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const message = error instanceof Error ? error.message : 'Network error';
      await logApiCall(db, 0, latencyMs, message);
      lastError = error instanceof Error ? error : new Error(message);
    }
  }

  throw lastError ?? new Error('Scory API failed after retries');
}

// ---------------------------------------------------------------------------
// Fallback result when API is unavailable
// ---------------------------------------------------------------------------

function makeFallbackResult(rfc: string, errorMessage: string): ComplianceResult {
  return {
    status: 'fail',
    checks: [],
    risk_flags: [
      {
        code: 'scory_api_unavailable',
        severity: 'critical',
        message: `Scory API unavailable for RFC ${rfc}: ${errorMessage}`,
      },
    ],
    explanation: `Compliance validation could not be completed. Manual review required. Error: ${errorMessage}`,
    manual_override: true,
  };
}

// ---------------------------------------------------------------------------
// Main handler logic
// ---------------------------------------------------------------------------

async function handleRequest(rfc: string): Promise<{ result: ComplianceResult; fromCache: boolean }> {
  const db = getSupabaseClient();

  // 1. Check 24h cache
  const cached = await getCachedResult(db, rfc);
  if (cached) {
    return { result: cached, fromCache: true };
  }

  // 2. Call Scory API with retry + backoff
  try {
    const result = await callScoryApi(db, rfc);

    // 3. Store in cache
    await setCacheResult(db, rfc, result);

    return { result, fromCache: false };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { result: makeFallbackResult(rfc, message), fromCache: false };
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
    return jsonResponse({ error: 'Unauthorized. Provide a valid Authorization header.' }, 401);
  }

  // Parse body
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  // Validate RFC
  const rfc = body.rfc?.trim();
  if (!rfc) {
    return jsonResponse({ error: 'Missing required field: rfc' }, 400);
  }

  if (!isValidRfc(rfc)) {
    return jsonResponse({ error: `Invalid RFC format: ${rfc}` }, 422);
  }

  // Process request
  try {
    const { result } = await handleRequest(rfc);
    return jsonResponse(result, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
