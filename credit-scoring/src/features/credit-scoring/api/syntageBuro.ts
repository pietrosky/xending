/**
 * Syntage API — Grupo 3: Buró de Crédito
 *
 * Endpoints cubiertos:
 *   GET  /entities/{entityId}/datasources/mx/buro-de-credito/reports        — Reportes Buró completos
 *   GET  /datasources/mx/buro-de-credito/reports/{id}                       — Reporte individual
 *   GET  /entities/{entityId}/datasources/mx/buro-de-credito/authorizations — Autorizaciones Buró
 *   POST /entities/{entityId}/datasources/mx/buro-de-credito/authorizations — Crear autorización
 *
 * Engines que consumen estos datos:
 *   - Buró (10%): Score PyME, créditos activos/liquidados, historial de pagos, atrasos, rotación de deuda
 *   - Network (8%): instituciones financieras con las que tiene relación
 *   - Credit Limit: deuda actual para calcular capacidad de endeudamiento
 *   - Orquestador: verificar autorización antes de solicitar extracción
 *
 * Requiere: extracción previa tipo `buro_de_credito_report`
 *
 * @see docs/SYNTAGE_API_INTEGRATION_MAP.md — Grupo 3
 */

import {
  syntageRequest,
  fetchAllPages,
  entityPath,
  type HydraCollection,
  type ScorePyME,
  type CreditoActivo,
  type CreditoLiquidado,
  type ConsultasBuro,
  type CalificacionMensual,
  type HawkResult,
} from './syntageClient';

// ============================================================
// Types — Buro Report (API response)
// ============================================================

/**
 * Buró de Crédito report as returned by Syntage API.
 *
 * Contains the full credit bureau report including score,
 * active/liquidated credits, consultations, portfolio rating,
 * and Hawk compliance checks.
 */
export interface SyntageBuroReport {
  '@id'?: string;
  id: string;
  /** PyME score (0-999) */
  score: number;
  /** Score rating label from Buró */
  scoreRating: string;
  /** Reasons/causes for the score */
  scoreCauses: string[];
  /** Date the report was consulted */
  consultedAt: string;
  /** Active credits (open, with outstanding balance) */
  activeCredits: SyntageBuroCredit[];
  /** Liquidated credits (closed) */
  liquidatedCredits: SyntageBuroLiquidatedCredit[];
  /** Bureau consultation history */
  consultations: SyntageBuroConsultation[];
  /** Monthly portfolio rating (calificación de cartera) */
  portfolioRating: SyntageBuroPortfolioRating[];
  /** Hawk compliance check results */
  hawkChecks: SyntageBuroHawkCheck[];
  /** Report status */
  status: string;
  entity: string; // IRI reference
}

/**
 * Active credit from Buró report.
 */
export interface SyntageBuroCredit {
  institution: string;
  creditType: string;
  currency: string;
  originalAmount: number;
  currentBalance: number;
  termMonths: number;
  delayDays: number;
  /** Payment history string (e.g. "VVVVVVVVVVVV" = all current) */
  paymentHistory: string;
  openedAt: string;
  lastPaymentAt: string | null;
}

/**
 * Liquidated credit from Buró report.
 */
export interface SyntageBuroLiquidatedCredit {
  institution: string;
  creditType: string;
  originalAmount: number;
  closedAt: string;
  /** Liquidation type: normal, quita, dacion, quebranto */
  liquidationType: string;
}

/**
 * Bureau consultation record.
 */
export interface SyntageBuroConsultation {
  date: string;
  institution: string;
  consultationType: string;
}

/**
 * Monthly portfolio rating entry.
 */
export interface SyntageBuroPortfolioRating {
  period: string;
  current: number;
  pastDue1to29: number;
  pastDue30to59: number;
  pastDue60to89: number;
  pastDue90plus: number;
}

/**
 * Hawk compliance check result.
 */
export interface SyntageBuroHawkCheck {
  checkType: string;
  matchFound: boolean;
  severity: 'info' | 'warning' | 'critical';
  details: Record<string, unknown>;
}

// ============================================================
// Types — Buro Authorization
// ============================================================

/**
 * Buró authorization record.
 * Must exist before a buro_de_credito_report extraction can run.
 */
export interface SyntageBuroAuthorization {
  '@id'?: string;
  id: string;
  status: 'pending' | 'active' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string | null;
  entity: string; // IRI reference
}

/**
 * Payload to create a new Buró authorization.
 */
export interface CreateBuroAuthorizationPayload {
  /** Authorization type (e.g. 'consultation') */
  type?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================
// API Functions — Buro Reports
// ============================================================

/**
 * Get all Buró de Crédito reports for the entity.
 *
 * Returns the full credit bureau reports including score,
 * credits, consultations, and Hawk checks.
 *
 * Used by:
 * - Buró engine (10%): primary data source for credit analysis
 * - Network engine: financial institution relationships
 * - Credit Limit engine: current debt for capacity calculation
 *
 * @param entityId - Override entity ID
 * @returns Hydra collection of Buró reports
 *
 * @example
 * const reports = await getBuroReports();
 * const latest = reports['hydra:member'][0];
 * console.log(latest.score); // 720
 */
export async function getBuroReports(
  entityId?: string,
): Promise<HydraCollection<SyntageBuroReport>> {
  const path = entityPath(
    'datasources/mx/buro-de-credito/reports',
    entityId,
  );
  return syntageRequest<HydraCollection<SyntageBuroReport>>(path);
}

/**
 * Get all Buró reports (auto-paginates).
 *
 * @param entityId - Override entity ID
 * @returns Array of all Buró reports
 */
export async function getAllBuroReports(
  entityId?: string,
): Promise<SyntageBuroReport[]> {
  const path = entityPath(
    'datasources/mx/buro-de-credito/reports',
    entityId,
  );
  return fetchAllPages<SyntageBuroReport>(path);
}

/**
 * Get a single Buró report by ID.
 *
 * @param reportId - Report ID
 * @returns Full Buró report
 */
export async function getBuroReport(
  reportId: string,
): Promise<SyntageBuroReport> {
  return syntageRequest<SyntageBuroReport>(
    `/datasources/mx/buro-de-credito/reports/${reportId}`,
  );
}

// ============================================================
// API Functions — Buro Authorizations
// ============================================================

/**
 * Get Buró authorizations for the entity.
 *
 * Used by the orchestrator to verify an active authorization
 * exists before requesting a buro_de_credito_report extraction.
 *
 * @param entityId - Override entity ID
 * @returns Hydra collection of authorizations
 */
export async function getBuroAuthorizations(
  entityId?: string,
): Promise<HydraCollection<SyntageBuroAuthorization>> {
  const path = entityPath(
    'datasources/mx/buro-de-credito/authorizations',
    entityId,
  );
  return syntageRequest<HydraCollection<SyntageBuroAuthorization>>(path);
}

/**
 * Create a new Buró authorization for the entity.
 *
 * Must be created before a buro_de_credito_report extraction
 * can be initiated. The authorization represents the borrower's
 * consent to query their credit bureau data.
 *
 * @param payload - Authorization details
 * @param entityId - Override entity ID
 * @returns Created authorization
 *
 * @example
 * const auth = await createBuroAuthorization();
 * // Now can create extraction type 'buro_de_credito_report'
 */
export async function createBuroAuthorization(
  payload: CreateBuroAuthorizationPayload = {},
  entityId?: string,
): Promise<SyntageBuroAuthorization> {
  const path = entityPath(
    'datasources/mx/buro-de-credito/authorizations',
    entityId,
  );
  return syntageRequest<SyntageBuroAuthorization>(path, {
    method: 'POST',
    body: payload,
  });
}

// ============================================================
// Transformers: SyntageBuroReport → Legacy types
// ============================================================

/**
 * Transform a Syntage Buró report to the internal ScorePyME format.
 *
 * @param report - Raw Syntage Buró report
 * @returns ScorePyME in internal format
 */
export function toScorePyME(report: SyntageBuroReport): ScorePyME {
  return {
    score: report.score,
    califica_rating: report.scoreRating,
    causas: report.scoreCauses,
    fecha_consulta: report.consultedAt,
    raw: {
      syntage_report_id: report.id,
      status: report.status,
    },
  };
}

/**
 * Transform Syntage active credits to internal CreditoActivo format.
 *
 * @param credits - Active credits from Buró report
 * @returns Array of CreditoActivo in internal format
 */
export function toCreditosActivos(
  credits: SyntageBuroCredit[],
): CreditoActivo[] {
  return credits.map((c) => ({
    institucion: c.institution,
    tipo_credito: c.creditType,
    moneda: c.currency,
    monto_original: c.originalAmount,
    monto_vigente: c.currentBalance,
    plazo_meses: c.termMonths,
    atraso_dias: c.delayDays,
    historico_pagos: c.paymentHistory,
    raw: {
      opened_at: c.openedAt,
      last_payment_at: c.lastPaymentAt,
    },
  }));
}

/**
 * Transform Syntage liquidated credits to internal CreditoLiquidado format.
 *
 * @param credits - Liquidated credits from Buró report
 * @returns Array of CreditoLiquidado in internal format
 */
export function toCreditosLiquidados(
  credits: SyntageBuroLiquidatedCredit[],
): CreditoLiquidado[] {
  return credits.map((c) => ({
    institucion: c.institution,
    tipo_credito: c.creditType,
    monto_original: c.originalAmount,
    fecha_liquidacion: c.closedAt,
    tipo_liquidacion: c.liquidationType,
    raw: {},
  }));
}

/**
 * Transform Syntage consultation history to internal ConsultasBuro format.
 *
 * Aggregates consultations into time buckets (3m, 12m, 24m, 24m+)
 * as expected by the Buró engine.
 *
 * @param consultations - Consultation records from Buró report
 * @returns ConsultasBuro in internal format
 */
export function toConsultasBuro(
  consultations: SyntageBuroConsultation[],
): ConsultasBuro {
  const now = new Date();
  const m3 = new Date(now);
  m3.setMonth(m3.getMonth() - 3);
  const m12 = new Date(now);
  m12.setMonth(m12.getMonth() - 12);
  const m24 = new Date(now);
  m24.setMonth(m24.getMonth() - 24);

  let last3 = 0;
  let last12 = 0;
  let last24 = 0;
  let older = 0;

  for (const c of consultations) {
    const d = new Date(c.date);
    if (d >= m3) last3++;
    if (d >= m12) last12++;
    if (d >= m24) last24++;
    if (d < m24) older++;
  }

  return {
    ultimos_3_meses: last3,
    ultimos_12_meses: last12,
    ultimos_24_meses: last24,
    mas_24_meses: older,
    detalle: consultations.map((c) => ({
      fecha: c.date,
      institucion: c.institution,
      tipo: c.consultationType,
    })),
    raw: {},
  };
}

/**
 * Transform Syntage portfolio ratings to internal CalificacionMensual format.
 *
 * @param ratings - Monthly portfolio ratings from Buró report
 * @returns Array of CalificacionMensual in internal format
 */
export function toCalificacionesCartera(
  ratings: SyntageBuroPortfolioRating[],
): CalificacionMensual[] {
  return ratings.map((r) => ({
    periodo: r.period,
    vigente: r.current,
    vencido_1_29: r.pastDue1to29,
    vencido_30_59: r.pastDue30to59,
    vencido_60_89: r.pastDue60to89,
    vencido_90_mas: r.pastDue90plus,
    raw: {},
  }));
}

/**
 * Transform Syntage Hawk checks to internal HawkResult format.
 *
 * @param checks - Hawk check results from Buró report
 * @returns Array of HawkResult in internal format
 */
export function toHawkResults(
  checks: SyntageBuroHawkCheck[],
): HawkResult[] {
  return checks.map((c) => ({
    check_type: c.checkType,
    match_found: c.matchFound,
    severity: c.severity,
    details: c.details,
  }));
}

/**
 * Fetch the latest Buró report and transform all data to legacy formats.
 *
 * Convenience function that returns all the data the Buró engine needs
 * in a single call: ScorePyME, CreditoActivo[], CreditoLiquidado[],
 * ConsultasBuro, CalificacionMensual[], HawkResult[].
 *
 * @param entityId - Override entity ID
 * @returns Object with all transformed Buró data, or null if no reports
 *
 * @example
 * const buroData = await fetchBuroData();
 * if (buroData) {
 *   const result = await runBuroEngine({
 *     syntage_data: buroData,
 *     ...otherInput,
 *   });
 * }
 */
export async function fetchBuroData(
  entityId?: string,
): Promise<{
  score_pyme: ScorePyME;
  creditos_activos: CreditoActivo[];
  creditos_liquidados: CreditoLiquidado[];
  consultas_buro: ConsultasBuro;
  calificacion_cartera: CalificacionMensual[];
  hawk_checks: HawkResult[];
} | null> {
  const reports = await getBuroReports(entityId);
  const members = reports['hydra:member'];

  if (!members || members.length === 0) return null;

  // Use the most recent report
  const latest = members[0]!;

  return {
    score_pyme: toScorePyME(latest),
    creditos_activos: toCreditosActivos(latest.activeCredits),
    creditos_liquidados: toCreditosLiquidados(latest.liquidatedCredits),
    consultas_buro: toConsultasBuro(latest.consultations),
    calificacion_cartera: toCalificacionesCartera(latest.portfolioRating),
    hawk_checks: toHawkResults(latest.hawkChecks),
  };
}
