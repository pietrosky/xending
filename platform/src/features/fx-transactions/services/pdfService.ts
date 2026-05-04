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
export type PDFBuildParams = { transaction?: FXTransaction | null; company?: CompanyFX | Partial<CompanyFX> | null; paymentAccount?: PaymentAccount | null; piAccount?: PaymentInstructionAccount | null}

import type { FXTransaction } from '../types/transaction.types';
import type { CompanyFX, PaymentAccount } from '../types/company-fx.types';
import type { PaymentInstructionAccount } from '../../payment-instructions/types/payment-instruction.types';
import type { CompanyAddress } from '../../onboarding/types/company.types';
import { invertRate, computePays } from '../utils/fxConversion';
import { amountToWords } from '../utils/formatters';
export type PDFTemplate =
  | 'monex'
  | 'xending'
  | 'xending-compact'
  | 'generic'
  | 'xending-resume'
  | 'xending-constancia'
  | 'xending-linereq';

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
function buildDealData(params?: PDFBuildParams | null): Record<string, unknown> {
  if (!params) return {};

  const { transaction, company, paymentAccount, piAccount } = params;

  const data: Record<string, unknown> = {};

  if (transaction) {
    const isSell = transaction.buys_currency === 'MXN';
    const displayBaseRate = isSell ? invertRate(transaction.base_rate) : transaction.base_rate;
    const displayMarkupRate = isSell ? invertRate(transaction.markup_rate) : transaction.markup_rate;
    const displayExchangeRate = displayMarkupRate;
    const displayUtilidad = displayMarkupRate - displayBaseRate;
    const paysAmount = computePays(transaction.quantity, transaction.markup_rate);
    
    data.transaction = {
      id: String(transaction.id),
      folio: String(transaction.folio),
      company_id: String(transaction.company_id),
      buys_currency: String(transaction.buys_currency),
      quantity: transaction.quantity.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      base_rate: displayBaseRate.toFixed(4),
      markup_rate: displayMarkupRate.toFixed(4),
      pays_currency: String(transaction.pays_currency),
      status: String(transaction.status),
      payment_account_id: transaction.payment_account_id ?? '',
      pi_account_id: transaction.pi_account_id ?? '',
      created_by: String(transaction.created_by),
      authorized_by: transaction.authorized_by ?? '',
      authorized_at: transaction.authorized_at ?? '',
      proof_url: transaction.proof_url ?? '',
      cancelled: transaction.cancelled ? 'true' : 'false',
      cancelled_at: transaction.cancelled_at ?? '',
      cancelled_by: transaction.cancelled_by ?? '',
      created_at: formatDate(transaction.created_at),
      updated_at: transaction.updated_at ?? '',

      pays_amount: paysAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }),
      deal_type: 'Spot', // sin implementar
      exchange_rate: displayExchangeRate.toFixed(4),
      utilidad: (isSell ? displayUtilidad * -1 : displayUtilidad).toFixed(4),
      due_ate: formatDate(transaction.created_at),
      value_date: formatDate(transaction.created_at),//como no esta definido aun el financing term o plazos a pagar uso el mismo dia que se creo.
      financing_term: '1 Dia', // sin implementar
      quantity_words: amountToWords(transaction.quantity, transaction.buys_currency, 'fullName'),
      pays_amount_words: amountToWords(paysAmount, transaction.pays_currency, 'fullName')
    };
  }

  if (company) { // deje todos los datos, si bien no se envian todos mientras no se usen esta bien y en caso de en algun momentos los necesitemos ya estan.
    data.company = {
      id: String(company.id),
      tenant_id: String(company.tenant_id),
      rfc: String(company.rfc),
      legal_name: String(company.legal_name),
      trade_name: company.trade_name ?? '',
      address: formatAddressHTML(company.address || {}).replace(/<br\s*\/?>/gi, ', ').replace(/\s*\n+\s*/g, ', '),
      business_activity: company.business_activity ?? '',
      tax_regime: company.tax_regime ?? '',
      incorporation_date: formatDate(company.incorporation_date ?? ''),
      syntage_entity_id: company.syntage_entity_id ?? '',
      scory_entity_id: company.scory_entity_id ?? '',
      payment_accounts: company.payment_accounts,
      phone: company.phone,
      contact_email: company.contact_email,
      contact_name: company.contact_name,
      owner_name: company.owner_name,
      total_quantity: company.total_quantity ?? '',
      last_transaction_at: company.last_transaction_at,
      status: String(company.status),
    };
  }

  if (paymentAccount) {
    data.paymentAccount = {
      id: String(paymentAccount.id),
      company_id: String(paymentAccount.company_id),
      clabe: paymentAccount.clabe ? formatClabe(paymentAccount.clabe) : '',
      bank_name: paymentAccount.bank_name ?? '',
      currency: String(paymentAccount.currency),
      is_primary: paymentAccount.is_primary ? 'true' : 'false',
      deleted: paymentAccount.deleted ? 'true' : 'false',
      deleted_at: paymentAccount.deleted_at ?? '',
      created_at: formatDate(paymentAccount.created_at) ?? '',
      
      swift: '' // todavia no implementado pero lo pide en XendingCompact template
    };
  }

  if (piAccount) {
    data.piAccount = {
      id: String(piAccount.id),
      account_number: String(piAccount.account_number),
      account_name: String(piAccount.account_name),
      swift_code: piAccount.swift_code ?? '',
      bank_name: String(piAccount.bank_name),
      bank_address: String(piAccount.bank_address),
      currency_types: piAccount.currency_types.join(', '),
      is_active: piAccount.is_active ? 'true' : 'false',
      created_at: formatDate(piAccount.created_at) ?? '',
      created_by: String(piAccount.created_by),
      disabled_at: piAccount.disabled_at ?? '',
      disabled_by: piAccount.disabled_by ?? '',

      payment_method: 'SPEI', // sin implementar
    };
  }

  return data;
}

// ─── Server-side PDF generation ──────────────────────────────────────

async function generatePDFFromServer(dealData: Record<string, unknown>, template: PDFTemplate): Promise<Blob> {
  const res = await fetch(`${PDF_GENERATOR_URL}/generate-pdf/${template}`, {
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
export async function generatePDFFromTemplate(
  template: PDFTemplate,
  params: PDFBuildParams | null,
): Promise<void> {
  const dealData = buildDealData(params);

  try {
    const blob = await generatePDFFromServer(dealData, template);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deal-confirmation-${template}-${dealData.dealNumber || 'unknown'}.pdf`;
    document.body.appendChild(a);
    a.click();
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (err) {
    console.warn('fx-pdf-generator unavailable, falling back to print window:', err);
    const { openFallbackPrintWindow } = await import('./pdfFallback');
    openFallbackPrintWindow(dealData, template);
  }
};