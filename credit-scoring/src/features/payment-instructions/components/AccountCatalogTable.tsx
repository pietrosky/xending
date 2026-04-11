/**
 * AccountCatalogTable — Tabla del catálogo de cuentas bancarias para Payment Instructions.
 *
 * Admin ve todas las cuentas (activas + deshabilitadas) con columnas Estado y Acciones.
 * Broker ve solo cuentas activas sin columnas Estado ni Acciones.
 *
 * Requerimientos: 4.1, 4.2, 3.2, 3.3
 */

import type { PaymentInstructionAccount } from '../types/payment-instruction.types';

export interface AccountCatalogTableProps {
  accounts: PaymentInstructionAccount[];
  isAdmin: boolean;
  onDisable: (id: string) => void;
}

export function AccountCatalogTable({
  accounts,
  isAdmin,
  onDisable,
}: AccountCatalogTableProps) {
  // Broker only sees active accounts (Req 3.3, 4.2)
  const visibleAccounts = isAdmin
    ? accounts
    : accounts.filter((a) => a.is_active);

  if (visibleAccounts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No hay cuentas bancarias registradas.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left text-muted-foreground">
            <th className="px-4 py-2 font-medium">Account Number</th>
            <th className="px-4 py-2 font-medium">Account Name</th>
            <th className="px-4 py-2 font-medium">SWIFT</th>
            <th className="px-4 py-2 font-medium">Bank Name</th>
            <th className="px-4 py-2 font-medium">Bank Address</th>
            <th className="px-4 py-2 font-medium">Tipo de Cambio</th>
            {isAdmin && <th className="px-4 py-2 font-medium text-center">Estado</th>}
            {isAdmin && <th className="px-4 py-2 font-medium text-center">Acciones</th>}
          </tr>
        </thead>

        <tbody className="divide-y divide-border">
          {visibleAccounts.map((account) => {
            const isDisabled = !account.is_active;

            return (
              <tr
                key={account.id}
                className={
                  isDisabled
                    ? 'bg-muted/30 text-muted-foreground'
                    : 'bg-card text-foreground hover:bg-muted/20 transition-colors'
                }
              >
                <td className="px-4 py-3 font-mono text-xs">{account.account_number}</td>
                <td className="px-4 py-3">{account.account_name}</td>
                <td className="px-4 py-3 font-mono text-xs">{account.swift_code || '—'}</td>
                <td className="px-4 py-3">{account.bank_name}</td>
                <td className="px-4 py-3">{account.bank_address}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {account.currency_types.map((currency) => (
                      <span
                        key={currency}
                        className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                      >
                        {currency}
                      </span>
                    ))}
                  </div>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-center">
                    {account.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Deshabilitada
                      </span>
                    )}
                  </td>
                )}
                {isAdmin && (
                  <td className="px-4 py-3 text-center">
                    {account.is_active && (
                      <button
                        type="button"
                        onClick={() => onDisable(account.id)}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                      >
                        Deshabilitar
                      </button>
                    )}
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
