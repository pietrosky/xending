import { describe, it, expect } from 'vitest';
import type { RazonesFinancieras } from '../api/syntageClient';
import type { EngineInput, PolicyConfig } from '../types/engine.types';
import {
  calcCurrentRatio,
  calcQuickRatio,
  calcDebtToEquity,
  calcWorkingCapital,
  calcGrossMargin,
  calcOperatingMargin,
  calcNetMargin,
  calcInterestCoverage,
  calcRevenueGrowth,
  calcLiquiditySubScore,
  calcProfitabilitySubScore,
  calcLeverageSubScore,
  calcCoverageSubScore,
  calcRelatedPartiesSubScore,
  calcCrossValidationSubScore,
  crossValidateRatios,
  scoreToGrade,
  scoreToStatus,
  generateRiskFlags,
  analyzeTrends,
  runFinancialEngine,
} from './financial';
import type { BalanceData, IncomeData, RelatedPartiesData, FinancialInput } from './financial';

// ============================================================
// Test helpers
// ============================================================

const POLICY_CONFIG: PolicyConfig = {
  guarantee_base_ratio: 2,
  score_weights: {},
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeBalance(overrides: Partial<BalanceData> = {}): BalanceData {
  return {
    fiscal_year: 2024,
    total_assets: 1000000,
    current_assets: 500000,
    cash: 100000,
    accounts_receivable: 200000,
    inventory: 100000,
    fixed_assets: 500000,
    total_liabilities: 400000,
    current_liabilities: 200000,
    long_term_debt: 200000,
    equity: 600000,
    ...overrides,
  };
}

function makeIncome(overrides: Partial<IncomeData> = {}): IncomeData {
  return {
    fiscal_year: 2024,
    revenue: 2000000,
    cost_of_goods: 1200000,
    gross_profit: 800000,
    operating_expenses: 400000,
    operating_income: 400000,
    interest_expense: 50000,
    net_income: 250000,
    ebitda: 500000,
    depreciation: 100000,
    ...overrides,
  };
}

function makeRelatedParties(overrides: Partial<RelatedPartiesData> = {}): RelatedPartiesData {
  return {
    total_exposure: 100000,
    total_revenue: 2000000,
    exposure_pct: 0.05,
    parties: [],
    ...overrides,
  };
}

function makeRazones(overrides: Partial<RazonesFinancieras> = {}): RazonesFinancieras {
  return {
    liquidez: { coeficiente_solvencia: 2.5, prueba_acida: 2.0 },
    actividad: { rotacion_cxc: 8.0, rotacion_cxp: 6.0 },
    rentabilidad: { margen_bruto: 0.40 },
    apalancamiento: { coeficiente_endeudamiento: 0.67 },
    cobertura: { cobertura_intereses: 3.0, dscr: 1.5 },
    raw: {},
    ...overrides,
  };
}

function makeFinancialInput(overrides: Partial<FinancialInput> = {}): FinancialInput {
  return {
    razones_financieras: makeRazones(),
    balance_data: [makeBalance()],
    income_data: [makeIncome()],
    related_parties_data: makeRelatedParties(),
    ...overrides,
  };
}

function makeEngineInput(data: FinancialInput): EngineInput {
  return {
    application_id: 'app-001',
    syntage_data: data,
    policy_config: POLICY_CONFIG,
  };
}

// ============================================================
// Unit tests: Balance sheet calculations
// ============================================================

describe('calcCurrentRatio', () => {
  it('calculates correctly', () => {
    expect(calcCurrentRatio(makeBalance())).toBe(2.5);
  });

  it('handles zero liabilities', () => {
    expect(calcCurrentRatio(makeBalance({ current_liabilities: 0 }))).toBe(10);
  });

  it('handles zero assets and zero liabilities', () => {
    expect(calcCurrentRatio(makeBalance({ current_assets: 0, current_liabilities: 0 }))).toBe(0);
  });
});

describe('calcQuickRatio', () => {
  it('excludes inventory', () => {
    const b = makeBalance({ current_assets: 500000, inventory: 100000, current_liabilities: 200000 });
    expect(calcQuickRatio(b)).toBe(2.0);
  });

  it('handles zero liabilities', () => {
    expect(calcQuickRatio(makeBalance({ current_liabilities: 0 }))).toBe(10);
  });
});

describe('calcDebtToEquity', () => {
  it('calculates correctly', () => {
    const b = makeBalance({ total_liabilities: 400000, equity: 600000 });
    expect(calcDebtToEquity(b)).toBeCloseTo(0.6667, 3);
  });

  it('handles zero equity', () => {
    expect(calcDebtToEquity(makeBalance({ equity: 0, total_liabilities: 100 }))).toBe(10);
  });
});

describe('calcWorkingCapital', () => {
  it('calculates positive working capital', () => {
    expect(calcWorkingCapital(makeBalance())).toBe(300000);
  });

  it('calculates negative working capital', () => {
    expect(calcWorkingCapital(makeBalance({ current_assets: 100000, current_liabilities: 200000 }))).toBe(-100000);
  });
});

// ============================================================
// Unit tests: Income statement calculations
// ============================================================

describe('calcGrossMargin', () => {
  it('calculates correctly', () => {
    expect(calcGrossMargin(makeIncome())).toBe(0.4);
  });

  it('returns 0 for zero revenue', () => {
    expect(calcGrossMargin(makeIncome({ revenue: 0 }))).toBe(0);
  });
});

describe('calcOperatingMargin', () => {
  it('calculates correctly', () => {
    expect(calcOperatingMargin(makeIncome())).toBe(0.2);
  });
});

describe('calcNetMargin', () => {
  it('calculates correctly', () => {
    expect(calcNetMargin(makeIncome())).toBe(0.125);
  });
});

describe('calcInterestCoverage', () => {
  it('calculates correctly', () => {
    expect(calcInterestCoverage(makeIncome())).toBe(10);
  });

  it('handles zero interest expense', () => {
    expect(calcInterestCoverage(makeIncome({ interest_expense: 0, ebitda: 500000 }))).toBe(10);
  });

  it('handles zero ebitda and zero interest', () => {
    expect(calcInterestCoverage(makeIncome({ interest_expense: 0, ebitda: 0 }))).toBe(0);
  });
});

describe('calcRevenueGrowth', () => {
  it('calculates growth between two years', () => {
    const incomes = [
      makeIncome({ fiscal_year: 2023, revenue: 1000000 }),
      makeIncome({ fiscal_year: 2024, revenue: 1200000 }),
    ];
    expect(calcRevenueGrowth(incomes)).toBeCloseTo(0.2, 4);
  });

  it('returns 0 for single year', () => {
    expect(calcRevenueGrowth([makeIncome()])).toBe(0);
  });

  it('handles negative growth', () => {
    const incomes = [
      makeIncome({ fiscal_year: 2023, revenue: 1000000 }),
      makeIncome({ fiscal_year: 2024, revenue: 800000 }),
    ];
    expect(calcRevenueGrowth(incomes)).toBeCloseTo(-0.2, 4);
  });
});

// ============================================================
// Unit tests: Sub-scores
// ============================================================

describe('calcLiquiditySubScore', () => {
  it('returns high score for healthy balance', () => {
    expect(calcLiquiditySubScore(makeBalance())).toBeGreaterThanOrEqual(80);
  });

  it('returns low score for poor liquidity', () => {
    const b = makeBalance({ current_assets: 50000, current_liabilities: 200000, inventory: 10000 });
    expect(calcLiquiditySubScore(b)).toBeLessThan(30);
  });
});

describe('calcProfitabilitySubScore', () => {
  it('returns high score for strong margins', () => {
    const score = calcProfitabilitySubScore(makeBalance(), [makeIncome()]);
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('returns 0 for empty incomes', () => {
    expect(calcProfitabilitySubScore(makeBalance(), [])).toBe(0);
  });

  it('returns low score for negative margins', () => {
    const income = makeIncome({
      gross_profit: -100000,
      operating_income: -200000,
      net_income: -300000,
    });
    expect(calcProfitabilitySubScore(makeBalance(), [income])).toBeLessThan(30);
  });
});

describe('calcLeverageSubScore', () => {
  it('returns high score for low leverage', () => {
    expect(calcLeverageSubScore(makeBalance({ total_liabilities: 100000, equity: 900000 }))).toBeGreaterThanOrEqual(85);
  });

  it('returns low score for high leverage', () => {
    expect(calcLeverageSubScore(makeBalance({ total_liabilities: 900000, equity: 100000 }))).toBeLessThanOrEqual(15);
  });
});

describe('calcCoverageSubScore', () => {
  it('returns 100 for strong coverage', () => {
    expect(calcCoverageSubScore(makeIncome({ ebitda: 500000, interest_expense: 50000 }))).toBe(100);
  });

  it('returns low score for weak coverage', () => {
    expect(calcCoverageSubScore(makeIncome({ ebitda: 50000, interest_expense: 50000 }))).toBeLessThanOrEqual(20);
  });
});

describe('calcRelatedPartiesSubScore', () => {
  it('returns 100 for low exposure', () => {
    expect(calcRelatedPartiesSubScore(makeRelatedParties({ exposure_pct: 0.03 }))).toBe(100);
  });

  it('returns low score for high exposure', () => {
    expect(calcRelatedPartiesSubScore(makeRelatedParties({ exposure_pct: 0.60 }))).toBeLessThanOrEqual(5);
  });
});

// ============================================================
// Unit tests: Cross-validation
// ============================================================

describe('crossValidateRatios', () => {
  it('detects matching ratios', () => {
    const balance = makeBalance();
    const income = makeIncome();
    const razones = makeRazones({
      liquidez: { coeficiente_solvencia: 2.5, prueba_acida: 2.0 },
      rentabilidad: { margen_bruto: 0.4 },
      apalancamiento: { coeficiente_endeudamiento: 0.6667 },
    });
    const results = crossValidateRatios(razones, balance, income);
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.match)).toBe(true);
  });

  it('detects mismatches', () => {
    const balance = makeBalance();
    const income = makeIncome();
    const razones = makeRazones({
      liquidez: { coeficiente_solvencia: 5.0, prueba_acida: 4.0 },
      rentabilidad: { margen_bruto: 0.80 },
      apalancamiento: { coeficiente_endeudamiento: 3.0 },
    });
    const results = crossValidateRatios(razones, balance, income);
    const mismatches = results.filter((r) => !r.match);
    expect(mismatches.length).toBeGreaterThan(0);
  });
});

describe('calcCrossValidationSubScore', () => {
  it('returns high score when ratios match', () => {
    const balance = makeBalance();
    const income = makeIncome();
    const razones = makeRazones({
      liquidez: { coeficiente_solvencia: 2.5, prueba_acida: 2.0 },
      rentabilidad: { margen_bruto: 0.4 },
      apalancamiento: { coeficiente_endeudamiento: 0.6667 },
    });
    expect(calcCrossValidationSubScore(razones, balance, income)).toBeGreaterThanOrEqual(80);
  });

  it('returns 70 when no comparable data', () => {
    const razones = makeRazones({ liquidez: {}, rentabilidad: {}, apalancamiento: {} });
    expect(calcCrossValidationSubScore(razones, makeBalance(), makeIncome())).toBe(70);
  });
});

// ============================================================
// Unit tests: scoreToGrade and scoreToStatus
// ============================================================

describe('scoreToGrade', () => {
  it('maps scores to correct grades', () => {
    expect(scoreToGrade(90)).toBe('A');
    expect(scoreToGrade(70)).toBe('B');
    expect(scoreToGrade(55)).toBe('C');
    expect(scoreToGrade(40)).toBe('D');
    expect(scoreToGrade(20)).toBe('F');
  });
});

describe('scoreToStatus', () => {
  it('returns pass for high score no critical flags', () => {
    expect(scoreToStatus(75, [])).toBe('pass');
  });

  it('returns fail for critical flags', () => {
    expect(scoreToStatus(75, [{ code: 'test', severity: 'critical', message: 'test' }])).toBe('fail');
  });

  it('returns warning for medium score', () => {
    expect(scoreToStatus(45, [])).toBe('warning');
  });

  it('returns fail for low score', () => {
    expect(scoreToStatus(30, [])).toBe('fail');
  });
});

// ============================================================
// Unit tests: generateRiskFlags
// ============================================================

describe('generateRiskFlags', () => {
  it('returns empty for healthy company', () => {
    const flags = generateRiskFlags(makeBalance(), makeIncome(), makeRelatedParties(), []);
    expect(flags).toHaveLength(0);
  });

  it('flags low liquidity', () => {
    const b = makeBalance({ current_assets: 100000, current_liabilities: 200000 });
    const flags = generateRiskFlags(b, makeIncome(), makeRelatedParties(), []);
    expect(flags.some((f) => f.code === 'low_liquidity')).toBe(true);
  });

  it('flags negative working capital', () => {
    const b = makeBalance({ current_assets: 100000, current_liabilities: 200000 });
    const flags = generateRiskFlags(b, makeIncome(), makeRelatedParties(), []);
    expect(flags.some((f) => f.code === 'negative_working_capital')).toBe(true);
  });

  it('flags negative net margin', () => {
    const i = makeIncome({ net_income: -100000 });
    const flags = generateRiskFlags(makeBalance(), i, makeRelatedParties(), []);
    expect(flags.some((f) => f.code === 'negative_margins')).toBe(true);
  });

  it('flags high leverage', () => {
    const b = makeBalance({ total_liabilities: 900000, equity: 100000 });
    const flags = generateRiskFlags(b, makeIncome(), makeRelatedParties(), []);
    expect(flags.some((f) => f.code === 'high_leverage')).toBe(true);
  });

  it('flags high related party exposure', () => {
    const rp = makeRelatedParties({ exposure_pct: 0.35 });
    const flags = generateRiskFlags(makeBalance(), makeIncome(), rp, []);
    expect(flags.some((f) => f.code === 'high_related_party_exposure')).toBe(true);
  });

  it('flags cross-validation mismatch', () => {
    const crossResults = [{ metric: 'current_ratio', syntage_value: 5.0, calculated_value: 2.5, discrepancy_pct: 50, match: false }];
    const flags = generateRiskFlags(makeBalance(), makeIncome(), makeRelatedParties(), crossResults);
    expect(flags.some((f) => f.code === 'ratio_cross_validation_mismatch')).toBe(true);
  });
});

// ============================================================
// Unit tests: analyzeTrends
// ============================================================

describe('analyzeTrends', () => {
  it('returns empty for single year', () => {
    expect(analyzeTrends([makeBalance()], [makeIncome()])).toHaveLength(0);
  });

  it('returns trends for multiple years', () => {
    const balances = [
      makeBalance({ fiscal_year: 2022 }),
      makeBalance({ fiscal_year: 2023 }),
      makeBalance({ fiscal_year: 2024 }),
    ];
    const incomes = [
      makeIncome({ fiscal_year: 2022 }),
      makeIncome({ fiscal_year: 2023 }),
      makeIncome({ fiscal_year: 2024 }),
    ];
    const trends = analyzeTrends(balances, incomes);
    expect(trends.length).toBe(4);
    expect(trends[0]!.metric_name).toBe('current_ratio');
  });
});

// ============================================================
// Integration tests: runFinancialEngine
// ============================================================

describe('runFinancialEngine', () => {
  it('returns blocked when no data', async () => {
    const input: EngineInput = {
      application_id: 'app-001',
      policy_config: POLICY_CONFIG,
    };
    const result = await runFinancialEngine(input);
    expect(result.engine_name).toBe('financial');
    expect(result.module_status).toBe('blocked');
    expect(result.module_score).toBe(0);
  });

  it('returns blocked for empty balance data', async () => {
    const data = makeFinancialInput({ balance_data: [] });
    const result = await runFinancialEngine(makeEngineInput(data));
    expect(result.module_status).toBe('blocked');
    expect(result.risk_flags[0]!.code).toBe('insufficient_financial_data');
  });

  it('returns high score for healthy company', async () => {
    const data = makeFinancialInput();
    const result = await runFinancialEngine(makeEngineInput(data));

    expect(result.module_score).toBeGreaterThanOrEqual(60);
    expect(['A', 'B', 'C']).toContain(result.module_grade);
    expect(result.module_status).toBe('pass');
    expect(result.key_metrics.current_ratio).toBeDefined();
    expect(result.key_metrics.gross_margin).toBeDefined();
    expect(result.key_metrics.debt_to_equity).toBeDefined();
  });

  it('flags distressed company', async () => {
    const data = makeFinancialInput({
      balance_data: [makeBalance({
        current_assets: 50000,
        current_liabilities: 200000,
        total_liabilities: 900000,
        equity: 100000,
        inventory: 10000,
      })],
      income_data: [makeIncome({
        gross_profit: -50000,
        operating_income: -150000,
        net_income: -200000,
      })],
      related_parties_data: makeRelatedParties({ exposure_pct: 0.45 }),
    });
    const result = await runFinancialEngine(makeEngineInput(data));

    expect(result.risk_flags.some((f) => f.code === 'low_liquidity')).toBe(true);
    expect(result.risk_flags.some((f) => f.code === 'high_leverage')).toBe(true);
    expect(result.risk_flags.some((f) => f.code === 'negative_margins')).toBe(true);
    expect(result.risk_flags.some((f) => f.code === 'high_related_party_exposure')).toBe(true);
  });

  it('includes benchmark comparisons', async () => {
    const data = makeFinancialInput();
    const result = await runFinancialEngine(makeEngineInput(data));

    expect(result.benchmark_comparison.current_ratio).toBeDefined();
    expect(result.benchmark_comparison.gross_margin).toBeDefined();
    expect(result.benchmark_comparison.interest_coverage).toBeDefined();
    expect(result.benchmark_comparison.related_party_exposure).toBeDefined();
  });

  it('includes trends for multi-year data', async () => {
    const data = makeFinancialInput({
      balance_data: [
        makeBalance({ fiscal_year: 2022 }),
        makeBalance({ fiscal_year: 2023 }),
        makeBalance({ fiscal_year: 2024 }),
      ],
      income_data: [
        makeIncome({ fiscal_year: 2022 }),
        makeIncome({ fiscal_year: 2023 }),
        makeIncome({ fiscal_year: 2024 }),
      ],
    });
    const result = await runFinancialEngine(makeEngineInput(data));
    expect(result.trends.length).toBeGreaterThan(0);
  });

  it('score is between 0 and 100', async () => {
    const data = makeFinancialInput();
    const result = await runFinancialEngine(makeEngineInput(data));
    expect(result.module_score).toBeGreaterThanOrEqual(0);
    expect(result.module_score).toBeLessThanOrEqual(100);
    expect(result.module_max_score).toBe(100);
  });

  it('includes recommended actions for flagged issues', async () => {
    const data = makeFinancialInput({
      balance_data: [makeBalance({
        current_assets: 50000,
        current_liabilities: 200000,
        total_liabilities: 900000,
        equity: 100000,
      })],
    });
    const result = await runFinancialEngine(makeEngineInput(data));
    expect(result.recommended_actions.length).toBeGreaterThan(0);
  });
});
