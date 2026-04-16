const puppeteer = require('puppeteer');
const TemplateService = require('./TemplateService');

class PDFGenerator {
  static browser = null;
  static isInitializing = false;
  static pagePool = [];
  static maxPages = 3;

  static async initBrowser() {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (this.isInitializing) {
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.browser;
    }

    this.isInitializing = true;

    try {
      this.browser = await puppeteer.launch({
        headless: 'new',
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--memory-pressure-off'
        ],
        timeout: 30000
      });

      // Pre-create pages for the pool
      for (let i = 0; i < this.maxPages; i++) {
        const page = await this.browser.newPage();
        await page.setViewport({ width: 1200, height: 800 });
        this.pagePool.push(page);
      }

      console.log('Browser initialized with page pool');
      return this.browser;
    } finally {
      this.isInitializing = false;
    }
  }

  static async getPage() {
    await this.initBrowser();

    if (this.pagePool.length > 0) {
      return this.pagePool.pop();
    }

    // If no pages available, create a new one
    return await this.browser.newPage();
  }

  static async releasePage(page) {
    try {
      // Clear the page content
      await page.goto('about:blank');

      if (this.pagePool.length < this.maxPages) {
        this.pagePool.push(page);
      } else {
        await page.close();
      }
    } catch (error) {
      console.warn('Error releasing page:', error);
      try {
        await page.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }

  static async generateDealConfirmation(partner, dealData) {
    let page = null;

    try {
      page = await this.getPage();

      // Get HTML content for the specific partner
      const htmlContent = TemplateService.generateHTML(partner, dealData);

      // Set content with timeout
      await page.setContent(htmlContent, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      // Get partner-specific PDF options
      const pdfOptions = TemplateService.getPDFOptions(partner);

      const pdf = await page.pdf({
        ...pdfOptions,
        timeout: 30000
      });

      return pdf;
    } catch (error) {
      console.error('Error en PDFGenerator:', error);
      throw error;
    } finally {
      if (page) {
        await this.releasePage(page);
      }
    }
  }

  static async cleanup() {
    try {
      // Close all pages in pool
      await Promise.all(this.pagePool.map(page => page.close()));
      this.pagePool = [];

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }
}

module.exports = PDFGenerator;