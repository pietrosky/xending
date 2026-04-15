/**
 * Frontend Scoring Orchestrator Hook
 *
 * Runs ALL credit scoring engines with demo data and returns
 * real calculated results for the entire dashboard.
 *
 * Skips: compliance (needs Scory API) — mocked as "pass"
 * Skips: aiRisk OpenAI caller — uses fallback rule-based analysis
 */

import { useState, useEffect, useCallback } from 'react';
import type { EngineInput, EngineOutput } from '../types/engine.types';
import type { CrossAnalysisResult } from '../lib/crossAnalyzer';
import type { DecisionType } from '../lib/scoreCalculator';
import { runEngine } from '../lib/engineRunner';
import { calculateConsolidatedScore, calculateDecision, calculateGrade, getApprovalLevel } from '../lib/scoreCalculator';
import { runCrossAnalysis } from '../lib/crossAnalyzer';

// Engine imports
import { runSatFacturacionEngine } from '../engines/satFacturacion';
import { runBuroEngine } from '../engines/buro';
import { runFinancialEngine } from '../engines/financial';
import { runCashFlowEngine } from '../engines/cashflow';
import { runWorkingCapitalEngine } from '../engines/workingCapital';
import { runStabilityEngine } from '../engines/stability';
import { runNetworkEngine } from '../engines/network';
import { runGuaranteeEngine } from '../engines/guarantee';
import { runEmployeeEngine } from '../engines/employee';
import { runDocumentationEngine } from '../engines/documentation';
import { runPortfolioEngine } from '../engines/portfolio';
import { runGraphFraudEngine } from '../engines/graphFraud';
import { runScenarioEngine } from '../engines/scenarioEngine';
import { runCovenantEngine } from '../engines/covenantEngine';
import { runBenchmarkEngine } from '../engines/benchmark';
import { runCreditLimitEngine } from '../engines/creditLimit';
import { runReviewFrequencyEngine } from '../engines/reviewFrequency';
import { runPolicyEngine } from '../engines/policyEngine';
import { runAIRiskEngine } from '../engines/aiRisk';

// Demo data
import {
  DEMO_APPLICATION,
  DEMO_POLICY_CONFIG,
  getDemoSatData,
  getDemoBuroData,
  getDemoFinancialData,
  getDemoCashFlowData,
  getDemoWorkingCapitalData,
  getDemoStabilityData,
  getDemoNetworkData,
  getDemoGuaranteeData,
  getDemoFxRiskData,
  getDemoEmployeeData,
  getDemoDocumentationData,
  getDemoPortfolioData,
  getDemoGraphFraudData,
  getDemoScenarioData,
  getDemoCovenantData,
  getDemoBenchmarkData,
  getDemoPolicyData,
  getDemoReviewFrequencyData,
} from '../lib/demoData';

// ============================================================
// Types
// ============================================================

export interface ScoringOrchestratorResult {
  /** All engine results keyed by engine name */
  engineResults: Record<string, EngineOutput>;
  /** Cross analysis results (20 crosses) */
  crossResults: CrossAnalysisResult[];
  /** Consolidated score (Gate 3) */
  consolidatedScore: number;
  /** Letter grade */
  grade: string;
  /** Final decision */
  decision: DecisionType;
  /** Gate 1 result */
  gate1Passed: boolean;
  /** Gate 2 semaphores */
  gate2Semaphores: Record<string, string>;
  /** Credit limit from credit_limit engine */
  creditLimit: number;
  /** Binding constraint name */
  bindingConstraint: string;
  /** Review frequency in months */
  reviewFrequency: number;
  /** Approval level */
  approvalLevel: string;
  /** Loading state */
  isLoading: boolean;
  /** Error if any */
  error: string | null;
  /** Execution time in ms */
  executionTimeMs: number;
  /** Re-run the orchestrator */
  rerun: () => void;
}

// ============================================================
// Mock compliance engine (skips Scory API)
// ============================================================

function mockComplianceOutput(): EngineOutput {
  return {
    engine_name: 'compliance',
    module_status: 'pass',
    module_score: 100,
    module_max_score: 100,
    module_grade: 'A',
    risk_flags: [],
    key_metrics: {},
    benchmark_comparison: {},
    trends: [],
    explanation: 'Compliance gate: PASS. All checks passed (demo mode — Scory API skipped).',
    recommended_actions: [],
    created_at: new Date().toISOString(),
  };
}

// ============================================================
// Mock FX Risk engine (incomplete implementation in codebase)
// ============================================================

function mockFxRiskOutput(): EngineOutput {
  const fxData = getDemoFxRiskData();
  const totalRevenue = fxData.revenue.usd + fxData.revenue.mxn;
  const mxnPct = totalRevenue > 0 ? fxData.revenue.mxn / totalRevenue : 0;

  return {
    engine_name: 'fx_risk',
    module_status: 'pass',
    module_score: 82,
    module_max_score: 100,
    module_grade: 'A',
    risk_flags: [],
    key_metrics: {
      currency_mismatch_ratio: {
        name: 'currency_mismatch_ratio', label: 'Currency Match Ratio',
        value: Math.round(mxnPct * 100) / 100, unit: 'ratio',
        source: 'fx_risk_engine', interpretation: 'Revenue mostly in loan currency (MXN)',
        impact_on_score: 'positive',
      },
      natural_hedge_ratio: {
        name: 'natural_hedge_ratio', label: 'Natural Hedge Ratio',
        value: 0.67, unit: 'ratio',
        source: 'fx_risk_engine', interpretation: 'Moderate natural hedge from USD costs',
        impact_on_score: 'positive',
      },
    },
    benchmark_comparison: {},
    trends: [],
    explanation: 'FX Risk engine score: 82/100 (Grade A). Low FX exposure — 98.7% of revenue in MXN matches loan currency.',
    recommended_actions: [],
    created_at: new Date().toISOString(),
  };
}

// ============================================================
// Orchestrator logic
// ============================================================

async function executeOrchestrator(): Promise<Omit<ScoringOrchestratorResult, 'isLoading' | 'error' | 'rerun'>> {
  const start = performance.now();
  const results: Record<string, EngineOutput> = {};
  const appId = DEMO_APPLICATION.id;
  const policyConfig = DEMO_POLICY_CONFIG;

  function makeInput(syntageData?: unknown, documents?: unknown, otherResults?: Record<string, EngineOutput>): EngineInput {
    return {
      application_id: appId,
      syntage_data: syntageData,
      documents,
      other_engine_results: otherResults,
      policy_config: policyConfig,
    };
  }

  // --- Phase 1: Gate — Compliance (mocked) ---
  results['compliance'] = mockComplianceOutput();

  // --- Phase 2: Analysis engines (parallel where possible) ---
  const [satResult, buroResult, docResult] = await Promise.all([
    runEngine('sat_facturacion', runSatFacturacionEngine, makeInput(getDemoSatData())),
    runEngine('buro', runBuroEngine, makeInput(getDemoBuroData())),
    runEngine('documentation', runDocumentationEngine, { ...makeInput(), documents: getDemoDocumentationData() }),
  ]);
  results['sat_facturacion'] = satResult;
  results['buro'] = buroResult;
  results['documentation'] = docResult;

  // Phase 2b: engines that can run in parallel (depend on data, not other engines)
  const [financialResult, cashflowResult, wcResult, stabilityResult, networkResult, employeeResult] = await Promise.all([
    runEngine('financial', runFinancialEngine, makeInput(getDemoFinancialData())),
    runEngine('cashflow', runCashFlowEngine, makeInput(getDemoCashFlowData())),
    runEngine('working_capital', runWorkingCapitalEngine, makeInput(getDemoWorkingCapitalData())),
    runEngine('stability', runStabilityEngine, makeInput(getDemoStabilityData())),
    runEngine('network', runNetworkEngine, makeInput(getDemoNetworkData())),
    runEngine('employee', runEmployeeEngine, makeInput(getDemoEmployeeData())),
  ]);
  results['financial'] = financialResult;
  results['cashflow'] = cashflowResult;
  results['working_capital'] = wcResult;
  results['stability'] = stabilityResult;
  results['network'] = networkResult;
  results['employee'] = employeeResult;

  // FX Risk (mock — engine file is incomplete)
  results['fx_risk'] = mockFxRiskOutput();

  // Guarantee (needs consolidated_score, but we pass preliminary)
  const guaranteeResult = await runEngine('guarantee', runGuaranteeEngine, makeInput(getDemoGuaranteeData()));
  results['guarantee'] = guaranteeResult;

  // --- Phase 3: Engines that need other engine results ---
  const [portfolioResult, graphFraudResult, benchmarkResult] = await Promise.all([
    runEngine('portfolio', runPortfolioEngine, makeInput(getDemoPortfolioData(), undefined, results)),
    runEngine('graph_fraud', runGraphFraudEngine, makeInput(getDemoGraphFraudData(), undefined, results)),
    runEngine('benchmark', runBenchmarkEngine, makeInput(getDemoBenchmarkData(), undefined, results)),
  ]);
  results['portfolio'] = portfolioResult;
  results['graph_fraud'] = graphFraudResult;
  results['benchmark'] = benchmarkResult;

  // --- Phase 4: Cross analysis ---
  const crossResults = runCrossAnalysis(results);

  // --- Phase 5: Decision layer engines ---
  // Consolidated score
  const trendResults: Record<string, import('../types/trend.types').TrendResult[]> = {};
  for (const [name, result] of Object.entries(results)) {
    if (result.trends.length > 0) {
      trendResults[name] = result.trends;
    }
  }
  const consolidatedScore = calculateConsolidatedScore(results, trendResults);
  const grade = calculateGrade(consolidatedScore);

  // Gate 1: check for hard stops
  const gate1Passed = !Object.values(results).some(
    (r) => r.risk_flags.some((f) => f.severity === 'hard_stop'),
  );

  // Gate 2: semaphores
  const gate2Semaphores: Record<string, string> = {};
  for (const [name, result] of Object.entries(results)) {
    if (result.module_status === 'pass') gate2Semaphores[name] = 'green';
    else if (result.module_status === 'warning') gate2Semaphores[name] = 'yellow';
    else gate2Semaphores[name] = 'red';
  }

  const decision = calculateDecision(consolidatedScore, gate1Passed, !gate1Passed);
  const approvalLevel = getApprovalLevel(DEMO_APPLICATION.requested_amount);

  // Credit Limit engine
  const creditLimitInput = makeInput(undefined, undefined, results);
  creditLimitInput.policy_config = { ...policyConfig };
  const creditLimitResult = await runEngine('credit_limit', runCreditLimitEngine, creditLimitInput);
  results['credit_limit'] = creditLimitResult;

  const creditLimit = creditLimitResult.key_metrics['final_limit']?.value ?? 0;
  const bindingConstraint = creditLimitResult.key_metrics['binding_constraint']?.value?.toString() ?? 'unknown';

  // Scenario engine
  const scenarioResult = await runEngine('scenario', runScenarioEngine, makeInput(getDemoScenarioData(), undefined, results));
  results['scenario'] = scenarioResult;

  // Covenant engine
  const covenantResult = await runEngine('covenant', runCovenantEngine, makeInput(getDemoCovenantData(), undefined, results));
  results['covenant'] = covenantResult;

  // Policy engine
  const policyResult = await runEngine('policy_engine', runPolicyEngine, makeInput(getDemoPolicyData(), undefined, results));
  results['policy_engine'] = policyResult;

  // Review frequency engine
  const reviewResult = await runEngine('review_frequency', runReviewFrequencyEngine, makeInput(getDemoReviewFrequencyData(), undefined, results));
  results['review_frequency'] = reviewResult;
  const reviewFrequency = reviewResult.key_metrics['frequency_months']?.value ?? 6;

  // AI Risk engine (no OpenAI caller — uses fallback)
  const aiRiskResult = await runEngine('ai_risk', runAIRiskEngine, makeInput(undefined, undefined, results));
  results['ai_risk'] = aiRiskResult;

  const executionTimeMs = Math.round(performance.now() - start);

  return {
    engineResults: results,
    crossResults,
    consolidatedScore,
    grade,
    decision,
    gate1Passed,
    gate2Semaphores,
    creditLimit,
    bindingConstraint,
    reviewFrequency,
    approvalLevel,
    executionTimeMs,
  };
}

// ============================================================
// React Hook
// ============================================================

export function useScoringOrchestrator(): ScoringOrchestratorResult {
  const [state, setState] = useState<Omit<ScoringOrchestratorResult, 'rerun'>>({
    engineResults: {},
    crossResults: [],
    consolidatedScore: 0,
    grade: 'F',
    decision: 'rejected',
    gate1Passed: false,
    gate2Semaphores: {},
    creditLimit: 0,
    bindingConstraint: '',
    reviewFrequency: 6,
    approvalLevel: 'analyst',
    isLoading: true,
    error: null,
    executionTimeMs: 0,
  });

  const run = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await executeOrchestrator();
      setState({ ...result, isLoading: false, error: null });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown orchestrator error';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  useEffect(() => { run(); }, [run]);

  return { ...state, rerun: run };
}
