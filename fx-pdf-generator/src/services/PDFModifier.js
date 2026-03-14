const fs = require('fs');
const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');

class PDFModifier {
  /**
   * Modifica un PDF existente agregando texto, sellos o marcas de agua
   */
  static async modifyExistingPDF(pdfPath, modifications) {
    try {
      // Leer el PDF existente
      const existingPdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Obtener la primera página
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      // Cargar fuente
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Aplicar modificaciones
      for (const mod of modifications) {
        switch (mod.type) {
          case 'text':
            firstPage.drawText(mod.text, {
              x: mod.x || 50,
              y: mod.y || height - 50,
              size: mod.size || 12,
              font: mod.bold ? boldFont : font,
              color: rgb(mod.color?.r || 0, mod.color?.g || 0, mod.color?.b || 0),
            });
            break;
            
          case 'watermark':
            // Marca de agua diagonal
            firstPage.drawText(mod.text, {
              x: width / 2 - 100,
              y: height / 2,
              size: mod.size || 50,
              font: boldFont,
              color: rgb(0.9, 0.9, 0.9),
              rotate: degrees(45), // 45 grados
              opacity: 0.3,
            });
            break;
            
          case 'stamp':
            // Sello en esquina
            const stampX = mod.position === 'top-right' ? width - 150 : 50;
            const stampY = mod.position === 'top-right' ? height - 50 : 50;
            
            firstPage.drawText(mod.text, {
              x: stampX,
              y: stampY,
              size: mod.size || 10,
              font: boldFont,
              color: rgb(1, 0, 0), // Rojo
            });
            break;
            
          case 'rectangle':
            // Rectángulo (para resaltar áreas)
            firstPage.drawRectangle({
              x: mod.x,
              y: mod.y,
              width: mod.width,
              height: mod.height,
              borderColor: rgb(mod.color?.r || 1, mod.color?.g || 0, mod.color?.b || 0),
              borderWidth: mod.borderWidth || 2,
              opacity: mod.opacity || 0.5,
            });
            break;
        }
      }
      
      // Guardar el PDF modificado
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
      
    } catch (error) {
      console.error('Error modificando PDF:', error);
      throw error;
    }
  }
  
  /**
   * Agrega una página adicional al PDF
   */
  static async addPageToPDF(pdfPath, pageContent) {
    try {
      const existingPdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      // Agregar nueva página
      const newPage = pdfDoc.addPage();
      const { width, height } = newPage.getSize();
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Agregar contenido a la nueva página
      newPage.drawText(pageContent.title || 'Página Adicional', {
        x: 50,
        y: height - 50,
        size: 16,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      if (pageContent.content) {
        const lines = pageContent.content.split('\n');
        lines.forEach((line, index) => {
          newPage.drawText(line, {
            x: 50,
            y: height - 100 - (index * 20),
            size: 12,
            font: font,
            color: rgb(0, 0, 0),
          });
        });
      }
      
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
      
    } catch (error) {
      console.error('Error agregando página:', error);
      throw error;
    }
  }
  
  /**
   * Combina múltiples PDFs en uno solo
   */
  static async mergePDFs(pdfPaths) {
    try {
      const mergedPdf = await PDFDocument.create();
      
      for (const pdfPath of pdfPaths) {
        const pdfBytes = fs.readFileSync(pdfPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      
      const pdfBytes = await mergedPdf.save();
      return pdfBytes;
      
    } catch (error) {
      console.error('Error combinando PDFs:', error);
      throw error;
    }
  }
  
  /**
   * Extrae información de un PDF
   */
  static async extractPDFInfo(pdfPath) {
    try {
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      const pageCount = pdfDoc.getPageCount();
      const pages = pdfDoc.getPages();
      
      const info = {
        pageCount,
        pages: pages.map((page, index) => ({
          pageNumber: index + 1,
          size: page.getSize(),
        })),
        title: pdfDoc.getTitle(),
        author: pdfDoc.getAuthor(),
        subject: pdfDoc.getSubject(),
        creator: pdfDoc.getCreator(),
        producer: pdfDoc.getProducer(),
        creationDate: pdfDoc.getCreationDate(),
        modificationDate: pdfDoc.getModificationDate(),
      };
      
      return info;
      
    } catch (error) {
      console.error('Error extrayendo información del PDF:', error);
      throw error;
    }
  }
}

module.exports = PDFModifier;