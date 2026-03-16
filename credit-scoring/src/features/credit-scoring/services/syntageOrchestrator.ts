/**
 * Orquestador Syntage — Flujo completo de integración con Syntage API.
 *
 * Coordina el flujo:
 *   1. createEntity (registrar empresa en Syntage)
 *   2. createCredential (CIEC del SAT)
 *   3. createBuroAuthorization (firma del solicitante)
 *   4. createExtraction (iniciar extracción de datos)
 *   5. pollExtraction (esperar a que termine)
 *
 * Cada paso actualiza el expediente y registra eventos.
 * El orquestador NO toma decisiones de negocio, solo coordina APIs.
 */

import type {
  SyntageEntity,
  SyntageCredential,
  SyntageExtraction,
  ExtractionType,
  ExtractionStatus,
} from '../api/syntageManagement';
import {
  createEntity,
  createCredential,
  createExtraction,
  getExtraction,
} from '../api/syntageManagement';
import type { SyntageBuroAuthorization } from '../api/syntageBuro';
import { createBuroAuthorization } from '../api/syntageBuro';
import {
  advanceExpediente,
  linkSyntageEntity,
  getExpediente,
} from './expedienteService';
import { createToken } from './tokenService';

// ─── Tipos del orquestador ──────────────────────────────────────────

/** Estado de un paso del orquestador */
export type OrchestratorStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/** Paso individual del flujo */
export interface OrchestratorStep {
  name: string;
  status: OrchestratorStepStatus;
  result?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

/** Resultado completo del orquestador */
export interface OrchestratorResult {
  expedienteId: string;
  success: boolean;
  steps: OrchestratorStep[];
  entity?: SyntageEntity;
  credential?: SyntageCredential;
  buroAuth?: SyntageBuroAuthorization;
  extractions: SyntageExtraction[];
  error?: string;
}

/** Opciones de configuración del orquestador */
export interface OrchestratorOptions {
  /** Intervalo de polling en ms (default: 5000) */
  pollIntervalMs?: number;
  /** Timeout máximo de polling en ms (default: 300000 = 5min) */
  pollTimeoutMs?: number;
  /** Si debe crear autorización de Buró (requiere firma previa) */
  includeBuro?: boolean;
  /** Tipos de extracción a ejecutar */
  extractionTypes?: ExtractionType[];
}

const DEFAULT_OPTIONS: Required<OrchestratorOptions> = {
  pollIntervalMs: 5000,
  pollTimeoutMs: 300_000,
  includeBuro: false,
  extractionTypes: ['invoice', 'annual_tax_return', 'monthly_tax_return', 'tax_status', 'tax_compliance'],
};

// ─── Helpers ─────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Paso 1: Crear entidad en Syntage ────────────────────────────────

/**
 * Registra la empresa del expediente como entidad en Syntage.
 * Si ya tiene syntage_entity_id, se salta este paso.
 */
async function stepCreateEntity(
  expedienteId: string,
  step: OrchestratorStep,
): Promise<SyntageEntity | null> {
  const exp = getExpediente(expedienteId);
  if (!exp) throw new Error(`Expediente ${expedienteId} no encontrado`);

  // Si ya tiene entidad, skip
  if (exp.syntage_entity_id) {
    step.status = 'skipped';
    step.completedAt = now();
    return null;
  }

  step.status = 'running';
  step.startedAt = now();

  try {
    const entity = await createEntity({
      type: 'company',
      name: exp.company_name,
      taxpayer: { rfc: exp.rfc },
      tags: [`expediente:${exp.folio}`],
    });

    linkSyntageEntity(expedienteId, entity.id);

    step.status = 'completed';
    step.result = { entityId: entity.id };
    step.completedAt = now();
    return entity;
  } catch (error: unknown) {
    step.status = 'failed';
    step.error = error instanceof Error ? error.message : 'Error creando entidad';
    step.completedAt = now();
    return null;
  }
}

// ─── Paso 2: Crear credencial CIEC ──────────────────────────────────

/**
 * Crea la credencial CIEC del SAT en Syntage.
 *
 * NOTA: En el flujo real, el solicitante ingresa su CIEC
 * a través del link/token. Este paso se ejecuta después
 * de que el solicitante complete el formulario CIEC.
 */
async function stepCreateCredential(
  expedienteId: string,
  entityId: string,
  ciecPassword: string,
  step: OrchestratorStep,
): Promise<SyntageCredential | null> {
  const exp = getExpediente(expedienteId);
  if (!exp) throw new Error(`Expediente ${expedienteId} no encontrado`);

  step.status = 'running';
  step.startedAt = now();

  try {
    const credential = await createCredential({
      entity: `/entities/${entityId}`,
      rfc: exp.rfc,
      password: ciecPassword,
    });

    step.status = 'completed';
    step.result = { credentialId: credential.id, status: credential.status };
    step.completedAt = now();
    return credential;
  } catch (error: unknown) {
    step.status = 'failed';
    step.error = error instanceof Error ? error.message : 'Error creando credencial CIEC';
    step.completedAt = now();
    return null;
  }
}

// ─── Paso 3: Autorización Buró ───────────────────────────────────────

/**
 * Crea la autorización de Buró de Crédito en Syntage.
 * Requiere que el solicitante haya firmado previamente.
 */
async function stepBuroAuthorization(
  entityId: string,
  step: OrchestratorStep,
): Promise<SyntageBuroAuthorization | null> {
  step.status = 'running';
  step.startedAt = now();

  try {
    const auth = await createBuroAuthorization(
      { type: 'consultation' },
      entityId,
    );

    step.status = 'completed';
    step.result = { authId: auth.id, status: auth.status };
    step.completedAt = now();
    return auth;
  } catch (error: unknown) {
    step.status = 'failed';
    step.error = error instanceof Error ? error.message : 'Error creando autorización Buró';
    step.completedAt = now();
    return null;
  }
}

// ─── Paso 4: Crear extracciones ──────────────────────────────────────

/**
 * Inicia las extracciones de datos en Syntage.
 * Puede ejecutar múltiples tipos en paralelo.
 */
async function stepCreateExtractions(
  entityId: string,
  types: ExtractionType[],
  step: OrchestratorStep,
): Promise<SyntageExtraction[]> {
  step.status = 'running';
  step.startedAt = now();

  const results: SyntageExtraction[] = [];
  const errors: string[] = [];

  // Crear extracciones en paralelo
  const promises = types.map(async (type) => {
    try {
      const extraction = await createExtraction({
        entity: `/entities/${entityId}`,
        type,
      });
      results.push(extraction);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : `Error extracción ${type}`;
      errors.push(msg);
    }
  });

  await Promise.all(promises);

  if (results.length === 0) {
    step.status = 'failed';
    step.error = errors.join('; ');
  } else {
    step.status = 'completed';
    step.result = {
      created: results.map((e) => ({ id: e.id, type: e.type })),
      errors: errors.length > 0 ? errors : undefined,
    };
  }
  step.completedAt = now();
  return results;
}

// ─── Paso 5: Polling de extracciones ─────────────────────────────────

/** Estados terminales de una extracción */
const TERMINAL_STATUSES: ExtractionStatus[] = ['finished', 'failed', 'stopped', 'cancelled'];

/**
 * Espera a que todas las extracciones terminen.
 * Hace polling periódico hasta que todas estén en estado terminal o timeout.
 */
async function stepPollExtractions(
  extractions: SyntageExtraction[],
  options: Required<OrchestratorOptions>,
  step: OrchestratorStep,
): Promise<SyntageExtraction[]> {
  step.status = 'running';
  step.startedAt = now();

  const startTime = Date.now();
  const pending = new Map(extractions.map((e) => [e.id, e]));

  while (pending.size > 0) {
    // Verificar timeout
    if (Date.now() - startTime > options.pollTimeoutMs) {
      step.status = 'failed';
      step.error = `Timeout: ${pending.size} extracciones aún pendientes`;
      step.completedAt = now();
      return extractions;
    }

    await sleep(options.pollIntervalMs);

    // Verificar estado de cada extracción pendiente
    for (const [id] of pending) {
      try {
        const updated = await getExtraction(id);
        // Actualizar en la lista original
        const idx = extractions.findIndex((e) => e.id === id);
        if (idx >= 0) extractions[idx] = updated;

        if (TERMINAL_STATUSES.includes(updated.status)) {
          pending.delete(id);
        }
      } catch {
        // Si falla el polling, seguir intentando
      }
    }
  }

  const allFinished = extractions.every((e) => e.status === 'finished');
  step.status = allFinished ? 'completed' : 'failed';
  step.result = extractions.map((e) => ({ id: e.id, type: e.type, status: e.status }));
  step.completedAt = now();
  return extractions;
}

// ─── Orquestador principal ───────────────────────────────────────────

/**
 * Ejecuta el flujo completo de integración Syntage para un expediente.
 *
 * Flujo:
 *   1. Crear entidad → 2. Crear credencial CIEC → 3. Buró (opcional)
 *   → 4. Crear extracciones → 5. Polling hasta completar
 *
 * @param expedienteId - ID del expediente
 * @param ciecPassword - Contraseña CIEC del SAT (proporcionada por el solicitante)
 * @param options - Opciones de configuración
 */
export async function orchestrateSyntage(
  expedienteId: string,
  ciecPassword: string,
  options: OrchestratorOptions = {},
): Promise<OrchestratorResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const steps: OrchestratorStep[] = [
    { name: 'create_entity', status: 'pending' },
    { name: 'create_credential', status: 'pending' },
    ...(opts.includeBuro ? [{ name: 'buro_authorization', status: 'pending' as OrchestratorStepStatus }] : []),
    { name: 'create_extractions', status: 'pending' },
    { name: 'poll_extractions', status: 'pending' },
  ];

  const result: OrchestratorResult = {
    expedienteId,
    success: false,
    steps,
    extractions: [],
  };

  const exp = getExpediente(expedienteId);
  if (!exp) {
    result.error = `Expediente ${expedienteId} no encontrado`;
    return result;
  }

  // ── Paso 1: Crear entidad ──
  const entityStep = steps.find((s) => s.name === 'create_entity')!;
  const entity = await stepCreateEntity(expedienteId, entityStep);
  const entityId = entity?.id ?? exp.syntage_entity_id;

  if (!entityId) {
    result.error = 'No se pudo crear/obtener entidad en Syntage';
    return result;
  }
  result.entity = entity ?? undefined;

  // ── Paso 2: Crear credencial CIEC ──
  const credStep = steps.find((s) => s.name === 'create_credential')!;
  const credential = await stepCreateCredential(expedienteId, entityId, ciecPassword, credStep);

  if (!credential) {
    result.error = 'No se pudo crear credencial CIEC';
    return result;
  }
  result.credential = credential;

  // ── Paso 3: Buró (opcional) ──
  if (opts.includeBuro) {
    const buroStep = steps.find((s) => s.name === 'buro_authorization')!;
    const buroAuth = await stepBuroAuthorization(entityId, buroStep);
    result.buroAuth = buroAuth ?? undefined;

    if (buroAuth) {
      // Agregar extracción de Buró
      opts.extractionTypes = [...opts.extractionTypes, 'buro_de_credito_report'];
    }
  }

  // ── Paso 4: Crear extracciones ──
  const extractStep = steps.find((s) => s.name === 'create_extractions')!;
  const extractions = await stepCreateExtractions(entityId, opts.extractionTypes, extractStep);
  result.extractions = extractions;

  if (extractions.length === 0) {
    result.error = 'No se pudieron crear extracciones';
    return result;
  }

  // ── Paso 5: Polling ──
  const pollStep = steps.find((s) => s.name === 'poll_extractions')!;
  result.extractions = await stepPollExtractions(extractions, opts, pollStep);

  // ── Evaluar resultado final ──
  const allCompleted = result.extractions.every((e) => e.status === 'finished');
  result.success = allCompleted;

  // Avanzar expediente si todo salió bien
  if (allCompleted) {
    advanceExpediente(expedienteId, 'analysis', 'system', {
      extractions: result.extractions.map((e) => ({ id: e.id, type: e.type })),
    });
  }

  return result;
}

// ─── Flujo de Buró independiente ─────────────────────────────────────

/**
 * Flujo específico para autorización y consulta de Buró.
 *
 * Se ejecuta por separado porque requiere firma del solicitante.
 * Flujo:
 *   1. Verificar que el expediente está en buro_authorization
 *   2. Crear autorización en Syntage
 *   3. Crear extracción buro_de_credito_report
 *   4. Polling hasta completar
 *   5. Actualizar score en expediente
 *   6. Avanzar a sat_linkage si score >= mínimo
 *
 * @param expedienteId - ID del expediente
 * @param entityId - ID de entidad en Syntage (si ya existe)
 */
export async function orchestrateBuroFlow(
  expedienteId: string,
  options: OrchestratorOptions = {},
): Promise<OrchestratorResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const steps: OrchestratorStep[] = [
    { name: 'buro_authorization', status: 'pending' },
    { name: 'buro_extraction', status: 'pending' },
    { name: 'poll_buro', status: 'pending' },
  ];

  const result: OrchestratorResult = {
    expedienteId,
    success: false,
    steps,
    extractions: [],
  };

  const exp = getExpediente(expedienteId);
  if (!exp) {
    result.error = `Expediente ${expedienteId} no encontrado`;
    return result;
  }

  if (exp.stage !== 'buro_authorization') {
    result.error = `Expediente no está en etapa buro_authorization (actual: ${exp.stage})`;
    return result;
  }

  const entityId = exp.syntage_entity_id;
  if (!entityId) {
    result.error = 'Expediente no tiene entidad Syntage vinculada';
    return result;
  }

  // ── Paso 1: Autorización Buró ──
  const authStep = steps.find((s) => s.name === 'buro_authorization')!;
  const buroAuth = await stepBuroAuthorization(entityId, authStep);
  result.buroAuth = buroAuth ?? undefined;

  if (!buroAuth) {
    result.error = 'No se pudo crear autorización de Buró';
    return result;
  }

  // Generar token para que el solicitante firme
  createToken(expedienteId, 'buro_signature');

  // ── Paso 2: Extracción Buró ──
  const extractStep = steps.find((s) => s.name === 'buro_extraction')!;
  const extractions = await stepCreateExtractions(
    entityId,
    ['buro_de_credito_report'],
    extractStep,
  );
  result.extractions = extractions;

  if (extractions.length === 0) {
    result.error = 'No se pudo crear extracción de Buró';
    return result;
  }

  // ── Paso 3: Polling ──
  const pollStep = steps.find((s) => s.name === 'poll_buro')!;
  result.extractions = await stepPollExtractions(extractions, opts, pollStep);

  const buroFinished = result.extractions.every((e) => e.status === 'finished');
  result.success = buroFinished;

  // Si terminó, el score se actualiza cuando se procesen los datos del reporte
  if (buroFinished) {
    // El score real se extrae del reporte en el siguiente paso del flujo
    advanceExpediente(expedienteId, 'sat_linkage', 'system', {
      buro_extraction_completed: true,
    });
  }

  return result;
}
