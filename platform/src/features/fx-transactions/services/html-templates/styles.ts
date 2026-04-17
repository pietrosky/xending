/**
 * Inline CSS styles for PDF templates.
 * Embedded directly since Deno Edge Functions don't have filesystem access
 * to load external CSS files.
 */

export function getXendingCSS(): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; line-height: 1.4; color: #2c3e50; background: white; }
.container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 12mm; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 3px solid #00d4aa; }
.logo-section { flex: 1; margin-top: -8px; }
.logo-text { font-size 35px ;margin-left: 8px;}
.logo { display: flex; align-items: center; }
.xending-logo { display: flex; align-items: center; gap: 8px; }
.logo-text { font-size: 18px; font-weight: 700; color: #334155; }
.custom-logo { display: flex; align-items: center; gap: 10px; }
.logo-image { max-height: 50px; width: auto; }
.header-text { text-align: right; font-size: 10px; color: #7f8c8d; line-height: 1.6; margin-left: 190px; margin-bottom: 35px}
.deal-header { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; margin-bottom: 12px; border-bottom: 1px solid #e9ecef; }
.title-section { padding: 6px 15px; font-size: 11px; margin-bottom: 8px; text-align: center; text-transform: uppercase; }
.title-section h1 { margin-bottom: 25px; }
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
.col-left, .col-center, .col-right { padding: 10px 12px; text-align: center; flex: 1; border-right: 1px solid #e9ecef;}
.col-center { flex: 0.3; }
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
.post-tablas { padding-top: 15px;}
.legal-message { padding-top: 30px; padding-bottom: 30px; }
.page-footer { margin-top: auto; border-top: 3px solid #00d4aa; padding-top: 16px; text-align: center; font-size: 10px; color: #7f8c8d; }
.footer-logo { display: flex; justify-content: center; margin-bottom: 8px; }
.footer-logo .logo-image { height: 50px; width: auto; }

.instructions-table { margin: 5px 0; width: 100%; border-collapse: collapse; font-size: 9px; border: 2px solid #e9ecef; border-radius: 8px; overflow: hidden; }
.instructions-table thead { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); color: black; border-bottom: 2px solid #cbd5e1; }
.instructions-table th { padding: 4px; text-align: center; font-weight: 700; color: #475569; }
.instructions-table td { padding: 4px; text-align: center; }
.instructions-table tbody tr { border-bottom: 1px solid #e9ecef; }
.instructions-table tbody tr:nth-child(odd) { background: white;}
.instructions-table tbody tr:nth-child(even) { background: #f0f0f0;}
`;
} // los ultimos estilos de tabla los genere con IA copiando el estilo de la otra, no le encontraba la vuelta para que se vean bien y si no desentonaba demasiado

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
