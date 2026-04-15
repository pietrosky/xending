import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Filter,
  Info,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import type { CrossAnalysisResult, CrossSeverity } from '../lib/crossAnalyzer';
import { InfoPopup } from './InfoPopup';
import { getCrossInfo } from '../lib/engineDescriptions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrossAnalysisViewProps {
  results: CrossAnalysisResult[];
}

type SeverityFilter = 'all' | CrossSeverity;

// ---------------------------------------------------------------------------
// Severity display config
// ---------------------------------------------------------------------------

interface SeverityDisplay {
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  icon: typeof AlertTriangle;
}

const SEVERITY_CONFIG: Record<CrossSeverity, SeverityDisplay> = {
  critical: {
    label: 'Critico',
    emoji: '🔴',
    colorClass: 'text-status-error',
    bgClass: 'bg-status-error-bg',
    borderClass: 'border-status-error/30',
    icon: XCircle,
  },
  warning: {
    label: 'Alerta',
    emoji: '🟡',
    colorClass: 'text-status-warning',
    bgClass: 'bg-status-warning-bg',
    borderClass: 'border-status-warning/30',
    icon: AlertTriangle,
  },
  info: {
    label: 'Info',
    emoji: '🔵',
    colorClass: 'text-status-info',
    bgClass: 'bg-status-info-bg',
    borderClass: 'border-status-info/30',
    icon: Info,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function countBySeverity(
  results: CrossAnalysisResult[],
): Record<CrossSeverity, number> {
  const detected = results.filter((r) => r.pattern_detected);
  return {
    critical: detected.filter((r) => r.severity === 'critical').length,
    warning: detected.filter((r) => r.severity === 'warning').length,
    info: detected.filter((r) => r.severity === 'info').length,
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryBar({ results }: { results: CrossAnalysisResult[] }) {
  const counts = countBySeverity(results);
  const totalDetected = counts.critical + counts.warning + counts.info;

  return (
    <div
      className="flex flex-wrap items-center gap-4 text-sm"
      role="status"
      aria-label="Resumen de cruces"
    >
      <span className="text-muted-foreground">
        {totalDetected} de {results.length} patrones detectados
      </span>
      {counts.critical > 0 && (
        <span className="flex items-center gap-1 text-status-error font-medium">
          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
          {counts.critical} criticos
        </span>
      )}
      {counts.warning > 0 && (
        <span className="flex items-center gap-1 text-status-warning font-medium">
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
          {counts.warning} alertas
        </span>
      )}
      {counts.info > 0 && (
        <span className="flex items-center gap-1 text-status-info font-medium">
          <Info className="w-3.5 h-3.5" aria-hidden="true" />
          {counts.info} info
        </span>
      )}
      {totalDetected === 0 && (
        <span className="flex items-center gap-1 text-status-success font-medium">
          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
          Sin patrones de riesgo
        </span>
      )}
    </div>
  );
}

function FilterButtons({
  active,
  onChange,
  counts,
}: {
  active: SeverityFilter;
  onChange: (f: SeverityFilter) => void;
  counts: Record<CrossSeverity, number>;
}) {
  const filters: { value: SeverityFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'critical', label: `Criticos (${counts.critical})` },
    { value: 'warning', label: `Alertas (${counts.warning})` },
    { value: 'info', label: `Info (${counts.info})` },
  ];

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Filtrar por severidad">
      <Filter className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      {filters.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onChange(f.value)}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
            active === f.value
              ? 'bg-primary text-primary-foreground font-medium'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
          aria-pressed={active === f.value}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

function CrossCard({ result }: { result: CrossAnalysisResult }) {
  const config = SEVERITY_CONFIG[result.severity];
  const SeverityIcon = config.icon;
  const dimmed = !result.pattern_detected;

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col gap-2.5 transition-opacity ${
        dimmed
          ? 'bg-card border-border opacity-50'
          : `bg-card ${config.borderClass} border`
      }`}
      role="article"
      aria-label={`Cruce ${result.cross_number}: ${result.cross_name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            #{result.cross_number}
          </span>
          <h3 className="text-sm font-semibold text-foreground truncate">
            {result.cross_name}
          </h3>
          <InfoPopup data={getCrossInfo(result.cross_number)} size={13} />
        </div>
        <span
          className={`flex items-center gap-1 text-xs font-medium shrink-0 ${config.colorClass}`}
        >
          <SeverityIcon className="w-3.5 h-3.5" aria-hidden="true" />
          {result.pattern_detected ? config.label : 'OK'}
        </span>
      </div>

      {/* Engines involved */}
      <div className="flex flex-wrap gap-1.5">
        {result.engines_involved.map((engine) => (
          <span
            key={engine}
            className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground"
          >
            {engine}
          </span>
        ))}
      </div>

      {/* Interpretation */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {result.interpretation}
      </p>

      {/* Recommended action — only for detected patterns */}
      {result.pattern_detected && (
        <div className={`rounded-md p-2.5 ${config.bgClass}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-wide">
              Accion recomendada
            </span>
          </div>
          <p className="text-xs text-foreground leading-relaxed">
            {result.recommended_action}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CrossAnalysisView({ results }: CrossAnalysisViewProps) {
  const [filter, setFilter] = useState<SeverityFilter>('all');
  const counts = countBySeverity(results);

  // Sort: detected first (critical > warning > info), then non-detected
  const severityOrder: Record<CrossSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  const filtered = results
    .filter((r) => {
      if (filter === 'all') return true;
      return r.pattern_detected && r.severity === filter;
    })
    .sort((a, b) => {
      // Detected patterns first
      if (a.pattern_detected !== b.pattern_detected) {
        return a.pattern_detected ? -1 : 1;
      }
      // Then by severity
      if (a.pattern_detected && b.pattern_detected) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      // Non-detected by cross number
      return a.cross_number - b.cross_number;
    });

  return (
    <section className="flex flex-col gap-4" aria-label="Cross Analysis - 20 Cruces Inteligentes">
      {/* Summary + Filters */}
      <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-3">
        <SummaryBar results={results} />
        <FilterButtons active={filter} onChange={setFilter} counts={counts} />
      </div>

      {/* Cross cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="list" aria-label="Lista de cruces">
        {filtered.map((result) => (
          <div key={result.cross_number} role="listitem">
            <CrossCard result={result} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No hay cruces con el filtro seleccionado.
          </p>
        </div>
      )}
    </section>
  );
}
