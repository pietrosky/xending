// Pure helper functions extracted for testability.
// Used by index.ts — no side effects, no I/O.

// ---------------------------------------------------------------------------
// Types (self-contained for Deno edge function — mirrors engine.types.ts)
// ---------------------------------------------------------------------------

export type ModuleStatus = 'pass' | 'fail' | 'warning' | 'blocked';
export type ModuleGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type FlagSeverity = 'info' | 'warning' | 'critical' | 'hard_stop';

export interface RiskFlag {
  code: string;
  severity: FlagSeverity;
  message: string;
  source_metric?: string;
  value?: number;
  threshold?: number;
}

export interface EngineOutput {
  engine_name: string;
  module_status: ModuleStatus;
  module_score: number;
  module_max_score: number;
  module_grade: ModuleGrade;
  risk_flags: RiskFlag[];
  key_metrics: Record<string, unknown>;
  benchmark_comparison: Record<string, unknown>;
  trends: unknown[];
  explanation: string;
  recommended_actions: string[];
  created_at: string;
}

export interface EngineRunnerRequest {
  application_id: string;
  engine_name: string;
  previous_results?: Record<string, EngineOutput>;
}

export interface EngineRunnerError {
  error: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fase 1 engines supported by the runner */
export const FASE1_ENGINES = new Set([
  'compliance',
  'sat_facturacion',
  'buro',
  'documentation',
  'financial',
]);

/** Fase 2+ engines (registered but not yet implemented) */
export const FASE2_ENGINES = new Set([
  'cashflow',
  'working_capital',
  'stability',
  'network',
  'guarantee',
  'fx_risk',
  'employee',
  'operational',
  'benchmark',
  'portfolio',
  'graph_fraud',
]);

/** All known engine names */
export const ALL_ENGINES = new Set([...FASE1_ENGINES, ...FASE2_ENGINES]);

/** Maps engine_name to the cs_*_results table where output is stored */
const ENGINE_RESULTS_TABLE: Record<string, string> = {
  compliance: 'cs_compliance_results',
  sat_facturacion: 'cs_sat_results',
  buro: 'cs_buro_results',
  documentation: 'cs_documentation_results',
  financial: 'cs_financial_results',
  cashflow: 'cs_cashflow_results',
  working_capital: 'cs_working_capital_results',
  stability: 'cs_stability_results',
  network: 'cs_network_results',
  guarantee: 'cs_guarantee_results',
  fx_risk: 'cs_fx_results',
  employee: 'cs_employee_results',
  operational: 'cs_operational_results',
  benchmark: 'cs_benchmark_results',
  portfolio: 'cs_portfolio_results',
  graph_fraud: 'cs_graph_results',
};

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/** Check if an engine name is known (Fase 1 or 2+) */
export function isKnownEngine(name: string): boolean {
  return ALL_ENGINES.has(name);
}

/** Check if an engine is implemented (Fase 1) */
export function isImplementedEngine(name: string): boolean {
  return FASE1_ENGINES.has(name);
}

/** Get the results table name for an engine. Returns null if unknown. */
export function getResultsTable(engineName: string): string | null {
  return ENGINE_RESULTS_TABLE[engineName] ?? null;
}

/** Get all valid engine names */
export function getValidEngineNames(): string[] {
  return Array.from(ALL_ENGINES).sort();
}

/**
 * Validate the incoming request body.
 * Returns an error message string or null if valid.
 */
export function validateRequest(body: unknown): string | null {
  if (!body || typeof body !== 'object') {
    return 'Invalid JSON body.';
  }

  const { application_id, engine_name } = body as Record<string, unknown>;

  if (!application_id || typeof application_id !== 'string') {
    return 'Missing required field: application_id';
  }

  if (!engine_name || typeof engine_name !== 'string') {
    return 'Missing required field: engine_name';
  }

  if (!isKnownEngine(engine_name)) {
    return `Unknown engine: ${engine_name}. Valid engines: ${getValidEngineNames().join(', ')}`;
  }

  return null;
}

/**
 * Build a blocked EngineOutput for error/failure scenarios.
 * Used when an engine fails to execute or is not yet implemented.
 */
export function makeBlockedOutput(
  engineName: string,
  errorMessage: string,
  durationMs: number,
): EngineOutput {
  return {
    engine_name: engineName,
    module_status: 'blocked',
    module_score: 0,
    module_max_score: 100,
    module_grade: 'F',
    risk_flags: [
      {
        code: 'engine_execution_error',
        severity: 'critical',
        message: errorMessage,
      },
    ],
    key_metrics: {},
    benchmark_comparison: {},
    trends: [],
    explanation: `Engine "${engineName}" blocked after ${durationMs}ms: ${errorMessage}`,
    recommended_actions: ['Review engine error and retry'],
    created_at: new Date().toISOString(),
  };
}

/**
 * Build the row to insert into the engine's results table.
 */
export function buildResultRow(
  applicationId: string,
  output: EngineOutput,
): Record<string, unknown> {
  return {
    application_id: applicationId,
    module_status: output.module_status,
    module_score: output.module_score,
    module_grade: output.module_grade,
    risk_flags: output.risk_flags,
    key_metrics: output.key_metrics,
    benchmark_comparison: output.benchmark_comparison,
    explanation: output.explanation,
    recommended_actions: output.recommended_actions,
    created_at: output.created_at,
  };
}
