const axios = require('axios');
const LogoHelper = require('./src/utils/LogoHelper');
const fs = require('fs');

async function testXendingTemplate() {
    const baseURL = 'http://localhost:3002';
    
    console.log('🚀 Probando el nuevo template de Xending Capital...\n');
    
    try {
        // Verificar que el servidor esté corriendo
        console.log('1️⃣ Verificando servidor...');
        const healthResponse = await axios.get(`${baseURL}/health`);
        console.log('✅ Servidor activo:', healthResponse.data.service);
        
        // Verificar partners disponibles
        console.log('\n2️⃣ Verificando partners disponibles...');
        const partnersResponse = await axios.get(`${baseURL}/partners`);
        console.log('✅ Partners:', partnersResponse.data.partners);
        
        if (!partnersResponse.data.partners.includes('xending')) {
            console.log('⚠️  Partner "xending" no encontrado, usando "monex"');
        }
        
        // Preparar logo de Xending
        console.log('\n3️⃣ Preparando logo de Xending...');
        const xendingLogo = LogoHelper.createLogoObject('./src/utils/Xending.png', {
            text: 'Xending Capital',
            width: '70px',
            height: '70px'
        });
        
        if (xendingLogo) {
            console.log('✅ Logo cargado correctamente');
        } else {
            console.log('⚠️  Usando logo por defecto');
        }

        // Datos del deal para Xending
        const xendingDealData = {
            dealNumber: 'XG-2025-001',
            clientName: 'EMPRESA EJEMPLO MEXICO SA DE CV',
            clientAddress: 'AV. INSURGENTES SUR 1234<br>COL. DEL VALLE, CDMX 03100<br>MEXICO',
            bookedBy: 'XendingAPI_v2.0',
            accountNumber: 'XG789012',
            remarks: 'Transacción internacional - Xending Capital Platform',
            tradeDate: new Date().toLocaleDateString('en-GB'),
            dealType: 'Forward',
            relManager: 'Carlos Rodriguez - Xending',
            fxDealer: 'Maria Gonzalez - FX Desk',
            processor: 'Xending Capital Automated System',
            buyCurrency: 'EUR',
            buyAmount: '50,000.00',
            exchangeRate: '21.2500',
            payCurrency: 'MXN',
            payAmount: '1,062,500.00',
            feeText: 'MXN 1,250.00 (Xending Processing Fee)',
            totalDue: '1,063,750.00',
            transferDate: new Date(Date.now() + 24*60*60*1000).toLocaleDateString('en-GB'), // Tomorrow
            accountNumber1: 'MX12345678901234567890',
            accountName1: 'Xending Capital Payments SA de CV',
            accountAddress1: 'Torre Xending, Av. Paseo de la Reforma 123, Piso 15, CDMX 06600',
            swift1: 'XENDMX22XXX',
            bankName1: 'Banco Nacional de Mexico',
            bankAddress1: 'Ciudad de Mexico, CDMX, Mexico',
            byOrderOf1: 'EMPRESA EJEMPLO MEXICO SA DE CV',
            logo: xendingLogo
        };

        // Generar PDF con template de Xending
        console.log('\n4️⃣ Generando PDF con template de Xending...');
        const startTime = Date.now();
        
        const partner = partnersResponse.data.partners.includes('xending') ? 'xending' : 'monex';
        console.log(`   Usando partner: ${partner}`);
        
        const response = await axios.post(`${baseURL}/generate-pdf/${partner}`, xendingDealData, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ PDF generado en ${duration}ms`);
        console.log(`📄 Tamaño: ${Math.round(response.data.length/1024)}KB`);
        
        // Guardar PDF
        const filename = `xending-template-${partner}.pdf`;
        fs.writeFileSync(filename, response.data);
        console.log(`💾 Guardado como: ${filename}`);
        
        // Comparar con template anterior si existe
        if (fs.existsSync('xending-global-deal-confirmation.pdf')) {
            const oldSize = fs.statSync('xending-global-deal-confirmation.pdf').size;
            const newSize = response.data.length;
            const sizeDiff = ((newSize - oldSize) / oldSize * 100).toFixed(1);
            
            console.log(`\n📊 Comparación con template anterior:`);
            console.log(`   Anterior: ${Math.round(oldSize/1024)}KB`);
            console.log(`   Nuevo: ${Math.round(newSize/1024)}KB`);
            console.log(`   Diferencia: ${sizeDiff > 0 ? '+' : ''}${sizeDiff}%`);
        }
        
        // Información del deal
        console.log('\n📋 INFORMACIÓN DEL DEAL:');
        console.log(`   Deal Number: ${xendingDealData.dealNumber}`);
        console.log(`   Cliente: ${xendingDealData.clientName}`);
        console.log(`   Transacción: ${xendingDealData.buyCurrency} ${xendingDealData.buyAmount} → ${xendingDealData.payCurrency} ${xendingDealData.totalDue}`);
        console.log(`   Tipo de cambio: ${xendingDealData.exchangeRate}`);
        console.log(`   Tipo de deal: ${xendingDealData.dealType}`);
        console.log(`   Template usado: ${partner}`);
        
        console.log('\n🎉 ¡Template de Xending probado exitosamente!');
        
        if (partner === 'xending') {
            console.log('✨ Usando el nuevo template específico de Xending con diseño personalizado');
        } else {
            console.log('ℹ️  Usando template de Monex con datos de Xending (template específico no disponible)');
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

// Ejecutar el test
testXendingTemplate();