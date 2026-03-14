const fs = require('fs');
const path = require('path');

// Cache for CSS files
const cssCache = new Map();

class TemplateService {
  static getAvailablePartners() {
    return ['monex', 'xending', 'generic', 'promoter-report', 'xending-consolidated']; // Add more partners as needed
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
              <div class="address">
                ${dealData.clientAddress || 'EL ZAR 3344<br>SAN NICOLAS DE LOS<br>GARZA,NUEVO LEON,Mexico'}
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
                <span class="value">${dealData.relManager || 'Xending Global'}</span>
              </div>
              <div class="field-row">
                <span class="label">FX Dealer:</span>
                <span class="value">${dealData.fxDealer || 'Adam Kane'}</span>
              </div>
              <div class="field-row">
                <span class="label">Processor:</span>
                <span class="value">${dealData.processor || 'Xending Global'}</span>
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
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Xending Global - Deal Confirmation</title>
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
              <p><strong>Xending Global Payments</strong></p>
              <p>Your trusted partner for international</p>
              <p>foreign exchange transactions</p>
              <p>Please review this confirmation carefully</p>
            </div>
            <div class="qr-section">
              <div class="qr-code">
                <div class="qr-placeholder">QR</div>
              </div>
            </div>
          </div>

          <!-- Deal header info -->
          <div class="deal-header">
            <div class="deal-number">Deal No. ${dealData.dealNumber || 'XENDING-GLOBAL-001'}</div>
            <div class="contact-info">
              <span>www.xendingglobal.com</span>
              <span>T: +52 55.1234.5678</span>
              <span>E: deals@xendingglobal.com</span>
            </div>
          </div>

          <!-- Deal confirmation banner -->
          <div class="confirmation-banner">
            XENDING GLOBAL - DEAL CONFIRMATION
          </div>

          <!-- Client and deal info -->
          <div class="info-section">
            <div class="left-column">
              <div class="field-row">
                <span class="label">Client:</span>
                <span class="value">${dealData.clientName || 'XENDING GLOBAL PAYMENTS SA DE CV'}</span>
              </div>
              <div class="address">
                ${dealData.clientAddress || 'TORRE XENDING 123<br>CIUDAD DE MEXICO, CDMX<br>MEXICO'}
              </div>
              <div class="field-row">
                <span class="label">Booked By:</span>
                <span class="value">${dealData.bookedBy || 'XendingGlobalAPI_System'}</span>
              </div>
              <div class="field-row">
                <span class="label">Account #:</span>
                <span class="value">${dealData.accountNumber || 'XG001234'}</span>
              </div>
              <div class="field-row">
                <span class="label">Remarks:</span>
                <span class="value">${dealData.remarks || 'Processed by Xending Global Platform'}</span>
              </div>
            </div>
            <div class="right-column">
              <div class="field-row">
                <span class="label">Trade Date:</span>
                <span class="value">${dealData.tradeDate || new Date().toLocaleDateString('en-GB')}</span>
              </div>
              <div class="field-row">
                <span class="label">Deal Type:</span>
                <span class="value">${dealData.dealType || 'Spot'}</span>
              </div>
              <div class="field-row">
                <span class="label">Rel Manager:</span>
                <span class="value">${dealData.relManager || 'Xending Global Team'}</span>
              </div>
              <div class="field-row">
                <span class="label">FX Dealer:</span>
                <span class="value">${dealData.fxDealer || 'Xending FX Desk'}</span>
              </div>
              <div class="field-row">
                <span class="label">Processor:</span>
                <span class="value">${dealData.processor || 'Xending Global Platform'}</span>
              </div>
            </div>
          </div>

          <!-- Transaction details -->
          <div class="transaction-banner">
            TRANSACTION DETAILS
          </div>

          <div class="transaction-table">
            <div class="transaction-header">
              <div class="col-left">${dealData.clientName || 'Client'}<br>Buys</div>
              <div class="col-center">Exchange<br>Rate</div>
              <div class="col-right">${dealData.clientName || 'Client'}<br>Pays</div>
            </div>
            <div class="transaction-row">
              <div class="col-left">${dealData.buyCurrency || 'USD'} ${dealData.buyAmount || '25,000.00'}</div>
              <div class="col-center">${dealData.exchangeRate || '17.8500'}</div>
              <div class="col-right">${dealData.payCurrency || 'MXN'} ${dealData.payAmount || '446,250.00'}<br>${dealData.feeText || 'MXN 500.00 (Processing Fee)'}</div>
            </div>
            <div class="total-row">
              <div class="total-label">Total Due (${dealData.payCurrency || 'MXN'}):</div>
              <div class="total-amount">${dealData.totalDue || '446,750.00'}</div>
            </div>
          </div>

          <!-- Payment instructions -->
          <div class="payment-banner">
            PAYMENT INSTRUCTIONS
          </div>

          <div class="payment-section">
            <div class="payment-block">
              <div class="payment-header">${dealData.clientName || 'Client'}</div>
              <div class="payment-details">
                <p>to pay <strong>Xending Global ${dealData.payCurrency || 'MXN'}</strong></p>
                <p><strong>${dealData.totalDue || '446,750.00'}</strong> by Electronic Wire</p>
                <p>transfer on <strong>${dealData.transferDate || new Date().toLocaleDateString('en-GB')}</strong> to:</p>
                <br>
                <p>Payment must be received for</p>
                <p>Xending Global to process the currency exchange.</p>
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
                  <span class="value">${dealData.accountName1 || 'Xending Global Payments'}</span>
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
                  <span class="value">${dealData.byOrderOf1 || dealData.clientName || 'XENDING GLOBAL PAYMENTS SA DE CV'}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer with Xending offices -->
          <div class="footer">
            <div class="office">
              <strong>Mexico City</strong><br>
              Torre Xending, Av. Reforma 123<br>
              Ciudad de Mexico, CDMX 01000<br>
              +52 55.1234.5678 phone
            </div>
            <div class="office">
              <strong>Guadalajara</strong><br>
              Centro Xending, Av. Americas 456<br>
              Guadalajara, JAL 44100<br>
              +52 33.8765.4321 phone
            </div>
            <div class="office">
              <strong>Monterrey</strong><br>
              Plaza Xending, Av. Constitucion 789<br>
              Monterrey, NL 64000<br>
              +52 81.2468.1357 phone
            </div>
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
      // Logo por defecto (Xending Global SVG)
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
                  <span class="logo-text">Xending Global</span>
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

  // ==== PROMOTER REPORT TEMPLATE ====
  static generatePromoterReportHTML(data) {
    const companies = data.companies || [];
    const brokerCompanies = data.brokerCompanies || [];

    // Load Xending Logo
    let xendingLogo = null;
    try {
      const logoPath = path.join(__dirname, '../utils/Xending.png');
      if (fs.existsSync(logoPath)) {
        const imgData = fs.readFileSync(logoPath).toString('base64');
        xendingLogo = {
          src: `data:image/png;base64,${imgData}`,
          text: 'Xending Global Payments',
          height: '60px',
          width: 'auto'
        };
      }
    } catch (e) {
      console.warn("Could not load Xending.png logo:", e.message);
    }

    // Calculate totals
    const totalOps = companies.reduce((sum, c) => sum + (c.operations || 0), 0);
    const calculatedTotalCommission = companies.reduce((sum, c) => sum + (c.commission || 0), 0);

    const companyRows = companies.map(c => `
      <div class="transaction-row">
        <div class="col-left" style="text-align: left; flex: 2; padding-left: 15px;">${c.name}</div>
        <div class="col-center" style="flex: 1; color: #2c3e50;">${c.operations || 0}</div>
        <div class="col-center" style="flex: 1; color: #2c3e50;">$${(c.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="col-right" style="flex: 1; color: #00d4aa; padding-right: 15px;">$${(c.commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
    `).join('');

    const brokerRows = brokerCompanies.map(c => `
      <div class="transaction-row">
        <div class="col-left" style="text-align: left; flex: 3; padding-left: 15px;">${c.name}</div>
        <div class="col-right" style="flex: 1; color: #e67e22; padding-right: 15px;">+$${(c.commission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Comisiones - ${data.promoterName || 'Promotor'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #2c3e50;
            background: white;
          }
          
          .container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 12mm;
          }
          
          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #00d4aa;
          }
          
          .logo-section { flex: 1; display: flex; align-items: center; gap: 12px; }
          .custom-logo { display: flex; align-items: center; gap: 10px; }
          .logo-image { max-height: 55px; width: auto; }
          .logo-text { font-size: 22px; font-weight: 700; color: #334155; margin-left: 8px; font-family: 'Segoe UI', sans-serif; }
          
          .header-text {
            text-align: right;
            font-size: 10px;
            color: #7f8c8d;
            font-style: italic;
          }
          
          /* Banner */
          .confirmation-banner {
            background: linear-gradient(135deg, #00d4aa 0%, #008b8b 100%);
            color: white;
            padding: 12px 20px;
            font-weight: 700;
            font-size: 16px;
            margin-bottom: 20px;
            border-radius: 6px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          /* Info Section */
          .info-section {
            display: flex;
            gap: 40px;
            margin-bottom: 25px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #00d4aa;
          }
          
          .column { flex: 1; }
          .field-row { margin-bottom: 10px; display: flex; }
          .label { font-weight: 600; width: 120px; flex-shrink: 0; color: #34495e; }
          .value { flex: 1; color: #2c3e50; font-weight: 500; }
          
          /* Table Section */
          .transaction-banner {
            background: linear-gradient(135deg, #34495e 0%, #2c3e50 100%);
            color: white;
            padding: 10px 20px;
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 10px;
            border-radius: 6px;
            text-align: center;
            text-transform: uppercase;
          }
          
          .transaction-table {
            border: 2px solid #e9ecef;
            margin-bottom: 25px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          
          .transaction-header {
            display: flex;
            background: linear-gradient(135deg, #ecf0f1 0%, #bdc3c7 100%);
            border-bottom: 2px solid #bdc3c7;
            font-weight: 700;
            color: #2c3e50;
            font-size: 11px;
            text-transform: uppercase;
          }
          
          .transaction-row {
            display: flex;
            background: white;
            border-bottom: 1px solid #e9ecef;
          }
          .transaction-row:last-child { border-bottom: none; }
          
          .col-left, .col-center, .col-right {
            padding: 12px 15px;
            text-align: center;
            border-right: 1px solid #e9ecef;
          }
          .col-right { border-right: none; }
          
          .total-row {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            background: linear-gradient(135deg, #00d4aa 0%, #008b8b 100%);
            color: white;
            padding: 12px 20px;
            font-weight: 700;
            font-size: 14px;
          }
          
          /* Payment/Brokerage Section */
          .payment-banner {
            background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
            color: white;
            padding: 10px 20px;
            font-weight: 700;
            font-size: 14px;
            margin-bottom: 15px;
            border-radius: 6px;
            text-align: center;
            text-transform: uppercase;
          }
          
          /* Footer */
          .footer {
            display: flex;
            justify-content: space-between;
            border-top: 3px solid #00d4aa;
            padding-top: 20px;
            margin-top: 35px;
            font-size: 9px;
            background: linear-gradient(135deg, #f8f9fa 0%, #ecf0f1 100%);
            padding: 20px;
            border-radius: 8px;
            color: #7f8c8d;
          }
          .office { flex: 1; text-align: center; }
          .office strong { font-size: 10px; color: #2c3e50; display: block; margin-bottom: 5px; }

          .confidential-mark {
            text-align: center;
            margin-top: 20px;
            font-size: 9px;
            color: #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          
          <!-- Header -->
          <div class="header">
            <div class="logo-section">
              ${this.generateLogoHTML(xendingLogo)}
            </div>
            <div class="header-text">
               Xending Global Payments<br>
               Your trusted partner for international<br>
               foreign exchange transactions
            </div>
          </div>
          
          <!-- Main Title Banner -->
          <div class="confirmation-banner">
            REPORTE DE COMISIONES
          </div>
          
          <!-- Info Section -->
          <div class="info-section">
            <div class="column">
              <div class="field-row">
                <span class="label">Promotor:</span>
                <span class="value" style="font-size: 13px;">${data.promoterName || 'Promotor'}</span>
              </div>
              <div class="field-row">
                <span class="label">Periodo:</span>
                <span class="value">${data.period || 'Mes Actual'}</span>
              </div>
              <div class="field-row">
                <span class="label">ID Reporte:</span>
                <span class="value">${Date.now().toString().slice(-8)}</span>
              </div>
            </div>
            <div class="column">
              <div class="field-row">
                <span class="label">Rate Comisión:</span>
                <span class="value">${((data.commissionRate || 0) * 100).toFixed(0)}%</span>
              </div>
              <div class="field-row">
                <span class="label">Total Operaciones:</span>
                <span class="value">${totalOps}</span>
              </div>
              <div class="field-row">
                <span class="label">Fecha:</span>
                <span class="value">${new Date().toLocaleDateString('es-MX')}</span>
              </div>
            </div>
          </div>
          
          <!-- Companies Table -->
          <div class="transaction-banner">
            Desglose de Comisiones Directas
          </div>
          
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
              <span style="padding-right: 15px;">$${calculatedTotalCommission.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
               
          ${brokerCompanies.length > 0 ? `
          <div class="payment-banner">
            Ganancias por Brokeraje (Adicional)
          </div>
          
          <div class="transaction-table" style="border-color: #e67e22;">
            <div class="transaction-header" style="background: linear-gradient(135deg, #fce4ce 0%, #fbeddb 100%); border-bottom-color: #e67e22;">
              <div class="col-left" style="flex: 3; text-align: left; color: #d35400; padding-left: 15px;">Empresa / Origen</div>
              <div class="col-right" style="flex: 1; color: #d35400; padding-right: 15px;">Comisión Broker</div>
            </div>
            
            ${brokerRows}
            
            <div class="total-row" style="background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);">
              <span style="margin-right: 20px;">TOTAL BROKERAJE:</span>
              <span style="padding-right: 15px;">+$${(data.brokerCommission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          ` : ''}

           <!-- Gran Total Summary -->
           <div class="info-section" style="background: #e0f2f1; border-color: #00897b; align-items: center; justify-content: space-between;">
              <div style="font-size: 14px; font-weight: 700; color: #00695c;">TOTAL A PAGAR (NETO):</div>
              <div style="font-size: 24px; font-weight: 800; color: #004d40;">$${(data.totalCommission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
           </div>

          <!-- Footer -->
          <div class="footer">
            <div class="office">
              <strong>Mexico City</strong><br>
              Torre Xending, Av. Reforma 123<br>
              Ciudad de Mexico, CDMX 01000<br>
              +52 55.1234.5678 phone
            </div>
            <div class="office">
              <strong>Guadalajara</strong><br>
              Centro Xending, Av. Americas 456<br>
              Guadalajara, JAL 44100<br>
              +52 33.8765.4321 phone
            </div>
            <div class="office">
              <strong>Monterrey</strong><br>
              Plaza Xending, Av. Constitucion 789<br>
              Monterrey, NL 64000<br>
              +52 81.2468.1357 phone
            </div>
          </div>
          
          <div class="confidential-mark">
            Xending Global Payments • Confidential Document
          </div>
          
        </div>
      </body>
      </html>
    `;
  }
  // ==== XENDING CONSOLIDATED REPORT TEMPLATE ====
  static generateXendingConsolidatedHTML(data) {
    const promoters = data.promoters || []; // Expecting list of promoter summaries
    const totalRevenue = promoters.reduce((sum, p) => sum + (p.totalRevenue || 0), 0);
    const totalPromoterComm = promoters.reduce((sum, p) => sum + (p.totalCommission || 0), 0);
    const totalBrokerComm = promoters.reduce((sum, p) => sum + (p.brokerCommission || 0), 0);
    const totalXendingProfit = promoters.reduce((sum, p) => sum + (p.xendingProfit || 0), 0);
    const totalPayout = promoters.reduce((sum, p) => sum + (p.netCommission || 0), 0);

    // Cargar logo en base64 (reutilizamos lógica)
    let xendingLogo = null;
    try {
      const logoPath = path.join(__dirname, '../utils/Xending.png');
      if (fs.existsSync(logoPath)) {
        const imgData = fs.readFileSync(logoPath).toString('base64');
        xendingLogo = {
          src: `data:image/png;base64,${imgData}`,
          text: 'Xending Global Payments',
          height: '60px',
          width: 'auto'
        };
      }
    } catch (e) {
      console.warn("Could not load Xending.png logo:", e.message);
    }

    const promoterRows = promoters.map(p => `
      <div class="transaction-row">
        <div class="col-left" style="text-align: left; flex: 3; padding-left: 15px; font-weight: 600;">${p.name}</div>
        <div class="col-center" style="flex: 2; color: #64748b;">$${(p.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="col-center" style="flex: 2; color: #e67e22;">$${(p.xendingProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div class="col-right" style="flex: 2; color: #00d4aa; padding-right: 15px; font-weight: 700;">$${(p.netCommission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte Consolidado - Xending Global</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11px;
            line-height: 1.4;
            color: #2c3e50;
            background: white;
          }
          
          .container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            padding: 12mm;
          }
          
          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #00d4aa;
          }
          
          .logo-section { flex: 1; display: flex; align-items: center; gap: 12px; }
          .custom-logo { display: flex; align-items: center; gap: 10px; }
          .logo-image { max-height: 55px; width: auto; }
          .logo-text { font-size: 22px; font-weight: 700; color: #334155; margin-left: 8px; font-family: 'Segoe UI', sans-serif; }
          
          .header-text {
            text-align: right;
            font-size: 10px;
            color: #7f8c8d;
            font-style: italic;
          }
          
          /* Banner */
          .confirmation-banner {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 12px 20px;
            font-weight: 700;
            font-size: 16px;
            margin-bottom: 20px;
            border-radius: 6px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            justify-content: space-between;
          }
          
          /* Summary Boxes */
           .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-box {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
          }
          .summary-box.highlight {
            background: #f0fdf4;
            border-color: #00d4aa;
          }
           .box-label { font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 5px; font-weight: 700; }
           .box-value { font-size: 16px; font-weight: 700; color: #1e293b; font-family: Consolas, monospace; }
          
          /* Table Section */
          .transaction-table {
            border: 2px solid #e9ecef;
            margin-bottom: 25px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }
          
          .transaction-header {
            display: flex;
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-bottom: 2px solid #cbd5e1;
            font-weight: 700;
            color: #475569;
            font-size: 11px;
            text-transform: uppercase;
            padding: 10px 0;
          }
          
          .transaction-row {
            display: flex;
            background: white;
            border-bottom: 1px solid #e9ecef;
            padding: 12px 0;
            align-items: center;
          }
          .transaction-row:last-child { border-bottom: none; }
          
          .col-left, .col-center, .col-right {
            text-align: center;
          }
          
           .total-row {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: white;
            padding: 15px 20px;
            font-weight: 700;
            font-size: 14px;
          }

          /* Footer */
          .footer {
            display: flex;
            justify-content: space-between;
            border-top: 3px solid #00d4aa;
            padding-top: 20px;
            margin-top: 35px;
            font-size: 9px;
            color: #7f8c8d;
          }
          .office { flex: 1; text-align: center; }
          .office strong { font-size: 10px; color: #2c3e50; display: block; margin-bottom: 5px; }
          
          .confidential-mark {
            text-align: center;
            margin-top: 20px;
            font-size: 9px;
            color: #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          
          <!-- Header -->
          <div class="header">
            <div class="logo-section">
              ${this.generateLogoHTML(xendingLogo)}
            </div>
            <div class="header-text">
               Xending Global Payments<br>
               Internal Management Report
            </div>
          </div>
          
          <!-- Main Title Banner -->
          <div class="confirmation-banner">
            <span>Reporte Mensual Consolidado</span>
            <span>${data.period || 'Periodo Actual'}</span>
          </div>

          <!-- Summary Boxes -->
          <div class="summary-grid">
             <div class="summary-box">
               <div class="box-label">Total Revenue</div>
               <div class="box-value">$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
             </div>
             <div class="summary-box">
               <div class="box-label">Total Comisiones</div>
               <div class="box-value text-red-600" style="color: #ef4444;">-$${(totalPromoterComm + totalBrokerComm).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
             </div>
             <div class="summary-box highlight">
               <div class="box-label">Xending Profit (Gross)</div>
               <div class="box-value">$${totalXendingProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
             </div>
             <div class="summary-box" style="background: #f0f9ff; border-color: #0ea5e9;">
               <div class="box-label">Net Payout (Total)</div>
               <div class="box-value" style="color: #0284c7;">$${totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
             </div>
          </div>
          
          <!-- Promoters Table -->
          <div style="margin-bottom: 10px; font-weight: 700; text-transform: uppercase; color: #475569; border-left: 4px solid #00d4aa; padding-left: 10px;">
            Resumen por Promotor
          </div>
          
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
              <span style="padding-right: 15px;">$${totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <!-- Footer Offices -->
          <div class="footer">
            <div class="office">
              <strong>Mexico City</strong><br>
              Torre Xending, Av. Reforma 123
            </div>
            <div class="office">
              <strong>Guadalajara</strong><br>
              Centro Xending, Av. Americas 456
            </div>
            <div class="office">
              <strong>Monterrey</strong><br>
              Plaza Xending, Av. Constitucion 789
            </div>
          </div>
          
          <div class="confidential-mark">
            Xending Global Payments • CONFIDENTIAL • INTERNAL USE ONLY
          </div>
          
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = TemplateService;