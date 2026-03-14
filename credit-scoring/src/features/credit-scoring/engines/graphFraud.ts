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

const ENGINE_NAME = 'graph_fraud';

/** Sub-score weights within this engine (must sum to 1.0) */
const SUB_WEIGHTS = {
  cycle_detection: 0.30,
  shell_network: 0.25,
  blacklist_proximity: 0.20,
  concentration_related: 0.15,
  trend_quality: 0.10,
} as const;

/** Thresholds for fraud detection */
const THRESHOLDS = {
  /** Fraction of revenue with related entities that triggers alert */
  related_revenue_pct_warning: 0.30,
  related_revenue_pct_critical: 0.50,
  /** Shared address count that triggers alert */
  shared_address_warning: 2,
  shared_address_critical: 4,
  /** Shell company indicators */
  shell_min_employees: 3,
  shell_max_age_months: 24,
  shell_high_tx_threshold: 50,
  /** Blacklist proximity */
  blacklist_direct: 0,
  blacklist_one_hop: 1,
} as const;

/** Benchmarks for graph fraud metrics */
const BENCHMARKS = {
  cycle_count: 0,
  shell_score: 0,
  blacklist_neighbor_score: 0,
  related_party_revenue_pct: 0.10,
  shared_addresses: 0,
} as const;

// ============================================================
// Input types
// ============================================================

export interface GraphNode {
  id: string;
  type: 'company' | 'person' | 'address' | 'phone' | 'account' | 'email';
  label: string;
  is_applicant?: boolean;
  is_blacklisted?: boolean;
  employee_count?: number;
  age_months?: number;
  transaction_count?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: 'invoiced' | 'received_from' | 'shares_shareholder' | 'shares_representative'
    | 'shares_address' | 'shares_phone' | 'shares_account' | 'shares_email';
  amount?: number;
  count?: number;
}

export interface GraphPeriod {
  period: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_invoiced: number;
  total_received: number;
}

export interface GraphFraudInput {
  periods: GraphPeriod[];
}

// ============================================================
// Pure calculation functions (exported for testability)
// ============================================================

/** Build adjacency list from edges */
export function buildAdjacencyList(edges: GraphEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }
  return adj;
}

/** Detect cycles in directed graph using DFS. Returns array of cycles found. */
export function detectCycles(edges: GraphEdge[]): string[][] {
  const adj = buildAdjacencyList(edges);
  const allNodes = new Set<string>();
  for (const edge of edges) {
    allNodes.add(edge.source);
    allNodes.add(edge.target);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      // Found a cycle — extract it from the path
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) {
        cycles.push(path.slice(cycleStart).concat(node));
      }
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    const neighbors = adj.get(node) ?? [];
    for (const neighbor of neighbors) {
      dfs(neighbor, path);
      if (cycles.length >= 10) return; // cap to avoid explosion
    }

    path.pop();
    inStack.delete(node);
  }

  for (const node of allNodes) {
    if (!visited.has(node)) {
      dfs(node, []);
      if (cycles.length >= 10) break;
    }
  }

  return cycles;
}

/** Filter edges to only invoice-type edges for circular invoicing detection */
export function getInvoiceEdges(edges: GraphEdge[]): GraphEdge[] {
  return edges.filter((e) => e.type === 'invoiced' || e.type === 'received_from');
}

/** Count nodes sharing the same address */
export function countSharedAddresses(edges: GraphEdge[]): number {
  const addressEdges = edges.filter((e) => e.type === 'shares_address');
  const addressToCompanies = new Map<string, Set<string>>();
  for (const edge of addressEdges) {
    if (!addressToCompanies.has(edge.target)) {
      addressToCompanies.set(edge.target, new Set());
    }
    addressToCompanies.get(edge.target)!.add(edge.source);
  }
  let sharedCount = 0;
  for (const companies of addressToCompanies.values()) {
    if (companies.size > 1) sharedCount += companies.size;
  }
  return sharedCount;
}

/** Detect shell company indicators from nodes */
export function detectShellCompanies(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter((n) => {
    if (n.type !== 'company' || n.is_applicant) return false;
    const lowEmployees = n.employee_count !== undefined && n.employee_count < THRESHOLDS.shell_min_employees;
    const recentCreation = n.age_months !== undefined && n.age_months < THRESHOLDS.shell_max_age_months;
    const highTx = n.transaction_count !== undefined && n.transaction_count > THRESHOLDS.shell_high_tx_threshold;
    // At least 2 of 3 indicators must be present
    const indicators = [lowEmployees, recentCreation, highTx].filter(Boolean).length;
    return indicators >= 2;
  });
}

/** Calculate blacklist neighbor score: how close the applicant is to blacklisted entities */
export function calcBlacklistNeighborScore(
  nodes: GraphNode[],
  edges: GraphEdge[],
): number {
  const blacklistedIds = new Set(nodes.filter((n) => n.is_blacklisted).map((n) => n.id));
  if (blacklistedIds.size === 0) return 0;

  const applicantIds = new Set(nodes.filter((n) => n.is_applicant).map((n) => n.id));
  if (applicantIds.size === 0) return 0;

  // Build undirected adjacency for proximity check
  const adj = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, new Set());
    if (!adj.has(edge.target)) adj.set(edge.target, new Set());
    adj.get(edge.source)!.add(edge.target);
    adj.get(edge.target)!.add(edge.source);
  }

  let score = 0;

  for (const appId of applicantIds) {
    // Direct connection to blacklisted
    const directNeighbors = adj.get(appId) ?? new Set();
    for (const neighbor of directNeighbors) {
      if (blacklistedIds.has(neighbor)) {
        score += 100; // Direct connection = max severity
      }
    }
    // One-hop connection
    for (const neighbor of directNeighbors) {
      if (blacklistedIds.has(neighbor)) continue; // already counted
      const secondHop = adj.get(neighbor) ?? new Set();
      for (const hop2 of secondHop) {
        if (blacklistedIds.has(hop2)) {
          score += 40; // One hop away
        }
      }
    }
  }

  return Math.min(score, 200); // Cap at 200
}

/** Calculate related party revenue as fraction of total invoiced */
export function calcRelatedPartyRevenuePct(
  edges: GraphEdge[],
  nodes: GraphNode[],
  totalInvoiced: number,
): number {
  if (totalInvoiced <= 0) return 0;

  // Find applicant node
  const applicantIds = new Set(nodes.filter((n) => n.is_applicant).map((n) => n.id));

  // Find edges where applicant invoiced to entities sharing shareholders/representatives/addresses
  const sharingEdges = edges.filter((e) =>
    e.type === 'shares_shareholder' ||
    e.type === 'shares_representative' ||
    e.type === 'shares_address',
  );

  const relatedEntities = new Set<string>();
  for (const edge of sharingEdges) {
    if (applicantIds.has(edge.source)) relatedEntities.add(edge.target);
    if (applicantIds.has(edge.target)) relatedEntities.add(edge.source);
  }

  // Sum invoiced amounts to related entities
  const invoiceEdges = edges.filter((e) => e.type === 'invoiced');
  let relatedAmount = 0;
  for (const edge of invoiceEdges) {
    if (applicantIds.has(edge.source) && relatedEntities.has(edge.target)) {
      relatedAmount += edge.amount ?? 0;
    }
  }

  return relatedAmount / totalInvoiced;
}

// ============================================================
// Sub-score calculations (exported for testability)
// ============================================================

/** Cycle detection sub-score (0-100). More cycles = lower score. */
export function calcCycleDetectionSubScore(cycleCount: number): number {
  if (cycleCount === 0) return 100;
  if (cycleCount === 1) return 40;
  if (cycleCount <= 3) return 20;
  return 5;
}

/** Shell network sub-score (0-100). More shell indicators = lower score. */
export function calcShellNetworkSubScore(
  shellCount: number,
  sharedAddresses: number,
): number {
  let score = 100;

  // Shell companies penalty
  if (shellCount >= 3) score -= 60;
  else if (shellCount >= 1) score -= 30;

  // Shared addresses penalty
  if (sharedAddresses >= THRESHOLDS.shared_address_critical) score -= 30;
  else if (sharedAddresses >= THRESHOLDS.shared_address_warning) score -= 15;

  return Math.max(0, score);
}

/** Blacklist proximity sub-score (0-100). Higher proximity score = lower sub-score. */
export function calcBlacklistProximitySubScore(blacklistScore: number): number {
  if (blacklistScore === 0) return 100;
  if (blacklistScore <= 40) return 50;
  if (blacklistScore <= 100) return 20;
  return 5;
}

/** Related party concentration sub-score (0-100) */
export function calcRelatedConcentrationSubScore(relatedRevenuePct: number): number {
  if (relatedRevenuePct <= 0.10) return 100;
  if (relatedRevenuePct <= 0.20) return 80;
  if (relatedRevenuePct <= 0.30) return 60;
  if (relatedRevenuePct <= 0.50) return 30;
  return 10;
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

/** Gate engine: produces pass/fail/hard_stop rather than weighted score */
export function scoreToStatus(score: number, flags: RiskFlag[]): ModuleStatus {
  const hasHardStop = flags.some((f) => f.severity === 'hard_stop');
  if (hasHardStop) return 'fail';
  const hasCritical = flags.some((f) => f.severity === 'critical');
  if (hasCritical) return 'fail';
  if (score >= 60) return 'pass';
  if (score >= 40) return 'warning';
  return 'fail';
}

export function generateRiskFlags(data: {
  cycleCount: number;
  shellCount: number;
  sharedAddresses: number;
  blacklistScore: number;
  relatedRevenuePct: number;
}): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // Circular invoicing (Requirement 14.4, 14.6)
  if (data.cycleCount > 0) {
    flags.push({
      code: 'circular_invoicing_detected',
      severity: data.cycleCount >= 3 ? 'hard_stop' : 'critical',
      message: `${data.cycleCount} circular invoicing cycle(s) detected in transaction graph`,
      source_metric: 'cycle_count',
      value: data.cycleCount,
      threshold: 0,
    });
  }

  // Shell companies (Requirement 14.4)
  if (data.shellCount > 0) {
    flags.push({
      code: 'shell_network_detected',
      severity: data.shellCount >= 3 ? 'hard_stop' : 'critical',
      message: `${data.shellCount} potential shell company(ies) detected in network`,
      source_metric: 'shell_company_count',
      value: data.shellCount,
      threshold: 0,
    });
  }

  // Shared addresses (Requirement 14.6)
  if (data.sharedAddresses >= THRESHOLDS.shared_address_warning) {
    flags.push({
      code: 'shared_address_alert',
      severity: data.sharedAddresses >= THRESHOLDS.shared_address_critical ? 'critical' : 'warning',
      message: `${data.sharedAddresses} counterparties share addresses`,
      source_metric: 'shared_addresses',
      value: data.sharedAddresses,
      threshold: THRESHOLDS.shared_address_warning,
    });
  }

  // Blacklist proximity (Requirement 14.6)
  if (data.blacklistScore > 0) {
    flags.push({
      code: 'blacklist_proximity',
      severity: data.blacklistScore >= 100 ? 'hard_stop' : 'critical',
      message: `Network proximity to blacklisted entities (score: ${data.blacklistScore})`,
      source_metric: 'blacklist_neighbor_score',
      value: data.blacklistScore,
      threshold: 0,
    });
  }

  // Related party concentration (Requirement 14.6)
  if (data.relatedRevenuePct > THRESHOLDS.related_revenue_pct_warning) {
    flags.push({
      code: 'related_party_concentration',
      severity: data.relatedRevenuePct > THRESHOLDS.related_revenue_pct_critical ? 'critical' : 'warning',
      message: `${(data.relatedRevenuePct * 100).toFixed(1)}% of revenue with related entities`,
      source_metric: 'related_party_revenue_pct',
      value: data.relatedRevenuePct,
      threshold: THRESHOLDS.related_revenue_pct_warning,
    });
  }

  return flags;
}

// ============================================================
// Trend analysis
// ============================================================

function buildTimeSeries(
  periods: GraphPeriod[],
  extractor: (p: GraphPeriod) => number,
): TimeSeriesPoint[] {
  const sorted = [...periods].sort((a, b) => a.period.localeCompare(b.period));
  return sorted.map((p) => ({
    period: p.period,
    value: Math.round(extractor(p) * 10000) / 10000,
  }));
}

export function analyzeTrends(periods: GraphPeriod[]): TrendResult[] {
  if (periods.length < 2) return [];

  const configs: Array<{
    config: TrendConfig;
    extractor: (p: GraphPeriod) => number;
  }> = [
    {
      config: {
        metric_name: 'cycle_count', metric_label: 'Circular Invoicing Cycles', unit: 'count',
        higher_is_better: false, warning_threshold: 1, critical_threshold: 3,
        benchmark_value: BENCHMARKS.cycle_count, projection_months: 3, y_axis_format: 'count',
      },
      extractor: (p) => detectCycles(getInvoiceEdges(p.edges)).length,
    },
    {
      config: {
        metric_name: 'shell_company_count', metric_label: 'Shell Company Indicators', unit: 'count',
        higher_is_better: false, warning_threshold: 1, critical_threshold: 3,
        benchmark_value: BENCHMARKS.shell_score, projection_months: 3, y_axis_format: 'count',
      },
      extractor: (p) => detectShellCompanies(p.nodes).length,
    },
    {
      config: {
        metric_name: 'node_count', metric_label: 'Network Size', unit: 'count',
        higher_is_better: false,
        projection_months: 3, y_axis_format: 'count',
      },
      extractor: (p) => p.nodes.length,
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
  cycleCount: number;
  shellCount: number;
  blacklistScore: number;
  relatedRevenuePct: number;
  sharedAddresses: number;
}): Record<string, BenchmarkComparison> {
  function compare(
    metric: string, value: number, benchmark: number, higherIsBetter: boolean,
  ): BenchmarkComparison {
    const deviation = benchmark !== 0 ? ((value - benchmark) / Math.abs(benchmark)) * 100 : (value > 0 ? 100 : 0);
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
    cycle_count: compare('cycle_count', metrics.cycleCount, BENCHMARKS.cycle_count, false),
    shell_company_count: compare('shell_company_count', metrics.shellCount, BENCHMARKS.shell_score, false),
    blacklist_neighbor_score: compare('blacklist_neighbor_score', metrics.blacklistScore, BENCHMARKS.blacklist_neighbor_score, false),
    related_party_revenue_pct: compare('related_party_revenue_pct', metrics.relatedRevenuePct, BENCHMARKS.related_party_revenue_pct, false),
    shared_addresses: compare('shared_addresses', metrics.sharedAddresses, BENCHMARKS.shared_addresses, false),
  };
}

function buildKeyMetrics(data: {
  cycleCount: number;
  shellCount: number;
  blacklistScore: number;
  relatedRevenuePct: number;
  sharedAddresses: number;
  nodeCount: number;
  edgeCount: number;
}): Record<string, MetricValue> {
  function metric(
    name: string, label: string, value: number, unit: string,
    formula: string, interpretation: string, impact: 'positive' | 'neutral' | 'negative',
  ): MetricValue {
    return {
      name, label, value: Math.round(value * 10000) / 10000, unit,
      source: 'graph_fraud_engine', formula, interpretation, impact_on_score: impact,
    };
  }

  return {
    cycle_count: metric('cycle_count', 'Circular Invoicing Cycles', data.cycleCount, 'count',
      'DFS cycle detection on invoice edges',
      data.cycleCount === 0 ? 'No circular invoicing detected' : 'Circular invoicing patterns found',
      data.cycleCount === 0 ? 'positive' : 'negative'),
    shell_company_count: metric('shell_company_count', 'Shell Company Indicators', data.shellCount, 'count',
      'nodes with low employees + recent creation + high transactions',
      data.shellCount === 0 ? 'No shell company indicators' : 'Potential shell companies in network',
      data.shellCount === 0 ? 'positive' : 'negative'),
    blacklist_neighbor_score: metric('blacklist_neighbor_score', 'Blacklist Proximity Score', data.blacklistScore, 'score',
      'weighted proximity to blacklisted entities (direct=100, 1-hop=40)',
      data.blacklistScore === 0 ? 'No blacklisted neighbors' : 'Proximity to blacklisted entities detected',
      data.blacklistScore === 0 ? 'positive' : 'negative'),
    related_party_revenue_pct: metric('related_party_revenue_pct', 'Related Party Revenue %', data.relatedRevenuePct, '%',
      'invoiced to related entities / total invoiced',
      data.relatedRevenuePct <= 0.30 ? 'Acceptable related party exposure' : 'High related party concentration',
      data.relatedRevenuePct <= 0.30 ? 'positive' : 'negative'),
    shared_addresses: metric('shared_addresses', 'Shared Addresses', data.sharedAddresses, 'count',
      'counterparties sharing physical addresses',
      data.sharedAddresses < THRESHOLDS.shared_address_warning ? 'Normal address distribution' : 'Multiple entities share addresses',
      data.sharedAddresses < THRESHOLDS.shared_address_warning ? 'positive' : 'negative'),
    node_count: metric('node_count', 'Network Nodes', data.nodeCount, 'count',
      'total entities in graph', 'Network size', 'neutral'),
    edge_count: metric('edge_count', 'Network Edges', data.edgeCount, 'count',
      'total relationships in graph', 'Network connectivity', 'neutral'),
  };
}

// ============================================================
// Explanation and recommended actions
// ============================================================

function buildExplanation(score: number, grade: ModuleGrade, flags: RiskFlag[]): string {
  const flagSummary = flags.length > 0
    ? ` Risk flags: ${flags.map((f) => f.code).join(', ')}.`
    : ' No fraud indicators detected.';
  return `Graph Fraud engine score: ${score}/100 (Grade ${grade}).${flagSummary}`;
}

function buildRecommendedActions(flags: RiskFlag[]): string[] {
  const actions: string[] = [];
  const codes = new Set(flags.map((f) => f.code));

  if (codes.has('circular_invoicing_detected')) actions.push('Investigate circular invoicing patterns — possible invoice simulation');
  if (codes.has('shell_network_detected')) actions.push('Verify operational substance of flagged counterparties');
  if (codes.has('shared_address_alert')) actions.push('Verify physical addresses of counterparties sharing locations');
  if (codes.has('blacklist_proximity')) actions.push('Review connections to blacklisted entities — escalate to compliance');
  if (codes.has('related_party_concentration')) actions.push('Assess related party transactions for arm-length pricing');

  return actions;
}

// ============================================================
// Main engine function
// ============================================================

export async function runGraphFraudEngine(input: EngineInput): Promise<EngineOutput> {
  const graphData = input.syntage_data as GraphFraudInput | undefined;

  if (!graphData) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_graph_data',
        severity: 'critical',
        message: 'No graph data available for fraud analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Graph Fraud engine blocked: no data provided.',
      recommended_actions: ['Ensure CFDI and counterparty data is available for graph analysis'],
      created_at: new Date().toISOString(),
    };
  }

  const { periods } = graphData;

  if (periods.length === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'insufficient_graph_data',
        severity: 'critical',
        message: 'No periods available for graph fraud analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'Graph Fraud engine blocked: no period data.',
      recommended_actions: ['Upload CFDI data for graph-based fraud detection'],
      created_at: new Date().toISOString(),
    };
  }

  // Use most recent period for scoring
  const latestPeriod = [...periods].sort((a, b) => b.period.localeCompare(a.period))[0]!;

  // Core calculations
  const invoiceEdges = getInvoiceEdges(latestPeriod.edges);
  const cycles = detectCycles(invoiceEdges);
  const cycleCount = cycles.length;

  const shellCompanies = detectShellCompanies(latestPeriod.nodes);
  const shellCount = shellCompanies.length;

  const sharedAddresses = countSharedAddresses(latestPeriod.edges);
  const blacklistScore = calcBlacklistNeighborScore(latestPeriod.nodes, latestPeriod.edges);
  const relatedRevenuePct = calcRelatedPartyRevenuePct(
    latestPeriod.edges, latestPeriod.nodes, latestPeriod.total_invoiced,
  );

  // Sub-scores
  const subScores = {
    cycle_detection: calcCycleDetectionSubScore(cycleCount),
    shell_network: calcShellNetworkSubScore(shellCount, sharedAddresses),
    blacklist_proximity: calcBlacklistProximitySubScore(blacklistScore),
    concentration_related: calcRelatedConcentrationSubScore(relatedRevenuePct),
    trend_quality: 50, // placeholder, updated below
  };

  // Trends
  const trends = analyzeTrends(periods);
  subScores.trend_quality = calcTrendQualitySubScore(trends);

  // Weighted raw score
  const rawScore =
    subScores.cycle_detection * SUB_WEIGHTS.cycle_detection +
    subScores.shell_network * SUB_WEIGHTS.shell_network +
    subScores.blacklist_proximity * SUB_WEIGHTS.blacklist_proximity +
    subScores.concentration_related * SUB_WEIGHTS.concentration_related +
    subScores.trend_quality * SUB_WEIGHTS.trend_quality;

  const trendFactor = trendUtils.calculateTrendFactor(trends);
  const finalScore = Math.round(Math.min(100, rawScore * trendFactor));

  const grade = scoreToGrade(finalScore);

  // Risk flags
  const riskFlags = generateRiskFlags({
    cycleCount, shellCount, sharedAddresses, blacklistScore, relatedRevenuePct,
  });
  const status = scoreToStatus(finalScore, riskFlags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: finalScore,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: riskFlags,
    key_metrics: buildKeyMetrics({
      cycleCount, shellCount, blacklistScore, relatedRevenuePct,
      sharedAddresses, nodeCount: latestPeriod.nodes.length,
      edgeCount: latestPeriod.edges.length,
    }),
    benchmark_comparison: buildBenchmarks({
      cycleCount, shellCount, blacklistScore, relatedRevenuePct, sharedAddresses,
    }),
    trends,
    explanation: buildExplanation(finalScore, grade, riskFlags),
    recommended_actions: buildRecommendedActions(riskFlags),
    created_at: new Date().toISOString(),
  };
}
