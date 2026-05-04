/**
 * EditTransactionPage — Edición de transacción FX (admin only).
 *
 * Reutiliza TransactionForm en modo edit.
 * Incluye botón de autorizar (si pending) y zona de comprobante (si authorized).
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTransaction, useUpdateTransaction } from '../hooks/useTransactions';
import { useRole } from '../hooks/useRole';
import { getCompanyFXById } from '../services/companyServiceFX';
import { getPaymentAccountById } from '@/features/payment-instructions/services/paymentAccountService';
import type { PaymentAccount } from '../types/company-fx.types';
import { TransactionForm } from '../components/TransactionForm';
import { AuthorizeButton } from '../components/AuthorizeButton';
import { ProofUpload } from '../components/ProofUpload';
import { generatePDFFromTemplate, type PDFTemplate, } from '../services/pdfService';
import type { CompanyFX } from '../types/company-fx.types';
import type { CreateTransactionInput } from '../types/transaction.types';
import type { PaymentInstructionAccount } from '../../payment-instructions/types/payment-instruction.types';


export function EditTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { data: tx, isLoading: txLoading, refetch } = useTransaction(id);
  const updateMutation = useUpdateTransaction();
  const [company, setCompany] = useState<CompanyFX | null>(null);
  const [paymentAccount, setPaymentAccount] = useState<PaymentAccount | null>(null);
  const [piAccount, setPiAccount] = useState<PaymentInstructionAccount | null>(null);
  
  useEffect(() => {
    if (!tx) {
      setCompany(null);
      setPaymentAccount(null);
      setPiAccount(null);
      return;
    }

    const loadRelatedData = async () => {
      try {
        if (tx.company_id) {
          const companyData = await getCompanyFXById(tx.company_id);
          setCompany(companyData);

          const matchedPaymentAccount =
            companyData?.payment_accounts?.find(
              (account) => account.id === tx.payment_account_id
            ) ?? null;

          setPaymentAccount(matchedPaymentAccount);
        } else {
          setCompany(null);
          setPaymentAccount(null);
        }

        if (tx.pi_account_id) {
          const pi = await getPaymentAccountById(tx.pi_account_id);
          setPiAccount(pi);
        } else {
          setPiAccount(null);
        }
      } catch (error) {
        console.error('Error loading related transaction data:', error);
        setCompany(null);
        setPaymentAccount(null);
        setPiAccount(null);
      }
    };

    void loadRelatedData();
  }, [tx]);

  function handleSubmit(input: CreateTransactionInput) {
    if (!id) return;
    updateMutation.mutate(
      { id, updates: { quantity: input.quantity, base_rate: input.base_rate, markup_rate: input.markup_rate, payment_account_id: input.payment_account_id, pi_account_id: input.pi_account_id, buys_currency: input.buys_currency, pays_currency: input.pays_currency } },
      { onSuccess: () => navigate('/fx/transactions') },
    );
  }

  if (txLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tx) {
    return <div className="text-center py-20 text-sm text-destructive">Transacción no encontrada.</div>;
  }
  
  const handleGeneratePDF = async (template: PDFTemplate) => {
    if (!tx || !company || !paymentAccount) {
      console.warn('Faltan datos para generar el PDF');
      return;
    }

    try {
      await generatePDFFromTemplate(
        template, {
        transaction: tx,
        company,
        paymentAccount,
        piAccount }
      );
    } catch (error) {
      console.error('Error generando PDF:', error);
    }
  };

  // Extra content: authorize button + proof upload
  const extraContent = (
    <div className="space-y-4">
      {/* Documentation section */}
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-foreground mb-3">Documentación</p>
      <div className="flex gap-2 flex-col sm:flex-row">
        <button
          type="button"
          onClick={() => void handleGeneratePDF('xending-resume')}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors" >
          Resumen Operación
        </button>
        <button
          type="button"
          onClick={() => void handleGeneratePDF('xending-constancia')}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors" >
          Constancia
        </button>
      </div>
    </div>
      {/* Authorize button for pending transactions */}
      {tx.status === 'pending' && isAdmin && (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground mb-3">Autorización</p>
          <AuthorizeButton
            transactionId={tx.id}
            isAdmin={isAdmin}
            onAuthorized={() => void refetch()}
          />
        </div>
      )}

      {/* Proof upload only after authorization */}
      {tx.status === 'authorized' && (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground mb-3">Comprobante de Pago</p>
          <ProofUpload
            transactionId={tx.id}
            isAuthorized
            existingProofUrl={tx.proof_url}
            onUploadComplete={() => void refetch()}
          />
        </div>
      )}

      {/* Show existing proof for completed transactions (read-only) */}
      {tx.status === 'completed' && tx.proof_url && (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium text-foreground mb-3">Comprobante de Pago</p>
          <a
            href={tx.proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline underline-offset-2 hover:text-primary/80"
          >
            Ver comprobante
          </a>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6">
      <button
        type="button"
        onClick={() => navigate('/fx/transactions')}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 transition-colors"
      >
        ← Volver al catálogo
      </button>

      <TransactionForm
        mode="edit"
        initialData={tx}
        initialCompany={company}
        onSubmit={handleSubmit}
        isLoading={updateMutation.isPending}
        error={(updateMutation.error as Error | null)?.message ?? null}
        extraContent={extraContent}
        readOnly={!isAdmin && tx.status !== 'pending'}
      />
    </div>
  );
}
