const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });

puppeteer.use(StealthPlugin());

class MarketDataService {
    constructor() {
        this.browser = null;
        this.page = null;
        this.firecrawlKey = process.env.FIRECRAWL_API_KEY;

        if (!this.firecrawlKey) {
            console.warn("⚠️ FIRECRAWL_API_KEY not found in .env. Falling back to simple generic data where possible, but scraping will likely fail.");
        }
    }

    // --- PUPPETEER METHODS (Visual / Interactive) ---

    async init() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--window-size=1920,1080',
                    '--lang=es-MX',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-blink-features=AutomationControlled'
                ],
                ignoreHTTPSErrors: true
            });
            this.page = await this.browser.newPage();
            this.page.on('console', msg => console.log('🔹 PAGE LOG:', msg.text()));
            await this.page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
            await this.page.setExtraHTTPHeaders({
                'Accept-Language': 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'max-age=0'
            });

            // 🌎 CRITICAL: Force Mexico City Timezone for accurate Charts & Calendar
            await this.page.emulateTimezone('America/Mexico_City');
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    /**
     * Captures a screenshot of the USD/MXN chart from TradingView (Best done visually with Puppeteer)
     */
    async getChartScreenshot() {
        try {
            await this.init();
            // Using 15-minute interval for clearer day separation
            const url = 'https://es.tradingview.com/chart/hZWRSop5/?interval=15';
            console.log(`📸 Getting Chart: ${url}...`);
            // Set a specific viewport for consistent cropping
            await this.page.setViewport({ width: 1400, height: 900 });
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Attempt to accept cookies
            try {
                await new Promise(r => setTimeout(r, 2000));
                const buttons = await this.page.$$('button');
                for (const btn of buttons) {
                    const text = await this.page.evaluate(el => el.innerText, btn);
                    if (text && (text.includes('Aceptar') || text.includes('Accept'))) {
                        await btn.click();
                        break;
                    }
                }
            } catch (e) { /* ignore */ }

            console.log('⏳ Waiting 5s for chart render...');
            await new Promise(r => setTimeout(r, 5000));

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const screenshotsDir = path.join(__dirname, '../../../../public/screenshots');
            if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

            const filename = `usdmxn_chart_tv_${timestamp}.png`;
            const filepath = path.join(screenshotsDir, filename);

            // CROP: REVERTED per user request ("Regresa el screenshot al tamaño que era")
            // Capturing full viewport (1400x900) to ensure no data is cut off.
            await this.page.screenshot({ path: filepath });
            console.log(`✅ Chart saved (Full): ${filepath}`);
            return filepath;
        } catch (error) {
            console.error('❌ Error chart:', error.message);
            throw error;
        }
    }

    // --- FIRECRAWL METHODS (Data Extraction) ---
    async fetchFirecrawl(url, formats = ['markdown'], actions = []) {
        if (!this.firecrawlKey) throw new Error("Missing FIRECRAWL_API_KEY");

        console.log(`🔥 Firecrawl Scraping: ${url}`);
        try {
            const response = await axios.post(
                'https://api.firecrawl.dev/v1/scrape',
                {
                    url: url,
                    formats: formats,
                    actions: actions,
                    waitFor: 2000 // Wait for hydration
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.firecrawlKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.success) {
                return response.data.data;
            } else {
                throw new Error(JSON.stringify(response.data));
            }
        } catch (error) {
            console.error("❌ Firecrawl API Error:", error.response ? error.response.data : error.message);
            throw error;
        }
    }

    /**
     * Scrapes real-time Spot Price from Investing.com (Hybrid: Can use Puppeteer or Firecrawl, sticking to Puppeteer for simple text or Firecrawl for reliability. Let's use Puppeteer since we have it open for Chart anyway? No, let's keep it robust. Using Firecrawl via a simple scrape if possible, or Puppeteer fallback. Actually, getSpotPrice is fast. Let's keep Puppeteer for it to avoid wasting Firecrawl credits on simple text, unless blocking is frequent. But user wants hybrid. Let's keep getSpotPrice on Puppeteer for now as it's typically less blocked than bulk news scraping).
     * UPDATE: User wants to avoid blocking. I'll switch getSpotPrice to Puppeteer (fast) but if it fails, fallback? Or just keep it Puppeteer for now. The big blocker is News paginated scraping.
     */
    async getSpotPrice() {
        try {
            console.log("💰 Getting Spot Price (Puppeteer Only)...");

            // Reuse existing page or init if needed (should be open from chart)
            await this.init();

            // Go to Investing.com
            const url = 'https://mx.investing.com/currencies/usd-mxn';
            // Use networkidle2 to ensure data load
            await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

            // Robust selector wait
            await this.page.waitForSelector('[data-test="instrument-price-last"]', { timeout: 15000 });

            const price = await this.page.$eval('[data-test="instrument-price-last"]', el => el.innerText);

            // Get change percentage
            let change = "0.00%";
            try {
                change = await this.page.$eval('[data-test="instrument-price-change-percent"]', el => el.innerText);
            } catch (e) {
                console.warn("⚠️ Could not get change %");
            }

            // Get day range (High/Low) from Investing.com
            let dayHigh = "N/A";
            let dayLow = "N/A";
            let prevClose = "N/A";
            let open = "N/A";

            try {
                // Investing.com has these in the instrument header or key stats
                const stats = await this.page.evaluate(() => {
                    const result = {};
                    // Try to find day's range in the page
                    const allText = document.body.innerText;
                    
                    // Look for "Rango del día" or "Day's Range" pattern
                    const rangeMatch = allText.match(/Rango del d[ií]a[:\s]*([\d.,]+)\s*[-–]\s*([\d.,]+)/i);
                    if (rangeMatch) {
                        result.dayLow = rangeMatch[1].replace(',', '.');
                        result.dayHigh = rangeMatch[2].replace(',', '.');
                    }
                    
                    // Look for previous close
                    const prevMatch = allText.match(/Cierre anterior[:\s]*([\d.,]+)/i);
                    if (prevMatch) {
                        result.prevClose = prevMatch[1].replace(',', '.');
                    }
                    
                    // Look for open
                    const openMatch = allText.match(/Apertura[:\s]*([\d.,]+)/i);
                    if (openMatch) {
                        result.open = openMatch[1].replace(',', '.');
                    }
                    
                    return result;
                });
                
                if (stats.dayHigh) dayHigh = stats.dayHigh;
                if (stats.dayLow) dayLow = stats.dayLow;
                if (stats.prevClose) prevClose = stats.prevClose;
                if (stats.open) open = stats.open;
                
                console.log(`📊 Day Range: ${dayLow} - ${dayHigh} | Prev Close: ${prevClose} | Open: ${open}`);
            } catch (e) {
                console.warn("⚠️ Could not get day range:", e.message);
            }

            console.log(`✅ Spot Price: ${price} (${change})`);

            return {
                price: price,
                change: change,
                open: open,
                dayLow: dayLow,
                dayHigh: dayHigh,
                prevClose: prevClose
            };

        } catch (error) {
            console.error('❌ Error spot price:', error.message);
            // Fallback value to prevent analysis crash, but log error
            return { price: "20.50", change: "(N/A)", open: "N/A", dayLow: "N/A", dayHigh: "N/A", prevClose: "N/A" };
        }
    }

    /**
     * Scrapes news from Investing.com using Firecrawl for reliability
     */
    async getNews(mode = 'today', targetDateStr = '') {
        try {
            console.log(`📰 Getting News (Firecrawl) Mode: ${mode}...`);
            const url = 'https://mx.investing.com/news/forex-news';

            // For weekly mode, we might need to scroll. Firecrawl handles 'scroll' action.
            // But simple scrape returns main page.
            let actions = [];
            if (mode === 'weekly') {
                // Scroll to bottom a few times to load more
                actions = [
                    { type: "scroll", direction: "down", amount: 2000 },
                    { type: "wait", milliseconds: 1000 },
                    { type: "scroll", direction: "down", amount: 2000 },
                    { type: "wait", milliseconds: 1000 },
                    { type: "scroll", direction: "down", amount: 2000 }
                ];
            }

            const data = await this.fetchFirecrawl(url, ['markdown'], actions);
            const markdown = data.markdown || "";

            // Use regex to extract news items from markdown
            // Markdown links usually look like: [Title](link) - time/date
            // investing.com markdown might be just headers or list items.
            // We'll look for lines that contain our keywords.

            const lines = markdown.split('\n');
            const keywords = ['peso', 'mxn', 'dólar', 'banxico', 'fed', 'moneda', 'trump', 'eur/usd'];
            const relevantNews = [];
            const seenTitles = new Set();

            lines.forEach(line => {
                const lower = line.toLowerCase();
                const hasKeyword = keywords.some(k => lower.includes(k));

                // Very basic heuristic: line length > 20, has keyword, not a menu item
                if (hasKeyword && line.length > 30 && !line.includes('Sign In') && !line.includes('Register')) {
                    // Clean markdown link syntax if present [Text](Url)
                    const cleanText = line.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').trim();
                    if (!seenTitles.has(cleanText)) {
                        relevantNews.push(cleanText);
                        seenTitles.add(cleanText);
                    }
                }
            });

            console.log(`✅ Found ${relevantNews.length} news items via Firecrawl.`);
            return relevantNews.slice(0, 15); // Return top 15

        } catch (error) {
            console.error("❌ News Scraping Failed:", error.message);
            return [];
        }
    }

    /**
     * Scrapes Economic Calendar using Firecrawl
     */
    async getCalendar(mode = 'today', targetDateYMD = '') {
        try {
            // Investing.com calendar URL (Force Mexico Timezone ID 21)
            let url = 'https://mx.investing.com/economic-calendar/?timeZone=21';
            let actions = [];

            if (mode === 'week') {
                url = "https://mx.investing.com/economic-calendar/?timeFilter=week&timeZone=21";
                console.log("📅 Getting Calendar (Firecrawl) Mode: week...");
            } else if (mode === 'specific_date' && targetDateYMD) {
                // Use dateFrom and dateTo for specific date
                url = `https://mx.investing.com/economic-calendar/?dateFrom=${targetDateYMD}&dateTo=${targetDateYMD}&timeZone=21`;
                console.log(`📅 Getting Calendar (Firecrawl) for date: ${targetDateYMD}...`);
            } else {
                console.log(`📅 Getting Calendar (Firecrawl) Mode: ${mode}...`);
            }

            const data = await this.fetchFirecrawl(url, ['markdown'], actions);
            const markdown = data.markdown || "";
            const lines = markdown.split('\n');
            const events = [];

            let currentDayHeader = "";

            lines.forEach(line => {
                // Track day headers in markdown - can be standalone or inside table cell
                // Format: "| miércoles, 4 de febrero de 2026 |" or "lunes, 2 de febrero de 2026"
                const dayMatch = line.match(/(lunes|martes|miércoles|jueves|viernes|sábado|domingo),\s*\d+\s*de\s*\w+\s*de\s*\d{4}/i);
                if (dayMatch) {
                    currentDayHeader = dayMatch[0].trim();
                }

                if (line.includes('|') && (line.includes('USD') || line.includes('MXN'))) {
                    const parts = line.split('|').map(s => s.trim()).filter(s => s);

                    // Investing markdown for calendar typically:
                    // Based on debug logs, Firecrawl is returning offset columns and missing Importance
                    // Index 0: "Time<br>Currency" (e.g. "20m<br>USD")
                    // Index 1: Time (e.g. "20m")
                    // Index 2: Currency ("USD")
                    // Index 3: Event Link/Title

                    if (parts.length >= 4) {
                        const time = parts[1];
                        const currency = parts[2];
                        const eventRaw = parts[3];

                        // Extract cleanly
                        // Event string often contains: "[Title](link) <br>Act:..."
                        // parse the "Act:", "Pron:" (Forecast), "Base:" (Previous) if present in fullRaw (eventRaw)
                        // Or check if they are in subsequent parts columns as per debug logs

                        let actual = "-";
                        let forecast = "-";
                        let previous = "-";

                        // Strategy 1: Columns (if structure holds)
                        if (parts.length >= 6) {
                            actual = parts[4] || "-";
                            forecast = parts[5] || "-";
                        }

                        // Strategy 2: Regex in the HTML chunk (Firecrawl often dumps this in one cell)
                        // Example: "...<br>Act:<br>52.4<br>Pron:<br>51.9..."
                        const actMatch = eventRaw.match(/Act:<br>\s*([\d\.\-\%]+)/);
                        const pronMatch = eventRaw.match(/Pron:<br>\s*([\d\.\-\%]+)/);
                        const prevMatch = eventRaw.match(/Base:<br>\s*([\d\.\-\%]+)/);

                        if (actMatch) actual = actMatch[1];
                        if (pronMatch) forecast = pronMatch[1];
                        if (prevMatch) previous = prevMatch[1];

                        const eventMatch = eventRaw.match(/\[(.*?)\]/);
                        const eventName = eventMatch ? eventMatch[1] : eventRaw.split('<br>')[0];

                        const eventObj = {
                            day: currentDayHeader,
                            time: time,
                            currency: currency,
                            event: eventName,
                            actual: actual,
                            forecast: forecast,
                            previous: previous,
                            fullRaw: eventRaw // Keep for context
                        };

                        // 🔍 FILTERING LOGIC (Keywords since Stars are missing)
                        const highImpactKeywords = /PIB|GDP|IPC|CPI|IPP|PPI|Tasa de desempleo|Nóminas|Non-Farm|Payroll|Empleo|Jobless|JOLTS|ADP|ISM|PMI|Confianza del consumidor|Ventas minoristas|Retail Sales|Balanza comercial|Trade Balance|Ofertas de empleo|Decisión de tipos|Interest Rate|Actas|Minutas|Minutes/i;

                        const fedKeywords = /Fed|FOMC|Bostic|Powell|Bowman|Jefferson|Cook|Kugler|Schmid|Musalem|Goolsbee|Barkin|Daly|Williams|Barr|Waller|Comparecencia|Declaraciones|Discurso|Speech|Testimony/i;

                        const isHighImpact = highImpactKeywords.test(eventName);
                        const isFed = fedKeywords.test(eventName);
                        const isRelevantCurrency = currency === 'USD' || currency === 'MXN';

                        console.log(`🔍 [${time}] ${currency} - ${eventName} | High? ${isHighImpact} | Fed? ${isFed}`);

                        if (isRelevantCurrency && (isHighImpact || isFed)) {
                            events.push(eventObj);
                        }
                    }
                }
            });

            console.log(`✅ Found ${events.length} calendar events via Firecrawl.`);
            return events;

        } catch (error) {
            console.error("❌ Calendar Scraping Failed:", error.message);
            return [];
        }
    }

    /**
     * Scrapes Economic Calendar from Trading Economics (USA + Mexico)
     * Returns events grouped by day with better multi-day support
     */
    async getCalendarTradingEconomics() {
        try {
            console.log("📅 Getting Calendar from Trading Economics (US + MX)...");
            const url = 'https://tradingeconomics.com/calendar?c=united+states,mexico';
            
            const data = await this.fetchFirecrawl(url, ['markdown'], []);
            const markdown = data.markdown || "";
            const lines = markdown.split('\n');
            
            const events = [];
            let currentDay = "";
            
            // High impact keywords for filtering
            const highImpactKeywords = /GDP|CPI|PPI|Inflation Rate|Core Inflation|Unemployment|Payroll|Jobless|JOLTS|ADP|ISM|PMI|Consumer Confidence|Retail Sales|Trade Balance|Nonfarm|Non-Farm|Initial Claims|Continuing Claims|Gross Fixed Investment/i;
            const fedKeywords = /Fed|FOMC|Bostic|Powell|Bowman|Jefferson|Cook|Kugler|Schmid|Musalem|Goolsbee|Barkin|Daly|Williams|Barr|Waller/i;
            // 🇲🇽 BANXICO: Capturar decisión de tasa de interés de México (evento crítico)
            const banxicoKeywords = /Banxico|Interest Rate Decision|Interest Rate|Tasa de Inter[eé]s|Decisi[oó]n de Tasa/i;
            
            for (const line of lines) {
                // Detect day headers: "Wednesday February 04 2026"
                const dayMatch = line.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{2})\s+(\d{4})/i);
                if (dayMatch) {
                    currentDay = dayMatch[0];
                    continue;
                }
                
                // Detect event rows with US or MX
                if ((line.includes('| US |') || line.includes('| MX |')) && line.includes('|')) {
                    // Find time (format: "08:30 AM" or similar)
                    const timeMatch = line.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
                    const time = timeMatch ? timeMatch[1] : "";
                    
                    // Find country
                    const country = line.includes('| US |') ? 'USD' : 'MXN';
                    
                    // Split by | to get columns
                    // Structure: [0]empty [1]empty [2]Country [3]empty [4]Event [5]Actual [6]Previous [7]Consensus [8]Forecast
                    const parts = line.split('|').map(p => p.trim());
                    
                    // Extract event name from column 4
                    const eventCol = parts[4] || "";
                    const eventMatch = eventCol.match(/\[([^\]]+)\]\(https:\/\/tradingeconomics\.com[^\)]+\)/);
                    let eventName = eventMatch ? eventMatch[1] : "";
                    
                    if (!eventName || eventName.length < 3) continue;
                    
                    // Helper to extract value from column (handles [value](url) or plain value)
                    const extractValue = (col) => {
                        if (!col) return "-";
                        // Try markdown link first: [22K](url)
                        const linkMatch = col.match(/\[([\d\.\-\+%KMB]+)\]/);
                        if (linkMatch) return linkMatch[1];
                        // Try plain value with possible <br> suffix
                        const plainMatch = col.match(/^([\d\.\-\+%KMB]+)/);
                        if (plainMatch) return plainMatch[1];
                        return "-";
                    };
                    
                    // Extract values from fixed columns
                    const actual = extractValue(parts[5]);
                    const previous = extractValue(parts[6]);
                    const consensus = extractValue(parts[7]);
                    const forecast = extractValue(parts[8]);
                    // Check if high impact
                    const isHighImpact = highImpactKeywords.test(eventName);
                    const isFed = fedKeywords.test(eventName);
                    // 🇲🇽 Banxico: Detectar decisión de tasa para México específicamente
                    const isBanxico = banxicoKeywords.test(eventName) && country === 'MXN';
                    // 🔴 CRITICAL: Interest Rate de MX siempre es Banxico (evento de alto impacto)
                    const isMexicoInterestRate = /Interest Rate/i.test(eventName) && country === 'MXN';
                    
                    if (isHighImpact || isFed || isBanxico || isMexicoInterestRate) {
                        // Log para eventos críticos de México
                        if (isBanxico || isMexicoInterestRate) {
                            console.log(`🇲🇽 BANXICO EVENT DETECTED: ${eventName} | Time: ${time}`);
                        }
                        events.push({
                            day: currentDay,
                            time: time,
                            currency: country,
                            event: eventName,
                            actual: actual,
                            previous: previous,
                            consensus: consensus,
                            forecast: forecast,
                            isHighImpact: isHighImpact,
                            isFedSpeaker: isFed,
                            isBanxico: isBanxico || isMexicoInterestRate
                        });
                    }
                }
            }
            
            console.log(`✅ Found ${events.length} high-impact events from Trading Economics`);
            
            // Group by day for easier consumption
            const grouped = {
                today: [],
                tomorrow: [],
                thisWeek: [],
                all: events
            };
            
            // Get today's date for comparison
            const now = new Date();
            const todayDay = now.getDate();
            const tomorrowDay = todayDay + 1;
            
            // Get day names
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayName = dayNames[now.getDay()].toLowerCase();
            const tomorrowName = dayNames[(now.getDay() + 1) % 7].toLowerCase();
            
            for (const event of events) {
                const eventDayLower = event.day.toLowerCase();
                
                // Check if today by matching day name and day number
                if (eventDayLower.includes(todayName) && eventDayLower.includes(todayDay.toString().padStart(2, '0'))) {
                    grouped.today.push(event);
                } else if (eventDayLower.includes(tomorrowName) && eventDayLower.includes(tomorrowDay.toString().padStart(2, '0'))) {
                    grouped.tomorrow.push(event);
                } else {
                    grouped.thisWeek.push(event);
                }
            }
            
            console.log(`📊 Today: ${grouped.today.length}, Tomorrow: ${grouped.tomorrow.length}, Rest of week: ${grouped.thisWeek.length}`);
            
            return grouped;
            
        } catch (error) {
            console.error("❌ Trading Economics Calendar Failed:", error.message);
            return { today: [], tomorrow: [], thisWeek: [], all: [] };
        }
    }

    /**
     * Scrapes multiple Mexico-specific financial sources for the "Morning Brief" Agent
     */
    /**
     * Filters scraped markdown content to remove lines containing URLs with old dates.
     * Only allows today and yesterday. Returns cleaned markdown string.
     */
    _filterOldNewsByUrl(markdown) {
        const now = new Date();
        const mxToday = new Date(now.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
        const mxYesterday = new Date(mxToday);
        mxYesterday.setDate(mxYesterday.getDate() - 1);

        // Build allowed date strings in common URL formats
        const fmt = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return [
                `${y}/${m}/${dd}`,   // 2026/02/10
                `${y}-${m}-${dd}`,   // 2026-02-10
                `${y}${m}${dd}`,     // 20260210
            ];
        };
        const allowedDates = [...fmt(mxToday), ...fmt(mxYesterday)];

        // Regex to detect date patterns in URLs: YYYY/MM/DD, YYYY-MM-DD, YYYYMMDD
        const dateInUrlRegex = /(?:https?:\/\/[^\s)]+?)(\d{4}[\/-]\d{2}[\/-]\d{2}|\d{8})/g;

        const lines = markdown.split('\n');
        const filtered = lines.filter(line => {
            const matches = [...line.matchAll(dateInUrlRegex)];
            if (matches.length === 0) return true; // No date in URL, keep it
            // If any URL date is found, ALL must be allowed dates
            return matches.every(m => {
                const dateStr = m[1].replace(/-/g, '/'); // normalize
                const normalized = dateStr.replace(/\//g, '');
                return allowedDates.some(ad => ad.replace(/\//g, '') === normalized);
            });
        });

        const removed = lines.length - filtered.length;
        if (removed > 0) {
            console.log(`🗓️ Date filter: removed ${removed} lines with old news URLs`);
        }
        return filtered.join('\n');
    }

    async getDetailedMexicoNews() {
        console.log("🇲🇽 Starting Comprehensive Mexico News Scraping...");

        const sources = [
            {
                name: "Investing.com México - Noticias",
                url: "https://mx.investing.com/news",
                actions: []
            },
            {
                name: "Investing.com México - Economía",
                url: "https://mx.investing.com/news/economy",
                actions: []
            },
            {
                name: "Bloomberg Linea",
                url: "https://www.bloomberglinea.com/mercados/",
                actions: []
            },
            {
                name: "Reuters Mexico",
                url: "https://www.reuters.com/world/americas/",
                actions: []
            },
            {
                name: "Expansión Mercados",
                url: "https://expansion.mx/mercados",
                actions: []
            },
            {
                name: "El Economista",
                url: "https://www.eleconomista.com.mx/",
                actions: [] // Main page usually has the top headlines
            },
            {
                name: "Milenio Negocios",
                url: "https://www.milenio.com/negocios",
                actions: []
            },
            {
                name: "Banxico",
                url: "https://www.banxico.org.mx/",
                actions: [] // Official notices often on home
            }
        ];

        try {
            // Run all scrapes in parallel, applying date filter to each
            const results = await Promise.all(sources.map(async (source) => {
                try {
                    const data = await this.fetchFirecrawl(source.url, ['markdown'], source.actions);
                    // Apply date pre-filter to remove old news URLs
                    const rawMarkdown = data.markdown || "";
                    const filteredMarkdown = this._filterOldNewsByUrl(rawMarkdown);
                    const length = filteredMarkdown.length;
                    console.log(`✅ [${source.name}] Scraped & filtered: ${length} chars.`);
                    return `
### SOURCE: ${source.name}
URL: ${source.url}
CONTENT:
${filteredMarkdown ? filteredMarkdown.substring(0, 15000) : "No content found."}
--------------------------------------------------
`;
                } catch (err) {
                    console.error(`❌ Failed to scrape ${source.name}: ${err.message}`);
                    return `### SOURCE: ${source.name} (FAILED)\nError: ${err.message}\n--------------------------------------------------`;
                }
            }));

            // Use Trading Economics for better calendar data (grouped by day)
            const calendarGrouped = await this.getCalendarTradingEconomics();
            
            // Format all events for the week
            const formattedCalendar = calendarGrouped.all.map(e =>
                `- ${e.day || ''} ${e.time} [${e.currency}] ${e.event} | Act: ${e.actual || '-'} / Fcst: ${e.consensus || e.forecast || '-'} / Prev: ${e.previous || '-'}`
            ).join('\n');

            // Today's events (pre-grouped by Trading Economics)
            const formattedToday = calendarGrouped.today.map(e =>
                `🔴 [TODAY] ${e.time} [${e.currency}] ${e.event} | Act: ${e.actual || '-'} / Fcst: ${e.consensus || e.forecast || '-'}`
            ).join('\n');
            
            // Tomorrow's events for preview
            const formattedTomorrow = calendarGrouped.tomorrow.map(e =>
                `🟡 [TOMORROW] ${e.time} [${e.currency}] ${e.event} | Fcst: ${e.consensus || e.forecast || '-'} / Prev: ${e.previous || '-'}`
            ).join('\n');

            const calendarText = `
### ECONOMIC CALENDAR (THIS WEEK) - Source: Trading Economics
${formattedCalendar}

### 🚨 KEY EVENTS FOR TODAY (Focus Analysis Here):
${formattedToday.length > 0 ? formattedToday : "No major high-impact events specifically scheduled for today."}

### 📅 EVENTS FOR TOMORROW (Preview):
${formattedTomorrow.length > 0 ? formattedTomorrow : "No major events scheduled for tomorrow."}
--------------------------------------------------
`;

            const finalContent = results.join('\n') + calendarText;

            // SAVE DEBUG DATA FOR USER
            const fs = require('fs');
            const path = require('path');
            const debugPath = path.join(__dirname, '../../../../debug_morning_brief_data.md');
            fs.writeFileSync(debugPath, finalContent);
            console.log(`📝 Debug data saved to: ${debugPath}`);

            return finalContent;

        } catch (error) {
            console.error("❌ Critical Error in Mexico News Scraping:", error);
            return "ERROR_SCRAPING_MEXICO_NEWS";
        }
    }
}

module.exports = new MarketDataService();
