/**
 * TemplateService — Generates HTML templates for FX payment order PDFs.
 *
 * Adapted for Deno Edge Functions (ESM, no Node.js fs/path).
 * CSS is embedded inline. Logo is generated as inline SVG.
 *
 * Supported partners: monex, xending, generic
 */

import { getMonexCSS, getXendingCSS, getGenericCSS } from './styles.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogoData {
  src?: string;
  text?: string;
  width?: string;
  height?: string;
}

// deno-lint-ignore no-explicit-any
type DealData = Record<string, any>;

// ---------------------------------------------------------------------------
// TemplateService
// ---------------------------------------------------------------------------

export class TemplateService {
  static getAvailablePartners(): string[] {
    return ['monex', 'xending', 'generic'];
  }

  static isValidPartner(partner: string): boolean {
    return this.getAvailablePartners().includes(partner.toLowerCase());
  }

  static generateHTML(partner: string, dealData: DealData): string {
    const p = partner.toLowerCase();
    switch (p) {
      case 'monex':
        return this.generateMonexHTML(dealData);
      case 'xending':
        return this.generateXendingHTML(dealData);
      case 'generic':
        return this.generateGenericHTML(dealData);
      default:
        throw new Error(`Template not found for partner: ${partner}`);
    }
  }

  static getPDFOptions(partner: string): Record<string, unknown> {
    const baseOptions = {
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    };
    switch (partner.toLowerCase()) {
      case 'monex':
        return { ...baseOptions, margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' } };
      case 'xending':
        return { ...baseOptions, margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' } };
      default:
        return baseOptions;
    }
  }

  // ── Logo helper ─────────────────────────────────────────────────

  static generateLogoHTML(logoData?: LogoData | string | null): string {
    if (!logoData) {
      return `<div class="xending-logo">
        <svg width="40" height="40" viewBox="0 0 100 100" class="logo-svg">
          <defs>
            <radialGradient id="gradient1" cx="30%" cy="30%">
              <stop offset="0%" style="stop-color:#00ffff;stop-opacity:1" />
              <stop offset="40%" style="stop-color:#00d4aa;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#008b8b;stop-opacity:1" />
            </radialGradient>
            <radialGradient id="gradient2" cx="70%" cy="70%">
              <stop offset="0%" style="stop-color:#ff6b35;stop-opacity:1" />
              <stop offset="40%" style="stop-color:#ff8c42;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#cc4125;stop-opacity:1" />
            </radialGradient>
          </defs>
          <path d="M 50 10 A 40 40 0 0 1 85.36 35.36 L 71.21 28.79 A 25 25 0 0 0 50 25 Z" fill="url(#gradient1)" />
          <path d="M 85.36 35.36 A 40 40 0 0 1 85.36 64.64 L 71.21 71.21 A 25 25 0 0 0 71.21 28.79 Z" fill="url(#gradient1)" />
          <path d="M 85.36 64.64 A 40 40 0 0 1 50 90 L 50 75 A 25 25 0 0 0 71.21 71.21 Z" fill="url(#gradient2)" />
          <path d="M 50 90 A 40 40 0 0 1 14.64 64.64 L 28.79 71.21 A 25 25 0 0 0 50 75 Z" fill="url(#gradient2)" />
          <path d="M 14.64 64.64 A 40 40 0 0 1 14.64 35.36 L 28.79 28.79 A 25 25 0 0 0 28.79 71.21 Z" fill="url(#gradient2)" />
          <path d="M 14.64 35.36 A 40 40 0 0 1 50 10 L 50 25 A 25 25 0 0 0 28.79 28.79 Z" fill="url(#gradient1)" />
        </svg>
        <span class="logo-text">Xending Capital</span>
      </div>`;
    }

    if (typeof logoData === 'string' && logoData.startsWith('data:image/')) {
      return `<div class="custom-logo"><img src="${logoData}" alt="Logo" class="logo-image" /></div>`;
    }

    if (typeof logoData === 'object' && logoData !== null) {
      const { src, text, width = '40px', height = '40px' } = logoData;
      if (src) {
        return `<div class="custom-logo">
          <img src="${src}" alt="Logo" class="logo-image" style="width: ${width}; height: ${height};" />
          ${text ? `<span class="logo-text">${text}</span>` : ''}
        </div>`;
      }
    }

    return this.generateLogoHTML(null);
  }

  // ── Monex Template ──────────────────────────────────────────────

  static generateMonexHTML(d: DealData): string {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Monex Deal Confirmation</title>
<style>${getMonexCSS()}</style></head><body><div class="container">
<!-- Header with logo and QR -->
<div class="header">
  <div class="logo-section"><div class="logo">${this.generateLogoHTML(d.logo)}</div></div>
  <div class="header-text">
    <p>Please review this document.</p>
    <p>Deal is a binding agreement. If it</p>
    <p>does not agree with your</p>
    <p>instructions, please call us</p>
    <p>immediately</p>
  </div>
  <div class="qr-section"><div class="qr-code"><div class="qr-placeholder">QR</div></div></div>
</div>
<!-- Deal header info -->
<div class="deal-header">
  <div class="deal-number">Deal No. ${d.dealNumber || 'TMP-USA-DEAL-0424313'}</div>
  <div class="contact-info">
    <span>www.monexusa.com</span>
    <span>T: +1 800.834.2497</span>
    <span>F: +1 202.785.2554</span>
  </div>
</div>
<!-- Deal confirmation banner -->
<div class="confirmation-banner">DEAL CONFIRMATION</div>
<!-- Client and deal info -->
<div class="info-section">
  <div class="left-column">
    <div class="field-row"><span class="label">Client:</span><span class="value">${d.clientName || 'EDGAR EL PANA DEL RITMO SA DE CV'}</span></div>
    <div class="address">${d.clientAddress || 'EL ZAR 3344<br>SAN NICOLAS DE LOS<br>GARZA,NUEVO LEON,Mexico'}</div>
    <div class="field-row"><span class="label">Booked By:</span><span class="value">${d.bookedBy || 'XendingGlobalAPI_fvo_LVgbNNxB0O5'}</span></div>
    <div class="field-row"><span class="label">Acct. #:</span><span class="value">${d.accountNumber || '0016474'}</span></div>
    <div class="field-row"><span class="label">Remarks:</span><span class="value">${d.remarks || ''}</span></div>
  </div>
  <div class="right-column">
    <div class="field-row"><span class="label">Trade Date:</span><span class="value">${d.tradeDate || '28-Sep-2025'}</span></div>
    <div class="field-row"><span class="label">Deal Type:</span><span class="value">${d.dealType || 'Spot'}</span></div>
    <div class="field-row"><span class="label">Rel Manager:</span><span class="value">${d.relManager || 'Xending Capital'}</span></div>
    <div class="field-row"><span class="label">FX Dealer:</span><span class="value">${d.fxDealer || 'Adam Kane'}</span></div>
    <div class="field-row"><span class="label">Processor:</span><span class="value">${d.processor || 'Xending Capital'}</span></div>
  </div>
</div>
<!-- Transaction details -->
<div class="transaction-banner">DEAL TRANSACTION DETAILS</div>
<div class="transaction-table">
  <div class="transaction-header">
    <div class="col-left">${d.clientName || 'EDGAR EL PANA DEL RITMO SA DE CV'}<br>Buys</div>
    <div class="col-center">Exchange<br>Rate</div>
    <div class="col-right">${d.clientName || 'EDGAR EL PANA DEL RITMO SA DE CV'}<br>Pays</div>
  </div>
  <div class="transaction-row">
    <div class="col-left">${d.buyCurrency || 'USD'} ${d.buyAmount || '4,999.00'}</div>
    <div class="col-center">${d.exchangeRate || '1.1587'}</div>
    <div class="col-right">${d.payCurrency || 'EUR'} ${d.payAmount || '4,314.32'}<br>${d.feeText || 'USD 20.00 (Fees)'}</div>
  </div>
  <div class="total-row">
    <div class="total-label">Total Due (${d.payCurrency || 'EUR'}):</div>
    <div class="total-amount">${d.totalDue || '4,314.32'}</div>
  </div>
</div>
<!-- Payment instructions -->
<div class="payment-banner">PAYMENT INSTRUCTIONS</div>
<div class="payment-section">
  <div class="payment-block">
    <div class="payment-header">${d.clientName || 'EDGAR EL PANA DEL RITMO SA DE CV'}</div>
    <div class="payment-details">
      <p>to pay <strong>Monex USA EUR</strong></p>
      <p><strong>${d.payAmount || '4,314.32'}</strong> by Electronic Wire</p>
      <p>transfer on <strong>${d.transferDate || '28-Sep-2025'}</strong> to:</p>
      <br>
      <p>Payment must be received for</p>
      <p>Monex USA to send the currency.</p>
    </div>
  </div>
  <div class="bank-details"><div class="bank-info">
    <div class="field-row"><span class="label">Account Number:</span><span class="value">${d.accountNumber1 || 'DE37 5031 0400 0437 7961 00'}</span></div>
    <div class="field-row"><span class="label">Account Name:</span><span class="value">${d.accountName1 || 'Monex USA'}</span></div>
    <div class="field-row"><span class="label">Account Address:</span><span class="value">${d.accountAddress1 || '1201 New York Avenue, NW, Suite 300 Washington, DC 20005 USA'}</span></div>
    <div class="field-row"><span class="label">SWIFT:</span><span class="value">${d.swift1 || 'BARCDEFF'}</span></div>
    <div class="field-row"><span class="label">Bank Name:</span><span class="value">${d.bankName1 || 'Barclays Bank PLC'}</span></div>
    <div class="field-row"><span class="label">Bank Address:</span><span class="value">${d.bankAddress1 || 'Frankfurt, Germany'}</span></div>
    <div class="field-row"><span class="label">By Order Of:</span><span class="value">${d.byOrderOf1 || d.clientName || 'EDGAR EL PANA DEL RITMO SA DE CV'}</span></div>
  </div></div>
</div>
<!-- Footer with office locations -->
<div class="footer">
  <div class="office"><strong>Washington, DC</strong><br>1101 K St NW, Suite 600<br>Washington, DC 20005<br>+1 800.834.2497 phone</div>
  <div class="office"><strong>Los Angeles</strong><br>8383 Wilshire Blvd, Suite 1032<br>Beverly Hills, CA 90211<br>+1 855.606.8346 phone</div>
  <div class="office"><strong>New York</strong><br>385 5th Ave, Suite 1500<br>New York, NY 10016<br>+1 855.776.2022 phone</div>
</div>
</div></body></html>`;
  }

  // ── Xending Template (full: withoutExchangeRate + beneficiary + disclaimer) ──

  static generateXendingHTML(d: DealData): string {
    const withoutRate = Boolean(d.withoutExchangeRate);

    const transactionBlock = withoutRate
      ? `<!-- Versión SIN tipo de cambio - Mantener formato de tabla -->
        <div class="transaction-table">
          <div class="transaction-header">
            <div class="col-left">${d.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Buys</div>
            <div class="col-center">Exchange<br>Rate</div>
            <div class="col-right">${d.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Pays</div>
          </div>
          <div class="transaction-row">
            <div class="col-left">${d.buyCurrency || 'USD'} ${d.buyAmount || '100,000.00'}</div>
            <div class="col-center">1</div>
            <div class="col-right">${d.buyCurrency || 'USD'} ${d.buyAmount || '100,000.00'}</div>
          </div>
          <div class="total-row">
            <div class="total-label">Total Due (${d.buyCurrency || 'USD'}):</div>
            <div class="total-amount">${d.buyAmount || '100,000.00'}</div>
          </div>
        </div>`
      : `<!-- Versión CON tipo de cambio -->
        <div class="transaction-table">
          <div class="transaction-header">
            <div class="col-left">${d.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Buys</div>
            <div class="col-center">Exchange<br>Rate</div>
            <div class="col-right">${d.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Pays</div>
          </div>
          <div class="transaction-row">
            <div class="col-left">${d.buyCurrency || 'USD'} ${d.buyAmount || '100,000.00'}</div>
            <div class="col-center">${d.exchangeRate || '17.8500'}</div>
            <div class="col-right">${d.payCurrency || 'MXN'} ${d.payAmount || '1,785,000.00'}<br><span class="fee-text">${d.feeText || 'MXN 2,500.00 (Xending Fee)'}</span></div>
          </div>
          <div class="total-row">
            <div class="total-label">Total Due (${d.payCurrency || 'MXN'}):</div>
            <div class="total-amount">${d.totalDue || '1,787,500.00'}</div>
          </div>
        </div>`;

    const paymentDetailsText = withoutRate
      ? `<p>to pay <strong>Xending Capital</strong></p>
         <p>by Electronic Wire transfer</p>
         <p>on <strong>${d.tradeDate || '29/09/2025'}</strong> to:</p>`
      : `<p>to pay <strong>Xending Capital ${d.payCurrency || 'MXN'}</strong></p>
         <p><strong>${d.totalDue || '1,787,500.00'}</strong> by Electronic Wire</p>
         <p>transfer on <strong>${d.tradeDate || '29/09/2025'}</strong> to:</p>`;

    const beneficiarySection = d.beneficiaryAccountNumber
      ? `<div class="payment-banner" style="background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); margin-top: 30px;">BENEFICIARY DETAILS - XENDING PAYS TO</div>
        <div class="payment-section">
          <div class="payment-block">
            <div class="payment-header">Xending Capital</div>
            <div class="payment-details">
              ${withoutRate
                ? `<p>Amount <strong>${d.buyCurrency || 'USD'} ${d.buyAmount || '100,000.00'}</strong></p><p>by Wire transfer to:</p>`
                : `<p>will pay <strong>${d.buyCurrency || 'USD'} ${d.buyAmount || '100,000.00'}</strong></p><p>by Electronic Wire transfer to:</p><br><p><strong>Beneficiary Account</strong></p>`}
            </div>
          </div>
          <div class="bank-details"><div class="bank-info">
            <div class="field-row"><span class="label">CLABE:</span><span class="value">${d.beneficiaryAccountNumber}</span></div>
            <div class="field-row"><span class="label">Account Name:</span><span class="value">${d.beneficiaryAccountName || ''}</span></div>
            <div class="field-row"><span class="label">Account Address:</span><span class="value">${d.beneficiaryAccountAddress || ''}</span></div>
            <div class="field-row"><span class="label">SWIFT:</span><span class="value">${d.beneficiarySwift || ''}</span></div>
            <div class="field-row"><span class="label">Bank Name:</span><span class="value">${d.beneficiaryBankName || ''}</span></div>
            <div class="field-row"><span class="label">Bank Address:</span><span class="value">${d.beneficiaryBankAddress || ''}</span></div>
          </div></div>
        </div>`
      : '';

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Xending Capital - Deal Confirmation</title>
<style>${getXendingCSS()}</style></head><body><div class="container">
<!-- Header with Xending logo -->
<div class="header">
  <div class="logo-section"><div class="logo">${this.generateLogoHTML(d.logo)}</div></div>
  <div class="header-text">
    <p><strong>Xending Capital Payments</strong></p>
    <p>Your trusted partner for international</p>
    <p>foreign exchange transactions</p>
    <p>Please review this confirmation carefully</p>
  </div>
  <div class="qr-section"><div class="qr-code"><div class="qr-placeholder">QR</div></div></div>
</div>
<!-- Deal header info -->
<div class="deal-header">
  <div class="deal-number">Deal No. ${d.dealNumber || 'XG-SPOT-001'}</div>
  <div class="contact-info">
    <span>www.xendingglobal.com</span>
    <span>T: +52 55.1234.5678</span>
    <span>E: deals@xendingglobal.com</span>
  </div>
</div>
<!-- Deal confirmation banner -->
<div class="confirmation-banner">Xending Capital - DEAL CONFIRMATION</div>
<!-- Client and deal info -->
<div class="info-section">
  <div class="left-column">
    <div class="field-row"><span class="label">Client:</span><span class="value">${d.clientName || 'IMPORTADORA MEXICANA SA DE CV'}</span></div>
    <div class="address">${d.clientAddress || 'AV. REFORMA 456<br>COL. JUAREZ, CDMX 06600<br>MEXICO'}</div>
  </div>
  <div class="right-column">
    <div class="field-row"><span class="label">Trade Date:</span><span class="value">${d.tradeDate || '29/09/2025'}</span></div>
    <div class="field-row"><span class="label">Deal Type:</span><span class="value">${d.dealType || 'Spot'}</span></div>
  </div>
</div>
<!-- Transaction details -->
<div class="transaction-banner">TRANSACTION DETAILS</div>
${transactionBlock}
<!-- Payment instructions -->
<div class="payment-banner">PAYMENT INSTRUCTIONS</div>
<div class="payment-section">
  <div class="payment-block">
    <div class="payment-header">${d.clientName || 'IMPORTADORA MEXICANA SA DE CV'}</div>
    <div class="payment-details">
      ${paymentDetailsText}
      <br>
      <p>Payment must be received for</p>
      <p>Xending Capital to process the currency exchange.</p>
    </div>
  </div>
  <div class="bank-details"><div class="bank-info">
    <div class="field-row"><span class="label">Account Number:</span><span class="value">${d.accountNumber1 || 'MX98765432109876543210'}</span></div>
    <div class="field-row"><span class="label">Account Name:</span><span class="value">${d.accountName1 || 'Xending Capital Payments'}</span></div>
    <div class="field-row"><span class="label">Account Address:</span><span class="value">${d.accountAddress1 || 'Torre Xending, Av. Reforma 123, CDMX, Mexico'}</span></div>
    <div class="field-row"><span class="label">SWIFT:</span><span class="value">${d.swift1 || 'XENDMX22'}</span></div>
    <div class="field-row"><span class="label">Bank Name:</span><span class="value">${d.bankName1 || 'Banco Xending Mexico'}</span></div>
    <div class="field-row"><span class="label">Bank Address:</span><span class="value">${d.bankAddress1 || 'Ciudad de Mexico, Mexico'}</span></div>
    <div class="field-row"><span class="label">By Order Of:</span><span class="value">${d.byOrderOf1 || d.clientName || 'IMPORTADORA MEXICANA SA DE CV'}</span></div>
  </div></div>
</div>
<!-- Beneficiary Section - Xending Paga A -->
${beneficiarySection}
<!-- Disclaimer Footer -->
<div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-top: 2px solid #e9ecef; border-radius: 8px;">
  <p style="text-align: center; font-size: 11px; color: #6c757d; margin: 0; line-height: 1.6;">
    <strong style="color: #2c3e50;">Important Notice:</strong><br>
    Xending is a technology services provider, not a bank.<br>
    Xending is powered by Conduit.
  </p>
</div>
</div></body></html>`;
  }

  // ── Generic Template ────────────────────────────────────────────

  static generateGenericHTML(d: DealData): string {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Deal Confirmation</title>
<style>${getGenericCSS()}</style></head><body><div class="container">
<div class="header"><h1>Deal Confirmation</h1></div>
<div class="deal-details">
  <p><strong>Deal ID:</strong> ${d.dealId || 'N/A'}</p>
  <p><strong>Amount:</strong> ${d.amount || 'N/A'}</p>
  <p><strong>Currency:</strong> ${d.currency || 'N/A'}</p>
  <p><strong>Rate:</strong> ${d.rate || 'N/A'}</p>
  <p><strong>Date:</strong> ${d.date || new Date().toLocaleDateString()}</p>
</div>
</div></body></html>`;
  }
}
