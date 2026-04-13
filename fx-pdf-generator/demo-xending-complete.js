const axios = require('axios');
const LogoHelper = require('./src/utils/LogoHelper');
const fs = require('fs');

async function demoXendingComplete() {
    const baseURL = 'http://localhost:3002';
    
    console.log('🌟 DEMO COMPLETO DE Xending Capital PDF GENERATOR 🌟\n');
    
    try {
        // Preparar logo de Xending
        console.log('🎨 Preparando logo de Xending Capital...');
        const xendingLogo = LogoHelper.createLogoObject('./src/utils/Xending.png', {
            text: 'Xending Capital',
            width: '70px',
            height: '70px'
        });
        
        if (xendingLogo) {
            const logoInfo = LogoHelper.getLogoInfo(xendingLogo);
            console.log(`✅ Logo cargado: ${logoInfo.format.toUpperCase()}, ${Math.round(logoInfo.size/1024)}KB`);
        }

        // Datos de ejemplo para diferentes tipos de transacciones
        const transactions = [
            {
                name: 'Transacción Spot USD→MXN',
                data: {
                    dealNumber: 'XG-SPOT-001',
                    clientName: 'IMPORTADORA MEXICANA SA DE CV',
                    clientAddress: 'AV. REFORMA 456<br>COL. JUAREZ, CDMX 06600<br>MEXICO',
                    dealType: 'Spot',
                    buyCurrency: 'USD',
                    buyAmount: '100,000.00',
                    exchangeRate: '17.8500',
                    payCurrency: 'MXN',
                    payAmount: '1,785,000.00',
                    feeText: 'MXN 2,500.00 (Xending Fee)',
                    totalDue: '1,787,500.00',
                    logo: xendingLogo
                }
            },
            {
                name: 'Transacción Forward EUR→MXN',
                data: {
                    dealNumber: 'XG-FWD-002',
                    clientName: 'EXPORTADORA EUROPEA MEXICO SA',
                    clientAddress: 'BLVD. AVILA CAMACHO 789<br>LOMAS DE CHAPULTEPEC, CDMX<br>MEXICO',
                    dealType: 'Forward (30 days)',
                    buyCurrency: 'EUR',
                    buyAmount: '75,000.00',
                    exchangeRate: '19.2500',
                    payCurrency: 'MXN',
                    payAmount: '1,443,750.00',
                    feeText: 'MXN 3,000.00 (Forward Premium + Fee)',
                    totalDue: '1,446,750.00',
                    logo: xendingLogo
                }
            },
            {
                name: 'Transacción Corporativa GBP→MXN',
                data: {
                    dealNumber: 'XG-CORP-003',
                    clientName: 'BRITISH INVESTMENTS MEXICO LTD',
                    clientAddress: 'TORRE CORPORATIVA<br>SANTA FE, CDMX 01210<br>MEXICO',
                    dealType: 'Corporate Deal',
                    buyCurrency: 'GBP',
                    buyAmount: '50,000.00',
                    exchangeRate: '22.1500',
                    payCurrency: 'MXN',
                    payAmount: '1,107,500.00',
                    feeText: 'MXN 1,800.00 (Corporate Rate Fee)',
                    totalDue: '1,109,300.00',
                    logo: xendingLogo
                }
            }
        ];

        console.log(`\n📊 Generando ${transactions.length} PDFs de demostración...\n`);

        const results = [];
        
        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];
            console.log(`${i + 1}️⃣ ${transaction.name}...`);
            
            const startTime = Date.now();
            
            try {
                const response = await axios.post(`${baseURL}/generate-pdf/xending`, transaction.data, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                const filename = `demo-xending-${i + 1}-${transaction.data.dealType.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`;
                fs.writeFileSync(filename, response.data);
                
                results.push({
                    name: transaction.name,
                    filename,
                    size: response.data.length,
                    duration,
                    dealNumber: transaction.data.dealNumber,
                    amount: `${transaction.data.buyCurrency} ${transaction.data.buyAmount}`,
                    total: `${transaction.data.payCurrency} ${transaction.data.totalDue}`
                });
                
                console.log(`   ✅ Generado en ${duration}ms - ${Math.round(response.data.length/1024)}KB`);
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }

        // Resumen final
        console.log('\n🎯 RESUMEN DE LA DEMOSTRACIÓN:');
        console.log('=' .repeat(80));
        
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.name}`);
            console.log(`   📄 Archivo: ${result.filename}`);
            console.log(`   💰 Transacción: ${result.amount} → ${result.total}`);
            console.log(`   ⚡ Tiempo: ${result.duration}ms`);
            console.log(`   📦 Tamaño: ${Math.round(result.size/1024)}KB`);
            console.log('');
        });

        // Estadísticas
        const totalSize = results.reduce((sum, r) => sum + r.size, 0);
        const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
        const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

        console.log('📈 ESTADÍSTICAS:');
        console.log(`   Total de PDFs generados: ${results.length}`);
        console.log(`   Tiempo total: ${totalDuration}ms`);
        console.log(`   Tiempo promedio: ${Math.round(avgDuration)}ms por PDF`);
        console.log(`   Tamaño total: ${Math.round(totalSize/1024)}KB`);
        console.log(`   Tamaño promedio: ${Math.round(totalSize/results.length/1024)}KB por PDF`);

        console.log('\n✨ CARACTERÍSTICAS DEL TEMPLATE DE XENDING:');
        console.log('   🎨 Diseño moderno con gradientes y colores corporativos');
        console.log('   🏢 Logo personalizado de Xending Capital');
        console.log('   📋 Información completa de transacciones FX');
        console.log('   🏦 Detalles bancarios específicos de México');
        console.log('   📍 Oficinas en CDMX, Guadalajara y Monterrey');
        console.log('   ⚡ Generación optimizada con browser pool');

        console.log('\n🚀 ¡DEMOSTRACIÓN COMPLETADA EXITOSAMENTE!');
        console.log('   Todos los PDFs están listos para revisión');
        
    } catch (error) {
        console.error('❌ Error en la demostración:', error.message);
    }
}

// Ejecutar la demostración
demoXendingComplete();