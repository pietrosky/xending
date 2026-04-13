const PDFGenerator = require('./src/services/PDFGenerator');
const LogoHelper = require('./src/utils/LogoHelper');
const fs = require('fs');

async function testWithCustomLogo() {
    try {
        // Ejemplo 1: Logo como base64 string
        const logoBase64 = LogoHelper.imageToBase64('./src/utils/Xending.png');
        
        const dealDataWithLogo = {
            dealNumber: 'CUSTOM-LOGO-001',
            clientName: 'Mi Empresa SA',
            tradeDate: '28-Sep-2025',
            buyAmount: '5,000.00',
            buyCurrency: 'USD',
            payAmount: '4,500.00',
            payCurrency: 'EUR',
            exchangeRate: '1.1111',
            // Logo como string base64
            logo: logoBase64
        };

        // Ejemplo 2: Logo como objeto con texto "Xending Capital Payments"
        const logoObject = LogoHelper.createLogoObject('./src/utils/Xending.png', {
            text: 'Xending Capital Payments',
            width: '50px',
            height: '50px'
        });

        const dealDataWithLogoObject = {
            ...dealDataWithLogo,
            dealNumber: 'CUSTOM-LOGO-002',
            logo: logoObject
        };

        // Generar PDF con logo personalizado
        if (logoBase64) {
            console.log('Generando PDF con logo personalizado...');
            const pdf1 = await PDFGenerator.generateDealConfirmation('monex', dealDataWithLogo);
            fs.writeFileSync('test-custom-logo.pdf', pdf1);
            console.log('PDF generado: test-custom-logo.pdf');
            
            const pdf2 = await PDFGenerator.generateDealConfirmation('monex', dealDataWithLogoObject);
            fs.writeFileSync('test-custom-logo-with-text.pdf', pdf2);
            console.log('PDF generado: test-custom-logo-with-text.pdf');
        } else {
            console.log('No se pudo cargar el logo, generando con logo por defecto...');
            const pdf3 = await PDFGenerator.generateDealConfirmation('monex', dealDataWithLogo);
            fs.writeFileSync('test-default-logo.pdf', pdf3);
            console.log('PDF generado: test-default-logo.pdf');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

// Ejecutar el test
testWithCustomLogo();