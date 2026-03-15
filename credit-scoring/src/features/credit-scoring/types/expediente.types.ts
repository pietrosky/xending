/**
 * Tipos para el sistema de expedientes digitales de crédito.
 *
 * Un expediente representa el ciclo de vida completo de una solicitud,
 * desde el pre-filtro hasta la decisión final. Cada etapa genera tokens
 * únicos (links) que el solicitante usa para completar pasos sin login.
 */

import type { Currency } from './application.types';

// ─── Etapas del expediente ───────────────────────────────────────────

/** Estados posibles del expediente en el flujo de otorgamiento */
export type ExpedienteStage =
  | 'pre_filter'          // Etapa 1: datos mínimos + validaciones automáticas
  | 'pld_check'           // Etapa 2: PLD/Scory check rápido
  | 'buro_authorization'  // Etapa 3: firma + consulta Buró
  | 'sat_linkage'         // Etapa 4: vinculación CIEC vía Syntage
  | 'analysis'            // Etapa 4b: engines corriendo análisis
  | 'documentation'       // Etapa 5: subida de documentos
  | 'decision'            // Decisión final (automática o comité)
  | 'approved'            // Aprobado
  | 'rejected'            // Rechazado (en cualquier etapa)
  | 'expired';            // Expirado por inactividad

/** Propósitos de crédito válidos para Xending */
export type CreditPurpose =
  | 'importacion'         // Financiamiento de importaciones
  | 'factoraje'           // Adelanto de facturas
  | 'operaciones_fx'      // Operaciones de cambio de divisas
  | 'exportacion';        // Financiamiento de exportaciones

// ─── Expediente principal ────────────────────────────────────────────

/** Expediente digital de crédito */
export interface Expediente {
  id: string;
  /** Folio legible: XND-YYYY-NNNNN */
  folio: string;
  rfc: string;
  company_name: string;
  requested_amount: number;
  currency: Currency;
  credit_purpose: CreditPurpose;
  /** Ventas anuales declaradas por el solicitante (USD) */
  declared_annual_revenue: number;
  /** Antigüedad del negocio en años (declarada) */
  declared_business_age: number;
  /** Plazo solicitado en días (2-90) */
  term_days: number;
  /** Etapa actual del expediente */
  stage: ExpedienteStage;
  /** Razón de rechazo si stage = 'rejected' */
  rejection_reason: string | null;
  /** Etapa donde se rechazó */
  rejected_at_stage: ExpedienteStage | null;
  /** Email de contacto del solicitante */
  contact_email: string;
  /** Teléfono de contacto */
  contact_phone: string | null;
  /** Nombre del representante legal */
  legal_representative: string | null;
  /** ID de entidad en Syntage (se llena en etapa 4) */
  syntage_entity_id: string | null;
  /** ID de la application en cs_applications (se crea al pasar pre-filtro) */
  application_id: string | null;
  /** Score de pre-filtro (0-100) */
  pre_filter_score: number | null;
  /** Score de Buró (se llena en etapa 3) */
  buro_score: number | null;
  /** Score PLD de Scory (se llena en etapa 2) */
  pld_score: number | null;
  /** Metadata flexible (JSONB) */
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Tokens de acceso (sesiones) ─────────────────────────────────────

/** Tipo de acción que habilita el token */
export type TokenPurpose =
  | 'buro_signature'      // Firmar autorización de Buró
  | 'ciec_linkage'        // Conectar CIEC del SAT
  | 'document_upload'     // Subir documentos
  | 'general_access';     // Acceso general al expediente

/** Token de acceso único para el solicitante */
export interface ExpedienteToken {
  id: string;
  expediente_id: string;
  /** Token UUID que va en la URL */
  token: string;
  purpose: TokenPurpose;
  /** Fecha de expiración (default 72h desde creación) */
  expires_at: string;
  /** Si ya fue usado/completado */
  is_used: boolean;
  /** Cuántas veces se ha accedido con este token */
  access_count: number;
  /** Último acceso */
  last_accessed_at: string | null;
  created_at: string;
}

// ─── Eventos del expediente (audit log) ──────────────────────────────

/** Tipos de eventos que se registran en el expediente */
export type ExpedienteEventType =
  | 'created'
  | 'pre_filter_passed'
  | 'pre_filter_rejected'
  | 'pld_check_passed'
  | 'pld_check_failed'
  | 'buro_link_sent'
  | 'buro_signed'
  | 'buro_score_received'
  | 'buro_rejected'
  | 'ciec_link_sent'
  | 'ciec_connected'
  | 'extraction_started'
  | 'extraction_completed'
  | 'analysis_started'
  | 'analysis_completed'
  | 'docs_link_sent'
  | 'document_uploaded'
  | 'documentation_complete'
  | 'decision_auto_approved'
  | 'decision_sent_to_committee'
  | 'decision_approved'
  | 'decision_rejected'
  | 'token_generated'
  | 'token_expired'
  | 'reminder_sent'
  | 'stage_changed'
  | 'note_added';

/** Evento registrado en el expediente */
export interface ExpedienteEvent {
  id: string;
  expediente_id: string;
  event_type: ExpedienteEventType;
  /** Etapa del expediente cuando ocurrió el evento */
  stage: ExpedienteStage;
  /** Descripción legible del evento */
  description: string;
  /** Datos adicionales del evento */
  data: Record<string, unknown> | null;
  /** Quién generó el evento (sistema, analista, solicitante) */
  actor: string;
  created_at: string;
}

// ─── Pre-filtro ──────────────────────────────────────────────────────

/** Datos mínimos que el solicitante llena en el formulario inicial */
export interface PreFilterInput {
  rfc: string;
  company_name: string;
  requested_amount: number;
  currency: Currency;
  credit_purpose: CreditPurpose;
  declared_annual_revenue: number;
  declared_business_age: number;
  term_days: number;
  contact_email: string;
  contact_phone?: string;
  legal_representative?: string;
}

/** Resultado de una regla individual del pre-filtro */
export interface PreFilterRuleResult {
  rule: string;
  passed: boolean;
  message: string;
  /** Valor evaluado */
  actual_value: unknown;
  /** Umbral requerido */
  threshold: unknown;
}

/** Resultado completo del pre-filtro */
export interface PreFilterResult {
  passed: boolean;
  score: number;
  rules: PreFilterRuleResult[];
  /** Razón principal de rechazo (si no pasó) */
  rejection_reason: string | null;
}

// ─── Reglas de negocio configurables ─────────────────────────────────

/** Configuración de reglas de negocio Xending (pueden cambiar) */
export interface BusinessRules {
  /** Monto mínimo en USD */
  min_amount_usd: number;
  /** Monto máximo en USD */
  max_amount_usd: number;
  /** Multiplicador de ventas mínimas (ventas anuales ≥ X * monto) */
  min_revenue_multiplier: number;
  /** Antigüedad mínima del negocio en años */
  min_business_age_years: number;
  /** Propósitos de crédito aceptados */
  accepted_purposes: CreditPurpose[];
  /** Plazo mínimo en días */
  min_term_days: number;
  /** Plazo máximo en días (sin garantía) */
  max_term_days: number;
  /** Plazo máximo en días (con garantía) */
  max_term_days_with_guarantee: number;
  /** Score mínimo de Buró para continuar */
  min_buro_score: number;
  /** Horas de vigencia del token */
  token_expiry_hours: number;
  /** Horas antes de enviar reminder */
  reminder_after_hours: number;
}

/** Valores por defecto de las reglas de negocio Xending */
export const DEFAULT_BUSINESS_RULES: BusinessRules = {
  min_amount_usd: 100_000,
  max_amount_usd: 1_000_000,
  min_revenue_multiplier: 10,
  min_business_age_years: 2,
  accepted_purposes: ['importacion', 'factoraje', 'operaciones_fx', 'exportacion'],
  min_term_days: 2,
  max_term_days: 45,
  max_term_days_with_guarantee: 90,
  min_buro_score: 600,
  token_expiry_hours: 72,
  reminder_after_hours: 48,
};
