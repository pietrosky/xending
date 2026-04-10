/**
 * Inline CSS styles for PDF templates.
 * Embedded directly since Deno Edge Functions don't have filesystem access
 * to load external CSS files.
 */

export function getMonexCSS(): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.3; color: #333; }
.container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 10mm; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
.logo-section { flex: 1; }
.logo { display: flex; align-items: center; }
.xending-logo { display: flex; align-items: center; gap: 8px; }
.logo-text { font-size: 16px; font-weight: 700; color: #1a1a2e; }
.header-text { flex: 2; text-align: center; font-size: 9px; color: #666; line-height: 1.5; }
.qr-section { flex: 1; text-align: right; }
.qr-code { display: inline-block; }
.qr-placeholder { width: 60px; height: 60px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #999; }
.deal-header { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #333; border-bottom: 1px solid #ccc; padding: 8px 0; margin-bottom: 10px; }
.deal-number { font-weight: 700; font-size: 11px; }
.contact-info { font-size: 9px; color: #666; }
.contact-info span { margin-left: 15px; }
.confirmation-banner { background: #1a1a2e; color: white; padding: 8px 15px; font-weight: 700; font-size: 12px; margin-bottom: 15px; text-align: center; text-transform: uppercase; }
.info-section { display: flex; gap: 30px; margin-bottom: 15px; }
.left-column { flex: 1; }
.right-column { flex: 1; }
.field-row { margin-bottom: 4px; display: flex; }
.label { font-weight: 700; width: 90px; flex-shrink: 0; }
.value { flex: 1; }
.address { margin: 5px 0 5px 90px; font-size: 9px; line-height: 1.4; }
.transaction-banner { background: #2c3e50; color: white; padding: 6px 15px; font-weight: 700; font-size: 11px; margin-bottom: 8px; text-align: center; text-transform: uppercase; }
.transaction-table { border: 1px solid #ccc; margin-bottom: 15px; }
.transaction-header { display: flex; background: #f0f0f0; border-bottom: 1px solid #ccc; font-weight: 700; font-size: 10px; }
.transaction-row { display: flex; border-bottom: 1px solid #eee; }
.col-left, .col-center, .col-right { padding: 8px 12px; text-align: center; flex: 1; border-right: 1px solid #eee; }
.col-right { border-right: none; }
.total-row { display: flex; justify-content: flex-end; align-items: center; background: #f8f8f8; padding: 8px 15px; font-weight: 700; border-top: 2px solid #333; }
.total-label { margin-right: 15px; }
.payment-banner { background: #34495e; color: white; padding: 6px 15px; font-weight: 700; font-size: 11px; margin-bottom: 10px; text-align: center; text-transform: uppercase; }
.payment-section { display: flex; gap: 20px; margin-bottom: 20px; }
.payment-block { flex: 1; }
.payment-header { font-weight: 700; font-size: 10px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
.payment-details { font-size: 9px; line-height: 1.5; }
.bank-details { flex: 1; }
.bank-info .field-row { margin-bottom: 3px; font-size: 9px; }
.bank-info .label { width: 110px; }
.footer { display: flex; justify-content: space-between; border-top: 2px solid #333; padding-top: 10px; margin-top: 20px; font-size: 8px; color: #666; }
.office { flex: 1; text-align: center; line-height: 1.4; }
.office strong { font-size: 9px; color: #333; }
`;
}

export function getXendingCSS(): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; line-height: 1.4; color: #2c3e50; background: white; }
.container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 12mm; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #00d4aa; }
.logo-section { flex: 1; }
.logo { display: flex; align-items: center; }
.xending-logo { display: flex; align-items: center; gap: 8px; }
.logo-text { font-size: 18px; font-weight: 700; color: #334155; }
.custom-logo { display: flex; align-items: center; gap: 10px; }
.logo-image { max-height: 50px; width: auto; }
.header-text { flex: 2; text-align: center; font-size: 10px; color: #7f8c8d; line-height: 1.6; }
.qr-section { flex: 1; text-align: right; }
.qr-code { display: inline-block; }
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
`;
}

export function getGenericCSS(): string {
  return `
body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
.container { max-width: 210mm; margin: 0 auto; padding: 20px; }
.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
.header h1 { font-size: 20px; color: #1a1a2e; }
.deal-details { padding: 20px; }
.deal-details p { margin-bottom: 10px; font-size: 12px; }
`;
}
