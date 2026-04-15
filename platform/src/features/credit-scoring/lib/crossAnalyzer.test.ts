import { describe, it, expect } from 'vitest';
import type { EngineOutput } from '../types/engine.types';
import type { EngineResultsMap, CrossAnalysisResult } from './crossAnalyzer';
import {
  metricVal,
  hasFlag,
  hasSeverityFlag,
  runCrossAnalysis,
  summarizeCrossResults,
  cross01_SatVsFinancialRevenue,
  cross02_DscrVsDebtBurden,
  cross03_ConcentrationPlusStability,
  cross04_DebtRotation,
  cross05_WorkingCapitalVsPayment,
  cross06_EmployeeProductivity,
  cross07_GuaranteeCoverageVsRisk,
  cross08_FxExposureVsRevenue,
  cross09_FinancialRatiosCrossValidation,
  cross10_DocumentationVsRisk,
  cross11_CancellationsVsClientQuality,
  cross12_CreditSeekingBehavior,
  cross13_RelatedPartyExposure,
  cross14_RevenueTrendVsStability,
  cross15_CashflowStressVsGuarantee,
  cross16_GovernmentDependency,
  cross17_ShellCompanyIndicators,
  cross18_OverLeveraging,
  cross19_SeasonalVsTerm,
  cross20_OverallRiskCoherence,
} from './crossAnalyzer';

// ============================================================
// Test helpers
// ============================================================

function makeEngine(overrides: Partial<EngineOutput> = {}): EngineOutput {
  return {
    engine_name: 'test',
    module_status: 'pass',
    module_score: 75,
    module_max_score: 100,
    module_grade: 'B',
    risk_flags: [],
    key_metrics: {},
    benchmark_comparison: {},
    trends: [],
    explanation: '',
    recommended_actions: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeMetric(value: number) {
  return { name: 'test', label: 'Test', value, unit: '', source: '', interpretation: '', impact_on_score: 'neutral' as const };
}

function makeFlag(code: string, severity: 'info' | 'warning' | 'critical' | 'hard_stop' = 'warning') {
  return { code, severity, message: `Flag: ${code}` };
}

// ============================================================
// Helper tests
// ============================================================

describe('metricVal', () => {
  it('returns metric value when engine and metric exist', () => {
    const r: EngineResultsMap = { sat: makeEngine({ key_metrics: { revenue: makeMetric(1000) } }) };
    expect(metricVal(r, 'sat', 'revenue')).toBe(1000);
  });

  it('returns undefined for missing engine', () => {
    expect(metricVal({}, 'sat', 'revenue')).toBeUndefined();
  });

  it('returns undefined for missing metric', () => {
    const r: EngineResultsMap = { sat: makeEngine() };
    expect(metricVal(r, 'sat', 'nonexistent')).toBeUndefined();
  });
});

describe('hasFlag', () => {
  it('returns true when flag exists', () => {
    const r: EngineResultsMap = { buro: makeEngine({ risk_flags: [makeFlag('debt_rotation_detected')] }) };
    expect(hasFlag(r, 'buro', 'debt_rotation_detected')).toBe(true);
  });

  it('returns false when flag does not exist', () => {
    const r: EngineResultsMap = { buro: makeEngine() };
    expect(hasFlag(r, 'buro', 'debt_rotation_detected')).toBe(false);
  });

  it('returns false for missing engine', () => {
    expect(hasFlag({}, 'buro', 'debt_rotation_detected')).toBe(false);
  });
});

describe('hasSeverityFlag', () => {
  it('returns true when severity flag exists', () => {
    const r: EngineResultsMap = { op: makeEngine({ risk_flags: [makeFlag('issue', 'critical')] }) };
    expect(hasSeverityFlag(r, 'op', 'critical')).toBe(true);
  });

  it('returns false when no matching severity', () => {
    const r: EngineResultsMap = { op: makeEngine({ risk_flags: [makeFlag('issue', 'info')] }) };
    expect(hasSeverityFlag(r, 'op', 'critical')).toBe(false);
  });
});

// ============================================================
// Cross 1: SAT vs Financial Revenue
// ============================================================

describe('cross01_SatVsFinancialRevenue', () => {
  it('returns no pattern when data is missing', () => {
    const result = cross01_SatVsFinancialRevenue({});
    expect(result.cross_number).toBe(1);
    expect(result.pattern_detected).toBe(false);
    expect(result.severity).toBe('info');
  });

  it('returns no pattern when revenues are consistent', () => {
    const r: EngineResultsMap = {
      sat_facturacion: makeEngine({ key_metrics: { total_facturado_12m: makeMetric(1_000_000) } }),
      financial: makeEngine({ key_metrics: { ingresos_netos: makeMetric(1_050_000) } }),
    };
    const result = cross01_SatVsFinancialRevenue(r);
    expect(result.pattern_detected).toBe(false);
  });

  it('detects warning for >10% discrepancy', () => {
    const r: EngineResultsMap = {
      sat_facturacion: makeEngine({ key_metrics: { total_facturado_12m: makeMetric(1_200_000) } }),
      financial: makeEngine({ key_metrics: { ingresos_netos: makeMetric(1_000_000) } }),
    };
    const result = cross01_SatVsFinancialRevenue(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('detects critical for >25% discrepancy', () => {
    const r: EngineResultsMap = {
      sat_facturacion: makeEngine({ key_metrics: { total_facturado_12m: makeMetric(1_500_000) } }),
      financial: makeEngine({ key_metrics: { ingresos_netos: makeMetric(1_000_000) } }),
    };
    const result = cross01_SatVsFinancialRevenue(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });
});

// ============================================================
// Cross 2: DSCR vs Debt Burden
// ============================================================

describe('cross02_DscrVsDebtBurden', () => {
  it('returns no pattern when data is missing', () => {
    const result = cross02_DscrVsDebtBurden({});
    expect(result.pattern_detected).toBe(false);
  });

  it('detects critical when weak DSCR and high debt', () => {
    const r: EngineResultsMap = {
      cashflow: makeEngine({ key_metrics: { dscr_proforma: makeMetric(1.05) } }),
      buro: makeEngine({ key_metrics: { active_credits_count: makeMetric(6), vigente_original_ratio: makeMetric(0.90) } }),
    };
    const result = cross02_DscrVsDebtBurden(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when only DSCR is weak', () => {
    const r: EngineResultsMap = {
      cashflow: makeEngine({ key_metrics: { dscr_proforma: makeMetric(1.10) } }),
      buro: makeEngine({ key_metrics: { active_credits_count: makeMetric(2) } }),
    };
    const result = cross02_DscrVsDebtBurden(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when both are healthy', () => {
    const r: EngineResultsMap = {
      cashflow: makeEngine({ key_metrics: { dscr_proforma: makeMetric(1.50) } }),
      buro: makeEngine({ key_metrics: { active_credits_count: makeMetric(2) } }),
    };
    const result = cross02_DscrVsDebtBurden(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 3: Concentration + Stability
// ============================================================

describe('cross03_ConcentrationPlusStability', () => {
  it('detects critical when high concentration and unstable', () => {
    const r: EngineResultsMap = {
      network: makeEngine({ key_metrics: { top1_client_pct: makeMetric(0.50) } }),
      stability: makeEngine({ key_metrics: { coefficient_of_variation: makeMetric(0.30), pattern_classification: makeMetric(3) } }),
    };
    const result = cross03_ConcentrationPlusStability(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when only high concentration', () => {
    const r: EngineResultsMap = {
      network: makeEngine({ key_metrics: { top1_client_pct: makeMetric(0.45) } }),
      stability: makeEngine({ key_metrics: { coefficient_of_variation: makeMetric(0.10), pattern_classification: makeMetric(1) } }),
    };
    const result = cross03_ConcentrationPlusStability(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when diversified and stable', () => {
    const r: EngineResultsMap = {
      network: makeEngine({ key_metrics: { top1_client_pct: makeMetric(0.20) } }),
      stability: makeEngine({ key_metrics: { coefficient_of_variation: makeMetric(0.10), pattern_classification: makeMetric(1) } }),
    };
    const result = cross03_ConcentrationPlusStability(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 4: Debt Rotation
// ============================================================

describe('cross04_DebtRotation', () => {
  it('detects critical when rotation flags present', () => {
    const r: EngineResultsMap = {
      buro: makeEngine({
        risk_flags: [makeFlag('debt_rotation_detected', 'critical'), makeFlag('not_paying_principal', 'critical')],
        key_metrics: { consultations_3m: makeMetric(5) },
      }),
    };
    const result = cross04_DebtRotation(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when only high consultations', () => {
    const r: EngineResultsMap = {
      buro: makeEngine({ key_metrics: { consultations_3m: makeMetric(4) } }),
    };
    const result = cross04_DebtRotation(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when clean', () => {
    const r: EngineResultsMap = {
      buro: makeEngine({ key_metrics: { consultations_3m: makeMetric(1) } }),
    };
    const result = cross04_DebtRotation(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 5: Working Capital vs Payment
// ============================================================

describe('cross05_WorkingCapitalVsPayment', () => {
  it('detects critical when long CCC and poor collection', () => {
    const r: EngineResultsMap = {
      working_capital: makeEngine({
        key_metrics: { ccc: makeMetric(120), dso: makeMetric(80), collection_efficiency: makeMetric(0.60) },
      }),
    };
    const result = cross05_WorkingCapitalVsPayment(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('returns no pattern when healthy', () => {
    const r: EngineResultsMap = {
      working_capital: makeEngine({
        key_metrics: { ccc: makeMetric(45), dso: makeMetric(30), collection_efficiency: makeMetric(0.90) },
      }),
    };
    const result = cross05_WorkingCapitalVsPayment(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 6: Employee Productivity
// ============================================================

describe('cross06_EmployeeProductivity', () => {
  it('detects critical when very high productivity and tiny workforce', () => {
    const r: EngineResultsMap = {
      employee: makeEngine({
        key_metrics: { revenue_per_employee: makeMetric(8_000_000), avg_headcount: makeMetric(2) },
      }),
    };
    const result = cross06_EmployeeProductivity(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('returns no pattern when normal productivity', () => {
    const r: EngineResultsMap = {
      employee: makeEngine({
        key_metrics: { revenue_per_employee: makeMetric(800_000), avg_headcount: makeMetric(15) },
      }),
    };
    const result = cross06_EmployeeProductivity(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 7: Guarantee Coverage vs Risk
// ============================================================

describe('cross07_GuaranteeCoverageVsRisk', () => {
  it('detects critical when low coverage and high risk', () => {
    const r: EngineResultsMap = {
      guarantee: makeEngine({ key_metrics: { coverage_ratio: makeMetric(1.5), shortfall: makeMetric(500_000) } }),
      risk_matrix: makeEngine({ module_score: 45 }),
    };
    const result = cross07_GuaranteeCoverageVsRisk(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when only low coverage', () => {
    const r: EngineResultsMap = {
      guarantee: makeEngine({ key_metrics: { coverage_ratio: makeMetric(1.8) } }),
      risk_matrix: makeEngine({ module_score: 80 }),
    };
    const result = cross07_GuaranteeCoverageVsRisk(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when coverage is adequate', () => {
    const r: EngineResultsMap = {
      guarantee: makeEngine({ key_metrics: { coverage_ratio: makeMetric(2.5) } }),
    };
    const result = cross07_GuaranteeCoverageVsRisk(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 8: FX Exposure vs Revenue
// ============================================================

describe('cross08_FxExposureVsRevenue', () => {
  it('detects critical when FX risk and high gov dependency', () => {
    const r: EngineResultsMap = {
      fx_risk: makeEngine({ module_score: 40 }),
      network: makeEngine({ key_metrics: { government_revenue_pct: makeMetric(0.60) } }),
    };
    const result = cross08_FxExposureVsRevenue(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('returns no pattern when FX score is good', () => {
    const r: EngineResultsMap = {
      fx_risk: makeEngine({ module_score: 80 }),
      network: makeEngine({ key_metrics: { government_revenue_pct: makeMetric(0.10) } }),
    };
    const result = cross08_FxExposureVsRevenue(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 9: Financial Ratios Cross-Validation
// ============================================================

describe('cross09_FinancialRatiosCrossValidation', () => {
  it('detects critical when multiple financial flags', () => {
    const r: EngineResultsMap = {
      financial: makeEngine({
        risk_flags: [makeFlag('liquidity_risk', 'warning'), makeFlag('leverage_risk', 'warning')],
        module_score: 40,
      }),
    };
    const result = cross09_FinancialRatiosCrossValidation(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('returns no pattern when financial is clean', () => {
    const r: EngineResultsMap = { financial: makeEngine({ module_score: 80 }) };
    const result = cross09_FinancialRatiosCrossValidation(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 10: Documentation vs Risk
// ============================================================

describe('cross10_DocumentationVsRisk', () => {
  it('detects critical when incomplete docs and high risk', () => {
    const r: EngineResultsMap = {
      documentation: makeEngine({ module_score: 50 }),
      cashflow: makeEngine({ module_score: 45 }),
    };
    const result = cross10_DocumentationVsRisk(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when only docs are incomplete', () => {
    const r: EngineResultsMap = {
      documentation: makeEngine({ module_score: 60 }),
      cashflow: makeEngine({ module_score: 80 }),
    };
    const result = cross10_DocumentationVsRisk(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when docs are complete', () => {
    const r: EngineResultsMap = {
      documentation: makeEngine({ module_score: 85 }),
    };
    const result = cross10_DocumentationVsRisk(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 11: Cancellations vs Client Quality
// ============================================================

describe('cross11_CancellationsVsClientQuality', () => {
  it('detects critical when high cancellations and few clients', () => {
    const r: EngineResultsMap = {
      sat_facturacion: makeEngine({ risk_flags: [makeFlag('high_cancellation_risk')] }),
      network: makeEngine({ key_metrics: { client_count: makeMetric(3), top1_client_pct: makeMetric(0.50) } }),
    };
    const result = cross11_CancellationsVsClientQuality(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when cancellations but diversified clients', () => {
    const r: EngineResultsMap = {
      sat_facturacion: makeEngine({ risk_flags: [makeFlag('high_cancellation_risk')] }),
      network: makeEngine({ key_metrics: { client_count: makeMetric(20), top1_client_pct: makeMetric(0.15) } }),
    };
    const result = cross11_CancellationsVsClientQuality(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when no cancellation flag', () => {
    const r: EngineResultsMap = {
      sat_facturacion: makeEngine(),
      network: makeEngine({ key_metrics: { client_count: makeMetric(3) } }),
    };
    const result = cross11_CancellationsVsClientQuality(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 12: Credit Seeking Behavior
// ============================================================

describe('cross12_CreditSeekingBehavior', () => {
  it('detects critical for desperate credit seeking', () => {
    const r: EngineResultsMap = {
      buro: makeEngine({
        risk_flags: [makeFlag('desperate_credit_seeking', 'critical')],
        key_metrics: { consultations_3m: makeMetric(5) },
      }),
    };
    const result = cross12_CreditSeekingBehavior(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning for excessive shopping', () => {
    const r: EngineResultsMap = {
      buro: makeEngine({
        risk_flags: [makeFlag('excessive_credit_shopping')],
        key_metrics: { consultations_12m: makeMetric(10) },
      }),
    };
    const result = cross12_CreditSeekingBehavior(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when consultations are normal', () => {
    const r: EngineResultsMap = { buro: makeEngine() };
    const result = cross12_CreditSeekingBehavior(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 13: Related Party Exposure
// ============================================================

describe('cross13_RelatedPartyExposure', () => {
  it('detects critical when combined RP exposure > 50%', () => {
    const r: EngineResultsMap = {
      network: makeEngine({
        key_metrics: { related_party_client_pct: makeMetric(0.35), related_party_supplier_pct: makeMetric(0.20) },
      }),
      financial: makeEngine({ risk_flags: [makeFlag('related_party_concentration_risk')] }),
    };
    const result = cross13_RelatedPartyExposure(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when RP exposure > 30%', () => {
    const r: EngineResultsMap = {
      network: makeEngine({
        key_metrics: { related_party_client_pct: makeMetric(0.20), related_party_supplier_pct: makeMetric(0.15) },
      }),
      financial: makeEngine(),
    };
    const result = cross13_RelatedPartyExposure(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when RP exposure is low', () => {
    const r: EngineResultsMap = {
      network: makeEngine({
        key_metrics: { related_party_client_pct: makeMetric(0.05), related_party_supplier_pct: makeMetric(0.05) },
      }),
      financial: makeEngine(),
    };
    const result = cross13_RelatedPartyExposure(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 14: Revenue Trend vs Stability
// ============================================================

describe('cross14_RevenueTrendVsStability', () => {
  it('detects critical when both SAT and stability are poor', () => {
    const r: EngineResultsMap = {
      sat_facturacion: makeEngine({ module_score: 40 }),
      stability: makeEngine({ key_metrics: { pattern_classification: makeMetric(4) } }),
    };
    const result = cross14_RevenueTrendVsStability(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when good SAT but bad stability', () => {
    const r: EngineResultsMap = {
      sat_facturacion: makeEngine({ module_score: 80 }),
      stability: makeEngine({ key_metrics: { pattern_classification: makeMetric(3) } }),
    };
    const result = cross14_RevenueTrendVsStability(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when both are good', () => {
    const r: EngineResultsMap = {
      sat_facturacion: makeEngine({ module_score: 80 }),
      stability: makeEngine({ key_metrics: { pattern_classification: makeMetric(1) } }),
    };
    const result = cross14_RevenueTrendVsStability(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 15: Cashflow Stress vs Guarantee
// ============================================================

describe('cross15_CashflowStressVsGuarantee', () => {
  it('detects critical when both cashflow and guarantee are weak', () => {
    const r: EngineResultsMap = {
      cashflow: makeEngine({ module_score: 45, key_metrics: { dscr_proforma: makeMetric(1.05) } }),
      guarantee: makeEngine({ key_metrics: { coverage_ratio: makeMetric(1.5) } }),
    };
    const result = cross15_CashflowStressVsGuarantee(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when only cashflow is weak', () => {
    const r: EngineResultsMap = {
      cashflow: makeEngine({ module_score: 50, key_metrics: { dscr_proforma: makeMetric(1.10) } }),
      guarantee: makeEngine({ key_metrics: { coverage_ratio: makeMetric(2.5) } }),
    };
    const result = cross15_CashflowStressVsGuarantee(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });
});

// ============================================================
// Cross 16: Government Dependency
// ============================================================

describe('cross16_GovernmentDependency', () => {
  it('detects critical when high gov dependency and long DSO', () => {
    const r: EngineResultsMap = {
      network: makeEngine({
        key_metrics: { government_revenue_pct: makeMetric(0.60) },
        risk_flags: [makeFlag('government_dependency')],
      }),
      working_capital: makeEngine({ key_metrics: { dso: makeMetric(120) } }),
    };
    const result = cross16_GovernmentDependency(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning for moderate gov dependency', () => {
    const r: EngineResultsMap = {
      network: makeEngine({
        key_metrics: { government_revenue_pct: makeMetric(0.45) },
      }),
      working_capital: makeEngine({ key_metrics: { dso: makeMetric(40) } }),
    };
    const result = cross16_GovernmentDependency(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });
});

// ============================================================
// Cross 17: Shell Company Indicators
// ============================================================

describe('cross17_ShellCompanyIndicators', () => {
  it('detects critical when multiple shell indicators', () => {
    const r: EngineResultsMap = {
      employee: makeEngine({
        key_metrics: { shell_company_risk: makeMetric(2), avg_headcount: makeMetric(2) },
      }),
      sat_facturacion: makeEngine({ key_metrics: { total_facturado_12m: makeMetric(15_000_000) } }),
      operational: makeEngine({ risk_flags: [makeFlag('issue', 'critical')] }),
    };
    const result = cross17_ShellCompanyIndicators(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when one indicator', () => {
    const r: EngineResultsMap = {
      employee: makeEngine({
        key_metrics: { shell_company_risk: makeMetric(1), avg_headcount: makeMetric(10) },
      }),
      sat_facturacion: makeEngine({ key_metrics: { total_facturado_12m: makeMetric(5_000_000) } }),
      operational: makeEngine(),
    };
    const result = cross17_ShellCompanyIndicators(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when no indicators', () => {
    const r: EngineResultsMap = {
      employee: makeEngine({
        key_metrics: { shell_company_risk: makeMetric(0), avg_headcount: makeMetric(20) },
      }),
      sat_facturacion: makeEngine({ key_metrics: { total_facturado_12m: makeMetric(5_000_000) } }),
      operational: makeEngine(),
    };
    const result = cross17_ShellCompanyIndicators(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 18: Over-Leveraging
// ============================================================

describe('cross18_OverLeveraging', () => {
  it('detects critical when multiple leverage signals', () => {
    const r: EngineResultsMap = {
      buro: makeEngine({ risk_flags: [makeFlag('over_leveraged')], key_metrics: { active_credits_count: makeMetric(7) } }),
      financial: makeEngine({ risk_flags: [makeFlag('leverage_risk')] }),
      cashflow: makeEngine({ key_metrics: { dscr_proforma: makeMetric(1.10) } }),
    };
    const result = cross18_OverLeveraging(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning when one signal', () => {
    const r: EngineResultsMap = {
      buro: makeEngine({ risk_flags: [makeFlag('over_leveraged')] }),
      financial: makeEngine(),
      cashflow: makeEngine({ key_metrics: { dscr_proforma: makeMetric(1.50) } }),
    };
    const result = cross18_OverLeveraging(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when leverage is healthy', () => {
    const r: EngineResultsMap = {
      buro: makeEngine(),
      financial: makeEngine(),
      cashflow: makeEngine({ key_metrics: { dscr_proforma: makeMetric(1.80) } }),
    };
    const result = cross18_OverLeveraging(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 19: Seasonal vs Term
// ============================================================

describe('cross19_SeasonalVsTerm', () => {
  it('detects warning when cyclical with negative margin months', () => {
    const r: EngineResultsMap = {
      stability: makeEngine({
        key_metrics: { pattern_classification: makeMetric(2), negative_margin_months: makeMetric(4) },
      }),
    };
    const result = cross19_SeasonalVsTerm(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('detects info when cyclical without negative months', () => {
    const r: EngineResultsMap = {
      stability: makeEngine({
        key_metrics: { pattern_classification: makeMetric(2), negative_margin_months: makeMetric(0) },
      }),
    };
    const result = cross19_SeasonalVsTerm(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('info');
  });

  it('returns no pattern when stable', () => {
    const r: EngineResultsMap = {
      stability: makeEngine({ key_metrics: { pattern_classification: makeMetric(1) } }),
    };
    const result = cross19_SeasonalVsTerm(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// Cross 20: Overall Risk Coherence
// ============================================================

describe('cross20_OverallRiskCoherence', () => {
  it('returns no pattern for empty results', () => {
    const result = cross20_OverallRiskCoherence({});
    expect(result.pattern_detected).toBe(false);
  });

  it('detects critical when extreme score spread', () => {
    const r: EngineResultsMap = {
      cashflow: makeEngine({ engine_name: 'cashflow', module_score: 90 }),
      buro: makeEngine({ engine_name: 'buro', module_score: 30 }),
    };
    const result = cross20_OverallRiskCoherence(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects critical when many critical flags', () => {
    const r: EngineResultsMap = {
      a: makeEngine({ engine_name: 'a', module_score: 60, risk_flags: [makeFlag('f1', 'critical')] }),
      b: makeEngine({ engine_name: 'b', module_score: 65, risk_flags: [makeFlag('f2', 'critical')] }),
      c: makeEngine({ engine_name: 'c', module_score: 55, risk_flags: [makeFlag('f3', 'critical')] }),
    };
    const result = cross20_OverallRiskCoherence(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('critical');
  });

  it('detects warning for moderate spread', () => {
    const r: EngineResultsMap = {
      cashflow: makeEngine({ engine_name: 'cashflow', module_score: 80 }),
      buro: makeEngine({ engine_name: 'buro', module_score: 45 }),
    };
    const result = cross20_OverallRiskCoherence(r);
    expect(result.pattern_detected).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('returns no pattern when scores are coherent', () => {
    const r: EngineResultsMap = {
      cashflow: makeEngine({ engine_name: 'cashflow', module_score: 75 }),
      buro: makeEngine({ engine_name: 'buro', module_score: 70 }),
      financial: makeEngine({ engine_name: 'financial', module_score: 72 }),
    };
    const result = cross20_OverallRiskCoherence(r);
    expect(result.pattern_detected).toBe(false);
  });
});

// ============================================================
// runCrossAnalysis (integration)
// ============================================================

describe('runCrossAnalysis', () => {
  it('returns exactly 20 results', () => {
    const results = runCrossAnalysis({});
    expect(results).toHaveLength(20);
  });

  it('each result has correct cross_number from 1 to 20', () => {
    const results = runCrossAnalysis({});
    results.forEach((r, i) => {
      expect(r.cross_number).toBe(i + 1);
    });
  });

  it('all results have required fields', () => {
    const results = runCrossAnalysis({});
    results.forEach((r) => {
      expect(r).toHaveProperty('cross_number');
      expect(r).toHaveProperty('cross_name');
      expect(r).toHaveProperty('engines_involved');
      expect(r).toHaveProperty('pattern_detected');
      expect(r).toHaveProperty('severity');
      expect(r).toHaveProperty('interpretation');
      expect(r).toHaveProperty('recommended_action');
      expect(Array.isArray(r.engines_involved)).toBe(true);
      expect(typeof r.pattern_detected).toBe('boolean');
      expect(['info', 'warning', 'critical']).toContain(r.severity);
    });
  });
});

// ============================================================
// summarizeCrossResults
// ============================================================

describe('summarizeCrossResults', () => {
  it('counts detected patterns by severity', () => {
    const results: CrossAnalysisResult[] = [
      { cross_number: 1, cross_name: 'A', engines_involved: [], pattern_detected: true, severity: 'critical', interpretation: '', recommended_action: '' },
      { cross_number: 2, cross_name: 'B', engines_involved: [], pattern_detected: true, severity: 'warning', interpretation: '', recommended_action: '' },
      { cross_number: 3, cross_name: 'C', engines_involved: [], pattern_detected: false, severity: 'info', interpretation: '', recommended_action: '' },
      { cross_number: 4, cross_name: 'D', engines_involved: [], pattern_detected: true, severity: 'info', interpretation: '', recommended_action: '' },
    ];
    const summary = summarizeCrossResults(results);
    expect(summary.total_detected).toBe(3);
    expect(summary.critical).toBe(1);
    expect(summary.warning).toBe(1);
    expect(summary.info).toBe(1);
  });

  it('returns zeros for empty array', () => {
    const summary = summarizeCrossResults([]);
    expect(summary.total_detected).toBe(0);
    expect(summary.critical).toBe(0);
  });
});
