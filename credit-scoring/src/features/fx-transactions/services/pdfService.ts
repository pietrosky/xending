/**
 * PDF Service — Generates payment order PDFs 100% client-side.
 *
 * Uses HTML templates with embedded CSS, rendered in a popup window
 * for native browser print-to-PDF. No backend/edge function required.
 *
 * Supports: xending, monex, generic templates.
 *
 * @see Requirements 6.1, 6.2
 */

import type { FXTransaction } from '../types/transaction.types';
import type { CompanyFX, PaymentAccount } from '../types/company-fx.types';
import type { CompanyAddress } from '../../onboarding/types/company.types';

// ─── Helpers ─────────────────────────────────────────────────────────

function formatClabe(clabe: string): string {
  const digits = clabe.replace(/\D/g, '').slice(0, 18);
  if (digits.length < 18) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 17)}-${digits.slice(17)}`;
}

function formatAddress(address: CompanyAddress): string {
  return [address.street, address.city, address.state, address.zip, address.country]
    .filter(Boolean)
    .join(', ');
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Types ───────────────────────────────────────────────────────────

interface DealData {
  [key: string]: unknown;
}

// ─── CSS Styles ──────────────────────────────────────────────────────

function getXendingCSS(): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; line-height: 1.4; color: #2c3e50; background: white; }
.container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 12mm; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #00d4aa; }
.logo-section { flex: 1; }
.logo { display: flex; align-items: center; }
.xending-logo { display: flex; align-items: center; gap: 8px; }
.logo-text { font-size: 18px; font-weight: 700; color: #334155; }
.header-text { flex: 2; text-align: center; font-size: 10px; color: #7f8c8d; line-height: 1.6; }
.qr-section { flex: 1; text-align: right; }
.qr-placeholder { width: 60px; height: 60px; border: 2px solid #00d4aa; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #00d4aa; }
.deal-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; margin-bottom: 12px; border-bottom: 1px solid #e9ecef; }
.deal-number { font-weight: 700; font-size: 12px; color: #1e293b; }
.contact-info { font-size: 9px; color: #64748b; }
.contact-info span { margin-left: 15px; }
.confirmation-banner { background: linear-gradient(135deg, #00d4aa 0%, #008b8b 100%); color: white; padding: 10px 20px; font-weight: 700; font-size: 13px; margin-bottom: 18px; border-radius: 6px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
.info-section { display: flex; gap: 30px; margin-bottom: 18px; background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #00d4aa; }
.left-column { flex: 1; }
.right-column { flex: 1; }
.field-row { margin-bottom: 5px; display: flex; }
.label { font-weight: 600; width: 95px; flex-shrink: 0; color: #475569; }
.value { flex: 1; color: #1e293b; }
.address { margin: 5px 0 5px 95px; font-size: 10px; line-height: 1.4; color: #64748b; }
.transaction-banner { background: linear-gradient(135deg, #334155 0%, #1e293b 100%); color: white; padding: 8px 15px; font-weight: 700; font-size: 12px; margin-bottom: 8px; border-radius: 6px; text-align: center; text-transform: uppercase; }
.transaction-table { border: 2px solid #e9ecef; margin-bottom: 18px; border-radius: 8px; overflow: hidden; }
.transaction-header { display: flex; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-bottom: 2px solid #cbd5e1; font-weight: 700; font-size: 10px; color: #475569; }
.transaction-row { display: flex; border-bottom: 1px solid #e9ecef; }
.col-left, .col-center, .col-right { padding: 10px 12px; text-align: center; flex: 1; border-right: 1px solid #e9ecef; }
.col-right { border-right: none; }
.total-row { display: flex; justify-content: flex-end; align-items: center; background: linear-gradient(135deg, #00d4aa 0%, #008b8b 100%); color: white; padding: 10px 15px; font-weight: 700; font-size: 12px; }
.total-label { margin-right: 15px; }
.payment-banner { background: linear-gradient(135deg, #475569 0%, #334155 100%); color: white; padding: 8px 15px; font-weight: 700; font-size: 12px; margin-bottom: 10px; border-radius: 6px; text-align: center; text-transform: uppercase; }
.payment-section { display: flex; gap: 20px; margin-bottom: 20px; }
.payment-block { flex: 1; }
.payment-header { font-weight: 700; font-size: 11px; margin-bottom: 8px; border-bottom: 2px solid #00d4aa; padding-bottom: 5px; color: #1e293b; }
.payment-details { font-size: 10px; line-height: 1.6; color: #475569; }
.bank-details { flex: 1; }
.bank-info .field-row { margin-bottom: 4px; font-size: 10px; }
.bank-info .label { width: 110px; }
.footer { display: flex; justify-content: space-between; border-top: 3px solid #00d4aa; padding-top: 15px; margin-top: 25px; font-size: 8px; color: #94a3b8; }
.office { flex: 1; text-align: center; line-height: 1.5; }
.office strong { font-size: 9px; color: #334155; display: block; margin-bottom: 3px; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;
}

// ─── Logo SVG (inline) ───────────────────────────────────────────────

function getLogoSVG(): string {
  return `<div class="xending-logo">
    <svg width="40" height="40" viewBox="0 0 100 100">
      <defs>
        <radialGradient id="g1" cx="30%" cy="30%">
          <stop offset="0%" style="stop-color:#00ffff;stop-opacity:1" />
          <stop offset="40%" style="stop-color:#00d4aa;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#008b8b;stop-opacity:1" />
        </radialGradient>
        <radialGradient id="g2" cx="70%" cy="70%">
          <stop offset="0%" style="stop-color:#ff6b35;stop-opacity:1" />
          <stop offset="40%" style="stop-color:#ff8c42;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#cc4125;stop-opacity:1" />
        </radialGradient>
      </defs>
      <path d="M 50 10 A 40 40 0 0 1 85.36 35.36 L 71.21 28.79 A 25 25 0 0 0 50 25 Z" fill="url(#g1)" />
      <path d="M 85.36 35.36 A 40 40 0 0 1 85.36 64.64 L 71.21 71.21 A 25 25 0 0 0 71.21 28.79 Z" fill="url(#g1)" />
      <path d="M 85.36 64.64 A 40 40 0 0 1 50 90 L 50 75 A 25 25 0 0 0 71.21 71.21 Z" fill="url(#g2)" />
      <path d="M 50 90 A 40 40 0 0 1 14.64 64.64 L 28.79 71.21 A 25 25 0 0 0 50 75 Z" fill="url(#g2)" />
      <path d="M 14.64 64.64 A 40 40 0 0 1 14.64 35.36 L 28.79 28.79 A 25 25 0 0 0 28.79 71.21 Z" fill="url(#g2)" />
      <path d="M 14.64 35.36 A 40 40 0 0 1 50 10 L 50 25 A 25 25 0 0 0 28.79 28.79 Z" fill="url(#g1)" />
    </svg>
    <span class="logo-text">Xending Global</span>
  </div>`;
}

// ─── Xending HTML Template ───────────────────────────────────────────

function buildXendingHTML(d: DealData): string {
  const today = new Date().toLocaleDateString('en-GB');
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Xending Global - Deal Confirmation</title>
<style>${getXendingCSS()}</style></head><body><div class="container">
<div class="header">
  <div class="logo-section"><div class="logo">${getLogoSVG()}</div></div>
  <div class="header-text">
    <p><strong>Xending Global Payments</strong></p>
    <p>Your trusted partner for international</p>
    <p>foreign exchange transactions</p>
    <p>Please review this confirmation carefully</p>
  </div>
  <div class="qr-section"><div class="qr-placeholder">QR</div></div>
</div>
<div class="deal-header">
  <div class="deal-number">Deal No. ${d.dealNumber || ''}</div>
  <div class="contact-info">
    <span>www.xendingglobal.com</span>
    <span>T: +52 55.1234.5678</span>
    <span>E: deals@xendingglobal.com</span>
  </div>
</div>
<div class="confirmation-banner">XENDING GLOBAL - DEAL CONFIRMATION</div>
<div class="info-section">
  <div class="left-column">
    <div class="field-row"><span class="label">Client:</span><span class="value">${d.clientName || ''}</span></div>
    <div class="address">${d.clientAddress || ''}</div>
    <div class="field-row"><span class="label">Booked By:</span><span class="value">${d.bookedBy || ''}</span></div>
    <div class="field-row"><span class="label">Account #:</span><span class="value">${d.accountNumber || ''}</span></div>
    <div class="field-row"><span class="label">Remarks:</span><span class="value">${d.remarks || 'Processed by Xending Global Platform'}</span></div>
  </div>
  <div class="right-column">
    <div class="field-row"><span class="label">Trade Date:</span><span class="value">${d.tradeDate || today}</span></div>
    <div class="field-row"><span class="label">Deal Type:</span><span class="value">${d.dealType || 'Spot'}</span></div>
    <div class="field-row"><span class="label">Rel Manager:</span><span class="value">${d.relManager || 'Xending Global Team'}</span></div>
    <div class="field-row"><span class="label">FX Dealer:</span><span class="value">${d.fxDealer || 'Xending FX Desk'}</span></div>
    <div class="field-row"><span class="label">Processor:</span><span class="value">${d.processor || 'Xending Global Platform'}</span></div>
  </div>
</div>
<div class="transaction-banner">TRANSACTION DETAILS</div>
<div class="transaction-table">
  <div class="transaction-header">
    <div class="col-left">${d.clientName || 'Client'}<br>Buys</div>
    <div class="col-center">Exchange<br>Rate</div>
    <div class="col-right">${d.clientName || 'Client'}<br>Pays</div>
  </div>
  <div class="transaction-row">
    <div class="col-left">${d.buyCurrency || 'USD'} ${d.buyAmount || '0.00'}</div>
    <div class="col-center">${d.exchangeRate || '0.0000'}</div>
    <div class="col-right">${d.payCurrency || 'MXN'} ${d.payAmount || '0.00'}<br>${d.feeText || ''}</div>
  </div>
  <div class="total-row">
    <div class="total-label">Total Due (${d.payCurrency || 'MXN'}):</div>
    <div class="total-amount">${d.totalDue || '0.00'}</div>
  </div>
</div>
<div class="payment-banner">PAYMENT INSTRUCTIONS</div>
<div class="payment-section">
  <div class="payment-block">
    <div class="payment-header">${d.clientName || 'Client'}</div>
    <div class="payment-details">
      <p>to pay <strong>Xending Global ${d.payCurrency || 'MXN'}</strong></p>
      <p><strong>${d.totalDue || '0.00'}</strong> by Electronic Wire</p>
      <p>transfer on <strong>${d.transferDate || today}</strong> to:</p>
      <br><p>Payment must be received for</p>
      <p>Xending Global to process the currency exchange.</p>
    </div>
  </div>
  <div class="bank-details"><div class="bank-info">
    <div class="field-row"><span class="label">Account Number:</span><span class="value">${d.accountNumber1 || ''}</span></div>
    <div class="field-row"><span class="label">Account Name:</span><span class="value">${d.accountName1 || ''}</span></div>
    <div class="field-row"><span class="label">Account Address:</span><span class="value">${d.accountAddress1 || ''}</span></div>
    <div class="field-row"><span class="label">SWIFT:</span><span class="value">${d.swift1 || ''}</span></div>
    <div class="field-row"><span class="label">Bank Name:</span><span class="value">${d.bankName1 || ''}</span></div>
    <div class="field-row"><span class="label">Bank Address:</span><span class="value">${d.bankAddress1 || ''}</span></div>
    <div class="field-row"><span class="label">By Order Of:</span><span class="value">${d.byOrderOf1 || d.clientName || ''}</span></div>
  </div></div>
</div>
<div class="footer">
  <div class="office"><strong>Mexico City</strong><br>Torre Xending, Av. Reforma 123<br>Ciudad de Mexico, CDMX 01000<br>+52 55.1234.5678 phone</div>
  <div class="office"><strong>Guadalajara</strong><br>Centro Xending, Av. Americas 456<br>Guadalajara, JAL 44100<br>+52 33.8765.4321 phone</div>
  <div class="office"><strong>Monterrey</strong><br>Plaza Xending, Av. Constitucion 789<br>Monterrey, NL 64000<br>+52 81.2468.1357 phone</div>
</div>
</div></body></html>`;
}

// ─── Open HTML in print window ───────────────────────────────────────

function openPrintWindow(html: string): void {
  const printWindow = window.open('', '_blank', 'width=800,height=1100');
  if (!printWindow) {
    throw new Error('No se pudo abrir la ventana de impresión. Verifica que los popups estén habilitados.');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  // Wait for content to render, then trigger print
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 500);
  };
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Generates a professional Xending-styled payment order PDF.
 * Renders HTML template in a popup window with native browser print dialog.
 * 100% client-side, no backend required.
 *
 * @see Requirements 6.1, 6.2
 */
export function generatePaymentOrderPDFFromTemplate(
  transaction: FXTransaction,
  company: CompanyFX,
  paymentAccount: PaymentAccount,
): void {
  const dealData: DealData = {
    dealNumber: transaction.folio,
    clientName: company.legal_name,
    clientAddress: formatAddress(company.address),
    accountNumber: paymentAccount.clabe ? formatClabe(paymentAccount.clabe) : '',
    tradeDate: formatDate(transaction.created_at),
    dealType: 'Spot',
    relManager: 'Xending Capital',
    processor: 'Xending Capital Platform',
    buyCurrency: transaction.buys_currency,
    buyAmount: transaction.buys_usd.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    exchangeRate: transaction.exchange_rate.toFixed(4),
    payCurrency: transaction.pays_currency,
    payAmount: transaction.pays_mxn.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    totalDue: transaction.pays_mxn.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    transferDate: formatDate(transaction.created_at),
    accountNumber1: paymentAccount.clabe ? formatClabe(paymentAccount.clabe) : '',
    accountName1: company.legal_name,
    bankName1: paymentAccount.bank_name || '',
    byOrderOf1: company.legal_name,
  };

  const html = buildXendingHTML(dealData);
  openPrintWindow(html);
}

/**
 * Legacy alias — kept for backward compatibility.
 * Now delegates to the template-based generator.
 */
export const generatePaymentOrderPDF = generatePaymentOrderPDFFromTemplate;
