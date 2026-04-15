/**
 * Syntage API — Grupo 2: Datos Fiscales Procesados
 *
 * Endpoints cubiertos:
 *   GET /entities/{entityId}/tax-returns           — Declaraciones anuales/mensuales
 *   GET /tax-returns/{id}                          — Declaración individual
 *   GET /tax-returns/{id}/data                     — Datos extraídos (balance, estado de resultados)
 *   GET /entities/{entityId}/tax-status            — Constancia de situación fiscal
 *   GET /entities/{entityId}/tax-compliance-checks — Opinión de cumplimiento
 *   GET /entities/{entityId}/electronic-accounting-records — Balanza de comprobación
 *
 * Engines que consumen estos datos:
 *   - Financial (11%): balance general, estado de resultados, EBITDA, utilidad neta
 *   - Cashflow (7%): flujo de efectivo declarado
 *   - Employee (3%): número de empleados declarados en mensuales
 *   - Benchmark: comparar datos declarados vs facturados
 *   - Compliance (12%): opinión de cumplimiento, presentación a tiempo
 *   - Stability (6%): antigüedad de la empresa, cambios de domicilio
 *   - SAT/Facturación (14%): validar giro declarado vs actividad real
 *   - Working Capital (5%): CxC/CxP desde balanza de comprobación
 *
 * @see docs/SYNTAGE_API_INTEGRATION_MAP.md — Grupo 2
 */

import {
  syntageRequest,
  fetchAllPages,
  entityPath,
  type HydraCollection,
  type Declaracion,
} from './syntageClient';

// ============================================================
// Types — Tax Returns (Declaraciones)
// ============================================================

/**
 * Tax return as returned by Syntage API.
 *
 * Types: annual (declaración anual), monthly (declaración mensual)
 * Includes metadata about the filing: regime, fiscal year, dates, files.
 */
export interface SyntageTaxReturn {
  '@id'?: string;
  id: string;
  type: 'annual' | 'monthly';
  taxRegime: string;
  fiscalYear: number;
  /** Month (1-12) for monthly returns, null for annual */
  fiscalMonth: number | null;
  filedAt: string;
  /** Associated files (PDF, XLSX) */
  files: Array<{ id: string; type: string; name: string }>;
  status: string;
  entity: string; // IRI reference
}

/**
 * Extracted data from a tax return (GET /tax-returns/{id}/data).
 *
 * Contains structured financial data parsed from the PDF/XLSX:
 * balance sheet categories, income statement, employee count, etc.
 */
export interface SyntageTaxReturnData {
  '@id'?: string;
  id: string;
  taxReturn: string; // IRI reference to parent tax return
  fiscalYear: number;
  /** Balance sheet data — asset/liability/equity categories */
  balanceSheet: TaxReturnBalanceSheet | null;
  /** Income statement data — revenue/costs/expenses/profit */
  incomeStatement: TaxReturnIncomeStatement | null;
  /** Additional variables extracted from the return */
  variables: Record<string, number | string | null>;
}

/**
 * Balance sheet extracted from a tax return.
 * Structure follows SAT annual return format.
 */
export interface TaxReturnBalanceSheet {
  totalAssets: number;
  currentAssets: number;
  cash: number;
  accountsReceivable: number;
  inventory: number;
  fixedAssets: number;
  totalLiabilities: number;
  currentLiabilities: number;
  longTermDebt: number;
  equity: number;
  /** Raw category tree from Syntage (format 2014 or 2022) */
  categories?: Record<string, unknown>;
}

/**
 * Income statement extracted from a tax return.
 * Structure follows SAT annual return format.
 */
export interface TaxReturnIncomeStatement {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  interestExpense: number;
  netIncome: number;
  depreciation: number;
  /** Calculated: operatingIncome + depreciation */
  ebitda: number;
  /** Number of employees declared */
  employeeCount: number | null;
  /** Total payroll declared */
  totalPayroll: number | null;
  /** Raw category tree from Syntage */
  categories?: Record<string, unknown>;
}

// ============================================================
// Types — Tax Status (Constancia de Situación Fiscal)
// ============================================================

/**
 * Tax status (constancia de situación fiscal) from Syntage API.
 *
 * Contains the entity's current fiscal registration info:
 * RFC, legal name, regime, economic activities, address, status.
 */
export interface SyntageTaxStatus {
  '@id'?: string;
  id: string;
  rfc: string;
  legalName: string;
  /** Tax regime(s) the entity is registered under */
  taxRegimes: string[];
  /** SAT economic activity codes */
  economicActivities: Array<{
    code: string;
    description: string;
    percentage: number;
  }>;
  /** Current status: activo, suspendido, cancelado */
  status: string;
  /** Fiscal address */
  address: {
    street: string;
    exteriorNumber: string;
    interiorNumber: string | null;
    neighborhood: string;
    postalCode: string;
    municipality: string;
    state: string;
  };
  /** Date of last status change */
  lastStatusChangeAt: string | null;
  /** Date entity was registered with SAT */
  registeredAt: string;
  entity: string; // IRI reference
}

// ============================================================
// Types — Tax Compliance Checks (Opinión de Cumplimiento)
// ============================================================

/**
 * Tax compliance check (opinión de cumplimiento) from Syntage API.
 *
 * Result: positiva (good standing), negativa (non-compliant),
 * no_inscrito (not registered), en_proceso (pending).
 */
export interface SyntageTaxComplianceCheck {
  '@id'?: string;
  id: string;
  result: 'positiva' | 'negativa' | 'no_inscrito' | 'en_proceso';
  issuedAt: string;
  validUntil: string | null;
  entity: string; // IRI reference
}

// ============================================================
// Types — Electronic Accounting Records (Balanza de Comprobación)
// ============================================================

/**
 * Electronic accounting record from Syntage API.
 *
 * Types: trial_balance (balanza de comprobación),
 *        account_catalog (catálogo de cuentas)
 */
export interface SyntageElectronicAccountingRecord {
  '@id'?: string;
  id: string;
  type: 'trial_balance' | 'account_catalog';
  period: string;
  fiscalYear: number;
  fiscalMonth: number;
  /** Associated file for download */
  file: { id: string; type: string; name: string } | null;
  status: string;
  entity: string; // IRI reference
}

// ============================================================
// Filter types
// ============================================================

/**
 * Filters for the tax-returns endpoint.
 * Maps to query parameters on GET /entities/{entityId}/tax-returns
 */
export interface TaxReturnFilters {
  /** Return type: annual or monthly */
  type?: 'annual' | 'monthly';
  /** Filed after this date (ISO 8601) */
  filedAfter?: string;
  /** Filed before this date (ISO 8601) */
  filedBefore?: string;
  /** Tax regime filter */
  taxRegime?: string;
  /** Fiscal year filter */
  fiscalYear?: number;
  /** Page number (1-based) */
  page?: number;
  /** Items per page (max 1000) */
  itemsPerPage?: number;
}

/**
 * Filters for electronic accounting records endpoint.
 */
export interface ElectronicAccountingFilters {
  type?: 'trial_balance' | 'account_catalog';
  fiscalYear?: number;
  fiscalMonth?: number;
  page?: number;
  itemsPerPage?: number;
}

// ============================================================
// Param builders
// ============================================================

/**
 * Build query params from TaxReturnFilters.
 */
function buildTaxReturnParams(
  filters: TaxReturnFilters,
): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (filters.type) params['type'] = filters.type;
  if (filters.filedAfter) params['filedAt[after]'] = filters.filedAfter;
  if (filters.filedBefore) params['filedAt[before]'] = filters.filedBefore;
  if (filters.taxRegime) params['taxRegime'] = filters.taxRegime;
  if (filters.fiscalYear) params['fiscalYear'] = filters.fiscalYear;
  if (filters.page) params['page'] = filters.page;
  if (filters.itemsPerPage) params['itemsPerPage'] = filters.itemsPerPage;

  return params;
}

/**
 * Build query params from ElectronicAccountingFilters.
 */
function buildElectronicAccountingParams(
  filters: ElectronicAccountingFilters,
): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {};

  if (filters.type) params['type'] = filters.type;
  if (filters.fiscalYear) params['fiscalYear'] = filters.fiscalYear;
  if (filters.fiscalMonth) params['fiscalMonth'] = filters.fiscalMonth;
  if (filters.page) params['page'] = filters.page;
  if (filters.itemsPerPage) params['itemsPerPage'] = filters.itemsPerPage;

  return params;
}

// ============================================================
// API Functions — Tax Returns (Declaraciones)
// ============================================================

/**
 * Get a single page of tax returns.
 *
 * @param filters - Query filters (type, filedAt, taxRegime, fiscalYear)
 * @param entityId - Override entity ID (defaults to env)
 * @returns Hydra collection with tax returns and pagination info
 *
 * @example
 * // Get annual returns for last 3 years
 * const result = await getTaxReturns({
 *   type: 'annual',
 *   filedAfter: '2022-01-01',
 * });
 */
export async function getTaxReturns(
  filters: TaxReturnFilters = {},
  entityId?: string,
): Promise<HydraCollection<SyntageTaxReturn>> {
  const path = entityPath('tax-returns', entityId);
  const params = buildTaxReturnParams(filters);
  return syntageRequest<HydraCollection<SyntageTaxReturn>>(path, { params });
}

/**
 * Get ALL tax returns matching filters (auto-paginates).
 *
 * @param filters - Query filters
 * @param entityId - Override entity ID
 * @returns Array of all matching tax returns
 */
export async function getAllTaxReturns(
  filters: TaxReturnFilters = {},
  entityId?: string,
): Promise<SyntageTaxReturn[]> {
  const path = entityPath('tax-returns', entityId);
  const params = buildTaxReturnParams(filters);
  return fetchAllPages<SyntageTaxReturn>(path, params);
}

/**
 * Get a single tax return by ID.
 *
 * @param taxReturnId - Tax return ID
 * @returns Tax return details
 */
export async function getTaxReturn(
  taxReturnId: string,
): Promise<SyntageTaxReturn> {
  return syntageRequest<SyntageTaxReturn>(`/tax-returns/${taxReturnId}`);
}

/**
 * Get extracted data from a tax return.
 *
 * This is the most valuable endpoint for financial analysis:
 * contains parsed balance sheet, income statement, and variables
 * extracted from the PDF/XLSX of the declaration.
 *
 * Used by:
 * - Financial engine: balance, income statement, EBITDA
 * - Cashflow engine: operating cash flow base
 * - Employee engine: declared employee count
 * - Benchmark engine: compare declared vs invoiced
 *
 * @param taxReturnId - Tax return ID
 * @returns Extracted financial data
 *
 * @example
 * // Get financial data from annual return
 * const returns = await getAllTaxReturns({ type: 'annual' });
 * const latestReturn = returns[0];
 * const data = await getTaxReturnData(latestReturn.id);
 * // data.balanceSheet, data.incomeStatement
 */
export async function getTaxReturnData(
  taxReturnId: string,
): Promise<SyntageTaxReturnData> {
  return syntageRequest<SyntageTaxReturnData>(
    `/tax-returns/${taxReturnId}/data`,
  );
}

// ============================================================
// API Functions — Tax Status (Constancia de Situación Fiscal)
// ============================================================

/**
 * Get tax status records for the entity.
 *
 * Used by:
 * - Compliance engine: verify active status, correct regime
 * - Stability engine: entity age, address changes
 * - SAT engine: validate declared activity vs real invoicing
 *
 * @param entityId - Override entity ID
 * @returns Hydra collection of tax status records
 *
 * @example
 * const statuses = await getTaxStatuses();
 * const latest = statuses['hydra:member'][0];
 * console.log(latest.status); // 'activo'
 */
export async function getTaxStatuses(
  entityId?: string,
): Promise<HydraCollection<SyntageTaxStatus>> {
  const path = entityPath('tax-status', entityId);
  return syntageRequest<HydraCollection<SyntageTaxStatus>>(path);
}

/**
 * Get a single tax status record by ID.
 *
 * @param taxStatusId - Tax status record ID
 * @returns Tax status details
 */
export async function getTaxStatus(
  taxStatusId: string,
): Promise<SyntageTaxStatus> {
  return syntageRequest<SyntageTaxStatus>(`/tax-status/${taxStatusId}`);
}

// ============================================================
// API Functions — Tax Compliance Checks (Opinión de Cumplimiento)
// ============================================================

/**
 * Get tax compliance checks for the entity.
 *
 * The compliance check result is a critical gate in the scoring system:
 * - positiva: entity is in good standing with SAT
 * - negativa: entity has tax compliance issues (high risk flag)
 * - no_inscrito: entity not registered (blocker)
 *
 * Used by:
 * - Compliance engine (12%): mandatory gate — negativa = high risk
 * - SAT engine (14%): fiscal risk indicator
 *
 * @param entityId - Override entity ID
 * @returns Hydra collection of compliance check records
 *
 * @example
 * const checks = await getTaxComplianceChecks();
 * const latest = checks['hydra:member'][0];
 * if (latest.result === 'negativa') {
 *   // Flag as high risk
 * }
 */
export async function getTaxComplianceChecks(
  entityId?: string,
): Promise<HydraCollection<SyntageTaxComplianceCheck>> {
  const path = entityPath('tax-compliance-checks', entityId);
  return syntageRequest<HydraCollection<SyntageTaxComplianceCheck>>(path);
}

/**
 * Get a single tax compliance check by ID.
 *
 * @param checkId - Compliance check ID
 * @returns Compliance check details
 */
export async function getTaxComplianceCheck(
  checkId: string,
): Promise<SyntageTaxComplianceCheck> {
  return syntageRequest<SyntageTaxComplianceCheck>(
    `/tax-compliance-checks/${checkId}`,
  );
}

// ============================================================
// API Functions — Electronic Accounting Records (Balanza)
// ============================================================

/**
 * Get electronic accounting records (balanza de comprobación).
 *
 * Used by:
 * - Financial engine: detailed monthly account analysis
 * - Working Capital engine: specific CxC/CxP accounts from balanza
 *
 * @param filters - Query filters (type, fiscalYear, fiscalMonth)
 * @param entityId - Override entity ID
 * @returns Hydra collection of accounting records
 */
export async function getElectronicAccountingRecords(
  filters: ElectronicAccountingFilters = {},
  entityId?: string,
): Promise<HydraCollection<SyntageElectronicAccountingRecord>> {
  const path = entityPath('electronic-accounting-records', entityId);
  const params = buildElectronicAccountingParams(filters);
  return syntageRequest<HydraCollection<SyntageElectronicAccountingRecord>>(
    path,
    { params },
  );
}

/**
 * Get ALL electronic accounting records (auto-paginates).
 *
 * @param filters - Query filters
 * @param entityId - Override entity ID
 * @returns Array of all matching records
 */
export async function getAllElectronicAccountingRecords(
  filters: ElectronicAccountingFilters = {},
  entityId?: string,
): Promise<SyntageElectronicAccountingRecord[]> {
  const path = entityPath('electronic-accounting-records', entityId);
  const params = buildElectronicAccountingParams(filters);
  return fetchAllPages<SyntageElectronicAccountingRecord>(path, params);
}

/**
 * Get a single electronic accounting record by ID.
 *
 * @param recordId - Record ID
 * @returns Accounting record details
 */
export async function getElectronicAccountingRecord(
  recordId: string,
): Promise<SyntageElectronicAccountingRecord> {
  return syntageRequest<SyntageElectronicAccountingRecord>(
    `/electronic-accounting-records/${recordId}`,
  );
}

// ============================================================
// Transformer: SyntageTaxReturn + Data → Declaracion (legacy)
// ============================================================

/**
 * Transform a Syntage tax return + its extracted data to the
 * internal Declaracion format used by existing engines.
 *
 * This mapper bridges the real API response to the legacy type
 * that satFacturacion and other engines already consume.
 *
 * @param taxReturn - Tax return metadata from API
 * @param data - Extracted financial data from /tax-returns/{id}/data
 * @returns Declaracion in internal format
 *
 * @example
 * const returns = await getAllTaxReturns({ type: 'annual' });
 * const declarations: Declaracion[] = [];
 * for (const tr of returns) {
 *   const data = await getTaxReturnData(tr.id);
 *   declarations.push(toDeclaracion(tr, data));
 * }
 */
export function toDeclaracion(
  taxReturn: SyntageTaxReturn,
  data: SyntageTaxReturnData,
): Declaracion {
  const income = data.incomeStatement;
  return {
    ejercicio: taxReturn.fiscalYear,
    tipo: taxReturn.type === 'annual' ? 'anual' : 'mensual',
    fecha_presentacion: taxReturn.filedAt,
    ingresos_totales: income?.revenue ?? 0,
    deducciones: income
      ? (income.costOfGoods + income.operatingExpenses)
      : 0,
    resultado_fiscal: income?.netIncome ?? 0,
    isr_causado: typeof data.variables?.['isr_causado'] === 'number'
      ? data.variables['isr_causado']
      : 0,
    raw: {
      syntage_tax_return_id: taxReturn.id,
      tax_regime: taxReturn.taxRegime,
      fiscal_month: taxReturn.fiscalMonth,
      balance_sheet: data.balanceSheet,
      income_statement: data.incomeStatement,
      variables: data.variables,
      files: taxReturn.files,
    },
  };
}

/**
 * Fetch all annual tax returns and transform to legacy Declaracion format.
 *
 * Convenience function for engines that need Declaraciones.
 * Fetches returns + their extracted data and transforms in batch.
 *
 * @param entityId - Override entity ID
 * @returns Array of Declaraciones in internal format
 *
 * @example
 * const declaraciones = await fetchDeclaraciones();
 * // Use in satFacturacion engine for declared vs invoiced comparison
 */
export async function fetchDeclaraciones(
  entityId?: string,
): Promise<Declaracion[]> {
  const returns = await getAllTaxReturns({ type: 'annual' }, entityId);
  const declaraciones: Declaracion[] = [];

  for (const tr of returns) {
    try {
      const data = await getTaxReturnData(tr.id);
      declaraciones.push(toDeclaracion(tr, data));
    } catch {
      // Skip returns without extractable data (e.g. pending extraction)
      continue;
    }
  }

  return declaraciones;
}
