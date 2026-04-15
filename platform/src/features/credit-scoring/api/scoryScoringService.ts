/**
 * Scory Scoring Service
 *
 * Delegates credit scoring analysis to the Scory.ai API instead of running
 * engines locally. Sends RFC + Syntage entity + Buró score and receives
 * all engine results + composite score in a single call.
 *
 * Auth: Bearer token (VITE_SCORY_API_KEY)
 * Endpoint: POST /v1/scoring/analyze
 */

import { supabase } from '@/lib/supabase';
import type {
  EngineOutput,
  ModuleGrade,
  ModuleStatus,
  RiskFlag,
  MetricValue,
  BenchmarkComparison,
} from '../types/engine.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoryScoringRequest {
  rfc: string;
  syntage_entity_id: string;
  buro_score: number;
}

export interface ScoryEngineResult {
  score: number;
  grade: string;
  status: string;
  risk_flags: Array<{ code: string; severity: string; message: string; source_metric?: string; value?: number; threshold?: number }>;
  metrics: Record<string, unknown>;
  benchmark_comparison?: Record<string, unknown>;
  explanation: string;
  recommended_actions?: string[];
}

export interface ScoryScoringResponse {
  composite_score: number;
  engines: Record<string, ScoryEngineResult>;
  ai_narrative: string;
  decision_recommendation: 'approved' | 'conditional' | 'committee' | 'rejected';
}

export interface ScoryScoringResult {
  compositeScore: number;
  engineOutputs: EngineOutput[];
  aiNarrative: string;
  decisionRecommendation: 'approved' | 'conditional' | 'committee' | 'rejected';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROVIDER = 'scory';
const ENDPOINT = 'scoring/analyze';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 60_000;
const CACHE_HOURS = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function backoffDelay(attempt: number): number {
  return Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheRow {
  response_data: ScoryScoringResponse;
  expires_at: string;
}

async function getCachedResult(rfc: string): Promise<ScoryScoringResponse | null> {
  const { data, error } = await supabase
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

async function setCacheResult(rfc: string, result: ScoryScoringResponse): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_HOURS * 60 * 60 * 1000).toISOString();
  await supabase.from('cs_api_cache').insert({
    provider: PROVIDER,
    endpoint: ENDPOINT,
    rfc,
    response_data: result,
    expires_at: expiresAt,
  });
}

// ---------------------------------------------------------------------------
// API call logging
// ---------------------------------------------------------------------------

async function logApiCall(
  statusCode: number,
  latencyMs: number,
  errorMessage?: string,
): Promise<void> {
  await supabase.from('cs_api_calls').insert({
    provider: PROVIDER,
    endpoint: ENDPOINT,
    status_code: statusCode,
    latency_ms: latencyMs,
    error_message: errorMessage ?? null,
  });
}

// ---------------------------------------------------------------------------
// Scory API call with retry + timeout
// ---------------------------------------------------------------------------

async function callScoryScoringApi(request: ScoryScoringRequest): Promise<ScoryScoringResponse> {
  const apiKey = import.meta.env.VITE_SCORY_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_SCORY_API_KEY environment variable');
  }

  const baseUrl = import.meta.env.VITE_SCORY_API_URL ?? 'https://api.scory.ai';
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(backoffDelay(attempt));
    }

    const start = performance.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/v1/scoring/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          rfc: request.rfc,
          syntage_entity_id: request.syntage_entity_id,
          buro_score: request.buro_score,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        await logApiCall(response.status, latencyMs, errorText);
        lastError = new Error(`Scory Scoring API ${response.status}: ${errorText}`);
        continue;
      }

      const data: ScoryScoringResponse = await response.json();
      await logApiCall(response.status, latencyMs);
      return data;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const latencyMs = Math.round(performance.now() - start);
      const message = error instanceof Error ? error.message : 'Network error';
      await logApiCall(0, latencyMs, message);
      lastError = error instanceof Error ? error : new Error(message);
    }
  }

  throw lastError ?? new Error('Scory Scoring API failed after retries');
}

// ---------------------------------------------------------------------------
// Response mapper: ScoryEngineResult → EngineOutput
// ---------------------------------------------------------------------------

function mapToEngineOutput(engineName: string, result: ScoryEngineResult): EngineOutput {
  const validGrades: ModuleGrade[] = ['A', 'B', 'C', 'D', 'F'];
  const grade: ModuleGrade = validGrades.includes(result.grade as ModuleGrade)
    ? (result.grade as ModuleGrade)
    : 'F';

  const validStatuses: ModuleStatus[] = ['pass', 'fail', 'warning', 'blocked'];
  const status: ModuleStatus = validStatuses.includes(result.status as ModuleStatus)
    ? (result.status as ModuleStatus)
    : 'fail';

  const riskFlags: RiskFlag[] = (result.risk_flags ?? []).map((f) => ({
    code: f.code,
    severity: f.severity as RiskFlag['severity'],
    message: f.message,
    source_metric: f.source_metric,
    value: f.value,
    threshold: f.threshold,
  }));

  // Map metrics from API response to MetricValue format
  const keyMetrics: Record<string, MetricValue> = {};
  if (result.metrics) {
    for (const [key, val] of Object.entries(result.metrics)) {
      if (val && typeof val === 'object' && 'value' in (val as Record<string, unknown>)) {
        keyMetrics[key] = val as MetricValue;
      }
    }
  }

  // Map benchmark comparisons
  const benchmarkComparison: Record<string, BenchmarkComparison> = {};
  if (result.benchmark_comparison) {
    for (const [key, val] of Object.entries(result.benchmark_comparison)) {
      if (val && typeof val === 'object') {
        benchmarkComparison[key] = val as BenchmarkComparison;
      }
    }
  }

  return {
    engine_name: engineName,
    module_status: status,
    module_score: Math.max(0, Math.min(100, result.score)),
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: keyMetrics,
    benchmark_comparison: benchmarkComparison,
    trends: [],
    explanation: result.explanation ?? '',
    recommended_actions: result.recommended_actions ?? [],
    created_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run full credit scoring analysis via Scory.ai API.
 *
 * Sends RFC + Syntage entity + Buró score → receives all engine results
 * and composite score in a single call.
 *
 * Uses 1h cache, 60s timeout, 3 retries with exponential backoff (2s, 4s, 8s).
 * Logs every call to cs_api_calls.
 */
export async function runScoryAnalysis(
  request: ScoryScoringRequest,
): Promise<ScoryScoringResult> {
  // 1. Check cache
  const cached = await getCachedResult(request.rfc);
  if (cached) {
    return mapResponse(cached);
  }

  // 2. Call Scory API
  const response = await callScoryScoringApi(request);

  // 3. Cache result
  await setCacheResult(request.rfc, response);

  return mapResponse(response);
}

function mapResponse(response: ScoryScoringResponse): ScoryScoringResult {
  const engineOutputs: EngineOutput[] = Object.entries(response.engines).map(
    ([name, result]) => mapToEngineOutput(name, result),
  );

  return {
    compositeScore: Math.max(0, Math.min(100, response.composite_score)),
    engineOutputs,
    aiNarrative: response.ai_narrative ?? '',
    decisionRecommendation: response.decision_recommendation,
  };
}
