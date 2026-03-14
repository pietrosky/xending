import { describe, it, expect } from 'vitest';
import {
  buildAdjacencyList,
  detectCycles,
  getInvoiceEdges,
  countSharedAddresses,
  detectShellCompanies,
  calcBlacklistNeighborScore,
  calcRelatedPartyRevenuePct,
  calcCycleDetectionSubScore,
  calcShellNetworkSubScore,
  calcBlacklistProximitySubScore,
  calcRelatedConcentrationSubScore,
  calcTrendQualitySubScore,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runGraphFraudEngine,
} from './graphFraud';
import type { GraphNode, GraphEdge, GraphPeriod } from './graphFraud';
import type { EngineInput } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: {},
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

// ============================================================
// Helper factories
// ============================================================

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: 'node_1',
    type: 'company',
    label: 'Company A',
    ...overrides,
  };
}

function makeEdge(overrides: Partial<GraphEdge> = {}): GraphEdge {
  return {
    source: 'a',
    target: 'b',
    type: 'invoiced',
    amount: 100_000,
    ...overrides,
  };
}

function makeCleanPeriod(period: string): GraphPeriod {
  return {
    period,
    nodes: [
      makeNode({ id: 'applicant', is_applicant: true, label: 'Applicant Co' }),
      makeNode({ id: 'client_1', label: 'Client 1', employee_count: 50, age_months: 60 }),
      makeNode({ id: 'client_2', label: 'Client 2', employee_count: 30, age_months: 48 }),
      makeNode({ id: 'supplier_1', label: 'Supplier 1', employee_count: 20, age_months: 36 }),
    ],
    edges: [
      makeEdge({ source: 'applicant', target: 'client_1', type: 'invoiced', amount: 500_000 }),
      makeEdge({ source: 'applicant', target: 'client_2', type: 'invoiced', amount: 300_000 }),
      makeEdge({ source: 'supplier_1', target: 'applicant', type: 'invoiced', amount: 200_000 }),
    ],
    total_invoiced: 800_000,
    total_received: 200_000,
  };
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('buildAdjacencyList', () => {
  it('should build adjacency from edges', () => {
    const edges: GraphEdge[] = [
      makeEdge({ source: 'a', target: 'b' }),
      makeEdge({ source: 'a', target: 'c' }),
      makeEdge({ source: 'b', target: 'c' }),
    ];
    const adj = buildAdjacencyList(edges);
    expect(adj.get('a')).toEqual(['b', 'c']);
    expect(adj.get('b')).toEqual(['c']);
  });

  it('should return empty map for no edges', () => {
    expect(buildAdjacencyList([]).size).toBe(0);
  });
});

describe('detectCycles', () => {
  it('should detect a simple cycle A->B->C->A', () => {
    const edges: GraphEdge[] = [
      makeEdge({ source: 'a', target: 'b' }),
      makeEdge({ source: 'b', target: 'c' }),
      makeEdge({ source: 'c', target: 'a' }),
    ];
    const cycles = detectCycles(edges);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('should return empty for acyclic graph', () => {
    const edges: GraphEdge[] = [
      makeEdge({ source: 'a', target: 'b' }),
      makeEdge({ source: 'b', target: 'c' }),
    ];
    expect(detectCycles(edges)).toHaveLength(0);
  });

  it('should return empty for no edges', () => {
    expect(detectCycles([])).toHaveLength(0);
  });

  it('should detect self-loop', () => {
    const edges: GraphEdge[] = [
      makeEdge({ source: 'a', target: 'a' }),
    ];
    const cycles = detectCycles(edges);
    expect(cycles.length).toBeGreaterThan(0);
  });
});

describe('getInvoiceEdges', () => {
  it('should filter only invoice-type edges', () => {
    const edges: GraphEdge[] = [
      makeEdge({ type: 'invoiced' }),
      makeEdge({ type: 'received_from' }),
      makeEdge({ type: 'shares_address' }),
      makeEdge({ type: 'shares_shareholder' }),
    ];
    const result = getInvoiceEdges(edges);
    expect(result).toHaveLength(2);
  });
});

describe('countSharedAddresses', () => {
  it('should count companies sharing the same address', () => {
    const edges: GraphEdge[] = [
      makeEdge({ source: 'company_a', target: 'addr_1', type: 'shares_address' }),
      makeEdge({ source: 'company_b', target: 'addr_1', type: 'shares_address' }),
      makeEdge({ source: 'company_c', target: 'addr_1', type: 'shares_address' }),
    ];
    expect(countSharedAddresses(edges)).toBe(3);
  });

  it('should return 0 when no addresses are shared', () => {
    const edges: GraphEdge[] = [
      makeEdge({ source: 'company_a', target: 'addr_1', type: 'shares_address' }),
      makeEdge({ source: 'company_b', target: 'addr_2', type: 'shares_address' }),
    ];
    expect(countSharedAddresses(edges)).toBe(0);
  });

  it('should return 0 for no address edges', () => {
    expect(countSharedAddresses([])).toBe(0);
  });
});

describe('detectShellCompanies', () => {
  it('should detect shell company with low employees + recent + high tx', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'shell', employee_count: 1, age_months: 12, transaction_count: 100 }),
    ];
    expect(detectShellCompanies(nodes)).toHaveLength(1);
  });

  it('should not flag applicant as shell', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'app', is_applicant: true, employee_count: 1, age_months: 12, transaction_count: 100 }),
    ];
    expect(detectShellCompanies(nodes)).toHaveLength(0);
  });

  it('should not flag company with only 1 indicator', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'legit', employee_count: 1, age_months: 60, transaction_count: 10 }),
    ];
    expect(detectShellCompanies(nodes)).toHaveLength(0);
  });

  it('should detect with 2 of 3 indicators', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'suspicious', employee_count: 2, age_months: 18, transaction_count: 10 }),
    ];
    expect(detectShellCompanies(nodes)).toHaveLength(1);
  });

  it('should skip non-company nodes', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'person', type: 'person', employee_count: 0, age_months: 6, transaction_count: 200 }),
    ];
    expect(detectShellCompanies(nodes)).toHaveLength(0);
  });
});

describe('calcBlacklistNeighborScore', () => {
  it('should return 0 when no blacklisted nodes', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'app', is_applicant: true }),
      makeNode({ id: 'other' }),
    ];
    const edges: GraphEdge[] = [makeEdge({ source: 'app', target: 'other' })];
    expect(calcBlacklistNeighborScore(nodes, edges)).toBe(0);
  });

  it('should return 100 for direct connection to blacklisted', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'app', is_applicant: true }),
      makeNode({ id: 'bad', is_blacklisted: true }),
    ];
    const edges: GraphEdge[] = [makeEdge({ source: 'app', target: 'bad' })];
    expect(calcBlacklistNeighborScore(nodes, edges)).toBe(100);
  });

  it('should return 40 for one-hop connection to blacklisted', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'app', is_applicant: true }),
      makeNode({ id: 'middle' }),
      makeNode({ id: 'bad', is_blacklisted: true }),
    ];
    const edges: GraphEdge[] = [
      makeEdge({ source: 'app', target: 'middle' }),
      makeEdge({ source: 'middle', target: 'bad' }),
    ];
    expect(calcBlacklistNeighborScore(nodes, edges)).toBe(40);
  });

  it('should return 0 when no applicant nodes', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'bad', is_blacklisted: true }),
    ];
    expect(calcBlacklistNeighborScore(nodes, [])).toBe(0);
  });
});

describe('calcRelatedPartyRevenuePct', () => {
  it('should calculate related party revenue fraction', () => {
    const nodes: GraphNode[] = [
      makeNode({ id: 'app', is_applicant: true }),
      makeNode({ id: 'related_co' }),
    ];
    const edges: GraphEdge[] = [
      makeEdge({ source: 'app', target: 'related_co', type: 'shares_shareholder' }),
      makeEdge({ source: 'app', target: 'related_co', type: 'invoiced', amount: 300_000 }),
    ];
    expect(calcRelatedPartyRevenuePct(edges, nodes, 1_000_000)).toBeCloseTo(0.30, 2);
  });

  it('should return 0 when no related entities', () => {
    const nodes: GraphNode[] = [makeNode({ id: 'app', is_applicant: true })];
    const edges: GraphEdge[] = [
      makeEdge({ source: 'app', target: 'unrelated', type: 'invoiced', amount: 500_000 }),
    ];
    expect(calcRelatedPartyRevenuePct(edges, nodes, 500_000)).toBe(0);
  });

  it('should return 0 for zero total invoiced', () => {
    expect(calcRelatedPartyRevenuePct([], [], 0)).toBe(0);
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcCycleDetectionSubScore', () => {
  it('should return 100 for no cycles', () => {
    expect(calcCycleDetectionSubScore(0)).toBe(100);
  });

  it('should return 40 for 1 cycle', () => {
    expect(calcCycleDetectionSubScore(1)).toBe(40);
  });

  it('should return 20 for 2-3 cycles', () => {
    expect(calcCycleDetectionSubScore(2)).toBe(20);
  });

  it('should return 5 for many cycles', () => {
    expect(calcCycleDetectionSubScore(5)).toBe(5);
  });
});

describe('calcShellNetworkSubScore', () => {
  it('should return 100 for clean network', () => {
    expect(calcShellNetworkSubScore(0, 0)).toBe(100);
  });

  it('should penalize shell companies', () => {
    expect(calcShellNetworkSubScore(2, 0)).toBe(70);
  });

  it('should penalize shared addresses', () => {
    expect(calcShellNetworkSubScore(0, 3)).toBe(85);
  });

  it('should combine penalties', () => {
    const score = calcShellNetworkSubScore(3, 5);
    expect(score).toBeLessThan(20);
  });
});

describe('calcBlacklistProximitySubScore', () => {
  it('should return 100 for no blacklist proximity', () => {
    expect(calcBlacklistProximitySubScore(0)).toBe(100);
  });

  it('should return 50 for low proximity', () => {
    expect(calcBlacklistProximitySubScore(30)).toBe(50);
  });

  it('should return 5 for high proximity', () => {
    expect(calcBlacklistProximitySubScore(150)).toBe(5);
  });
});

describe('calcRelatedConcentrationSubScore', () => {
  it('should return 100 for low related party exposure', () => {
    expect(calcRelatedConcentrationSubScore(0.05)).toBe(100);
  });

  it('should return 30 for high related party exposure', () => {
    expect(calcRelatedConcentrationSubScore(0.45)).toBe(30);
  });

  it('should return 10 for extreme related party exposure', () => {
    expect(calcRelatedConcentrationSubScore(0.60)).toBe(10);
  });
});

describe('calcTrendQualitySubScore', () => {
  it('should return 50 for empty trends', () => {
    expect(calcTrendQualitySubScore([])).toBe(50);
  });

  it('should return 10 for critical trends', () => {
    const trends = [{ direction: 'critical' }] as TrendResult[];
    expect(calcTrendQualitySubScore(trends)).toBe(10);
  });

  it('should return 90 for mostly improving trends', () => {
    const trends = [
      { direction: 'improving' },
      { direction: 'improving' },
      { direction: 'stable' },
    ] as TrendResult[];
    expect(calcTrendQualitySubScore(trends)).toBe(90);
  });
});

// ============================================================
// Helpers tests
// ============================================================

describe('scoreToGrade', () => {
  it('should map scores to grades', () => {
    expect(scoreToGrade(85)).toBe('A');
    expect(scoreToGrade(70)).toBe('B');
    expect(scoreToGrade(55)).toBe('C');
    expect(scoreToGrade(40)).toBe('D');
    expect(scoreToGrade(20)).toBe('F');
  });
});

describe('scoreToStatus', () => {
  it('should return fail for hard_stop flags', () => {
    expect(scoreToStatus(80, [{ code: 'x', severity: 'hard_stop', message: '' }])).toBe('fail');
  });

  it('should return pass for high score without critical flags', () => {
    expect(scoreToStatus(75, [])).toBe('pass');
  });

  it('should return warning for mid-range score', () => {
    expect(scoreToStatus(45, [])).toBe('warning');
  });

  it('should return fail for low score', () => {
    expect(scoreToStatus(30, [])).toBe('fail');
  });
});

// ============================================================
// Risk flags tests
// ============================================================

describe('generateRiskFlags', () => {
  it('should flag circular invoicing', () => {
    const flags = generateRiskFlags({
      cycleCount: 2, shellCount: 0, sharedAddresses: 0,
      blacklistScore: 0, relatedRevenuePct: 0,
    });
    expect(flags.some((f) => f.code === 'circular_invoicing_detected')).toBe(true);
  });

  it('should flag shell networks', () => {
    const flags = generateRiskFlags({
      cycleCount: 0, shellCount: 2, sharedAddresses: 0,
      blacklistScore: 0, relatedRevenuePct: 0,
    });
    expect(flags.some((f) => f.code === 'shell_network_detected')).toBe(true);
  });

  it('should flag shared addresses', () => {
    const flags = generateRiskFlags({
      cycleCount: 0, shellCount: 0, sharedAddresses: 3,
      blacklistScore: 0, relatedRevenuePct: 0,
    });
    expect(flags.some((f) => f.code === 'shared_address_alert')).toBe(true);
  });

  it('should flag blacklist proximity', () => {
    const flags = generateRiskFlags({
      cycleCount: 0, shellCount: 0, sharedAddresses: 0,
      blacklistScore: 50, relatedRevenuePct: 0,
    });
    expect(flags.some((f) => f.code === 'blacklist_proximity')).toBe(true);
  });

  it('should flag related party concentration', () => {
    const flags = generateRiskFlags({
      cycleCount: 0, shellCount: 0, sharedAddresses: 0,
      blacklistScore: 0, relatedRevenuePct: 0.40,
    });
    expect(flags.some((f) => f.code === 'related_party_concentration')).toBe(true);
  });

  it('should return no flags for clean network', () => {
    const flags = generateRiskFlags({
      cycleCount: 0, shellCount: 0, sharedAddresses: 0,
      blacklistScore: 0, relatedRevenuePct: 0.05,
    });
    expect(flags).toHaveLength(0);
  });

  it('should trigger hard_stop for severe circular invoicing', () => {
    const flags = generateRiskFlags({
      cycleCount: 3, shellCount: 0, sharedAddresses: 0,
      blacklistScore: 0, relatedRevenuePct: 0,
    });
    const circularFlag = flags.find((f) => f.code === 'circular_invoicing_detected');
    expect(circularFlag?.severity).toBe('hard_stop');
  });

  it('should trigger hard_stop for direct blacklist connection', () => {
    const flags = generateRiskFlags({
      cycleCount: 0, shellCount: 0, sharedAddresses: 0,
      blacklistScore: 100, relatedRevenuePct: 0,
    });
    const blFlag = flags.find((f) => f.code === 'blacklist_proximity');
    expect(blFlag?.severity).toBe('hard_stop');
  });
});

// ============================================================
// Trend analysis tests
// ============================================================

describe('analyzeTrends', () => {
  it('should return empty for single period', () => {
    expect(analyzeTrends([makeCleanPeriod('2024-01')])).toHaveLength(0);
  });

  it('should return trends for multiple periods', () => {
    const periods = [
      makeCleanPeriod('2024-01'),
      makeCleanPeriod('2024-02'),
      makeCleanPeriod('2024-03'),
    ];
    const trends = analyzeTrends(periods);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]!.metric_name).toBe('cycle_count');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runGraphFraudEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runGraphFraudEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('graph_fraud');
  });

  it('should return blocked when periods array is empty', async () => {
    const result = await runGraphFraudEngine({
      ...baseInput,
      syntage_data: { periods: [] },
    });
    expect(result.module_status).toBe('blocked');
  });

  it('should pass for clean network', async () => {
    const periods = [
      makeCleanPeriod('2024-01'),
      makeCleanPeriod('2024-02'),
      makeCleanPeriod('2024-03'),
    ];
    const result = await runGraphFraudEngine({
      ...baseInput,
      syntage_data: { periods },
    });
    expect(result.module_status).toBe('pass');
    expect(result.module_score).toBeGreaterThan(50);
    expect(result.risk_flags).toHaveLength(0);
    expect(result.key_metrics['cycle_count']).toBeDefined();
    expect(result.key_metrics['shell_company_count']).toBeDefined();
  });

  it('should fail for network with circular invoicing', async () => {
    const period: GraphPeriod = {
      period: '2024-01',
      nodes: [
        makeNode({ id: 'app', is_applicant: true }),
        makeNode({ id: 'b' }),
        makeNode({ id: 'c' }),
      ],
      edges: [
        makeEdge({ source: 'app', target: 'b', type: 'invoiced', amount: 500_000 }),
        makeEdge({ source: 'b', target: 'c', type: 'invoiced', amount: 400_000 }),
        makeEdge({ source: 'c', target: 'app', type: 'invoiced', amount: 300_000 }),
      ],
      total_invoiced: 500_000,
      total_received: 300_000,
    };
    const result = await runGraphFraudEngine({
      ...baseInput,
      syntage_data: { periods: [period] },
    });
    expect(result.risk_flags.some((f) => f.code === 'circular_invoicing_detected')).toBe(true);
    expect(result.module_status).toBe('fail');
  });

  it('should detect shell companies in network', async () => {
    const period: GraphPeriod = {
      period: '2024-01',
      nodes: [
        makeNode({ id: 'app', is_applicant: true }),
        makeNode({ id: 'shell1', employee_count: 1, age_months: 6, transaction_count: 200 }),
        makeNode({ id: 'shell2', employee_count: 0, age_months: 12, transaction_count: 100 }),
      ],
      edges: [
        makeEdge({ source: 'app', target: 'shell1', type: 'invoiced', amount: 500_000 }),
        makeEdge({ source: 'app', target: 'shell2', type: 'invoiced', amount: 300_000 }),
      ],
      total_invoiced: 800_000,
      total_received: 0,
    };
    const result = await runGraphFraudEngine({
      ...baseInput,
      syntage_data: { periods: [period] },
    });
    expect(result.risk_flags.some((f) => f.code === 'shell_network_detected')).toBe(true);
  });

  it('should detect blacklist proximity', async () => {
    const period: GraphPeriod = {
      period: '2024-01',
      nodes: [
        makeNode({ id: 'app', is_applicant: true }),
        makeNode({ id: 'bad_entity', is_blacklisted: true }),
      ],
      edges: [
        makeEdge({ source: 'app', target: 'bad_entity', type: 'invoiced', amount: 100_000 }),
      ],
      total_invoiced: 100_000,
      total_received: 0,
    };
    const result = await runGraphFraudEngine({
      ...baseInput,
      syntage_data: { periods: [period] },
    });
    expect(result.risk_flags.some((f) => f.code === 'blacklist_proximity')).toBe(true);
    expect(result.module_status).toBe('fail');
  });
});
