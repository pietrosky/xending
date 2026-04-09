/**
 * TemplateService — Generates HTML templates for FX payment order PDFs.
 *
 * Adapted for Deno Edge Functions (ESM, no Node.js fs/path).
 * CSS is embedded inline. Logo is generated as inline SVG.
 *
 * Supported partners: monex, xending, generic, promoter-report, xending-consolidated
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
    return ['monex', 'xending', 'generic', 'promoter-report', 'xending-consolidated'];
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
      case 'promoter-report':
        return this.generatePromoterReportHTML(dealData);
      case 'xending-consolidated':
        return this.generateXendingConsolidatedHTML(dealData);
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
        <span class="logo-text">Xending Global</span>
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
<div class="deal-header">
  <div class="deal-number">Deal No. ${d.dealNumber || 'TMP-USA-DEAL-0424313'}</div>
  <div class="contact-info">
    <span>www.monexusa.com</span>
    <span>T: +1 800.834.2497</span>
    <span>F: +1 202.785.2554</span>
  </div>
</div>
<div class="confirmation-banner">DEAL CONFIRMATION</div>
<div class="info-section">
  <div class="left-column">
    <div class="field-row"><span class="label">Client:</span><span class="value">${d.clientName || ''}</span></div>
    <div class="address">${d.clientAddress || ''}</div>
    <div class="field-row"><span class="label">Booked By:</span><span class="value">${d.bookedBy || ''}</span></div>
    <div class="field-row"><span class="label">Acct. #:</span><span class="value">${d.accountNumber || ''}</span></div>
    <div class="field-row"><span class="label">Remarks:</span><span class="value">${d.remarks || ''}</span></div>
  </div>
  <div class="right-column">
    <div class="field-row"><span class="label">Trade Date:</span><span class="value">${d.tradeDate || ''}</span></div>
    <div class="field-row"><span class="label">Deal Type:</span><span class="value">${d.dealType || 'Spot'}</span></div>
    <div class="field-row"><span class="label">Rel Manager:</span><span class="value">${d.relManager || ''}</span></div>
    <div class="field-row"><span class="label">FX Dealer:</span><span class="value">${d.fxDealer || ''}</span></div>
    <div class="field-row"><span class="label">Processor:</span><span class="value">${d.processor || ''}</span></div>
  </div>
</div>
<div class="transaction-banner">DEAL TRANSACTION DETAILS</div>
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
      <p>to pay <strong>Monex USA ${d.payCurrency || 'MXN'}</strong></p>
      <p><strong>${d.payAmount || '0.00'}</strong> by Electronic Wire</p>
      <p>transfer on <strong>${d.transferDate || ''}</strong> to:</p>
      <br><p>Payment must be received for</p>
      <p>Monex USA to send the currency.</p>
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
  <div class="office"><strong>Washington, DC</strong><br>1101 K St NW, Suite 600<br>Washington, DC 20005<br>+1 800.834.2497 phone</div>
  <div class="office"><strong>Los Angeles</strong><br>8383 Wilshire Blvd, Suite 1032<br>Beverly Hills, CA 90211<br>+1 855.606.8346 phone</div>
  <div class="office"><strong>New York</strong><br>385 5th Ave, Suite 1500<br>New York, NY 10016<br>+1 855.776.2022 phone</div>
</div>
</div></body></html>`;
  }

  // ── Xending Template ────────────────────────────────────────────

  static generateXendingHTML(d: DealData): string {
    const today = new Date().toLocaleDateString('en-GB');
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Xending Global - Deal Confirmation</title>
<style>${getXendingCSS()}</style></head><body><div class="container">
<div class="header">
  <div class="logo-section"><div class="logo">${this.generateLogoHTML(d.logo)}</div></div>
  <div class="header-text">
    <p><strong>Xending Global Payments</strong></p>
    <p>Your trusted partner for international</p>
    <p>foreign exchange transactions</p>
    <p>Please review this confirmation carefully</p>
  </div>
  <div class="qr-section"><div class="qr-code"><div class="qr-placeholder">QR</div></div></div>
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

  // ── Promoter Report Template ────────────────────────────────────

  static generatePromoterReportHTML(data: DealData): string {
    const companies: Array<{ name: string; operations: number; revenue: number; commission: number }> = data.companies || [];
    const brokerCompanies: Array<{ name: string; commission: number }> = data.brokerCompanies || [];

    const totalOps = companies.reduce((sum, c) => sum + (c.operations || 0), 0);
    const calculatedTotalCommission = companies.reduce((sum, c) => sum + (c.commission || 0), 0);

    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const companyRows = companies.map(c => `
      <div class="transaction-row">
        <div class="col-left" style="text-align: left; flex: 2; padding-left: 15px;">${c.name}</div>
        <div class="col-center" style="flex: 1; color: #2c3e50;">${c.operations || 0}</div>
        <div class="col-center" style="flex: 1; color: #2c3e50;">$${fmt(c.revenue || 0)}</div>
        <div class="col-right" style="flex: 1; color: #00d4aa; padding-right: 15px;">$${fmt(c.commission || 0)}</div>
      </div>`).join('');

    const brokerRows = brokerCompanies.map(c => `
      <div class="transaction-row">
        <div class="col-left" style="text-align: left; flex: 3; padding-left: 15px;">${c.name}</div>
        <div class="col-right" style="flex: 1; color: #e67e22; padding-right: 15px;">+$${fmt(c.commission || 0)}</div>
      </div>`).join('');

    const brokerSection = brokerCompanies.length > 0 ? `
      <div class="payment-banner">Ganancias por Brokeraje (Adicional)</div>
      <div class="transaction-table" style="border-color: #e67e22;">
        <div class="transaction-header" style="background: linear-gradient(135deg, #fce4ce 0%, #fbeddb 100%); border-bottom-color: #e67e22;">
          <div class="col-left" style="flex: 3; text-align: left; color: #d35400; padding-left: 15px;">Empresa / Origen</div>
          <div class="col-right" style="flex: 1; color: #d35400; padding-right: 15px;">Comisión Broker</div>
        </div>
        ${brokerRows}
        <div class="total-row" style="background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);">
          <span style="margin-right: 20px;">TOTAL BROKERAJE:</span>
          <span style="padding-right: 15px;">+$${fmt(data.brokerCommission || 0)}</span>
        </div>
      </div>` : '';

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Reporte de Comisiones - ${data.promoterName || 'Promotor'}</title>
<style>${getPromoterReportCSS()}</style></head><body><div class="container">
<div class="header">
  <div class="logo-section">${this.generateLogoHTML(data.logo)}</div>
  <div class="header-text">Xending Global Payments<br>Your trusted partner for international<br>foreign exchange transactions</div>
</div>
<div class="confirmation-banner">REPORTE DE COMISIONES</div>
<div class="info-section">
  <div class="column">
    <div class="field-row"><span class="label">Promotor:</span><span class="value" style="font-size: 13px;">${data.promoterName || 'Promotor'}</span></div>
    <div class="field-row"><span class="label">Periodo:</span><span class="value">${data.period || 'Mes Actual'}</span></div>
    <div class="field-row"><span class="label">ID Reporte:</span><span class="value">${Date.now().toString().slice(-8)}</span></div>
  </div>
  <div class="column">
    <div class="field-row"><span class="label">Rate Comisión:</span><span class="value">${((data.commissionRate || 0) * 100).toFixed(0)}%</span></div>
    <div class="field-row"><span class="label">Total Operaciones:</span><span class="value">${totalOps}</span></div>
    <div class="field-row"><span class="label">Fecha:</span><span class="value">${new Date().toLocaleDateString('es-MX')}</span></div>
  </div>
</div>
<div class="transaction-banner">Desglose de Comisiones Directas</div>
<div class="transaction-table">
  <div class="transaction-header">
    <div class="col-left" style="flex: 2; text-align: left; padding-left: 15px;">Empresa / Cliente</div>
    <div class="col-center" style="flex: 1;">Operaciones</div>
    <div class="col-center" style="flex: 1;">Revenue Base</div>
    <div class="col-right" style="flex: 1; padding-right: 15px;">Tu Comisión</div>
  </div>
  ${companyRows}
  <div class="total-row">
    <span style="margin-right: 20px;">TOTAL COMISIONES DIRECTAS:</span>
    <span style="padding-right: 15px;">$${fmt(calculatedTotalCommission)}</span>
  </div>
</div>
${brokerSection}
<div class="info-section" style="background: #e0f2f1; border-color: #00897b; align-items: center; justify-content: space-between;">
  <div style="font-size: 14px; font-weight: 700; color: #00695c;">TOTAL A PAGAR (NETO):</div>
  <div style="font-size: 24px; font-weight: 800; color: #004d40;">$${fmt(data.totalCommission || 0)}</div>
</div>
<div class="footer">
  <div class="office"><strong>Mexico City</strong><br>Torre Xending, Av. Reforma 123<br>Ciudad de Mexico, CDMX 01000<br>+52 55.1234.5678 phone</div>
  <div class="office"><strong>Guadalajara</strong><br>Centro Xending, Av. Americas 456<br>Guadalajara, JAL 44100<br>+52 33.8765.4321 phone</div>
  <div class="office"><strong>Monterrey</strong><br>Plaza Xending, Av. Constitucion 789<br>Monterrey, NL 64000<br>+52 81.2468.1357 phone</div>
</div>
<div class="confidential-mark">Xending Global Payments &bull; Confidential Document</div>
</div></body></html>`;
  }

  // ── Xending Consolidated Report Template ────────────────────────

  static generateXendingConsolidatedHTML(data: DealData): string {
    const promoters: Array<{ name: string; totalRevenue: number; totalCommission: number; brokerCommission: number; xendingProfit: number; netCommission: number }> = data.promoters || [];
    const totalRevenue = promoters.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
    const totalPromoterComm = promoters.reduce((sum, p) => sum + (p.totalCommission || 0), 0);
    const totalBrokerComm = promoters.reduce((sum, p) => sum + (p.brokerCommission || 0), 0);
    const totalXendingProfit = promoters.reduce((sum, p) => sum + (p.xendingProfit || 0), 0);
    const totalPayout = promoters.reduce((sum, p) => sum + (p.netCommission || 0), 0);

    const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const promoterRows = promoters.map(p => `
      <div class="transaction-row">
        <div class="col-left" style="text-align: left; flex: 3; padding-left: 15px; font-weight: 600;">${p.name}</div>
        <div class="col-center" style="flex: 2; color: #64748b;">$${fmt(p.totalRevenue || 0)}</div>
        <div class="col-center" style="flex: 2; color: #e67e22;">$${fmt(p.xendingProfit || 0)}</div>
        <div class="col-right" style="flex: 2; color: #00d4aa; padding-right: 15px; font-weight: 700;">$${fmt(p.netCommission || 0)}</div>
      </div>`).join('');

    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Reporte Consolidado - Xending Global</title>
<style>${getConsolidatedCSS()}</style></head><body><div class="container">
<div class="header">
  <div class="logo-section">${this.generateLogoHTML(data.logo)}</div>
  <div class="header-text">Xending Global Payments<br>Internal Management Report</div>
</div>
<div class="confirmation-banner">
  <span>Reporte Mensual Consolidado</span>
  <span>${data.period || 'Periodo Actual'}</span>
</div>
<div class="summary-grid">
  <div class="summary-box"><div class="box-label">Total Revenue</div><div class="box-value">$${fmt(totalRevenue)}</div></div>
  <div class="summary-box"><div class="box-label">Total Comisiones</div><div class="box-value" style="color: #ef4444;">-$${fmt(totalPromoterComm + totalBrokerComm)}</div></div>
  <div class="summary-box highlight"><div class="box-label">Xending Profit (Gross)</div><div class="box-value">$${fmt(totalXendingProfit)}</div></div>
  <div class="summary-box" style="background: #f0f9ff; border-color: #0ea5e9;"><div class="box-label">Net Payout (Total)</div><div class="box-value" style="color: #0284c7;">$${fmt(totalPayout)}</div></div>
</div>
<div style="margin-bottom: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-left: 4px solid #00d4aa; padding-left: 10px;">Resumen por Promotor</div>
<div class="transaction-table">
  <div class="transaction-header">
    <div class="col-left" style="flex: 3; text-align: left; padding-left: 15px;">Promotor (Owner)</div>
    <div class="col-center" style="flex: 2;">Total Revenue</div>
    <div class="col-center" style="flex: 2;">Xending Profit</div>
    <div class="col-right" style="flex: 2; padding-right: 15px;">Total a Pagar</div>
  </div>
  ${promoterRows}
  <div class="total-row">
    <span style="margin-right: 20px;">TOTAL A DISPERSAR:</span>
    <span style="padding-right: 15px;">$${fmt(totalPayout)}</span>
  </div>
</div>
<div class="footer">
  <div class="office"><strong>Mexico City</strong><br>Torre Xending, Av. Reforma 123</div>
  <div class="office"><strong>Guadalajara</strong><br>Centro Xending, Av. Americas 456</div>
  <div class="office"><strong>Monterrey</strong><br>Plaza Xending, Av. Constitucion 789</div>
</div>
<div class="confidential-mark">Xending Global Payments &bull; CONFIDENTIAL &bull; INTERNAL USE ONLY</div>
</div></body></html>`;
  }
}

// ── Inline CSS for promoter report (shared styles) ────────────────

function getPromoterReportCSS(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; line-height: 1.4; color: #2c3e50; background: white; }
.container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 12mm; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #00d4aa; }
.logo-section { flex: 1; display: flex; align-items: center; gap: 12px; }
.custom-logo { display: flex; align-items: center; gap: 10px; }
.logo-image { max-height: 55px; width: auto; }
.logo-text { font-size: 22px; font-weight: 700; color: #334155; margin-left: 8px; }
.header-text { text-align: right; font-size: 10px; color: #7f8c8d; font-style: italic; }
.confirmation-banner { background: linear-gradient(135deg, #00d4aa 0%, #008b8b 100%); color: white; padding: 12px 20px; font-weight: 700; font-size: 16px; margin-bottom: 20px; border-radius: 6px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
.info-section { display: flex; gap: 40px; margin-bottom: 25px; background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #00d4aa; }
.column { flex: 1; }
.field-row { margin-bottom: 10px; display: flex; }
.label { font-weight: 600; width: 120px; flex-shrink: 0; color: #34495e; }
.value { flex: 1; color: #2c3e50; font-weight: 500; }
.transaction-banner { background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); color: white; padding: 10px 20px; font-weight: 700; font-size: 14px; margin-bottom: 10px; border-radius: 6px; text-align: center; text-transform: uppercase; }
.transaction-table { border: 2px solid #e9ecef; margin-bottom: 25px; border-radius: 8px; overflow: hidden; }
.transaction-header { display: flex; background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%); border-bottom: 2px solid #bdc3c7; font-weight: 700; color: #2c3e50; font-size: 11px; text-transform: uppercase; }
.transaction-row { display: flex; background: white; border-bottom: 1px solid #e9ecef; }
.transaction-row:last-child { border-bottom: none; }
.col-left, .col-center, .col-right { padding: 12px 15px; text-align: center; border-right: 1px solid #e9ecef; }
.col-right { border-right: none; }
.total-row { display: flex; justify-content: flex-end; align-items: center; background: linear-gradient(135deg, #00d4aa 0%, #008b8b 100%); color: white; padding: 12px 20px; font-weight: 700; font-size: 14px; }
.payment-banner { background: linear-gradient(135deg, #e67e22 0%, #d35400 100%); color: white; padding: 10px 20px; font-weight: 700; font-size: 14px; margin-bottom: 15px; border-radius: 6px; text-align: center; text-transform: uppercase; }
.footer { display: flex; justify-content: space-between; border-top: 3px solid #00d4aa; padding-top: 20px; margin-top: 35px; font-size: 9px; background: linear-gradient(135deg, #f8f9fa 0%, #ecf0f1 100%); padding: 20px; border-radius: 8px; color: #7f8c8d; }
.office { flex: 1; text-align: center; }
.office strong { font-size: 10px; color: #2c3e50; display: block; margin-bottom: 5px; }
.confidential-mark { text-align: center; margin-top: 20px; font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 2px; }
`;
}

function getConsolidatedCSS(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap');
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; line-height: 1.4; color: #2c3e50; background: white; }
.container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 12mm; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #00d4aa; }
.logo-section { flex: 1; display: flex; align-items: center; gap: 12px; }
.custom-logo { display: flex; align-items: center; gap: 10px; }
.logo-image { max-height: 55px; width: auto; }
.logo-text { font-size: 22px; font-weight: 700; color: #334155; margin-left: 8px; }
.header-text { text-align: right; font-size: 10px; color: #7f8c8d; font-style: italic; }
.confirmation-banner { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: white; padding: 12px 20px; font-weight: 700; font-size: 16px; margin-bottom: 20px; border-radius: 6px; text-align: center; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
.summary-box { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
.summary-box.highlight { background: #f0fdf4; border-color: #00d4aa; }
.box-label { font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 5px; font-weight: 700; }
.box-value { font-size: 16px; font-weight: 700; color: #1e293b; font-family: Consolas, monospace; }
.transaction-table { border: 2px solid #e9ecef; margin-bottom: 25px; border-radius: 8px; overflow: hidden; }
.transaction-header { display: flex; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-bottom: 2px solid #cbd5e1; font-weight: 700; color: #475569; font-size: 11px; text-transform: uppercase; padding: 10px 0; }
.transaction-row { display: flex; background: white; border-bottom: 1px solid #e9ecef; padding: 12px 0; align-items: center; }
.transaction-row:last-child { border-bottom: none; }
.col-left, .col-center, .col-right { text-align: center; }
.total-row { display: flex; justify-content: flex-end; align-items: center; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 15px 20px; font-weight: 700; font-size: 14px; }
.info-section { display: flex; gap: 40px; margin-bottom: 25px; background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #00d4aa; }
.footer { display: flex; justify-content: space-between; border-top: 3px solid #00d4aa; padding-top: 20px; margin-top: 35px; font-size: 9px; color: #7f8c8d; }
.office { flex: 1; text-align: center; }
.office strong { font-size: 10px; color: #2c3e50; display: block; margin-bottom: 5px; }
.confidential-mark { text-align: center; margin-top: 20px; font-size: 9px; color: #cbd5e1; text-transform: uppercase; letter-spacing: 2px; }
`;
}
