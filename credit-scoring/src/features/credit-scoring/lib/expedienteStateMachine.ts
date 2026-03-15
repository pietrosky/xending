/**
 * State Machine del flujo de otorgamiento de crédito Xending.
 *
 * Define las transiciones válidas entre etapas del expediente,
 * las acciones que dispara cada transición, y las validaciones
 * necesarias para avanzar.
 *
 * Flujo:
 *   pre_filter → pld_check → buro_authorization → sat_linkage
 *   → analysis → documentation → decision → approved/rejected
 *
 * Cualquier etapa puede ir a 'rejected' o 'expired'.
 */

import type { ExpedienteStage, ExpedienteEventType } from '../types/expediente.types';

// ─── Transiciones válidas ────────────────────────────────────────────

/** Mapa de transiciones: desde → [destinos posibles] */
const TRANSITIONS: Record<ExpedienteStage, ExpedienteStage[]> = {
  pre_filter:         ['pld_check', 'rejected'],
  pld_check:          ['buro_authorization', 'rejected'],
  buro_authorization: ['sat_linkage', 'rejected'],
  sat_linkage:        ['analysis', 'rejected', 'expired'],
  analysis:           ['documentation', 'rejected'],
  documentation:      ['decision', 'rejected', 'expired'],
  decision:           ['approved', 'rejected'],
  approved:           [],  // Estado final
  rejected:           [],  // Estado final
  expired:            ['pre_filter'],  // Puede reactivarse
};

/** Verifica si una transición de etapa es válida */
export function isValidTransition(from: ExpedienteStage, to: ExpedienteStage): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Obtiene las etapas destino posibles desde una etapa dada */
export function getNextStages(current: ExpedienteStage): ExpedienteStage[] {
  return TRANSITIONS[current] ?? [];
}

/** Verifica si una etapa es un estado final */
export function isFinalStage(stage: ExpedienteStage): boolean {
  return stage === 'approved' || stage === 'rejected';
}

/** Verifica si el expediente puede avanzar (no está en estado final ni expirado) */
export function canAdvance(stage: ExpedienteStage): boolean {
  return !isFinalStage(stage) && stage !== 'expired';
}

// ─── Evento que genera cada transición ───────────────────────────────

/** Mapea transición → evento que se registra en el audit log */
const TRANSITION_EVENTS: Record<string, ExpedienteEventType> = {
  'pre_filter→pld_check': 'pre_filter_passed',
  'pre_filter→rejected': 'pre_filter_rejected',
  'pld_check→buro_authorization': 'pld_check_passed',
  'pld_check→rejected': 'pld_check_failed',
  'buro_authorization→sat_linkage': 'buro_score_received',
  'buro_authorization→rejected': 'buro_rejected',
  'sat_linkage→analysis': 'extraction_completed',
  'sat_linkage→rejected': 'stage_changed',
  'sat_linkage→expired': 'token_expired',
  'analysis→documentation': 'analysis_completed',
  'analysis→rejected': 'stage_changed',
  'documentation→decision': 'documentation_complete',
  'documentation→rejected': 'stage_changed',
  'documentation→expired': 'token_expired',
  'decision→approved': 'decision_approved',
  'decision→rejected': 'decision_rejected',
  'expired→pre_filter': 'stage_changed',
};

/** Obtiene el tipo de evento para una transición */
export function getTransitionEvent(
  from: ExpedienteStage,
  to: ExpedienteStage
): ExpedienteEventType {
  const key = `${from}→${to}`;
  return TRANSITION_EVENTS[key] ?? 'stage_changed';
}

// ─── Descripciones legibles ──────────────────────────────────────────

/** Nombres legibles de cada etapa para la UI */
export const STAGE_LABELS: Record<ExpedienteStage, string> = {
  pre_filter: 'Pre-filtro',
  pld_check: 'Verificación PLD',
  buro_authorization: 'Autorización Buró',
  sat_linkage: 'Vinculación SAT',
  analysis: 'Análisis crediticio',
  documentation: 'Documentación',
  decision: 'Decisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  expired: 'Expirado',
};

/** Descripciones de qué pasa en cada etapa */
export const STAGE_DESCRIPTIONS: Record<ExpedienteStage, string> = {
  pre_filter: 'Validación de datos mínimos contra reglas de negocio Xending',
  pld_check: 'Verificación PLD/KYC rápida vía Scory (listas negras, PEPs, 69-B)',
  buro_authorization: 'El solicitante firma autorización para consultar Buró de Crédito',
  sat_linkage: 'El solicitante conecta su CIEC del SAT vía Syntage para extracción de datos',
  analysis: 'Ejecución de todos los engines de scoring sobre datos reales del SAT',
  documentation: 'El solicitante sube documentos complementarios (acta, estados financieros, etc.)',
  decision: 'Decisión final: automática por score o escalada a comité',
  approved: 'Crédito aprobado — se procede a formalización',
  rejected: 'Solicitud rechazada',
  expired: 'Solicitud expirada por inactividad',
};

// ─── Tokens requeridos por etapa ─────────────────────────────────────

import type { TokenPurpose } from '../types/expediente.types';

/** Qué tipo de token se necesita generar al entrar a cada etapa */
export const STAGE_TOKEN_REQUIRED: Partial<Record<ExpedienteStage, TokenPurpose>> = {
  buro_authorization: 'buro_signature',
  sat_linkage: 'ciec_linkage',
  documentation: 'document_upload',
};

/** Verifica si una etapa requiere enviar un link al solicitante */
export function stageRequiresToken(stage: ExpedienteStage): boolean {
  return stage in STAGE_TOKEN_REQUIRED;
}

// ─── Progreso visual ─────────────────────────────────────────────────

/** Orden de las etapas para mostrar progreso (excluyendo estados finales) */
export const STAGE_ORDER: ExpedienteStage[] = [
  'pre_filter',
  'pld_check',
  'buro_authorization',
  'sat_linkage',
  'analysis',
  'documentation',
  'decision',
];

/** Calcula el porcentaje de progreso del expediente (0-100) */
export function getProgress(stage: ExpedienteStage): number {
  if (stage === 'approved') return 100;
  if (stage === 'rejected' || stage === 'expired') return 0;
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1) return 0;
  return Math.round(((idx + 1) / STAGE_ORDER.length) * 100);
}
