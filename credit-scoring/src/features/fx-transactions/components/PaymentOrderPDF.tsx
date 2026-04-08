/**
 * PaymentOrderPDF — Enlace de descarga de PDF de orden de pago.
 *
 * Botón que genera y descarga el PDF de la orden de pago usando `generatePaymentOrderPDF`.
 * Habilitado solo si la transacción tiene folio asignado; deshabilitado en caso contrario.
 *
 * Requerimientos: 6.1, 6.3
 */

import { generatePaymentOrderPDF } from '../services/pdfService';
import type { FXTransaction } from '../types/transaction.types';
import type { CompanyFX, PaymentAccount } from '../types/company-fx.types';

export interface PaymentOrderPDFProps {
  transaction: FXTransaction;
  company: CompanyFX;
  paymentAccount: PaymentAccount;
}

export function PaymentOrderPDF({ transaction, company, paymentAccount }: PaymentOrderPDFProps) {
  const hasFolio = Boolean(transaction.folio);

  function handleDownload() {
    generatePaymentOrderPDF(transaction, company, paymentAccount);
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
