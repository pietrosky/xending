import { supabase } from '@/lib/supabase';

// ============================================================
// Types
// ============================================================

interface CacheEntry<T> {
  response_data: T;
  expires_at: string;
}

interface ApiCallLog {
  application_id?: string;
  provider: string;
  endpoint: string;
  status_code: number;
  latency_ms: number;
  error_message?: string;
}

// ============================================================
// Constants
// ============================================================

const DEFAULT_CACHE_HOURS = 24;

// ============================================================
// Cache — cs_api_cache
// ============================================================

/**
 * Retrieve a cached response from cs_api_cache.
 * Returns null if no valid (non-expired) entry exists.
 */
export async function getFromCache<T>(
  provider: string,
  endpoint: string,
  rfc: string,
): Promise<T | null> {
  const { data, error } = await supabase
    .from('cs_api_cache')
    .select('response_data, expires_at')
    .eq('provider', provider)
    .eq('endpoint', endpoint)
    .eq('rfc', rfc)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return (data as CacheEntry<T>).response_data;
}

/**
 * Store a response in cs_api_cache with configurable TTL (default 24h).
 */
export async function setInCache<T>(
  provider: string,
  endpoint: string,
  rfc: string,
  responseData: T,
  cacheHours: number = DEFAULT_CACHE_HOURS,
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + cacheHours * 60 * 60 * 1000,
  ).toISOString();

  await supabase.from('cs_api_cache').insert({
    provider,
    endpoint,
    rfc,
    response_data: responseData,
    expires_at: expiresAt,
  });
}

/**
 * Invalidate (delete) cache entries by provider and/or rfc.
 * At least one filter must be provided.
 */
export async function invalidateCache(
  filters: { provider?: string; rfc?: string },
): Promise<void> {
  if (!filters.provider && !filters.rfc) return;

  let query = supabase.from('cs_api_cache').delete();

  if (filters.provider) {
    query = query.eq('provider', filters.provider);
  }
  if (filters.rfc) {
    query = query.eq('rfc', filters.rfc);
  }

  await query;
}

/**
 * Delete all expired cache entries from cs_api_cache.
 */
export async function cleanExpiredCache(): Promise<void> {
  await supabase
    .from('cs_api_cache')
    .delete()
    .lt('expires_at', new Date().toISOString());
}

// ============================================================
// API Call Logging — cs_api_calls
// ============================================================

/**
 * Log an API call to cs_api_calls for auditing and monitoring.
 */
export async function logApiCall(params: ApiCallLog): Promise<void> {
  await supabase.from('cs_api_calls').insert({
    application_id: params.application_id ?? null,
    provider: params.provider,
    endpoint: params.endpoint,
    status_code: params.status_code,
    latency_ms: params.latency_ms,
    error_message: params.error_message ?? null,
  });
}
