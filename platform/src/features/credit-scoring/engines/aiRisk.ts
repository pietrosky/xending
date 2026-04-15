// AI Risk Engine — Decision Layer
// Consumes ALL other engine results and generates AI-powered risk narrative
// Uses OpenAI GPT-4o for narrative generation

import type {
  EngineInput,
  EngineOutput,
  RiskFlag,
  MetricValue,
  ModuleGrade,
  ModuleStatus,
} from '../types/engine.types';

const ENGINE_NAME = 'ai_risk';

// ============================================================
// Types
// ============================================================

export interface AIAnalysisResult {
  risk_narrative: string;
  top_risks: RiskItem[];
  top_strengths: RiskItem[];
  scenarios: AIScenario[];
  confidence_score: number;
  trend_narrative: string;
  hidden_risks: string[];
}

export interface RiskItem {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  source_engine: string;
}

export interface AIScenario {
  scenario_type: string;
  description: string;
  impact: string;
  probability: 'high' | 'medium' | 'low';
}

/** Injectable OpenAI caller — makes the engine testable without real API calls */
export type OpenAICaller = (prompt: string, systemPrompt: string) => Promise<string>;

// ============================================================
// Prompt building — exported for testability
// ============================================================

export function summarizeEngineResults(
  engineResults: Record<string, EngineOutput>,
): string {
  const lines: string[] = [];

  for (const [name, result] of Object.entries(engineResults)) {
    lines.push(`## ${name}`);
    lines.push(`Score: ${result.module_score}/100 (${result.module_grade})`);
    lines.push(`Status: ${result.module_status}`);

    if (result.risk_flags.length > 0) {
      lines.push('Risk flags:');
      for (const flag of result.risk_flags) {
        lines.push(`  - [${flag.severity}] ${flag.code}: ${flag.message}`);
      }
    }

    const metricEntries = Object.values(result.key_metrics);
    if (metricEntries.length > 0) {
      lines.push('Key metrics:');
      for (const m of metricEntries.slice(0, 5)) {
        lines.push(`  - ${m.label}: ${m.value} ${m.unit} (${m.impact_on_score})`);
      }
    }

    if (result.trends.length > 0) {
      lines.push('Trends:');
      for (const t of result.trends.slice(0, 3)) {
        lines.push(`  - ${t.metric_label}: ${t.direction} (${t.speed}), change ${t.change_percent.toFixed(1)}%`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

export function summarizeTrends(
  engineResults: Record<string, EngineOutput>,
): string {
  const lines: string[] = [];
  let improving = 0;
  let stable = 0;
  let deteriorating = 0;
  let critical = 0;

  for (const [, result] of Object.entries(engineResults)) {
    for (const t of result.trends) {
      switch (t.direction) {
        case 'improving': improving++; break;
        case 'stable': stable++; break;
        case 'deteriorating': deteriorating++; break;
        case 'critical': critical++; break;
      }
    }
  }

  lines.push(`Trend summary: ${improving} improving, ${stable} stable, ${deteriorating} deteriorating, ${critical} critical`);

  // Highlight worst trends
  for (const [name, result] of Object.entries(engineResults)) {
    for (const t of result.trends) {
      if (t.direction === 'critical' || t.direction === 'deteriorating') {
        lines.push(`  - ${name}/${t.metric_label}: ${t.direction} (${t.change_percent.toFixed(1)}%)`);
      }
    }
  }

  return lines.join('\n');
}

export function buildSystemPrompt(): string {
  return `You are a senior credit risk analyst for Xending Capital, a fintech lender in Mexico.
You analyze credit scoring engine results and produce structured risk assessments.
You MUST respond in valid JSON matching the schema provided.
Be specific, cite engine names and metric values. Write in Spanish.`;
}

export function buildUserPrompt(
  engineResults: Record<string, EngineOutput>,
): string {
  const engineSummary = summarizeEngineResults(engineResults);
  const trendSummary = summarizeTrends(engineResults);

  return `Analyze the following credit scoring engine results and produce a structured risk assessment.

ENGINE RESULTS:
${engineSummary}

TREND ANALYSIS:
${trendSummary}

Respond with a JSON object with this exact structure:
{
  "risk_narrative": "2-3 paragraph executive summary of the applicant's risk profile in Spanish",
  "top_risks": [
    { "title": "short title", "description": "explanation", "severity": "high|medium|low", "source_engine": "engine_name" }
  ],
  "top_strengths": [
    { "title": "short title", "description": "explanation", "severity": "high|medium|low", "source_engine": "engine_name" }
  ],
  "scenarios": [
    { "scenario_type": "best_case|base_case|worst_case", "description": "what happens", "impact": "impact on repayment", "probability": "high|medium|low" }
  ],
  "confidence_score": 0.0 to 1.0,
  "trend_narrative": "1-2 paragraph summary of trend directions and projections in Spanish",
  "hidden_risks": ["risk not obvious from individual engines"]
}

Return ONLY top 3 risks, top 3 strengths, and 3 scenarios (best/base/worst).
confidence_score reflects how much data was available (1.0 = all engines ran, lower = missing data).`;
}

// ============================================================
// Response parsing — exported for testability
// ============================================================

export function parseAIResponse(raw: string): AIAnalysisResult {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '');
  }

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  return {
    risk_narrative: typeof parsed.risk_narrative === 'string' ? parsed.risk_narrative : '',
    top_risks: Array.isArray(parsed.top_risks)
      ? (parsed.top_risks as RiskItem[]).slice(0, 3)
      : [],
    top_strengths: Array.isArray(parsed.top_strengths)
      ? (parsed.top_strengths as RiskItem[]).slice(0, 3)
      : [],
    scenarios: Array.isArray(parsed.scenarios)
      ? (parsed.scenarios as AIScenario[]).slice(0, 3)
      : [],
    confidence_score: typeof parsed.confidence_score === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence_score))
      : 0.5,
    trend_narrative: typeof parsed.trend_narrative === 'string' ? parsed.trend_narrative : '',
    hidden_risks: Array.isArray(parsed.hidden_risks)
      ? (parsed.hidden_risks as string[])
      : [],
  };
}

// ============================================================
// Confidence calculation — based on data availability
// ============================================================

const EXPECTED_ENGINES = [
  'compliance', 'sat_facturacion', 'buro', 'documentation', 'financial',
  'cashflow', 'working_capital', 'stability', 'network', 'guarantee',
  'fx_risk', 'employee',
];

export function calculateDataConfidence(
  engineResults: Record<string, EngineOutput>,
): number {
  let available = 0;
  let nonBlocked = 0;

  for (const name of EXPECTED_ENGINES) {
    if (engineResults[name]) {
      available++;
      if (engineResults[name]!.module_status !== 'blocked') {
        nonBlocked++;
      }
    }
  }

  if (EXPECTED_ENGINES.length === 0) return 0;
  // Weight: 60% for availability, 40% for non-blocked
  const availabilityRatio = available / EXPECTED_ENGINES.length;
  const qualityRatio = available > 0 ? nonBlocked / available : 0;
  return Math.round((availabilityRatio * 0.6 + qualityRatio * 0.4) * 100) / 100;
}

// ============================================================
// Score & grade helpers
// ============================================================

export function scoreToGrade(score: number): ModuleGrade {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

export function scoreToStatus(score: number, flags: RiskFlag[]): ModuleStatus {
  if (flags.some((f) => f.severity === 'hard_stop')) return 'fail';
  if (score >= 65) return 'pass';
  if (score >= 40) return 'warning';
  return 'fail';
}

/** Derive a numeric score from the AI analysis confidence + engine average */
export function deriveScore(
  engineResults: Record<string, EngineOutput>,
  confidence: number,
): number {
  const outputs = Object.values(engineResults).filter(
    (r) => r.module_status !== 'blocked',
  );
  if (outputs.length === 0) return 0;

  const avgScore = outputs.reduce((s, r) => s + r.module_score, 0) / outputs.length;
  // AI engine score reflects overall portfolio health weighted by data confidence
  return Math.round(avgScore * confidence);
}

/** Collect critical/hard_stop flags from all engines */
export function collectCriticalFlags(
  engineResults: Record<string, EngineOutput>,
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  for (const [name, result] of Object.entries(engineResults)) {
    for (const flag of result.risk_flags) {
      if (flag.severity === 'critical' || flag.severity === 'hard_stop') {
        flags.push({
          ...flag,
          code: `${name}_${flag.code}`,
          source_metric: flag.source_metric ?? name,
        });
      }
    }
  }
  return flags;
}

export function buildKeyMetrics(
  analysis: AIAnalysisResult,
  confidence: number,
  engineCount: number,
): Record<string, MetricValue> {
  return {
    confidence_score: {
      name: 'confidence_score',
      label: 'AI Confidence Score',
      value: confidence,
      unit: 'ratio',
      source: ENGINE_NAME,
      interpretation: confidence >= 0.8 ? 'High data availability' : 'Some engines missing data',
      impact_on_score: confidence >= 0.7 ? 'positive' : 'negative',
    },
    engines_analyzed: {
      name: 'engines_analyzed',
      label: 'Engines Analyzed',
      value: engineCount,
      unit: 'count',
      source: ENGINE_NAME,
      interpretation: `${engineCount} engines provided results for AI analysis`,
      impact_on_score: 'neutral',
    },
    top_risks_count: {
      name: 'top_risks_count',
      label: 'Top Risks Identified',
      value: analysis.top_risks.length,
      unit: 'count',
      source: ENGINE_NAME,
      interpretation: `${analysis.top_risks.length} key risks identified by AI`,
      impact_on_score: analysis.top_risks.length > 2 ? 'negative' : 'neutral',
    },
    hidden_risks_count: {
      name: 'hidden_risks_count',
      label: 'Hidden Risks Detected',
      value: analysis.hidden_risks.length,
      unit: 'count',
      source: ENGINE_NAME,
      interpretation: `${analysis.hidden_risks.length} hidden risks detected across engines`,
      impact_on_score: analysis.hidden_risks.length > 0 ? 'negative' : 'positive',
    },
  };
}

// ============================================================
// Fallback — when OpenAI is unavailable, generate a rule-based analysis
// ============================================================

export function generateFallbackAnalysis(
  engineResults: Record<string, EngineOutput>,
): AIAnalysisResult {
  const entries = Object.entries(engineResults);

  // Sort engines by score ascending to find risks
  const sorted = [...entries]
    .filter(([, r]) => r.module_status !== 'blocked')
    .sort(([, a], [, b]) => a.module_score - b.module_score);

  const topRisks: RiskItem[] = sorted.slice(0, 3).map(([name, r]) => ({
    title: `${name}: score ${r.module_score}/100`,
    description: r.explanation,
    severity: r.module_score < 40 ? 'high' as const : r.module_score < 60 ? 'medium' as const : 'low' as const,
    source_engine: name,
  }));

  // Sort descending for strengths
  const topStrengths: RiskItem[] = sorted.reverse().slice(0, 3).map(([name, r]) => ({
    title: `${name}: score ${r.module_score}/100`,
    description: r.explanation,
    severity: r.module_score >= 80 ? 'high' as const : r.module_score >= 65 ? 'medium' as const : 'low' as const,
    source_engine: name,
  }));

  // Collect all critical flags as hidden risks
  const hiddenRisks: string[] = [];
  for (const [name, result] of entries) {
    for (const flag of result.risk_flags) {
      if (flag.severity === 'critical' || flag.severity === 'hard_stop') {
        hiddenRisks.push(`[${name}] ${flag.message}`);
      }
    }
  }

  const avgScore = sorted.length > 0
    ? sorted.reduce((s, [, r]) => s + r.module_score, 0) / sorted.length
    : 0;

  return {
    risk_narrative: `Analisis basado en reglas (sin AI). Score promedio: ${avgScore.toFixed(0)}/100 de ${sorted.length} motores analizados.`,
    top_risks: topRisks,
    top_strengths: topStrengths,
    scenarios: [
      { scenario_type: 'best_case', description: 'Todos los indicadores mejoran', impact: 'Aprobacion sin condiciones', probability: 'low' },
      { scenario_type: 'base_case', description: 'Indicadores se mantienen estables', impact: 'Aprobacion condicionada', probability: 'high' },
      { scenario_type: 'worst_case', description: 'Deterioro en indicadores clave', impact: 'Rechazo o reduccion de monto', probability: 'medium' },
    ],
    confidence_score: 0.3, // Low confidence for rule-based fallback
    trend_narrative: summarizeTrends(engineResults),
    hidden_risks: hiddenRisks.slice(0, 5),
  };
}

// ============================================================
// Main engine function
// ============================================================

export async function runAIRiskEngine(
  input: EngineInput,
  openaiCaller?: OpenAICaller,
): Promise<EngineOutput> {
  const engineResults = input.other_engine_results ?? {};
  const engineCount = Object.keys(engineResults).length;

  if (engineCount === 0) {
    return {
      engine_name: ENGINE_NAME,
      module_status: 'blocked',
      module_score: 0,
      module_max_score: 100,
      module_grade: 'F',
      risk_flags: [{
        code: 'no_engine_results',
        severity: 'critical',
        message: 'No engine results available for AI analysis',
      }],
      key_metrics: {},
      benchmark_comparison: {},
      trends: [],
      explanation: 'AI Risk engine blocked: no engine results provided.',
      recommended_actions: ['Run all scoring engines before AI analysis'],
      created_at: new Date().toISOString(),
    };
  }

  const dataConfidence = calculateDataConfidence(engineResults);
  let analysis: AIAnalysisResult;

  if (openaiCaller) {
    try {
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(engineResults);
      const rawResponse = await openaiCaller(userPrompt, systemPrompt);
      analysis = parseAIResponse(rawResponse);
      // Override confidence with data-based calculation
      analysis.confidence_score = Math.max(analysis.confidence_score, dataConfidence);
    } catch {
      // Fallback to rule-based analysis if OpenAI fails
      analysis = generateFallbackAnalysis(engineResults);
      analysis.confidence_score = dataConfidence * 0.5; // Penalize for AI failure
    }
  } else {
    // No OpenAI caller provided — use fallback
    analysis = generateFallbackAnalysis(engineResults);
    analysis.confidence_score = dataConfidence * 0.5;
  }

  const score = deriveScore(engineResults, analysis.confidence_score);
  const criticalFlags = collectCriticalFlags(engineResults);
  const grade = scoreToGrade(score);
  const status = scoreToStatus(score, criticalFlags);

  return {
    engine_name: ENGINE_NAME,
    module_status: status,
    module_score: score,
    module_max_score: 100,
    module_grade: grade,
    risk_flags: criticalFlags,
    key_metrics: buildKeyMetrics(analysis, analysis.confidence_score, engineCount),
    benchmark_comparison: {},
    trends: [], // AI engine doesn't produce its own trends
    explanation: analysis.risk_narrative,
    recommended_actions: analysis.top_risks.map(
      (r) => `[${r.severity.toUpperCase()}] ${r.title}: ${r.description}`,
    ),
    created_at: new Date().toISOString(),
  };
}
