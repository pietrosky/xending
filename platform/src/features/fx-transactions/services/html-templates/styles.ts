/**
 * Inline CSS styles for PDF templates.
 * Embedded directly since Deno Edge Functions don't have filesystem access
 * to load external CSS files.
 */

export function getResumenCSS(): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; line-height: 1.4; color: #2c3e50; background: white; }

.container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 12mm; }
.logo-section { flex: 1; margin-top: -8px; }
.logo { display: flex; align-items: center; }
.xending-logo { display: flex; align-items: center; gap: 8px; }
.logo-text { font-size: 18px; font-weight: 700; color: #334155; }
.logo-image { max-height: 50px; width: auto; }
.header-text {text-align: right; font-size: 10px; color: #7f8c8d; line-height: 1.6; margin-left: 190px; margin-bottom: 35px; }

.deal-header { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; margin-bottom: 12px; border-bottom: 1px solid #e9ecef; }

.title-section { padding: 6px 15px;font-size: 11px; margin-bottom: 8px; text-align: center; text-transform: uppercase;}
.title-section h1 {margin-bottom: 25px; }
.transaction-table { border: 2px solid #e9ecef; margin-bottom: 18px; border-radius: 8px; overflow: hidden;}
.transaction-header { display: flex; background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-bottom: 2px solid #cbd5e1; font-weight: 700; font-size: 10px; color: #475569; }
.transaction-row { display: flex; border-bottom: 1px solid #e9ecef; }
.col-left,
.col-center,
.col-right { padding: 10px 12px; text-align: center; flex: 1; border-right: 1px solid #e9ecef; }
.col-center { flex: 0.3; align-items: center;}
.post-tablas { padding-top: 15px; }
.legal-message { padding-top: 30px; padding-bottom: 30px; }
.page-footer { margin-top: auto; border-top: 3px solid #00d4aa; padding-top: 16px; text-align: center; font-size: 10px; color: #7f8c8d; }

.instructions-table { margin: 5px 0; width: 100%; border-collapse: collapse; font-size: 9px; border: 2px solid #e9ecef; border-radius: 8px; overflow: hidden; }
.instructions-table thead { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); color: black; border-bottom: 2px solid #cbd5e1; }
.instructions-table th { padding: 4px; text-align: center; font-weight: 700; color: #475569; }
.instructions-table td { padding: 4px; text-align: center; }
.instructions-table tbody tr {  border-bottom: 1px solid #e9ecef; }
.instructions-table tbody tr:nth-child(odd) {  background: white; }
.instructions-table tbody tr:nth-child(even) { background: #f0f0f0; }

/* para imprimir /*
@media print {
  @page { size: letter; margin: 8mm 10mm; }

  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-size: 10px;
    line-height: 1.3;
  }

  .container {
    max-width: 100%;
    padding: 4mm 6mm;
  }

  .logo-image {
    max-height: 40px;
  }

  .logo-text {
    font-size: 16px;
  }

  .header-text {
    font-size: 9px;
    line-height: 1.5;
    margin-bottom: 20px;
  }

  .deal-header {
    margin-bottom: 8px;
  }

  .title-section {
    padding: 4px 10px;
    font-size: 10px;
    margin-bottom: 6px;
  }

  .title-section h1 {
    margin-bottom: 12px;
    font-size: 13px;
  }

  .transaction-table {
    margin-bottom: 12px;
    border-width: 1px;
    page-break-inside: avoid;
  }

  .transaction-header {
    font-size: 9px;
  }

  .transaction-row {
    page-break-inside: avoid;
  }

  .col-left,
  .col-center,
  .col-right {
    padding: 6px 8px;
  }

  .post-tablas {
    padding-top: 10px;
  }

  .legal-message {
    padding-top: 15px;
    padding-bottom: 15px;
    font-size: 9px;
  }

  .instructions-table {
    font-size: 8.5px;
    border-width: 1px;
    page-break-inside: avoid;
  }

  .instructions-table th,
  .instructions-table td {
    padding: 3px;
  }

  .page-footer {
    font-size: 9px;
    padding-top: 10px;
    margin-top: 12px;
    page-break-inside: avoid;
  }
}
`;
}

export function getConstanciaCSS(): string {
  return `
* { margin: 0; padding: 0; box-sizing: border-box; }

body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; line-height: 1.4; color: #2c3e50; background: white; }
.container { width: 100%; max-width: 210mm; margin: 0 auto; padding: 12mm; }

.header-wrapper { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid #00d4aa;}
.logo-section { flex-shrink: 0; }
.logo { display: flex; align-items: center; gap: 10px; }
.logo-image { max-height: 50px; width: auto; }
.logo-text { font-size: 18px; font-weight: 700; color: #334155; }

.header-text { text-align: right; font-size: 10px; color: #7f8c8d; line-height: 1.6; max-width: 55%; }
.title-section { padding: 6px 15px; font-size: 11px; margin-bottom: 8px; text-align: center; text-transform: uppercase; }
.title-section h1 { margin-bottom: 10px;}
.title-section p { margin-bottom: 4px; }
.title-section a { color: #00d4aa; }
.legal-message { padding: 20px 0; font-size: 10px; color: #475569; line-height: 1.6; }
.page-footer { margin-top: 20px; border-top: 3px solid #00d4aa; padding-top: 16px; text-align: center; font-size: 10px; color: #7f8c8d; }

.instructions-table { margin: 0 0 12px 0; width: 100%; border-collapse: collapse; font-size: 10px; border: 2px solid #e9ecef; border-radius: 8px; overflow: hidden; }
.instructions-table th { padding: 7px 10px; text-align: left; font-weight: 700;  color: white; }

.instructions-table td { padding: 5px 10px; text-align: left; vertical-align: top; }
.instructions-table tbody tr { border-bottom: 1px solid #e9ecef; }
.instructions-table tbody tr:nth-child(odd) { background: white; }
.instructions-table tbody tr:nth-child(even) { background: #f0f0f0; }
.label-cell { font-weight: 600; color: #475569; width: 120px; white-space: nowrap; }
.instructions-table.table-green thead {
  background: linear-gradient(135deg, #00d4aa 0%, #008b8b 100%);
}
.instructions-table.table-grey thead {
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
}
.instructions-table.table-orange thead {
  background: linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%);
}

/* cambio de estilo para imprimir */

@media print {
  @page { size: letter; margin: 8mm 10mm; }

  body { font-size: 10px; line-height: 1.3; }

  .container { max-width: 100%; padding: 4mm 6mm; }

  .header-wrapper { margin-bottom: 10px; padding-bottom: 8px; }

  .logo-image { max-height: 40px; }

  .logo-text { font-size: 16px; }

  .header-text { font-size: 9px; line-height: 1.5; }

  .title-section { padding: 4px 10px; font-size: 10px; margin-bottom: 6px; }

  .title-section h1 { font-size: 13px; margin-bottom: 6px; }

  .legal-message { padding: 12px 0; font-size: 9px; line-height: 1.5; }

  .page-footer { margin-top: 12px; padding-top: 10px; font-size: 9px; }
  .instructions-table { margin-bottom: 8px; font-size: 9px; border: 1px solid #e9ecef; page-break-inside: avoid; }

  .instructions-table th { padding: 5px 8px; }
  .instructions-table td { padding: 3px 8px; }

  .label-cell { width: 110px; }
  .page-footer,
  .header-wrapper { page-break-inside: avoid; }
}
`;
}
