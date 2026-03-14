require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const marked = require('marked');
const OpenAI = require('openai');
const marketData = require('./src/features/daily-analysis/services/MarketDataService');
const analysisService = require('./src/features/daily-analysis/services/AnalysisService');

async function generateReport() {
    const now = new Date();
    const isMonday = now.getDay() === 1;
    const reportMode = isMonday ? 'weekly' : 'daily';
    // Always use 'week' to get events for today AND tomorrow
    const calendarMode = 'week';

    console.log(`🚀 Starting ${reportMode.toUpperCase()} FX Analysis...`);
    console.log(`📅 Today is: ${now.toLocaleDateString('es-MX', { weekday: 'long' })}`);

    try {
        // 1. Gather Data
        console.log("📸 Capturing Charts & Data...");
        const screenshotPath = await marketData.getChartScreenshot();
        const spotData = await marketData.getSpotPrice();

        // 2. Get News from multiple sources via scraping + LLM extraction
        console.log("📰 Scraping news from multiple sources...");
        const rawNewsContent = await marketData.getDetailedMexicoNews();
        
        // Use LLM to extract relevant news (replaces brittle regex extraction)
        const news = await extractNewsWithLLM(rawNewsContent);
        console.log(`📰 LLM extracted ${news.length} relevant headlines`);

        // 3. Get Calendar from Trading Economics (better multi-day support)
        console.log("📅 Fetching calendar from Trading Economics...");
        const calendarData = await marketData.getCalendarTradingEconomics();
        
        // Flatten calendar for legacy compatibility (all events in one array)
        // But also pass the grouped data for better TODAY/TOMORROW separation
        const calendar = calendarData.all;

        console.log("✅ Data Gathered.");
        console.log(`💰 Spot: ${spotData.price}`);
        console.log(`📰 News Count: ${news.length}`);
        console.log(`📅 Calendar Events: ${calendar.length} (Today: ${calendarData.today.length}, Tomorrow: ${calendarData.tomorrow.length})`);

        // 4. Perform Analysis
        console.log(`🧠 Analyzing Market (${reportMode})...`);
        let analysisMarkdown = "";

        // Prepare context with grouped calendar data
        const contextData = {
            spot: spotData.price,
            spotFull: spotData,
            news: news,
            calendar: calendar,
            calendarGrouped: calendarData, // Pass grouped data for better TODAY/TOMORROW handling
            reportType: reportMode,
            isMonday: isMonday,
            reportDate: now.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        };

        if (process.env.OPENAI_API_KEY) {
            analysisMarkdown = await analysisService.analyzeMarket(screenshotPath, contextData.news, contextData.calendar, contextData);
        } else {
            console.warn("⚠️ No OPENAI_API_KEY. Generation might fail if Service expects it.");
            // Fallback for safety during dev
            analysisMarkdown = "# Error: Check API Key";
        }

        console.log("✅ Analysis Generated.");

        // 5. Generate PDF
        console.log("📄 Generating PDF...");
        const templatePath = path.join(__dirname, 'public/templates/daily_analysis_template.html');
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templatePath}`);
        }

        let htmlContent = fs.readFileSync(templatePath, 'utf8');

        // Parse Markdown
        const analysisHtml = marked.parse(analysisMarkdown);
        const dateStr = contextData.reportDate;

        // Use Local Date for filename to avoid UTC "tomorrow" issues
        const localDateYMD = now.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        const timestamp = now.toTimeString().split(' ')[0].replace(/:/g, ''); // HHMMSS

        // Load Images
        const chartBuffer = fs.readFileSync(screenshotPath);
        const chartBase64 = `data:image/png;base64,${chartBuffer.toString('base64')}`;

        let logoBase64 = '';
        try {
            const logoPath = path.join(__dirname, 'src/utils/Xending.png');
            if (fs.existsSync(logoPath)) {
                logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
            }
        } catch (e) { console.warn("Logo error", e); }

        // Inject Data
        htmlContent = htmlContent
            .replace(/{{DATE}}/g, dateStr)
            .replace('{{CHART_IMAGE_PATH}}', chartBase64)
            .replace('{{LOGO_PATH}}', logoBase64)
            .replace('{{ANALYSIS_CONTENT}}', analysisHtml)
            .replace('{{SPOT_PRICE}}', spotData.price)
            .replace('{{SPOT_CHANGE}}', spotData.change || 'N/A');

        // Print PDF
        const browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const outputDir = path.join(__dirname, 'reports/daily');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        // Include Link Timestamp to ensure history is unique
        const filename = `Analysis_USDMXN_${reportMode}_${localDateYMD}_${timestamp}.pdf`;
        const pdfPath = path.join(outputDir, filename);

        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: { top: '0', bottom: '0', left: '0', right: '0' }
        });

        await browser.close();
        console.log(`🎉 PDF Created Successfully: ${pdfPath}`);

        // 6. Save to Database
        try {
            const stats = fs.statSync(pdfPath);
            const supabaseRepository = require('./src/features/daily-analysis/services/SupabaseRepository');
            await supabaseRepository.saveReport({
                filename: filename,
                url: `/reports/daily/${filename}`,
                type: 'pdf',
                size: (stats.size / 1024).toFixed(1) + ' KB',
                metadata: {
                    date: now.toISOString(),
                    spot: spotData.price,
                    source: 'DailyFXAgent',
                    reportMode: reportMode
                }
            });
            console.log("✅ Report saved to database.");
        } catch (dbError) {
            console.warn("⚠️ Database save failed (non-fatal):", dbError.message);
        }

    } catch (error) {
        console.error("❌ Error in Workflow:", error);
    } finally {
        await marketData.close();
    }
}

/**
 * Uses LLM to extract relevant USD/MXN news from raw scraped content.
 * More robust than regex — handles any markdown format from any source.
 */
async function extractNewsWithLLM(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') return [];
    if (!process.env.OPENAI_API_KEY) {
        console.warn("⚠️ No OPENAI_API_KEY for news extraction. Returning empty.");
        return [];
    }

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Truncate to avoid token limits (keep first ~40k chars, enough for all sources)
        const truncated = rawContent.substring(0, 40000);

        const todayStr = new Date().toLocaleDateString('es-MX', {
            timeZone: 'America/Mexico_City',
            year: 'numeric', month: 'long', day: 'numeric'
        });

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `Eres un analista financiero. Extrae las 10-12 noticias mas relevantes para el par USD/MXN del contenido scrapeado que te proporcionan.

REGLAS:
- Solo noticias de HOY (${todayStr}) o ayer por la tarde. NUNCA noticias viejas.
- Prioridad: Banxico, Fed, inflacion, empleo, aranceles, tipo de cambio, petroleo, PIB, comercio Mexico-USA, mercados.
- Ignora noticias de acciones individuales de empresas extranjeras (ej: "Acciones de Traws Pharma caen...").
- SI incluye noticias de empresas mexicanas relevantes (Pemex, BMV, etc.) o que afecten la economia mexicana.
- Consolida noticias duplicadas del mismo tema en una sola entrada.
- Cada noticia debe tener: titulo + contexto breve (1-2 oraciones con datos clave).

FORMATO DE RESPUESTA - JSON array de strings, cada string es una noticia:
["Titulo de noticia 1 — Contexto con datos relevantes", "Titulo 2 — Contexto", ...]

Solo responde con el JSON array, nada mas.`
                },
                {
                    role: "user",
                    content: truncated
                }
            ],
            temperature: 0.2,
            max_tokens: 2000,
        });

        const content = response.choices[0].message.content.trim();

        // Parse JSON response
        let news = [];
        try {
            // Handle potential markdown code blocks in response
            const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
            news = JSON.parse(jsonStr);
        } catch (parseErr) {
            console.error("⚠️ Failed to parse LLM news response, attempting line split:", parseErr.message);
            // Fallback: split by newlines if JSON parse fails
            news = content.split('\n')
                .map(l => l.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim())
                .filter(l => l.length > 20);
        }

        if (!Array.isArray(news)) news = [];
        console.log(`📰 LLM extracted ${news.length} news items`);
        return news.slice(0, 12);

    } catch (error) {
        console.error("❌ LLM news extraction failed:", error.message);
        return [];
    }
}

// Run if called directly
if (require.main === module) {
    generateReport();
}

module.exports = { generateReport };
