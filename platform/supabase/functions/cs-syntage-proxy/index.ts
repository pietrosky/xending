// cs-syntage-proxy — Supabase Edge Function
// Generic secure proxy to Syntage API (SAT, Buro, Indicadores, Registro Publico).
// Receives { rfc, endpoint, params? } via POST, validates auth, checks cache,
// calls Syntage with retry + exponential backoff, logs to cs_api_calls,
// caches in cs_api_cache (24h TTL).
// SYNTAGE_API_KEY is never exposed to the client.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  type SyntageProxyRequest,
  type SyntageProxyError,
  resolveEndpointPath,
  backoffDelay,
  buildCacheKey,
  buildApiUrl,
  validateRequest,
} from './helpers.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROVIDER = 'syntage';
const MAX_RETRIES = 3;
const CACHE_HOURS = 24;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonResponse(body: unknown, status: number): Response {
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

interface CacheRow {
  response_data: unknown;
  expires_at: string;
}

async function getCachedResult(
  db: SupabaseClient,
  cacheKey: string,
  rfc: string,
): Promise<unknown | null> {
  const { data, error } = await db
    .from('cs_api_cache')
    .select('response_data, expires_at')
    .eq('provider', PROVIDER)
    .eq('endpoint', cacheKey)
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
  cacheKey: string,
  rfc: string,
  result: unknown,
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + CACHE_HOURS * 60 * 60 * 1000,
  ).toISOString();

  await db.from('cs_api_cache').insert({
    provider: PROVIDER,
    endpoint: cacheKey,
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
  endpoint: string,
  statusCode: number,
  latencyMs: number,
  errorMessage?: string,
): Promise<void> {
  await db.from('cs_api_calls').insert({
    provider: PROVIDER,
    endpoint,
    status_code: statusCode,
    latency_ms: latencyMs,
    error_message: errorMessage ?? null,
  });
}

// ---------------------------------------------------------------------------
// Syntage API call with exponential backoff retry (max 3)
// ---------------------------------------------------------------------------

async function callSyntageApi(
  db: SupabaseClient,
  endpoint: string,
  apiPath: string,
  rfc: string,
  params?: Record<string, string>,
): Promise<unknown> {
  const apiKey = Deno.env.get('SYNTAGE_API_KEY');
  if (!apiKey) {
    throw new Error('Missing SYNTAGE_API_KEY environment variable');
  }

  const baseUrl = Deno.env.get('SYNTAGE_API_URL') ?? 'https://api.syntage.com';
  const url = buildApiUrl(baseUrl, apiPath, rfc, params);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(backoffDelay(attempt));
    }

    const start = performance.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        await logApiCall(db, endpoint, response.status, latencyMs, errorText);
        lastError = new Error(`Syntage API ${response.status}: ${errorText}`);
        continue;
      }

      const data: unknown = await response.json();
      await logApiCall(db, endpoint, response.status, latencyMs);
      return data;
    } catch (error: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const message = error instanceof Error ? error.message : 'Network error';
      await logApiCall(db, endpoint, 0, latencyMs, message);
      lastError = error instanceof Error ? error : new Error(message);
    }
  }

  throw lastError ?? new Error(`Syntage API ${endpoint} failed after ${MAX_RETRIES} retries`);
}

// ---------------------------------------------------------------------------
// Main handler logic
// ---------------------------------------------------------------------------

async function handleRequest(
  body: SyntageProxyRequest,
): Promise<{ data: unknown; fromCache: boolean }> {
  const db = getSupabaseClient();
  const { rfc, endpoint, params } = body;

  const apiPath = resolveEndpointPath(endpoint);
  if (!apiPath) {
    throw new Error(`Unknown endpoint: ${endpoint}`);
  }

  const cacheKey = buildCacheKey(endpoint, params);

  // 1. Check 24h cache
  const cached = await getCachedResult(db, cacheKey, rfc);
  if (cached) {
    return { data: cached, fromCache: true };
  }

  // 2. Call Syntage API with retry + backoff
  const data = await callSyntageApi(db, endpoint, apiPath, rfc, params);

  // 3. Store in cache
  await setCacheResult(db, cacheKey, rfc, data);

  return { data, fromCache: false };
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
    return jsonResponse({ error: 'Method not allowed. Use POST.' } satisfies SyntageProxyError, 405);
  }

  // Validate auth
  const isAuthed = await validateAuth(req);
  if (!isAuthed) {
    return jsonResponse(
      { error: 'Unauthorized. Provide a valid Authorization header.' } satisfies SyntageProxyError,
      401,
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' } satisfies SyntageProxyError, 400);
  }

  // Validate request fields
  const validationError = validateRequest(body);
  if (validationError) {
    return jsonResponse({ error: validationError } satisfies SyntageProxyError, 422);
  }

  const parsed = body as SyntageProxyRequest;
  parsed.rfc = parsed.rfc.trim();

  // Process request
  try {
    const { data } = await handleRequest(parsed);
    return jsonResponse(data, 200);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return jsonResponse({ error: message } satisfies SyntageProxyError, 500);
  }
});
