const axios = require('axios');
const LogoHelper = require('./src/utils/LogoHelper');
const fs = require('fs');

async function testXendingPDF() {
    const baseURL = 'http://localhost:3002';
    
    console.log('🧪 Generando PDF de Xending Capital con logo optimizado...\n');
    
    try {
        // Crear logo de Xending
        console.log('1️⃣ Preparando logo de Xending...');
        const xendingLogo = LogoHelper.createLogoObject('./src/utils/Xending.png', {
            text: 'Xending Capital',
            width: '60px',
            height: '60px'
        });
        
        if (!xendingLogo) {
            console.warn('⚠️  No se pudo cargar el logo, usando logo por defecto');
        } else {
            console.log('✅ Logo de Xending cargado correctamente');
            const logoInfo = LogoHelper.getLogoInfo(xendingLogo);
            console.log(`   Formato: ${logoInfo.format}, Tamaño: ${Math.round(logoInfo.size/1024)}KB`);
        }

        // Datos del deal para Xending
        const xendingDealData = {
            dealNumber: 'XENDING-GLOBAL-001',
            clientName: 'Xending Capital PAYMENTS SA DE CV',
            clientAddress: 'TORRE XENDING 123<br>CIUDAD DE MEXICO, CDMX<br>MEXICO',
            bookedBy: 'XendingGlobalAPI_System',
            accountNumber: 'XG001234',
            remarks: 'Transacción procesada por Xending Capital',
            tradeDate: new Date().toLocaleDateString('en-GB'),
            dealType: 'Spot',
            relManager: 'Xending Capital Team',
            fxDealer: 'Xending FX Desk',
            processor: 'Xending Capital Platform',
            buyCurrency: 'USD',
            buyAmount: '25,000.00',
            exchangeRate: '17.8500',
            payCurrency: 'MXN',
            payAmount: '446,250.00',
            feeText: 'MXN 500.00 (Processing Fee)',
            totalDue: '446,750.00',
            transferDate: new Date().toLocaleDateString('en-GB'),
            accountNumber1: 'MX98765432109876543210',
            accountName1: 'Xending Capital Payments',
            accountAddress1: 'Torre Xending, Av. Reforma 123, CDMX, Mexico',
            swift1: 'XENDMX22',
            bankName1: 'Banco Xending Mexico',
            bankAddress1: 'Ciudad de Mexico, Mexico',
            byOrderOf1: 'Xending Capital PAYMENTS SA DE CV',
            logo: xendingLogo
        };

        // Generar PDF usando el servidor optimizado
        console.log('\n2️⃣ Generando PDF de Xending...');
        const startTime = Date.now();
        
        const response = await axios.post(`${baseURL}/generate-pdf/monex`, xendingDealData, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ PDF de Xending generado en ${duration}ms`);
        console.log(`📄 Tamaño: ${response.data.length} bytes (${Math.round(response.data.length/1024)}KB)`);
        
        // Guardar PDF
        const filename = 'xending-global-deal-confirmation.pdf';
        fs.writeFileSync(filename, response.data);
        console.log(`💾 Guardado como: ${filename}`);
        
        // Información adicional
        console.log('\n📊 INFORMACIÓN DEL PDF:');
        console.log(`   Cliente: ${xendingDealData.clientName}`);
        console.log(`   Deal: ${xendingDealData.dealNumber}`);
        console.log(`   Monto: ${xendingDealData.buyCurrency} ${xendingDealData.buyAmount}`);
        console.log(`   Tipo de cambio: ${xendingDealData.exchangeRate}`);
        console.log(`   Total: ${xendingDealData.payCurrency} ${xendingDealData.totalDue}`);
        
        if (xendingLogo) {
            console.log(`   Logo: Xending Capital incluido`);
        }
        
        console.log('\n🚀 ¡PDF de Xending Capital generado exitosamente!');
        
    } catch (error) {
        console.error('❌ Error generando PDF de Xending:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

// Ejecutar el test
testXendingPDF();