const PDFGenerator = require('./src/services/PDFGenerator');
const LogoHelper = require('./src/utils/LogoHelper');
const fs = require('fs');

async function testXendingLogo() {
    try {
        // Crear logo con texto "Xending Capital Payments"
        const xendingLogo = LogoHelper.createLogoObject('./src/utils/Xending.png', {
            text: 'Xending Capital Payments',
            width: '60px',
            height: '60px'
        });

        const dealData = {
            dealNumber: 'XENDING-001',
            clientName: 'Cliente Ejemplo',
            tradeDate: '28-Sep-2025',
            buyAmount: '10,000.00',
            buyCurrency: 'USD',
            payAmount: '9,000.00',
            payCurrency: 'EUR',
            exchangeRate: '1.1111',
            logo: xendingLogo
        };

        console.log('Generando PDF con logo de Xending Capital Payments...');
        const pdf = await PDFGenerator.generateDealConfirmation('monex', dealData);
        fs.writeFileSync('test-xending-logo.pdf', pdf);
        console.log('PDF generado exitosamente: test-xending-logo.pdf');
        
        // También mostrar información del logo
        const logoInfo = LogoHelper.getLogoInfo(xendingLogo);
        console.log('Información del logo:', logoInfo);

        // Forzar limpieza de memoria
        if (global.gc) {
            global.gc();
        }

        console.log('Test completado exitosamente');

    } catch (error) {
        console.error('Error generando PDF:', error);
        process.exit(1);
    } finally {
        // Asegurar que el proceso termine
        setTimeout(() => {
            console.log('Finalizando proceso...');
            process.exit(0);
        }, 1000);
    }
}

// Ejecutar el test
testXendingLogo();