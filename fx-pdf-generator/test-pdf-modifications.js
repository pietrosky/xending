const PDFModifier = require('./src/services/PDFModifier');
const fs = require('fs');

async function testPDFModifications() {
    console.log('🔧 Probando modificaciones de PDF...\n');
    
    try {
        // Verificar que existe un PDF de Xending para modificar
        const originalPDF = 'xending-template-xending.pdf';
        
        if (!fs.existsSync(originalPDF)) {
            console.log('❌ No se encontró el PDF original. Ejecuta primero el test de Xending.');
            return;
        }
        
        console.log(`📄 PDF original encontrado: ${originalPDF}`);
        
        // 1. Agregar sello de "APROBADO"
        console.log('\n1️⃣ Agregando sello de APROBADO...');
        const modifications1 = [
            {
                type: 'stamp',
                text: 'APROBADO',
                position: 'top-right',
                size: 14
            },
            {
                type: 'text',
                text: `Aprobado por: Sistema Xending - ${new Date().toLocaleDateString()}`,
                x: 50,
                y: 50,
                size: 10,
                color: { r: 0, g: 0.5, b: 0 }
            }
        ];
        
        const approvedPDF = await PDFModifier.modifyExistingPDF(originalPDF, modifications1);
        fs.writeFileSync('xending-approved.pdf', approvedPDF);
        console.log('✅ PDF con sello guardado: xending-approved.pdf');
        
        // 2. Agregar marca de agua
        console.log('\n2️⃣ Agregando marca de agua...');
        const modifications2 = [
            {
                type: 'watermark',
                text: 'CONFIDENCIAL',
                size: 60
            }
        ];
        
        const watermarkedPDF = await PDFModifier.modifyExistingPDF(originalPDF, modifications2);
        fs.writeFileSync('xending-confidential.pdf', watermarkedPDF);
        console.log('✅ PDF con marca de agua guardado: xending-confidential.pdf');
        
        // 3. Resaltar área importante
        console.log('\n3️⃣ Resaltando área de totales...');
        const modifications3 = [
            {
                type: 'rectangle',
                x: 400,
                y: 300,
                width: 200,
                height: 50,
                color: { r: 1, g: 1, b: 0 }, // Amarillo
                borderWidth: 3,
                opacity: 0.3
            },
            {
                type: 'text',
                text: '<-- REVISAR TOTAL',
                x: 610,
                y: 320,
                size: 12,
                bold: true,
                color: { r: 1, g: 0, b: 0 }
            }
        ];
        
        const highlightedPDF = await PDFModifier.modifyExistingPDF(originalPDF, modifications3);
        fs.writeFileSync('xending-highlighted.pdf', highlightedPDF);
        console.log('✅ PDF resaltado guardado: xending-highlighted.pdf');
        
        // 4. Agregar página adicional
        console.log('\n4️⃣ Agregando página de términos y condiciones...');
        const pageContent = {
            title: 'TÉRMINOS Y CONDICIONES - Xending Capital',
            content: `1. TÉRMINOS GENERALES
Esta transacción está sujeta a los términos y condiciones de Xending Capital.

2. RESPONSABILIDADES
El cliente es responsable de verificar todos los datos antes de la ejecución.

3. COMISIONES
Las comisiones aplicables están detalladas en la página anterior.

4. CONTACTO
Para cualquier duda, contactar a:
Email: support@xendingglobal.com
Teléfono: +52 55.1234.5678

5. VALIDEZ
Este documento es válido por 24 horas desde su emisión.

Fecha de emisión: ${new Date().toLocaleDateString()}
Hora: ${new Date().toLocaleTimeString()}`
        };
        
        const pdfWithPage = await PDFModifier.addPageToPDF(originalPDF, pageContent);
        fs.writeFileSync('xending-with-terms.pdf', pdfWithPage);
        console.log('✅ PDF con página adicional guardado: xending-with-terms.pdf');
        
        // 5. Extraer información del PDF
        console.log('\n5️⃣ Extrayendo información del PDF...');
        const pdfInfo = await PDFModifier.extractPDFInfo(originalPDF);
        console.log('📊 Información del PDF:');
        console.log(`   Páginas: ${pdfInfo.pageCount}`);
        console.log(`   Tamaño primera página: ${pdfInfo.pages[0].size.width}x${pdfInfo.pages[0].size.height}`);
        console.log(`   Creador: ${pdfInfo.creator || 'No especificado'}`);
        
        // 6. Combinar PDFs (si hay múltiples)
        const pdfFiles = ['xending-approved.pdf', 'xending-confidential.pdf'];
        if (pdfFiles.every(file => fs.existsSync(file))) {
            console.log('\n6️⃣ Combinando PDFs...');
            const mergedPDF = await PDFModifier.mergePDFs(pdfFiles);
            fs.writeFileSync('xending-merged.pdf', mergedPDF);
            console.log('✅ PDFs combinados guardados: xending-merged.pdf');
        }
        
        // Resumen
        console.log('\n📋 RESUMEN DE MODIFICACIONES:');
        const modifiedFiles = [
            'xending-approved.pdf',
            'xending-confidential.pdf', 
            'xending-highlighted.pdf',
            'xending-with-terms.pdf',
            'xending-merged.pdf'
        ].filter(file => fs.existsSync(file));
        
        modifiedFiles.forEach((file, index) => {
            const stats = fs.statSync(file);
            console.log(`${index + 1}. ${file} - ${Math.round(stats.size/1024)}KB`);
        });
        
        console.log('\n🎯 CAPACIDADES DE MODIFICACIÓN DISPONIBLES:');
        console.log('   ✅ Agregar sellos y marcas');
        console.log('   ✅ Insertar marcas de agua');
        console.log('   ✅ Resaltar áreas específicas');
        console.log('   ✅ Agregar páginas adicionales');
        console.log('   ✅ Combinar múltiples PDFs');
        console.log('   ✅ Extraer información del PDF');
        
        console.log('\n🚀 ¡Todas las modificaciones completadas exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en las modificaciones:', error.message);
    }
}

// Ejecutar las pruebas
testPDFModifications();