import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Brain,
  DollarSign,
  FilePlus,
  FileText,
  Gauge,
  Gavel,
  GitCompare,
  Loader2,
  RefreshCw,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { ApplicationOverview } from '../components/ApplicationOverview';
import { EngineScoreCard } from '../components/EngineScoreCard';
import { EngineDetailView } from '../components/EngineDetailView';
import { RiskMatrixGates } from '../components/RiskMatrixGates';
import { CreditLimitBreakdown } from '../components/CreditLimitBreakdown';
import { AIAnalysisPanel } from '../components/AIAnalysisPanel';
import { CrossAnalysisView } from '../components/CrossAnalysisView';
import { DecisionWorkflow } from '../components/DecisionWorkflow';
import { TrendDashboard } from '../components/TrendDashboard';
import { ScoringReport } from '../components/ScoringReport';
import { useScoringOrchestrator } from '../hooks/useScoringOrchestrator';
import { DEMO_APPLICATION } from '../lib/demoData';
import type { CreditApplication, ScoringResult } from '../types/application.types';
import type { RiskFlag } from '../types/engine.types';
import type { TrendResult } from '../types/trend.types';
import type { ConstraintName } from '../engines/creditLimit';
import type { AIAnalysisPanelProps } from '../components/AIAnalysisPanel';

// ============================================================
// Sub-tab definitions
// ============================================================

type SubTab =
  | 'overview'
  | 'engines'
  | 'trends'
  | 'crosses'
  | 'ai'
  | 'credit_limit'
  | 'decision'
  | 'report';

interface TabDef {
  key: SubTab;
  label: string;
  icon: typeof Gauge;
}

const TABS: TabDef[] = [
  { key: 'overview', label: 'Resumen', icon: Gauge },
  { key: 'engines', label: 'Motores', icon: Zap },
  { key: 'trends', label: 'Tendencias', icon: TrendingUp },
  { key: 'crosses', label: 'Cruces', icon: GitCompare },
  { key: 'ai', label: 'AI', icon: Brain },
  { key: 'credit_limit', label: 'Monto', icon: DollarSign },
  { key: 'decision', label: 'Decision', icon: Gavel },
  { key: 'report', label: 'Reporte', icon: FileText },
];

// ============================================================
// Helpers: build typed props from orchestrator results
// ============================================================

function buildScoringResult(
  orch: ReturnType<typeof useScoringOrchestrator>,
  applicationId: string,
): ScoringResult {
  const allFlags: RiskFlag[] = [];
  for (const r of Object.values(orch.engineResults)) {
    allFlags.push(...r.risk_flags);
  }

  const breakdown: Record<string, number> = {};
  for (const [name, r] of Object.entries(orch.engineResults)) {
    breakdown[name] = r.module_score;
  }

  return {
    application_id: applicationId,
    gate1_result: orch.gate1Passed ? 'pass' : 'hard_stop',
    gate1_flags: allFlags,
    gate2_semaphores: orch.gate2Semaphores as Record<string, 'green' | 'yellow' | 'red'>,
    gate3_score: orch.consolidatedScore,
    gate3_breakdown: breakdown,
    final_decision: orch.decision,
    credit_limit: orch.creditLimit,
    binding_constraint: orch.bindingConstraint,
    review_frequency: `${orch.reviewFrequency} meses`,
    covenants: orch.engineResults['covenant']?.recommended_actions ?? [],
    ai_narrative: orch.engineResults['ai_risk']?.explanation ?? '',
  };
}

function buildCreditLimits(orch: ReturnType<typeof useScoringOrchestrator>) {
  const clResult = orch.engineResults['credit_limit'];
  const m = clResult?.key_metrics ?? {};

  return {
    limits: {
      limit_by_flow: m['limit_by_flow']?.value ?? 0,
      limit_by_sales: m['limit_by_sales']?.value ?? 0,
      limit_by_ebitda: m['limit_by_ebitda']?.value ?? 0,
      limit_by_guarantee: m['limit_by_guarantee']?.value ?? 0,
      limit_by_portfolio: m['limit_by_portfolio']?.value ?? 0,
    },
    final_limit: m['final_limit']?.value ?? orch.creditLimit,
    binding_constraint: (orch.bindingConstraint || 'limit_by_flow') as ConstraintName,
    explanation: clResult?.explanation ?? 'Sin datos de limite',
  };
}

function buildAIAnalysis(orch: ReturnType<typeof useScoringOrchestrator>): AIAnalysisPanelProps {
  const aiResult = orch.engineResults['ai_risk'];
  const m = aiResult?.key_metrics ?? {};

  // Extract top risks from all engines
  const topRisks: AIAnalysisPanelProps['top_risks'] = [];
  const topStrengths: AIAnalysisPanelProps['top_strengths'] = [];

  for (const [name, result] of Object.entries(orch.engineResults)) {
    for (const flag of result.risk_flags) {
      if (flag.severity === 'critical' || flag.severity === 'hard_stop') {
        topRisks.push({
          title: flag.code.replace(/_/g, ' '),
          description: flag.message,
          severity: 'high',
          source_engine: name,
        });
      } else if (flag.severity === 'warning') {
        topRisks.push({
          title: flag.code.replace(/_/g, ' '),
          description: flag.message,
          severity: 'medium',
          source_engine: name,
        });
      }
    }
    // Strengths: engines with score >= 75
    if (result.module_score >= 75) {
      topStrengths.push({
        title: `${name} score ${result.module_score}`,
        description: result.explanation.slice(0, 120),
        severity: 'low',
        source_engine: name,
      });
    }
  }

  // Scenarios from scenario engine
  const scenarioResult = orch.engineResults['scenario'];
  const scenarios: AIAnalysisPanelProps['scenarios'] = [];
  if (scenarioResult) {
    for (const action of scenarioResult.recommended_actions.slice(0, 3)) {
      scenarios.push({
        scenario_type: 'Escenario',
        description: action,
        impact: 'Ver detalle en motor de escenarios',
        probability: 'medium',
      });
    }
  }

  // Hidden risks from cross analysis
  const hiddenRisks = orch.crossResults
    .filter((c) => c.pattern_detected && c.severity === 'critical')
    .map((c) => c.interpretation)
    .slice(0, 3);

  return {
    risk_narrative: aiResult?.explanation ?? 'Analisis AI no disponible.',
    top_risks: topRisks.slice(0, 5),
    top_strengths: topStrengths.slice(0, 5),
    trend_narrative: m['trend_summary']?.interpretation,
    scenarios,
    confidence_score: m['confidence_score']?.value ?? aiResult?.module_score ?? 0,
    hidden_risks: hiddenRisks,
  };
}

function collectAllTrends(orch: ReturnType<typeof useScoringOrchestrator>): TrendResult[] {
  const all: TrendResult[] = [];
  for (const result of Object.values(orch.engineResults)) {
    all.push(...result.trends);
  }
  return all;
}

// ============================================================
// Main page component
// ============================================================

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);

  const orch = useScoringOrchestrator();

  // Use demo application data (will be replaced with Supabase query)
  const application: CreditApplication = {
    ...DEMO_APPLICATION,
    id: id ?? DEMO_APPLICATION.id,
  };

  const scoring = orch.isLoading ? null : buildScoringResult(orch, application.id);
  const engineResultsArray = Object.values(orch.engineResults);
  const allTrends = collectAllTrends(orch);

  // If no :id param, this is the main dashboard page
  const isDashboard = !id;

  return (
    <div>
      {/* Back link — only when viewing a specific application */}
      {!isDashboard && (
        <Link
          to="/applications"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a solicitudes
        </Link>
      )}

      {/* Dashboard header with Tramitar Credito button */}
      {isDashboard && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Scory Credit — Dashboard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sistema de Credit Scoring Inteligente
            </p>
          </div>
          <Link
            to="/applications/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
          >
            <FilePlus size={16} aria-hidden="true" />
            Tramitar Credito
          </Link>
        </div>
      )}

      {/* Loading state */}
      {orch.isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
          <span className="ml-2 text-sm text-muted-foreground">
            Ejecutando motores de scoring...
          </span>
        </div>
      )}

      {/* Error state */}
      {orch.error && (
        <div className="bg-status-error-bg border border-status-error/30 rounded-lg p-4 mb-4">
          <p className="text-sm text-status-error">Error: {orch.error}</p>
          <button
            onClick={orch.rerun}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Scored content */}
      {!orch.isLoading && !orch.error && (
        <>
          {/* Execution info bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>
                {Object.keys(orch.engineResults).length} motores ejecutados en {orch.executionTimeMs}ms
              </span>
              <span>|</span>
              <span>Score: {orch.consolidatedScore}/100 ({orch.grade})</span>
            </div>
            <button
              onClick={orch.rerun}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-border bg-card hover:bg-muted transition-colors"
              aria-label="Re-ejecutar scoring"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              Re-ejecutar
            </button>
          </div>

          {/* Sub-tab navigation */}
          <nav
            className="flex items-center gap-1 overflow-x-auto mb-6 border-b border-border pb-px"
            role="tablist"
            aria-label="Secciones de scoring"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedEngine(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-card text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Tab content */}
          <div role="tabpanel">
            {/* Overview */}
            {activeTab === 'overview' && scoring && (
              <ApplicationOverview application={application} scoring={scoring} />
            )}

            {/* Engines */}
            {activeTab === 'engines' && !selectedEngine && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {engineResultsArray.map((result) => (
                  <EngineScoreCard
                    key={result.engine_name}
                    result={result}
                    onViewDetail={(name) => setSelectedEngine(name)}
                  />
                ))}
              </div>
            )}

            {activeTab === 'engines' && selectedEngine && orch.engineResults[selectedEngine] != null && (
              <div>
                <button
                  onClick={() => setSelectedEngine(null)}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  Volver a motores
                </button>
                <EngineDetailView result={orch.engineResults[selectedEngine]!} />
              </div>
            )}

            {/* Trends */}
            {activeTab === 'trends' && (
              <>
                {allTrends.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-border rounded-lg">
                    <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      No hay datos de tendencias disponibles.
                    </p>
                  </div>
                ) : (
                  <TrendDashboard trends={allTrends} />
                )}
              </>
            )}

            {/* Cross Analysis */}
            {activeTab === 'crosses' && (
              <CrossAnalysisView results={orch.crossResults} />
            )}

            {/* AI Analysis */}
            {activeTab === 'ai' && (
              <AIAnalysisPanel {...buildAIAnalysis(orch)} />
            )}

            {/* Credit Limit */}
            {activeTab === 'credit_limit' && (
              <CreditLimitBreakdown
                {...buildCreditLimits(orch)}
                currency={application.currency}
              />
            )}

            {/* Decision */}
            {activeTab === 'decision' && scoring && (
              <div className="flex flex-col gap-6">
                <RiskMatrixGates scoring={scoring} />
                <DecisionWorkflow
                  application_id={application.id}
                  requested_amount={application.requested_amount}
                  currency={application.currency}
                  approval_level={orch.approvalLevel as 'analyst' | 'manager' | 'committee'}
                  status={orch.decision === 'approved' ? 'approved' : orch.decision === 'rejected' ? 'rejected' : 'conditional'}
                  conditions={orch.engineResults['covenant']?.recommended_actions}
                  decision_history={[
                    {
                      action: 'Scoring completado',
                      decided_by: 'Sistema (Orquestador Demo)',
                      timestamp: new Date().toISOString(),
                      conditions: `Score ${orch.consolidatedScore}, Grade ${orch.grade}`,
                    },
                  ]}
                />
              </div>
            )}

            {/* Report */}
            {activeTab === 'report' && scoring && (
              <ScoringReport
                application={application}
                scoring={scoring}
                engineResults={engineResultsArray}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
