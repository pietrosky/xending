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
import { getPaymentAccountById } from '../../payment-instructions/services/paymentAccountService';
import { TransactionForm } from '../components/TransactionForm';
import { AuthorizeButton } from '../components/AuthorizeButton';
import { ProofUpload } from '../components/ProofUpload';
import {TemplateService} from '../services/htmlService';
import { formatCurrency, amountToWords } from '../utils/formatters';
import type { CompanyFX } from '../types/company-fx.types';
import type { CreateTransactionInput, FXTransaction } from '../types/transaction.types';
import type { PaymentInstructionAccount } from '../../payment-instructions/types/payment-instruction.types';



export function EditTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { data: tx, isLoading: txLoading, refetch } = useTransaction(id);
  const updateMutation = useUpdateTransaction();
  const [company, setCompany] = useState<CompanyFX | null>(null);
  const [piAccount, setPiAccount] = useState<PaymentInstructionAccount | null>(null); //Para mapear las Payment account
  useEffect(() => {
    if (tx?.company_id) {
      getCompanyFXById(tx.company_id).then((c) => setCompany(c));
    }
    if (tx?.pi_account_id) {
      getPaymentAccountById(tx.pi_account_id).then((pi) => setPiAccount(pi));
    }
  }, [tx?.company_id, tx?.pi_account_id]);

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

  // TODO: dejar mas prolijo
  function construirDealData(tx: FXTransaction, company: CompanyFX | null, piAccount: PaymentInstructionAccount | null) {
    const payAmount = (Number(tx?.quantity) * Number(tx?.markup_rate))
    const buyAmount = tx?.quantity
    return {
      // TRANSACTION
      dealNumber: tx?.folio,
      reference: tx?.folio,
      buyCurrency: tx?.buys_currency,
      quantity: tx?.quantity,
      buyAmount: formatCurrency(buyAmount, tx?.buys_currency),
      buyAmountString: amountToWords(buyAmount, tx?.buys_currency, 'fullName'),
      baseRate: tx?.base_rate,
      exchangeRate: Number(tx?.markup_rate).toFixed(2),
      payCurrency: tx?.pays_currency,
      currency: tx?.pays_currency,
      payAmount: formatCurrency(payAmount, tx?.pays_currency),
      payAmountString: amountToWords(payAmount ,tx?.pays_currency, 'fullName'),
      status: tx?.status,
      requestDate: new Date(tx?.created_at).toLocaleDateString('es-MX'),
      dueDate: new Date(tx?.created_at).toLocaleDateString('es-MX'),

      // COMPANY
      clientName: company?.legal_name?.toString(),
      clientAddress: [company?.address.street + ' ' + company?.address.city + ' ' + company?.address.state + ' ' +company?.address?.zip + ' ' + (company?.address?.country || '')],
      beneficiary: company?.legal_name?.toString(),
      bankName: company?.payment_accounts?.[0]?.bank_name,
      clabe: company?.payment_accounts?.[0]?.clabe,
      clientRFC: company?.rfc,

      // PAYMENTINSTRUCTIONACCOUNT
      myBankName: piAccount?.bank_name,
      myClabe: piAccount?.account_number,

      // OTROS
      financingTerm: '1 Dia',
      valueDate: new Date().toLocaleDateString('es-MX'),
      amountToReceive: tx?.quantity.toString(),
      myPaymentMethod: 'SPEI',
    };
  }

  function descargarHtml(template: 'resumen' | 'constancia', dealData: any, transactionId: string) {
    const html = TemplateService.generateHTML(template, dealData);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
      
    const link = document.createElement('a');
    link.href = url;
    link.download = `transaction-${transactionId}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
      
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  async function handleGenerateHTML(transactionId: string, template: 'resumen' | 'constancia') {
    try {
      if (!tx) return;
      const dealData = construirDealData(tx, company, piAccount)
      descargarHtml(template, dealData, transactionId);
    } catch (error) {
      console.error('Error generating HTML:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }
  
  // Extra content: authorize button + proof upload
  const extraContent = (
    <div className="space-y-4">
      {/* Documentation section */}
    <div className="rounded-lg border border-border p-4">
      <p className="text-sm font-medium text-foreground mb-3">Documentación</p>
      <div className="flex gap-2 flex-col sm:flex-row">
        <button
          type="button"
          onClick={() => handleGenerateHTML(tx.id, 'resumen')}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
        >
          Resumen Operacion
        </button>
        <button
          type="button"
          onClick={() => handleGenerateHTML(tx.id, 'constancia')}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
        >
          Resumen Operacion
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
