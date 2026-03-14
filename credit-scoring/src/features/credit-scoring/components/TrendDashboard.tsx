import { useState, useMemo } from 'react';
import { BarChart3, Search, X } from 'lucide-react';
import type { TrendResult, TrendClassification, TrendDirection } from '../types/trend.types';
import { GRADE_COLORS } from '../lib/chartColors';
import { TrendChart } from './TrendChart';

const ALL_GRADES: TrendClassification[] = ['A', 'B', 'C', 'D', 'F'];
const ALL_DIRECTIONS: TrendDirection[] = ['improving', 'stable', 'deteriorating', 'critical'];

const DIRECTION_LABELS: Record<TrendDirection, string> = {
  improving: 'Mejorando',
  stable: 'Estable',
  deteriorating: 'Deteriorando',
  critical: 'Critico',
};

const DIRECTION_COLORS: Record<TrendDirection, string> = {
  improving: 'hsl(142, 76%, 36%)',
  stable: 'hsl(215, 16%, 47%)',
  deteriorating: 'hsl(45, 93%, 47%)',
  critical: 'hsl(0, 84%, 60%)',
};

/** Count trends per classification grade */
function countByGrade(trends: TrendResult[]): Record<TrendClassification, number> {
  const counts: Record<TrendClassification, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const t of trends) {
    counts[t.classification] = (counts[t.classification] ?? 0) + 1;
  }
  return counts;
}

function countByDirection(trends: TrendResult[]): Record<TrendDirection, number> {
  const counts: Record<TrendDirection, number> = { improving: 0, stable: 0, deteriorating: 0, critical: 0 };
  for (const t of trends) {
    counts[t.direction] = (counts[t.direction] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Drill-down detail panel
// ---------------------------------------------------------------------------

function DrillDownPanel({ trend, onClose }: { trend: TrendResult; onClose: () => void }) {
  return (
    <div className="bg-card rounded-lg border-2 border-primary/30 p-4 space-y-3" role="dialog" aria-label={`Detalle ${trend.metric_label}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">{trend.metric_label}</h3>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Cerrar detalle">
          <X size={18} />
        </button>
      </div>

      <TrendChart trend={trend} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Valor Actual</p>
          <p className="font-medium text-foreground">{trend.current_value.toLocaleString('es-MX')}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Cambio</p>
          <p className={`font-medium ${trend.change_percent >= 0 ? 'text-status-success' : 'text-status-error'}`}>
            {trend.change_percent >= 0 ? '+' : ''}{trend.change_percent.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pendiente (slope)</p>
          <p className="font-medium text-foreground">{trend.slope.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">R-squared</p>
          <p className="font-medium text-foreground">{trend.r_squared.toFixed(3)}</p>
        </div>
      </div>

      {trend.months_to_threshold !== undefined && trend.months_to_threshold > 0 && (
        <p className="text-xs text-status-warning">
          Cruce de umbral {trend.threshold_type === 'critical' ? 'critico' : 'de alerta'} en {trend.months_to_threshold} mes(es)
        </p>
      )}

      {trend.risk_flags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Risk Flags</p>
          <div className="flex flex-wrap gap-1">
            {trend.risk_flags.map((flag) => (
              <span key={flag} className="text-xs bg-status-danger-bg text-status-danger px-2 py-0.5 rounded-full">{flag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface TrendDashboardProps {
  trends: TrendResult[];
}

export function TrendDashboard({ trends }: TrendDashboardProps) {
  const [activeGrade, setActiveGrade] = useState<TrendClassification | null>(null);
  const [activeDirection, setActiveDirection] = useState<TrendDirection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrend, setSelectedTrend] = useState<TrendResult | null>(null);

  const gradeCounts = useMemo(() => countByGrade(trends), [trends]);
  const directionCounts = useMemo(() => countByDirection(trends), [trends]);

  const filtered = useMemo(() => {
    let result = trends;
    if (activeGrade) result = result.filter((t) => t.classification === activeGrade);
    if (activeDirection) result = result.filter((t) => t.direction === activeDirection);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.metric_label.toLowerCase().includes(q) || t.metric_name.toLowerCase().includes(q));
    }
    return result;
  }, [trends, activeGrade, activeDirection, searchQuery]);

  return (
    <section aria-label="Dashboard de tendencias" className="flex flex-col gap-4">
      {/* Summary header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">
            Tendencias ({filtered.length}/{trends.length})
          </h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar metrica..."
            className="pl-8 pr-3 py-1.5 text-xs rounded border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48"
            aria-label="Buscar metrica"
          />
        </div>
      </div>

      {/* Grade filter badges */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por clasificacion">
        <button
          type="button"
          onClick={() => setActiveGrade(null)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            activeGrade === null
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-primary/40'
          }`}
          aria-pressed={activeGrade === null}
        >
          Todas
        </button>
        {ALL_GRADES.map((grade) => {
          const count = gradeCounts[grade];
          const color = GRADE_COLORS[grade];
          const isActive = activeGrade === grade;
          return (
            <button
              key={grade}
              type="button"
              onClick={() => setActiveGrade(isActive ? null : grade)}
              className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                isActive ? 'border-current' : 'border-border hover:border-current'
              }`}
              style={{ color, backgroundColor: isActive ? `${color}18` : undefined }}
              aria-pressed={isActive}
              aria-label={`Clasificacion ${grade}: ${count} tendencias`}
            >
              {grade} ({count})
            </button>
          );
        })}
      </div>

      {/* Direction filter badges */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por direccion">
        {ALL_DIRECTIONS.map((dir) => {
          const count = directionCounts[dir];
          const color = DIRECTION_COLORS[dir];
          const isActive = activeDirection === dir;
          return (
            <button
              key={dir}
              type="button"
              onClick={() => setActiveDirection(isActive ? null : dir)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                isActive ? 'border-current' : 'border-border hover:border-current'
              }`}
              style={{ color, backgroundColor: isActive ? `${color}18` : undefined }}
              aria-pressed={isActive}
              aria-label={`Direccion ${DIRECTION_LABELS[dir]}: ${count}`}
            >
              {DIRECTION_LABELS[dir]} ({count})
            </button>
          );
        })}
      </div>

      {/* Drill-down panel */}
      {selectedTrend && (
        <DrillDownPanel trend={selectedTrend} onClose={() => setSelectedTrend(null)} />
      )}

      {/* Grid of TrendCharts */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No hay tendencias que coincidan con los filtros.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((trend) => (
            <div
              key={trend.metric_name}
              role="button"
              tabIndex={0}
              className={`cursor-pointer rounded-lg transition-shadow hover:shadow-md ${
                selectedTrend?.metric_name === trend.metric_name ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedTrend(selectedTrend?.metric_name === trend.metric_name ? null : trend)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedTrend(selectedTrend?.metric_name === trend.metric_name ? null : trend);
                }
              }}
              aria-label={`Ver detalle de ${trend.metric_label}`}
            >
              <TrendChart trend={trend} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
