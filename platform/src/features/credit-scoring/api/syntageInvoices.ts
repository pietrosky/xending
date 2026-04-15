/**
 * Syntage API — Grupo 1: Datos Crudos SAT
 *
 * Endpoints cubiertos:
 *   GET /entities/{entityId}/invoices          — CFDIs (facturas)
 *   GET /entities/{entityId}/invoices/line-items — Conceptos de factura
 *   GET /entities/{entityId}/invoices/payments  — Pagos de facturas PPD
 *   GET /invoices/batch-payments               — Pagos agrupados
 *   GET /invoices/credit-notes                 — Notas de credito
 *   GET /entities/{entityId}/tax-retentions    — Retenciones ISR/IVA
 *
 * Engines que consumen estos datos:
 *   - SAT/Facturacion (14%): revenue quality, payment behavior, cancellations
 *   - Network (8%): client/supplier concentration, blacklist counterparties
 *   - Cashflow (7%): payment flows, PUE vs PPD analysis
 *   - Employee (3%): nomina CFDIs for headcount
 *   - FX Risk: foreign currency invoices
 *   - GraphFraud: blacklisted counterparties, circular invoicing
 *   - Compliance (12%): cancellation rates, invoicing activity
 *
 * @see docs/SYNTAGE_API_INTEGRATION_MAP.md — Grupo 1
 */

import {
  syntageRequest,
  fetchAllPages,
  entityPath,
  type HydraCollection,
} from './syntageClient';

// ============================================================
// Types — Syntage Invoice (API response format)
// ============================================================

/**
 * Invoice as returned by Syntage API.
 *
 * Types: I=Ingreso, E=Egreso, P=Pago, N=Nomina, T=Traslado
 * Status: vigente, cancelado
 * PaymentMethod: PUE (pago en una sola exhibicion), PPD (pago en parcialidades)
 */
export interface SyntageInvoice {
  '@id'?: string;
  id: string;
  uuid: string;
  type: 'I' | 'E' | 'P' | 'N' | 'T';
  subtotal: number;
  total: number;
  currency: string;
  exchangeRate: number | null;
  paymentMethod: 'PUE' | 'PPD' | string;
  status: string;
  issuedAt: string;
  certifiedAt: string;
  cancelledAt: string | null;
  issuer: {
    rfc: string;
    name: string;
    taxRegime: string;
    blacklistStatus: string | null;
  };
  receiver: {
    rfc: string;
    name: string;
    blacklistStatus: string | null;
  };
  usoCfdi: string;
}

/**
 * Line item (concepto) from a CFDI.
 * Endpoint: GET /entities/{entityId}/invoices/line-items
 */
export interface SyntageLineItem {
  '@id'?: string;
  id: string;
  description: string;
  quantity: number;
  unitValue: number;
  amount: number;
  productServiceKey: string;
  unit: string;
  invoice?: string; // IRI reference to parent invoice
}

/**
 * Payment record for PPD invoices.
 * Endpoint: GET /entities/{entityId}/invoices/payments
 */
export interface SyntagePayment {
  '@id'?: string;
  id: string;
  amount: number;
  currency: string;
  exchangeRate: number | null;
  paidAt: string;
  paymentForm: string;
  relatedInvoice?: string; // IRI reference
}

/**
 * Batch payment (complemento de pago agrupado).
 * Endpoint: GET /invoices/batch-payments
 */
export interface SyntageBatchPayment {
  '@id'?: string;
  id: string;
  payments: SyntagePayment[];
  issuedAt: string;
}

/**
 * Credit note (nota de credito).
 * Endpoint: GET /invoices/credit-notes
 */
export interface SyntageCreditNote {
  '@id'?: string;
  id: string;
  uuid: string;
  total: number;
  currency: string;
  issuedAt: string;
  status: string;
  relatedInvoice?: string;
  issuer: { rfc: string; name: string };
  receiver: { rfc: string; name: string };
}

/**
 * Tax retention (retencion ISR/IVA).
 * Endpoint: GET /entities/{entityId}/tax-retentions
 */
export interface SyntageTaxRetention {
  '@id'?: string;
  id: string;
  uuid: string;
  type: string;
  totalAmount: number;
  retainedAmount: number;
  issuedAt: string;
  isIssuer: boolean;
  issuer: { rfc: string; name: string };
  receiver: { rfc: string; name: string };
}

// ============================================================
// Filter types
// ============================================================

/**
 * Filters for the invoices endpoint.
 * Maps to query parameters on GET /entities/{entityId}/invoices
 */
export interface InvoiceFilters {
  /** Invoice types: I=Ingreso, E=Egreso, P=Pago, N=Nomina, T=Traslado */
  type?: Array<'I' | 'E' | 'P' | 'N' | 'T'>;
  /** true = entity is issuer, false = entity is receiver */
  isIssuer?: boolean;
  /** Filter by issuer RFC */
  issuerRfc?: string;
  /** Filter by receiver RFC */
  receiverRfc?: string;
  /** Issued after this date (ISO 8601) */
  issuedAfter?: string;
  /** Issued before this date (ISO 8601) */
  issuedBefore?: string;
  /** Filter by currency (MXN, USD, EUR, etc.) */
  currency?: string;
  /** Filter by status (vigente, cancelado) */
  status?: string;
  /** Filter by payment method (PUE, PPD) */
  paymentMethod?: string;
  /** Filter by issuer blacklist status */
  issuerBlacklistStatus?: string;
  /** Filter by receiver blacklist status */
  receiverBlacklistStatus?: string;
  /** Page number (1-based) */
  page?: number;
  /** Items per page (max 1000) */
  itemsPerPage?: number;
}

/**
 * Filters for tax retentions endpoint.
 */
export interface TaxRetentionFilters {
  uuid?: string;
  type?: string;
  issuedAfter?: string;
  issuedBefore?: string;
  isIssuer?: boolean;
  page?: number;
  itemsPerPage?: number;
}

// ============================================================
// API Functions — Invoices (CFDIs)
// ============================================================

/**
 * Build query params from InvoiceFilters.
 * Handles array params (type[]) and boolean conversion.
 */
function buildInvoiceParams(
  filters: InvoiceFilters,
): Record<string, string | number | boolean | string[]> {
  const params: Record<string, string | number | boolean | string[]> = {};

  if (filters.type && filters.type.length > 0) params['type'] = filters.type;
  if (filters.isIssuer !== undefined) params['isIssuer'] = filters.isIssuer;
  if (filters.issuerRfc) params['issuer.rfc'] = filters.issuerRfc;
  if (filters.receiverRfc) params['receiver.rfc'] = filters.receiverRfc;
  if (filters.issuedAfter) params['issuedAt[after]'] = filters.issuedAfter;
  if (filters.issuedBefore) params['issuedAt[before]'] = filters.issuedBefore;
  if (filters.currency) params['currency'] = filters.currency;
  if (filters.status) params['status'] = filters.status;
  if (filters.paymentMethod) params['paymentMethod'] = filters.paymentMethod;
  if (filters.issuerBlacklistStatus) params['issuer.blacklistStatus'] = filters.issuerBlacklistStatus;
  if (filters.receiverBlacklistStatus) params['receiver.blacklistStatus'] = filters.receiverBlacklistStatus;
  if (filters.page) params['page'] = filters.page;
  if (filters.itemsPerPage) params['itemsPerPage'] = filters.itemsPerPage;

  return params;
}

/**
 * Get a single page of invoices.
 *
 * Use this when you need pagination control (e.g. showing results in UI).
 * For bulk data retrieval, use getAllInvoices() instead.
 *
 * @param filters - Query filters (type, isIssuer, dates, currency, etc.)
 * @param entityId - Override entity ID (defaults to env)
 * @returns Hydra collection with invoices and pagination info
 *
 * @example
 * // Get emitted income invoices for last 12 months
 * const result = await getInvoices({
 *   type: ['I'],
 *   isIssuer: true,
 *   issuedAfter: '2024-01-01',
 * });
 */
export async function getInvoices(
  filters: InvoiceFilters = {},
  entityId?: string,
): Promise<HydraCollection<SyntageInvoice>> {
  const path = entityPath('invoices', entityId);
  const params = buildInvoiceParams(filters);
  return syntageRequest<HydraCollection<SyntageInvoice>>(path, { params });
}

/**
 * Get ALL invoices matching filters (auto-paginates).
 *
 * Fetches all pages automatically. Use for engine calculations
 * that need the complete dataset.
 *
 * WARNING: Can be slow for entities with many invoices.
 * Consider using date filters to limit the dataset.
 *
 * @param filters - Query filters
 * @param entityId - Override entity ID
 * @returns Array of all matching invoices
 *
 * @example
 * // Get all emitted invoices for SAT engine (last 24 months)
 * const invoices = await getAllInvoices({
 *   type: ['I'],
 *   isIssuer: true,
 *   issuedAfter: '2023-01-01',
 * });
 */
export async function getAllInvoices(
  filters: InvoiceFilters = {},
  entityId?: string,
): Promise<SyntageInvoice[]> {
  const path = entityPath('invoices', entityId);
  const params = buildInvoiceParams(filters);
  return fetchAllPages<SyntageInvoice>(path, params);
}

// ============================================================
// API Functions — Line Items
// ============================================================

/**
 * Get line items (conceptos) for all invoices.
 *
 * Used by:
 * - Network engine: identify product/service types
 * - SAT engine: granular analysis of invoiced concepts
 *
 * @param entityId - Override entity ID
 * @returns Array of all line items
 */
export async function getAllLineItems(
  entityId?: string,
): Promise<SyntageLineItem[]> {
  const path = entityPath('invoices/line-items', entityId);
  return fetchAllPages<SyntageLineItem>(path);
}

/**
 * Get line items for a specific invoice.
 *
 * @param invoiceId - Invoice ID (not UUID)
 * @returns Hydra collection of line items
 */
export async function getInvoiceLineItems(
  invoiceId: string,
): Promise<HydraCollection<SyntageLineItem>> {
  return syntageRequest<HydraCollection<SyntageLineItem>>(
    `/invoices/${invoiceId}/line-items`,
  );
}

// ============================================================
// API Functions — Payments
// ============================================================

/**
 * Get all invoice payments (complementos de pago).
 *
 * Used by:
 * - Cashflow engine: real cash flow (not just invoiced)
 * - Working Capital engine: actual collection days
 *
 * @param entityId - Override entity ID
 * @returns Array of all payments
 */
export async function getAllPayments(
  entityId?: string,
): Promise<SyntagePayment[]> {
  const path = entityPath('invoices/payments', entityId);
  return fetchAllPages<SyntagePayment>(path);
}

/**
 * Get payments for a specific invoice.
 *
 * @param invoiceId - Invoice ID
 * @returns Hydra collection of payments
 */
export async function getInvoicePayments(
  invoiceId: string,
): Promise<HydraCollection<SyntagePayment>> {
  return syntageRequest<HydraCollection<SyntagePayment>>(
    `/invoices/${invoiceId}/payments`,
  );
}

// ============================================================
// API Functions — Batch Payments
// ============================================================

/**
 * Get batch payments (pagos agrupados de complementos tipo P).
 *
 * Used by:
 * - Cashflow engine: reconciliation of PPD payments
 *
 * @returns Array of all batch payments
 */
export async function getAllBatchPayments(): Promise<SyntageBatchPayment[]> {
  return fetchAllPages<SyntageBatchPayment>('/invoices/batch-payments');
}

// ============================================================
// API Functions — Credit Notes
// ============================================================

/**
 * Get all credit notes (notas de credito).
 *
 * Used by:
 * - SAT engine: returns, discounts, revenue quality
 * - Cashflow engine: adjustments to real cash flow
 *
 * @returns Array of all credit notes
 */
export async function getAllCreditNotes(): Promise<SyntageCreditNote[]> {
  return fetchAllPages<SyntageCreditNote>('/invoices/credit-notes');
}

/**
 * Get credit notes issued for a specific invoice.
 */
export async function getIssuedCreditNotes(
  invoiceId: string,
): Promise<HydraCollection<SyntageCreditNote>> {
  return syntageRequest<HydraCollection<SyntageCreditNote>>(
    `/invoices/${invoiceId}/issued-credit-notes`,
  );
}

/**
 * Get credit notes applied to a specific invoice.
 */
export async function getAppliedCreditNotes(
  invoiceId: string,
): Promise<HydraCollection<SyntageCreditNote>> {
  return syntageRequest<HydraCollection<SyntageCreditNote>>(
    `/invoices/${invoiceId}/applied-credit-notes`,
  );
}

// ============================================================
// API Functions — Tax Retentions
// ============================================================

/**
 * Build query params from TaxRetentionFilters.
 */
function buildRetentionParams(
  filters: TaxRetentionFilters,
): Record<string, string | number | boolean | string[]> {
  const params: Record<string, string | number | boolean | string[]> = {};

  if (filters.uuid) params['uuid'] = filters.uuid;
  if (filters.type) params['type'] = filters.type;
  if (filters.issuedAfter) params['issuedAt[after]'] = filters.issuedAfter;
  if (filters.issuedBefore) params['issuedAt[before]'] = filters.issuedBefore;
  if (filters.isIssuer !== undefined) params['isIssuer'] = filters.isIssuer;
  if (filters.page) params['page'] = filters.page;
  if (filters.itemsPerPage) params['itemsPerPage'] = filters.itemsPerPage;

  return params;
}

/**
 * Get tax retentions (retenciones ISR/IVA).
 *
 * Used by:
 * - Financial engine: tax burden, retention activity
 * - Compliance engine: retention obligation compliance
 *
 * @param filters - Query filters
 * @param entityId - Override entity ID
 * @returns Array of all tax retentions
 */
export async function getAllTaxRetentions(
  filters: TaxRetentionFilters = {},
  entityId?: string,
): Promise<SyntageTaxRetention[]> {
  const path = entityPath('tax-retentions', entityId);
  const params = buildRetentionParams(filters);
  return fetchAllPages<SyntageTaxRetention>(path, params);
}

/**
 * Get a single page of tax retentions.
 */
export async function getTaxRetentions(
  filters: TaxRetentionFilters = {},
  entityId?: string,
): Promise<HydraCollection<SyntageTaxRetention>> {
  const path = entityPath('tax-retentions', entityId);
  const params = buildRetentionParams(filters);
  return syntageRequest<HydraCollection<SyntageTaxRetention>>(path, { params });
}

// ============================================================
// Transformer: SyntageInvoice -> CFDI (legacy format)
// ============================================================

import type { CFDI } from './syntageClient';

/**
 * Transform a Syntage API invoice to the internal CFDI format
 * used by existing engines (satFacturacion, network, etc.).
 *
 * This mapper bridges the real API response shape to the legacy
 * types our engines already consume, avoiding a full engine rewrite.
 *
 * @param invoice - Raw Syntage API invoice
 * @param entityRfc - RFC of the entity (to determine isIssuer)
 * @returns CFDI in internal format
 */
export function toCFDI(invoice: SyntageInvoice, entityRfc: string): CFDI {
  const isIssuer = invoice.issuer.rfc === entityRfc;
  return {
    uuid: invoice.uuid,
    rfc_emisor: invoice.issuer.rfc,
    rfc_receptor: invoice.receiver.rfc,
    fecha: invoice.issuedAt,
    total: invoice.total,
    subtotal: invoice.subtotal,
    moneda: invoice.currency,
    tipo_comprobante: invoice.type,
    metodo_pago: invoice.paymentMethod,
    estatus: invoice.cancelledAt ? 'cancelado' : 'vigente',
    raw: {
      syntage_id: invoice.id,
      is_issuer: isIssuer,
      exchange_rate: invoice.exchangeRate,
      issuer_blacklist: invoice.issuer.blacklistStatus,
      receiver_blacklist: invoice.receiver.blacklistStatus,
      uso_cfdi: invoice.usoCfdi,
      certified_at: invoice.certifiedAt,
    },
  };
}

/**
 * Fetch and transform all invoices to legacy CFDI format.
 *
 * Convenience function for engines that need CFDIs in the
 * internal format. Fetches from API and transforms in one call.
 *
 * @param filters - Invoice filters
 * @param entityRfc - RFC of the entity
 * @param entityId - Override entity ID
 * @returns Array of CFDIs in internal format
 */
export async function fetchCFDIs(
  filters: InvoiceFilters = {},
  entityRfc: string,
  entityId?: string,
): Promise<CFDI[]> {
  const invoices = await getAllInvoices(filters, entityId);
  return invoices.map((inv) => toCFDI(inv, entityRfc));
}
