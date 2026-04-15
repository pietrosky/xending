import type {
  EngineInput,
  EngineOutput,
  MetricValue,
  BenchmarkComparison,
  RiskFlag,
  ModuleGrade,
  ModuleStatus,
} from '../types/engine.types';
import type { TimeSeriesPoint, TrendConfig, TrendResult } from '../types/trend.types';
import { trendUtils } from '../lib/trendUtils';

// ============================================================
// Constants
// ============================================================

const ENGINE_NAME = 'network';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  client_concentration: 0.30,
  supplier_concentration: 0.25,
  government_dependency: 0.15,
  product_diversification: 0.15,
  trend_quality: 0.15,
} as const;

/** Benchmarks for network metrics */
const BENCHMARKS = {
  hhi_clients: 1500,
  hhi_suppliers: 1500,
  top1_client_pct: 0.25,
  top3_clients_pct: 0.60,
  top1_supplier_pct: 0.30,
  top3_suppliers_pct: 0.60,
  government_revenue_pct: 0.20,
  top1_product_pct: 0.40,
} as const;

/** HHI thresholds */
const HHI_THRESHOLDS = {
  low: 1000,
  moderate: 1500,
  high: 2500,
} as const;

// ============================================================
// Input types
// ============================================================

export interface Counterparty {
  rfc: string;
  name: string;
  total_amount: number;
  is_government: boolean;
  is_related_party: boolean;
  sector?: string;
  currency?: string;
  country?: string;
  dso?: number;
  cancellation_rate?: number;
}

export interface ProductInfo {
  product_code: string;
  product_name: string;
  total_sales: number;
}

export interface FinancialInstitution {
  name: string;
  type: string;
  transaction_volume: number;
}

export interface NetworkPeriod {
  period: string;
  clients: Counterparty[];
  suppliers: Counterparty[];
  products: ProductInfo[];
  financial_institutions: FinancialInstitution[];
  total_revenue: number;
  total_expenses: number;
}

export interface NetworkInput {
  periods: NetworkPeriod[];
}

// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

/** HHI = sum of squared market shares (each share as percentage 0-100, max HHI = 10000) */
export function calcHHI(shares: number[]): number {
  const total = shares.reduce((s, v) => s + v, 0);
  if (total <= 0) return 0;
  return shares.reduce((hhi, share) => {
    const pct = (share / total) * 100;
    return hhi + pct * pct;
  }, 0);
}

/** Top N share as fraction (0-1) of total */
export function calcTopNShare(amounts: number[], n: number): number {
  if (amounts.length === 0) return 0;
  const total = amounts.reduce((s, v) => s + v, 0);
  if (total <= 0) return 0;
  const sorted = [...amounts].sort((a, b) => b - a);
  const topN = sorted.slice(0, n).reduce((s, v) => s + v, 0);
  return topN / total;
}

/** Government revenue as fraction of total revenue */
export function calcGovernmentRevenuePct(clients: Counterparty[], totalRevenue: number): number {
  if (totalRevenue <= 0) return 0;
  const govRevenue = clients
    .filter((c) => c.is_government)
    .reduce((s, c) => s + c.total_amount, 0);
  return govRevenue / totalRevenue;
}

/** Related party exposure as fraction of total */
export function calcRelatedPartyPct(counterparties: Counterparty[], total: number): number {
  if (total <= 0) return 0;
  const rpAmount = counterparties
    .filter((c) => c.is_related_party)
    .reduce((s, c) => s + c.total_amount, 0);
  return rpAmount / total;
}

/** Product HHI based on sales amounts */
export function calcProductHHI(products: ProductInfo[]): number {
  const amounts = products.map((p) => p.total_sales);
  return calcHHI(amounts);
}

/** Top 1 product share as fraction */
export function calcTop1ProductPct(products: ProductInfo[]): number {
  const amounts = products.map((p) => p.total_sales);
  return calcTopNShare(amounts, 1);
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

/** Client concentration sub-score (0-100) based on HHI and top client shares */
export function calcClientConcentrationSubScore(
  hhiClients: number,
  top1ClientPct: number,
  top3ClientsPct: number,
): number {
  let score = 0;

  // HHI component (40% of sub-score)
  if (hhiClients < HHI_THRESHOLDS.low) score += 40;
  else if (hhiClients < HHI_THRESHOLDS.moderate) score += 30;
  else if (hhiClients < HHI_THRESHOLDS.high) score += 15;
  else score += 5;

  // Top 1 client (35% of sub-score)
  if (top1ClientPct <= 0.20) score += 35;
  else if (top1ClientPct <= 0.35) score += 25;
  else if (top1ClientPct <= 0.50) score += 10;
  else score += 0;

  // Top 3 clients (25% of sub-score)
  if (top3ClientsPct <= 0.50) score += 25;
  else if (top3ClientsPct <= 0.70) score += 15;
  else score += 5;

  return Math.min(100, score);
}

/** Supplier concentration sub-score (0-100) */
export function calcSupplierConcentrationSubScore(
  hhiSuppliers: number,
  top1SupplierPct: number,
  top3SuppliersPct: number,
): number {
  let score = 0;

  // HHI component (40%)
  if (hhiSuppliers < HHI_THRESHOLDS.low) score += 40;
  else if (hhiSuppliers < HHI_THRESHOLDS.moderate) score += 30;
  else if (hhiSuppliers < HHI_THRESHOLDS.high) score += 15;
  else score += 5;

  // Top 1 supplier (35%)
  if (top1SupplierPct <= 0.25) score += 35;
  else if (top1SupplierPct <= 0.40) score += 20;
  else score += 5;

  // Top 3 suppliers (25%)
  if (top3SuppliersPct <= 0.50) score += 25;
  else if (top3SuppliersPct <= 0.70) score += 15;
  else score += 5;

  return Math.min(100, score);
}

/** Government dependency sub-score (0-100) */
export function calcGovernmentDependencySubScore(govRevenuePct: number): number {
  if (govRevenuePct <= 0.10) return 100;
  if (govRevenuePct <= 0.25) return 80;
  if (govRevenuePct <= 0.40) return 60;
  if (govRevenuePct <= 0.50) return 40;
  if (govRevenuePct <= 0.70) return 20;
  return 10;
}

/** Product diversification sub-score (0-100) */
export function calcProductDiversificationSubScore(
  productHHI: number,
  top1ProductPct: number,
): number {
  let score = 0;

  // Product HHI (50%)
  if (productHHI < HHI_THRESHOLDS.low) score += 50;
  else if (productHHI < HHI_THRESHOLDS.moderate) score += 35;
  else if (productHHI < HHI_THRESHOLDS.high) score += 20;
  else score += 5;

  // Top 1 product (50%)
  if (top1ProductPct <= 0.30) score += 50;
  else if (top1ProductPct <= 0.50) score += 35;
  else if (top1ProductPct <= 0.60) score += 20;
  else score += 5;

  return Math.min(100, score);
}

/** Trend quality sub-score (0-100) based on trend directions */
export function calcTrendQualitySubScore(trends: TrendResult[]): number {
  if (trends.length === 0) return 50;

  const hasCritical = trends.some((t) => t.direction === 'critical');
  if (hasCritical) return 10;

  const improvingCount = trends.filter((t) => t.direction === 'improving').length;
  const deterioratingCount = trends.filter((t) => t.direction === 'deteriorating').length;
  const ratio = trends.length > 0 ? improvingCount / trends.length : 0;

  if (deterioratingCount > trends.length / 2) return 25;
  if (ratio >= 0.6) return 90;
  if (ratio >= 0.3) return 70;
  return 50;
}

// ============================================================
// Helpers: grade, status, risk flags
// ============================================================

export function scoreToGrade(score: number): ModuleGrade {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export function scoreToStatus(score: number, flags: RiskFlag[]): ModuleStatus {
  const hasHardStop = flags.some((f) => f.severity === 'hard_stop');
  if (hasHardStop) return 'fail';
  const hasCritical = flags.some((f) => f.severity === 'critical');
  if (hasCritical) return 'fail';
  if (score >= 60) return 'pass';
  if (score >= 40) return 'warning';
  return 'fail';
}

export function generateRiskFlags(
  hhiClients: number,
  hhiSuppliers: number,
  top1ClientPct: number,
  top3ClientsPct: number,
  top1SupplierPct: number,
  govRevenuePct: number,
  top1ProductPct: number,
): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // HHI clients > 1500 = attention (Requirement 8.4)
  if (hhiClients > HHI_THRESHOLDS.moderate) {
    flags.push({
      code: 'high_client_hhi',
      severity: hhiClients > HHI_THRESHOLDS.high ? 'critical' : 'warning',
      message: `Client HHI ${Math.round(hhiClients)} exceeds ${HHI_THRESHOLDS.moderate} threshold`,
      source_metric: 'hhi_clients',
      value: hhiClients,
      threshold: HHI_THRESHOLDS.moderate,
    });
  }

  // HHI suppliers > 1500
  if (hhiSuppliers > HHI_THRESHOLDS.moderate) {
    flags.push({
      code: 'high_supplier_hhi',
      severity: hhiSuppliers > HHI_THRESHOLDS.high ? 'critical' : 'warning',
      message: `Supplier HHI ${Math.round(hhiSuppliers)} exceeds ${HHI_THRESHOLDS.moderate} threshold`,
      source_metric: 'hhi_suppliers',
      value: hhiSuppliers,
      threshold: HHI_THRESHOLDS.moderate,
    });
  }

  // Top 1 client > 35% = risk (Requirement 8.4)
  if (top1ClientPct > 0.35 && top1ClientPct <= 0.50) {
    flags.push({
      code: 'top1_client_risk',
      severity: 'warning',
      message: `Top 1 client represents ${(top1ClientPct * 100).toFixed(1)}% of revenue (>35%)`,
      source_metric: 'top1_client_pct',
      value: top1ClientPct,
      threshold: 0.35,
    });
  }

  // Top 1 client > 50% = high risk (Requirement 8.4)
  if (top1ClientPct > 0.50) {
    flags.push({
      code: 'top1_client_high_risk',
      severity: 'critical',
      message: `Top 1 client represents ${(top1ClientPct * 100).toFixed(1)}% of revenue (>50%)`,
      source_metric: 'top1_client_pct',
      value: top1ClientPct,
      threshold: 0.50,
    });
  }

  // Top 3 clients > 70% = strong alert (Requirement 8.4)
  if (top3ClientsPct > 0.70) {
    flags.push({
      code: 'top3_clients_alert',
      severity: 'critical',
      message: `Top 3 clients represent ${(top3ClientsPct * 100).toFixed(1)}% of revenue (>70%)`,
      source_metric: 'top3_clients_pct',
      value: top3ClientsPct,
      threshold: 0.70,
    });
  }

  // Top 1 supplier > 40% = operational dependency risk (Requirement 8.5)
  if (top1SupplierPct > 0.40) {
    flags.push({
      code: 'operational_dependency_risk',
      severity: 'warning',
      message: `Top 1 supplier represents ${(top1SupplierPct * 100).toFixed(1)}% of purchases (>40%)`,
      source_metric: 'top1_supplier_pct',
      value: top1SupplierPct,
      threshold: 0.40,
    });
  }

  // Government dependency > 50% (Requirement 8.12)
  if (govRevenuePct > 0.50) {
    flags.push({
      code: 'government_dependency',
      severity: 'warning',
      message: `Government revenue ${(govRevenuePct * 100).toFixed(1)}% exceeds 50% — stable but slow payment and administration change risk`,
      source_metric: 'government_revenue_pct',
      value: govRevenuePct,
      threshold: 0.50,
    });
  }

  // Product concentration > 60% (Requirement 8.15)
  if (top1ProductPct > 0.60) {
    flags.push({
      code: 'product_concentration_risk',
      severity: 'warning',
      message: `Top 1 product represents ${(top1ProductPct * 100).toFixed(1)}% of sales (>60%)`,
      source_metric: 'top1_product_pct',
      value: top1ProductPct,
      threshold: 0.60,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(
  periods: NetworkPeriod[],
  extractor: (p: NetworkPeriod) => number,
): TimeSeriesPoint[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  return sorted.map((p) => ({
    period: p.period,
    value: Math.round(extractor(p) * 10000) / 10000,
  }));
}

export function analyzeTrends(periods: NetworkPeriod[]): TrendResult[] {
  if (periods.length < 2) return [];

  const configs: Array<{
    config: TrendConfig;
    extractor: (p: NetworkPeriod) => number;
  }> = [
    {
      config: {
        metric_name: 'hhi_clients', metric_label: 'Client HHI', unit: 'index',
        higher_is_better: false, warning_threshold: HHI_THRESHOLDS.moderate,
        critical_threshold: HHI_THRESHOLDS.high,
        benchmark_value: BENCHMARKS.hhi_clients, projection_months: 3, y_axis_format: 'index',
      },
      extractor: (p) => calcHHI(p.clients.map((c) => c.total_amount)),
    },
    {
      config: {
        metric_name: 'hhi_suppliers', metric_label: 'Supplier HHI', unit: 'index',
        higher_is_better: false, warning_threshold: HHI_THRESHOLDS.moderate,
        critical_threshold: HHI_THRESHOLDS.high,
        benchmark_value: BENCHMARKS.hhi_suppliers, projection_months: 3, y_axis_format: 'index',
      },
      extractor: (p) => calcHHI(p.suppliers.map((s) => s.total_amount)),
    },
    {
      config: {
        metric_name: 'top1_client_pct', metric_label: 'Top 1 Client %', unit: '%',
        higher_is_better: false, warning_threshold: 0.35, critical_threshold: 0.50,
        benchmark_value: BENCHMARKS.top1_client_pct, projection_months: 3, y_axis_format: '%',
      },
      extractor: (p) => calcTopNShare(p.clients.map((c) => c.total_amount), 1),
    },
    {
      config: {
        metric_name: 'government_revenue_pct', metric_label: 'Government Revenue %', unit: '%',
        higher_is_better: false, warning_threshold: 0.40, critical_threshold: 0.50,
        benchmark_value: BENCHMARKS.government_revenue_pct, projection_months: 3, y_axis_format: '%',
      },
      extractor: (p) => calcGovernmentRevenuePct(p.clients, p.total_revenue),
    },
  ];

  return configs.map(({ config, extractor }) => {
    const series = buildTimeSeries(periods, extractor);
    return trendUtils.analyze(series, config);
  });
}

// ============================================================
// Benchmarks and key metrics builders
// ============================================================

function buildBenchmarks(metrics: {
  hhiClients: number;
  hhiSuppliers: number;
  top1ClientPct: number;
  top3ClientsPct: number;
  top1SupplierPct: number;
  top3SuppliersPct: number;
  govRevenuePct: number;
  top1ProductPct: number;
}): Record<string, BenchmarkComparison> {
  function compare(
    metric: string, value: number, benchmark: number, higherIsBetter: boolean,
  ): BenchmarkComparison {
    const deviation = benchmark !== 0 ? ((value - benchmark) / Math.abs(benchmark)) * 100 : 0;
    const tolerance = Math.abs(benchmark) * 0.05;
    let status: 'above' | 'at' | 'below';
    if (higherIsBetter) {
      status = value > benchmark + tolerance ? 'above' : value < benchmark - tolerance ? 'below' : 'at';
    } else {
      status = value < benchmark - tolerance ? 'above' : value > benchmark + tolerance ? 'below' : 'at';
    }
    return {
      metric,
      applicant_value: Math.round(value * 10000) / 10000,
      benchmark_value: benchmark,
      deviation_percent: Math.round(deviation * 100) / 100,
      status,
    };
  }

  return {
    hhi_clients: compare('hhi_clients', metrics.hhiClients, BENCHMARKS.hhi_clients, false),
    hhi_suppliers: compare('hhi_suppliers', metrics.hhiSuppliers, BENCHMARKS.hhi_suppliers, false),
    top1_client_pct: compare('top1_client_pct', metrics.top1ClientPct, BENCHMARKS.top1_client_pct, false),
    top3_clients_pct: compare('top3_clients_pct', metrics.top3ClientsPct, BENCHMARKS.top3_clients_pct, false),
    top1_supplier_pct: compare('top1_supplier_pct', metrics.top1SupplierPct, BENCHMARKS.top1_supplier_pct, false),
    top3_suppliers_pct: compare('top3_suppliers_pct', metrics.top3SuppliersPct, BENCHMARKS.top3_suppliers_pct, false),
    government_revenue_pct: compare('government_revenue_pct', metrics.govRevenuePct, BENCHMARKS.government_revenue_pct, false),
    top1_product_pct: compare('top1_product_pct', metrics.top1ProductPct, BENCHMARKS.top1_product_pct, false),
  };
}

function buildKeyMetrics(data: {
  hhiClients: number;
  hhiSuppliers: number;
  top1ClientPct: number;
  top3ClientsPct: number;
  top1SupplierPct: number;
  top3SuppliersPct: number;
  govRevenuePct: number;
  relatedPartyClientPct: number;
  relatedPartySupplierPct: number;
  productHHI: number;
  top1ProductPct: number;
  clientCount: number;
  supplierCount: number;
}): Record<string, MetricValue> {
  function metric(
    name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: 'positive' | 'neutral' | 'negative',
  ): MetricValue {
    return {
      name, label, value: Math.round(value * 10000) / 10000, unit,
      source: 'network_engine', formula, interpretation, impact_on_score: impact,
    };
  }

  return {
    hhi_clients: metric('hhi_clients', 'Client HHI', data.hhiClients, 'index',
      'sum of squared market shares',
      data.hhiClients < HHI_THRESHOLDS.moderate ? 'Diversified client base' : 'Concentrated client base',
      data.hhiClients < HHI_THRESHOLDS.moderate ? 'positive' : 'negative'),
    hhi_suppliers: metric('hhi_suppliers', 'Supplier HHI', data.hhiSuppliers, 'index',
      'sum of squared market shares',
      data.hhiSuppliers < HHI_THRESHOLDS.moderate ? 'Diversified supplier base' : 'Concentrated supplier base',
      data.hhiSuppliers < HHI_THRESHOLDS.moderate ? 'positive' : 'negative'),
    top1_client_pct: metric('top1_client_pct', 'Top 1 Client %', data.top1ClientPct, '%',
      'largest client revenue / total revenue',
      data.top1ClientPct <= 0.35 ? 'Acceptable concentration' : 'High client dependency',
      data.top1ClientPct <= 0.35 ? 'positive' : 'negative'),
    top3_clients_pct: metric('top3_clients_pct', 'Top 3 Clients %', data.top3ClientsPct, '%',
      'top 3 clients revenue / total revenue',
      data.top3ClientsPct <= 0.70 ? 'Acceptable top 3 share' : 'High top 3 concentration',
      data.top3ClientsPct <= 0.70 ? 'positive' : 'negative'),
    top1_supplier_pct: metric('top1_supplier_pct', 'Top 1 Supplier %', data.top1SupplierPct, '%',
      'largest supplier amount / total expenses',
      data.top1SupplierPct <= 0.40 ? 'Acceptable supplier dependency' : 'Operational dependency risk',
      data.top1SupplierPct <= 0.40 ? 'positive' : 'negative'),
    top3_suppliers_pct: metric('top3_suppliers_pct', 'Top 3 Suppliers %', data.top3SuppliersPct, '%',
      'top 3 suppliers amount / total expenses',
      data.top3SuppliersPct <= 0.70 ? 'Acceptable top 3 share' : 'High supplier concentration',
      data.top3SuppliersPct <= 0.70 ? 'positive' : 'negative'),
    government_revenue_pct: metric('government_revenue_pct', 'Government Revenue %', data.govRevenuePct, '%',
      'government client revenue / total revenue',
      data.govRevenuePct <= 0.50 ? 'Low government dependency' : 'High government dependency',
      data.govRevenuePct <= 0.50 ? 'positive' : 'negative'),
    related_party_client_pct: metric('related_party_client_pct', 'Related Party Clients %', data.relatedPartyClientPct, '%',
      'related party client revenue / total revenue',
      'Related party exposure on client side', 'neutral'),
    related_party_supplier_pct: metric('related_party_supplier_pct', 'Related Party Suppliers %', data.relatedPartySupplierPct, '%',
      'related party supplier amount / total expenses',
      'Related party exposure on supplier side', 'neutral'),
    product_hhi: metric('product_hhi', 'Product HHI', data.productHHI, 'index',
      'sum of squared product sales shares',
      data.productHHI < HHI_THRESHOLDS.moderate ? 'Diversified product mix' : 'Concentrated product mix',
      data.productHHI < HHI_THRESHOLDS.moderate ? 'positive' : 'negative'),
    top1_product_pct: metric('top1_product_pct', 'Top 1 Product %', data.top1ProductPct, '%',
      'largest product sales / total sales',
      data.top1ProductPct <= 0.60 ? 'Acceptable product concentration' : 'High product concentration',
      data.top1ProductPct <= 0.60 ? 'positive' : 'negative'),
    client_count: metric('client_count', 'Active Clients', data.clientCount, 'count',
      'distinct clients in period', 'Number of active clients', 'neutral'),
    supplier_count: metric('supplier_count', 'Active Suppliers', data.supplierCount, 'count',
      'distinct suppliers in period', 'Number of active suppliers', 'neutral'),
  };
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const flagSummary = flags.length > 0
    ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
    : ' No risk flags detected.';
  return `Network engine score: ${score}/100 (Grade ${grade}).${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('high_client_hhi')) actions.push('Diversify client base to reduce concentration risk');
  if (codes.has('high_supplier_hhi')) actions.push('Diversify supplier base to reduce operational risk');
  if (codes.has('top1_client_high_risk')) actions.push('Critical: top client exceeds 50% of revenue — high dependency');
  if (codes.has('top1_client_risk')) actions.push('Monitor top client dependency — exceeds 35% of revenue');
  if (codes.has('top3_clients_alert')) actions.push('Top 3 clients exceed 70% of revenue — strong concentration alert');
  if (codes.has('operational_dependency_risk')) actions.push('Evaluate alternative suppliers — top supplier exceeds 40%');
  if (codes.has('government_dependency')) actions.push('Government revenue exceeds 50% — monitor payment cycles and administration changes');
  if (codes.has('product_concentration_risk')) actions.push('Diversify product offering — top product exceeds 60% of sales');

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runNetworkEngine(input: EngineInput): Promise<EngineOutput> {
  const networkData = input.syntage_data as NetworkInput | undefined;

  if (!networkData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_network_data',
        severity: 'critical',
        message: 'No network data available for analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Network engine blocked: no data provided.',
      recommended_actions: ['Ensure Syntage CFDI data is available for network analysis'],
      created_at: new Date().toISOString(),
    };
  }

  const { periods } = networkData;

  if (periods.length === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'insufficient_network_data',
        severity: 'critical',
        message: 'No periods available for network analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Network engine blocked: no period data.',
      recommended_actions: ['Upload CFDI data or ensure Syntage provides counterparty information'],
      created_at: new Date().toISOString(),
    };
  }

  // Use most recent period for scoring
  const latestPeriod = [...periods].sort((a, b) => b.period.localeCompare(a.period))[0]!;

  // Core calculations — clients
  const clientAmounts = latestPeriod.clients.map((c) => c.total_amount);
  const hhiClients = calcHHI(clientAmounts);
  const top1ClientPct = calcTopNShare(clientAmounts, 1);
  const top3ClientsPct = calcTopNShare(clientAmounts, 3);

  // Core calculations — suppliers
  const supplierAmounts = latestPeriod.suppliers.map((s) => s.total_amount);
  const hhiSuppliers = calcHHI(supplierAmounts);
  const top1SupplierPct = calcTopNShare(supplierAmounts, 1);
  const top3SuppliersPct = calcTopNShare(supplierAmounts, 3);

  // Government and related parties
  const govRevenuePct = calcGovernmentRevenuePct(latestPeriod.clients, latestPeriod.total_revenue);
  const relatedPartyClientPct = calcRelatedPartyPct(latestPeriod.clients, latestPeriod.total_revenue);
  const relatedPartySupplierPct = calcRelatedPartyPct(latestPeriod.suppliers, latestPeriod.total_expenses);

  // Products
  const productHHI = calcProductHHI(latestPeriod.products);
  const top1ProductPct = calcTop1ProductPct(latestPeriod.products);

  // Sub-scores
  const subScores = {
    client_concentration: calcClientConcentrationSubScore(hhiClients, top1ClientPct, top3ClientsPct),
    supplier_concentration: calcSupplierConcentrationSubScore(hhiSuppliers, top1SupplierPct, top3SuppliersPct),
    government_dependency: calcGovernmentDependencySubScore(govRevenuePct),
    product_diversification: calcProductDiversificationSubScore(productHHI, top1ProductPct),
    trend_quality: 50, // placeholder, updated below
  };

  // Trends
  const trends = analyzeTrends(periods);
  subScores.trend_quality = calcTrendQualitySubScore(trends);

  // Weighted raw score
  const rawScore =
    subScores.client_concentration * SUB_WEIGHTS.client_concentration +
    subScores.supplier_concentration * SUB_WEIGHTS.supplier_concentration +
    subScores.government_dependency * SUB_WEIGHTS.government_dependency +
    subScores.product_diversification * SUB_WEIGHTS.product_diversification +
    subScores.trend_quality * SUB_WEIGHTS.trend_quality;

  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));

  const grade = scoreToGrade(finalScore);

  // Risk flags
  const riskFlags = generateRiskFlags(
    hhiClients, hhiSuppliers, top1ClientPct, top3ClientsPct,
    top1SupplierPct, govRevenuePct, top1ProductPct,
  );
  const status = scoreToStatus(finalScore, riskFlags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics({
      hhiClients, hhiSuppliers, top1ClientPct, top3ClientsPct,
      top1SupplierPct, top3SuppliersPct, govRevenuePct,
      relatedPartyClientPct, relatedPartySupplierPct,
      productHHI, top1ProductPct,
      clientCount: latestPeriod.clients.length,
      supplierCount: latestPeriod.suppliers.length,
    }),
    benchmark_comparison: buildBenchmarks({
      hhiClients, hhiSuppliers, top1ClientPct, top3ClientsPct,
      top1SupplierPct, top3SuppliersPct, govRevenuePct, top1ProductPct,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
