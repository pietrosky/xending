/**
 * Cross Analyzer — 20 intelligent cross-checks between engines.
 *
 * Each cross detects patterns that individual engines might miss by
 * comparing metrics across two or more engine results.
 *
 * All functions are pure and exported for testability.
 */

import type { EngineOutput, FlagSeverity } from '../types/engine.types';

// ============================================================
// Types
// ============================================================

export type CrossSeverity = 'info' | 'warning' | 'critical';

export interface CrossAnalysisResult {
  cross_number: number;
  cross_name: string;
  engines_involved: string[];
  pattern_detected: boolean;
  severity: CrossSeverity;
  interpretation: string;
  recommended_action: string;
}

/** Alias for the full set of engine results consumed by the analyzer */
export type EngineResultsMap = Record<string, EngineOutput>;

// ============================================================
// Helpers
// ============================================================

/** Safely read a numeric metric value from an engine output */
export function metricVal(results: EngineResultsMap, engine: string, metric: string): number | undefined {
  return results[engine]?.key_metrics[metric]?.value;
}

/** Check if an engine has a specific risk flag code */
export function hasFlag(results: EngineResultsMap, engine: string, flagCode: string): boolean {
  return results[engine]?.risk_flags.some((f) => f.code === flagCode) ?? false;
}

/** Check if an engine has any flag with given severity */
export function hasSeverityFlag(results: EngineResultsMap, engine: string, severity: FlagSeverity): boolean {
  return results[engine]?.risk_flags.some((f) => f.severity === severity) ?? false;
}

/** Build a cross result */
function cross(
  num: number, name: string, engines: string[],
  detected: boolean, severity: CrossSeverity,
  interpretation: string, action: string,
): CrossAnalysisResult {
  return {
    cross_number: num,
    cross_name: name,
    engines_involved: engines,
    pattern_detected: detected,
    severity,
    interpretation,
    recommended_action: action,
  };
}

// ============================================================
// Cross 1: SAT revenue vs Financial statements discrepancy
// ============================================================

export function cross01_SatVsFinancialRevenue(r: EngineResultsMap): CrossAnalysisResult {
  const satRevenue = metricVal(r, 'sat_facturacion', 'total_facturado_12m');
  const financialRevenue = metricVal(r, 'financial', 'ingresos_netos');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'SAT invoicing and financial statements are consistent.';
  let action = 'No action required.';

  if (satRevenue != null && financialRevenue != null && financialRevenue > 0) {
    const discrepancy = Math.abs(satRevenue - financialRevenue) / financialRevenue;
    if (discrepancy > 0.25) {
      detected = true;
      severity = 'critical';
      interpretation = `SAT revenue differs from financial statements by ${(discrepancy * 100).toFixed(1)}% (>25%). Possible double accounting or unreported income.`;
      action = 'Request reconciliation between SAT invoicing and audited financials. Consider forensic review.';
    } else if (discrepancy > 0.10) {
      detected = true;
      severity = 'warning';
      interpretation = `SAT revenue differs from financial statements by ${(discrepancy * 100).toFixed(1)}% (>10%). Minor discrepancy that needs explanation.`;
      action = 'Request written explanation for revenue discrepancy between SAT and financial statements.';
    }
  }

  return cross(1, 'SAT Revenue vs Financial Statements', ['sat_facturacion', 'financial'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 2: DSCR vs existing debt burden (Cashflow + Buro)
// ============================================================

export function cross02_DscrVsDebtBurden(r: EngineResultsMap): CrossAnalysisResult {
  const dscrProforma = metricVal(r, 'cashflow', 'dscr_proforma');
  const activeCredits = metricVal(r, 'buro', 'active_credits_count');
  const vigenteOriginalRatio = metricVal(r, 'buro', 'vigente_original_ratio');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Debt service capacity is consistent with existing obligations.';
  let action = 'No action required.';

  if (dscrProforma != null && activeCredits != null) {
    const weakDscr = dscrProforma < 1.20;
    const highDebt = (activeCredits > 5) || (vigenteOriginalRatio != null && vigenteOriginalRatio > 0.85);

    if (weakDscr && highDebt) {
      detected = true;
      severity = 'critical';
      interpretation = `DSCR proforma ${dscrProforma.toFixed(2)}x is weak while borrower has ${activeCredits} active credits with high outstanding balance. Repayment capacity is strained.`;
      action = 'Reduce approved amount or require debt consolidation before disbursement.';
    } else if (weakDscr || highDebt) {
      detected = true;
      severity = 'warning';
      interpretation = weakDscr
        ? `DSCR proforma ${dscrProforma.toFixed(2)}x is below comfort level with existing debt obligations.`
        : `High existing debt burden (${activeCredits} credits) despite acceptable DSCR.`;
      action = 'Monitor debt levels closely. Consider covenant on maximum total debt.';
    }
  }

  return cross(2, 'DSCR vs Existing Debt Burden', ['cashflow', 'buro'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 3: Revenue concentration + stability (Network + Stability)
// ============================================================

export function cross03_ConcentrationPlusStability(r: EngineResultsMap): CrossAnalysisResult {
  const top1ClientPct = metricVal(r, 'network', 'top1_client_pct');
  const cv = metricVal(r, 'stability', 'coefficient_of_variation');
  const pattern = metricVal(r, 'stability', 'pattern_classification');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Revenue diversification and stability are balanced.';
  let action = 'No action required.';

  if (top1ClientPct != null && cv != null) {
    const highConcentration = top1ClientPct > 0.35;
    const unstable = cv > 0.25 || (pattern != null && pattern >= 3); // erratico=3, deteriorando=4

    if (highConcentration && unstable) {
      detected = true;
      severity = 'critical';
      interpretation = `Top client represents ${(top1ClientPct * 100).toFixed(1)}% of revenue AND business shows high volatility (CV ${(cv * 100).toFixed(1)}%). Loss of key client would be catastrophic.`;
      action = 'Require diversification plan as covenant. Consider reduced amount and shorter term.';
    } else if (highConcentration) {
      detected = true;
      severity = 'warning';
      interpretation = `Top client represents ${(top1ClientPct * 100).toFixed(1)}% of revenue. Business is stable but vulnerable to client loss.`;
      action = 'Request client diversification plan. Monitor top client relationship quarterly.';
    }
  }

  return cross(3, 'Revenue Concentration + Stability', ['network', 'stability'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 4: Buro debt rotation detection (Buro internal)
// ============================================================

export function cross04_DebtRotation(r: EngineResultsMap): CrossAnalysisResult {
  const hasRotation = hasFlag(r, 'buro', 'debt_rotation_detected');
  const hasNotPayingPrincipal = hasFlag(r, 'buro', 'not_paying_principal');
  const consultations3m = metricVal(r, 'buro', 'consultations_3m');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'No debt rotation patterns detected in bureau data.';
  let action = 'No action required.';

  if (hasRotation || hasNotPayingPrincipal) {
    detected = true;
    severity = 'critical';
    const reasons: string[] = [];
    if (hasRotation) reasons.push('opening new credits shortly after liquidating others');
    if (hasNotPayingPrincipal) reasons.push('outstanding balance near original amount (not paying principal)');
    if (consultations3m != null && consultations3m > 3) reasons.push(`${consultations3m} bureau consultations in last 3 months`);
    interpretation = `Debt rotation detected: ${reasons.join('; ')}. Borrower may be rolling debt across institutions.`;
    action = 'Reject or significantly reduce amount. Require reinforced guarantees and debt consolidation evidence.';
  } else if (consultations3m != null && consultations3m > 3) {
    detected = true;
    severity = 'warning';
    interpretation = `${consultations3m} bureau consultations in last 3 months suggest active credit seeking.`;
    action = 'Investigate reason for multiple credit inquiries. Request explanation letter.';
  }

  return cross(4, 'Debt Rotation Detection', ['buro'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 5: Working capital cycle vs payment behavior (WorkingCapital + SAT)
// ============================================================

export function cross05_WorkingCapitalVsPayment(r: EngineResultsMap): CrossAnalysisResult {
  const ccc = metricVal(r, 'working_capital', 'ccc');
  const dso = metricVal(r, 'working_capital', 'dso');
  const collectionEff = metricVal(r, 'working_capital', 'collection_efficiency');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Working capital cycle and payment behavior are aligned.';
  let action = 'No action required.';

  if (ccc != null && dso != null) {
    const longCCC = ccc > 90;
    const poorCollection = collectionEff != null && collectionEff < 0.70;

    if (longCCC && poorCollection) {
      detected = true;
      severity = 'critical';
      interpretation = `Cash conversion cycle is ${ccc.toFixed(0)} days with collection efficiency at ${((collectionEff ?? 0) * 100).toFixed(0)}%. Business is financing its clients excessively.`;
      action = 'Require improvement in collection processes as covenant. Consider factoring facility instead.';
    } else if (longCCC || poorCollection) {
      detected = true;
      severity = 'warning';
      interpretation = longCCC
        ? `Cash conversion cycle of ${ccc.toFixed(0)} days is extended, indicating working capital pressure.`
        : `Collection efficiency at ${((collectionEff ?? 0) * 100).toFixed(0)}% is below acceptable levels.`;
      action = 'Monitor working capital metrics quarterly. Consider shorter credit term.';
    }
  }

  return cross(5, 'Working Capital Cycle vs Payment Behavior', ['working_capital', 'sat_facturacion'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 6: Employee productivity vs revenue (Employee + SAT)
// ============================================================

export function cross06_EmployeeProductivity(r: EngineResultsMap): CrossAnalysisResult {
  const revenuePerEmployee = metricVal(r, 'employee', 'revenue_per_employee');
  const headcount = metricVal(r, 'employee', 'avg_headcount');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Employee productivity is consistent with reported revenue.';
  let action = 'No action required.';

  if (revenuePerEmployee != null && headcount != null) {
    const veryHighProductivity = revenuePerEmployee > 5_000_000;
    const veryLowHeadcount = headcount < 3;

    if (veryHighProductivity && veryLowHeadcount) {
      detected = true;
      severity = 'critical';
      interpretation = `Revenue per employee is $${(revenuePerEmployee / 1_000_000).toFixed(1)}M with only ${headcount.toFixed(0)} employees. Possible shell company or pass-through entity.`;
      action = 'Conduct operational verification visit. Request payroll evidence and employee contracts.';
    } else if (veryHighProductivity || veryLowHeadcount) {
      detected = true;
      severity = 'warning';
      interpretation = veryHighProductivity
        ? `Unusually high revenue per employee ($${(revenuePerEmployee / 1_000_000).toFixed(1)}M). May indicate outsourced operations or asset-light model.`
        : `Very low headcount (${headcount.toFixed(0)}) relative to business size.`;
      action = 'Request explanation of business model and workforce structure.';
    }
  }

  return cross(6, 'Employee Productivity vs Revenue', ['employee', 'sat_facturacion'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 7: Guarantee coverage vs risk level (Guarantee + RiskMatrix)
// ============================================================

export function cross07_GuaranteeCoverageVsRisk(r: EngineResultsMap): CrossAnalysisResult {
  const coverageRatio = metricVal(r, 'guarantee', 'coverage_ratio');
  const shortfall = metricVal(r, 'guarantee', 'shortfall');
  const overallScore = r['risk_matrix']?.module_score;

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Guarantee coverage is adequate for the risk level.';
  let action = 'No action required.';

  if (coverageRatio != null) {
    const lowCoverage = coverageRatio < 2.0;
    const highRisk = overallScore != null && overallScore < 60;

    if (lowCoverage && highRisk) {
      detected = true;
      severity = 'critical';
      interpretation = `Guarantee coverage is ${coverageRatio.toFixed(2)}x (below 2:1 policy) while risk score is ${overallScore?.toFixed(0)}. Insufficient protection for risk level.`;
      action = 'Require additional guarantees before approval. Consider increasing coverage to 2.5:1.';
    } else if (lowCoverage) {
      detected = true;
      severity = 'warning';
      interpretation = `Guarantee coverage at ${coverageRatio.toFixed(2)}x is below the 2:1 policy minimum.${shortfall != null && shortfall > 0 ? ` Shortfall: $${shortfall.toFixed(0)}.` : ''}`;
      action = 'Request additional collateral to meet 2:1 coverage requirement.';
    }
  }

  return cross(7, 'Guarantee Coverage vs Risk Level', ['guarantee', 'risk_matrix'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 8: FX exposure vs revenue currency (FxRisk + Network)
// ============================================================

export function cross08_FxExposureVsRevenue(r: EngineResultsMap): CrossAnalysisResult {
  const fxScore = r['fx_risk']?.module_score;
  const govRevenuePct = metricVal(r, 'network', 'government_revenue_pct');
  const hasFxFlag = hasFlag(r, 'sat_facturacion', 'fx_currency_risk');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'FX exposure is consistent with revenue currency mix.';
  let action = 'No action required.';

  if (fxScore != null && fxScore < 60) {
    const highGovDependency = govRevenuePct != null && govRevenuePct > 0.50;

    if (highGovDependency) {
      detected = true;
      severity = 'critical';
      interpretation = `High FX risk (score ${fxScore.toFixed(0)}) combined with ${(govRevenuePct * 100).toFixed(0)}% government revenue (MXN-denominated). Natural hedge is very weak.`;
      action = 'Require FX hedging covenant or switch loan to MXN denomination.';
    } else if (hasFxFlag) {
      detected = true;
      severity = 'warning';
      interpretation = `FX risk score is ${fxScore.toFixed(0)} with currency mismatch detected in invoicing patterns.`;
      action = 'Evaluate natural hedge adequacy. Consider FX hedging requirement.';
    }
  }

  return cross(8, 'FX Exposure vs Revenue Currency', ['fx_risk', 'network'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 9: Financial ratios cross-validation (Financial internal)
// ============================================================

export function cross09_FinancialRatiosCrossValidation(r: EngineResultsMap): CrossAnalysisResult {
  const hasLiquidityRisk = hasFlag(r, 'financial', 'liquidity_risk');
  const hasLeverageRisk = hasFlag(r, 'financial', 'leverage_risk');
  const hasRpConcentration = hasFlag(r, 'financial', 'related_party_concentration_risk');
  const financialScore = r['financial']?.module_score;

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Financial ratios are internally consistent.';
  let action = 'No action required.';

  const flagCount = [hasLiquidityRisk, hasLeverageRisk, hasRpConcentration].filter(Boolean).length;

  if (flagCount >= 2) {
    detected = true;
    severity = 'critical';
    const issues: string[] = [];
    if (hasLiquidityRisk) issues.push('liquidity risk');
    if (hasLeverageRisk) issues.push('high leverage');
    if (hasRpConcentration) issues.push('related party concentration');
    interpretation = `Multiple financial red flags detected simultaneously: ${issues.join(', ')}. Financial health is compromised on multiple fronts.`;
    action = 'Require detailed financial restructuring plan. Consider rejection or committee review.';
  } else if (flagCount === 1 && financialScore != null && financialScore < 50) {
    detected = true;
    severity = 'warning';
    interpretation = `Financial score is low (${financialScore.toFixed(0)}) with at least one structural issue detected.`;
    action = 'Request updated financial statements and management explanation.';
  }

  return cross(9, 'Financial Ratios Cross-Validation', ['financial'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 10: Documentation completeness vs risk level (Documentation + RiskMatrix)
// ============================================================

export function cross10_DocumentationVsRisk(r: EngineResultsMap): CrossAnalysisResult {
  const docScore = r['documentation']?.module_score;
  const overallScore = r['risk_matrix']?.module_score ?? r['cashflow']?.module_score;

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Documentation level is appropriate for the risk profile.';
  let action = 'No action required.';

  if (docScore != null) {
    const incompleteDoc = docScore < 70;
    const highRisk = overallScore != null && overallScore < 60;

    if (incompleteDoc && highRisk) {
      detected = true;
      severity = 'critical';
      interpretation = `Documentation score is ${docScore.toFixed(0)} (incomplete) while risk profile is elevated (score ${overallScore?.toFixed(0)}). Cannot properly assess risk without complete documentation.`;
      action = 'Block further evaluation until critical documents are provided. Do not approve with incomplete docs and high risk.';
    } else if (incompleteDoc) {
      detected = true;
      severity = 'warning';
      interpretation = `Documentation score is ${docScore.toFixed(0)}. Missing documents may hide additional risks.`;
      action = 'Request missing documents before final decision. Set deadline for completion.';
    }
  }

  return cross(10, 'Documentation Completeness vs Risk Level', ['documentation', 'risk_matrix'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 11: SAT cancellations vs network client quality (SAT + Network)
// ============================================================

export function cross11_CancellationsVsClientQuality(r: EngineResultsMap): CrossAnalysisResult {
  const hasCancellationRisk = hasFlag(r, 'sat_facturacion', 'high_cancellation_risk');
  const top1ClientPct = metricVal(r, 'network', 'top1_client_pct');
  const clientCount = metricVal(r, 'network', 'client_count');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Invoice cancellation levels are normal relative to client base.';
  let action = 'No action required.';

  if (hasCancellationRisk) {
    const fewClients = clientCount != null && clientCount < 5;
    const highConcentration = top1ClientPct != null && top1ClientPct > 0.40;

    if (fewClients || highConcentration) {
      detected = true;
      severity = 'critical';
      interpretation = `High cancellation rate combined with ${fewClients ? `only ${clientCount?.toFixed(0)} clients` : `top client at ${((top1ClientPct ?? 0) * 100).toFixed(0)}%`}. Revenue quality is severely compromised.`;
      action = 'Investigate cancellation patterns by client. Consider reduced credit amount based on net revenue only.';
    } else {
      detected = true;
      severity = 'warning';
      interpretation = 'High invoice cancellation rate detected. May indicate quality issues or commercial disputes.';
      action = 'Request explanation for cancellation patterns. Adjust revenue projections to net of cancellations.';
    }
  }

  return cross(11, 'SAT Cancellations vs Client Quality', ['sat_facturacion', 'network'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 12: Buro consultations vs credit seeking behavior (Buro internal)
// ============================================================

export function cross12_CreditSeekingBehavior(r: EngineResultsMap): CrossAnalysisResult {
  const hasDesperateSeeking = hasFlag(r, 'buro', 'desperate_credit_seeking');
  const hasExcessiveShopping = hasFlag(r, 'buro', 'excessive_credit_shopping');
  const consultations3m = metricVal(r, 'buro', 'consultations_3m');
  const consultations12m = metricVal(r, 'buro', 'consultations_12m');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Bureau consultation frequency is within normal range.';
  let action = 'No action required.';

  if (hasDesperateSeeking) {
    detected = true;
    severity = 'critical';
    interpretation = `${consultations3m?.toFixed(0) ?? 'Multiple'} bureau consultations in last 3 months. Borrower is actively seeking credit from multiple sources, indicating potential liquidity crisis.`;
    action = 'Investigate urgency of credit need. Require explanation and evidence of cash flow stability.';
  } else if (hasExcessiveShopping) {
    detected = true;
    severity = 'warning';
    interpretation = `${consultations12m?.toFixed(0) ?? 'Multiple'} bureau consultations in last 12 months. Elevated credit shopping activity.`;
    action = 'Request explanation for credit inquiries. Monitor for new debt acquisitions.';
  }

  return cross(12, 'Credit Seeking Behavior', ['buro'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 13: Related party exposure (Financial + Network)
// ============================================================

export function cross13_RelatedPartyExposure(r: EngineResultsMap): CrossAnalysisResult {
  const rpClientPct = metricVal(r, 'network', 'related_party_client_pct');
  const rpSupplierPct = metricVal(r, 'network', 'related_party_supplier_pct');
  const hasRpFlag = hasFlag(r, 'financial', 'related_party_concentration_risk');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Related party exposure is within acceptable limits.';
  let action = 'No action required.';

  const totalRpExposure = (rpClientPct ?? 0) + (rpSupplierPct ?? 0);

  if (hasRpFlag || totalRpExposure > 0.30) {
    detected = true;
    severity = totalRpExposure > 0.50 ? 'critical' : 'warning';
    interpretation = `Combined related party exposure is ${(totalRpExposure * 100).toFixed(0)}% (clients ${((rpClientPct ?? 0) * 100).toFixed(0)}% + suppliers ${((rpSupplierPct ?? 0) * 100).toFixed(0)}%). Transactions may not be at arm's length.`;
    action = severity === 'critical'
      ? 'Require independent transfer pricing study. Consider excluding related party revenue from capacity analysis.'
      : 'Monitor related party transactions. Request disclosure of terms and conditions.';
  }

  return cross(13, 'Related Party Exposure', ['financial', 'network'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 14: Revenue trend vs stability classification (SAT + Stability)
// ============================================================

export function cross14_RevenueTrendVsStability(r: EngineResultsMap): CrossAnalysisResult {
  const satScore = r['sat_facturacion']?.module_score;
  const stabilityPattern = metricVal(r, 'stability', 'pattern_classification');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Revenue trends and stability classification are consistent.';
  let action = 'No action required.';

  if (satScore != null && stabilityPattern != null) {
    // pattern: 1=estable, 2=ciclico, 3=erratico, 4=deteriorando
    const goodSatScore = satScore >= 70;
    const badStability = stabilityPattern >= 3;

    if (goodSatScore && badStability) {
      detected = true;
      severity = 'warning';
      interpretation = `SAT score is good (${satScore.toFixed(0)}) but stability pattern is ${stabilityPattern >= 4 ? 'deteriorating' : 'erratic'}. Recent invoicing may mask underlying volatility.`;
      action = 'Weight stability analysis more heavily. Use conservative revenue projections.';
    } else if (!goodSatScore && badStability) {
      detected = true;
      severity = 'critical';
      interpretation = `Both SAT score (${satScore.toFixed(0)}) and stability are poor. Revenue is unreliable for debt service projections.`;
      action = 'Use stress scenario as base case. Require additional guarantees or reduce term.';
    }
  }

  return cross(14, 'Revenue Trend vs Stability', ['sat_facturacion', 'stability'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 15: Cashflow stress vs guarantee adequacy (Cashflow + Guarantee)
// ============================================================

export function cross15_CashflowStressVsGuarantee(r: EngineResultsMap): CrossAnalysisResult {
  const dscrProforma = metricVal(r, 'cashflow', 'dscr_proforma');
  const cashflowScore = r['cashflow']?.module_score;
  const coverageRatio = metricVal(r, 'guarantee', 'coverage_ratio');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Cashflow capacity and guarantee coverage are balanced.';
  let action = 'No action required.';

  if (cashflowScore != null && coverageRatio != null) {
    const weakCashflow = cashflowScore < 60 || (dscrProforma != null && dscrProforma < 1.20);
    const weakGuarantee = coverageRatio < 2.0;

    if (weakCashflow && weakGuarantee) {
      detected = true;
      severity = 'critical';
      interpretation = `Both cashflow (score ${cashflowScore.toFixed(0)}, DSCR ${dscrProforma?.toFixed(2) ?? 'N/A'}x) and guarantee coverage (${coverageRatio.toFixed(2)}x) are weak. Neither primary nor secondary repayment source is adequate.`;
      action = 'Reject or require substantial additional guarantees AND reduced amount to improve DSCR.';
    } else if (weakCashflow) {
      detected = true;
      severity = 'warning';
      interpretation = `Cashflow is weak (score ${cashflowScore.toFixed(0)}) but guarantee coverage at ${coverageRatio.toFixed(2)}x provides secondary protection.`;
      action = 'Ensure guarantee documentation is complete and enforceable. Monitor cashflow quarterly.';
    }
  }

  return cross(15, 'Cashflow Stress vs Guarantee Adequacy', ['cashflow', 'guarantee'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 16: Government dependency + payment delays (Network + SAT)
// ============================================================

export function cross16_GovernmentDependency(r: EngineResultsMap): CrossAnalysisResult {
  const govRevenuePct = metricVal(r, 'network', 'government_revenue_pct');
  const dso = metricVal(r, 'working_capital', 'dso');
  const hasGovFlag = hasFlag(r, 'network', 'government_dependency');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Government revenue dependency is within acceptable limits.';
  let action = 'No action required.';

  if (hasGovFlag || (govRevenuePct != null && govRevenuePct > 0.40)) {
    const longDso = dso != null && dso > 90;
    detected = true;

    if (longDso && govRevenuePct != null && govRevenuePct > 0.50) {
      severity = 'critical';
      interpretation = `Government represents ${(govRevenuePct * 100).toFixed(0)}% of revenue with DSO at ${dso?.toFixed(0)} days. High risk of payment delays and administration change impact.`;
      action = 'Require working capital facility structure. Add government contract renewal as monitoring trigger.';
    } else {
      severity = 'warning';
      interpretation = `Government dependency at ${((govRevenuePct ?? 0) * 100).toFixed(0)}% of revenue. Stable but exposed to political and payment cycle risks.`;
      action = 'Monitor government contract status. Consider factoring for government receivables.';
    }
  }

  return cross(16, 'Government Dependency + Payment Delays', ['network', 'sat_facturacion'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 17: Shell company indicators (Employee + Operational + SAT)
// ============================================================

export function cross17_ShellCompanyIndicators(r: EngineResultsMap): CrossAnalysisResult {
  const shellRisk = metricVal(r, 'employee', 'shell_company_risk');
  const headcount = metricVal(r, 'employee', 'avg_headcount');
  const satRevenue = metricVal(r, 'sat_facturacion', 'total_facturado_12m');
  const hasOperationalFlags = hasSeverityFlag(r, 'operational', 'critical');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'No shell company indicators detected across engines.';
  let action = 'No action required.';

  const shellWarning = shellRisk != null && shellRisk >= 1;
  const tinyWorkforce = headcount != null && headcount < 3;
  const highRevenue = satRevenue != null && satRevenue > 10_000_000;

  const indicatorCount = [shellWarning, tinyWorkforce && highRevenue, hasOperationalFlags].filter(Boolean).length;

  if (indicatorCount >= 2) {
    detected = true;
    severity = 'critical';
    interpretation = `Multiple shell company indicators: ${tinyWorkforce ? `only ${headcount?.toFixed(0)} employees` : ''}${highRevenue ? ` with $${((satRevenue ?? 0) / 1_000_000).toFixed(1)}M revenue` : ''}${hasOperationalFlags ? ', operational risk flags' : ''}${shellWarning ? ', employee engine shell risk' : ''}. Entity may lack economic substance.`;
    action = 'Conduct physical verification visit. Request payroll records, lease agreements, and utility bills. Consider rejection.';
  } else if (indicatorCount === 1) {
    detected = true;
    severity = 'warning';
    interpretation = 'One shell company indicator detected. May be legitimate asset-light business model.';
    action = 'Request business model explanation and evidence of operational substance.';
  }

  return cross(17, 'Shell Company Indicators', ['employee', 'operational', 'sat_facturacion'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 18: Over-leveraging signals (Buro + Cashflow + Financial)
// ============================================================

export function cross18_OverLeveraging(r: EngineResultsMap): CrossAnalysisResult {
  const hasOverLeveraged = hasFlag(r, 'buro', 'over_leveraged');
  const hasLeverageRisk = hasFlag(r, 'financial', 'leverage_risk');
  const dscrProforma = metricVal(r, 'cashflow', 'dscr_proforma');
  const activeCredits = metricVal(r, 'buro', 'active_credits_count');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Leverage levels are manageable across all indicators.';
  let action = 'No action required.';

  const signals = [
    hasOverLeveraged,
    hasLeverageRisk,
    dscrProforma != null && dscrProforma < 1.20,
  ].filter(Boolean).length;

  if (signals >= 2) {
    detected = true;
    severity = 'critical';
    interpretation = `Over-leveraging confirmed by ${signals} sources: ${hasOverLeveraged ? `${activeCredits?.toFixed(0) ?? '5+'} active credits` : ''}${hasLeverageRisk ? ', high financial leverage' : ''}${dscrProforma != null && dscrProforma < 1.20 ? `, weak DSCR ${dscrProforma.toFixed(2)}x` : ''}. Adding more debt is dangerous.`;
    action = 'Reject or require debt consolidation as precondition. Maximum reduced amount with enhanced monitoring.';
  } else if (signals === 1) {
    detected = true;
    severity = 'warning';
    interpretation = 'One over-leveraging signal detected. Borrower is approaching debt capacity limits.';
    action = 'Set maximum debt covenant. Monitor total debt quarterly.';
  }

  return cross(18, 'Over-Leveraging Signals', ['buro', 'cashflow', 'financial'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 19: Seasonal pattern vs term alignment (Stability + Application)
// ============================================================

export function cross19_SeasonalVsTerm(r: EngineResultsMap): CrossAnalysisResult {
  const pattern = metricVal(r, 'stability', 'pattern_classification');
  const negativeMarginMonths = metricVal(r, 'stability', 'negative_margin_months');

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = 'Business pattern is compatible with standard credit terms.';
  let action = 'No action required.';

  // pattern: 1=estable, 2=ciclico, 3=erratico, 4=deteriorando
  const isCyclical = pattern != null && pattern === 2;
  const hasNegativeMonths = negativeMarginMonths != null && negativeMarginMonths > 2;

  if (isCyclical && hasNegativeMonths) {
    detected = true;
    severity = 'warning';
    interpretation = `Business is cyclical with ${negativeMarginMonths?.toFixed(0)} months of negative margin. Standard monthly payments may cause stress during low seasons.`;
    action = 'Structure payments aligned with revenue cycle (seasonal amortization). Consider grace periods during low months.';
  } else if (isCyclical) {
    detected = true;
    severity = 'info';
    interpretation = 'Business shows seasonal patterns. Payment structure should account for cyclicality.';
    action = 'Consider seasonal payment schedule aligned with revenue peaks.';
  }

  return cross(19, 'Seasonal Pattern vs Term Alignment', ['stability'], detected, severity, interpretation, action);
}

// ============================================================
// Cross 20: Overall risk coherence check (all engines)
// ============================================================

export function cross20_OverallRiskCoherence(r: EngineResultsMap): CrossAnalysisResult {
  const engines = Object.values(r);
  if (engines.length === 0) {
    return cross(20, 'Overall Risk Coherence', ['all'], false, 'info', 'No engine results available for coherence check.', 'Run all engines before coherence analysis.');
  }

  const scores = engines.map((e) => e.module_score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const spread = maxScore - minScore;

  const criticalFlags = engines.reduce(
    (count, e) => count + e.risk_flags.filter((f) => f.severity === 'critical' || f.severity === 'hard_stop').length,
    0,
  );

  let detected = false;
  let severity: CrossSeverity = 'info';
  let interpretation = `Overall risk profile is coherent. Average score ${avgScore.toFixed(0)}, spread ${spread.toFixed(0)} points.`;
  let action = 'No action required.';

  if (spread > 50) {
    detected = true;
    severity = 'critical';
    const weakEngines = engines.filter((e) => e.module_score < 40).map((e) => e.engine_name);
    const strongEngines = engines.filter((e) => e.module_score >= 80).map((e) => e.engine_name);
    interpretation = `Extreme score dispersion (${spread.toFixed(0)} points). Strong areas: ${strongEngines.join(', ') || 'none'}. Weak areas: ${weakEngines.join(', ') || 'none'}. Risk profile is inconsistent and requires investigation.`;
    action = 'Investigate why some engines score very differently. May indicate data quality issues or hidden risks.';
  } else if (criticalFlags >= 3) {
    detected = true;
    severity = 'critical';
    interpretation = `${criticalFlags} critical flags across engines despite average score of ${avgScore.toFixed(0)}. Aggregate risk is higher than individual scores suggest.`;
    action = 'Review all critical flags holistically. Consider committee review regardless of score.';
  } else if (spread > 30) {
    detected = true;
    severity = 'warning';
    interpretation = `Moderate score dispersion (${spread.toFixed(0)} points) across engines. Some areas of concern exist.`;
    action = 'Focus review on lowest-scoring engines. Ensure weak areas are addressed in conditions.';
  }

  return cross(20, 'Overall Risk Coherence', ['all'], detected, severity, interpretation, action);
}

// ============================================================
// Main entry point
// ============================================================

/** All 20 cross-check functions in order */
const CROSS_FUNCTIONS: Array<(r: EngineResultsMap) => CrossAnalysisResult> = [
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
];

/** Run all 20 cross-checks and return results array */
export function runCrossAnalysis(engineResults: EngineResultsMap): CrossAnalysisResult[] {
  return CROSS_FUNCTIONS.map((fn) => fn(engineResults));
}

/** Count detected patterns by severity */
export function summarizeCrossResults(results: CrossAnalysisResult[]): {
  total_detected: number;
  critical: number;
  warning: number;
  info: number;
} {
  const detected = results.filter((r) => r.pattern_detected);
  return {
    total_detected: detected.length,
    critical: detected.filter((r) => r.severity === 'critical').length,
    warning: detected.filter((r) => r.severity === 'warning').length,
    info: detected.filter((r) => r.severity === 'info').length,
  };
}
