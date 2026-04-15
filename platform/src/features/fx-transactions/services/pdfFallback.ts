/**
 * PDF Fallback — Client-side HTML print window.
 *
 * Lazy-loaded only when the fx-pdf-generator server is unreachable.
 * Keeps the main bundle free of the HTML template code.
 */

import logoUrl from '../../../assets/logoxending.png';

// ─── CSS (Xending) ──────────────────────────────────────────────────

function getXendingCSS(): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; line-height: 1.4; color: #2c3e50; background: white; }
.container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 12mm; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #00d4aa; }
.logo-section { flex: 1; }
.logo { display: flex; align-items: center; }
.custom-logo { display: flex; align-items: center; gap: 10px; }
.logo-image { max-height: 50px; width: auto; }
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
.fee-text { font-size: 9px; color: #64748b; }
.total-row { display: flex; justify-content: flex-end; align-items: center; background: linear-gradient(135deg, #00d4aa 0%, #008b8b 100%); color: white; padding: 10px 15px; font-weight: 700; font-size: 12px; }
.total-label { margin-right: 15px; }
.payment-banner { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 8px 15px; font-weight: 700; font-size: 12px; margin-bottom: 10px; border-radius: 6px; text-align: center; text-transform: uppercase; }
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

// ─── Build HTML ──────────────────────────────────────────────────────

function buildXendingHTML(d: Record<string, unknown>): string {
  const withoutRate = Boolean(d.withoutExchangeRate);

  const transactionBlock = withoutRate
    ? `<div class="transaction-table">
        <div class="transaction-header">
          <div class="col-left">${d.clientName || 'Client'}<br>Buys</div>
          <div class="col-center">Exchange<br>Rate</div>
          <div class="col-right">${d.clientName || 'Client'}<br>Pays</div>
        </div>
        <div class="transaction-row">
          <div class="col-left">${d.buyCurrency || 'USD'} ${d.buyAmount || '0.00'}</div>
          <div class="col-center">1</div>
          <div class="col-right">${d.buyCurrency || 'USD'} ${d.buyAmount || '0.00'}</div>
        </div>
        <div class="total-row">
          <div class="total-label">Total Due (${d.buyCurrency || 'USD'}):</div>
          <div class="total-amount">${d.buyAmount || '0.00'}</div>
        </div>
      </div>`
    : `<div class="transaction-table">
        <div class="transaction-header">
          <div class="col-left">${d.clientName || 'Client'}<br>Buys</div>
          <div class="col-center">Exchange<br>Rate</div>
          <div class="col-right">${d.clientName || 'Client'}<br>Pays</div>
        </div>
        <div class="transaction-row">
          <div class="col-left">${d.buyCurrency || 'USD'} ${d.buyAmount || '0.00'}</div>
          <div class="col-center" style="color: #dc2626; font-weight: 700;">${d.exchangeRate || '0.0000'}</div>
          <div class="col-right">${d.payCurrency || 'MXN'} ${d.payAmount || '0.00'}<br><span class="fee-text">${d.feeText || ''}</span></div>
        </div>
        <div class="total-row">
          <div class="total-label">Total Due (${d.payCurrency || 'MXN'}):</div>
          <div class="total-amount">${d.totalDue || '0.00'}</div>
        </div>
      </div>`;

  const paymentDetailsText = withoutRate
    ? `<p>to pay <strong>Xending Capital</strong></p>
       <p>by Electronic Wire transfer</p>
       <p>on <strong>${d.tradeDate || ''}</strong> to:</p>`
    : `<p>to pay <strong>Xending Capital ${d.payCurrency || 'MXN'}</strong></p>
       <p><strong>${d.totalDue || '0.00'}</strong> by Electronic Wire</p>
       <p>transfer on <strong>${d.tradeDate || ''}</strong> to:</p>`;

  const beneficiarySection = d.beneficiaryAccountNumber
    ? `<div class="payment-banner" style="background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); margin-top: 30px;">BENEFICIARY DETAILS - XENDING PAYS TO</div>
      <div class="payment-section">
        <div class="payment-block">
          <div class="payment-header">Xending Capital</div>
          <div class="payment-details">
            ${withoutRate
              ? `<p>Amount <strong>${d.buyCurrency || 'USD'} ${d.buyAmount || '0.00'}</strong></p>
                 <p>by Wire transfer to:</p>`
              : `<p>will pay <strong>${d.buyCurrency || 'USD'} ${d.buyAmount || '0.00'}</strong></p>
                 <p>by Electronic Wire transfer to:</p>
                 <br><p><strong>Beneficiary Account</strong></p>`}
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
<div class="header">
  <div class="logo-section"><div class="logo"><div class="custom-logo"><img src="${logoUrl}" alt="Xending Logo" class="logo-image" /></div></div></div>
  <div class="header-text">
    <p><strong>Xending Capital Payments</strong></p>
    <p>Your trusted partner for international</p>
    <p>foreign exchange transactions</p>
    <p>Please review this confirmation carefully</p>
  </div>
  <div class="qr-section"><div class="qr-placeholder">QR</div></div>
</div>
<div class="deal-header">
  <div class="deal-number">Deal No. ${d.dealNumber || 'XG-SPOT-001'}</div>
  <div class="contact-info">
    <span>www.xendingglobal.com</span>
    <span>T: +52 55.1234.5678</span>
    <span>E: deals@xendingglobal.com</span>
  </div>
</div>
<div class="confirmation-banner">Xending Capital - DEAL CONFIRMATION</div>
<div class="info-section">
  <div class="left-column">
    <div class="field-row"><span class="label">Client:</span><span class="value">${d.clientName || ''}</span></div>
    <div class="address">${d.clientAddress || ''}</div>
  </div>
  <div class="right-column">
    <div class="field-row"><span class="label">Trade Date:</span><span class="value">${d.tradeDate || ''}</span></div>
    <div class="field-row"><span class="label">Deal Type:</span><span class="value">${d.dealType || 'Spot'}</span></div>
  </div>
</div>
<div class="transaction-banner">TRANSACTION DETAILS</div>
${transactionBlock}
<div class="payment-banner">PAYMENT INSTRUCTIONS</div>
<div class="payment-section">
  <div class="payment-block">
    <div class="payment-header">${d.clientName || 'Client'}</div>
    <div class="payment-details">
      ${paymentDetailsText}
      <br><p>Payment must be received for</p>
      <p>Xending Capital to process the currency exchange.</p>
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
${beneficiarySection}
<div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-top: 2px solid #e9ecef; border-radius: 8px;">
  <p style="text-align: center; font-size: 11px; color: #6c757d; margin: 0; line-height: 1.6;">
    <strong style="color: #2c3e50;">Important Notice:</strong><br>
    Xending is a technology services provider, not a bank.<br>
    Xending is powered by Conduit.
  </p>
</div>
</div></body></html>`;
}

// ─── Public ──────────────────────────────────────────────────────────

export function openFallbackPrintWindow(dealData: Record<string, unknown>): void {
  const html = buildXendingHTML(dealData);
  const printWindow = window.open('', '_blank', 'width=800,height=1100');
  if (!printWindow) {
    throw new Error('No se pudo abrir la ventana de impresión. Verifica que los popups estén habilitados.');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => printWindow.print(), 500);
  };
}
