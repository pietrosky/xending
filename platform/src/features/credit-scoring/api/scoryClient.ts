import { supabase } from '@/lib/supabase';
import type { RiskFlag } from '../types/engine.types';

// --- Types ---

export type ComplianceStatus = 'pass' | 'fail' | 'hard_stop';

export interface ComplianceCheck {
  check_type: string;
  result: 'pass' | 'fail' | 'review_required';
  details: Record<string, unknown>;
}

export interface ComplianceResult {
  status: ComplianceStatus;
  checks: ComplianceCheck[];
  risk_flags: RiskFlag[];
  explanation: string;
  manual_override: boolean;
}

interface CacheRow {
  response_data: ComplianceResult;
  expires_at: string;
}

// --- Constants ---

const SCORY_ENDPOINT = 'validateCompliance';
const PROVIDER = 'scory';
const MAX_RETRIES = 3;
const CACHE_HOURS = 24;

// --- Helpers ---

/** Exponential backoff delay: 1s, 2s, 4s */
function backoffDelay(attempt: number): number {
  return Math.pow(2, attempt) * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Cache ---

async function getCachedResult(rfc: string): Promise<ComplianceResult | null> {
  const { data, error } = await supabase
    .from('cs_api_cache')
    .select('response_data, expires_at')
    .eq('provider', PROVIDER)
    .eq('endpoint', SCORY_ENDPOINT)
    .eq('rfc', rfc)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  const row = data as unknown as CacheRow;
  return row.response_data;
}

async function setCacheResult(rfc: string, result: ComplianceResult): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_HOURS * 60 * 60 * 1000).toISOString();

  await supabase.from('cs_api_cache').insert({
    provider: PROVIDER,
    endpoint: SCORY_ENDPOINT,
    rfc,
    response_data: result,
    expires_at: expiresAt,
  });
}

// --- API Call Logging ---

async function logApiCall(
  statusCode: number,
  latencyMs: number,
  errorMessage?: string,
): Promise<void> {
  await supabase.from('cs_api_calls').insert({
    provider: PROVIDER,
    endpoint: SCORY_ENDPOINT,
    status_code: statusCode,
    latency_ms: latencyMs,
    error_message: errorMessage ?? null,
  });
}

// --- Scory API call with retry ---

async function callScoryApi(rfc: string): Promise<ComplianceResult> {
  const apiKey = import.meta.env.VITE_SCORY_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_SCORY_API_KEY environment variable');
  }

  const baseUrl = import.meta.env.VITE_SCORY_API_URL ?? 'https://api.scory.mx';

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
        await logApiCall(response.status, latencyMs, errorText);
        lastError = new Error(`Scory API ${response.status}: ${errorText}`);
        continue;
      }

      const data: ComplianceResult = await response.json();
      await logApiCall(response.status, latencyMs);
      return data;
    } catch (error: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const message = error instanceof Error ? error.message : 'Network error';
      await logApiCall(0, latencyMs, message);
      lastError = error instanceof Error ? error : new Error(message);
    }
  }

  throw lastError ?? new Error('Scory API failed after retries');
}

// --- Fallback when API is unavailable ---

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

// --- Public API ---

/**
 * Validate compliance for an RFC via Scory API.
 * Checks: listas negras, OFAC, PEPs, SYGER, RUG, 69B,
 * domicilio, geolocalización, fotos, accionistas, consistencia giro.
 *
 * Uses 24h cache (cs_api_cache) and exponential backoff retry (max 3).
 * Logs every call to cs_api_calls.
 * Returns manual_override=true if API is unreachable.
 */
export async function validateCompliance(rfc: string): Promise<ComplianceResult> {
  // 1. Check 24h cache
  const cached = await getCachedResult(rfc);
  if (cached) return cached;

  // 2. Call Scory API with retry
  try {
    const result = await callScoryApi(rfc);

    // 3. Store in cache
    await setCacheResult(rfc, result);

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return makeFallbackResult(rfc, message);
  }
}
