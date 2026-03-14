import { supabase } from '@/lib/supabase';

// ============================================================
// Response Types — minimal with jsonb for raw nested data
// ============================================================

// --- SAT Data ---

export interface CFDI {
  uuid: string;
  rfc_emisor: string;
  rfc_receptor: string;
  fecha: string;
  total: number;
  subtotal: number;
  moneda: string;
  tipo_comprobante: string;
  metodo_pago: 'PUE' | 'PPD' | string;
  estatus: string;
  raw: Record<string, unknown>;
}

export interface Declaracion {
  ejercicio: number;
  tipo: string;
  fecha_presentacion: string;
  ingresos_totales: number;
  deducciones: number;
  resultado_fiscal: number;
  isr_causado: number;
  raw: Record<string, unknown>;
}

export interface ConstanciaFiscal {
  rfc: string;
  razon_social: string;
  regimen_fiscal: string[];
  actividades_economicas: string[];
  estatus: string;
  fecha_ultimo_cambio: string;
  domicilio: Record<string, unknown>;
  raw: Record<string, unknown>;
}

export interface OpinionResult {
  sentido: 'positiva' | 'negativa' | 'no_inscrito' | string;
  fecha_emision: string;
  vigencia: string;
  raw: Record<string, unknown>;
}

export interface BalanzaMensual {
  periodo: string;
  cuentas: Array<{
    cuenta: string;
    nombre: string;
    saldo_inicial: number;
    debe: number;
    haber: number;
    saldo_final: number;
  }>;
  raw: Record<string, unknown>;
}

export interface NominaCFDI {
  uuid: string;
  rfc_receptor: string;
  fecha: string;
  total: number;
  tipo_nomina: string;
  raw: Record<string, unknown>;
}

export interface Lista69BResult {
  encontrado: boolean;
  estatus: string | null;
  fecha_publicacion: string | null;
  raw: Record<string, unknown>;
}

// --- Buro ---

export interface ScorePyME {
  score: number;
  califica_rating: string;
  causas: string[];
  fecha_consulta: string;
  raw: Record<string, unknown>;
}

export interface CreditoActivo {
  institucion: string;
  tipo_credito: string;
  moneda: string;
  monto_original: number;
  monto_vigente: number;
  plazo_meses: number;
  atraso_dias: number;
  historico_pagos: string;
  raw: Record<string, unknown>;
}

export interface CreditoLiquidado {
  institucion: string;
  tipo_credito: string;
  monto_original: number;
  fecha_liquidacion: string;
  tipo_liquidacion: 'normal' | 'quita' | 'dacion' | 'quebranto' | string;
  raw: Record<string, unknown>;
}

export interface ConsultasBuro {
  ultimos_3_meses: number;
  ultimos_12_meses: number;
  ultimos_24_meses: number;
  mas_24_meses: number;
  detalle: Array<{
    fecha: string;
    institucion: string;
    tipo: 'financiera' | 'comercial' | string;
  }>;
  raw: Record<string, unknown>;
}

export interface CalificacionMensual {
  periodo: string;
  vigente: number;
  vencido_1_29: number;
  vencido_30_59: number;
  vencido_60_89: number;
  vencido_90_mas: number;
  raw: Record<string, unknown>;
}

export interface HawkResult {
  check_type: string;
  match_found: boolean;
  severity: 'info' | 'warning' | 'critical';
  details: Record<string, unknown>;
}

// --- Indicadores ---

export interface SyntageScore {
  score: number;
  variables: Record<string, number>;
  fecha_calculo: string;
  raw: Record<string, unknown>;
}

export interface RazonesFinancieras {
  liquidez: Record<string, number>;
  actividad: Record<string, number>;
  rentabilidad: Record<string, number>;
  apalancamiento: Record<string, number>;
  cobertura: Record<string, number>;
  raw: Record<string, unknown>;
}

export interface InsightsFacturacion {
  ingresos_netos: number;
  cancelaciones_ratio: number;
  dso_promedio: number;
  dpo_promedio: number;
  margen_operativo: number;
  raw: Record<string, unknown>;
}

// --- Registro Publico ---

export interface EstructuraCorporativa {
  razon_social: string;
  fecha_constitucion: string;
  duracion: string;
  domicilio_social: string;
  accionistas: Array<{
    nombre: string;
    rfc: string;
    porcentaje: number;
    nacionalidad: string;
  }>;
  actos_protocolizados: Record<string, unknown>[];
  raw: Record<string, unknown>;
}

export interface GarantiasRUG {
  numero: string;
  fecha: string;
  otorgante: string;
  acreedor: string;
  tipo: string;
  monto: number;
  moneda: string;
  vigencia: string;
  raw: Record<string, unknown>;
}

export interface IncidenciaLegal {
  tipo: string;
  jurisdiccion: string;
  fecha: string;
  estatus: string;
  severidad: 'informativo' | 'atencion' | 'critico';
  raw: Record<string, unknown>;
}

// ============================================================
// Constants
// ============================================================

const PROVIDER = 'syntage';
const MAX_RETRIES = 3;
const CACHE_HOURS = 24;

// ============================================================
// Helpers
// ============================================================

function backoffDelay(attempt: number): number {
  return Math.pow(2, attempt) * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


// ============================================================
// Cache — 24h in cs_api_cache
// ============================================================

async function getCached<T>(endpoint: string, rfc: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('cs_api_cache')
    .select('response_data, expires_at')
    .eq('provider', PROVIDER)
    .eq('endpoint', endpoint)
    .eq('rfc', rfc)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return (data as { response_data: T }).response_data;
}

async function setCache<T>(endpoint: string, rfc: string, result: T): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_HOURS * 60 * 60 * 1000).toISOString();

  await supabase.from('cs_api_cache').insert({
    provider: PROVIDER,
    endpoint: endpoint,
    rfc,
    response_data: result,
    expires_at: expiresAt,
  });
}

// ============================================================
// API Call Logging — cs_api_calls
// ============================================================

async function logApiCall(
  endpoint: string,
  statusCode: number,
  latencyMs: number,
  errorMessage?: string,
): Promise<void> {
  await supabase.from('cs_api_calls').insert({
    provider: PROVIDER,
    endpoint,
    status_code: statusCode,
    latency_ms: latencyMs,
    error_message: errorMessage ?? null,
  });
}

// ============================================================
// Generic request with retry + cache + logging
// ============================================================

async function syntageRequest<T>(
  endpoint: string,
  rfc: string,
  params?: Record<string, string>,
): Promise<T> {
  // 1. Check cache
  const cacheKey = params ? `${endpoint}:${JSON.stringify(params)}` : endpoint;
  const cached = await getCached<T>(cacheKey, rfc);
  if (cached) return cached;

  // 2. Call API with exponential backoff retry
  const apiKey = import.meta.env.VITE_SYNTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing VITE_SYNTAGE_API_KEY environment variable');
  }

  const baseUrl = import.meta.env.VITE_SYNTAGE_API_URL ?? 'https://api.syntage.com';

  const url = new URL(`${baseUrl}/v1/${endpoint}`);
  url.searchParams.set('rfc', rfc);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(backoffDelay(attempt));
    }

    const start = performance.now();

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      });

      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        await logApiCall(endpoint, response.status, latencyMs, errorText);
        lastError = new Error(`Syntage API ${response.status}: ${errorText}`);
        continue;
      }

      const data: T = await response.json();
      await logApiCall(endpoint, response.status, latencyMs);

      // 3. Store in cache
      await setCache(cacheKey, rfc, data);

      return data;
    } catch (error: unknown) {
      const latencyMs = Math.round(performance.now() - start);
      const message = error instanceof Error ? error.message : 'Network error';
      await logApiCall(endpoint, 0, latencyMs, message);
      lastError = error instanceof Error ? error : new Error(message);
    }
  }

  throw lastError ?? new Error(`Syntage API ${endpoint} failed after ${MAX_RETRIES} retries`);
}


// ============================================================
// Public API — SAT Data
// ============================================================

export function getCFDIs(rfc: string, type: 'emitidas' | 'recibidas'): Promise<CFDI[]> {
  return syntageRequest<CFDI[]>('sat/cfdis', rfc, { type });
}

export function getDeclaraciones(rfc: string): Promise<Declaracion[]> {
  return syntageRequest<Declaracion[]>('sat/declaraciones', rfc);
}

export function getConstanciaFiscal(rfc: string): Promise<ConstanciaFiscal> {
  return syntageRequest<ConstanciaFiscal>('sat/constancia-fiscal', rfc);
}

export function getOpinionCumplimiento(rfc: string): Promise<OpinionResult> {
  return syntageRequest<OpinionResult>('sat/opinion-cumplimiento', rfc);
}

export function getBalanzaComprobacion(rfc: string): Promise<BalanzaMensual[]> {
  return syntageRequest<BalanzaMensual[]>('sat/balanza-comprobacion', rfc);
}

export function getNomina(rfc: string): Promise<NominaCFDI[]> {
  return syntageRequest<NominaCFDI[]>('sat/nomina', rfc);
}

export function getLista69B(rfc: string): Promise<Lista69BResult> {
  return syntageRequest<Lista69BResult>('sat/lista-69b', rfc);
}

// ============================================================
// Public API — Buro
// ============================================================

export function getScorePyME(rfc: string): Promise<ScorePyME> {
  return syntageRequest<ScorePyME>('buro/score-pyme', rfc);
}

export function getCreditosActivos(rfc: string): Promise<CreditoActivo[]> {
  return syntageRequest<CreditoActivo[]>('buro/creditos-activos', rfc);
}

export function getCreditosLiquidados(rfc: string): Promise<CreditoLiquidado[]> {
  return syntageRequest<CreditoLiquidado[]>('buro/creditos-liquidados', rfc);
}

export function getConsultasBuro(rfc: string): Promise<ConsultasBuro> {
  return syntageRequest<ConsultasBuro>('buro/consultas', rfc);
}

export function getCalificacionCartera(rfc: string): Promise<CalificacionMensual[]> {
  return syntageRequest<CalificacionMensual[]>('buro/calificacion-cartera', rfc);
}

export function getHawkChecks(rfc: string): Promise<HawkResult[]> {
  return syntageRequest<HawkResult[]>('buro/hawk', rfc);
}

// ============================================================
// Public API — Indicadores
// ============================================================

export function getSyntageScore(rfc: string): Promise<SyntageScore> {
  return syntageRequest<SyntageScore>('indicadores/score', rfc);
}

export function getRazonesFinancieras(rfc: string): Promise<RazonesFinancieras> {
  return syntageRequest<RazonesFinancieras>('indicadores/razones-financieras', rfc);
}

export function getInsightsFacturacion(rfc: string): Promise<InsightsFacturacion> {
  return syntageRequest<InsightsFacturacion>('indicadores/insights-facturacion', rfc);
}

// ============================================================
// Public API — Registro Publico
// ============================================================

export function getEstructuraCorporativa(rfc: string): Promise<EstructuraCorporativa> {
  return syntageRequest<EstructuraCorporativa>('registro-publico/estructura-corporativa', rfc);
}

export function getRUG(rfc: string): Promise<GarantiasRUG[]> {
  return syntageRequest<GarantiasRUG[]>('registro-publico/rug', rfc);
}

export function getIncidenciasLegales(rfc: string): Promise<IncidenciaLegal[]> {
  return syntageRequest<IncidenciaLegal[]>('registro-publico/incidencias-legales', rfc);
}
