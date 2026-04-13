const axios = require('axios');
const fs = require('fs');

async function testAPIModifications() {
    const baseURL = 'http://localhost:3002';
    
    console.log('🌐 Probando modificaciones de PDF via API...\n');
    
    try {
        // Verificar que el servidor esté corriendo
        console.log('1️⃣ Verificando servidor...');
        const healthResponse = await axios.get(`${baseURL}/health`);
        console.log('✅ Servidor activo:', healthResponse.data);
        
        // Leer un PDF existente
        const pdfPath = 'xending-template-xending.pdf';
        if (!fs.existsSync(pdfPath)) {
            console.log('❌ PDF no encontrado. Ejecuta primero el test de Xending.');
            return;
        }
        
        console.log(`\n2️⃣ Leyendo PDF: ${pdfPath}`);
        const pdfBuffer = fs.readFileSync(pdfPath);
        const pdfBase64 = pdfBuffer.toString('base64');
        console.log(`✅ PDF cargado: ${Math.round(pdfBuffer.length/1024)}KB`);
        
        // Definir modificaciones
        const modifications = [
            {
                type: 'stamp',
                text: 'PROCESADO VIA API',
                position: 'top-right',
                size: 12
            },
            {
                type: 'text',
                text: `Modificado via API - ${new Date().toLocaleString()}`,
                x: 50,
                y: 30,
                size: 8,
                color: { r: 0, g: 0, b: 1 }
            },
            {
                type: 'watermark',
                text: 'API DEMO',
                size: 40
            }
        ];
        
        console.log('\n3️⃣ Enviando PDF para modificación...');
        const startTime = Date.now();
        
        const response = await axios.post(`${baseURL}/modify-pdf`, {
            pdfBase64: pdfBase64,
            modifications: modifications
        }, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ PDF modificado en ${duration}ms`);
        console.log(`📄 Tamaño resultado: ${Math.round(response.data.length/1024)}KB`);
        
        // Guardar PDF modificado
        const outputFile = 'xending-modified-via-api.pdf';
        fs.writeFileSync(outputFile, response.data);
        console.log(`💾 Guardado como: ${outputFile}`);
        
        // Comparar tamaños
        const originalSize = pdfBuffer.length;
        const modifiedSize = response.data.length;
        const sizeDiff = ((modifiedSize - originalSize) / originalSize * 100).toFixed(1);
        
        console.log('\n📊 COMPARACIÓN:');
        console.log(`   Original: ${Math.round(originalSize/1024)}KB`);
        console.log(`   Modificado: ${Math.round(modifiedSize/1024)}KB`);
        console.log(`   Diferencia: ${sizeDiff > 0 ? '+' : ''}${sizeDiff}%`);
        
        console.log('\n✨ MODIFICACIONES APLICADAS:');
        modifications.forEach((mod, index) => {
            console.log(`   ${index + 1}. ${mod.type.toUpperCase()}: ${mod.text || 'Elemento gráfico'}`);
        });
        
        console.log('\n🚀 ¡Modificación via API completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

// Ejecutar el test
testAPIModifications();