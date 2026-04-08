/**
 * CompanyCatalogTable — Tabla del catálogo de empresas FX.
 *
 * Muestra empresas en tabla con columnas diferenciadas por rol:
 * - Admin: Razón Social, RFC, Broker, Total Transacciones (USD), Última Transacción, Deshabilitar
 * - Broker: Razón Social, RFC, Total Transacciones (USD), Última Transacción
 *
 * Indicador visual para empresas deshabilitadas (fila gris + badge).
 * Acción de editar empresa navega al formulario de edición.
 *
 * Requerimientos: 4.1, 4.2, 4.3, 4.4
 */

import type { CompanyFX } from '../types/company-fx.types';
import { formatCurrency } from '../utils/formatters';

export interface CompanyCatalogTableProps {
  companies: CompanyFX[];
  isAdmin: boolean;
  onEdit: (companyId: string) => void;
  onToggleStatus: (companyId: string, disabled: boolean) => void;
}

export function CompanyCatalogTable({
  companies,
  isAdmin,
  onEdit,
  onToggleStatus,
}: CompanyCatalogTableProps) {
  if (companies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No hay empresas registradas.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left text-muted-foreground">
            <th className="px-4 py-3 font-medium">Razón Social</th>
            <th className="px-4 py-3 font-medium">RFC</th>
            {isAdmin && <th className="px-4 py-3 font-medium">Broker</th>}
            <th className="px-4 py-3 font-medium text-right">Total Transacciones (USD)</th>
            <th className="px-4 py-3 font-medium">Última Transacción</th>
            <th className="px-4 py-3 font-medium text-center">Acciones</th>
            {isAdmin && <th className="px-4 py-3 font-medium text-center">Deshabilitar</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {companies.map((company) => {
            const isDisabled = company.status !== 'active';

            return (
              <tr
                key={company.id}
                className={
                  isDisabled
                    ? 'bg-muted/30 text-muted-foreground'
                    : 'bg-card text-foreground hover:bg-muted/20 transition-colors'
                }
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={isDisabled ? 'line-through' : ''}>
                      {company.legal_name}
                    </span>
                    {isDisabled && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Deshabilitada
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 font-mono text-xs">{company.rfc}</td>

                {isAdmin && (
                  <td className="px-4 py-3">{company.owner_name ?? '—'}</td>
                )}

                <td className="px-4 py-3 text-right tabular-nums">
                  {company.total_buys_usd != null
                    ? formatCurrency(company.total_buys_usd, 'USD')
                    : '—'}
                </td>

                <td className="px-4 py-3">
                  {company.last_transaction_at
                    ? new Date(company.last_transaction_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </td>

                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => onEdit(company.id)}
                    className="text-primary hover:text-primary/80 text-xs font-medium underline underline-offset-2 transition-colors"
                  >
                    Editar
                  </button>
                </td>

                {isAdmin && (
                  <td className="px-4 py-3 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isDisabled}
                        onChange={() => onToggleStatus(company.id, !isDisabled)}
                        className="sr-only peer"
                        aria-label={
                          isDisabled
                            ? `Habilitar ${company.legal_name}`
                            : `Deshabilitar ${company.legal_name}`
                        }
                      />
                      <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-red-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                    </label>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
