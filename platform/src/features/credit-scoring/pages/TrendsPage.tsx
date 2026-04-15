import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Loader2 } from 'lucide-react';
import type { TrendResult } from '../types/trend.types';
import { TrendDashboard } from '../components/TrendDashboard';
import { useScoringOrchestrator } from '../hooks/useScoringOrchestrator';
import { DEMO_APPLICATION } from '../lib/demoData';

export function TrendsPage() {
  const { id } = useParams<{ id: string }>();
  const orch = useScoringOrchestrator();

  // Collect all trends from all engine results
  const trends: TrendResult[] = [];
  for (const result of Object.values(orch.engineResults)) {
    trends.push(...result.trends);
  }

  return (
    <div>
      <Link
        to={`/applications/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a solicitud
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Tendencias</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {DEMO_APPLICATION.company_name}
            </p>
          </div>
        </div>
      </div>

      {orch.isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="ml-2 text-sm text-muted-foreground">Cargando tendencias...</span>
        </div>
      )}

      {orch.error && (
        <div className="bg-status-error-bg border border-status-error/30 rounded-lg p-4">
          <p className="text-sm text-status-error">Error: {orch.error}</p>
          <button onClick={orch.rerun} className="mt-2 text-xs text-primary hover:underline">Reintentar</button>
        </div>
      )}

      {!orch.isLoading && !orch.error && trends.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            No hay datos de tendencias disponibles para esta solicitud.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Las tendencias se generan al ejecutar los motores de scoring.
          </p>
        </div>
      )}

      {!orch.isLoading && !orch.error && trends.length > 0 && (
        <TrendDashboard trends={trends} />
      )}
    </div>
  );
}
