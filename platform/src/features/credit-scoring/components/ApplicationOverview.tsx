import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Gauge,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { CreditApplication, DecisionType, ScoringResult } from '../types/application.types';
import type { RiskFlag } from '../types/engine.types';

// --- Decision display config ---

interface DecisionConfig {
  label: string;
  colorClass: string;
  bgClass: string;
  icon: typeof CheckCircle;
}

const DECISION_CONFIG: Record<DecisionType, DecisionConfig> = {
  approved: {
    label: 'Aprobado',
    colorClass: 'text-status-success',
    bgClass: 'bg-status-success-bg',
    icon: CheckCircle,
  },
  conditional: {
    label: 'Condicionado',
    colorClass: 'text-status-warning',
    bgClass: 'bg-status-warning-bg',
    icon: AlertTriangle,
  },
  committee: {
    label: 'Comite',
    colorClass: 'text-status-warning',
    bgClass: 'bg-status-warning-bg',
    icon: Clock,
  },
  rejected: {
    label: 'Rechazado',
    colorClass: 'text-status-error',
    bgClass: 'bg-status-error-bg',
    icon: XCircle,
  },
};

const SEMAPHORE_COLOR: Record<string, { bg: string; label: string }> = {
  green: { bg: 'bg-status-success', label: 'Verde' },
  yellow: { bg: 'bg-status-warning', label: 'Amarillo' },
  red: { bg: 'bg-status-error', label: 'Rojo' },
};

// --- Currency formatter ---

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Extract top risks (critical/warning flags) from gate1_flags */
function getTopRisks(flags: RiskFlag[], max: number): RiskFlag[] {
  return flags
    .filter((f) => f.severity === 'critical' || f.severity === 'warning')
    .slice(0, max);
}

/** Extract top strengths (info flags with positive context) from gate1_flags */
function getTopStrengths(flags: RiskFlag[], max: number): RiskFlag[] {
  return flags
    .filter((f) => f.severity === 'info')
    .slice(0, max);
}

// --- Sub-components ---

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof Gauge;
  colorClass: string;
}) {
  return (
    <div
      className="bg-card rounded-lg border border-border p-4 flex flex-col gap-1"
      role="group"
      aria-label={title}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-4 h-4" aria-hidden="true" />
        <span>{title}</span>
      </div>
      <span className={`text-xl font-bold ${colorClass}`}>{value}</span>
      {subtitle && (
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      )}
    </div>
  );
}

function GateSection({ scoring }: { scoring: ScoringResult }) {
  const gate1Passed = scoring.gate1_result === 'pass';
  const semaphoreEntries = Object.entries(scoring.gate2_semaphores);

  return (
    <div className="flex flex-col gap-3" role="region" aria-label="3 Gates">
      <h3 className="text-sm font-semibold text-foreground">3 Gates</h3>

      {/* Gate 1 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-muted-foreground w-40">Gate 1 (Hard Stops):</span>
        {gate1Passed ? (
          <span className="flex items-center gap-1 text-status-success">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Passed
          </span>
        ) : (
          <span className="flex items-center gap-1 text-status-error">
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
            Hard Stop
          </span>
        )}
      </div>

      {/* Gate 2 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-muted-foreground w-40">Gate 2 (Semaforo):</span>
        <div className="flex items-center gap-1.5" role="list" aria-label="Semaforos por motor">
          {semaphoreEntries.map(([engine, color]) => {
            const fallback = { bg: 'bg-status-success', label: 'Verde' };
            const cfg = SEMAPHORE_COLOR[color] ?? fallback;
            return (
              <span
                key={engine}
                className={`w-4 h-4 rounded-full ${cfg.bg}`}
                role="listitem"
                title={`${engine}: ${cfg.label}`}
                aria-label={`${engine}: ${cfg.label}`}
              />
            );
          })}
        </div>
      </div>

      {/* Gate 3 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-muted-foreground w-40">Gate 3 (Score):</span>
        <span className="font-semibold text-foreground">
          {scoring.gate3_score}/100
        </span>
        <span className="text-xs text-muted-foreground">—</span>
        <span className={`text-sm font-medium ${DECISION_CONFIG[scoring.final_decision].colorClass}`}>
          {DECISION_CONFIG[scoring.final_decision].label}
        </span>
      </div>
    </div>
  );
}

function RisksAndStrengths({ flags }: { flags: RiskFlag[] }) {
  const risks = getTopRisks(flags, 3);
  const strengths = getTopStrengths(flags, 3);

  if (risks.length === 0 && strengths.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Risks */}
      <div role="region" aria-label="Top Riesgos">
        <h4 className="text-sm font-semibold text-foreground mb-2">Top Riesgos</h4>
        {risks.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin riesgos detectados</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {risks.map((flag) => (
              <li key={flag.code} className="flex items-start gap-1.5 text-xs text-status-warning">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{flag.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Strengths */}
      <div role="region" aria-label="Top Fortalezas">
        <h4 className="text-sm font-semibold text-foreground mb-2">Top Fortalezas</h4>
        {strengths.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin fortalezas destacadas</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {strengths.map((flag) => (
              <li key={flag.code} className="flex items-start gap-1.5 text-xs text-status-success">
                <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>{flag.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// --- Pending state ---

function PendingState() {
  return (
    <div className="bg-card rounded-lg border border-border p-8 flex flex-col items-center gap-3 text-center">
      <Clock className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">Pendiente de scoring</p>
      <p className="text-xs text-muted-foreground">
        El analisis de esta solicitud aun no ha sido ejecutado.
      </p>
    </div>
  );
}


// --- Main component ---

interface ApplicationOverviewProps {
  application: CreditApplication;
  scoring: ScoringResult | null;
}

export function ApplicationOverview({ application, scoring }: ApplicationOverviewProps) {
  const currencyLabel = application.currency;
  const requestedFormatted = formatCurrency(application.requested_amount, currencyLabel);

  return (
    <section className="flex flex-col gap-6" aria-label="Resumen ejecutivo">
      {/* Header */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h2 className="text-base font-bold text-foreground">
          Credit Scoring — {application.company_name}
        </h2>
        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>RFC: {application.rfc}</span>
          <span className="hidden sm:inline">|</span>
          <span>Solicitud: {requestedFormatted}</span>
          {application.term_months && (
            <>
              <span className="hidden sm:inline">|</span>
              <span>{application.term_months} meses</span>
            </>
          )}
        </div>
      </div>

      {/* Pending state when no scoring */}
      {!scoring && <PendingState />}

      {/* Scored state */}
      {scoring && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              title="Score"
              value={`${scoring.gate3_score}/100`}
              icon={Gauge}
              colorClass={
                scoring.gate3_score >= 75
                  ? 'text-status-success'
                  : scoring.gate3_score >= 50
                    ? 'text-status-warning'
                    : 'text-status-error'
              }
            />
            <KpiCard
              title="Decision"
              value={DECISION_CONFIG[scoring.final_decision].label}
              icon={DECISION_CONFIG[scoring.final_decision].icon}
              colorClass={DECISION_CONFIG[scoring.final_decision].colorClass}
            />
            <KpiCard
              title="Monto Aprobado"
              value={formatCurrency(scoring.credit_limit, currencyLabel)}
              subtitle={`de ${requestedFormatted}`}
              icon={DollarSign}
              colorClass="text-foreground"
            />
            <KpiCard
              title="DSCR"
              value="—"
              subtitle="Pendiente Fase 2"
              icon={Gauge}
              colorClass="text-muted-foreground"
            />
          </div>

          {/* 3 Gates */}
          <div className="bg-card rounded-lg border border-border p-4">
            <GateSection scoring={scoring} />
          </div>

          {/* Risks & Strengths */}
          <div className="bg-card rounded-lg border border-border p-4">
            <RisksAndStrengths flags={scoring.gate1_flags} />
          </div>
        </>
      )}
    </section>
  );
}
