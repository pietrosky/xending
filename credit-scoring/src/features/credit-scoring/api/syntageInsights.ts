/**
 * Syntage API — Grupo 5: Insights Pre-procesados
 *
 * Endpoints cubiertos (22):
 *   GET /entities/{entityId}/insights/metrics/balance-sheet          — Balance general
 *   GET /entities/{entityId}/insights/metrics/income-statement       — Estado de resultados
 *   GET /entities/{entityId}/insights/financial-ratios               — Razones financieras
 *   POST /entities/{entityId}/datasources/syntage/score/calculate    — Calcular Syntage Score
 *   GET /entities/{entityId}/insights/metrics/scores                 — Consultar scores
 *   GET /entities/{entityId}/insights/cash-flow                      — Flujo de efectivo
 *   GET /entities/{entityId}/insights/accounts-receivable            — CxC
 *   GET /entities/{entityId}/insights/accounts-payable               — CxP
 *   GET /entities/{entityId}/insights/customer-concentration         — Concentración clientes
 *   GET /entities/{entityId}/insights/supplier-concentration         — Concentración proveedores
 *   GET /entities/{entityId}/insights/metrics/customer-network       — Red de clientes
 *   GET /entities/{entityId}/insights/metrics/vendor-network         — Red de proveedores
 *   GET /entities/{entityId}/insights/employees                      — Empleados
 *   GET /entities/{entityId}/insights/sales-revenue                  — Ingresos por ventas
 *   GET /entities/{entityId}/insights/expenditures                   — Gastos
 *   GET /entities/{entityId}/insights/financial-institutions         — Instituciones financieras
 *   GET /entities/{entityId}/insights/government-customers           — Clientes gobierno
 *   GET /entities/{entityId}/insights/invoicing-blacklist            — Lista negra 69B
 *   GET /entities/{entityId}/insights/risks                          — Riesgos pre-calculados
 *   GET /entities/{entityId}/insights/products-and-services-bought   — Productos comprados
 *   GET /entities/{entityId}/insights/products-and-services-sold     — Productos vendidos
 *   GET /entities/{entityId}/insights/metrics/invoicing-annual-comparison — Comparativo anual
 *   GET /entities/{entityId}/insights/trial-balance                  — Balanza de comprobación
 *
 * Engines que consumen estos datos:
 *   - Financial (11%): balance-sheet, income-statement, financial-ratios, trial-balance
 *   - Cashflow (7%): cash-flow, accounts-receivable, accounts-payable
 *   - Working Capital (5%): accounts-receivable, accounts-payable, financial-ratios, trial-balance
 *   - Network (8%): customer/supplier-concentration, customer/vendor-network, financial-institutions,
 *                    government-customers, products-bought/sold
 *   - Employee (3%): employees
 *   - SAT/Facturación (14%): sales-revenue, invoicing-annual-comparison, scores, risks,
 *                             customer-concentration, products-sold
 *   - FX Risk: cash-flow (by currency), risks (foreignExchangeRisk)
 *   - GraphFraud: invoicing-blacklist, risks, customer/vendor-network
 *   - AI Risk: risks, scores (all as input)
 *   - Benchmark: financial-ratios, scores, invoicing-annual-comparison, employees, balance-sheet, income-statement
 *   - Credit Limit: financial-ratios, balance-sheet, income-statement, accounts-receivable
 *   - Covenant: financial-ratios, income-statement
 *   - Scenario: cash-flow, financial-ratios
 *   - Compliance (12%): invoicing-blacklist, risks
 *
 * @see docs/SYNTAGE_API_INTEGRATION_MAP.md — Grupo 5
 */

import {
  syntageRequest,
  entityPath,
  type HydraCollection,
  type RazonesFinancieras,
} from './syntageClient';

// ============================================================
// Common filter for date-ranged insights
// ============================================================

/**
 * Common options for insight endpoints that accept date ranges and periodicity.
 */
export interface InsightDateOptions {
  /** Start date (ISO 8601 or fiscal year) */
  from?: string;
  /** End date (ISO 8601 or fiscal year) */
  to?: string;
  /** Periodicity: daily, weekly, monthly, quarterly, yearly */
  periodicity?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

/**
 * Build options[key]=value params for insight endpoints.
 */
function buildInsightParams(
  opts: InsightDateOptions,
  extra?: Record<string, string | number>,
): Record<string, string | number | boolean | string[]> {
  const params: Record<string, string | number | boolean | string[]> = {};
  if (opts.from) params['options[from]'] = opts.from;
  if (opts.to) params['options[to]'] = opts.to;
  if (opts.periodicity) params['options[periodicity]'] = opts.periodicity;
  if (extra) Object.assign(params, extra);
  return params;
}

// ============================================================
// Types — Balance Sheet
// ============================================================

/**
 * Balance sheet insight from Syntage.
 * Tree of asset/liability/equity categories by fiscal year.
 */
export interface SyntageBalanceSheet {
  '@id'?: string;
  years: Record<string, SyntageBalanceSheetYear>;
}

export interface SyntageBalanceSheetYear {
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
  /** Full category tree from Syntage */
  categories?: Record<string, unknown>;
}

// ============================================================
// Types — Income Statement
// ============================================================

/**
 * Income statement insight from Syntage.
 * Tree of revenue/cost/expense/profit categories by fiscal year.
 */
export interface SyntageIncomeStatement {
  '@id'?: string;
  years: Record<string, SyntageIncomeStatementYear>;
}

export interface SyntageIncomeStatementYear {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  interestExpense: number;
  netIncome: number;
  depreciation: number;
  ebitda: number;
  /** Full category tree from Syntage */
  categories?: Record<string, unknown>;
}

// ============================================================
// Types — Financial Ratios
// ============================================================

/**
 * Financial ratios insight from Syntage.
 * Grouped by category (liquidity, activity, profitability, leverage)
 * with values per fiscal year.
 */
export interface SyntageFinancialRatios {
  '@id'?: string;
  years: Record<string, SyntageFinancialRatiosYear>;
}

export interface SyntageFinancialRatiosYear {
  liquidity: Record<string, number>;
  activity: Record<string, number>;
  profitability: Record<string, number>;
  leverage: Record<string, number>;
  solvency?: Record<string, number>;
}

// ============================================================
// Types — Scores
// ============================================================

/**
 * Syntage Score result.
 * Score 0-1000 based on 13 weighted variables.
 */
export interface SyntageScore {
  '@id'?: string;
  score: number;
  rating: string;
  subScores: Record<string, number>;
  calculatedAt: string;
}

// ============================================================
// Types — Cash Flow
// ============================================================

/**
 * Cash flow insight from Syntage.
 * Inflows and outflows by period, optionally grouped by currency/payment-method/invoice-type.
 */
export interface SyntageCashFlow {
  '@id'?: string;
  periods: SyntageCashFlowPeriod[];
}

export interface SyntageCashFlowPeriod {
  period: string;
  inflows: number;
  outflows: number;
  net: number;
  currency: string;
  /** Breakdown by sub-category if type filter used */
  breakdown?: Record<string, number>;
}

// ============================================================
// Types — Accounts Receivable / Payable
// ============================================================

/**
 * Accounts receivable insight.
 * Pending CxC with aging buckets.
 */
export interface SyntageAccountsReceivable {
  '@id'?: string;
  periods: SyntageARPeriod[];
}

export interface SyntageARPeriod {
  period: string;
  totalPending: number;
  current: number;
  pastDue1to30: number;
  pastDue31to60: number;
  pastDue61to90: number;
  pastDue90plus: number;
}

/**
 * Accounts payable insight.
 * Pending CxP with aging buckets.
 */
export interface SyntageAccountsPayable {
  '@id'?: string;
  periods: SyntageAPPeriod[];
}

export interface SyntageAPPeriod {
  period: string;
  totalPending: number;
  current: number;
  pastDue1to30: number;
  pastDue31to60: number;
  pastDue61to90: number;
  pastDue90plus: number;
}

// ============================================================
// Types — Concentration (Customers / Suppliers)
// ============================================================

/**
 * Customer or supplier concentration entry.
 */
export interface SyntageConcentrationEntry {
  name: string;
  rfc: string;
  total: number;
  percentage: number;
  transactionsByPeriod: Record<string, number>;
}

/**
 * Concentration insight response.
 */
export interface SyntageConcentration {
  '@id'?: string;
  entries: SyntageConcentrationEntry[];
  hhi: number;
  topCount: number;
  topPercentage: number;
}

// ============================================================
// Types — Network (Customer / Vendor)
// ============================================================

/**
 * Network insight (customer or vendor).
 * Graph-like structure of commercial relationships.
 */
export interface SyntageNetwork {
  '@id'?: string;
  nodes: SyntageNetworkNode[];
  metrics: {
    totalCounterparties: number;
    activeCounterparties: number;
    averageTransactionValue: number;
  };
}

export interface SyntageNetworkNode {
  name: string;
  rfc: string;
  total: number;
  transactionCount: number;
  firstTransactionAt: string;
  lastTransactionAt: string;
}

// ============================================================
// Types — Employees
// ============================================================

/**
 * Employee insight — headcount by period.
 */
export interface SyntageEmployees {
  '@id'?: string;
  periods: SyntageEmployeePeriod[];
}

export interface SyntageEmployeePeriod {
  period: string;
  count: number;
}

// ============================================================
// Types — Sales Revenue / Expenditures
// ============================================================

/**
 * Sales revenue insight — income by period.
 */
export interface SyntageSalesRevenue {
  '@id'?: string;
  periods: SyntageRevenuePeriod[];
}

export interface SyntageRevenuePeriod {
  period: string;
  total: number;
  breakdown?: Record<string, number>;
}

/**
 * Expenditures insight — expenses by period and category.
 */
export interface SyntageExpenditures {
  '@id'?: string;
  periods: SyntageExpenditurePeriod[];
}

export interface SyntageExpenditurePeriod {
  period: string;
  total: number;
  categories: Record<string, number>;
}

// ============================================================
// Types — Financial Institutions / Government Customers
// ============================================================

/**
 * Financial institution relationship.
 */
export interface SyntageFinancialInstitution {
  name: string;
  rfc: string;
  total: number;
  transactionCount: number;
  type: string;
}

/**
 * Government customer entry.
 */
export interface SyntageGovernmentCustomer {
  name: string;
  rfc: string;
  total: number;
  percentage: number;
}

// ============================================================
// Types — Invoicing Blacklist (69B)
// ============================================================

/**
 * Invoicing blacklist insight.
 * Invoices with counterparties on SAT's 69B list.
 */
export interface SyntageInvoicingBlacklist {
  '@id'?: string;
  entries: SyntageBlacklistEntry[];
  totalAmount: number;
  totalInvoices: number;
}

export interface SyntageBlacklistEntry {
  counterpartyRfc: string;
  counterpartyName: string;
  /** Status: presunto, definitivo, favorable, desvirtuado */
  blacklistStatus: string;
  invoiceCount: number;
  totalAmount: number;
  isIssuer: boolean;
}

// ============================================================
// Types — Risks (pre-calculated by Syntage)
// ============================================================

/**
 * Pre-calculated risks from Syntage.
 * Each risk has a value and a risky flag.
 */
export interface SyntageRisks {
  '@id'?: string;
  taxCompliance: SyntageRiskItem;
  blacklistStatus: SyntageRiskItem;
  blacklistedCounterparties: SyntageRiskItem;
  intercompanyTransactions: SyntageRiskItem;
  customerConcentration: SyntageRiskItem;
  supplierConcentration: SyntageRiskItem;
  foreignExchangeRisk: SyntageRiskItem;
  cashTransactionRisk: SyntageRiskItem;
  accountingInsolvency: SyntageRiskItem;
  canceledIssuedInvoices: SyntageRiskItem;
  canceledReceivedInvoices: SyntageRiskItem;
}

export interface SyntageRiskItem {
  value: string | number;
  risky: boolean;
}

// ============================================================
// Types — Products and Services
// ============================================================

/**
 * Product/service entry (bought or sold).
 */
export interface SyntageProductService {
  name: string;
  satKey: string;
  total: number;
  percentage: number;
  transactionsByPeriod: Record<string, number>;
}

/**
 * Products/services insight response (paginated).
 */
export interface SyntageProductsInsight {
  '@id'?: string;
  entries: SyntageProductService[];
}

// ============================================================
// Types — Invoicing Annual Comparison
// ============================================================

/**
 * Annual invoicing comparison insight.
 */
export interface SyntageInvoicingAnnualComparison {
  '@id'?: string;
  years: SyntageAnnualComparisonYear[];
}

export interface SyntageAnnualComparisonYear {
  year: number;
  issuedTotal: number;
  issuedCount: number;
  receivedTotal: number;
  receivedCount: number;
}

// ============================================================
// Types — Trial Balance (Insight)
// ============================================================

/**
 * Trial balance insight — account balances by period.
 */
export interface SyntageTrialBalance {
  '@id'?: string;
  periods: SyntageTrialBalancePeriod[];
}

export interface SyntageTrialBalancePeriod {
  period: string;
  accounts: SyntageTrialBalanceAccount[];
}

export interface SyntageTrialBalanceAccount {
  code: string;
  name: string;
  initialBalance: number;
  debits: number;
  credits: number;
  finalBalance: number;
}

// ============================================================
// API Functions — Balance Sheet
// ============================================================

/**
 * Get balance sheet insight.
 *
 * Used by: Financial, Working Capital, Credit Limit, Benchmark engines.
 *
 * @param opts - Date range options
 * @param format - Insight format: '2014' (from PDF) or '2022' (from XLSX)
 * @param entityId - Override entity ID
 * @returns Balance sheet data by fiscal year
 */
export async function getBalanceSheet(
  opts: InsightDateOptions = {},
  format: '2014' | '2022' = '2022',
  entityId?: string,
): Promise<SyntageBalanceSheet> {
  const path = entityPath('insights/metrics/balance-sheet', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageBalanceSheet>(path, {
    params,
    headers: { 'X-Insight-Format': format },
  });
}

// ============================================================
// API Functions — Income Statement
// ============================================================

/**
 * Get income statement insight.
 *
 * Used by: Financial, Cashflow, Credit Limit, Benchmark, Covenant engines.
 *
 * @param opts - Date range options
 * @param format - Insight format: '2014' or '2022'
 * @param entityId - Override entity ID
 * @returns Income statement data by fiscal year
 */
export async function getIncomeStatement(
  opts: InsightDateOptions = {},
  format: '2014' | '2022' = '2022',
  entityId?: string,
): Promise<SyntageIncomeStatement> {
  const path = entityPath('insights/metrics/income-statement', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageIncomeStatement>(path, {
    params,
    headers: { 'X-Insight-Format': format },
  });
}

// ============================================================
// API Functions — Financial Ratios
// ============================================================

/**
 * Get financial ratios insight.
 *
 * Returns liquidity, activity, profitability, leverage ratios per year.
 * Used by: Financial (cross-validation), Benchmark, Working Capital,
 *          Credit Limit, Covenant, Scenario engines.
 *
 * @param opts - Date range options
 * @param entityId - Override entity ID
 * @returns Financial ratios by fiscal year
 */
export async function getFinancialRatios(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<SyntageFinancialRatios> {
  const path = entityPath('insights/financial-ratios', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageFinancialRatios>(path, { params });
}

// ============================================================
// API Functions — Syntage Score
// ============================================================

/**
 * Calculate Syntage Score for the entity.
 *
 * Triggers a new score calculation based on 13 weighted variables.
 *
 * @param entityId - Override entity ID
 * @returns Calculated score
 */
export async function calculateSyntageScore(
  entityId?: string,
): Promise<SyntageScore> {
  const path = entityPath('datasources/syntage/score/calculate', entityId);
  return syntageRequest<SyntageScore>(path, { method: 'POST' });
}

/**
 * Get previously calculated scores.
 *
 * Used by: SAT, Benchmark, AI Risk engines.
 *
 * @param entityId - Override entity ID
 * @returns Score metrics
 */
export async function getScores(
  entityId?: string,
): Promise<SyntageScore> {
  const path = entityPath('insights/metrics/scores', entityId);
  return syntageRequest<SyntageScore>(path);
}

// ============================================================
// API Functions — Cash Flow
// ============================================================

/**
 * Get cash flow insight.
 *
 * Supports grouping by: total, payment-method, currency, invoice-type.
 * Used by: Cashflow, FX Risk, Working Capital, Scenario engines.
 *
 * @param opts - Date range and periodicity options
 * @param type - Grouping type
 * @param entityId - Override entity ID
 * @returns Cash flow periods with inflows/outflows
 */
export async function getCashFlow(
  opts: InsightDateOptions = {},
  type: 'total' | 'payment-method' | 'currency' | 'invoice-type' = 'total',
  entityId?: string,
): Promise<SyntageCashFlow> {
  const path = entityPath('insights/cash-flow', entityId);
  const params = buildInsightParams(opts, { 'options[type]': type });
  return syntageRequest<SyntageCashFlow>(path, { params });
}

// ============================================================
// API Functions — Accounts Receivable / Payable
// ============================================================

/**
 * Get accounts receivable insight (CxC).
 *
 * Used by: Working Capital, Cashflow, Credit Limit engines.
 *
 * @param opts - Date range options
 * @param entityId - Override entity ID
 */
export async function getAccountsReceivable(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<SyntageAccountsReceivable> {
  const path = entityPath('insights/accounts-receivable', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageAccountsReceivable>(path, { params });
}

/**
 * Get accounts payable insight (CxP).
 *
 * Used by: Working Capital, Cashflow engines.
 *
 * @param opts - Date range options
 * @param entityId - Override entity ID
 */
export async function getAccountsPayable(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<SyntageAccountsPayable> {
  const path = entityPath('insights/accounts-payable', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageAccountsPayable>(path, { params });
}

// ============================================================
// API Functions — Concentration (Customers / Suppliers)
// ============================================================

/**
 * Get customer concentration insight.
 *
 * Used by: Network (8%), SAT (14%) engines.
 *
 * @param opts - Date range options
 * @param entityId - Override entity ID
 */
export async function getCustomerConcentration(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<SyntageConcentration> {
  const path = entityPath('insights/customer-concentration', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageConcentration>(path, { params });
}

/**
 * Get supplier concentration insight.
 *
 * Used by: Network (8%) engine.
 *
 * @param opts - Date range options
 * @param entityId - Override entity ID
 */
export async function getSupplierConcentration(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<SyntageConcentration> {
  const path = entityPath('insights/supplier-concentration', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageConcentration>(path, { params });
}

// ============================================================
// API Functions — Network (Customer / Vendor)
// ============================================================

/**
 * Get customer network insight.
 *
 * Used by: Network (8%), GraphFraud engines.
 *
 * @param entityId - Override entity ID
 */
export async function getCustomerNetwork(
  entityId?: string,
): Promise<SyntageNetwork> {
  const path = entityPath('insights/metrics/customer-network', entityId);
  return syntageRequest<SyntageNetwork>(path);
}

/**
 * Get vendor network insight.
 *
 * Used by: Network (8%), GraphFraud engines.
 *
 * @param entityId - Override entity ID
 */
export async function getVendorNetwork(
  entityId?: string,
): Promise<SyntageNetwork> {
  const path = entityPath('insights/metrics/vendor-network', entityId);
  return syntageRequest<SyntageNetwork>(path);
}

// ============================================================
// API Functions — Employees
// ============================================================

/**
 * Get employees insight — headcount by period.
 *
 * Used by: Employee (3%), Benchmark engines.
 *
 * @param opts - Date range and periodicity options
 * @param entityId - Override entity ID
 */
export async function getEmployees(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<SyntageEmployees> {
  const path = entityPath('insights/employees', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageEmployees>(path, { params });
}

// ============================================================
// API Functions — Sales Revenue / Expenditures
// ============================================================

/**
 * Get sales revenue insight.
 *
 * Used by: SAT (14%), Financial (11%), Benchmark engines.
 *
 * @param opts - Date range and periodicity options
 * @param entityId - Override entity ID
 */
export async function getSalesRevenue(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<SyntageSalesRevenue> {
  const path = entityPath('insights/sales-revenue', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageSalesRevenue>(path, { params });
}

/**
 * Get expenditures insight.
 *
 * Used by: Financial (11%), Cashflow (7%) engines.
 *
 * @param opts - Date range and periodicity options
 * @param entityId - Override entity ID
 */
export async function getExpenditures(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<SyntageExpenditures> {
  const path = entityPath('insights/expenditures', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageExpenditures>(path, { params });
}

// ============================================================
// API Functions — Financial Institutions / Government Customers
// ============================================================

/**
 * Get financial institutions insight.
 *
 * Used by: Network (8%), Buró (10%), GraphFraud engines.
 *
 * @param entityId - Override entity ID
 */
export async function getFinancialInstitutions(
  entityId?: string,
): Promise<HydraCollection<SyntageFinancialInstitution>> {
  const path = entityPath('insights/financial-institutions', entityId);
  return syntageRequest<HydraCollection<SyntageFinancialInstitution>>(path);
}

/**
 * Get government customers insight.
 *
 * Used by: Network (8%), Compliance (12%) engines.
 *
 * @param entityId - Override entity ID
 */
export async function getGovernmentCustomers(
  entityId?: string,
): Promise<HydraCollection<SyntageGovernmentCustomer>> {
  const path = entityPath('insights/government-customers', entityId);
  return syntageRequest<HydraCollection<SyntageGovernmentCustomer>>(path);
}

// ============================================================
// API Functions — Invoicing Blacklist (69B)
// ============================================================

/**
 * Get invoicing blacklist insight (lista 69B del SAT).
 *
 * Returns invoices with counterparties on SAT's 69B list:
 * presunto, definitivo, favorable, desvirtuado.
 *
 * Used by: Compliance (12%), GraphFraud, SAT (14%) engines.
 *
 * @param entityId - Override entity ID
 */
export async function getInvoicingBlacklist(
  entityId?: string,
): Promise<SyntageInvoicingBlacklist> {
  const path = entityPath('insights/invoicing-blacklist', entityId);
  return syntageRequest<SyntageInvoicingBlacklist>(path);
}

// ============================================================
// API Functions — Risks (pre-calculated)
// ============================================================

/**
 * Get pre-calculated risks from Syntage.
 *
 * Each risk has a value and a risky boolean flag.
 * This is one of the most valuable endpoints — Syntage does
 * the heavy lifting of risk calculation.
 *
 * Used by: AI Risk, Compliance, FX Risk, Network, GraphFraud, SAT engines.
 *
 * @param entityId - Override entity ID
 */
export async function getRisks(
  entityId?: string,
): Promise<SyntageRisks> {
  const path = entityPath('insights/risks', entityId);
  return syntageRequest<SyntageRisks>(path);
}

// ============================================================
// API Functions — Products and Services
// ============================================================

/**
 * Get products and services bought insight.
 *
 * Used by: Network (8%), Financial (11%) engines.
 *
 * @param opts - Date range options
 * @param entityId - Override entity ID
 */
export async function getProductsBought(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<HydraCollection<SyntageProductService>> {
  const path = entityPath('insights/products-and-services-bought', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<HydraCollection<SyntageProductService>>(path, { params });
}

/**
 * Get products and services sold insight.
 *
 * Used by: Network (8%), SAT (14%) engines.
 *
 * @param opts - Date range options
 * @param entityId - Override entity ID
 */
export async function getProductsSold(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<HydraCollection<SyntageProductService>> {
  const path = entityPath('insights/products-and-services-sold', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<HydraCollection<SyntageProductService>>(path, { params });
}

// ============================================================
// API Functions — Invoicing Annual Comparison
// ============================================================

/**
 * Get invoicing annual comparison insight.
 *
 * Year-over-year comparison of issued and received invoicing.
 * Used by: SAT (14%), Benchmark engines.
 *
 * @param entityId - Override entity ID
 */
export async function getInvoicingAnnualComparison(
  entityId?: string,
): Promise<SyntageInvoicingAnnualComparison> {
  const path = entityPath('insights/metrics/invoicing-annual-comparison', entityId);
  return syntageRequest<SyntageInvoicingAnnualComparison>(path);
}

// ============================================================
// API Functions — Trial Balance (Insight)
// ============================================================

/**
 * Get trial balance insight (balanza de comprobación).
 *
 * Used by: Financial (11%), Working Capital (5%) engines.
 *
 * @param opts - Date range and periodicity options
 * @param entityId - Override entity ID
 */
export async function getTrialBalance(
  opts: InsightDateOptions = {},
  entityId?: string,
): Promise<SyntageTrialBalance> {
  const path = entityPath('insights/trial-balance', entityId);
  const params = buildInsightParams(opts);
  return syntageRequest<SyntageTrialBalance>(path, { params });
}

// ============================================================
// Transformer: SyntageFinancialRatios → RazonesFinancieras (legacy)
// ============================================================

/**
 * Transform Syntage financial ratios to the internal RazonesFinancieras
 * format used by the Financial engine for cross-validation.
 *
 * Maps Syntage's English category names to the legacy Spanish keys
 * our engines already consume.
 *
 * @param ratios - Raw Syntage financial ratios
 * @param fiscalYear - Which year to extract (defaults to latest)
 * @returns RazonesFinancieras in internal format
 */
export function toRazonesFinancieras(
  ratios: SyntageFinancialRatios,
  fiscalYear?: string,
): RazonesFinancieras {
  const years = Object.keys(ratios.years).sort();
  const targetYear = fiscalYear ?? years[years.length - 1];
  const yearData = targetYear ? ratios.years[targetYear] : undefined;

  if (!yearData) {
    return {
      liquidez: {},
      actividad: {},
      rentabilidad: {},
      apalancamiento: {},
      cobertura: {},
      raw: { source: 'syntage', fiscal_year: targetYear, no_data: true },
    };
  }

  return {
    liquidez: yearData.liquidity ?? {},
    actividad: yearData.activity ?? {},
    rentabilidad: yearData.profitability ?? {},
    apalancamiento: yearData.leverage ?? {},
    cobertura: yearData.solvency ?? {},
    raw: {
      source: 'syntage',
      fiscal_year: targetYear,
      original_keys: Object.keys(yearData),
    },
  };
}
