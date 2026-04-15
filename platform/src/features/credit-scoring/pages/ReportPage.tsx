import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Printer, Download, Loader2 } from 'lucide-react';
import type { CreditApplication, ScoringResult } from '../types/application.types';
import type { RiskFlag } from '../types/engine.types';
import { ScoringReport } from '../components/ScoringReport';
import { useScoringOrchestrator } from '../hooks/useScoringOrchestrator';
import { DEMO_APPLICATION } from '../lib/demoData';

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const applicationId = id ?? DEMO_APPLICATION.id;
  const orch = useScoringOrchestrator();

  const application: CreditApplication = {
    ...DEMO_APPLICATION,
    id: applicationId,
    status: orch.isLoading ? 'scoring_in_progress' : 'scored',
  };

  function handlePrint() {
    window.print();
  }

  if (orch.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" aria-hidden="true" />
        <span className="ml-2 text-sm text-muted-foreground">Generando reporte...</span>
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

  // Build ScoringResult from orchestrator
  const allFlags: RiskFlag[] = [];
  const breakdown: Record<string, number> = {};
  for (const [name, r] of Object.entries(orch.engineResults)) {
    allFlags.push(...r.risk_flags);
    breakdown[name] = r.module_score;
  }

  const scoring: ScoringResult = {
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

  const engineResults = Object.values(orch.engineResults);

  return (
    <div>
      {/* Navigation + actions (hidden in print) */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link
          to={`/applications/${applicationId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a solicitud
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-card hover:bg-muted transition-colors"
            aria-label="Imprimir reporte"
          >
            <Printer size={14} aria-hidden="true" />
            Imprimir
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            aria-label="Descargar PDF"
          >
            <Download size={14} aria-hidden="true" />
            Descargar PDF
          </button>
        </div>
      </div>

      {/* Page header (hidden in print) */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <FileText className="w-6 h-6 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Reporte de Scoring</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {application.company_name} — Score {orch.consolidatedScore} ({orch.grade})
          </p>
        </div>
      </div>

      {/* Report content */}
      <ScoringReport
        application={application}
        scoring={scoring}
        engineResults={engineResults}
      />
    </div>
  );
}
