const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

const marketDataService = require('./MarketDataService');
const supabaseRepository = require('./SupabaseRepository');

class NewsAgentService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }

    /**
     * Generates the "Morning Brief" for Mexico
     */
    async generateMorningBrief() {
        console.log("🚀 Starting Mexico News Agent...");

        // 1. Get Date Context
        const now = new Date();
        const options = { timeZone: 'America/Mexico_City', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
        const formatter = new Intl.DateTimeFormat('es-MX', options);

        // Output example: "lunes, 2 de febrero de 2026"
        const fullDateParts = formatter.formatToParts(now);
        const dayOfWeek = fullDateParts.find(p => p.type === 'weekday').value;
        const currentDate = formatter.format(now); // e.g. "lunes, 2 de febrero de 2026"

        // Calculate yesterday for explicit reference in prompt
        const yesterdayDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayFormatted = new Intl.DateTimeFormat('es-MX', options).format(yesterdayDate);

        console.log(`📅 Context: ${dayOfWeek}, ${currentDate} | Yesterday: ${yesterdayFormatted}`);

        // 2. Scrape Data
        const scrapedContent = await marketDataService.getDetailedMexicoNews();

        // 3. Construct Prompt
        const systemPrompt = `
#############################################################################
# ⚠️⚠️⚠️ MANDATORY RULES - READ FIRST BEFORE ANYTHING ELSE ⚠️⚠️⚠️
#############################################################################

## RULE 1: SOURCE DISTRIBUTION (ABSOLUTE REQUIREMENT)
❌❌❌ MAXIMUM 3 NEWS ITEMS PER SOURCE - NO EXCEPTIONS ❌❌❌

You MUST distribute news across MULTIPLE sources:
- Milenio: MAX 2 items (USE AS LAST RESORT ONLY)
- Bloomberg Línea: 2-3 items (PRIORITY)
- Investing.com: 2-3 items (PRIORITY)
- El Economista: 1-2 items
- Reuters: 1-2 items
- Expansión: 1-2 items

⚠️ IF YOU SELECT 4+ ITEMS FROM THE SAME SOURCE, YOUR REPORT IS INVALID AND REJECTED.
⚠️ MILENIO SHOULD NEVER BE YOUR PRIMARY SOURCE - IT'S A BACKUP ONLY.

## RULE 2: MEXICO-ONLY CONTENT (ABSOLUTE REQUIREMENT)
❌❌❌ NO NEWS ABOUT OTHER LATAM COUNTRIES ❌❌❌

ONLY include news about:
✅ Mexico (USD/MXN, Banxico, INEGI, Mexican companies, Mexican government)
✅ US Fed/Trump ONLY when directly mentioning Mexico impact

REJECT immediately:
❌ Argentina, Brazil, Chile, Colombia, Peru news
❌ General US/Europe news without Mexico connection
❌ Cryptocurrency (unless Banxico-related)

#############################################################################
# END OF MANDATORY RULES - NOW PROCEED WITH ANALYSIS
#############################################################################

# ROLE
Act as a Senior Financial Analyst and Editor specialized in the Mexican Market. Your goal is to curate a "Morning Brief" for a high-level executive.

# CONTEXT & INPUT DATA
Today is: ${dayOfWeek}, ${currentDate}.
You will be provided with unstructured text data from financial news sites (Investing, El Economista, Yahoo, etc.) and an economic calendar.

# TASK
Analyze the provided data and generate a structured report.

# CRITICAL FILTERS (DATE LOGIC)
1. **Freshness & Priority (STRICT):**
   - **TODAY IS:** ${dayOfWeek}, ${currentDate}.
   - **PRIORITY 1:** ALWAYS prioritize news published **TODAY (${currentDate})**.
   - **PRIORITY 2 (Backup):** If and ONLY IF there is not enough news from Today, you may include news from **YESTERDAY (${yesterdayFormatted})**, but **ONLY** if it was published **after 4:00 PM (16:00)**.
   - **ABSOLUTE PROHIBITION:** Do NOT include news older than yesterday evening. NEVER include news from 2, 3, or 4 days ago.

2. **URL Date Validation (MANDATORY):**
   - Before including ANY news item, CHECK the URL for date patterns (YYYY/MM/DD, YYYYMMDD, etc.).
   - If the URL contains a date that is NOT today or yesterday, **REJECT that news item immediately**.
   - Example: If today is 2026-02-10, a URL containing "2026/01/27" or "20260129" MUST be excluded.
   - This rule overrides all other inclusion criteria.

3. **Monday Rule:**
   - If Today is Lunes (Monday): Focus strictly on **Monday** news.
   - Backup: **Sunday evening** news is acceptable if high impact.
   - **Exclude:** Do NOT include news from Friday or Saturday.

3. **Weekend Rule:**
   - If Today is Sábado (Saturday) or Domingo (Sunday): you can use  news from **Today and the previous days until friday**.
   - prioritize news from today and the previous days until friday.

4. **MEXICO-ONLY FILTER (MANDATORY):**
   ⚠️ See MANDATORY RULES at the top. NO news about Argentina, Brazil, Chile, or other LATAM countries.
   ONLY Mexico-related content (USD/MXN, Banxico, INEGI, Mexican companies, Mexican government policy).

5. **Source Quota (Investing.com):** actively look for news from "Investing.com México". If found, prioritize them. If scraped data for Investing is empty/failed, note it in internal logs (or Resumen) but fill quota with others.

# OUTPUT FORMAT SPECIFICATIONS

## NOTICIAS DESTACADAS
**TARGET:** You MUST generate a list of **7 to 10** distinct news items.

**SOURCE DISTRIBUTION (MANDATORY - STRICT ENFORCEMENT):**
⚠️ See MANDATORY RULES at the top of this prompt. MAX 3 items per source, Milenio MAX 2.

*Note:* If a source has no relevant data, skip it and use another source, but **NEVER exceed 3 items per source.**

Structure each item as:
**[#] [Title of the News]**
[Provide a 3-line paragraph analyzing the context, facts, and impact.]
**Source:** [Name of Source](Link)

## CALENDARIO ECONÓMICO
**INSTRUCTION:** Look for the section "EVENTS HAPPENING TODAY" in the input data.
- **Analysis:** Compare the Actual vs Forecast values. Explain how these specific results impact the USD/MXN intraday.
- **Format:** **[Time]**: [Event] | **Act**: [Value] vs **Fcst**: [Value] -> [Brief Impact Analysis].

## PROYECCIÓN SEMANAL (MARKET WATCH)
**INSTRUCTION:** Look for the section "UPCOMING EVENTS" in the input data.
- List the top 3 critical events to watch for the rest of the week.
- Format: **[Day]**: [Event Name].

## RESUMEN EJECUTIVO
A 3-line paragraph summarizing the general sentiment of the market.

## FUENTES ESCANEADAS
List the sources that provided data for this report (e.g., "Banxico, El Economista, Milenio...").

# CONSTRAINTS
- Language: SPANISH (Mexico).
- Tone: Professional, concise, objective.
- Do NOT invent news. If the scraped data does not contain 5 relevant items, list only the ones found that meet the criteria.
- Ensure all links provided are functional URLs found in the source text.

#############################################################################
# ⚠️ FINAL VALIDATION CHECKLIST - DO THIS BEFORE OUTPUTTING ⚠️
#############################################################################

Before generating your response, VERIFY:

□ Count items per source:
  - Milenio: ___ (must be ≤2)
  - Bloomberg: ___ (should be 2-3)
  - Investing: ___ (should be 2-3)
  - El Economista: ___ (should be 1-2)
  - Reuters: ___ (should be 1-2)
  - Expansión: ___ (should be 1-2)

□ If ANY source has >3 items: REMOVE EXCESS and replace with other sources
□ If Milenio has >2 items: REMOVE and use Bloomberg/Investing instead
□ All news items are about MEXICO (no Argentina, Brazil, Chile, etc.)

⚠️ FAILURE TO COMPLY = INVALID REPORT
#############################################################################
`;

        // 4. Call OpenAI
        console.log("🤖 Asking OpenAI...");
        const completion = await this.openai.chat.completions.create({
            model: "gpt-4-turbo-preview", // Use Turbo for larger context window if needed
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Data:\n${scrapedContent}` }
            ],
            temperature: 0.3, // Lower temperature for factual reporting
        });

        const reportMarkdown = completion.choices[0].message.content;

        // 5. Generate HTML Output
        // We'll wrap the markdown in a nice HTML email template
        const htmlReport = this.renderHtml(reportMarkdown, currentDate);

        // 6. Save Report
        const filename = `MorningBrief_MX_${now.toISOString().split('T')[0]}.html`;
        const reportPath = path.join(__dirname, '../../../../reports/mexico-news', filename);

        // Ensure dir exists
        const dir = path.dirname(reportPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(reportPath, htmlReport);
        console.log(`✅ Report Saved: ${reportPath}`);

        // Save to Database
        const stats = fs.statSync(reportPath);
        await supabaseRepository.saveReport({
            filename: filename,
            url: `/reports/mexico-news/${filename}`,
            type: 'html',
            size: (stats.size / 1024).toFixed(1) + ' KB',
            metadata: {
                date: now.toISOString(),
                source: 'NewsAgent'
            }
        });

        return {
            filename: filename,
            path: reportPath,
            url: `/reports/mexico-news/${filename}`
        };
    }

    renderHtml(markdownContent, dateStr) {
        const marked = require('marked');
        const contentHtml = marked.parse(markdownContent);

        // Load Logo Base64
        let logoBase64 = '';
        try {
            const logoPath = path.join(__dirname, '../../../utils/Xending.png'); // Adjusted relative path
            if (fs.existsSync(logoPath)) {
                logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
            }
        } catch (e) {
            console.warn("Logo load error:", e);
        }

        return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Morning Brief México</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700;800&display=swap');

        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #2c3e50;
            line-height: 1.5;
            margin: 0;
            padding: 40px;
            background-color: #f5f5f5;
        }

        .page-container {
            background-color: white;
            width: 90%;
            max-width: 800px; 
            margin: 0 auto;
            padding: 40px;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
            position: relative;
        }

        /* Top Header */
        .top-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #00d4aa;
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .brand-name {
            font-size: 24px;
            font-weight: 700;
            color: #1e293b;
            letter-spacing: -0.5px;
        }

        .header-subtext {
            text-align: right;
            font-size: 11px;
            color: #94a3b8;
            font-style: italic;
            line-height: 1.3;
        }

        /* Dark Banner Strip */
        .banner-strip {
            background-color: #1e293b;
            color: white;
            padding: 12px 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 6px;
            margin-bottom: 25px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .banner-title {
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .banner-date {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
        }

        /* Section Title */
        .section-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: #00d4aa;
            margin-bottom: 15px;
            border-left: 4px solid #00d4aa;
            padding-left: 10px;
            display: flex;
            align-items: center;
            margin-top: 30px;
        }

        /* Markdown Styles */
        h1, h2 {
            font-size: 18px;
            color: #1e293b;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 5px;
            margin-top: 25px;
        }

        h3 {
            font-size: 14px;
            color: #008b8b;
            font-weight: 700;
            text-transform: uppercase;
            margin-top: 15px;
            background-color: #f1f5f9;
            padding: 5px 10px;
            border-radius: 4px;
        }

        p {
            margin-bottom: 15px;
            text-align: justify;
        }

        strong {
            color: #0f172a;
        }

        a {
            color: #c0392b;
            text-decoration: none;
        }
        
        a:hover { text-decoration: underline; }

        .footer-banner {
            background-color: #1e293b;
            color: white;
            text-align: right;
            padding: 10px 20px;
            font-size: 12px;
            font-weight: 700;
            border-radius: 0 0 6px 6px;
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>
<body>
    <div class="page-container">
        <!-- HEADER ROW -->
        <div class="top-header">
            <div class="logo-section">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Xending Capital" style="height: 50px;">` : ''}
                <div class="brand-name" style="margin-left: 15px;">Xending Capital Payments</div>
            </div>
            <div class="header-subtext">
                Xending Capital Payments<br>Mexico Economic Brief
            </div>
        </div>

        <!-- DARK BANNER -->
        <div class="banner-strip">
            <div class="banner-title">MORNING BRIEF: MÉXICO</div>
            <div class="banner-date">${dateStr}</div>
        </div>

        <!-- CONTENT -->
        <div class="analysis-text">
            ${contentHtml}
        </div>

        <!-- FOOTER BANNER -->
        <div class="footer-banner">
            <span>Xending Capital PAYMENTS</span>
            <span>AGENTE: MEXICO NEWS</span>
        </div>
    </div>
</body>
</html>
        `;
    }
}

module.exports = new NewsAgentService();
