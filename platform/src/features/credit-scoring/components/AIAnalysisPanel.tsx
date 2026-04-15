import {
  AlertTriangle,
  Brain,
  CheckCircle,
  Eye,
  Gauge,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types — aligned with AIAnalysisResult from aiRisk engine
// ---------------------------------------------------------------------------

export interface RiskItem {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  source_engine: string;
}

export interface AIScenario {
  scenario_type: string;
  description: string;
  impact: string;
  probability: 'high' | 'medium' | 'low';
}

export interface AIAnalysisPanelProps {
  risk_narrative: string;
  top_risks: RiskItem[];
  top_strengths: RiskItem[];
  trend_narrative?: string;
  scenarios?: AIScenario[];
  confidence_score: number; // 0-100
  hidden_risks?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-status-error-bg', text: 'text-status-error', label: 'Alto' },
  medium: { bg: 'bg-status-warning-bg', text: 'text-status-warning', label: 'Medio' },
  low: { bg: 'bg-status-info-bg', text: 'text-status-info', label: 'Bajo' },
};

const PROBABILITY_STYLE: Record<string, { text: string; label: string }> = {
  high: { text: 'text-status-error', label: 'Alta' },
  medium: { text: 'text-status-warning', label: 'Media' },
  low: { text: 'text-status-success', label: 'Baja' },
};

function getConfidenceColor(score: number): string {
  if (score >= 75) return 'text-status-success';
  if (score >= 50) return 'text-status-warning';
  return 'text-status-error';
}

function getConfidenceBarColor(score: number): string {
  if (score >= 75) return 'hsl(var(--status-success))';
  if (score >= 50) return 'hsl(var(--status-warning))';
  return 'hsl(var(--status-error))';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConfidenceBadge({ score }: { score: number }) {
  const percent = Math.min(Math.max(score, 0), 100);
  return (
    <div className="flex items-center gap-3">
      <Gauge className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Confianza AI</span>
          <span className={`text-sm font-semibold ${getConfidenceColor(score)}`}>
            {percent}%
          </span>
        </div>
        <div
          className="w-full h-2 rounded-full bg-muted overflow-hidden"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Confianza AI ${percent}%`}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${percent}%`, backgroundColor: getConfidenceBarColor(score) }}
          />
        </div>
      </div>
    </div>
  );
}

function RiskNarrativeSection({ narrative }: { narrative: string }) {
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Narrativa de riesgo">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Narrativa de Riesgo</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{narrative}</p>
    </div>
  );
}

function TopRisksList({ risks }: { risks: RiskItem[] }) {
  if (risks.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Top riesgos">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-status-error" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Top Riesgos</h3>
      </div>
      <ul className="flex flex-col gap-2" role="list">
        {risks.map((risk) => {
          const fallback = { bg: 'bg-status-info-bg', text: 'text-status-info', label: 'Bajo' };
          const style = SEVERITY_STYLE[risk.severity] ?? fallback;
          return (
            <li key={risk.title} className={`rounded-md p-2.5 ${style.bg}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">{risk.title}</span>
                <span className={`text-[10px] font-medium ${style.text}`}>{style.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{risk.description}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TopStrengthsList({ strengths }: { strengths: RiskItem[] }) {
  if (strengths.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Top fortalezas">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-status-success" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Top Fortalezas</h3>
      </div>
      <ul className="flex flex-col gap-2" role="list">
        {strengths.map((item) => (
          <li key={item.title} className="rounded-md p-2.5 bg-status-success-bg">
            <span className="text-xs font-semibold text-foreground">{item.title}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrendNarrativeSection({ narrative }: { narrative: string }) {
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Narrativa de tendencias">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Tendencias Consolidadas</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{narrative}</p>
    </div>
  );
}

function ScenariosSection({ scenarios }: { scenarios: AIScenario[] }) {
  if (scenarios.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Escenarios">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-status-warning" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Escenarios</h3>
      </div>
      <ul className="flex flex-col gap-2" role="list">
        {scenarios.map((s) => {
          const probFallback = { text: 'text-status-success', label: 'Baja' };
          const prob = PROBABILITY_STYLE[s.probability] ?? probFallback;
          return (
            <li key={s.scenario_type} className="rounded-md border border-border p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground">{s.scenario_type}</span>
                <span className={`text-[10px] font-medium ${prob.text}`}>
                  Prob: {prob.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{s.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">Impacto:</span> {s.impact}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HiddenRisksSection({ risks }: { risks: string[] }) {
  if (risks.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Riesgos ocultos">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-status-warning" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Riesgos Ocultos</h3>
      </div>
      <ul className="flex flex-col gap-1.5" role="list">
        {risks.map((risk) => (
          <li key={risk} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-status-warning" aria-hidden="true" />
            <span>{risk}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AIAnalysisPanel({
  risk_narrative,
  top_risks,
  top_strengths,
  trend_narrative,
  scenarios,
  confidence_score,
  hidden_risks,
}: AIAnalysisPanelProps) {
  return (
    <section className="flex flex-col gap-4" aria-label="AI Risk Analysis">
      {/* Confidence + Narrative */}
      <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-4">
        <ConfidenceBadge score={confidence_score} />
        <RiskNarrativeSection narrative={risk_narrative} />
      </div>

      {/* Risks & Strengths side by side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <TopRisksList risks={top_risks} />
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <TopStrengthsList strengths={top_strengths} />
        </div>
      </div>

      {/* Trend narrative */}
      {trend_narrative && (
        <div className="bg-card rounded-lg border border-border p-4">
          <TrendNarrativeSection narrative={trend_narrative} />
        </div>
      )}

      {/* Scenarios */}
      {scenarios && scenarios.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <ScenariosSection scenarios={scenarios} />
        </div>
      )}

      {/* Hidden risks */}
      {hidden_risks && hidden_risks.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <HiddenRisksSection risks={hidden_risks} />
        </div>
      )}
    </section>
  );
}
