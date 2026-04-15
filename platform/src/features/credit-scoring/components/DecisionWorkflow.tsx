import {
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  Users,
  UserCheck,
  Bot,
  Shield,
  History,
} from 'lucide-react';
import type { Currency } from '../types/application.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ApprovalLevel = 'auto' | 'analyst' | 'manager' | 'committee';
type WorkflowStatus = 'pending' | 'approved' | 'conditional' | 'rejected' | 'escalated';

interface DecisionHistoryEntry {
  action: string;
  decided_by: string;
  timestamp: string;
  conditions?: string;
}

export interface DecisionWorkflowProps {
  application_id: string;
  requested_amount: number;
  currency: Currency;
  approval_level: ApprovalLevel;
  status: WorkflowStatus;
  assigned_to?: string;
  sla_deadline?: string;
  decision_history?: DecisionHistoryEntry[];
  conditions?: string[];
  override_reason?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_CONFIG: Record<ApprovalLevel, { label: string; icon: typeof Bot; slaHours: number }> = {
  auto: { label: 'Auto-aprobacion', icon: Bot, slaHours: 24 },
  analyst: { label: 'Analista', icon: UserCheck, slaHours: 48 },
  manager: { label: 'Manager', icon: Shield, slaHours: 48 },
  committee: { label: 'Comite', icon: Users, slaHours: 72 },
};

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; colorClass: string; bgClass: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pendiente', colorClass: 'text-status-warning', bgClass: 'bg-status-warning-bg', icon: Clock },
  approved: { label: 'Aprobado', colorClass: 'text-status-success', bgClass: 'bg-status-success-bg', icon: CheckCircle },
  conditional: { label: 'Condicionado', colorClass: 'text-status-warning', bgClass: 'bg-status-warning-bg', icon: AlertTriangle },
  rejected: { label: 'Rechazado', colorClass: 'text-status-error', bgClass: 'bg-status-error-bg', icon: XCircle },
  escalated: { label: 'Escalado', colorClass: 'text-status-info', bgClass: 'bg-status-info-bg', icon: ArrowUpRight },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

type SlaStatus = 'on_time' | 'approaching' | 'overdue';

function getSlaStatus(deadline: string): { status: SlaStatus; label: string; hoursLeft: number } {
  const now = Date.now();
  const deadlineMs = new Date(deadline).getTime();
  const diffMs = deadlineMs - now;
  const hoursLeft = diffMs / (1000 * 60 * 60);

  if (hoursLeft <= 0) {
    return { status: 'overdue', label: 'Vencido', hoursLeft: Math.round(hoursLeft) };
  }
  if (hoursLeft <= 8) {
    return { status: 'approaching', label: `${Math.round(hoursLeft)}h restantes`, hoursLeft: Math.round(hoursLeft) };
  }
  if (hoursLeft < 24) {
    return { status: 'on_time', label: `${Math.round(hoursLeft)}h restantes`, hoursLeft: Math.round(hoursLeft) };
  }
  const daysLeft = Math.floor(hoursLeft / 24);
  const remainingHours = Math.round(hoursLeft % 24);
  return { status: 'on_time', label: `${daysLeft}d ${remainingHours}h restantes`, hoursLeft: Math.round(hoursLeft) };
}

const SLA_STATUS_STYLE: Record<SlaStatus, { text: string; bg: string }> = {
  on_time: { text: 'text-status-success', bg: 'bg-status-success-bg' },
  approaching: { text: 'text-status-warning', bg: 'bg-status-warning-bg' },
  overdue: { text: 'text-status-error', bg: 'bg-status-error-bg' },
};

function getRoutingDescription(amount: number, currency: Currency): string {
  const amountUSD = currency === 'USD' ? amount : amount / 20;
  if (amountUSD < 500_000) return '< $500K — Ruta automatica / analista';
  if (amountUSD <= 2_000_000) return '$500K – $2M — Requiere aprobacion de manager';
  return '> $2M — Requiere aprobacion de comite';
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WorkflowHeader({
  status,
  approval_level,
  requested_amount,
  currency,
}: {
  status: WorkflowStatus;
  approval_level: ApprovalLevel;
  requested_amount: number;
  currency: Currency;
}) {
  const statusCfg = STATUS_CONFIG[status];
  const StatusIcon = statusCfg.icon;
  const levelCfg = LEVEL_CONFIG[approval_level];
  const LevelIcon = levelCfg.icon;

  return (
    <div className="flex flex-col gap-3" role="region" aria-label="Estado del workflow">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Workflow de Aprobacion</h3>
        <span className={`flex items-center gap-1.5 text-xs font-medium ${statusCfg.colorClass}`}>
          <StatusIcon className="w-4 h-4" aria-hidden="true" />
          {statusCfg.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <LevelIcon className="w-3.5 h-3.5" aria-hidden="true" />
          {levelCfg.label}
        </span>
        <span>{formatCurrency(requested_amount, currency)}</span>
      </div>

      <p className="text-xs text-muted-foreground">
        {getRoutingDescription(requested_amount, currency)}
      </p>
    </div>
  );
}

function SlaSection({
  sla_deadline,
  approval_level,
}: {
  sla_deadline?: string;
  approval_level: ApprovalLevel;
}) {
  const slaHours = LEVEL_CONFIG[approval_level].slaHours;

  if (!sla_deadline) {
    return (
      <div className="flex flex-col gap-2" role="region" aria-label="SLA">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">SLA</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Plazo maximo: {slaHours}h — Sin fecha limite asignada
        </p>
      </div>
    );
  }

  const sla = getSlaStatus(sla_deadline);
  const style = SLA_STATUS_STYLE[sla.status];

  return (
    <div className="flex flex-col gap-2" role="region" aria-label="SLA">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">SLA</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.text} ${style.bg}`}>
          {sla.label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Plazo maximo: {slaHours}h — Vence: {formatTimestamp(sla_deadline)}
      </p>
    </div>
  );
}

function AssignedToSection({ assigned_to }: { assigned_to?: string }) {
  if (!assigned_to) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
      <span>Asignado a: <span className="font-medium text-foreground">{assigned_to}</span></span>
    </div>
  );
}

function ConditionsSection({ conditions }: { conditions: string[] }) {
  if (conditions.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Condiciones">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-status-warning" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Condiciones</h3>
      </div>
      <ul className="flex flex-col gap-1.5" role="list">
        {conditions.map((condition) => (
          <li key={condition} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <span className="text-status-warning mt-0.5 shrink-0">•</span>
            <span>{condition}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OverrideSection({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Override">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-status-info" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Override</h3>
      </div>
      <p className="text-xs text-muted-foreground">{reason}</p>
    </div>
  );
}

function DecisionHistorySection({ history }: { history: DecisionHistoryEntry[] }) {
  if (history.length === 0) return null;
  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Historial de decisiones">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">Historial</h3>
      </div>
      <ul className="flex flex-col gap-2" role="list">
        {history.map((entry, idx) => (
          <li key={`${entry.timestamp}-${idx}`} className="rounded-md border border-border p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{entry.action}</span>
              <span className="text-[10px] text-muted-foreground">{formatTimestamp(entry.timestamp)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Por: {entry.decided_by}</p>
            {entry.conditions && (
              <p className="text-xs text-muted-foreground mt-1">
                <span className="font-medium">Condiciones:</span> {entry.conditions}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workflow steps visualization
// ---------------------------------------------------------------------------

function WorkflowSteps({ approval_level, status }: { approval_level: ApprovalLevel; status: WorkflowStatus }) {
  const steps: Array<{ level: ApprovalLevel; label: string }> = [
    { level: 'auto', label: 'Auto' },
    { level: 'analyst', label: 'Analista' },
    { level: 'manager', label: 'Manager' },
    { level: 'committee', label: 'Comite' },
  ];

  const levelOrder: Record<ApprovalLevel, number> = { auto: 0, analyst: 1, manager: 2, committee: 3 };
  const currentIdx = levelOrder[approval_level];
  const isTerminal = status === 'approved' || status === 'rejected';

  return (
    <div className="flex items-center gap-1" role="list" aria-label="Pasos del workflow">
      {steps.map((step, idx) => {
        const isActive = idx === currentIdx;
        const isPast = idx < currentIdx;
        const isFuture = idx > currentIdx;

        let dotClass = 'bg-muted';
        let textClass = 'text-muted-foreground';

        if (isActive && isTerminal) {
          dotClass = status === 'approved' ? 'bg-[hsl(var(--status-success))]' : 'bg-[hsl(var(--status-error))]';
          textClass = status === 'approved' ? 'text-status-success' : 'text-status-error';
        } else if (isActive) {
          dotClass = 'bg-primary';
          textClass = 'text-primary';
        } else if (isPast) {
          dotClass = 'bg-[hsl(var(--status-success))]';
          textClass = 'text-status-success';
        }

        return (
          <div key={step.level} className="flex items-center gap-1" role="listitem">
            <div className="flex flex-col items-center gap-0.5">
              <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} aria-hidden="true" />
              <span className={`text-[10px] ${textClass}`}>{step.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`w-6 h-0.5 mb-3 ${isPast || (isActive && !isFuture) ? 'bg-[hsl(var(--status-success))]' : 'bg-muted'}`}
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DecisionWorkflow({
  application_id,
  requested_amount,
  currency,
  approval_level,
  status,
  assigned_to,
  sla_deadline,
  decision_history,
  conditions,
  override_reason,
}: DecisionWorkflowProps) {
  return (
    <section className="flex flex-col gap-4" aria-label="Decision Workflow" data-application-id={application_id}>
      {/* Header + Status */}
      <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-4">
        <WorkflowHeader
          status={status}
          approval_level={approval_level}
          requested_amount={requested_amount}
          currency={currency}
        />
        <WorkflowSteps approval_level={approval_level} status={status} />
        <AssignedToSection assigned_to={assigned_to} />
      </div>

      {/* SLA */}
      <div className="bg-card rounded-lg border border-border p-4">
        <SlaSection sla_deadline={sla_deadline} approval_level={approval_level} />
      </div>

      {/* Conditions */}
      {conditions && conditions.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <ConditionsSection conditions={conditions} />
        </div>
      )}

      {/* Override */}
      {override_reason && (
        <div className="bg-card rounded-lg border border-border p-4">
          <OverrideSection reason={override_reason} />
        </div>
      )}

      {/* Decision History */}
      {decision_history && decision_history.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <DecisionHistorySection history={decision_history} />
        </div>
      )}
    </section>
  );
}
