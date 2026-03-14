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
app.use(cors());
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="deal-confirmation-${partner}-${dealData.dealId || 'unknown'}.pdf"`);
    res.send(Buffer.from(pdf));

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
});

// Get available partners
app.get('/partners', (req, res) => {
  res.json({ partners: TemplateService.getAvailablePartners() });
});

// GET: List of Daily Reports
// GET: List of Daily Reports (Unified: PDF + HTML)
// GET: List of Daily Reports (Unified: PDF + HTML + Database)
app.get('/api/daily-reports', async (req, res) => {
  try {
    const supabaseRepository = require('./src/features/daily-analysis/services/SupabaseRepository');
    const reports = [];
    const seenFilenames = new Set();

    // 1. Fetch from Database (Primary Source)
    const dbReports = await supabaseRepository.getReports(50);
    dbReports.forEach(r => {
      reports.push(r);
      seenFilenames.add(r.filename);
    });

    // 2. Scan PDF Reports (Legacy/Fallback)
    const pdfDir = path.join(__dirname, 'reports/daily');
    if (require('fs').existsSync(pdfDir)) {
      require('fs').readdirSync(pdfDir)
        .filter(file => file.endsWith('.pdf'))
        .forEach(file => {
          if (!seenFilenames.has(file)) {
            const filePath = path.join(pdfDir, file);
            const stats = require('fs').statSync(filePath);
            reports.push({
              filename: file,
              date: stats.mtime,
              size: (stats.size / 1024).toFixed(1) + ' KB',
              url: `/reports/daily/${file}`,
              type: 'pdf'
            });
          }
        });
    }

    // 3. Scan HTML Reports (Legacy/Fallback)
    const htmlDir = path.join(__dirname, 'reports/mexico-news');
    if (require('fs').existsSync(htmlDir)) {
      require('fs').readdirSync(htmlDir)
        .filter(file => file.endsWith('.html'))
        .forEach(file => {
          if (!seenFilenames.has(file)) {
            const filePath = path.join(htmlDir, file);
            const stats = require('fs').statSync(filePath);
            reports.push({
              filename: file,
              date: stats.mtime,
              size: (stats.size / 1024).toFixed(1) + ' KB',
              url: `/reports/mexico-news/${file}`,
              type: 'html'
            });
          }
        });
    }

    // Sort by newest first
    reports.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(a.date);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(b.date);
      return dateB - dateA;
    });

    res.json({ reports: reports });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// Serve the reports directory statically so they are accessible via URL
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// POST: Trigger Manual Report Generation
app.post('/api/generate-daily-report', async (req, res) => {
  console.log("🚀 Manual Report Generation Triggered via API...");
  try {
    const { exec } = require('child_process');

    // Execute the dynamic generator script
    // We set a long timeout (3 mins) because scraping + AI takes time
    exec('node generate-report.js', {
      cwd: __dirname,
      maxBuffer: 1024 * 1024 * 5 // 5MB buffer for logs
    }, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Execution error: ${error}`);
        return res.status(500).json({ error: "Execution failed", details: stderr });
      }
      console.log(`✅ Report Generated. Output:\n${stdout}`);
      return res.json({ success: true, message: "Report generated successfully" });
    });

  } catch (error) {
    console.error("❌ API Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST: Mexico News Agent
app.post('/api/generate-mexico-news', async (req, res) => {
  console.log("🇲🇽 Mexico News Agent Triggered...");
  try {
    const newsAgent = require('./src/features/daily-analysis/services/NewsAgentService');
    const result = await newsAgent.generateMorningBrief();
    res.json({ success: true, report: result });
  } catch (error) {
    console.error("❌ Mexico News Agent Error:", error);
    res.status(500).json({ error: "Failed to generate brief", details: error.message });
  }
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