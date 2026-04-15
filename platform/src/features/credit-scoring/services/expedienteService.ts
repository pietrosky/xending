/**
 * Servicio de Expedientes — CRUD + transiciones + eventos.
 *
 * Centraliza toda la lógica de negocio para manipular expedientes:
 * crear, avanzar etapa, rechazar, registrar eventos, y consultar.
 *
 * Usa la state machine para validar transiciones y el pre-filtro
 * para la evaluación inicial automática.
 */

import type {
  Expediente,
  ExpedienteStage,
  ExpedienteEvent,
  ExpedienteEventType,
  PreFilterInput,
  PreFilterResult,
} from '../types/expediente.types';
import {
  isValidTransition,
  getTransitionEvent,
  isFinalStage,
} from '../lib/expedienteStateMachine';
import { runPreFilter } from '../engines/preFilter';

// ─── Tipos del servicio ──────────────────────────────────────────────

/** Resultado de crear un expediente */
export interface CreateExpedienteResult {
  expediente: Expediente;
  preFilter: PreFilterResult;
  /** Si pasó el pre-filtro, avanzó automáticamente a pld_check */
  autoAdvanced: boolean;
}

/** Resultado de una transición de etapa */
export interface TransitionResult {
  success: boolean;
  expediente: Expediente;
  event: ExpedienteEvent;
  error?: string;
}

/** Filtros para listar expedientes */
export interface ExpedienteFilters {
  stage?: ExpedienteStage;
  rfc?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Almacenamiento en memoria (se reemplaza por Supabase) ──────────

/**
 * Store temporal en memoria para desarrollo.
 * En producción se reemplaza por llamadas a Supabase.
 */
const store: {
  expedientes: Map<string, Expediente>;
  events: Map<string, ExpedienteEvent[]>;
  counter: number;
} = {
  expedientes: new Map(),
  events: new Map(),
  counter: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────

function generateFolio(): string {
  store.counter += 1;
  const year = new Date().getFullYear();
  const seq = String(store.counter).padStart(5, '0');
  return `XND-${year}-${seq}`;
}

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function createEvent(
  expedienteId: string,
  eventType: ExpedienteEventType,
  stage: ExpedienteStage,
  description: string,
  actor: string = 'system',
  data?: Record<string, unknown>,
): ExpedienteEvent {
  const event: ExpedienteEvent = {
    id: generateId(),
    expediente_id: expedienteId,
    event_type: eventType,
    stage,
    description,
    data: data ?? null,
    actor,
    created_at: now(),
  };
  const existing = store.events.get(expedienteId) ?? [];
  existing.push(event);
  store.events.set(expedienteId, existing);
  return event;
}

// ─── Crear expediente ────────────────────────────────────────────────

/**
 * Crea un expediente nuevo y ejecuta el pre-filtro automáticamente.
 *
 * Si el pre-filtro pasa → avanza a pld_check.
 * Si no pasa → queda en pre_filter con rejection info (NO rechaza aún,
 * permite al analista revisar).
 */
export function createExpediente(input: PreFilterInput): CreateExpedienteResult {
  const preFilter = runPreFilter(input);

  const id = generateId();
  const folio = generateFolio();
  const timestamp = now();

  const expediente: Expediente = {
    id,
    folio,
    rfc: input.rfc.trim().toUpperCase(),
    company_name: input.company_name.trim(),
    requested_amount: input.requested_amount,
    currency: input.currency,
    credit_purpose: input.credit_purpose,
    declared_annual_revenue: input.declared_annual_revenue,
    declared_business_age: input.declared_business_age,
    term_days: input.term_days,
    stage: preFilter.passed ? 'pld_check' : 'pre_filter',
    rejection_reason: preFilter.rejection_reason,
    rejected_at_stage: null,
    contact_email: input.contact_email.trim(),
    contact_phone: input.contact_phone?.trim() ?? null,
    legal_representative: input.legal_representative?.trim() ?? null,
    syntage_entity_id: null,
    application_id: null,
    pre_filter_score: preFilter.score,
    buro_score: null,
    pld_score: null,
    metadata: { pre_filter_rules: preFilter.rules },
    created_at: timestamp,
    updated_at: timestamp,
  };

  store.expedientes.set(id, expediente);

  // Registrar evento de creación
  createEvent(id, 'created', 'pre_filter', `Expediente ${folio} creado`, 'system', {
    input,
    pre_filter_score: preFilter.score,
  });

  // Si pasó pre-filtro, registrar evento de avance
  if (preFilter.passed) {
    createEvent(id, 'pre_filter_passed', 'pld_check',
      `Pre-filtro aprobado (${preFilter.score}%). Avanza a verificación PLD.`,
      'system', { score: preFilter.score },
    );
  } else {
    createEvent(id, 'pre_filter_rejected', 'pre_filter',
      `Pre-filtro no aprobado: ${preFilter.rejection_reason}`,
      'system', { score: preFilter.score, failed_rules: preFilter.rules.filter(r => !r.passed) },
    );
  }

  return {
    expediente,
    preFilter,
    autoAdvanced: preFilter.passed,
  };
}

// ─── Avanzar etapa ───────────────────────────────────────────────────

/**
 * Avanza el expediente a la siguiente etapa válida.
 * Valida la transición con la state machine.
 */
export function advanceExpediente(
  expedienteId: string,
  toStage: ExpedienteStage,
  actor: string = 'system',
  data?: Record<string, unknown>,
): TransitionResult {
  const exp = store.expedientes.get(expedienteId);
  if (!exp) {
    throw new Error(`Expediente ${expedienteId} no encontrado`);
  }

  if (!isValidTransition(exp.stage, toStage)) {
    const event = createEvent(
      expedienteId, 'stage_changed', exp.stage,
      `Transición inválida: ${exp.stage} → ${toStage}`,
      actor,
    );
    return { success: false, expediente: exp, event, error: `Transición ${exp.stage} → ${toStage} no permitida` };
  }

  const previousStage = exp.stage;
  exp.stage = toStage;
  exp.updated_at = now();

  // Si es rechazo, guardar info
  if (toStage === 'rejected') {
    exp.rejected_at_stage = previousStage;
    if (data?.rejection_reason) {
      exp.rejection_reason = data.rejection_reason as string;
    }
  }

  const eventType = getTransitionEvent(previousStage, toStage);
  const event = createEvent(
    expedienteId, eventType, toStage,
    `Etapa cambiada: ${previousStage} → ${toStage}`,
    actor, { previous_stage: previousStage, ...data },
  );

  return { success: true, expediente: exp, event };
}

// ─── Rechazar expediente ─────────────────────────────────────────────

/**
 * Rechaza un expediente desde cualquier etapa no-final.
 */
export function rejectExpediente(
  expedienteId: string,
  reason: string,
  actor: string = 'system',
): TransitionResult {
  return advanceExpediente(expedienteId, 'rejected', actor, { rejection_reason: reason });
}

// ─── Actualizar scores parciales ─────────────────────────────────────

/** Actualiza el score PLD en el expediente */
export function updatePldScore(expedienteId: string, score: number): Expediente {
  const exp = store.expedientes.get(expedienteId);
  if (!exp) throw new Error(`Expediente ${expedienteId} no encontrado`);
  exp.pld_score = score;
  exp.updated_at = now();
  return exp;
}

/** Actualiza el score de Buró en el expediente */
export function updateBuroScore(expedienteId: string, score: number): Expediente {
  const exp = store.expedientes.get(expedienteId);
  if (!exp) throw new Error(`Expediente ${expedienteId} no encontrado`);
  exp.buro_score = score;
  exp.updated_at = now();
  return exp;
}

/** Vincula el entity ID de Syntage al expediente */
export function linkSyntageEntity(expedienteId: string, entityId: string): Expediente {
  const exp = store.expedientes.get(expedienteId);
  if (!exp) throw new Error(`Expediente ${expedienteId} no encontrado`);
  exp.syntage_entity_id = entityId;
  exp.updated_at = now();
  return exp;
}

// ─── Consultas ───────────────────────────────────────────────────────

/** Obtiene un expediente por ID */
export function getExpediente(id: string): Expediente | undefined {
  return store.expedientes.get(id);
}

/** Obtiene un expediente por folio */
export function getExpedienteByFolio(folio: string): Expediente | undefined {
  for (const exp of store.expedientes.values()) {
    if (exp.folio === folio) return exp;
  }
  return undefined;
}

/** Lista expedientes con filtros opcionales */
export function listExpedientes(filters?: ExpedienteFilters): Expediente[] {
  let results = Array.from(store.expedientes.values());

  if (filters?.stage) {
    results = results.filter((e) => e.stage === filters.stage);
  }
  if (filters?.rfc) {
    const rfcUpper = filters.rfc.toUpperCase();
    results = results.filter((e) => e.rfc === rfcUpper);
  }
  if (filters?.dateFrom) {
    results = results.filter((e) => e.created_at >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    results = results.filter((e) => e.created_at <= filters.dateTo!);
  }

  // Más recientes primero
  return results.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Obtiene los eventos de un expediente */
export function getExpedienteEvents(expedienteId: string): ExpedienteEvent[] {
  return store.events.get(expedienteId) ?? [];
}

/** Cuenta expedientes por etapa (para dashboard) */
export function countByStage(): Record<ExpedienteStage, number> {
  const counts: Record<string, number> = {};
  for (const exp of store.expedientes.values()) {
    counts[exp.stage] = (counts[exp.stage] ?? 0) + 1;
  }
  return counts as Record<ExpedienteStage, number>;
}

/** Verifica si un expediente está en estado final */
export function isExpedienteFinal(expedienteId: string): boolean {
  const exp = store.expedientes.get(expedienteId);
  if (!exp) return false;
  return isFinalStage(exp.stage);
}

/** Registra un evento manual (nota del analista, etc.) */
export function addExpedienteNote(
  expedienteId: string,
  description: string,
  actor: string,
): ExpedienteEvent {
  const exp = store.expedientes.get(expedienteId);
  if (!exp) throw new Error(`Expediente ${expedienteId} no encontrado`);
  return createEvent(expedienteId, 'note_added', exp.stage, description, actor);
}
