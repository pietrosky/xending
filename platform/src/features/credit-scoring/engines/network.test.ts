import { describe, it, expect } from 'vitest';
import {
  calcHHI,
  calcTopNShare,
  calcGovernmentRevenuePct,
  calcRelatedPartyPct,
  calcProductHHI,
  calcTop1ProductPct,
  calcClientConcentrationSubScore,
  calcSupplierConcentrationSubScore,
  calcGovernmentDependencySubScore,
  calcProductDiversificationSubScore,
  calcTrendQualitySubScore,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runNetworkEngine,
} from './network';
import type { Counterparty, ProductInfo, NetworkPeriod } from './network';
import type { EngineInput } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';

// ============================================================
// Test fixtures
// ============================================================

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { network: 0.08 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeClient(overrides: Partial<Counterparty> = {}): Counterparty {
  return {
    rfc: 'ABC123456789',
    name: 'Client A',
    total_amount: 100_000,
    is_government: false,
    is_related_party: false,
    ...overrides,
  };
}

function makeSupplier(overrides: Partial<Counterparty> = {}): Counterparty {
  return {
    rfc: 'SUP123456789',
    name: 'Supplier A',
    total_amount: 50_000,
    is_government: false,
    is_related_party: false,
    ...overrides,
  };
}

function makeProduct(overrides: Partial<ProductInfo> = {}): ProductInfo {
  return {
    product_code: 'P001',
    product_name: 'Product A',
    total_sales: 100_000,
    ...overrides,
  };
}

function makeDiversifiedPeriod(period: string): NetworkPeriod {
  const clients: Counterparty[] = [];
  for (let i = 0; i < 10; i++) {
    clients.push(makeClient({
      rfc: `CLI${i}`,
      name: `Client ${i}`,
      total_amount: 100_000 + i * 5000,
    }));
  }
  const suppliers: Counterparty[] = [];
  for (let i = 0; i < 8; i++) {
    suppliers.push(makeSupplier({
      rfc: `SUP${i}`,
      name: `Supplier ${i}`,
      total_amount: 50_000 + i * 3000,
    }));
  }
  const products: ProductInfo[] = [];
  for (let i = 0; i < 5; i++) {
    products.push(makeProduct({
      product_code: `P00${i}`,
      product_name: `Product ${i}`,
      total_sales: 200_000 + i * 10_000,
    }));
  }
  const totalRevenue = clients.reduce((s, c) => s + c.total_amount, 0);
  const totalExpenses = suppliers.reduce((s, sup) => s + sup.total_amount, 0);
  return {
    period,
    clients,
    suppliers,
    products,
    financial_institutions: [],
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
  };
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('calcHHI', () => {
  it('should return 10000 for a single counterparty (monopoly)', () => {
    expect(calcHHI([1_000_000])).toBeCloseTo(10000, 0);
  });

  it('should return 5000 for two equal counterparties', () => {
    expect(calcHHI([500_000, 500_000])).toBeCloseTo(5000, 0);
  });

  it('should return low HHI for many equal counterparties', () => {
    const shares = Array(10).fill(100_000) as number[];
    expect(calcHHI(shares)).toBeCloseTo(1000, 0);
  });

  it('should return 0 for empty array', () => {
    expect(calcHHI([])).toBe(0);
  });

  it('should return 0 for all-zero shares', () => {
    expect(calcHHI([0, 0, 0])).toBe(0);
  });
});

describe('calcTopNShare', () => {
  it('should return 1.0 for single counterparty', () => {
    expect(calcTopNShare([100_000], 1)).toBeCloseTo(1.0, 2);
  });

  it('should return correct top 1 share', () => {
    expect(calcTopNShare([600_000, 200_000, 200_000], 1)).toBeCloseTo(0.60, 2);
  });

  it('should return correct top 3 share', () => {
    const amounts = [400_000, 300_000, 200_000, 100_000];
    expect(calcTopNShare(amounts, 3)).toBeCloseTo(0.90, 2);
  });

  it('should return 0 for empty array', () => {
    expect(calcTopNShare([], 1)).toBe(0);
  });

  it('should handle n larger than array length', () => {
    expect(calcTopNShare([100_000, 200_000], 5)).toBeCloseTo(1.0, 2);
  });
});

describe('calcGovernmentRevenuePct', () => {
  it('should calculate government revenue percentage', () => {
    const clients = [
      makeClient({ total_amount: 300_000, is_government: true }),
      makeClient({ total_amount: 700_000, is_government: false }),
    ];
    expect(calcGovernmentRevenuePct(clients, 1_000_000)).toBeCloseTo(0.30, 2);
  });

  it('should return 0 when no government clients', () => {
    const clients = [makeClient({ is_government: false })];
    expect(calcGovernmentRevenuePct(clients, 100_000)).toBe(0);
  });

  it('should return 0 for zero revenue', () => {
    const clients = [makeClient({ is_government: true })];
    expect(calcGovernmentRevenuePct(clients, 0)).toBe(0);
  });
});

describe('calcRelatedPartyPct', () => {
  it('should calculate related party percentage', () => {
    const parties = [
      makeClient({ total_amount: 200_000, is_related_party: true }),
      makeClient({ total_amount: 800_000, is_related_party: false }),
    ];
    expect(calcRelatedPartyPct(parties, 1_000_000)).toBeCloseTo(0.20, 2);
  });

  it('should return 0 for zero total', () => {
    expect(calcRelatedPartyPct([makeClient({ is_related_party: true })], 0)).toBe(0);
  });
});

describe('calcProductHHI', () => {
  it('should calculate HHI for products', () => {
    const products = [
      makeProduct({ total_sales: 500_000 }),
      makeProduct({ total_sales: 500_000 }),
    ];
    expect(calcProductHHI(products)).toBeCloseTo(5000, 0);
  });

  it('should return 0 for empty products', () => {
    expect(calcProductHHI([])).toBe(0);
  });
});

describe('calcTop1ProductPct', () => {
  it('should return top 1 product share', () => {
    const products = [
      makeProduct({ total_sales: 700_000 }),
      makeProduct({ total_sales: 300_000 }),
    ];
    expect(calcTop1ProductPct(products)).toBeCloseTo(0.70, 2);
  });

  it('should return 0 for empty products', () => {
    expect(calcTop1ProductPct([])).toBe(0);
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcClientConcentrationSubScore', () => {
  it('should return high score for diversified clients', () => {
    expect(calcClientConcentrationSubScore(800, 0.15, 0.40)).toBe(100);
  });

  it('should return low score for highly concentrated clients', () => {
    const score = calcClientConcentrationSubScore(3000, 0.55, 0.80);
    expect(score).toBeLessThan(30);
  });

  it('should return moderate score for moderate concentration', () => {
    const score = calcClientConcentrationSubScore(1200, 0.30, 0.60);
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThan(90);
  });
});

describe('calcSupplierConcentrationSubScore', () => {
  it('should return high score for diversified suppliers', () => {
    expect(calcSupplierConcentrationSubScore(800, 0.20, 0.45)).toBe(100);
  });

  it('should return low score for concentrated suppliers', () => {
    const score = calcSupplierConcentrationSubScore(3000, 0.50, 0.80);
    expect(score).toBeLessThan(30);
  });
});

describe('calcGovernmentDependencySubScore', () => {
  it('should return 100 for low government dependency', () => {
    expect(calcGovernmentDependencySubScore(0.05)).toBe(100);
  });

  it('should return 40 for 50% government dependency', () => {
    expect(calcGovernmentDependencySubScore(0.50)).toBe(40);
  });

  it('should return 10 for very high government dependency', () => {
    expect(calcGovernmentDependencySubScore(0.80)).toBe(10);
  });
});

describe('calcProductDiversificationSubScore', () => {
  it('should return high score for diversified products', () => {
    expect(calcProductDiversificationSubScore(800, 0.25)).toBe(100);
  });

  it('should return low score for concentrated products', () => {
    const score = calcProductDiversificationSubScore(3000, 0.70);
    expect(score).toBeLessThan(30);
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
  it('should flag high client HHI', () => {
    const flags = generateRiskFlags(2000, 800, 0.30, 0.60, 0.30, 0.10, 0.40);
    expect(flags.some((f) => f.code === 'high_client_hhi')).toBe(true);
  });

  it('should flag high supplier HHI', () => {
    const flags = generateRiskFlags(800, 2000, 0.20, 0.50, 0.30, 0.10, 0.40);
    expect(flags.some((f) => f.code === 'high_supplier_hhi')).toBe(true);
  });

  it('should flag top 1 client risk at 40%', () => {
    const flags = generateRiskFlags(800, 800, 0.40, 0.60, 0.30, 0.10, 0.40);
    expect(flags.some((f) => f.code === 'top1_client_risk')).toBe(true);
  });

  it('should flag top 1 client high risk at 55%', () => {
    const flags = generateRiskFlags(800, 800, 0.55, 0.60, 0.30, 0.10, 0.40);
    expect(flags.some((f) => f.code === 'top1_client_high_risk')).toBe(true);
  });

  it('should flag top 3 clients alert at 75%', () => {
    const flags = generateRiskFlags(800, 800, 0.30, 0.75, 0.30, 0.10, 0.40);
    expect(flags.some((f) => f.code === 'top3_clients_alert')).toBe(true);
  });

  it('should flag operational dependency risk', () => {
    const flags = generateRiskFlags(800, 800, 0.20, 0.50, 0.45, 0.10, 0.40);
    expect(flags.some((f) => f.code === 'operational_dependency_risk')).toBe(true);
  });

  it('should flag government dependency', () => {
    const flags = generateRiskFlags(800, 800, 0.20, 0.50, 0.30, 0.55, 0.40);
    expect(flags.some((f) => f.code === 'government_dependency')).toBe(true);
  });

  it('should flag product concentration risk', () => {
    const flags = generateRiskFlags(800, 800, 0.20, 0.50, 0.30, 0.10, 0.65);
    expect(flags.some((f) => f.code === 'product_concentration_risk')).toBe(true);
  });

  it('should return no flags for healthy metrics', () => {
    const flags = generateRiskFlags(800, 800, 0.20, 0.50, 0.30, 0.10, 0.40);
    expect(flags.length).toBe(0);
  });
});

// ============================================================
// Trend analysis tests
// ============================================================

describe('analyzeTrends', () => {
  it('should return empty for single period', () => {
    expect(analyzeTrends([makeDiversifiedPeriod('2024-01')])).toHaveLength(0);
  });

  it('should return trends for multiple periods', () => {
    const periods = [
      makeDiversifiedPeriod('2024-01'),
      makeDiversifiedPeriod('2024-02'),
      makeDiversifiedPeriod('2024-03'),
    ];
    const trends = analyzeTrends(periods);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]!.metric_name).toBe('hhi_clients');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runNetworkEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runNetworkEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('network');
  });

  it('should return blocked when periods array is empty', async () => {
    const result = await runNetworkEngine({
      ...baseInput,
      syntage_data: { periods: [] },
    });
    expect(result.module_status).toBe('blocked');
  });

  it('should calculate a healthy score for diversified network', async () => {
    const periods = [
      makeDiversifiedPeriod('2024-01'),
      makeDiversifiedPeriod('2024-02'),
      makeDiversifiedPeriod('2024-03'),
    ];
    const result = await runNetworkEngine({
      ...baseInput,
      syntage_data: { periods },
    });
    expect(result.module_status).toBe('pass');
    expect(result.module_score).toBeGreaterThan(50);
    expect(result.module_grade).toMatch(/^[ABC]$/);
    expect(result.key_metrics['hhi_clients']).toBeDefined();
    expect(result.key_metrics['hhi_suppliers']).toBeDefined();
    expect(result.key_metrics['top1_client_pct']).toBeDefined();
    expect(result.key_metrics['government_revenue_pct']).toBeDefined();
  });

  it('should flag concentrated client network', async () => {
    const period: NetworkPeriod = {
      period: '2024-01',
      clients: [
        makeClient({ rfc: 'BIG1', name: 'Big Client', total_amount: 800_000 }),
        makeClient({ rfc: 'SM1', name: 'Small 1', total_amount: 100_000 }),
        makeClient({ rfc: 'SM2', name: 'Small 2', total_amount: 100_000 }),
      ],
      suppliers: [
        makeSupplier({ total_amount: 200_000 }),
        makeSupplier({ rfc: 'SUP2', name: 'Supplier B', total_amount: 200_000 }),
      ],
      products: [
        makeProduct({ total_sales: 500_000 }),
        makeProduct({ product_code: 'P002', product_name: 'Product B', total_sales: 500_000 }),
      ],
      financial_institutions: [],
      total_revenue: 1_000_000,
      total_expenses: 400_000,
    };
    const result = await runNetworkEngine({
      ...baseInput,
      syntage_data: { periods: [period] },
    });
    expect(result.risk_flags.some((f) => f.code === 'top1_client_high_risk')).toBe(true);
  });

  it('should flag government dependency', async () => {
    const period: NetworkPeriod = {
      period: '2024-01',
      clients: [
        makeClient({ rfc: 'GOV1', name: 'Government Agency', total_amount: 600_000, is_government: true }),
        makeClient({ rfc: 'PRI1', name: 'Private Co', total_amount: 400_000 }),
      ],
      suppliers: [
        makeSupplier({ total_amount: 300_000 }),
        makeSupplier({ rfc: 'SUP2', name: 'Supplier B', total_amount: 300_000 }),
      ],
      products: [
        makeProduct({ total_sales: 500_000 }),
        makeProduct({ product_code: 'P002', product_name: 'Product B', total_sales: 500_000 }),
      ],
      financial_institutions: [],
      total_revenue: 1_000_000,
      total_expenses: 600_000,
    };
    const result = await runNetworkEngine({
      ...baseInput,
      syntage_data: { periods: [period] },
    });
    expect(result.risk_flags.some((f) => f.code === 'government_dependency')).toBe(true);
  });
});
