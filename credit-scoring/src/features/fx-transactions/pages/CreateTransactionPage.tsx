/**
 * CreateTransactionPage — Página de registro de transacción FX.
 *
 * Renderiza TransactionForm. Al crear exitosamente, muestra confirmación
 * con folio y enlace a descarga de PDF de orden de pago.
 * Usa useCreateTransaction mutation y supabase.auth.getUser() para userId.
 *
 * Requerimientos: 5.7, 6.1
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCreateTransaction } from '../hooks/useTransactions';
import { getCompanyFXById } from '../services/companyServiceFX';
import { generatePaymentOrderPDFFromTemplate } from '../services/pdfService';
import { getPaymentAccountById } from '../../payment-instructions/services/paymentAccountService';
import { TransactionForm } from '../components/TransactionForm';
import { formatCurrency } from '../utils/formatters';
import type { FXTransaction } from '../types/transaction.types';
import type { CreateTransactionInput } from '../types/transaction.types';

export function CreateTransactionPage() {
  const navigate = useNavigate();
  const createMutation = useCreateTransaction();

  const [userId, setUserId] = useState<string | null>(null);
  const [createdTx, setCreatedTx] = useState<FXTransaction | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  function handleSubmit(input: CreateTransactionInput) {
    if (!userId) return;
    createMutation.mutate(
      { input, userId },
      {
        onSuccess: (tx) => {
          setCreatedTx(tx);
        },
      },
    );
  }

  async function handleDownloadPDF() {
    if (!createdTx) return;
    try {
      const company = await getCompanyFXById(createdTx.company_id);
      if (!company) return;
      const paymentAccount = company.payment_accounts?.[0];
      if (!paymentAccount) return;
      const piAccount = createdTx.pi_account_id
        ? await getPaymentAccountById(createdTx.pi_account_id)
        : null;
      generatePaymentOrderPDFFromTemplate(createdTx, company, paymentAccount, piAccount);
    } catch {
      // PDF generation is non-critical
    }
  }

  // ─── Success state ───────────────────────────────────────────────

  if (createdTx) {
    return (
      <div className="max-w-2xl mx-auto py-6">
        <div className="bg-card rounded-lg border border-border p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-foreground">
            Transacción Registrada
          </h2>

          <p className="text-sm text-muted-foreground">
            La transacción ha sido creada exitosamente con el folio:
          </p>

          <p className="text-2xl font-bold text-foreground">{createdTx.folio}</p>

          <p className="text-sm text-muted-foreground">
            Monto: {formatCurrency(createdTx.buys_usd, 'USD')} ×{' '}
            {createdTx.exchange_rate.toFixed(4)} ={' '}
            {formatCurrency(createdTx.pays_mxn, 'MXN')}
          </p>

          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'hsl(213, 67%, 25%)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Descargar Orden de Pago (PDF)
            </button>

            <button
              type="button"
              onClick={() => navigate('/fx/transactions')}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Ir al Catálogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form state ──────────────────────────────────────────────────

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
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending}
        error={(createMutation.error as Error | null)?.message ?? null}
      />
    </div>
  );
}
