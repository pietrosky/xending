import { jsPDF } from 'jspdf';
import { formatCurrency } from '../utils/formatters';
import type { FXTransaction } from '../types/transaction.types';
import type { CompanyFX, PaymentAccount } from '../types/company-fx.types';
import type { CompanyAddress } from '../../onboarding/types/company.types';

/**
 * Formats a raw 18-digit CLABE string with the display mask: NNN-NNN-NNNNNNNNNNN-N
 */
function formatClabe(clabe: string): string {
  const digits = clabe.replace(/\D/g, '').slice(0, 18);
  if (digits.length < 18) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 17)}-${digits.slice(17)}`;
}

/**
 * Formats a CompanyAddress object into a single-line string.
 */
function formatAddress(address: CompanyAddress): string {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.zip,
    address.country,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Formats a date string (ISO) to a readable locale date.
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generates a payment order PDF for an FX transaction and triggers a browser download.
 *
 * The PDF replicates the payment order template (Confirmacion-XG-25-0032.pdf) and includes:
 * - Folio
 * - Razón social (legal_name)
 * - RFC
 * - Dirección fiscal (address)
 * - Cuenta CLABE (from paymentAccount)
 * - Monto USD (buys_usd)
 * - Tipo de cambio (exchange_rate)
 * - Monto MXN (pays_mxn)
 * - Fecha (created_at)
 *
 * @see Requirements 6.1, 6.2
 */
export function generatePaymentOrderPDF(
  transaction: FXTransaction,
  company: CompanyFX,
  paymentAccount: PaymentAccount,
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header ──────────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Xending Capital', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(14);
  doc.text('Orden de Pago', pageWidth / 2, 30, { align: 'center' });

  // ── Folio ───────────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Folio: ${transaction.folio}`, pageWidth - 20, 42, { align: 'right' });

  // ── Fecha ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${formatDate(transaction.created_at)}`, 20, 42);

  // ── Divider ─────────────────────────────────────────────────────
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 47, pageWidth - 20, 47);

  // ── Company details section ─────────────────────────────────────
  let y = 57;
  const labelX = 20;
  const valueX = 75;
  const lineHeight = 8;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos de la Empresa', labelX, y);
  y += lineHeight + 2;

  doc.setFontSize(10);

  // Razón Social
  doc.setFont('helvetica', 'bold');
  doc.text('Razón Social:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(company.legal_name, valueX, y);
  y += lineHeight;

  // RFC
  doc.setFont('helvetica', 'bold');
  doc.text('RFC:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(company.rfc, valueX, y);
  y += lineHeight;

  // Dirección Fiscal
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección Fiscal:', labelX, y);
  doc.setFont('helvetica', 'normal');
  const addressText = formatAddress(company.address);
  const addressLines = doc.splitTextToSize(addressText, pageWidth - valueX - 20);
  doc.text(addressLines, valueX, y);
  y += lineHeight * Math.max(addressLines.length, 1);

  // Cuenta CLABE
  doc.setFont('helvetica', 'bold');
  doc.text('Cuenta CLABE:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatClabe(paymentAccount.clabe), valueX, y);
  y += lineHeight + 4;

  // ── Divider ─────────────────────────────────────────────────────
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // ── Transaction details section ─────────────────────────────────
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de la Operación', labelX, y);
  y += lineHeight + 2;

  doc.setFontSize(10);

  // Monto USD
  doc.setFont('helvetica', 'bold');
  doc.text('Monto USD:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(transaction.buys_usd, 'USD'), valueX, y);
  y += lineHeight;

  // Tipo de Cambio
  doc.setFont('helvetica', 'bold');
  doc.text('Tipo de Cambio:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(transaction.exchange_rate.toFixed(4), valueX, y);
  y += lineHeight;

  // Monto MXN
  doc.setFont('helvetica', 'bold');
  doc.text('Monto MXN:', labelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatCurrency(transaction.pays_mxn, 'MXN'), valueX, y);
  y += lineHeight + 10;

  // ── Footer divider ──────────────────────────────────────────────
  doc.line(20, y, pageWidth - 20, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Este documento es una orden de pago generada por Xending Capital.',
    pageWidth / 2,
    y,
    { align: 'center' },
  );

  // ── Trigger download ────────────────────────────────────────────
  doc.save(`Orden-de-Pago-${transaction.folio}.pdf`);
}
