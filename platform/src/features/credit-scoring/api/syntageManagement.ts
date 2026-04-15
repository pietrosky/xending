/**
 * Syntage API — Grupo 7: Gestión de Datos (Orquestador)
 *
 * Endpoints cubiertos:
 *   GET  /entities                              — Listar entidades
 *   GET  /entities/{entityId}                   — Entidad individual
 *   POST /entities                              — Crear entidad
 *   POST /credentials                           — Crear credenciales SAT
 *   GET  /credentials                           — Listar credenciales
 *   GET  /credentials/{id}                      — Credencial individual
 *   POST /credentials/{id}/revalidate           — Revalidar credencial
 *   POST /extractions                           — Crear extracción
 *   GET  /extractions                           — Listar extracciones
 *   GET  /extractions/{id}                      — Extracción individual
 *   DELETE /extractions/{id}/stop               — Cancelar extracción
 *   GET  /datasources/mx/addresses/{postalCode} — Direcciones por CP
 *   POST /schedulers                            — Programar extracciones
 *   POST /exports                               — Exportar datos
 *   GET  /exports/{id}                          — Estado de exportación
 *   GET  /files/{id}                            — Metadata de archivo
 *   GET  /files/{id}/download                   — Descargar archivo
 *
 * Uso en el sistema:
 *   - Orquestador: buscar/crear entity, verificar credenciales, crear extracciones
 *   - NewApplicationForm: crear entity nueva si no existe
 *   - ApplicationDetailPage: mostrar progreso de extracción
 *   - Review Frequency: programar re-extracciones periódicas
 *   - ReportPage: exportar datos para reportes offline
 *   - Documentation Engine: descargar PDFs/XMLs
 *
 * @see docs/SYNTAGE_API_INTEGRATION_MAP.md — Grupo 7
 */

import {
  syntageRequest,
  fetchAllPages,
  type HydraCollection,
} from './syntageClient';

// ============================================================
// Types — Entities
// ============================================================

/** Syntage entity (company or person). */
export interface SyntageEntity {
  '@id'?: string;
  id: string;
  type: 'company' | 'person';
  name: string;
  taxpayer: { rfc: string } | null;
  tags: string[];
  /** URL for onboarding (if entity requires contributor input) */
  onboardingUrl: string | null;
  createdAt: string;
}

/** Payload to create a new entity. */
export interface CreateEntityPayload {
  type: 'company' | 'person';
  name: string;
  taxpayer?: { rfc: string };
  tags?: string[];
}

// ============================================================
// Types — Credentials
// ============================================================

/** SAT credential record. */
export interface SyntageCredential {
  '@id'?: string;
  id: string;
  rfc: string;
  status: 'pending' | 'valid' | 'invalid' | 'deactivated';
  createdAt: string;
  entity: string; // IRI reference
}

/** Payload to create SAT credentials. */
export interface CreateCredentialPayload {
  entity: string; // IRI reference e.g. "/entities/{id}"
  rfc: string;
  password: string;
}

// ============================================================
// Types — Extractions
// ============================================================

/** Extraction types supported by Syntage. */
export type ExtractionType =
  | 'invoice'
  | 'annual_tax_return'
  | 'monthly_tax_return'
  | 'electronic_accounting'
  | 'tax_status'
  | 'tax_compliance'
  | 'rpc'
  | 'tax_retention'
  | 'buro_de_credito_report'
  | 'bil';

/** Extraction status lifecycle. */
export type ExtractionStatus =
  | 'pending'
  | 'waiting'
  | 'running'
  | 'finished'
  | 'failed'
  | 'stopped'
  | 'cancelled';

/** Extraction record. */
export interface SyntageExtraction {
  '@id'?: string;
  id: string;
  type: ExtractionType;
  status: ExtractionStatus;
  /** Progress percentage (0-100) */
  progress: number | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  /** Error message if failed */
  error: string | null;
  entity: string; // IRI reference
}

/** Payload to create an extraction. */
export interface CreateExtractionPayload {
  entity: string; // IRI reference
  type: ExtractionType;
  /** Optional filters (e.g. date range for invoices) */
  options?: Record<string, unknown>;
}

// ============================================================
// Types — Addresses, Schedulers, Exports, Files
// ============================================================

/** Mexican address by postal code. */
export interface SyntageAddress {
  postalCode: string;
  neighborhood: string;
  municipality: string;
  state: string;
  city: string;
}

/** Scheduler for periodic extractions. */
export interface SyntageScheduler {
  '@id'?: string;
  id: string;
  entity: string;
  extractionType: ExtractionType;
  frequency: string;
  createdAt: string;
}

/** Export record. */
export interface SyntageExport {
  '@id'?: string;
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: 'csv' | 'xlsx';
  fileId: string | null;
  createdAt: string;
}

/** File metadata. */
export interface SyntageFile {
  '@id'?: string;
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

// ============================================================
// API Functions — Entities
// ============================================================

/**
 * List all entities.
 *
 * @returns Hydra collection of entities
 */
export async function getEntities(): Promise<HydraCollection<SyntageEntity>> {
  return syntageRequest<HydraCollection<SyntageEntity>>('/entities');
}

/**
 * Get a single entity by ID.
 *
 * @param entityId - Entity ID
 * @returns Entity details
 */
export async function getEntity(entityId: string): Promise<SyntageEntity> {
  return syntageRequest<SyntageEntity>(`/entities/${entityId}`);
}

/**
 * Create a new entity.
 *
 * Returns the created entity with an onboardingUrl if the entity
 * requires contributor input (e.g. CIEC password).
 *
 * @param payload - Entity data (type, name, taxpayer)
 * @returns Created entity
 */
export async function createEntity(
  payload: CreateEntityPayload,
): Promise<SyntageEntity> {
  return syntageRequest<SyntageEntity>('/entities', {
    method: 'POST',
    body: payload,
  });
}

// ============================================================
// API Functions — Credentials
// ============================================================

/**
 * List all credentials.
 *
 * @returns Hydra collection of credentials
 */
export async function getCredentials(): Promise<
  HydraCollection<SyntageCredential>
> {
  return syntageRequest<HydraCollection<SyntageCredential>>('/credentials');
}

/**
 * Get a single credential by ID.
 *
 * @param credentialId - Credential ID
 * @returns Credential details
 */
export async function getCredential(
  credentialId: string,
): Promise<SyntageCredential> {
  return syntageRequest<SyntageCredential>(`/credentials/${credentialId}`);
}

/**
 * Create SAT credentials for an entity.
 *
 * @param payload - Credential data (entity IRI, RFC, password)
 * @returns Created credential
 */
export async function createCredential(
  payload: CreateCredentialPayload,
): Promise<SyntageCredential> {
  return syntageRequest<SyntageCredential>('/credentials', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Revalidate an existing credential.
 *
 * @param credentialId - Credential ID
 * @returns Updated credential
 */
export async function revalidateCredential(
  credentialId: string,
): Promise<SyntageCredential> {
  return syntageRequest<SyntageCredential>(
    `/credentials/${credentialId}/revalidate`,
    { method: 'POST' },
  );
}

// ============================================================
// API Functions — Extractions
// ============================================================

/**
 * List all extractions.
 *
 * @returns Hydra collection of extractions
 */
export async function getExtractions(): Promise<
  HydraCollection<SyntageExtraction>
> {
  return syntageRequest<HydraCollection<SyntageExtraction>>('/extractions');
}

/**
 * Get all extractions (auto-paginates).
 *
 * @returns Array of all extractions
 */
export async function getAllExtractions(): Promise<SyntageExtraction[]> {
  return fetchAllPages<SyntageExtraction>('/extractions');
}

/**
 * Get a single extraction by ID.
 *
 * @param extractionId - Extraction ID
 * @returns Extraction details with status and progress
 */
export async function getExtraction(
  extractionId: string,
): Promise<SyntageExtraction> {
  return syntageRequest<SyntageExtraction>(`/extractions/${extractionId}`);
}

/**
 * Create a new extraction.
 *
 * Starts the data extraction process for the specified type.
 * Status lifecycle: pending → waiting → running → finished/failed
 *
 * @param payload - Extraction config (entity, type, options)
 * @returns Created extraction
 *
 * @example
 * const extraction = await createExtraction({
 *   entity: '/entities/abc-123',
 *   type: 'invoice',
 *   options: { from: '2023-01-01', to: '2024-12-31' },
 * });
 */
export async function createExtraction(
  payload: CreateExtractionPayload,
): Promise<SyntageExtraction> {
  return syntageRequest<SyntageExtraction>('/extractions', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Stop/cancel a running extraction.
 *
 * @param extractionId - Extraction ID
 */
export async function stopExtraction(extractionId: string): Promise<void> {
  await syntageRequest<void>(`/extractions/${extractionId}/stop`, {
    method: 'DELETE',
  });
}

// ============================================================
// API Functions — Addresses
// ============================================================

/**
 * Get addresses by postal code.
 *
 * Used by NewApplicationForm for address autocomplete.
 *
 * @param postalCode - Mexican postal code (5 digits)
 * @returns Array of matching addresses
 */
export async function getAddresses(
  postalCode: string,
): Promise<SyntageAddress[]> {
  const response = await syntageRequest<HydraCollection<SyntageAddress>>(
    `/datasources/mx/addresses/${postalCode}`,
  );
  return response['hydra:member'] ?? [];
}

// ============================================================
// API Functions — Schedulers
// ============================================================

/**
 * Create a scheduler for periodic extractions.
 *
 * Used by Review Frequency engine to schedule re-extractions.
 *
 * @param payload - Scheduler config
 * @returns Created scheduler
 */
export async function createScheduler(payload: {
  entity: string;
  extractionType: ExtractionType;
  frequency: string;
}): Promise<SyntageScheduler> {
  return syntageRequest<SyntageScheduler>('/schedulers', {
    method: 'POST',
    body: payload,
  });
}

// ============================================================
// API Functions — Exports
// ============================================================

/**
 * Create a data export (CSV/XLSX).
 *
 * @param payload - Export config
 * @returns Created export
 */
export async function createExport(payload: {
  entity: string;
  format: 'csv' | 'xlsx';
  type: string;
  options?: Record<string, unknown>;
}): Promise<SyntageExport> {
  return syntageRequest<SyntageExport>('/exports', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Get export status by ID.
 *
 * @param exportId - Export ID
 * @returns Export details with status and file ID
 */
export async function getExport(exportId: string): Promise<SyntageExport> {
  return syntageRequest<SyntageExport>(`/exports/${exportId}`);
}

// ============================================================
// API Functions — Files
// ============================================================

/**
 * Get file metadata.
 *
 * @param fileId - File ID
 * @returns File metadata (name, type, size)
 */
export async function getFile(fileId: string): Promise<SyntageFile> {
  return syntageRequest<SyntageFile>(`/files/${fileId}`);
}

/**
 * Download a file.
 *
 * Returns the file as a Blob for browser download or processing.
 *
 * @param fileId - File ID
 * @returns File blob
 */
export async function downloadFile(fileId: string): Promise<Blob> {
  const apiKey = import.meta.env.VITE_SYNTAGE_API_KEY ?? '';
  const baseUrl = import.meta.env.VITE_SYNTAGE_API_URL ?? '';
  const response = await fetch(`${baseUrl}/files/${fileId}/download`, {
    headers: {
      'X-API-Key': apiKey,
      'Accept': '*/*',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }
  return response.blob();
}
