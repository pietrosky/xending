const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const PDFGenerator = require('./src/services/PDFGenerator');
const TemplateService = require('./src/services/TemplateService');
const { pdfGenerationLimiter } = require('./src/middleware/rateLimiter');
const PerformanceMonitor = require('./monitor');
const PDFModifier = require('./src/services/PDFModifier');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : undefined; // undefined = allow all (dev)
app.use(cors(allowedOrigins ? { origin: allowedOrigins } : undefined));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// PDF Generation endpoint
app.post('/generate-pdf/:partner', pdfGenerationLimiter, async (req, res) => {
  try {
    const { partner } = req.params;
    const dealData = req.body;
    
    // Validate partner
    if (!TemplateService.isValidPartner(partner)) {
      return res.status(400).json({ error: `Unsupported partner: ${partner}` });
    }
    
    // Generate PDF
    const pdf = await PDFGenerator.generateDealConfirmation(partner, dealData);
    
    // ✅ FIX: Convertir Uint8Array a Buffer si es necesario
    const pdfBuffer = Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="deal-confirmation-${partner}-${dealData.dealNumber || 'unknown'}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

// Get available partners
app.get('/partners', (req, res) => {
  res.json({ partners: TemplateService.getAvailablePartners() });
});

// PDF Modification endpoint
app.post('/modify-pdf', async (req, res) => {
  try {
    const { pdfBase64, modifications } = req.body;
    
    if (!pdfBase64 || !modifications) {
      return res.status(400).json({ error: 'PDF data and modifications are required' });
    }
    
    // Decode base64 PDF
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const tempPath = `temp-${Date.now()}.pdf`;
    
    // Write temporary file
    require('fs').writeFileSync(tempPath, pdfBuffer);
    
    // Modify PDF
    const modifiedPDF = await PDFModifier.modifyExistingPDF(tempPath, modifications);
    
    // Clean up temp file
    require('fs').unlinkSync(tempPath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="modified-pdf.pdf"');
    res.send(modifiedPDF);
    
  } catch (error) {
    console.error('Error modifying PDF:', error);
    res.status(500).json({ error: 'Failed to modify PDF', details: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'FX PDF Generator',
    features: ['generate', 'modify', 'merge']
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await PDFGenerator.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await PDFGenerator.cleanup();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`FX PDF Generator running on port ${PORT}`);
  console.log(`Available partners: ${TemplateService.getAvailablePartners().join(', ')}`);
  
  // Start performance monitoring in development
  if (process.env.NODE_ENV !== 'production') {
    PerformanceMonitor.startMonitoring(60000); // Every minute
  }
});