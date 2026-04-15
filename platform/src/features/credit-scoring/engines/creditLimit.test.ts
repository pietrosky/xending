import { describe, it, expect } from 'vitest';
import {
  calcLimitByFlow,
  calcLimitBySales,
  calcLimitByEBITDA,
  calcLimitByGuarantee,
  calcLimitByPortfolio,
  determineFinalLimit,
  calcCoverageScore,
  generateRiskFlags,
  runCreditLimitEngine,
} from './creditLimit';
import type { CreditLimitResult } from './creditLimit';
import type { MetricValue, EngineInput, EngineOutput } from '../types/engine.types';

// ============================================================
// Helpers
// ============================================================

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { credit_limit: 0 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function metric(name: string, value: number, unit = '$'): MetricValue {
  return {
    name, label: name, value, unit,
    source: 'test', interpretation: '', impact_on_score: 'neutral',
  };
}

function makeEngineOutput(keyMetrics: Record<string, MetricValue>): EngineOutput {
  return {
    engine_name: 'test',
    module_status: 'pass',
    module_score: 70,
    module_max_score: 100,
    module_grade: 'B',
    risk_flags: [],
    key_metrics: keyMetrics,
    benchmark_comparison: {},
    trends: [],
    explanation: '',
    recommended_actions: [],
    created_at: new Date().toISOString(),
  };
}

// ============================================================
// calcLimitByFlow
// ============================================================

describe('calcLimitByFlow', () => {
  it('returns max_sustainable_amount when available', () => {
    const metrics = {
      max_sustainable_amount: metric('max_sustainable_amount', 2_000_000),
      max_payment_capacity: metric('max_payment_capacity', 100_000),
    };
    expect(calcLimitByFlow(metrics, 24)).toBe(2_000_000);
  });

  it('falls back to max_payment_capacity * term when no sustainable amount', () => {
    const metrics = {
      max_payment_capacity: metric('max_payment_capacity', 50_000),
    };
    expect(calcLimitByFlow(metrics, 24)).toBe(1_200_000);
  });

  it('returns 0 when no metrics provided', () => {
    expect(calcLimitByFlow(undefined, 24)).toBe(0);
  });

  it('returns 0 when metrics have zero values', () => {
    const metrics = {
      max_sustainable_amount: metric('max_sustainable_amount', 0),
      max_payment_capacity: metric('max_payment_capacity', 0),
    };
    expect(calcLimitByFlow(metrics, 24)).toBe(0);
  });
});

// ============================================================
// calcLimitBySales
// ============================================================

describe('calcLimitBySales', () => {
  it('returns 20% of annual sales by default', () => {
    const metrics = { total_revenue: metric('total_revenue', 10_000_000) };
    expect(calcLimitBySales(metrics)).toBe(2_000_000);
  });

  it('accepts custom sales factor', () => {
    const metrics = { total_revenue: metric('total_revenue', 10_000_000) };
    expect(calcLimitBySales(metrics, 0.10)).toBe(1_000_000);
  });

  it('returns 0 when no SAT metrics', () => {
    expect(calcLimitBySales(undefined)).toBe(0);
  });
});

// ============================================================
// calcLimitByEBITDA
// ============================================================

describe('calcLimitByEBITDA', () => {
  it('returns 2x EBITDA by default', () => {
    const metrics = { ebitda: metric('ebitda', 3_000_000) };
    expect(calcLimitByEBITDA(metrics)).toBe(6_000_000);
  });

  it('accepts custom multiplier', () => {
    const metrics = { ebitda: metric('ebitda', 3_000_000) };
    expect(calcLimitByEBITDA(metrics, 1.5)).toBe(4_500_000);
  });

  it('returns 0 for negative EBITDA', () => {
    const metrics = { ebitda: metric('ebitda', -500_000) };
    expect(calcLimitByEBITDA(metrics)).toBe(0);
  });

  it('returns 0 when no cashflow metrics', () => {
    expect(calcLimitByEBITDA(undefined)).toBe(0);
  });
});

// ============================================================
// calcLimitByGuarantee
// ============================================================

describe('calcLimitByGuarantee', () => {
  it('divides net eligible by required coverage', () => {
    const metrics = {
      valor_elegible_neto: metric('valor_elegible_neto', 4_000_000),
      required_coverage: metric('required_coverage', 2.0),
    };
    expect(calcLimitByGuarantee(metrics)).toBe(2_000_000);
  });

  it('uses default 2.0 coverage when not specified', () => {
    const metrics = {
      valor_elegible_neto: metric('valor_elegible_neto', 3_000_000),
    };
    expect(calcLimitByGuarantee(metrics)).toBe(1_500_000);
  });

  it('returns 0 when no guarantee metrics', () => {
    expect(calcLimitByGuarantee(undefined)).toBe(0);
  });
});

// ============================================================
// calcLimitByPortfolio
// ============================================================

describe('calcLimitByPortfolio', () => {
  it('returns portfolio size * concentration cap', () => {
    const metrics = { total_portfolio_size: metric('total_portfolio_size', 100_000_000) };
    expect(calcLimitByPortfolio(metrics)).toBe(10_000_000);
  });

  it('accepts custom cap', () => {
    const metrics = { total_portfolio_size: metric('total_portfolio_size', 100_000_000) };
    expect(calcLimitByPortfolio(metrics, 0.05)).toBe(5_000_000);
  });

  it('returns 0 when no portfolio metrics', () => {
    expect(calcLimitByPortfolio(undefined)).toBe(0);
  });
});

// ============================================================
// determineFinalLimit
// ============================================================

describe('determineFinalLimit', () => {
  it('picks the minimum positive limit', () => {
    const result = determineFinalLimit({
      limit_by_flow: 3_000_000,
      limit_by_sales: 2_000_000,
      limit_by_ebitda: 6_000_000,
      limit_by_guarantee: 1_800_000,
      limit_by_portfolio: 10_000_000,
    });
    expect(result.final_limit).toBe(1_800_000);
    expect(result.binding_constraint).toBe('limit_by_guarantee');
  });

  it('ignores zero limits', () => {
    const result = determineFinalLimit({
      limit_by_flow: 3_000_000,
      limit_by_sales: 0,
      limit_by_ebitda: 0,
      limit_by_guarantee: 0,
      limit_by_portfolio: 0,
    });
    expect(result.final_limit).toBe(3_000_000);
    expect(result.binding_constraint).toBe('limit_by_flow');
  });

  it('returns 0 when all limits are 0', () => {
    const result = determineFinalLimit({
      limit_by_flow: 0,
      limit_by_sales: 0,
      limit_by_ebitda: 0,
      limit_by_guarantee: 0,
      limit_by_portfolio: 0,
    });
    expect(result.final_limit).toBe(0);
    expect(result.binding_constraint).toBe('limit_by_flow');
  });

  it('handles single positive limit', () => {
    const result = determineFinalLimit({
      limit_by_flow: 0,
      limit_by_sales: 5_000_000,
      limit_by_ebitda: 0,
      limit_by_guarantee: 0,
      limit_by_portfolio: 0,
    });
    expect(result.final_limit).toBe(5_000_000);
    expect(result.binding_constraint).toBe('limit_by_sales');
  });
});

// ============================================================
// calcCoverageScore
// ============================================================

describe('calcCoverageScore', () => {
  it('returns 100 when limit >= requested', () => {
    expect(calcCoverageScore(3_000_000, 2_000_000)).toBe(100);
  });

  it('returns proportional score when limit < requested', () => {
    expect(calcCoverageScore(1_500_000, 3_000_000)).toBe(50);
  });

  it('returns 0 when limit is 0', () => {
    expect(calcCoverageScore(0, 1_000_000)).toBe(0);
  });

  it('returns 100 when requested is 0', () => {
    expect(calcCoverageScore(500_000, 0)).toBe(100);
  });
});

// ============================================================
// generateRiskFlags
// ============================================================

describe('generateRiskFlags', () => {
  it('flags hard_stop when final_limit is 0', () => {
    const result: CreditLimitResult = {
      limit_by_flow: 0, limit_by_sales: 0, limit_by_ebitda: 0,
      limit_by_guarantee: 0, limit_by_portfolio: 0,
      final_limit: 0, binding_constraint: 'limit_by_flow',
    };
    const flags = generateRiskFlags(result, 1_000_000);
    expect(flags.some((f) => f.code === 'no_credit_capacity')).toBe(true);
    expect(flags.some((f) => f.severity === 'hard_stop')).toBe(true);
  });

  it('flags limit_below_requested when limit < requested', () => {
    const result: CreditLimitResult = {
      limit_by_flow: 1_500_000, limit_by_sales: 2_000_000, limit_by_ebitda: 3_000_000,
      limit_by_guarantee: 1_500_000, limit_by_portfolio: 5_000_000,
      final_limit: 1_500_000, binding_constraint: 'limit_by_flow',
    };
    const flags = generateRiskFlags(result, 2_000_000);
    expect(flags.some((f) => f.code === 'limit_below_requested')).toBe(true);
  });

  it('returns no flags when limit covers requested', () => {
    const result: CreditLimitResult = {
      limit_by_flow: 3_000_000, limit_by_sales: 4_000_000, limit_by_ebitda: 5_000_000,
      limit_by_guarantee: 3_000_000, limit_by_portfolio: 10_000_000,
      final_limit: 3_000_000, binding_constraint: 'limit_by_flow',
    };
    const flags = generateRiskFlags(result, 2_000_000);
    expect(flags.length).toBe(0);
  });
});

// ============================================================
// runCreditLimitEngine (integration)
// ============================================================

describe('runCreditLimitEngine', () => {
  it('calculates all 5 limits and picks the binding one', async () => {
    const cashflowOutput = makeEngineOutput({
      max_sustainable_amount: metric('max_sustainable_amount', 3_200_000),
      max_payment_capacity: metric('max_payment_capacity', 150_000),
      ebitda: metric('ebitda', 1_900_000),
    });
    const satOutput = makeEngineOutput({
      total_revenue: metric('total_revenue', 22_500_000),
    });
    const guaranteeOutput = makeEngineOutput({
      valor_elegible_neto: metric('valor_elegible_neto', 3_600_000),
      required_coverage: metric('required_coverage', 2.0),
    });
    const portfolioOutput = makeEngineOutput({
      total_portfolio_size: metric('total_portfolio_size', 80_000_000),
    });

    const input: EngineInput & { requested_amount: number; term_months: number } = {
      application_id: 'test-app-1',
      policy_config: defaultPolicyConfig,
      other_engine_results: {
        cashflow: cashflowOutput,
        sat_facturacion: satOutput,
        guarantee: guaranteeOutput,
        portfolio: portfolioOutput,
      },
      requested_amount: 2_000_000,
      term_months: 24,
    };

    const result = await runCreditLimitEngine(input);

    expect(result.engine_name).toBe('credit_limit');
    // limit_by_guarantee = 3_600_000 / 2 = 1_800_000 is the binding
    expect(result.key_metrics['final_limit']?.value).toBe(1_800_000);
    expect(result.key_metrics['binding_constraint']?.value).toBe(1_800_000);
    expect(result.module_score).toBe(90); // 1.8M / 2M = 90%
  });

  it('returns blocked status when no engine results available', async () => {
    const input: EngineInput = {
      application_id: 'test-app-2',
      policy_config: defaultPolicyConfig,
      other_engine_results: {},
    };

    const result = await runCreditLimitEngine(input);

    expect(result.module_score).toBe(0);
    expect(result.module_status).toBe('blocked');
    expect(result.risk_flags.some((f) => f.code === 'no_credit_capacity')).toBe(true);
  });

  it('handles partial data gracefully', async () => {
    const cashflowOutput = makeEngineOutput({
      max_sustainable_amount: metric('max_sustainable_amount', 5_000_000),
      ebitda: metric('ebitda', 2_000_000),
    });

    const input: EngineInput & { requested_amount: number } = {
      application_id: 'test-app-3',
      policy_config: defaultPolicyConfig,
      other_engine_results: { cashflow: cashflowOutput },
      requested_amount: 3_000_000,
    };

    const result = await runCreditLimitEngine(input);

    // Only flow and ebitda limits are positive
    expect(result.key_metrics['limit_by_flow']?.value).toBe(5_000_000);
    expect(result.key_metrics['limit_by_ebitda']?.value).toBe(4_000_000);
    expect(result.key_metrics['limit_by_sales']?.value).toBe(0);
    // Binding = ebitda at 4M (min of 5M and 4M)
    expect(result.key_metrics['final_limit']?.value).toBe(4_000_000);
    expect(result.module_score).toBe(100); // 4M > 3M requested
  });
});
