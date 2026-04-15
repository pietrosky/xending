/**
 * Syntage API Client - Core module
 * @see docs/SYNTAGE_API_INTEGRATION_MAP.md
 */

const SYNTAGE_BASE_URL = import.meta.env.VITE_SYNTAGE_API_URL ?? 'https://api.syntage.com';
const SYNTAGE_API_KEY = import.meta.env.VITE_SYNTAGE_API_KEY ?? '';
const SYNTAGE_API_VERSION = import.meta.env.VITE_SYNTAGE_API_VERSION ?? '2024-01-01';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export function getEntityId(): string {
  return import.meta.env.VITE_SYNTAGE_ENTITY_ID ?? '';
}

export interface HydraCollection<T> {
  '@context'?: string;
  '@id'?: string;
  '@type'?: string;
  'hydra:totalItems': number;
  'hydra:member': T[];
  'hydra:view'?: {
    '@id': string;
    'hydra:first'?: string;
    'hydra:last'?: string;
    'hydra:next'?: string;
    'hydra:previous'?: string;
  };
}

export interface SyntageRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  entityId?: string;
  params?: Record<string, string | number | boolean | string[] | undefined>;
}

export async function syntageRequest<T>(
  path: string,
  options: SyntageRequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, params } = options;
  
  let url = path.startsWith('http') ? path : `${SYNTAGE_BASE_URL}${path}`;
  
  // Add query params if provided
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          // Handle array params (e.g., type[]=I&type[]=E)
          for (const v of value) {
            searchParams.append(`${key}[]`, String(v));
          }
        } else {
          searchParams.append(key, String(value));
        }
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  
  const requestHeaders: Record<string, string> = {
    'Accept': 'application/ld+json',
    'Content-Type': 'application/json',
    'X-API-Key': SYNTAGE_API_KEY,
    'Accept-Version': SYNTAGE_API_VERSION,
    ...headers,
  };
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response: Response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Syntage API error ${response.status}: ${errorText}`);
      }
      return await response.json() as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }
  throw lastError ?? new Error('Syntage request failed');
}

export async function fetchAllPages<T>(
  initialPath: string,
  options: SyntageRequestOptions = {},
): Promise<T[]> {
  const allItems: T[] = [];
  let nextPath: string | undefined = initialPath;
  while (nextPath) {
    const response: HydraCollection<T> = await syntageRequest<HydraCollection<T>>(nextPath, options);
    allItems.push(...response['hydra:member']);
    nextPath = response['hydra:view']?.['hydra:next'];
  }
  return allItems;
}

export function entityPath(subPath: string, entityId?: string): string {
  const id = entityId ?? getEntityId();
  return `/entities/${id}/${subPath}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Legacy Types (snake_case for backward compatibility with engines)
export interface CFDI {
  uuid: string;
  tipo?: 'I' | 'E' | 'P' | 'N' | 'T';
  tipo_comprobante?: 'I' | 'E' | 'P' | 'N' | 'T';
  fecha: string;
  subtotal?: number;
  total: number;
  moneda: string;
  tipo_cambio?: number | null;
  metodo_pago: 'PUE' | 'PPD' | string;
  forma_pago?: string;
  estatus: 'vigente' | 'cancelado';
  rfc_emisor: string;
  nombre_emisor?: string;
  rfc_receptor: string;
  nombre_receptor?: string;
  conceptos?: Array<{
    descripcion: string;
    cantidad: number;
    valor_unitario: number;
    importe: number;
    clave_prod_serv: string;
  }>;
  impuestos?: { trasladados: number; retenidos: number };
  cancelado?: boolean;
  fecha_cancelacion?: string | null;
  raw?: Record<string, unknown>;
}

export interface Declaracion {
  periodo?: string;
  tipo: 'anual' | 'mensual';
  ejercicio: number;
  mes?: number;
  fecha_presentacion: string;
  ingresos_totales: number;
  ingresos_acumulables?: number;
  deducciones: number;
  utilidad_fiscal?: number;
  perdida_fiscal?: number;
  resultado_fiscal: number;
  isr_causado: number;
  isr_retenido?: number;
  isr_pagar?: number;
  raw?: Record<string, unknown>;
}

export interface ScorePyME {
  score: number;
  calificacion: string;
  califica_rating?: string;
  fecha_consulta: string;
  causas: string[];
  raw?: Record<string, unknown>;
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
  fecha_apertura: string;
  fecha_ultimo_pago: string | null;
  raw?: Record<string, unknown>;
}

export interface CreditoLiquidado {
  institucion: string;
  tipo_credito: string;
  monto_original: number;
  fecha_liquidacion: string;
  tipo_liquidacion: 'normal' | 'quita' | 'dacion' | 'quebranto';
  raw?: Record<string, unknown>;
}

export interface ConsultasBuro {
  ultimos_3_meses: number;
  ultimos_12_meses: number;
  detalle?: Array<{ fecha: string; institucion: string; tipo_consulta: string }>;
  raw?: Record<string, unknown>;
}

export interface CalificacionMensual {
  periodo: string;
  vigente: number;
  vencido_1_29: number;
  vencido_30_59: number;
  vencido_60_89: number;
  vencido_90_mas: number;
  raw?: Record<string, unknown>;
}

export interface HawkResult {
  check_type: string;
  match_found: boolean;
  severity: 'info' | 'warning' | 'critical';
  details: Record<string, unknown>;
}

export interface RazonesFinancieras {
  liquidez?: {
    coeficiente_solvencia?: number;
    prueba_acida?: number;
    capital_trabajo?: number;
  };
  rentabilidad?: {
    margen_bruto?: number;
    margen_operativo?: number;
    margen_neto?: number;
    roa?: number;
    roe?: number;
  };
  apalancamiento?: {
    coeficiente_endeudamiento?: number;
    razon_deuda?: number;
  };
  actividad?: {
    rotacion_cxc?: number;
    rotacion_cxp?: number;
    rotacion_inventarios?: number;
    ciclo_conversion?: number;
  };
  cobertura?: {
    cobertura_intereses?: number;
    dscr?: number;
  };
  ebitda?: number;
  raw?: Record<string, unknown>;
}
