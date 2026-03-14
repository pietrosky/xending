// Pure helper functions extracted for testability.
// Used by index.ts — no side effects, no I/O.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyntageProxyRequest {
  rfc: string;
  endpoint: string;
  params?: Record<string, string>;
}

export interface SyntageProxyError {
  error: string;
}

// ---------------------------------------------------------------------------
// Endpoint whitelist — maps logical name to Syntage API path
// ---------------------------------------------------------------------------

const ENDPOINT_MAP: Record<string, string> = {
  // SAT Data
  getCFDIs: 'sat/cfdis',
  getDeclaraciones: 'sat/declaraciones',
  getConstanciaFiscal: 'sat/constancia-fiscal',
  getOpinionCumplimiento: 'sat/opinion-cumplimiento',
  getBalanzaComprobacion: 'sat/balanza-comprobacion',
  getNomina: 'sat/nomina',
  getLista69B: 'sat/lista-69b',
  // Buro
  getScorePyME: 'buro/score-pyme',
  getCreditosActivos: 'buro/creditos-activos',
  getCreditosLiquidados: 'buro/creditos-liquidados',
  getConsultasBuro: 'buro/consultas',
  getCalificacionCartera: 'buro/calificacion-cartera',
  getHawkChecks: 'buro/hawk',
  // Indicadores
  getSyntageScore: 'indicadores/score',
  getRazonesFinancieras: 'indicadores/razones-financieras',
  getInsightsFacturacion: 'indicadores/insights-facturacion',
  // Registro Publico
  getEstructuraCorporativa: 'registro-publico/estructura-corporativa',
  getRUG: 'registro-publico/rug',
  getIncidenciasLegales: 'registro-publico/incidencias-legales',
};

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/** Get all valid endpoint names */
export function getValidEndpoints(): string[] {
  return Object.keys(ENDPOINT_MAP);
}

/** Resolve a logical endpoint name to its Syntage API path. Returns null if invalid. */
export function resolveEndpointPath(endpoint: string): string | null {
  return ENDPOINT_MAP[endpoint] ?? null;
}

/** Exponential backoff delay: 1s, 2s, 4s */
export function backoffDelay(attempt: number): number {
  return Math.pow(2, attempt) * 1000;
}

/** Validate RFC format (Mexican tax ID: 12-13 alphanumeric chars) */
export function isValidRfc(rfc: string): boolean {
  return /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/i.test(rfc);
}

/** Build the cache key for a given endpoint + params combination */
export function buildCacheKey(endpoint: string, params?: Record<string, string>): string {
  if (params && Object.keys(params).length > 0) {
    return `${endpoint}:${JSON.stringify(params)}`;
  }
  return endpoint;
}

/** Build the full Syntage API URL for a request */
export function buildApiUrl(
  baseUrl: string,
  apiPath: string,
  rfc: string,
  params?: Record<string, string>,
): string {
  const url = new URL(`${baseUrl}/v1/${apiPath}`);
  url.searchParams.set('rfc', rfc);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Validate the request body. Returns an error message or null if valid.
 */
export function validateRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return 'Invalid JSON body.';
  }

  const { rfc, endpoint } = body as Record<string, unknown>;

  if (!rfc || typeof rfc !== 'string') {
    return 'Missing required field: rfc';
  }

  if (!isValidRfc(rfc.trim())) {
    return `Invalid RFC format: ${rfc}`;
  }

  if (!endpoint || typeof endpoint !== 'string') {
    return 'Missing required field: endpoint';
  }

  if (!resolveEndpointPath(endpoint)) {
    return `Unknown endpoint: ${endpoint}. Valid endpoints: ${getValidEndpoints().join(', ')}`;
  }

  return null;
}
