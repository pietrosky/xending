import type { EngineInput, EngineOutput } from '../types/engine.types';

/** Function signature that all engines must implement */
export type EngineFn = (input: EngineInput) => Promise<EngineOutput>;

/** Registry mapping engine names to their executor functions */
export interface EngineRegistry {
  [engineName: string]: EngineFn;
}

/** Create a failed EngineOutput for error scenarios */
function makeFailedOutput(engineName: string, errorMessage: string, durationMs: number): EngineOutput {
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
    explanation: `Engine "${engineName}" failed after ${durationMs}ms: ${errorMessage}`,
    recommended_actions: ['Review engine error and retry'],
    created_at: new Date().toISOString(),
  };
}

/** Run a single engine with error handling and execution time tracking */
export async function runEngine(
  name: string,
  fn: EngineFn,
  input: EngineInput,
): Promise<EngineOutput> {
  const start = performance.now();
  try {
    const result = await fn(input);
    const durationMs = Math.round(performance.now() - start);
    return {
      ...result,
      explanation: result.explanation
        ? `${result.explanation} [${durationMs}ms]`
        : `Completed in ${durationMs}ms`,
    };
  } catch (error: unknown) {
    const durationMs = Math.round(performance.now() - start);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return makeFailedOutput(name, message, durationMs);
  }
}

/** Run multiple engines in parallel, returning all results keyed by engine name */
export async function runEnginesParallel(
  engines: EngineRegistry,
  input: EngineInput,
): Promise<Record<string, EngineOutput>> {
  const entries = Object.entries(engines);
  const results = await Promise.all(
    entries.map(([name, fn]) => runEngine(name, fn, input)),
  );

  const output: Record<string, EngineOutput> = {};
  entries.forEach(([name], index) => {
    const r = results[index];
    if (r) output[name] = r;
  });
  return output;
}
