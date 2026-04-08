/**
 * TransactionCatalogPage — Página del catálogo de transacciones FX.
 *
 * Renderiza TransactionCatalogTable con datos de useTransactions.
 * Botón "Nueva Transacción" navega a /fx/transactions/new.
 * Usa useRole para determinar permisos.
 * Implementa onGeneratePDF que obtiene datos de empresa y cuenta de pago
 * para generar el PDF de orden de pago.
 *
 * Requerimientos: 9.1, 9.2
 */

import { useNavigate } from 'react-router-dom';
import { useTransactions, useCancelTransaction } from '../hooks/useTransactions';
import { useRole } from '../hooks/useRole';
import { TransactionCatalogTable } from '../components/TransactionCatalogTable';
import { getCompanyFXById } from '../services/companyServiceFX';
import { generatePaymentOrderPDF } from '../services/pdfService';

export function TransactionCatalogPage() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { data: transactions, isLoading, isError, refetch } = useTransactions();
  const cancelMutation = useCancelTransaction();

  async function handleGeneratePDF(transactionId: string) {
    const tx = transactions?.find((t) => t.id === transactionId);
    if (!tx) return;

    try {
      const company = await getCompanyFXById(tx.company_id);
      if (!company) return;

      const paymentAccount = company.payment_accounts?.[0];
      if (!paymentAccount) return;

      generatePaymentOrderPDF(tx, company, paymentAccount);
    } catch {
      // Silently fail — PDF generation is non-critical
    }
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
        Error al cargar las transacciones. Intenta de nuevo más tarde.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Catálogo de Transacciones
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de transacciones FX
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/fx/transactions/new')}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
        >
          + Nueva Transacción
        </button>
      </div>

      <TransactionCatalogTable
        transactions={transactions ?? []}
        isAdmin={isAdmin}
        onGeneratePDF={handleGeneratePDF}
        onUploadComplete={() => void refetch()}
        onEdit={(txId) => navigate(`/fx/transactions/${txId}/edit`)}
        onCancel={(txId) => {
          if (confirm('¿Estás seguro de cancelar esta transacción?')) {
            cancelMutation.mutate(txId, { onSuccess: () => void refetch() });
          }
        }}
      />
    </div>
  );
}
