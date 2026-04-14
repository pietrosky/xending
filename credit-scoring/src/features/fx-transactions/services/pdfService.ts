/**
 * PDF Service — Generates payment order PDFs via the fx-pdf-generator Node server.
 *
 * Sends deal data to POST /generate-pdf/xending and opens the returned PDF
 * in a new tab for download/print.
 *
 * Falls back to client-side HTML print window if the server is unreachable.
 *
 * @see Requirements 6.1, 6.2
 */

import type { FXTransaction } from '../types/transaction.types';
import type { CompanyFX, PaymentAccount } from '../types/company-fx.types';
import type { PaymentInstructionAccount } from '../../payment-instructions/types/payment-instruction.types';
import type { CompanyAddress } from '../../onboarding/types/company.types';
import { invertRate } from '../utils/fxConversion';

const PDF_GENERATOR_URL =
  import.meta.env.VITE_PDF_GENERATOR_URL ?? 'http://localhost:3002';

// ─── Helpers ─────────────────────────────────────────────────────────

function formatClabe(clabe: string): string {
  const digits = clabe.replace(/\D/g, '').slice(0, 18);
  if (digits.length < 18) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 17)}-${digits.slice(17)}`;
}

function formatAddressHTML(address: CompanyAddress): string {
  return [address.street, address.city, address.state, address.zip, address.country]
    .filter(Boolean)
    .join('<br>');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Build deal data payload ─────────────────────────────────────────

function buildDealData(
  transaction: FXTransaction,
  company: CompanyFX,
  paymentAccount: PaymentAccount,
  piAccount?: PaymentInstructionAccount | null,
): Record<string, unknown> {
  // Always display rates in MXP (pesos por dólar)
  const isSell = transaction.buys_currency === 'MXN';
  const displayBaseRate = isSell ? invertRate(transaction.base_rate) : transaction.base_rate;
  const displayMarkupRate = isSell ? invertRate(transaction.markup_rate) : transaction.markup_rate;
  const displayExchangeRate = isSell ? invertRate(transaction.markup_rate) : transaction.markup_rate;
  const displayUtilidad = displayMarkupRate - displayBaseRate;

  return {
    dealNumber: transaction.folio,
    clientName: company.legal_name,
    clientAddress: formatAddressHTML(company.address),
    tradeDate: formatDate(transaction.created_at),
    dealType: 'Spot',
    buyCurrency: transaction.buys_currency,
    buyAmount: transaction.quantity.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    exchangeRate: displayExchangeRate.toFixed(4),
    baseRate: displayBaseRate.toFixed(4),
    markupRate: displayMarkupRate.toFixed(4),
    utilidad: (isSell ? displayUtilidad * -1 : displayUtilidad).toFixed(4),
    payCurrency: transaction.pays_currency,
    payAmount: transaction.pays_mxn.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    totalDue: transaction.pays_mxn.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    // Payment instructions — from PI account (pi_accounts table)
    accountNumber1: piAccount?.account_number ?? '',
    accountName1: piAccount?.account_name ?? '',
    accountAddress1: piAccount?.bank_address ?? '',
    swift1: piAccount?.swift_code ?? '',
    bankName1: piAccount?.bank_name ?? '',
    bankAddress1: piAccount?.bank_address ?? '',
    byOrderOf1: company.legal_name,
    // Beneficiary — where Xending sends the bought currency
    beneficiaryAccountNumber: paymentAccount.clabe ? formatClabe(paymentAccount.clabe) : '',
    beneficiaryAccountName: company.legal_name,
    beneficiaryBankName: paymentAccount.bank_name || '',
  };
}

// ─── Server-side PDF generation ──────────────────────────────────────

async function generatePDFFromServer(dealData: Record<string, unknown>): Promise<Blob> {
  const res = await fetch(`${PDF_GENERATOR_URL}/generate-pdf/xending-compact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dealData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? 'Error generando PDF');
  }

  return res.blob();
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Generates a professional Xending-styled payment order PDF via the
 * fx-pdf-generator Node service. Downloads the PDF directly.
 *
 * Falls back to a client-side print window if the server is unreachable.
 */
export async function generatePaymentOrderPDFFromTemplate(
  transaction: FXTransaction,
  company: CompanyFX,
  paymentAccount: PaymentAccount,
  piAccount?: PaymentInstructionAccount | null,
): Promise<void> {
  const dealData = buildDealData(transaction, company, paymentAccount, piAccount);

  try {
    const blob = await generatePDFFromServer(dealData);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deal-confirmation-xending-${dealData.dealNumber || 'unknown'}.pdf`;
    document.body.appendChild(a);
    a.click();
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (err) {
    console.warn('fx-pdf-generator unavailable, falling back to print window:', err);
    // Lazy-load fallback to avoid bundling unused HTML template code
    const { openFallbackPrintWindow } = await import('./pdfFallback');
    openFallbackPrintWindow(dealData);
  }
}

/**
 * Legacy alias — kept for backward compatibility.
 */
export const generatePaymentOrderPDF = generatePaymentOrderPDFFromTemplate;
