import { describe, it, expect } from 'vitest';
import {
  calcEBITDA,
  calcEBITDAMargin,
  calcFreeCashFlow,
  calcMonthlyPayment,
  calcDSCR,
  calcDSCRProforma,
  calcMaxPaymentCapacity,
  calcMaxSustainableAmount,
  calcEBITDASubScore,
  calcDSCRSubScore,
  calcScenarioSubScore,
  generateScenarios,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runCashFlowEngine,
} from './cashflow';
import type { CashFlowPeriod, ScenarioResult } from './cashflow';
import type { EngineInput } from '../types/engine.types';

// ============================================================
// Test fixtures
// ============================================================

const defaultPolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: { cashflow: 0.16 },
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makePeriod(overrides: Partial<CashFlowPeriod> = {}): CashFlowPeriod {
  return {
    fiscal_year: 2024,
    revenue: 10_000_000,
    costs: 6_000_000,
    operating_expenses: 1_500_000,
    depreciation: 500_000,
    amortization: 100_000,
    interest_expense: 300_000,
    taxes: 600_000,
    capex: 400_000,
    ...overrides,
  };
}

// ============================================================
// Pure calculation tests
// ============================================================

describe('calcEBITDA', () => {
  it('should calculate EBITDA correctly', () => {
    const p = makePeriod();
    // operating_income = 10M - 6M - 1.5M = 2.5M, + 500K + 100K = 3.1M
    expect(calcEBITDA(p)).toBe(3_100_000);
  });

  it('should handle zero revenue', () => {
    const p = makePeriod({ revenue: 0, costs: 0, operating_expenses: 0 });
    expect(calcEBITDA(p)).toBe(600_000); // just depreciation + amortization
  });
});

describe('calcEBITDAMargin', () => {
  it('should calculate margin as EBITDA / revenue', () => {
    const p = makePeriod();
    expect(calcEBITDAMargin(p)).toBeCloseTo(0.31, 2);
  });

  it('should return 0 for zero revenue', () => {
    expect(calcEBITDAMargin(makePeriod({ revenue: 0 }))).toBe(0);
  });
});

describe('calcFreeCashFlow', () => {
  it('should calculate FCF = operating cash flow - capex', () => {
    const p = makePeriod();
    // OCF = EBITDA(3.1M) - taxes(600K) = 2.5M, FCF = 2.5M - 400K = 2.1M
    expect(calcFreeCashFlow(p)).toBe(2_100_000);
  });
});

describe('calcMonthlyPayment', () => {
  it('should calculate standard amortization payment', () => {
    const payment = calcMonthlyPayment(1_000_000, 0.12, 24);
    expect(payment).toBeGreaterThan(40_000);
    expect(payment).toBeLessThan(50_000);
  });

  it('should handle zero rate as simple division', () => {
    expect(calcMonthlyPayment(120_000, 0, 12)).toBe(10_000);
  });

  it('should return 0 for zero term', () => {
    expect(calcMonthlyPayment(100_000, 0.12, 0)).toBe(0);
  });
});

describe('calcDSCR', () => {
  it('should calculate FCF / debt service', () => {
    expect(calcDSCR(2_000_000, 1_000_000)).toBe(2.0);
  });

  it('should cap at 10 when no debt service but positive FCF', () => {
    expect(calcDSCR(500_000, 0)).toBe(10);
  });

  it('should return 0 when no debt and no FCF', () => {
    expect(calcDSCR(0, 0)).toBe(0);
  });
});

describe('calcDSCRProforma', () => {
  it('should use total of existing + projected debt service', () => {
    expect(calcDSCRProforma(3_000_000, 1_000_000, 500_000)).toBe(2.0);
  });
});

describe('calcMaxPaymentCapacity', () => {
  it('should return available monthly capacity', () => {
    // (2M - 1.2M) / 12 = 66,666.67
    expect(calcMaxPaymentCapacity(2_000_000, 1_200_000)).toBeCloseTo(66_666.67, 0);
  });

  it('should return 0 when FCF less than debt service', () => {
    expect(calcMaxPaymentCapacity(500_000, 800_000)).toBe(0);
  });
});

describe('calcMaxSustainableAmount', () => {
  it('should return positive amount when capacity exists', () => {
    const amount = calcMaxSustainableAmount(2_000_000, 600_000, 0.12, 24);
    expect(amount).toBeGreaterThan(0);
  });

  it('should return 0 when no capacity', () => {
    expect(calcMaxSustainableAmount(500_000, 800_000, 0.12, 24)).toBe(0);
  });
});

// ============================================================
// Sub-score tests
// ============================================================

describe('calcEBITDASubScore', () => {
  it('should return 100 for high margin (>=25%)', () => {
    expect(calcEBITDASubScore(makePeriod())).toBe(100); // 31% margin
  });

  it('should return 5 for negative EBITDA', () => {
    expect(calcEBITDASubScore(makePeriod({ revenue: 100, costs: 200 }))).toBe(5);
  });
});

describe('calcDSCRSubScore', () => {
  it('should return 100 for strong DSCR values', () => {
    expect(calcDSCRSubScore(2.0, 1.8)).toBe(100);
  });

  it('should return 5 for critical DSCR values', () => {
    expect(calcDSCRSubScore(0.5, 0.4)).toBe(5);
  });
});

describe('calcScenarioSubScore', () => {
  it('should score based on base and stress viability', () => {
    const scenarios: ScenarioResult[] = [
      { scenario_type: 'base', label: '', revenue: 0, ebitda: 0, free_cash_flow: 0, dscr_proforma: 1.6, viable: true },
      { scenario_type: 'stress', label: '', revenue: 0, ebitda: 0, free_cash_flow: 0, dscr_proforma: 1.3, viable: true },
    ];
    expect(calcScenarioSubScore(scenarios)).toBe(100);
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
});

describe('generateRiskFlags', () => {
  it('should flag DSCR proforma hard stop when < 1.0', () => {
    const p = makePeriod();
    const flags = generateRiskFlags(p, 1.5, 0.8, []);
    expect(flags.some((f) => f.code === 'dscr_proforma_hard_stop')).toBe(true);
  });

  it('should flag negative EBITDA', () => {
    const p = makePeriod({ revenue: 100, costs: 500 });
    const flags = generateRiskFlags(p, 0, 0, []);
    expect(flags.some((f) => f.code === 'negative_ebitda')).toBe(true);
  });

  it('should return no flags for healthy metrics', () => {
    const p = makePeriod();
    const flags = generateRiskFlags(p, 2.0, 1.6, [
      { scenario_type: 'base', label: '', revenue: 0, ebitda: 0, free_cash_flow: 0, dscr_proforma: 1.6, viable: true },
      { scenario_type: 'stress', label: '', revenue: 0, ebitda: 0, free_cash_flow: 0, dscr_proforma: 1.3, viable: true },
    ]);
    expect(flags.length).toBe(0);
  });
});

// ============================================================
// Scenario generation tests
// ============================================================

describe('generateScenarios', () => {
  it('should generate base and stress scenarios', () => {
    const p = makePeriod();
    const scenarios = generateScenarios(p, 600_000, 400_000);
    expect(scenarios).toHaveLength(2);
    expect(scenarios[0]!.scenario_type).toBe('base');
    expect(scenarios[1]!.scenario_type).toBe('stress');
  });

  it('should reduce revenue by 20% in stress scenario', () => {
    const p = makePeriod();
    const scenarios = generateScenarios(p, 600_000, 400_000);
    expect(scenarios[1]!.revenue).toBe(p.revenue * 0.8);
  });
});

// ============================================================
// Trend analysis tests
// ============================================================

describe('analyzeTrends', () => {
  it('should return empty for single period', () => {
    expect(analyzeTrends([makePeriod()], 600_000, 400_000)).toHaveLength(0);
  });

  it('should return trends for multiple periods', () => {
    const periods = [
      makePeriod({ fiscal_year: 2022, revenue: 8_000_000 }),
      makePeriod({ fiscal_year: 2023, revenue: 9_000_000 }),
      makePeriod({ fiscal_year: 2024, revenue: 10_000_000 }),
    ];
    const trends = analyzeTrends(periods, 600_000, 400_000);
    expect(trends.length).toBeGreaterThan(0);
    expect(trends[0]!.metric_name).toBe('ebitda_margin');
  });
});

// ============================================================
// Main engine integration tests
// ============================================================

describe('runCashFlowEngine', () => {
  const baseInput: EngineInput = {
    application_id: 'test-app-001',
    policy_config: defaultPolicyConfig,
  };

  it('should return blocked when no data provided', async () => {
    const result = await runCashFlowEngine(baseInput);
    expect(result.module_status).toBe('blocked');
    expect(result.engine_name).toBe('cashflow');
  });

  it('should return blocked when periods array is empty', async () => {
    const result = await runCashFlowEngine({
      ...baseInput,
      syntage_data: {
        periods: [],
        debt_info: { existing_debt_service_monthly: 0 },
        loan_request: { requested_amount: 1_000_000, term_months: 24, annual_interest_rate: 0.12, currency: 'MXN' },
      },
    });
    expect(result.module_status).toBe('blocked');
  });

  it('should calculate a healthy score for strong cash flow', async () => {
    const result = await runCashFlowEngine({
      ...baseInput,
      syntage_data: {
        periods: [
          makePeriod({ fiscal_year: 2023 }),
          makePeriod({ fiscal_year: 2024 }),
        ],
        debt_info: { existing_debt_service_monthly: 30_000 },
        loan_request: { requested_amount: 1_000_000, term_months: 24, annual_interest_rate: 0.12, currency: 'MXN' },
      },
    });
    expect(result.module_status).toBe('pass');
    expect(result.module_score).toBeGreaterThan(60);
    expect(result.module_grade).toMatch(/^[AB]$/);
    expect(result.key_metrics['dscr_proforma']).toBeDefined();
  });

  it('should trigger hard stop for DSCR proforma < 1.0', async () => {
    const result = await runCashFlowEngine({
      ...baseInput,
      syntage_data: {
        periods: [
          makePeriod({ fiscal_year: 2023, revenue: 1_000_000, costs: 800_000, operating_expenses: 150_000, capex: 20_000, taxes: 10_000 }),
          makePeriod({ fiscal_year: 2024, revenue: 1_000_000, costs: 800_000, operating_expenses: 150_000, capex: 20_000, taxes: 10_000 }),
        ],
        debt_info: { existing_debt_service_monthly: 5_000 },
        loan_request: { requested_amount: 5_000_000, term_months: 12, annual_interest_rate: 0.15, currency: 'MXN' },
      },
    });
    expect(result.module_status).toBe('fail');
    expect(result.risk_flags.some((f) => f.code === 'dscr_proforma_hard_stop')).toBe(true);
  });
});
