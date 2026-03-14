/**
 * Syntage API — Grupo 6: Background Checks (BIL)
 *
 * Endpoints cubiertos:
 *   GET /entities/{entityId}/background-checks          — Lista por entidad
 *   GET /background-checks                              — Lista global
 *   GET /background-checks/{id}                         — Individual
 *   GET /background-checks/{id}/pdf                     — Descargar PDF
 *   GET /background-checks/{backgroundCheckId}/records  — Registros detallados
 *
 * Requiere: extracción previa tipo `bil`
 *
 * Engines que consumen estos datos:
 *   - Compliance (12%): antecedentes legales, juicios, procedimientos
 *   - GraphFraud: incidencias legales de accionistas/representantes
 *   - Stability (6%): riesgo legal de la empresa
 *
 * @see docs/SYNTAGE_API_INTEGRATION_MAP.md — Grupo 6
 */

import {
  syntageRequest,
  fetchAllPages,
  entityPath,
  type HydraCollection,
} from './syntageClient';

// ============================================================
// Types
// ============================================================

/**
 * Background check (investigación legal BIL) from Syntage API.
 */
export interface SyntageBackgroundCheck {
  '@id'?: string;
  id: string;
  /** Subject name */
  subjectName: string;
  /** Subject type: company, person */
  subjectType: 'company' | 'person';
  /** Check status: pending, completed, failed */
  status: string;
  /** Date the check was completed */
  completedAt: string | null;
  /** Summary of findings */
  summary: string | null;
  /** Number of records found */
  recordCount: number;
  /** Associated PDF file ID */
  pdfFileId: string | null;
  entity: string; // IRI reference
}

/**
 * Individual record from a background check.
 * Each record represents a legal finding (lawsuit, lien, etc.).
 */
export interface SyntageBackgroundCheckRecord {
  '@id'?: string;
  id: string;
  /** Record type: lawsuit, lien, bankruptcy, criminal, regulatory */
  type: string;
  /** Source of the record (court, registry, etc.) */
  source: string;
  description: string;
  /** Date of the finding */
  date: string | null;
  /** Severity: info, warning, critical */
  severity: 'info' | 'warning' | 'critical';
  /** Additional details */
  details: Record<string, unknown>;
}

// ============================================================
// API Functions
// ============================================================

/**
 * Get background checks for the entity.
 *
 * @param entityId - Override entity ID
 * @returns Hydra collection of background checks
 */
export async function getBackgroundChecks(
  entityId?: string,
): Promise<HydraCollection<SyntageBackgroundCheck>> {
  const path = entityPath('background-checks', entityId);
  return syntageRequest<HydraCollection<SyntageBackgroundCheck>>(path);
}

/**
 * Get all background checks for the entity (auto-paginates).
 *
 * @param entityId - Override entity ID
 * @returns Array of all background checks
 */
export async function getAllBackgroundChecks(
  entityId?: string,
): Promise<SyntageBackgroundCheck[]> {
  const path = entityPath('background-checks', entityId);
  return fetchAllPages<SyntageBackgroundCheck>(path);
}

/**
 * Get all background checks globally (not entity-scoped).
 *
 * @returns Hydra collection of all background checks
 */
export async function getGlobalBackgroundChecks(): Promise<
  HydraCollection<SyntageBackgroundCheck>
> {
  return syntageRequest<HydraCollection<SyntageBackgroundCheck>>(
    '/background-checks',
  );
}

/**
 * Get a single background check by ID.
 *
 * @param checkId - Background check ID
 * @returns Background check details
 */
export async function getBackgroundCheck(
  checkId: string,
): Promise<SyntageBackgroundCheck> {
  return syntageRequest<SyntageBackgroundCheck>(
    `/background-checks/${checkId}`,
  );
}

/**
 * Get the PDF URL for a background check.
 *
 * Returns the raw PDF response. Use with appropriate handling
 * (e.g. download or display in iframe).
 *
 * @param checkId - Background check ID
 * @returns PDF blob URL or redirect
 */
export async function getBackgroundCheckPdf(
  checkId: string,
): Promise<Blob> {
  const url = `/background-checks/${checkId}/pdf`;
  // Special handling: PDF returns binary, not JSON
  const apiKey = import.meta.env.VITE_SYNTAGE_API_KEY ?? '';
  const baseUrl = import.meta.env.VITE_SYNTAGE_API_URL ?? '';
  const response = await fetch(`${baseUrl}${url}`, {
    headers: {
      'X-API-Key': apiKey,
      'Accept': 'application/pdf',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status}`);
  }
  return response.blob();
}

/**
 * Get detailed records from a background check.
 *
 * Each record represents a specific legal finding
 * (lawsuit, lien, bankruptcy, criminal record, etc.).
 *
 * @param checkId - Background check ID
 * @returns Hydra collection of records
 */
export async function getBackgroundCheckRecords(
  checkId: string,
): Promise<HydraCollection<SyntageBackgroundCheckRecord>> {
  return syntageRequest<HydraCollection<SyntageBackgroundCheckRecord>>(
    `/background-checks/${checkId}/records`,
  );
}
