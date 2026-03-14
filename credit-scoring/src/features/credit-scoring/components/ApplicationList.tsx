import type { CreditApplication, ApplicationStatus } from '../types/application.types';

const STATUS_LABELS: Record<ApplicationStatus, { label: string; color: string }> = {
  pending_scoring: { label: 'Pendiente', color: 'bg-status-info-bg text-status-info' },
  scoring_in_progress: { label: 'En Proceso', color: 'bg-status-warning-bg text-status-warning' },
  scored: { label: 'Evaluado', color: 'bg-status-info-bg text-status-info' },
  approved: { label: 'Aprobado', color: 'bg-status-success-bg text-status-success' },
  conditional: { label: 'Condicionado', color: 'bg-status-warning-bg text-status-warning' },
  committee: { label: 'Comité', color: 'bg-status-info-bg text-status-info' },
  rejected: { label: 'Rechazado', color: 'bg-status-error-bg text-status-error' },
};

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

interface ApplicationListProps {
  applications: CreditApplication[];
  onSelect?: (id: string) => void;
}

export function ApplicationList({ applications, onSelect }: ApplicationListProps) {
  if (applications.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <p className="text-muted-foreground">
          No hay solicitudes aún. Crea la primera solicitud para comenzar.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm" aria-label="Lista de solicitudes de crédito">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th scope="col" className="text-left p-3 font-medium">Empresa</th>
            <th scope="col" className="text-left p-3 font-medium">RFC</th>
            <th scope="col" className="text-right p-3 font-medium">Monto</th>
            <th scope="col" className="text-center p-3 font-medium">Plazo</th>
            <th scope="col" className="text-center p-3 font-medium">Status</th>
            <th scope="col" className="text-right p-3 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => {
            const statusInfo = STATUS_LABELS[app.status];
            return (
              <tr
                key={app.id}
                className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => onSelect?.(app.id)}
                role="button"
                tabIndex={0}
                aria-label={`Solicitud de ${app.company_name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect?.(app.id);
                  }
                }}
              >
                <td className="p-3 font-medium">{app.company_name}</td>
                <td className="p-3 text-muted-foreground">{app.rfc}</td>
                <td className="p-3 text-right">
                  {formatCurrency(app.requested_amount, app.currency)}
                </td>
                <td className="p-3 text-center">{app.term_months}m</td>
                <td className="p-3 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </td>
                <td className="p-3 text-right text-muted-foreground">
                  {new Date(app.created_at).toLocaleDateString('es-MX')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
