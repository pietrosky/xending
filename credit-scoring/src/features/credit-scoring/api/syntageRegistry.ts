/**
 * Syntage API — Grupo 4: Registro Público y Garantías
 *
 * Endpoints cubiertos:
 *   GET /entities/{entityId}/datasources/rpc/entidades     — Registro Público de Comercio
 *   GET /datasources/rpc/entidades/{id}                    — RPC individual
 *   GET /entities/{entityId}/insights/rpc-shareholders     — Accionistas (insight)
 *   GET /entities/{entityId}/datasources/rug/garantias     — Garantías RUG
 *   GET /datasources/rug/garantias/{id}                    — Garantía individual
 *   GET /entities/{entityId}/datasources/rug/operaciones   — Operaciones RUG
 *   GET /datasources/rug/operaciones/{id}                  — Operación individual
 *
 * Engines que consumen estos datos:
 *   - Stability (6%): antigüedad real, tipo de sociedad, estructura accionaria
 *   - Compliance (12%): existencia legal, verificar accionistas
 *   - GraphFraud: empresas fachada (constitución reciente), nominees, accionistas en listas negras
 *   - Guarantee (4%): garantías existentes, cobertura, vigencia, historial de operaciones
 *   - Credit Limit: garantías disponibles para respaldar nuevo crédito
 *
 * @see docs/SYNTAGE_API_INTEGRATION_MAP.md — Grupo 4
 */

import {
  syntageRequest,
  fetchAllPages,
  entityPath,
  type HydraCollection,
} from './syntageClient';

// ============================================================
// Types — RPC (Registro Público de Comercio)
// ============================================================

/**
 * RPC entity record from Syntage API.
 *
 * Contains data from the Registro Público de Comercio:
 * incorporation details, legal name, FME, duration, address, registered acts.
 */
export interface SyntageRpcEntity {
  '@id'?: string;
  id: string;
  legalName: string;
  /** Folio Mercantil Electrónico */
  fme: string | null;
  /** Entity type: SA, SAPI, SC, SRL, etc. */
  entityType: string;
  /** Duration of the company (years, or 'indefinida') */
  duration: string | null;
  /** Date of incorporation */
  incorporatedAt: string;
  /** Registered address from RPC */
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  /** Registered acts (constitución, reformas, poderes, etc.) */
  registeredActs: SyntageRpcAct[];
  status: string;
  entity: string; // IRI reference
}

/**
 * A registered act in the Registro Público de Comercio.
 */
export interface SyntageRpcAct {
  type: string;
  description: string;
  registeredAt: string;
  notary: string | null;
  instrumentNumber: string | null;
}

// ============================================================
// Types — RPC Shareholders (Insight)
// ============================================================

/**
 * Shareholder from the RPC shareholders insight.
 *
 * Note: Only reflects initial shareholders from incorporation.
 * Does not reflect subsequent ownership changes.
 */
export interface SyntageRpcShareholder {
  name: string;
  rfc: string | null;
  curp: string | null;
  nationality: string;
  shares: number;
  percentage: number;
}

/**
 * RPC shareholders insight response.
 */
export interface SyntageRpcShareholdersInsight {
  '@id'?: string;
  shareholders: SyntageRpcShareholder[];
  totalShares: number;
  entity: string; // IRI reference
}

// ============================================================
// Types — RUG Garantías
// ============================================================

/**
 * RUG guarantee record from Syntage API.
 *
 * Contains registered guarantees (prendas, hipotecas, fideicomisos, etc.)
 * from the Registro Único de Garantías Mobiliarias.
 */
export interface SyntageRugGuarantee {
  '@id'?: string;
  id: string;
  /** Guarantee type: prenda, hipoteca, fideicomiso, etc. */
  type: string;
  description: string;
  /** Creditor (acreedor) */
  creditor: {
    name: string;
    rfc: string | null;
  };
  /** Debtor (deudor) */
  debtor: {
    name: string;
    rfc: string | null;
  };
  amount: number | null;
  currency: string;
  /** Guarantee validity dates */
  validFrom: string;
  validUntil: string | null;
  status: string;
  entity: string; // IRI reference
}

// ============================================================
// Types — RUG Operaciones
// ============================================================

/**
 * RUG operation record from Syntage API.
 *
 * Tracks operations on guarantees: inscriptions, modifications,
 * cancellations, renewals.
 */
export interface SyntageRugOperation {
  '@id'?: string;
  id: string;
  /** Operation type: inscripcion, modificacion, cancelacion, renovacion */
  operationType: string;
  description: string;
  /** Related guarantee ID */
  guarantee: string | null; // IRI reference
  operationDate: string;
  status: string;
  entity: string; // IRI reference
}

// ============================================================
// API Functions — RPC Entidades
// ============================================================

/**
 * Get RPC entity records for the entity.
 *
 * Used by:
 * - Stability engine: real incorporation date, entity type
 * - Compliance engine: verify legal existence
 * - GraphFraud engine: detect shell companies (recent incorporation)
 *
 * @param entityId - Override entity ID
 * @returns Hydra collection of RPC entity records
 *
 * @example
 * const rpc = await getRpcEntities();
 * const record = rpc['hydra:member'][0];
 * console.log(record.incorporatedAt); // '2015-03-20'
 */
export async function getRpcEntities(
  entityId?: string,
): Promise<HydraCollection<SyntageRpcEntity>> {
  const path = entityPath('datasources/rpc/entidades', entityId);
  return syntageRequest<HydraCollection<SyntageRpcEntity>>(path);
}

/**
 * Get all RPC entity records (auto-paginates).
 *
 * @param entityId - Override entity ID
 * @returns Array of all RPC entity records
 */
export async function getAllRpcEntities(
  entityId?: string,
): Promise<SyntageRpcEntity[]> {
  const path = entityPath('datasources/rpc/entidades', entityId);
  return fetchAllPages<SyntageRpcEntity>(path);
}

/**
 * Get a single RPC entity record by ID.
 *
 * @param rpcId - RPC record ID
 * @returns RPC entity details
 */
export async function getRpcEntity(
  rpcId: string,
): Promise<SyntageRpcEntity> {
  return syntageRequest<SyntageRpcEntity>(
    `/datasources/rpc/entidades/${rpcId}`,
  );
}

// ============================================================
// API Functions — RPC Shareholders (Insight)
// ============================================================

/**
 * Get RPC shareholders insight for the entity.
 *
 * Returns the initial shareholder structure from incorporation.
 * Limitation: only reflects initial shareholders, not subsequent changes.
 *
 * Used by:
 * - Stability engine: ownership concentration, control structure
 * - GraphFraud engine: cross-reference shareholders with blacklists, detect nominees
 * - Compliance engine: verify shareholders vs Scory/documents
 *
 * @param entityId - Override entity ID
 * @returns Shareholders insight with list of shareholders and total shares
 *
 * @example
 * const shareholders = await getRpcShareholders();
 * const topHolder = shareholders.shareholders[0];
 * console.log(topHolder.percentage); // 51.0
 */
export async function getRpcShareholders(
  entityId?: string,
): Promise<SyntageRpcShareholdersInsight> {
  const path = entityPath('insights/rpc-shareholders', entityId);
  return syntageRequest<SyntageRpcShareholdersInsight>(path);
}

// ============================================================
// API Functions — RUG Garantías
// ============================================================

/**
 * Get RUG guarantees for the entity.
 *
 * Used by:
 * - Guarantee engine (4%): existing guarantees, coverage, validity
 * - Credit Limit engine: available guarantees to back new credit
 *
 * @param entityId - Override entity ID
 * @returns Hydra collection of RUG guarantees
 *
 * @example
 * const guarantees = await getRugGuarantees();
 * for (const g of guarantees['hydra:member']) {
 *   console.log(g.type, g.amount, g.validUntil);
 * }
 */
export async function getRugGuarantees(
  entityId?: string,
): Promise<HydraCollection<SyntageRugGuarantee>> {
  const path = entityPath('datasources/rug/garantias', entityId);
  return syntageRequest<HydraCollection<SyntageRugGuarantee>>(path);
}

/**
 * Get all RUG guarantees (auto-paginates).
 *
 * @param entityId - Override entity ID
 * @returns Array of all RUG guarantees
 */
export async function getAllRugGuarantees(
  entityId?: string,
): Promise<SyntageRugGuarantee[]> {
  const path = entityPath('datasources/rug/garantias', entityId);
  return fetchAllPages<SyntageRugGuarantee>(path);
}

/**
 * Get a single RUG guarantee by ID.
 *
 * @param guaranteeId - Guarantee ID
 * @returns RUG guarantee details
 */
export async function getRugGuarantee(
  guaranteeId: string,
): Promise<SyntageRugGuarantee> {
  return syntageRequest<SyntageRugGuarantee>(
    `/datasources/rug/garantias/${guaranteeId}`,
  );
}

// ============================================================
// API Functions — RUG Operaciones
// ============================================================

/**
 * Get RUG operations for the entity.
 *
 * Tracks the history of guarantee operations: inscriptions,
 * modifications, cancellations, renewals.
 *
 * Used by:
 * - Guarantee engine (4%): guarantee operation history
 *
 * @param entityId - Override entity ID
 * @returns Hydra collection of RUG operations
 */
export async function getRugOperations(
  entityId?: string,
): Promise<HydraCollection<SyntageRugOperation>> {
  const path = entityPath('datasources/rug/operaciones', entityId);
  return syntageRequest<HydraCollection<SyntageRugOperation>>(path);
}

/**
 * Get all RUG operations (auto-paginates).
 *
 * @param entityId - Override entity ID
 * @returns Array of all RUG operations
 */
export async function getAllRugOperations(
  entityId?: string,
): Promise<SyntageRugOperation[]> {
  const path = entityPath('datasources/rug/operaciones', entityId);
  return fetchAllPages<SyntageRugOperation>(path);
}

/**
 * Get a single RUG operation by ID.
 *
 * @param operationId - Operation ID
 * @returns RUG operation details
 */
export async function getRugOperation(
  operationId: string,
): Promise<SyntageRugOperation> {
  return syntageRequest<SyntageRugOperation>(
    `/datasources/rug/operaciones/${operationId}`,
  );
}
