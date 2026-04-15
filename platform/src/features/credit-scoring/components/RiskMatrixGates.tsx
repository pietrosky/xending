import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { DecisionType, ScoringResult } from '../types/application.types';
import type { RiskFlag } from '../types/engine.types';
import { InfoPopup } from './InfoPopup';
import { GATE_INFO } from '../lib/engineDescriptions';

// --- Decision display config ---

interface DecisionDisplay {
  label: string;
  colorClass: string;
  bgClass: string;
  icon: typeof CheckCircle;
}

const DECISION_DISPLAY: Record<DecisionType, DecisionDisplay> = {
  approved: {
    label: 'Aprobado',
    colorClass: 'text-status-success',
    bgClass: 'bg-status-success-bg',
    icon: CheckCircle,
  },
  conditional: {
    label: 'Aprobado Condicionado',
    colorClass: 'text-status-warning',
    bgClass: 'bg-status-warning-bg',
    icon: AlertTriangle,
  },
  committee: {
    label: 'Comite',
    colorClass: 'text-status-warning',
    bgClass: 'bg-status-warning-bg',
    icon: AlertTriangle,
  },
  rejected: {
    label: 'Rechazado',
    colorClass: 'text-status-error',
    bgClass: 'bg-status-error-bg',
    icon: XCircle,
  },
};

const SEMAPHORE_STYLE: Record<string, { bg: string; label: string }> = {
  green: { bg: 'bg-status-success', label: 'Verde' },
  yellow: { bg: 'bg-status-warning', label: 'Amarillo' },
  red: { bg: 'bg-status-error', label: 'Rojo' },
};

const ENGINE_LABELS: Record<string, string> = {
  compliance: 'Compliance',
  sat_facturacion: 'SAT',
  buro: 'Buro',
  documentation: 'Docs',
  financial: 'Financiero',
  cashflow: 'Flujo',
  working_capital: 'Cap. Trabajo',
  stability: 'Estabilidad',
  operational: 'Operativo',
  network: 'Red',
  fx_risk: 'FX',
  guarantee: 'Garantias',
  portfolio: 'Portafolio',
  graph_fraud: 'Fraude',
  employee: 'Empleados',
  benchmark: 'Benchmark',
};

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-status-success';
  if (score >= 50) return 'text-status-warning';
  return 'text-status-error';
}

function getScoreBarColor(score: number): string {
  if (score >= 75) return 'hsl(var(--status-success))';
  if (score >= 50) return 'hsl(var(--status-warning))';
  return 'hsl(var(--status-error))';
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// --- Sub-components ---

function Gate1HardStops({
  result,
  flags,
}: {
  result: 'pass' | 'hard_stop';
  flags: RiskFlag[];
}) {
  const passed = result === 'pass';
  const hardStopFlags = flags.filter((f) => f.severity === 'hard_stop' || f.severity === 'critical');

  return (
    <div className="flex flex-col gap-3" role="region" aria-label="Gate 1 Hard Stops">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Gate 1 — Hard Stops</h3>
          <InfoPopup data={GATE_INFO['gate1'] ?? { title: 'Gate 1', whatIs: '', impact: '' }} size={13} />
        </div>
        {passed ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-status-success">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Passed
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-status-error">
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            Hard Stop
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Validaciones criticas de compliance, PLD/KYC y listas negras.
      </p>

      {hardStopFlags.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {hardStopFlags.map((flag) => (
            <li
              key={flag.code}
              className="flex items-start gap-1.5 text-xs text-status-error"
            >
              <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{flag.message}</span>
            </li>
          ))}
        </ul>
      )}

      {passed && hardStopFlags.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-status-success">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          Todas las validaciones aprobadas
        </p>
      )}
    </div>
  );
}

function Gate2Semaphore({
  semaphores,
}: {
  semaphores: Record<string, 'green' | 'yellow' | 'red'>;
}) {
  const entries = Object.entries(semaphores);
  const greenCount = entries.filter(([, c]) => c === 'green').length;
  const yellowCount = entries.filter(([, c]) => c === 'yellow').length;
  const redCount = entries.filter(([, c]) => c === 'red').length;

  return (
    <div className="flex flex-col gap-3" role="region" aria-label="Gate 2 Semaforo">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Gate 2 — Semaforo</h3>
          <InfoPopup data={GATE_INFO['gate2'] ?? { title: 'Gate 2', whatIs: '', impact: '' }} size={13} />
        </div>
        <span className="text-xs text-muted-foreground">
          {greenCount}🟢 {yellowCount}🟡 {redCount}🔴
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        Indicadores por motor de analisis.
      </p>

      <div className="flex flex-wrap gap-2" role="list" aria-label="Semaforos por motor">
        {entries.map(([engine, color]) => {
          const fallback = { bg: 'bg-status-success', label: 'Verde' };
          const style = SEMAPHORE_STYLE[color] ?? fallback;
          const label = ENGINE_LABELS[engine] ?? engine;
          return (
            <div
              key={engine}
              className="flex items-center gap-1.5 text-xs"
              role="listitem"
            >
              <span
                className={`w-3 h-3 rounded-full ${style.bg}`}
                aria-hidden="true"
              />
              <span className="text-muted-foreground" title={`${label}: ${style.label}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Gate3Score({
  score,
  breakdown,
  decision,
}: {
  score: number;
  breakdown: Record<string, number>;
  decision: DecisionType;
}) {
  const grade = getGrade(score);
  const decisionCfg = DECISION_DISPLAY[decision];
  const DecisionIcon = decisionCfg.icon;
  const scorePercent = Math.min(Math.max(score, 0), 100);
  const breakdownEntries = Object.entries(breakdown).sort(([, a], [, b]) => b - a);

  return (
    <div className="flex flex-col gap-3" role="region" aria-label="Gate 3 Score">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Gate 3 — Score Consolidado</h3>
          <InfoPopup data={GATE_INFO['gate3'] ?? { title: 'Gate 3', whatIs: '', impact: '' }} size={13} />
        </div>
        <span className={`text-xs font-medium ${decisionCfg.colorClass}`}>
          {grade}
        </span>
      </div>

      {/* Score display */}
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
        <span className="text-sm text-muted-foreground">/100</span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-2.5 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={scorePercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score ${scorePercent} de 100`}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${scorePercent}%`,
            backgroundColor: getScoreBarColor(score),
          }}
        />
      </div>

      {/* Decision */}
      <div className={`flex items-center gap-2 text-sm font-medium ${decisionCfg.colorClass}`}>
        <DecisionIcon className="w-4 h-4" aria-hidden="true" />
        <span>{decisionCfg.label}</span>
      </div>

      {/* Breakdown */}
      {breakdownEntries.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-xs font-medium text-muted-foreground">Desglose por motor</span>
          {breakdownEntries.map(([engine, value]) => {
            const label = ENGINE_LABELS[engine] ?? engine;
            return (
              <div key={engine} className="flex items-center gap-2 text-xs">
                <span className="w-24 text-muted-foreground truncate" title={label}>
                  {label}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(value, 100)}%`,
                      backgroundColor: getScoreBarColor(value),
                    }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export interface RiskMatrixGatesProps {
  scoring: ScoringResult;
}

export function RiskMatrixGates({ scoring }: RiskMatrixGatesProps) {
  return (
    <section className="flex flex-col gap-4" aria-label="Risk Matrix 3 Gates">
      {/* Gate 1 */}
      <div className="bg-card rounded-lg border border-border p-4">
        <Gate1HardStops result={scoring.gate1_result} flags={scoring.gate1_flags} />
      </div>

      {/* Gate 2 */}
      <div className="bg-card rounded-lg border border-border p-4">
        <Gate2Semaphore semaphores={scoring.gate2_semaphores} />
      </div>

      {/* Gate 3 */}
      <div className="bg-card rounded-lg border border-border p-4">
        <Gate3Score
          score={scoring.gate3_score}
          breakdown={scoring.gate3_breakdown}
          decision={scoring.final_decision}
        />
      </div>
    </section>
  );
}
