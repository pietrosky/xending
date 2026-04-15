import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Equal,
  Lightbulb,
  ShieldAlert,
  Info,
} from 'lucide-react';
import type {
  EngineOutput,
  ModuleStatus,
  FlagSeverity,
  ScoreImpact,
  BenchmarkStatus,
} from '../types/engine.types';
import { CHART_COLORS, GRADE_COLORS } from '../lib/chartColors';
import { TrendChart } from './TrendChart';

// --- Style maps ---

const STATUS_STYLE: Record<ModuleStatus, { label: string; className: string }> = {
  pass: { label: 'Pass', className: 'bg-status-success-bg text-status-success' },
  warning: { label: 'Warning', className: 'bg-status-warning-bg text-status-warning' },
  fail: { label: 'Fail', className: 'bg-status-error-bg text-status-error' },
  blocked: { label: 'Blocked', className: 'bg-muted text-muted-foreground' },
};

const SEVERITY_STYLE: Record<FlagSeverity, { label: string; className: string; icon: typeof Info }> = {
  info: { label: 'Info', className: 'bg-status-info-bg text-status-info', icon: Info },
  warning: { label: 'Warning', className: 'bg-status-warning-bg text-status-warning', icon: AlertTriangle },
  critical: { label: 'Critical', className: 'bg-status-error-bg text-status-error', icon: ShieldAlert },
  hard_stop: { label: 'Hard Stop', className: 'bg-status-error-bg text-status-error font-semibold', icon: ShieldAlert },
};

const IMPACT_STYLE: Record<ScoreImpact, { label: string; className: string; icon: typeof ArrowUp }> = {
  positive: { label: 'Positivo', className: 'text-status-success', icon: ArrowUp },
  neutral: { label: 'Neutral', className: 'text-muted-foreground', icon: Equal },
  negative: { label: 'Negativo', className: 'text-status-error', icon: ArrowDown },
};

const BENCHMARK_STYLE: Record<BenchmarkStatus, { label: string; className: string }> = {
  above: { label: 'Por encima', className: 'text-status-success' },
  at: { label: 'En rango', className: 'text-muted-foreground' },
  below: { label: 'Por debajo', className: 'text-status-error' },
};

// --- Score Gauge ---

function ScoreGauge({ score, max }: { score: number; max: number }) {
  const percent = max > 0 ? Math.round((score / max) * 100) : 0;
  const color = percent >= 75
    ? CHART_COLORS.success
    : percent >= 50
      ? CHART_COLORS.warning
      : CHART_COLORS.error;

  // SVG arc for a half-circle gauge
  const radius = 60;
  const circumference = Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1" aria-label={`Score ${score} de ${max}`}>
      <svg width="140" height="80" viewBox="0 0 140 80" aria-hidden="true">
        {/* Background arc */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke="hsl(215, 16%, 90%)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="text-2xl font-bold text-foreground -mt-6">
        {score}<span className="text-sm font-normal text-muted-foreground">/{max}</span>
      </span>
    </div>
  );
}

// --- Section wrapper ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-3" role="region" aria-label={title}>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

// --- Main Component ---

interface EngineDetailViewProps {
  result: EngineOutput;
}

export function EngineDetailView({ result }: EngineDetailViewProps) {
  const metrics = Object.values(result.key_metrics);
  const benchmarks = Object.values(result.benchmark_comparison);
  const gradeColor = GRADE_COLORS[result.module_grade] ?? CHART_COLORS.text;

  return (
    <section className="flex flex-col gap-4" aria-label={`Detalle motor ${result.engine_name}`}>
      {/* 1. Header */}
      <div className="bg-card rounded-lg border border-border p-4 flex flex-col sm:flex-row items-center gap-4">
        <ScoreGauge score={result.module_score} max={result.module_max_score} />
        <div className="flex flex-col gap-2 flex-1 text-center sm:text-left">
          <h2 className="text-lg font-bold text-foreground">{result.engine_name}</h2>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ color: gradeColor, backgroundColor: `${gradeColor}18` }}
            >
              Grade {result.module_grade}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${STATUS_STYLE[result.module_status].className}`}>
              {STATUS_STYLE[result.module_status].label}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics */}
      {metrics.length > 0 && (
        <Section title="Metricas Clave">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Metrica</th>
                  <th className="py-2 pr-3 font-medium">Valor</th>
                  <th className="py-2 pr-3 font-medium">Unidad</th>
                  <th className="py-2 pr-3 font-medium">Interpretacion</th>
                  <th className="py-2 font-medium">Impacto</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => {
                  const impact = IMPACT_STYLE[m.impact_on_score];
                  const ImpactIcon = impact.icon;
                  return (
                    <tr key={m.name} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium text-foreground">{m.label}</td>
                      <td className="py-2 pr-3 text-foreground">{m.value.toLocaleString('es-MX')}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{m.unit}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{m.interpretation}</td>
                      <td className="py-2">
                        <span className={`flex items-center gap-1 ${impact.className}`}>
                          <ImpactIcon className="w-3 h-3" aria-hidden="true" />
                          {impact.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* 3. Benchmark Comparison */}
      {benchmarks.length > 0 && (
        <Section title="Comparacion vs Benchmark">
          <div className="overflow-x-auto">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Metrica</th>
                  <th className="py-2 pr-3 font-medium">Solicitante</th>
                  <th className="py-2 pr-3 font-medium">Benchmark</th>
                  <th className="py-2 pr-3 font-medium">Desviacion</th>
                  <th className="py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((b) => {
                  const status = BENCHMARK_STYLE[b.status];
                  return (
                    <tr key={b.metric} className="border-b border-border/50">
                      <td className="py-2 pr-3 font-medium text-foreground">{b.metric}</td>
                      <td className="py-2 pr-3 text-foreground">{b.applicant_value.toLocaleString('es-MX')}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{b.benchmark_value.toLocaleString('es-MX')}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {b.deviation_percent >= 0 ? '+' : ''}{b.deviation_percent.toFixed(1)}%
                      </td>
                      <td className="py-2">
                        <span className={`font-medium ${status.className}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* 4. Risk Flags */}
      {result.risk_flags.length > 0 && (
        <Section title="Alertas de Riesgo">
          <ul className="flex flex-col gap-2">
            {result.risk_flags.map((flag) => {
              const sev = SEVERITY_STYLE[flag.severity];
              const SevIcon = sev.icon;
              return (
                <li
                  key={flag.code}
                  className="flex items-start gap-2 text-xs"
                >
                  <span className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded ${sev.className}`}>
                    <SevIcon className="w-3 h-3" aria-hidden="true" />
                    {sev.label}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{flag.code}</span>
                    <span className="text-muted-foreground">{flag.message}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* 5. Trends */}
      {result.trends.length > 0 && (
        <Section title="Tendencias">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.trends.map((trend) => (
              <TrendChart key={trend.metric_name} trend={trend} />
            ))}
          </div>
        </Section>
      )}

      {/* 6. Explanation */}
      {result.explanation && (
        <Section title="Explicacion">
          <p className="text-xs text-muted-foreground leading-relaxed">{result.explanation}</p>
        </Section>
      )}

      {/* 7. Recommended Actions */}
      {result.recommended_actions.length > 0 && (
        <Section title="Acciones Recomendadas">
          <ul className="flex flex-col gap-1.5">
            {result.recommended_actions.map((action, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-status-warning" aria-hidden="true" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </section>
  );
}
