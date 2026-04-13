const axios = require('axios');
const fs = require('fs');

// Test data for Monex PDF generation
const testData = {
  dealNumber: 'TEST-OPT-001',
  clientName: 'PRUEBA OPTIMIZACION SA DE CV',
  clientAddress: 'CALLE PRUEBA 123<br>CIUDAD PRUEBA, ESTADO<br>MEXICO',
  bookedBy: 'TestUser_Optimized',
  accountNumber: '999999',
  tradeDate: new Date().toLocaleDateString('en-GB'),
  dealType: 'Spot',
  relManager: 'Test Manager',
  fxDealer: 'Test Dealer',
  processor: 'Test Processor',
  buyCurrency: 'USD',
  buyAmount: '1,000.00',
  exchangeRate: '18.5000',
  payCurrency: 'MXN',
  payAmount: '18,500.00',
  feeText: 'MXN 50.00 (Fees)',
  totalDue: '18,550.00',
  transferDate: new Date().toLocaleDateString('en-GB'),
  accountNumber1: 'MX12345678901234567890',
  accountName1: 'Test Account',
  accountAddress1: 'Test Address 123, Test City',
  swift1: 'TESTMX22',
  bankName1: 'Test Bank Mexico',
  bankAddress1: 'Mexico City, Mexico',
  byOrderOf1: 'PRUEBA OPTIMIZACION SA DE CV'
};

async function testPDFGeneration() {
  const baseURL = 'http://localhost:3002';
  
  console.log('🧪 Iniciando prueba de generación de PDF optimizada...\n');
  
  try {
    // Test 1: Health check
    console.log('1️⃣ Verificando estado del servicio...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Servicio activo:', healthResponse.data);
    
    // Test 2: Get available partners
    console.log('\n2️⃣ Obteniendo partners disponibles...');
    const partnersResponse = await axios.get(`${baseURL}/partners`);
    console.log('✅ Partners:', partnersResponse.data.partners);
    
    // Test 3: Generate PDF (primera vez - inicialización del browser)
    console.log('\n3️⃣ Generando primer PDF (inicialización)...');
    const startTime1 = Date.now();
    
    const response1 = await axios.post(`${baseURL}/generate-pdf/monex`, testData, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const endTime1 = Date.now();
    const duration1 = endTime1 - startTime1;
    
    console.log(`✅ Primer PDF generado en ${duration1}ms`);
    console.log(`📄 Tamaño: ${response1.data.length} bytes`);
    
    // Save first PDF
    fs.writeFileSync('test-optimized-1.pdf', response1.data);
    console.log('💾 Guardado como: test-optimized-1.pdf');
    
    // Test 4: Generate PDF (segunda vez - debería ser más rápido)
    console.log('\n4️⃣ Generando segundo PDF (reutilizando browser)...');
    const startTime2 = Date.now();
    
    const response2 = await axios.post(`${baseURL}/generate-pdf/monex`, {
      ...testData,
      dealNumber: 'TEST-OPT-002',
      clientName: 'SEGUNDA PRUEBA SA DE CV'
    }, {
      responseType: 'arraybuffer',
      timeout: 30000
    });
    
    const endTime2 = Date.now();
    const duration2 = endTime2 - startTime2;
    
    console.log(`✅ Segundo PDF generado en ${duration2}ms`);
    console.log(`📄 Tamaño: ${response2.data.length} bytes`);
    
    // Save second PDF
    fs.writeFileSync('test-optimized-2.pdf', response2.data);
    console.log('💾 Guardado como: test-optimized-2.pdf');
    
    // Test 5: Multiple concurrent requests
    console.log('\n5️⃣ Probando 3 requests concurrentes...');
    const startTimeConcurrent = Date.now();
    
    const concurrentPromises = [];
    for (let i = 0; i < 3; i++) {
      concurrentPromises.push(
        axios.post(`${baseURL}/generate-pdf/monex`, {
          ...testData,
          dealNumber: `TEST-CONCURRENT-${i + 1}`,
          clientName: `CONCURRENTE ${i + 1} SA DE CV`
        }, {
          responseType: 'arraybuffer',
          timeout: 30000
        })
      );
    }
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const endTimeConcurrent = Date.now();
    const durationConcurrent = endTimeConcurrent - startTimeConcurrent;
    
    console.log(`✅ 3 PDFs concurrentes generados en ${durationConcurrent}ms`);
    console.log(`📊 Promedio por PDF: ${Math.round(durationConcurrent / 3)}ms`);
    
    // Save concurrent PDFs
    concurrentResults.forEach((result, index) => {
      fs.writeFileSync(`test-concurrent-${index + 1}.pdf`, result.data);
    });
    console.log('💾 PDFs concurrentes guardados');
    
    // Performance summary
    console.log('\n📊 RESUMEN DE RENDIMIENTO:');
    console.log(`   Primer PDF (inicialización): ${duration1}ms`);
    console.log(`   Segundo PDF (optimizado): ${duration2}ms`);
    console.log(`   Mejora de rendimiento: ${Math.round(((duration1 - duration2) / duration1) * 100)}%`);
    console.log(`   Concurrentes (promedio): ${Math.round(durationConcurrent / 3)}ms`);
    
    if (duration2 < 1000) {
      console.log('🚀 ¡Excelente! El sistema está optimizado correctamente');
    } else if (duration2 < 2000) {
      console.log('✅ Buen rendimiento, las optimizaciones funcionan');
    } else {
      console.log('⚠️  Rendimiento mejorable, revisar configuración');
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testPDFGeneration();