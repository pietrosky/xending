/**
 * PaymentInstructionsPage — Página principal del catálogo de cuentas bancarias.
 *
 * - Admin ve todas las cuentas + botón "Nueva Cuenta" + acciones de deshabilitar
 * - Broker ve solo cuentas activas sin controles de administración
 *
 * Requerimientos: 4.1, 4.2, 5.3, 5.4, 1.6, 3.4
 */

import { useState } from 'react';
import { usePaymentAccounts, useDisablePaymentAccount } from '../hooks/usePaymentInstructions';
import { useRole } from '@/features/fx-transactions/hooks/useRole';
import { AccountCatalogTable } from '../components/AccountCatalogTable';
import { CreateAccountModal } from '../components/CreateAccountModal';

export function PaymentInstructionsPage() {
  const { isAdmin } = useRole();
  const { data: accounts, isLoading, isError } = usePaymentAccounts();
  const disableMutation = useDisablePaymentAccount();
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleDisable(id: string) {
    const confirmed = window.confirm(
      '¿Estás seguro de que deseas deshabilitar esta cuenta? Esta acción no se puede deshacer.',
    );
    if (!confirmed) return;
    disableMutation.mutate(id);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-sm text-destructive">
        Error al cargar las cuentas. Intenta de nuevo más tarde.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Payment Instructions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Catálogo de cuentas bancarias para depósito
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
          >
            + Nueva Cuenta
          </button>
        )}
      </div>

      <AccountCatalogTable
        accounts={accounts ?? []}
        isAdmin={isAdmin}
        onDisable={handleDisable}
      />

      <CreateAccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => setIsModalOpen(false)}
      />
    </div>
  );
}
