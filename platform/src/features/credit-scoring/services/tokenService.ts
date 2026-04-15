/**
 * Servicio de Tokens — Generación y validación de links de acceso.
 *
 * Genera tokens UUID únicos que se envían al solicitante por email.
 * Cada token tiene un propósito (firma Buró, CIEC, documentos) y
 * expira en 72h por defecto.
 *
 * El solicitante accede sin login usando:
 *   /solicitud/{token}
 *
 * El token se valida contra la BD, se verifica expiración y propósito,
 * y se incrementa el contador de accesos.
 */

import type {
  ExpedienteToken,
  TokenPurpose,
  ExpedienteStage,
} from '../types/expediente.types';
import { DEFAULT_BUSINESS_RULES } from '../types/expediente.types';
import { STAGE_TOKEN_REQUIRED } from '../lib/expedienteStateMachine';

// ─── Tipos del servicio ──────────────────────────────────────────────

/** Resultado de validar un token */
export interface TokenValidationResult {
  valid: boolean;
  token?: ExpedienteToken;
  expedienteId?: string;
  error?: string;
}

/** URL base para los links (configurable por entorno) */
const BASE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://credit.xending.com';

// ─── Store en memoria (se reemplaza por Supabase) ────────────────────

const tokenStore: Map<string, ExpedienteToken> = new Map();

// ─── Helpers ─────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function addHours(date: Date, hours: number): string {
  return new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString();
}

// ─── Crear token ─────────────────────────────────────────────────────

/**
 * Genera un token de acceso para un expediente.
 *
 * @param expedienteId - ID del expediente
 * @param purpose - Propósito del token (buro_signature, ciec_linkage, etc.)
 * @param expiryHours - Horas de vigencia (default: 72)
 * @returns Token creado con URL de acceso
 */
export function createToken(
  expedienteId: string,
  purpose: TokenPurpose,
  expiryHours: number = DEFAULT_BUSINESS_RULES.token_expiry_hours,
): ExpedienteToken {
  const token: ExpedienteToken = {
    id: generateId(),
    expediente_id: expedienteId,
    token: generateId(), // UUID único para la URL
    purpose,
    expires_at: addHours(new Date(), expiryHours),
    is_used: false,
    access_count: 0,
    last_accessed_at: null,
    created_at: now(),
  };

  tokenStore.set(token.token, token);
  return token;
}

/**
 * Genera el token apropiado para una etapa del expediente.
 * Usa STAGE_TOKEN_REQUIRED para determinar el propósito.
 *
 * @returns Token si la etapa requiere uno, null si no
 */
export function createTokenForStage(
  expedienteId: string,
  stage: ExpedienteStage,
): ExpedienteToken | null {
  const purpose = STAGE_TOKEN_REQUIRED[stage];
  if (!purpose) return null;
  return createToken(expedienteId, purpose);
}

// ─── Validar token ───────────────────────────────────────────────────

/**
 * Valida un token de acceso.
 *
 * Verifica: existencia, expiración, uso previo.
 * Incrementa contador de accesos si es válido.
 */
export function validateToken(tokenValue: string): TokenValidationResult {
  const token = tokenStore.get(tokenValue);

  if (!token) {
    return { valid: false, error: 'Token no encontrado' };
  }

  if (token.is_used) {
    return { valid: false, error: 'Token ya fue utilizado', token, expedienteId: token.expediente_id };
  }

  if (new Date(token.expires_at) < new Date()) {
    return { valid: false, error: 'Token expirado', token, expedienteId: token.expediente_id };
  }

  // Incrementar accesos
  token.access_count += 1;
  token.last_accessed_at = now();

  return { valid: true, token, expedienteId: token.expediente_id };
}

// ─── Marcar como usado ───────────────────────────────────────────────

/**
 * Marca un token como usado (completado).
 * Una vez usado, no se puede volver a usar.
 */
export function markTokenUsed(tokenValue: string): boolean {
  const token = tokenStore.get(tokenValue);
  if (!token) return false;
  token.is_used = true;
  return true;
}

// ─── Consultas ───────────────────────────────────────────────────────

/** Obtiene todos los tokens de un expediente */
export function getTokensByExpediente(expedienteId: string): ExpedienteToken[] {
  return Array.from(tokenStore.values())
    .filter((t) => t.expediente_id === expedienteId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Obtiene tokens activos (no usados, no expirados) de un expediente */
export function getActiveTokens(expedienteId: string): ExpedienteToken[] {
  const nowStr = now();
  return getTokensByExpediente(expedienteId)
    .filter((t) => !t.is_used && t.expires_at > nowStr);
}

/** Verifica si hay un token activo para un propósito específico */
export function hasActiveToken(expedienteId: string, purpose: TokenPurpose): boolean {
  return getActiveTokens(expedienteId).some((t) => t.purpose === purpose);
}

// ─── URLs ────────────────────────────────────────────────────────────

/** Genera la URL completa de acceso para un token */
export function getTokenUrl(token: ExpedienteToken): string {
  return `${BASE_URL}/solicitud/${token.token}`;
}

/** Genera URL con propósito legible para emails */
export function getTokenUrlWithContext(token: ExpedienteToken): {
  url: string;
  purposeLabel: string;
} {
  const labels: Record<TokenPurpose, string> = {
    buro_signature: 'Firmar autorización de Buró de Crédito',
    ciec_linkage: 'Conectar CIEC del SAT',
    document_upload: 'Subir documentación',
    general_access: 'Acceder al expediente',
  };

  return {
    url: getTokenUrl(token),
    purposeLabel: labels[token.purpose],
  };
}

// ─── Expiración y limpieza ───────────────────────────────────────────

/** Obtiene tokens próximos a expirar (para enviar reminders) */
export function getTokensNearExpiry(
  hoursBeforeExpiry: number = DEFAULT_BUSINESS_RULES.reminder_after_hours,
): ExpedienteToken[] {
  const threshold = addHours(new Date(), hoursBeforeExpiry);
  const nowStr = now();
  return Array.from(tokenStore.values())
    .filter((t) => !t.is_used && t.expires_at > nowStr && t.expires_at <= threshold);
}

/** Invalida todos los tokens de un expediente (al rechazar, por ejemplo) */
export function invalidateAllTokens(expedienteId: string): number {
  let count = 0;
  for (const token of tokenStore.values()) {
    if (token.expediente_id === expedienteId && !token.is_used) {
      token.is_used = true;
      count++;
    }
  }
  return count;
}
