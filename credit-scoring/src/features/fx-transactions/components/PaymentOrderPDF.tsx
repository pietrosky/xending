/**
 * PaymentOrderPDF — Botón de descarga de PDF de orden de pago.
 *
 * Genera PDF profesional con template Xending (100% client-side).
 *
 * Requerimientos: 6.1, 6.3
 */

import { generatePaymentOrderPDFFromTemplate } from '../services/pdfService';
import type { FXTransaction } from '../types/transaction.types';
import type { CompanyFX, PaymentAccount } from '../types/company-fx.types';
import type { PaymentInstructionAccount } from '../../payment-instructions/types/payment-instruction.types';

export interface PaymentOrderPDFProps {
  transaction: FXTransaction;
  company: CompanyFX;
  paymentAccount: PaymentAccount;
  piAccount?: PaymentInstructionAccount | null;
}

export function PaymentOrderPDF({ transaction, company, paymentAccount, piAccount }: PaymentOrderPDFProps) {
  const hasFolio = Boolean(transaction.folio);

  function handleDownload() {
    generatePaymentOrderPDFFromTemplate(transaction, company, paymentAccount, piAccount);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={!hasFolio}
      className={
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ' +
        (hasFolio
          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
          : 'bg-muted text-muted-foreground cursor-not-allowed')
      }
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
      PDF
    </button>
  );
}
