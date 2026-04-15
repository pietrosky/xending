import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Shield,
} from 'lucide-react';
import type { ScoringResult, CreditApplication } from '../types/application.types';
import type { EngineOutput } from '../types/engine.types';
import { CHART_COLORS } from '../lib/chartColors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoringReportProps {
  application: CreditApplication;
  scoring: ScoringResult;
  engineResults: EngineOutput[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENGINE_LABELS: Record<string, string> = {
  compliance: 'Compliance',
  sat_facturacion: 'SAT Facturacion',
  buro: 'Buro Crediticio',
  documentation: 'Documentacion',
  financial: 'Financiero',
  cashflow: 'Flujo de Caja',
  working_capital: 'Capital de Trabajo',
  stability: 'Estabilidad',
  network: 'Red Comercial',
  fx_risk: 'Riesgo FX',
  guarantee: 'Garantias',
  portfolio: 'Portafolio',
  graph_fraud: 'Fraude',
  employee: 'Empleados',
  benchmark: 'Benchmark',
  scenario: 'Escenarios',
  covenant: 'Covenants',
};

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-status-success';
  if (score >= 50) return 'text-status-warning';
  return 'text-status-error';
}

function getBarColor(score: number): string {
  if (score >= 75) return CHART_COLORS.success;
  if (score >= 50) return CHART_COLORS.warning;
  return CHART_COLORS.error;
}

function getDecisionLabel(decision: string): { label: string; color: string } {
  switch (decision) {
    case 'approved': return { label: 'Aprobado', color: 'text-status-success' };
    case 'conditional': return { label: 'Condicionado', color: 'text-status-warning' };
    case 'committee': return { label: 'Comite', color: 'text-status-warning' };
    case 'rejected': return { label: 'Rechazado', color: 'text-status-error' };
    default: return { label: decision, color: 'text-muted-foreground' };
  }
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ExecutiveSummary({
  application,
  scoring,
}: {
  application: CreditApplication;
  scoring: ScoringResult;
}) {
  const decision = getDecisionLabel(scoring.final_decision);

  return (
    <div className="bg-card rounded-lg border border-border p-6" role="region" aria-label="Resumen Ejecutivo">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-brand-1" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Resumen Ejecutivo</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Empresa</p>
          <p className="text-sm font-medium text-foreground">{application.company_name}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">RFC</p>
          <p className="text-sm font-medium text-foreground">{application.rfc}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Monto Solicitado</p>
          <p className="text-sm font-medium text-foreground">
            {formatCurrency(application.requested_amount, application.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Plazo</p>
          <p className="text-sm font-medium text-foreground">{application.term_months} meses</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Score Consolidado</p>
          <p className={`text-2xl font-bold ${getScoreColor(scoring.gate3_score)}`}>
            {scoring.gate3_score}<span className="text-sm text-muted-foreground">/100</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Decision</p>
          <p className={`text-sm font-semibold ${decision.color}`}>{decision.label}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Limite de Credito</p>
          <p className="text-sm font-medium text-foreground">
            {formatCurrency(scoring.credit_limit, application.currency)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Frecuencia Revision</p>
          <p className="text-sm font-medium text-foreground">{scoring.review_frequency}</p>
        </div>
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const pct = Math.min(Math.max(score, 0), 100);
  const rotation = (pct / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={`Score gauge: ${score}/100`}>
      <svg viewBox="0 0 200 120" className="w-48 h-28">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={getBarColor(score)}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 251.2} 251.2`}
        />
        {/* Needle */}
        <line
          x1="100"
          y1="100"
          x2="100"
          y2="30"
          stroke="hsl(var(--foreground))"
          strokeWidth="2"
          transform={`rotate(${rotation}, 100, 100)`}
        />
        <circle cx="100" cy="100" r="4" fill="hsl(var(--foreground))" />
      </svg>
      <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
    </div>
  );
}

function RadarChartSection({ engineResults }: { engineResults: EngineOutput[] }) {
  const data = engineResults
    .filter((e) => e.module_score > 0)
    .slice(0, 12)
    .map((e) => ({
      engine: ENGINE_LABELS[e.engine_name] ?? e.engine_name,
      score: e.module_score,
    }));

  if (data.length < 3) return null;

  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Radar de Motores">
      <h3 className="text-sm font-semibold text-foreground mb-3">Perfil de Riesgo</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="engine" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
          <Radar
            name="Score"
            dataKey="score"
            stroke={CHART_COLORS.dataLine}
            fill={CHART_COLORS.dataLine}
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BenchmarkBars({ engineResults }: { engineResults: EngineOutput[] }) {
  const data = engineResults
    .filter((e) => e.module_score > 0)
    .sort((a, b) => b.module_score - a.module_score)
    .map((e) => ({
      name: ENGINE_LABELS[e.engine_name] ?? e.engine_name,
      score: e.module_score,
      grade: e.module_grade,
    }));

  if (data.length === 0) return null;

  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Scores por Motor">
      <h3 className="text-sm font-semibold text-foreground mb-3">Scores por Motor</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={95} />
          <Tooltip
            formatter={(value: number) => [`${value}/100`, 'Score']}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={getBarColor(entry.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RiskFlagsSummary({ engineResults }: { engineResults: EngineOutput[] }) {
  const allFlags = engineResults.flatMap((e) =>
    e.risk_flags.map((f) => ({ ...f, engine: e.engine_name })),
  );

  const critical = allFlags.filter((f) => f.severity === 'critical' || f.severity === 'hard_stop');
  const warnings = allFlags.filter((f) => f.severity === 'warning');

  if (allFlags.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 text-status-success">
          <Shield className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm font-medium">Sin alertas de riesgo</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Alertas de Riesgo">
      <h3 className="text-sm font-semibold text-foreground mb-3">Alertas de Riesgo</h3>

      {critical.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-status-error mb-1.5">
            Criticas ({critical.length})
          </p>
          <ul className="flex flex-col gap-1">
            {critical.slice(0, 5).map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-status-error">
                <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{ENGINE_LABELS[f.engine] ?? f.engine}: {f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-status-warning mb-1.5">
            Advertencias ({warnings.length})
          </p>
          <ul className="flex flex-col gap-1">
            {warnings.slice(0, 5).map((f, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-status-warning">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{ENGINE_LABELS[f.engine] ?? f.engine}: {f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RecommendedActions({ engineResults }: { engineResults: EngineOutput[] }) {
  const allActions = [
    ...engineResults.flatMap((e) => e.recommended_actions),
  ];
  const unique = [...new Set(allActions)].slice(0, 8);

  if (unique.length === 0) return null;

  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Acciones Recomendadas">
      <h3 className="text-sm font-semibold text-foreground mb-3">Acciones Recomendadas</h3>
      <ul className="flex flex-col gap-1.5">
        {unique.map((action, i) => (
          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-brand-1" aria-hidden="true" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AIAnalysis({ narrative }: { narrative: string }) {
  if (!narrative) return null;

  return (
    <div className="bg-card rounded-lg border border-border p-4" role="region" aria-label="Analisis AI">
      <h3 className="text-sm font-semibold text-foreground mb-2">Analisis AI</h3>
      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{narrative}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ScoringReport({ application, scoring, engineResults }: ScoringReportProps) {
  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto print:max-w-none" id="scoring-report">
      {/* Header with branding */}
      <div className="flex items-center justify-between bg-gradient-to-r from-brand-1 to-brand-2 rounded-lg p-4 text-white">
        <div>
          <h1 className="text-lg font-bold">Credit Scoring Report</h1>
          <p className="text-xs opacity-80">Xending Capital</p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-80">Generado: {new Date().toLocaleDateString('es-MX')}</p>
          <p className="text-xs opacity-80">ID: {application.id.slice(0, 8)}</p>
        </div>
      </div>

      {/* Executive Summary */}
      <ExecutiveSummary application={application} scoring={scoring} />

      {/* Gauge + Radar side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4 flex flex-col items-center justify-center">
          <h3 className="text-sm font-semibold text-foreground mb-2">Score Global</h3>
          <ScoreGauge score={scoring.gate3_score} />
        </div>
        <RadarChartSection engineResults={engineResults} />
      </div>

      {/* Benchmark bars */}
      <BenchmarkBars engineResults={engineResults} />

      {/* Risk flags */}
      <RiskFlagsSummary engineResults={engineResults} />

      {/* AI Narrative */}
      <AIAnalysis narrative={scoring.ai_narrative} />

      {/* Recommended actions */}
      <RecommendedActions engineResults={engineResults} />

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-2 border-t border-border">
        Confidencial — Xending Capital — {new Date().getFullYear()}
      </div>
    </div>
  );
}
