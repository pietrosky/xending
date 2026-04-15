import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Gavel, Loader2 } from 'lucide-react';
import type { ScoringResult } from '../types/application.types';
import type { RiskFlag } from '../types/engine.types';
import type { ConstraintName } from '../engines/creditLimit';
import type { AIAnalysisPanelProps } from '../components/AIAnalysisPanel';
import { RiskMatrixGates } from '../components/RiskMatrixGates';
import { CreditLimitBreakdown } from '../components/CreditLimitBreakdown';
import { AIAnalysisPanel } from '../components/AIAnalysisPanel';
import { CrossAnalysisView } from '../components/CrossAnalysisView';
import { DecisionWorkflow } from '../components/DecisionWorkflow';
import { useScoringOrchestrator } from '../hooks/useScoringOrchestrator';
import { DEMO_APPLICATION } from '../lib/demoData';

// ---------------------------------------------------------------------------
// Helpers: map orchestrator → component props
// ---------------------------------------------------------------------------

function buildScoring(
  orch: ReturnType<typeof useScoringOrchestrator>,
  applicationId: string,
): ScoringResult {
  const allFlags: RiskFlag[] = [];
  const breakdown: Record<string, number> = {};
  for (const [name, r] of Object.entries(orch.engineResults)) {
    allFlags.push(...r.risk_flags);
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
  const m = orch.engineResults['credit_limit']?.key_metrics ?? {};
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
    explanation: orch.engineResults['credit_limit']?.explanation ?? '',
  };
}

function buildAIAnalysis(orch: ReturnType<typeof useScoringOrchestrator>): AIAnalysisPanelProps {
  const aiResult = orch.engineResults['ai_risk'];
  const topRisks: AIAnalysisPanelProps['top_risks'] = [];
  const topStrengths: AIAnalysisPanelProps['top_strengths'] = [];

  for (const [name, result] of Object.entries(orch.engineResults)) {
    for (const flag of result.risk_flags) {
      if (flag.severity === 'critical' || flag.severity === 'hard_stop') {
        topRisks.push({ title: flag.code.replace(/_/g, ' '), description: flag.message, severity: 'high', source_engine: name });
      } else if (flag.severity === 'warning') {
        topRisks.push({ title: flag.code.replace(/_/g, ' '), description: flag.message, severity: 'medium', source_engine: name });
      }
    }
    if (result.module_score >= 75) {
      topStrengths.push({ title: `${name} score ${result.module_score}`, description: result.explanation.slice(0, 120), severity: 'low', source_engine: name });
    }
  }

  const hiddenRisks = orch.crossResults
    .filter((c) => c.pattern_detected && c.severity === 'critical')
    .map((c) => c.interpretation)
    .slice(0, 3);

  return {
    risk_narrative: aiResult?.explanation ?? 'Analisis AI no disponible.',
    top_risks: topRisks.slice(0, 5),
    top_strengths: topStrengths.slice(0, 5),
    confidence_score: aiResult?.module_score ?? 0,
    hidden_risks: hiddenRisks,
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function DecisionPage() {
  const { id } = useParams<{ id: string }>();
  const applicationId = id ?? DEMO_APPLICATION.id;
  const orch = useScoringOrchestrator();

  if (orch.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
        <span className="ml-2 text-sm text-muted-foreground">Ejecutando scoring...</span>
      </div>
    );
  }

  if (orch.error) {
    return (
      <div className="bg-status-error-bg border border-status-error/30 rounded-lg p-4">
        <p className="text-sm text-status-error">Error: {orch.error}</p>
        <button onClick={orch.rerun} className="mt-2 text-xs text-primary hover:underline">Reintentar</button>
      </div>
    );
  }

  const scoring = buildScoring(orch, applicationId);
  const creditLimits = buildCreditLimits(orch);
  const aiAnalysis = buildAIAnalysis(orch);

  return (
    <div>
      <Link
        to={`/applications/${applicationId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a solicitud
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Gavel className="w-6 h-6 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Decision Final</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {DEMO_APPLICATION.company_name} — Score {orch.consolidatedScore} ({orch.grade})
          </p>
        </div>
      </div>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">Matriz de Riesgo — 3 Gates</h3>
        <RiskMatrixGates scoring={scoring} />
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">Calculo de Monto</h3>
        <CreditLimitBreakdown {...creditLimits} currency={DEMO_APPLICATION.currency} />
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">Analisis AI</h3>
        <AIAnalysisPanel {...aiAnalysis} />
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">Cruces Inteligentes</h3>
        <CrossAnalysisView results={orch.crossResults} />
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">Workflow de Aprobacion</h3>
        <DecisionWorkflow
          application_id={applicationId}
          requested_amount={DEMO_APPLICATION.requested_amount}
          currency={DEMO_APPLICATION.currency}
          approval_level={orch.approvalLevel as 'analyst' | 'manager' | 'committee'}
          status={orch.decision === 'approved' ? 'approved' : orch.decision === 'rejected' ? 'rejected' : 'conditional'}
          conditions={orch.engineResults['covenant']?.recommended_actions}
          decision_history={[
            {
              action: 'Scoring completado',
              decided_by: 'Sistema (Orquestador)',
              timestamp: new Date().toISOString(),
              conditions: `Score ${orch.consolidatedScore}, Grade ${orch.grade}, Decision ${orch.decision}`,
            },
          ]}
        />
      </section>
    </div>
  );
}
