import { AlertTriangle, ArrowRight, CheckCircle, ShieldAlert, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { EngineOutput, ModuleGrade, ModuleStatus, RiskFlag } from '../types/engine.types';
import type { TrendDirection, TrendClassification } from '../types/trend.types';
import { GRADE_COLORS } from '../lib/chartColors';
import { InfoPopup } from './InfoPopup';
import { getEngineInfo } from '../lib/engineDescriptions';

/** Human-readable engine labels and their weight in the consolidated score */
const ENGINE_LABELS: Record<string, { label: string; weight: string }> = {
  compliance: { label: 'Compliance (PLD/KYC)', weight: 'Gate' },
  sat_facturacion: { label: 'SAT / Facturación', weight: '14%' },
  buro: { label: 'Buró de Crédito', weight: '10%' },
  documentation: { label: 'Documentación', weight: '4%' },
  financial: { label: 'Financiero', weight: '11%' },
  cashflow: { label: 'Flujo de Caja', weight: '16%' },
  working_capital: { label: 'Capital de Trabajo', weight: '4%' },
  stability: { label: 'Estabilidad', weight: '9%' },
  operational: { label: 'Riesgo Operativo', weight: '9%' },
  network: { label: 'Red Comercial', weight: '8%' },
  fx_risk: { label: 'Riesgo Cambiario', weight: '7%' },
  guarantee: { label: 'Garantías', weight: 'Gate' },
  portfolio: { label: 'Portafolio', weight: '5%' },
  graph_fraud: { label: 'Fraude (Grafos)', weight: 'Gate' },
  employee: { label: 'Empleados', weight: '3%' },
  benchmark: { label: 'Benchmark', weight: '—' },
};

const DIRECTION_CONFIG: Record<TrendDirection, { label: string; icon: typeof TrendingUp; colorClass: string }> = {
  improving: { label: 'Mejorando', icon: TrendingUp, colorClass: 'text-status-success' },
  stable: { label: 'Estable', icon: Minus, colorClass: 'text-muted-foreground' },
  deteriorating: { label: 'Deteriorando', icon: TrendingDown, colorClass: 'text-status-warning' },
  critical: { label: 'Crítico', icon: TrendingDown, colorClass: 'text-status-error' },
};

const GRADE_BG: Record<ModuleGrade, string> = {
  A: 'bg-status-success-bg text-status-success',
  B: 'bg-status-success-bg text-status-success',
  C: 'bg-status-warning-bg text-status-warning',
  D: 'bg-status-warning-bg text-status-warning',
  F: 'bg-status-error-bg text-status-error',
};

const STATUS_ICON: Record<ModuleStatus, typeof CheckCircle> = {
  pass: CheckCircle,
  warning: AlertTriangle,
  fail: ShieldAlert,
  blocked: ShieldAlert,
};

const STATUS_COLOR: Record<ModuleStatus, string> = {
  pass: 'text-status-success',
  warning: 'text-status-warning',
  fail: 'text-status-error',
  blocked: 'text-muted-foreground',
};

const SEVERITY_STYLE: Record<RiskFlag['severity'], string> = {
  info: 'bg-status-info-bg text-status-info',
  warning: 'bg-status-warning-bg text-status-warning',
  critical: 'bg-status-error-bg text-status-error',
  hard_stop: 'bg-status-error-bg text-status-error font-semibold',
};

/** Derive the dominant trend from an engine's trend results */
function getDominantTrend(trends: EngineOutput['trends']): {
  direction: TrendDirection;
  classification: TrendClassification;
} | null {
  if (!trends || trends.length === 0) return null;

  const classOrder: TrendClassification[] = ['F', 'D', 'C', 'B', 'A'];
  let worstIdx = classOrder.length;

  for (const t of trends) {
    const idx = classOrder.indexOf(t.classification);
    if (idx < worstIdx) worstIdx = idx;
  }

  // Pick the first trend that matches the worst classification for direction
  const worstClass = classOrder[worstIdx] ?? 'B';
  const representative = trends.find((t) => t.classification === worstClass) ?? trends[0];
  if (!representative) return null;

  return { direction: representative.direction, classification: worstClass };
}

interface EngineScoreCardProps {
  result: EngineOutput;
  onViewDetail?: (engineName: string) => void;
}

export function EngineScoreCard({ result, onViewDetail }: EngineScoreCardProps) {
  const meta = ENGINE_LABELS[result.engine_name] ?? { label: result.engine_name, weight: '—' };
  const trend = getDominantTrend(result.trends);
  const TrendIcon = trend ? DIRECTION_CONFIG[trend.direction].icon : null;
  const StatusIcon = STATUS_ICON[result.module_status];
  const scorePercent = result.module_max_score > 0
    ? Math.round((result.module_score / result.module_max_score) * 100)
    : 0;

  // Show max 3 flags to keep the card compact
  const visibleFlags = result.risk_flags.slice(0, 3);
  const extraFlagCount = result.risk_flags.length - visibleFlags.length;

  return (
    <article
      className="bg-card rounded-lg border border-border p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow"
      aria-label={`Motor ${meta.label}`}
    >
      {/* Header: engine name + weight + info popup */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${STATUS_COLOR[result.module_status]}`} aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
          <InfoPopup data={getEngineInfo(result.engine_name)} size={13} />
        </div>
        <span className="text-xs text-muted-foreground">{meta.weight}</span>
      </div>

      {/* Score + Grade */}
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold text-foreground">
          {result.module_score}<span className="text-sm font-normal text-muted-foreground">/{result.module_max_score}</span>
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${GRADE_BG[result.module_grade]}`}>
          {result.module_grade}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={scorePercent} aria-valuemin={0} aria-valuemax={100} aria-label={`Score ${scorePercent}%`}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${scorePercent}%`,
            backgroundColor: scorePercent >= 75 ? 'hsl(142, 76%, 36%)' : scorePercent >= 50 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)',
          }}
        />
      </div>

      {/* Trend direction + classification */}
      {trend && TrendIcon && (
        <div className={`flex items-center gap-1.5 text-xs ${DIRECTION_CONFIG[trend.direction].colorClass}`}>
          <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{DIRECTION_CONFIG[trend.direction].label}</span>
          <span
            className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{
              color: GRADE_COLORS[trend.classification] ?? GRADE_COLORS.C,
              backgroundColor: `${GRADE_COLORS[trend.classification] ?? GRADE_COLORS.C}18`,
            }}
            aria-label={`Clasificación tendencia ${trend.classification}`}
          >
            {trend.classification}
          </span>
        </div>
      )}

      {/* Risk flags */}
      {visibleFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleFlags.map((flag) => (
            <span
              key={flag.code}
              className={`text-[11px] px-1.5 py-0.5 rounded ${SEVERITY_STYLE[flag.severity]}`}
              title={flag.message}
            >
              {flag.code}
            </span>
          ))}
          {extraFlagCount > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              +{extraFlagCount}
            </span>
          )}
        </div>
      )}

      {/* Detail link */}
      {onViewDetail && (
        <button
          type="button"
          onClick={() => onViewDetail(result.engine_name)}
          className="mt-auto flex items-center gap-1 text-xs text-primary hover:underline self-start"
          aria-label={`Ver detalle de ${meta.label}`}
        >
          Ver detalle <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
