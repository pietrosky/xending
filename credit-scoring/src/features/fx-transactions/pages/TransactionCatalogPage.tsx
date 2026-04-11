/**
 * TransactionCatalogPage — Página del catálogo de transacciones FX.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions, useCancelTransaction, useRevertCancelTransaction } from '../hooks/useTransactions';
import { useRole } from '../hooks/useRole';
import { TransactionCatalogTable } from '../components/TransactionCatalogTable';
import { CancelTransactionModal } from '../components/CancelTransactionModal';
import { RevertCancelModal } from '../components/RevertCancelModal';
import { getCompanyFXById } from '../services/companyServiceFX';
import { generatePaymentOrderPDFFromTemplate } from '../services/pdfService';
import { getPaymentAccountById } from '../../payment-instructions/services/paymentAccountService';
import type { FXTransactionSummary } from '../types/transaction.types';

export function TransactionCatalogPage() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { data: transactions, isLoading, isError, refetch } = useTransactions();
  const cancelMutation = useCancelTransaction();
  const revertMutation = useRevertCancelTransaction();
  const [cancelTarget, setCancelTarget] = useState<FXTransactionSummary | null>(null);
  const [revertTarget, setRevertTarget] = useState<FXTransactionSummary | null>(null);

  async function handleGeneratePDF(transactionId: string) {
    const tx = transactions?.find((t) => t.id === transactionId);
    if (!tx) return;
    try {
      const company = await getCompanyFXById(tx.company_id);
      if (!company) return;
      const paymentAccount = company.payment_accounts?.[0];
      if (!paymentAccount) return;
      const piAccount = tx.pi_account_id
        ? await getPaymentAccountById(tx.pi_account_id)
        : null;
      generatePaymentOrderPDFFromTemplate(tx, company, paymentAccount, piAccount);
    } catch { /* non-critical */ }
  }

  function handleCancelRequest(txId: string) {
    const tx = transactions?.find((t) => t.id === txId);
    if (tx) setCancelTarget(tx);
  }

  function handleCancelConfirm() {
    if (!cancelTarget) return;
    cancelMutation.mutate(cancelTarget.id, {
      onSuccess: () => {
        setCancelTarget(null);
        void refetch();
      },
    });
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
          <h2 className="text-2xl font-semibold text-foreground">Catálogo de Transacciones</h2>
          <p className="text-sm text-muted-foreground mt-1">Gestión de transacciones FX</p>
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
        onCancel={handleCancelRequest}
        onRevertCancel={(txId) => {
          const tx = transactions?.find((t) => t.id === txId);
          if (tx) setRevertTarget(tx);
        }}
      />

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <CancelTransactionModal
          transaction={cancelTarget}
          isLoading={cancelMutation.isPending}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {revertTarget && (
        <RevertCancelModal
          transaction={revertTarget}
          isLoading={revertMutation.isPending}
          onConfirm={() => {
            revertMutation.mutate(revertTarget.id, {
              onSuccess: () => { setRevertTarget(null); void refetch(); },
            });
          }}
          onClose={() => setRevertTarget(null)}
        />
      )}
    </div>
  );
}
