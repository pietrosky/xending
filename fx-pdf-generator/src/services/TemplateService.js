const fs = require('fs');
const path = require('path');

// Cache for CSS files
const cssCache = new Map();

class TemplateService {
  static getAvailablePartners() {
    return ['monex', 'xending', 'xending-compact', 'generic', 'xending-resume', 'xending-constancia']; // Add more partners as needed
  }

  static isValidPartner(partner) {
    return this.getAvailablePartners().includes(partner.toLowerCase());
  }

  static generateHTML(partner, dealData) {
    const partnerLower = partner.toLowerCase();

    switch (partnerLower) {
      case 'monex':
        return this.generateMonexHTML(dealData);
      case 'xending':
        return this.generateXendingHTML(dealData);
      case 'xending-compact':
        return this.generateXendingCompactHTML(dealData);
      case 'generic':
        return this.generateGenericHTML(dealData);
      case 'xending-resume':
        return this.generateResumenHTML(dealData);
      case 'xending-constancia':
        return this.generateConstanciaHTML(dealData);
      default:
        throw new Error(`Template not found for partner: ${partner}`);
    }
  }

  static getPDFOptions(partner) {
    const baseOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    };

    // Partner-specific overrides
    switch (partner.toLowerCase()) {
      case 'monex':
        return {
          ...baseOptions,
          margin: {
            top: '15mm',
            right: '10mm',
            bottom: '15mm',
            left: '10mm'
          }
        };
      case 'xending':
        return {
          ...baseOptions,
          margin: {
            top: '12mm',
            right: '12mm',
            bottom: '12mm',
            left: '12mm'
          }
        };
      case 'xending-compact':
        return {
          ...baseOptions,
          margin: {
            top: '8mm',
            right: '8mm',
            bottom: '8mm',
            left: '8mm'
          }
        };
      default:
        return baseOptions;
    }
  }

  static generateMonexHTML(dealData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Monex Deal Confirmation</title>
        <style>
          ${this.loadCSS('monex')}
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header with logo and QR -->
          <div class="header">
            <div class="logo-section">
              <div class="logo">
                ${this.generateLogoHTML(dealData.logo)}
              </div>
            </div>
            <div class="header-text">
              <p>Please review this document.</p>
              <p>Deal is a binding agreement. If it</p>
              <p>does not agree with your</p>
              <p>instructions, please call us</p>
              <p>immediately</p>
            </div>
            <div class="qr-section">
              <div class="qr-code">
                <div class="qr-placeholder">QR</div>
              </div>
            </div>
          </div>

          <!-- Deal header info -->
          <div class="deal-header">
            <div class="deal-number">Deal No. ${dealData.dealNumber || 'TMP-USA-DEAL-0424313'}</div>
            <div class="contact-info">
              <span>www.monexusa.com</span>
              <span>T: +1 800.834.2497</span>
              <span>F: +1 202.785.2554</span>
            </div>
          </div>

          <!-- Deal confirmation banner -->
          <div class="confirmation-banner">
            DEAL CONFIRMATION
          </div>

          <!-- Client and deal info -->
          <div class="info-section">
            <div class="left-column">
              <div class="field-row">
                <span class="label">Client:</span>
                <span class="value">${dealData.clientName || 'EDGAR EL PANA DEL RITMO SA DE CV'}</span>
              </div>
              <div class="field-row">
                <span class="label">Booked By:</span>
                <span class="value">${dealData.bookedBy || 'XendingGlobalAPI_fvo_LVgbNNxB0O5'}</span>
              </div>
              <div class="field-row">
                <span class="label">Acct. #:</span>
                <span class="value">${dealData.accountNumber || '0016474'}</span>
              </div>
              <div class="field-row">
                <span class="label">Remarks:</span>
                <span class="value">${dealData.remarks || ''}</span>
              </div>
            </div>
            <div class="right-column">
              <div class="field-row">
                <span class="label">Trade Date:</span>
                <span class="value">${dealData.tradeDate || '28-Sep-2025'}</span>
              </div>
              <div class="field-row">
                <span class="label">Deal Type:</span>
                <span class="value">${dealData.dealType || 'Spot'}</span>
              </div>
              <div class="field-row">
                <span class="label">Rel Manager:</span>
                <span class="value">${dealData.relManager || 'Xending Capital'}</span>
              </div>
              <div class="field-row">
                <span class="label">FX Dealer:</span>
                <span class="value">${dealData.fxDealer || 'Adam Kane'}</span>
              </div>
              <div class="field-row">
                <span class="label">Processor:</span>
                <span class="value">${dealData.processor || 'Xending Capital'}</span>
              </div>
            </div>
          </div>

          <!-- Transaction details -->
          <div class="transaction-banner">
            DEAL TRANSACTION DETAILS
          </div>

          <div class="transaction-table">
            <div class="transaction-header">
              <div class="col-left">${dealData.clientName || 'EDGAR EL PANA DEL RITMO SA DE CV'}<br>Buys</div>
              <div class="col-center">Exchange<br>Rate</div>
              <div class="col-right">${dealData.clientName || 'EDGAR EL PANA DEL RITMO SA DE CV'}<br>Pays</div>
            </div>
            <div class="transaction-row">
              <div class="col-left">${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '4,999.00'}</div>
              <div class="col-center">${dealData.exchangeRate || '1.1587'}</div>
              <div class="col-right">${dealData.payCurrency || 'EUR'} ${dealData.payAmount || '4,314.32'}<br>${dealData.feeText || 'USD 20.00 (Fees)'}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Total Due (${dealData.payCurrency || 'EUR'}):</div>
              <div class="total-amount">${dealData.totalDue || '4,314.32'}</div>
            </div>
          </div>

          <!-- Payment instructions -->
          <div class="payment-banner">
            PAYMENT INSTRUCTIONS
          </div>

          <div class="payment-section">
            <div class="payment-block">
              <div class="payment-header">${dealData.clientName || 'EDGAR EL PANA DEL RITMO SA DE CV'}</div>
              <div class="payment-details">
                <p>to pay <strong>Monex USA EUR</strong></p>
                <p><strong>${dealData.payAmount || '4,314.32'}</strong> by Electronic Wire</p>
                <p>transfer on <strong>${dealData.transferDate || '28-Sep-2025'}</strong> to:</p>
                <br>
                <p>Payment must be received for</p>
                <p>Monex USA to send the currency.</p>
              </div>
            </div>
            <div class="bank-details">
              <div class="bank-info">
                <div class="field-row">
                  <span class="label">Account Number:</span>
                  <span class="value">${dealData.accountNumber1 || 'DE37 5031 0400 0437 7961 00'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Account Name:</span>
                  <span class="value">${dealData.accountName1 || 'Monex USA'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Account Address:</span>
                  <span class="value">${dealData.accountAddress1 || '1201 New York Avenue, NW, Suite 300 Washington, DC 20005 USA'}</span>
                </div>
                <div class="field-row">
                  <span class="label">SWIFT:</span>
                  <span class="value">${dealData.swift1 || 'BARCDEFF'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Bank Name:</span>
                  <span class="value">${dealData.bankName1 || 'Barclays Bank PLC'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Bank Address:</span>
                  <span class="value">${dealData.bankAddress1 || 'Frankfurt, Germany'}</span>
                </div>
                <div class="field-row">
                  <span class="label">By Order Of:</span>
                  <span class="value">${dealData.byOrderOf1 || dealData.clientName || 'EDGAR EL PANA DEL RITMO SA DE CV'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer with office locations -->
          <div class="footer">
            <div class="office">
              <strong>Washington, DC</strong><br>
              1101 K St NW, Suite 600<br>
              Washington, DC 20005<br>
              +1 800.834.2497 phone
            </div>
            <div class="office">
              <strong>Los Angeles</strong><br>
              8383 Wilshire Blvd, Suite 1032<br>
              Beverly Hills, CA 90211<br>
              +1 855.606.8346 phone
            </div>
            <div class="office">
              <strong>New York</strong><br>
              385 5th Ave, Suite 1500<br>
              New York, NY 10016<br>
              +1 855.776.2022 phone
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static generateXendingHTML(dealData) {
    // Cargar logo de Xending automáticamente si no se proporciona
    if (!dealData.logo) {
      const LogoHelper = require('../utils/LogoHelper');
      dealData.logo = LogoHelper.createLogoObject('./src/utils/Xending.png', {
        text: 'Xending Capital',
        width: '70px',
        height: '70px'
      });
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Xending Capital - Deal Confirmation</title>
        <style>
          ${this.loadCSS('xending')}
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header with Xending logo -->
          <div class="header">
            <div class="logo-section">
              <div class="logo">
                ${this.generateLogoHTML(dealData.logo)}
              </div>
            </div>
            <div class="header-text">
              <p><strong>Xending Capital Payments</strong></p>
              <p>Your trusted partner for international</p>
              <p>foreign exchange transactions</p>
              <p>Please review this confirmation carefully</p>
            </div>
          </div>

          <!-- Deal header info -->
          <div class="deal-header">
            <div class="deal-number">Deal No. ${dealData.dealNumber || 'XG-SPOT-001'}</div>
            <div class="contact-info">
              <span>www.xendinglobal.com</span>
              <span>T: 8119124842</span>
              <span>E: deals@xendingglobal.com</span>
            </div>
          </div>

          <!-- Deal confirmation banner -->
          <div class="confirmation-banner">
            Xending Capital - DEAL CONFIRMATION
          </div>

          <!-- Client and deal info -->
          <div class="info-section">
            <div class="left-column">
              <div class="field-row">
                <span class="label">Client:</span>
                <span class="value">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}</span>
              </div>
            </div>
            <div class="right-column">
              <div class="field-row">
                <span class="label">Trade Date:</span>
                <span class="value">${dealData.tradeDate || '29/12/2025'}</span>
              </div>
              <div class="field-row">
                <span class="label">Deal Type:</span>
                <span class="value">${dealData.dealType || 'Spot'}</span>
              </div>
            </div>
          </div>

          <!-- Transaction details -->
          <div class="transaction-banner">
            TRANSACTION DETAILS
          </div>

          ${dealData.withoutExchangeRate ? `
          <!-- Versión SIN tipo de cambio - Mantener formato de tabla -->
          <div class="transaction-table">
            <div class="transaction-header">
              <div class="col-left">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Buys</div>
              <div class="col-center">Exchange<br>Rate</div>
              <div class="col-right">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Pays</div>
            </div>
            <div class="transaction-row">
              <div class="col-left">${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '100,000.00'}</div>
              <div class="col-center">1</div>
              <div class="col-right">${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '100,000.00'}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Total Due (${dealData.buyCurrency || 'USD'}):</div>
              <div class="total-amount">${dealData.buyAmount || '100,000.00'}</div>
            </div>
          </div>
          ` : `
          <!-- Versión CON tipo de cambio -->
          <div class="transaction-table">
            <div class="transaction-header">
              <div class="col-left">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Buys</div>
              <div class="col-center">Exchange<br>Rate</div>
              <div class="col-right">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Pays</div>
            </div>
            <div class="transaction-row">
              <div class="col-left">${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '100,000.00'}</div>
              <div class="col-center">${dealData.exchangeRate || '17.8500'}</div>
              <div class="col-right">${dealData.payCurrency || 'MXN'} ${dealData.payAmount || '1,785,000.00'}<br><span class="fee-text">${dealData.feeText || 'MXN 0.00 (Xending Fee)'}</span></div>
            </div>
            <div class="total-row">
              <div class="total-label">Total Due (${dealData.payCurrency || 'MXN'}):</div>
              <div class="total-amount">${dealData.totalDue || '1,787,500.00'}</div>
            </div>
          </div>
          `}

          <!-- Payment instructions -->
          <div class="payment-banner">
            PAYMENT INSTRUCTIONS
          </div>

          <div class="payment-section">
            <div class="payment-block">
              <div class="payment-header">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}</div>
              <div class="payment-details">
                ${dealData.withoutExchangeRate ? `
                <p>to pay <strong>Xending Capital</strong></p>
                <p>by Electronic Wire transfer</p>
                <p>on <strong>${dealData.tradeDate || '29/12/2025'}</strong> to:</p>
                ` : `
                <p>to pay <strong>Xending Capital ${dealData.payCurrency || 'MXN'}</strong></p>
                <p><strong>${dealData.totalDue || '1,787,500.00'}</strong> by Electronic Wire</p>
                <p>transfer on <strong>${dealData.tradeDate || '29/12/2025'}</strong> to:</p>
                `}
                <br>
                <p>Payment must be received for</p>
                <p>Xending Capital to process the currency exchange.</p>
              </div>
            </div>
            <div class="bank-details">
              <div class="bank-info">
                <div class="field-row">
                  <span class="label">Account Number:</span>
                  <span class="value">${dealData.accountNumber1 || 'MX98765432109876543210'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Account Name:</span>
                  <span class="value">${dealData.accountName1 || 'Xending Capital Payments'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Account Address:</span>
                  <span class="value">${dealData.accountAddress1 || 'Torre Xending, Av. Reforma 123, CDMX, Mexico'}</span>
                </div>
                <div class="field-row">
                  <span class="label">SWIFT:</span>
                  <span class="value">${dealData.swift1 || 'XENDMX22'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Bank Name:</span>
                  <span class="value">${dealData.bankName1 || 'Banco Xending Mexico'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Bank Address:</span>
                  <span class="value">${dealData.bankAddress1 || 'Ciudad de Mexico, Mexico'}</span>
                </div>
                <div class="field-row">
                  <span class="label">By Order Of:</span>
                  <span class="value">${dealData.byOrderOf1 || dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Beneficiary Section - Xending Paga A -->
          ${dealData.beneficiaryAccountNumber ? `
          <div class="payment-banner" style="background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%); margin-top: 30px;">
            BENEFICIARY DETAILS - XENDING PAYS TO
          </div>

          <div class="payment-section">
            <div class="payment-block">
              <div class="payment-header">Xending Capital</div>
              <div class="payment-details">
                ${dealData.withoutExchangeRate ? `
                <p>Amount <strong>${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '100,000.00'}</strong></p>
                <p>by Wire transfer to:</p>
                ` : `
                <p>will pay <strong>${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '100,000.00'}</strong></p>
                <p>by Electronic Wire transfer to:</p>
                <br>
                <p><strong>Beneficiary Account</strong></p>
                `}
              </div>
            </div>
            <div class="bank-details">
              <div class="bank-info">
                <div class="field-row">
                  <span class="label">Account Number:</span>
                  <span class="value">${dealData.beneficiaryAccountNumber}</span>
                </div>
                <div class="field-row">
                  <span class="label">Account Name:</span>
                  <span class="value">${dealData.beneficiaryAccountName || ''}</span>
                </div>
                <div class="field-row">
                  <span class="label">Account Address:</span>
                  <span class="value">${dealData.beneficiaryAccountAddress || ''}</span>
                </div>
                <div class="field-row">
                  <span class="label">SWIFT:</span>
                  <span class="value">${dealData.beneficiarySwift || ''}</span>
                </div>
                <div class="field-row">
                  <span class="label">Bank Name:</span>
                  <span class="value">${dealData.beneficiaryBankName || ''}</span>
                </div>
                <div class="field-row">
                  <span class="label">Bank Address:</span>
                  <span class="value">${dealData.beneficiaryBankAddress || ''}</span>
                </div>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Disclaimer Footer -->
          <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-top: 2px solid #e9ecef; border-radius: 8px;">
            <p style="text-align: center; font-size: 11px; color: #6c757d; margin: 0; line-height: 1.6;">
              <strong style="color: #2c3e50;">Important Notice:</strong><br>
              Xending is a technology services provider, not a bank.<br>
              Xending is powered by Conduit.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static generateXendingCompactHTML(dealData) {
    // Cargar logo de Xending automáticamente si no se proporciona
    if (!dealData.logo) {
      const LogoHelper = require('../utils/LogoHelper');
      dealData.logo = LogoHelper.createLogoObject('./src/utils/Xending.png', {
        text: 'Xending Capital',
        width: '50px',
        height: '50px'
      });
    }
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Xending Capital - Deal Confirmation (Compact)</title>
        <style>
          ${this.loadCSS('xending-compact')}
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header Compacto -->
          <div class="header">
            <div class="logo-section">
              <div class="logo">
                ${this.generateLogoHTML(dealData.logo)}
              </div>
            </div>
            <div class="header-text">
              <p><strong>Xending Capital Payments</strong></p>
              <p>FX Deal Confirmation</p>
            </div>
          </div>

          <!-- Deal header -->
          <div class="deal-header">
            <div class="deal-number">Deal No. ${dealData.dealNumber || 'XG-SPOT-001'}</div>
            <div class="contact-info">
              <span>www.xendinglobal.com</span>
              <span>T: 8119124842</span>
            </div>
          </div>

          <!-- Confirmation banner -->
          <div class="confirmation-banner">
            Xending Capital - DEAL CONFIRMATION
          </div>

          <!-- Client and deal info - 2 COLUMNAS -->
          <div class="info-section">
            <div class="left-column">
              <div class="field-row">
                <span class="label">Client:</span>
                <span class="value">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}</span>
              </div>
            </div>
            <div class="right-column">
              <div class="field-row">
                <span class="label">Trade Date:</span>
                <span class="value">${dealData.tradeDate || '29/12/2025'}</span>
              </div>
              <div class="field-row">
                <span class="label">Deal Type:</span>
                <span class="value">${dealData.dealType || 'Spot'}</span>
              </div>
            </div>
          </div>

          <!-- Transaction details -->
          <div class="transaction-banner">
            TRANSACTION DETAILS
          </div>

          ${dealData.withoutExchangeRate ? `
          <!-- Versión SIN tipo de cambio (Compact) - Mantener formato de tabla -->
          <div class="transaction-table">
            <div class="transaction-header">
              <div class="col-left">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Buys</div>
              <div class="col-center">Exchange<br>Rate</div>
              <div class="col-right">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Pays</div>
            </div>
            <div class="transaction-row">
              <div class="col-left">${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '100,000.00'}</div>
              <div class="col-center">1</div>
              <div class="col-right">${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '100,000.00'}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Total Due (${dealData.buyCurrency || 'USD'}):</div>
              <div class="total-amount">${dealData.buyAmount || '100,000.00'}</div>
            </div>
          </div>
          ` : `
          <!-- Versión CON tipo de cambio (Compact) -->
          <div class="transaction-table">
            <div class="transaction-header">
              <div class="col-left">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Buys</div>
              <div class="col-center">Exchange<br>Rate</div>
              <div class="col-right">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}<br>Pays</div>
            </div>
            <div class="transaction-row">
              <div class="col-left">${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '100,000.00'}</div>
              <div class="col-center">${dealData.exchangeRate || '17.8500'}</div>
              <div class="col-right">${dealData.payCurrency || 'MXN'} ${dealData.payAmount || '1,785,000.00'}<br><span class="fee-text">${dealData.feeText || 'MXN 0.00 (Xending Fee)'}</span></div>
            </div>
            <div class="total-row">
              <div class="total-label">Total Due (${dealData.payCurrency || 'MXN'}):</div>
              <div class="total-amount">${dealData.totalDue || '1,787,500.00'}</div>
            </div>
          </div>
          `}

          <!-- Payment instructions - 2 COLUMNAS LADO A LADO -->
          <div class="payment-banner">
            PAYMENT INSTRUCTIONS
          </div>

          <div class="payment-section">
            <div class="payment-block">
              <div class="payment-header">${dealData.clientName || 'IMPORTADORA MEXICANA SA DE CV'}</div>
              <div class="payment-details">
                ${dealData.withoutExchangeRate ? `
                <p>to pay <strong>Xending Capital</strong></p>
                <p>by Wire transfer</p>
                <p>on <strong>${dealData.tradeDate || '29/12/2025'}</strong></p>
                ` : `
                <p>to pay <strong>Xending Capital ${dealData.payCurrency || 'MXN'}</strong></p>
                <p><strong>${dealData.totalDue || '1,787,500.00'}</strong> by Wire</p>
                <p>on <strong>${dealData.tradeDate || '29/12/2025'}</strong></p>
                `}
              </div>
            </div>
            <div class="bank-details">
              <div class="bank-info">
                <div class="field-row">
                  <span class="label">Account Number:</span>
                  <span class="value">${dealData.accountNumber1 || 'MX98765432109876543210'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Account Name:</span>
                  <span class="value">${dealData.accountName1 || 'Xending Capital Payments'}</span>
                </div>
                <div class="field-row">
                  <span class="label">SWIFT:</span>
                  <span class="value">${dealData.swift1 || 'XENDMX22'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Bank Name:</span>
                  <span class="value">${dealData.bankName1 || 'Banco Xending Mexico'}</span>
                </div>
                <div class="field-row">
                  <span class="label">Bank Address:</span>
                  <span class="value">${dealData.bankAddress1 || 'Ciudad de Mexico, Mexico'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Beneficiary Section - 2 COLUMNAS LADO A LADO -->
          ${dealData.beneficiaryAccountNumber ? `
          <div class="beneficiary-banner">
            BENEFICIARY - XENDING PAYS TO
          </div>

          <div class="payment-section">
            <div class="payment-block">
              <div class="payment-header">Xending Capital</div>
              <div class="payment-details">
                ${dealData.withoutExchangeRate ? `
                <p>Amount <strong>${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '100,000.00'}</strong></p>
                <p>by Wire transfer to:</p>
                ` : `
                <p>will pay <strong>${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '100,000.00'}</strong></p>
                <p>by Wire transfer to:</p>
                `}
              </div>
            </div>
            <div class="bank-details">
              <div class="bank-info">
                <div class="field-row">
                  <span class="label">Account Number:</span>
                  <span class="value">${dealData.beneficiaryAccountNumber}</span>
                </div>
                <div class="field-row">
                  <span class="label">Account Name:</span>
                  <span class="value">${dealData.beneficiaryAccountName || ''}</span>
                </div>
                <div class="field-row">
                  <span class="label">SWIFT:</span>
                  <span class="value">${dealData.beneficiarySwift || ''}</span>
                </div>
                <div class="field-row">
                  <span class="label">Bank Name:</span>
                  <span class="value">${dealData.beneficiaryBankName || ''}</span>
                </div>
                <div class="field-row">
                  <span class="label">Bank Address:</span>
                  <span class="value">${dealData.beneficiaryBankAddress || ''}</span>
                </div>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Disclaimer Footer -->
          <div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-top: 2px solid #e9ecef; border-radius: 6px;">
            <p style="text-align: center; font-size: 10px; color: #6c757d; margin: 0; line-height: 1.5;">
              <strong style="color: #2c3e50;">Important Notice:</strong><br>
              Xending is a technology services provider, not a bank. Xending is powered by Conduit.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static generateGenericHTML(dealData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Deal Confirmation</title>
        <style>
          ${this.loadCSS('generic')}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Deal Confirmation</h1>
          </div>
          
          <div class="deal-details">
            <p><strong>Deal ID:</strong> ${dealData.dealId || 'N/A'}</p>
            <p><strong>Amount:</strong> ${dealData.amount || 'N/A'}</p>
            <p><strong>Currency:</strong> ${dealData.currency || 'N/A'}</p>
            <p><strong>Rate:</strong> ${dealData.rate || 'N/A'}</p>
            <p><strong>Date:</strong> ${dealData.date || new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static generateConstanciaHTML(dealData) {
  if (!dealData.logo) {
    const LogoHelper = require('../utils/LogoHelper');
    dealData.logo = LogoHelper.createLogoObject('./src/utils/Xending.png', {
      text: 'Xending Capital',
      width: '50px',
      height: '50px',
    });
  }
  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>${this.loadCSS('xending-constancia')}</style>
    </head>
    <body>
      <div class="container">
        <div class="header-wrapper">
          <div class="logo-section">
            <div class="logo">
              ${this.generateLogoHTML(dealData.logo)}
            </div>
          </div>
          <div class="header-text">
            <p>Xending Capital es una marca comercial utilizada por</p>
            <p>Lemad Capital, S.A.P.I. de C.V., SOFOM, E.N.R., de C.V., SOFOM, E.N.R.,</p>
            <p>Sociedad Financiera de Objeto Múltiple, Entidad No Regulada,</p>
            <p>que opera conforme a la Ley General de Organizaciones y Actividades</p>
            <p>Auxiliares del Crédito, en términos del artículo 87-B, así como</p>
            <p>a las disposiciones aplicables en materia de prevención de lavado de dinero.</p>
          </div>
        </div>

        <div class="title-section">
          <h1>CONSTANCIA DE DISPOSICIÓN DE LINEA DE SERVICIO </h1>
          <p><strong>LEMAD CAPITAL S.A.P.I. DE C.V.</strong>LEMAD CAPITAL S.A.P.I. DE C.V. RFC: LCA220601H50 PEDRO RAMIREZ VAZQUEZ 200-11 PISO 1 INT. A SAN PEDRO GARZA GARCÍA, N.L. Teléfono: 81-20-80-90-56</p>
           <a href="www.lemadcapital.com">www.lemadcapital.com</a>
        </div>

        <table class="instructions-table table-green">
          <thead><tr><th colspan="2">I. DATOS DE IDENTIFICACIÓN DEL ACREDITADO</th></tr></thead>
          <tbody>
            <tr><td class="label-cell">Nombre:</td><td>${dealData.clientName}</td></tr>
            <tr><td class="label-cell">Domicilio:</td><td>${(dealData.clientAddress || '').replace(/<br\s*\/?>/gi, ', ').replace(/\s*\n+\s*/g, ', ')}</td></tr>
            <tr><td class="label-cell">RFC:</td><td>${dealData.clientRFC}</td></tr>
          </tbody>
        </table>

        <table class="instructions-table table-orange">
          <thead><tr><th colspan="2">II. DATOS DE IDENTIFICACIÓN DEL ACREDITANTE</th></tr></thead>
          <tbody>
            <tr><td class="label-cell">Razón Social:</td><td>LEMAD CAPITAL, S.A.P.I DE C.V., SOFOM, E.N.R.</td></tr>
            <tr><td class="label-cell">Domicilio:</td><td>PEDRO RAMIREZ VAZQUEZ 200-11 PISO 1 INT. A SAN PEDRO GARZA GARCÍA, N.L.</td></tr>
          </tbody>
        </table>

        <table class="instructions-table table-grey">
          <thead><tr><th colspan="4">III. INFORMACIÓN DE LA DISPOSICIÓN</th></tr></thead>
          <tbody>
            <tr>
              <td class="label-cell">Operación:</td><td>${dealData.dealNumber}</td>
              <td class="label-cell">Solicitud:</td><td>${dealData.requestDate}</td>
            </tr>
            <tr>
              <td class="label-cell">Monto:</td><td colspan="3">${dealData.buyAmount} (${dealData.buyAmountString})</td>
            </tr>
            <tr>
              <td class="label-cell">Vencimiento:</td><td>${dealData.dueDate}</td>
              <td class="label-cell">Tipo de cambio:</td><td>${dealData.exchangeRate}</td>
            </tr>
            <tr>
              <td class="label-cell">Monto a Pagar:</td><td colspan="3"><strong>$ ${dealData.payAmount} ${dealData.payAmountString}</strong></td>
            </tr>
          </tbody>
        </table>

        <table class="instructions-table table-grey">
          <thead><tr><th colspan="2">IV. CUENTA DEL ACREDITADO (RECEPCIÓN DE RECURSOS)</th></tr></thead>
          <tbody>
            <tr><td class="label-cell">Banco:</td><td>${dealData.beneficiaryBankName}</td></tr>
            <tr><td class="label-cell">CLABE:</td><td>${dealData.beneficiaryAccountNumber}</td></tr>
            <tr><td class="label-cell">Beneficiario:</td><td>${dealData.beneficiaryAccountName}</td></tr>
          </tbody>
        </table>

        <table class="instructions-table table-orange">
          <thead><tr><th colspan="2">V. CUENTA DEL ACREDITANTE (PAGO DE LIQUIDACIÓN)</th></tr></thead>
          <tbody>
            <tr><td class="label-cell">Banco:</td><td>BANCREA</td></tr>
            <tr><td class="label-cell">CLABE:</td><td>${dealData.accountNumber1}</td></tr>
            <tr><td class="label-cell">Referencia:</td><td>${dealData.dealNumber}</td></tr>
          </tbody>
        </table>

        <div class="legal-message">
          <p>La presente Constancia de Disposición forma parte del Contrato de Línea de Servicio celebrado con Sunem Capital, S.A.P.I. de C.V., SOFOM, E.N.R. La recepción constituye aceptación de los términos establecidos.</p>
        </div>

        <footer class="page-footer">
          WWW.LEMADCAPITAL.COM | TEL: 81-20-80-90-56
        </footer>

      </div>
    </body>
    </html>`;
  }

static generateResumenHTML(dealData) {
  if (!dealData.logo) {
    const LogoHelper = require('../utils/LogoHelper');
    dealData.logo = LogoHelper.createLogoObject('./src/utils/Xending.png', {
      text: 'Xending Capital',
      width: '50px',
      height: '50px'
    });
  }

  const transactionBlock = `<div class="transaction-table">
        <div class="transaction-header">
          <div class="col-left"><strong>Detalles:</strong></div>
          <div class="col-center"><strong>Tipo de cambio</strong></div>
          <div class="col-right"><strong>Liquidacion</strong></div>
        </div>
        <div class="transaction-row">
          <div class="col-left"><strong>Divisa requerida por el cliente:</strong> ${dealData.buyCurrency}<br>
          <strong>Monto a enviar:</strong> ${dealData.buyAmount}<br>${dealData.buyAmountString}<br>
          <strong>Plazo a financiar:</strong> ${dealData.financingTerm}</div>

          <div class="col-center">${dealData.exchangeRate}</div>

          <div class="col-right">${dealData.clientName} pagará<br>$${dealData.payAmount} (${dealData.payAmountString})</div>
        </div>
  </div>`;

  const instructionsTable = `
    <table class="instructions-table">
      <thead>
        <tr>
          <th>Divisa</th>
          <th>Fecha Valor</th>
          <th>Monto a recibir</th>
          <th>Beneficiario</th>
          <th>Detalles de cuenta</th>
          <th>Referencia</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${dealData.currency}</td>
          <td>${dealData.valueDate}</td>
          <td>${dealData.amountToReceive}</td>
          <td>${dealData.beneficiaryAccountName}</td>
          <td>Banco ${dealData.beneficiaryBankName}<br>CLABE: ${dealData.beneficiaryAccountNumber}</td>
          <td>${dealData.dealNumber}</td>
        </tr>
      </tbody>
    </table>
  `;

  return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Xending Capital - RESUMEN DE LA OPERACIÓN PACTADA</title>
      <style>${this.loadCSS('xending-resume')}</style>
    </head>
    <body>
      <div class="container">

        <div class="header-wrapper">
          <div class="logo-section">
            <div class="logo">
              ${this.generateLogoHTML(dealData.logo)}
            </div>
          </div>
          <div class="header-text">
            <p>Xending Capital es una marca comercial utilizada por</p>
            <p>Lemad Capital, S.A.P.I. de C.V., SOFOM, E.N.R., de C.V., SOFOM, E.N.R.,</p>
            <p>Sociedad Financiera de Objeto Múltiple, Entidad No Regulada,</p>
            <p>que opera conforme a la Ley General de Organizaciones y Actividades</p>
            <p>Auxiliares del Crédito, en términos del artículo 87-B, así como</p>
            <p>a las disposiciones aplicables en materia de prevención de lavado de dinero.</p>
          </div>
        </div>

        <div class="title-section">
          <h1>RESUMEN DE LA OPERACIÓN PACTADA</h1>
          <p><strong>LEMAD CAPITAL S.A.P.I. DE C.V.</strong>: PEDRO RAMIREZ VAZQUEZ 200-11 PISO 1 INT. A SAN PEDRO GARZA GARCÍA, N.L.</p>
          <p>Teléfono: 81-20-80-90-56</p>
          <a href="www.lemadcapital.com">www.lemadcapital.com</a>
        </div>

        <div class="deal-header">
          <p><strong>Numero de Transaccion ${dealData.dealNumber}</strong></p>
          <p><strong>Cliente:</strong> ${dealData.clientName}</p>
          <p><strong>Direccion:</strong> ${(dealData.clientAddress || '').replace(/<br\s*\/?>/gi, ', ').replace(/\s*\n+\s*/g, ', ')}</p>
        </div>

        ${transactionBlock}

        <div><strong>INSTRUCCIONES DE ENVIO:</strong></div>

        ${instructionsTable}

        <div class="post-tablas">
          <p><strong><i>Instrucciones de cobro de transaccion: ${dealData.dealNumber}</i></strong></p>
          <p><strong>El cliente deberá realizar el pago por la cantidad de ${dealData.payAmount} ${dealData.payCurrency} a las siguientes instrucciones:</strong></p>
          <p>Nombre: <i>LEMAD CAPITAL S.A.P.I. DE C.V. SOFOM E.N.R.</i><br></p>
          <p>Banco: <i>${dealData.bankName1}</i> / CLABE INTERBANCARIA: <i>${dealData.accountNumber1}</i> / Metodo: <i>${dealData.myPaymentMethod}</i> / Referencia de pago: ${dealData.dealNumber}</p>
        </div>

        <div class="legal-message">
          <p><strong><i>Aviso importante:</i></strong></p>
          <p><i>El presente documento es de carácter informativo y tiene como único propósito resumir las condiciones generales de la operación.</i></p>
          <p><i>Las condiciones definitivas, así como los derechos y obligaciones del Cliente, se encuentran establecidas en la <strong>Constancia de Disposición de Línea de Servicio</strong>, documento que se adjunta en el mismo correo y que prevalece para todos los efectos legales y regulatorios aplicables.</i></p>
          <p><i>En caso de cualquier diferencia, lo establecido en la Constancia de Disposición será lo que rija la operación.</i></p>
          <p><i>Lemad Capital, S.A.P.I. de C.V., SOFOM, E.N.R., es una Sociedad Financiera de Objeto Múltiple, Entidad No Regulada, constituida conforme a las leyes mexicanas, cuyo objeto consiste en la realización habitual y profesional de operaciones de crédito, en términos de la Ley General de Organizaciones y Actividades Auxiliares del Crédito, particularmente de su artículo 87-B, así como en cumplimiento de las disposiciones aplicables en materia de prevención de lavado de dinero.</i></p>
        </div>

        <footer class="page-footer">
          <p>PEDRO RAMIREZ VAZQUEZ 200-11 PISO 1 INT. A SAN PEDRO GARZA GARCÍA, N.L.</p>
          <p>Teléfono: 81-20-80-90-56 | <a href="www.lemadcapital.com">www.lemadcapital.com</a></p>
        </footer>

      </div>
    </body>
    </html>`;
}

  static loadCSS(template) {
    if (cssCache.has(template)) {
      return cssCache.get(template);
    }

    try {
      const cssPath = path.join(__dirname, '..', 'styles', `${template}.css`);
      const css = fs.readFileSync(cssPath, 'utf8');
      cssCache.set(template, css);
      return css;
    } catch (error) {
      console.warn(`Could not load CSS for template ${template}:`, error.message);
      return this.getFallbackCSS(template);
    }
  }

  static getFallbackCSS(template) {
    // Minimal fallback CSS
    if (template === 'monex') {
      return 'body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }';
    }
    if (template === 'xending') {
      return 'body { font-family: "Segoe UI", sans-serif; font-size: 11px; margin: 20px; color: #2c3e50; }';
    }
    return 'body { font-family: Arial, sans-serif; margin: 20px; }';
  }

  static generateLogoHTML(logoData) {
    if (!logoData) {
      // Logo por defecto (Xending Capital SVG)
      return `
                <div class="xending-logo">
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
                    
                    <!-- Outer ring segments -->
                    <path d="M 50 10 A 40 40 0 0 1 85.36 35.36 L 71.21 28.79 A 25 25 0 0 0 50 25 Z" fill="url(#gradient1)" />
                    <path d="M 85.36 35.36 A 40 40 0 0 1 85.36 64.64 L 71.21 71.21 A 25 25 0 0 0 71.21 28.79 Z" fill="url(#gradient1)" />
                    <path d="M 85.36 64.64 A 40 40 0 0 1 50 90 L 50 75 A 25 25 0 0 0 71.21 71.21 Z" fill="url(#gradient2)" />
                    <path d="M 50 90 A 40 40 0 0 1 14.64 64.64 L 28.79 71.21 A 25 25 0 0 0 50 75 Z" fill="url(#gradient2)" />
                    <path d="M 14.64 64.64 A 40 40 0 0 1 14.64 35.36 L 28.79 28.79 A 25 25 0 0 0 28.79 71.21 Z" fill="url(#gradient2)" />
                    <path d="M 14.64 35.36 A 40 40 0 0 1 50 10 L 50 25 A 25 25 0 0 0 28.79 28.79 Z" fill="url(#gradient1)" />
                  </svg>
                  <span class="logo-text">Xending Capital</span>
                </div>
            `;
    }

    // Si logoData es una string base64
    if (typeof logoData === 'string' && logoData.startsWith('data:image/')) {
      return `
                <div class="custom-logo">
                  <img src="${logoData}" alt="Logo" class="logo-image" />
                </div>
            `;
    }

    // Si logoData es un objeto con más opciones
    if (typeof logoData === 'object') {
      const { src, text, width = '40px', height = '40px' } = logoData;

      if (src) {
        return `
                    <div class="custom-logo">
                      <img src="${src}" alt="Logo" class="logo-image" style="width: ${width}; height: ${height};" />
                      ${text ? `<span class="logo-text">${text}</span>` : ''}
                    </div>
                `;
      }
    }

    // Fallback al logo por defecto
    return this.generateLogoHTML(null);
  }
}

module.exports = TemplateService;
