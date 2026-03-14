const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

class AnalysisService {
    constructor() {
        this.openai = null;
        this.anthropic = null;
        
        if (process.env.OPENAI_API_KEY) {
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        }
        
        if (process.env.ANTHROPIC_API_KEY) {
            this.anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });
        }
    }

    /**
     * Entry point: receives screenshot + context, delegates to generateAnalysis
     */
    async analyzeMarket(screenshotPath, news, calendar, contextData) {
        if (!process.env.OPENAI_API_KEY) {
            return "Error: OPENAI_API_KEY not found in environment variables.";
        }

        try {
            const imageBuffer = fs.readFileSync(screenshotPath);
            const dataURI = `data:image/png;base64,${imageBuffer.toString('base64')}`;
            const reportMode = contextData.reportType || 'daily';

            return this.generateAnalysis({
                spotPrice: contextData.spot || "N/A",
                news: news,
                calendar: calendar,
                calendarGrouped: contextData.calendarGrouped,
                mode: reportMode,
                chartImage: dataURI,
                spotFull: contextData.spotFull,
                chartImageBuffer: imageBuffer
            });
        } catch (error) {
            console.error("Error in AnalysisService:", error);
            return "Error generating analysis: " + error.message;
        }
    }

    async generateAnalysis(marketData) {
        try {
            console.log(`Generating ${marketData.mode} analysis...`);

            // ── Time & Date Context ──
            const todayDate = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const nowMexico = new Date().toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hour12: false });
            const sessionEndTime = parseInt(nowMexico.split(':')[0]) >= 16 ? '16:00' : nowMexico;
            const dayOfWeekNum = new Date().toLocaleDateString('en-US', { timeZone: 'America/Mexico_City', weekday: 'short' });
            const dayOfWeekEs = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long' }).toLowerCase();
            const isMonday = dayOfWeekNum === 'Mon';
            const isWeekly = marketData.mode === 'weekly';

            // ── Calendar: Group events ──
            let todaysEvents = [];
            let tomorrowsEvents = [];
            
            if (marketData.calendarGrouped) {
                todaysEvents = marketData.calendarGrouped.today || [];
                tomorrowsEvents = marketData.calendarGrouped.tomorrow || [];
            } else {
                todaysEvents = marketData.calendar || [];
            }

            // Events with actual results for interpretation
            const eventsWithResults = todaysEvents.filter(e => e.actual && e.actual !== '-' && e.actual !== 'N/A');

            // Split by country
            const mxnEvents = marketData.calendar.filter(e => e.currency === 'MXN');
            const usdEvents = marketData.calendar.filter(e => e.currency === 'USD');
            const mxnToday = todaysEvents.filter(e => e.currency === 'MXN');
            const usdToday = todaysEvents.filter(e => e.currency === 'USD');

            // ── KEY FACTS: Extract hard data from calendar ──
            const keyFacts = this._extractKeyFacts(marketData.calendar, todaysEvents, tomorrowsEvents);


            // ── Build the CLEAN prompt (single pass, no duplicates) ──
            const prompt = this._buildWriterPrompt({
                todayDate, nowMexico, sessionEndTime, dayOfWeekEs, isMonday, isWeekly,
                marketData, mxnEvents, usdEvents, mxnToday, usdToday,
                todaysEvents, tomorrowsEvents, eventsWithResults, keyFacts
            });

            // ─────────────────────────────────────────────────────────
            // STEP 1: VISION AGENT (Claude Primary, OpenAI Fallback)
            // ─────────────────────────────────────────────────────────
            console.log("Step 1: Vision Agent extracting chart data...");

            let base64Image = '';
            if (marketData.chartImageBuffer) {
                base64Image = marketData.chartImageBuffer.toString('base64');
            } else if (marketData.chartImage && marketData.chartImage.startsWith('data:image')) {
                base64Image = marketData.chartImage.split(',')[1];
            }

            const dayNumber = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric' });
            const currentHourMX = nowMexico;

            const visionData = await this._runVisionAgent(base64Image, dayNumber, currentHourMX, sessionEndTime);

            // ─────────────────────────────────────────────────────────
            // STEP 2: WRITER AGENT (Report Generation)
            // ─────────────────────────────────────────────────────────
            console.log("Step 2: Writer Agent generating report...");

            // Build visual range
            let visualRange = "N/A";
            if (visionData.todayLow && visionData.todayHigh) {
                visualRange = `${visionData.todayLow} - ${visionData.todayHigh}`;
            }

            // Validate vision data against spotFull (Investing.com scrape)
            // If vision range is unrealistically narrow (<0.03), use spotFull as fallback
            const visionHigh = parseFloat(visionData.todayHigh) || 0;
            const visionLow = parseFloat(visionData.todayLow) || 0;
            const visionRange = visionHigh - visionLow;
            const spotHigh = parseFloat(marketData.spotFull?.dayHigh) || 0;
            const spotLow = parseFloat(marketData.spotFull?.dayLow) || 0;
            const spotRange = spotHigh - spotLow;

            if (spotHigh > 0 && spotLow > 0 && (visionRange < 0.03 || visionHigh === 0)) {
                console.log(`⚠️ Vision range too narrow (${visionRange.toFixed(4)}). Using spotFull: ${spotLow} - ${spotHigh} (range: ${spotRange.toFixed(4)})`);
                visionData.todayHigh = spotHigh.toFixed(2);
                visionData.todayLow = spotLow.toFixed(2);
                visualRange = `${visionData.todayLow} - ${visionData.todayHigh}`;
            }

            // Determine peso direction
            let pesoDirection = "se mantiene estable";
            let directionWord = "FLAT";
            const openPrice = parseFloat(marketData.spotFull?.open) || null;
            const currentPrice = parseFloat(visionData.current) || parseFloat(marketData.spotPrice) || null;
            
            if (openPrice && currentPrice) {
                if (currentPrice < openPrice - 0.01) {
                    pesoDirection = "se fortalece frente al dolar";
                    directionWord = "DOWN";
                } else if (currentPrice > openPrice + 0.01) {
                    pesoDirection = "pierde terreno frente al dolar";
                    directionWord = "UP";
                }
            } else if (visionData.direction === "DOWN") {
                pesoDirection = "se fortalece frente al dolar";
                directionWord = "DOWN";
            } else if (visionData.direction === "UP") {
                pesoDirection = "pierde terreno frente al dolar";
                directionWord = "UP";
            }

            // Calculate support/resistance levels
            const todayHigh = parseFloat(visionData.todayHigh) || 17.35;
            const todayLow = parseFloat(visionData.todayLow) || 17.18;
            const dayRange = todayHigh - todayLow;
            const support1 = visionData.support || visionData.todayLow || '17.20';
            const resistance1 = visionData.resistance || visionData.todayHigh || '17.35';
            const support2 = (todayLow - (dayRange * 0.5)).toFixed(2);
            const resistance2 = (todayHigh + (dayRange * 0.5)).toFixed(2);

            // Calendar interpretation for writer
            const calendarInterpretation = eventsWithResults.map(e => {
                const actual = parseFloat(e.actual);
                const forecast = parseFloat(e.forecast);
                let result = 'IN-LINE';
                let impact = '';
                if (!isNaN(actual) && !isNaN(forecast)) {
                    if (actual > forecast) {
                        result = 'BEAT';
                        impact = e.currency === 'USD' ? 'USD fuerte, Peso pierde terreno' : 'MXN fuerte, Peso se fortalece';
                    } else if (actual < forecast) {
                        result = 'MISS';
                        impact = e.currency === 'USD' ? 'USD debil, Peso se fortalece' : 'MXN debil, Peso pierde terreno';
                    }
                }
                return `${e.event}: ${e.actual} vs ${e.forecast} = ${result} (${impact})`;
            }).join('\n');

            // Inject vision context into prompt
            const visionContext = `
VISION DATA (USE THESE NUMBERS):
- Current Price: ${visionData.current || marketData.spotPrice}
- Day High: ${visionData.todayHigh || 'N/A'}
- Day Low: ${visionData.todayLow || 'N/A'}
- Range: ${visualRange}
- Open: ${marketData.spotFull?.open || 'N/A'} | Prev Close: ${marketData.spotFull?.prevClose || 'N/A'}

DIRECTION: ${directionWord} - El peso mexicano ${pesoDirection}
Trend: ${visionData.trend || 'lateral'}

TECHNICAL LEVELS:
- Soporte 1 (S1): ${support1}
- Soporte 2 (S2): ${support2}
- Resistencia 1 (R1): ${resistance1}
- Resistencia 2 (R2): ${resistance2}

MANDATORY: Start Section 1 with "El peso mexicano ${pesoDirection}..."

CALENDAR INTERPRETATION:
${calendarInterpretation || 'No hay eventos con resultados aun.'}

SCENARIO METHODOLOGY (3-LAYER SYSTEM):

CAPA 1 - ESTRUCTURA TECNICA (60% del peso):
- Tendencia dominante: ${visionData.trend || 'lateral'}
- Estructura: ${visionData.structure || 'No disponible'}
- Direccion intraday: ${directionWord} (Open ${marketData.spotFull?.open || 'N/A'} vs Current ${visionData.current || marketData.spotPrice})
- Soporte 1 (S1): ${support1} | Soporte 2 (S2): ${support2}
- Resistencia 1 (R1): ${resistance1} | Resistencia 2 (R2): ${resistance2}
- Rango del dia: ${dayRange.toFixed(4)} (${dayRange > 0.15 ? 'EXPANSION - sesgo continuacion' : dayRange < 0.08 ? 'COMPRESION - sesgo lateral' : 'NORMAL'})
- Invalidacion estructural: Ruptura sostenida de R2 (${resistance2}) o S2 (${support2})

CAPA 2 - CONTEXTO MACRO (30% del peso):
- Sorpresas economicas: ${calendarInterpretation || 'Sin datos publicados aun'}
- Proximidad de evento de alto impacto en <12h: ${tomorrowsEvents && tomorrowsEvents.length > 0 ? 'SI - sesgo lateral aumenta' : 'NO - sesgo continuacion tecnica'}

CAPA 3 - REGLAS DE PROBABILIDAD:
- El escenario BASE siempre respeta la tendencia dominante (${visionData.trend || 'lateral'})
- El escenario BASE nunca requiere romper 2 niveles de resistencia/soporte
- El escenario SECUNDARIO es contratendencia pero SIN romper estructura mayor
- El escenario EXTREMO requiere ruptura estructural + catalizador
- Nunca asignar mas de 60% a ningun escenario
- Si hay evento de alto impacto en <12h, aumentar probabilidad de lateralidad en escenario base
- La suma SIEMPRE es 100%
`;

            let writerPrompt = prompt.replace('{{VISUAL_RANGE_PLACEHOLDER}}', visualRange) + '\n' + visionContext;

            const writerMessages = [
                {
                    role: "system",
                    content: "Eres un Estratega de FX Institucional (Mesa de Dinero). Escribe un reporte sobrio, profesional y preciso. Usa doble salto de linea entre secciones. Basa tu analisis en los datos proporcionados. NUNCA inventes datos."
                },
                {
                    role: "user",
                    content: writerPrompt
                }
            ];

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o",
                messages: writerMessages,
                max_tokens: 2500,
                temperature: 0.7,
            });

            const fullResponse = response.choices[0].message.content;

            // Save debug log
            try {
                const debugContent = `# Vision Data\n${JSON.stringify(visionData, null, 2)}\n\n# Report\n${fullResponse}`;
                fs.writeFileSync(path.join(__dirname, '../../../../debug_vision.txt'), debugContent);
            } catch (e) { }

            return fullResponse;

        } catch (error) {
            console.error("Error in generateAnalysis:", error);
            return `Error generating analysis: ${error.message}`;
        }
    }

    /**
     * Extracts key hard facts from calendar data (rates, specific numbers)
     * so the AI model can cite them directly.
     * Also classifies Mexico high-impact events for detailed analysis.
     */
    _extractKeyFacts(allEvents, todaysEvents, tomorrowsEvents) {
        const facts = [];
        const mexicoHighImpact = []; // Track MX macro events with results
        const allEventsToScan = [...todaysEvents, ...tomorrowsEvents, ...allEvents];
        
        for (const e of allEventsToScan) {
            const name = (e.event || '').toLowerCase();
            const actual = e.actual && e.actual !== '-' ? e.actual : null;
            const forecast = e.consensus || e.forecast || null;
            const previous = e.previous || null;
            
            // Banxico Interest Rate
            if ((name.includes('interest rate') || name.includes('tasa')) && e.currency === 'MXN') {
                if (actual) {
                    facts.push(`BANXICO_RATE: ${actual} (anterior: ${previous || 'N/A'})`);
                    mexicoHighImpact.push({ type: 'BANXICO_RATE', event: e.event, actual, forecast, previous, currency: e.currency });
                } else if (forecast && forecast !== '-') {
                    facts.push(`BANXICO_RATE_FORECAST: ${forecast} (anterior: ${previous || 'N/A'})`);
                } else if (previous) {
                    facts.push(`BANXICO_RATE_CURRENT: ${previous} (ultima conocida)`);
                }
            }
            
            // Fed Interest Rate
            if ((name.includes('interest rate') || name.includes('fed funds')) && e.currency === 'USD') {
                if (actual) {
                    facts.push(`FED_RATE: ${actual} (anterior: ${previous || 'N/A'})`);
                } else if (previous) {
                    facts.push(`FED_RATE_CURRENT: ${previous} (ultima conocida)`);
                }
            }
            
            // Inflation data - detailed breakdown for MXN
            if ((name.includes('cpi') || name.includes('ipc') || name.includes('inflation') || name.includes('inpc') || name.includes('pce') || name.includes('core inflation') || name.includes('inflacion subyacente')) && actual) {
                const isCore = name.includes('core') || name.includes('subyacente');
                const isMoM = name.includes('mom') || name.includes('mensual') || name.includes('monthly');
                const isYoY = name.includes('yoy') || name.includes('anual') || name.includes('annual') || (!isMoM);
                
                let label = `INFLATION_${e.currency}`;
                if (e.currency === 'MXN') {
                    if (isCore && isMoM) label = 'MX_INFLATION_CORE_MOM';
                    else if (isCore) label = 'MX_INFLATION_CORE_YOY';
                    else if (isMoM) label = 'MX_INFLATION_GENERAL_MOM';
                    else label = 'MX_INFLATION_GENERAL_YOY';
                    
                    mexicoHighImpact.push({ type: label, event: e.event, actual, forecast, previous, currency: e.currency });
                }
                
                // Beat/miss analysis
                let beatMiss = '';
                const actNum = parseFloat(actual);
                const fcstNum = parseFloat(forecast);
                if (!isNaN(actNum) && !isNaN(fcstNum)) {
                    if (actNum > fcstNum) beatMiss = ' -> ABOVE CONSENSUS';
                    else if (actNum < fcstNum) beatMiss = ' -> BELOW CONSENSUS';
                    else beatMiss = ' -> IN LINE';
                }
                
                facts.push(`${label}: ${e.event} = ${actual} (consenso: ${forecast || 'N/A'}, previo: ${previous || 'N/A'})${beatMiss}`);
            }
            
            // Employment data - detailed for MXN
            if ((name.includes('nonfarm') || name.includes('non-farm') || name.includes('payroll') || name.includes('adp') || name.includes('unemployment') || name.includes('jobless') || name.includes('desempleo') || name.includes('empleo')) && actual) {
                facts.push(`EMPLOYMENT_${e.currency}: ${e.event} = ${actual} (consenso: ${forecast || 'N/A'}, previo: ${previous || 'N/A'})`);
                if (e.currency === 'MXN') {
                    mexicoHighImpact.push({ type: 'MX_EMPLOYMENT', event: e.event, actual, forecast, previous, currency: e.currency });
                }
            }
            
            // GDP
            if ((name.includes('gdp') || name.includes('pib') || name.includes('igae')) && actual) {
                facts.push(`GDP_${e.currency}: ${e.event} = ${actual} (consenso: ${forecast || 'N/A'}, previo: ${previous || 'N/A'})`);
                if (e.currency === 'MXN') {
                    mexicoHighImpact.push({ type: 'MX_GDP', event: e.event, actual, forecast, previous, currency: e.currency });
                }
            }
            
            // Consumer Confidence
            if ((name.includes('consumer confidence') || name.includes('confianza del consumidor') || name.includes('michigan')) && actual) {
                facts.push(`CONFIDENCE_${e.currency}: ${e.event} = ${actual} (consenso: ${forecast || 'N/A'}, previo: ${previous || 'N/A'})`);
                if (e.currency === 'MXN') {
                    mexicoHighImpact.push({ type: 'MX_CONFIDENCE', event: e.event, actual, forecast, previous, currency: e.currency });
                }
            }
            
            // ISM/PMI
            if ((name.includes('ism') || name.includes('pmi')) && actual) {
                facts.push(`PMI_${e.currency}: ${e.event} = ${actual} (consenso: ${forecast || 'N/A'}, previo: ${previous || 'N/A'})`);
            }
            
            // Trade Balance Mexico
            if ((name.includes('trade balance') || name.includes('balanza comercial')) && actual && e.currency === 'MXN') {
                facts.push(`MX_TRADE_BALANCE: ${e.event} = ${actual} (consenso: ${forecast || 'N/A'}, previo: ${previous || 'N/A'})`);
                mexicoHighImpact.push({ type: 'MX_TRADE', event: e.event, actual, forecast, previous, currency: e.currency });
            }
            
            // Retail Sales Mexico
            if ((name.includes('retail sales') || name.includes('ventas minoristas')) && actual && e.currency === 'MXN') {
                facts.push(`MX_RETAIL_SALES: ${e.event} = ${actual} (consenso: ${forecast || 'N/A'}, previo: ${previous || 'N/A'})`);
                mexicoHighImpact.push({ type: 'MX_RETAIL', event: e.event, actual, forecast, previous, currency: e.currency });
            }
        }
        
        // Deduplicate facts
        const uniqueFacts = [...new Set(facts)];
        
        // Attach mexicoHighImpact to the return for prompt logic
        uniqueFacts._mexicoHighImpact = mexicoHighImpact;
        
        return uniqueFacts;
    }

    /**
     * Builds the clean, deduplicated writer prompt
     */
    _buildWriterPrompt(ctx) {
        const {
            todayDate, nowMexico, sessionEndTime, dayOfWeekEs, isMonday, isWeekly,
            marketData, mxnEvents, usdEvents, mxnToday, usdToday,
            todaysEvents, tomorrowsEvents, eventsWithResults, keyFacts
        } = ctx;

        // Build short date for header (e.g. "17 FEB 26")
        const now = new Date();
        const dayNum = now.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric' });
        const monthShort = now.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', month: 'short' }).toUpperCase().replace('.', '');
        const yearShort = now.toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City', year: '2-digit' });
        const shortDate = `${dayNum} ${monthShort} ${yearShort}`;

        // Format news with full context (title + snippet)
        const newsSection = marketData.news && marketData.news.length > 0
            ? marketData.news.slice(0, 12).map((n, i) => `${i + 1}. ${n}`).join('\n')
            : 'No se encontraron noticias relevantes hoy.';

        // Format today's events with results
        const todayResultsSection = eventsWithResults.length > 0
            ? eventsWithResults.map(e => {
                const beat = parseFloat(e.actual) > parseFloat(e.forecast) ? 'BEAT' : parseFloat(e.actual) < parseFloat(e.forecast) ? 'MISS' : 'IN-LINE';
                return `- ${e.time || ''} [${e.currency}] ${e.event} | ACTUAL: ${e.actual} vs FORECAST: ${e.forecast} = ${beat}`;
            }).join('\n')
            : 'No hay eventos con resultados publicados aun.';

        // Format Mexico events
        const mxEventsSection = mxnEvents.length > 0
            ? mxnEvents.map(e => `- ${e.day || ''} ${e.time || ''} ${e.event} | Act: ${e.actual || '-'} / Fcst: ${e.consensus || e.forecast || '-'} / Prev: ${e.previous || '-'}`).join('\n')
            : 'Sin eventos de alto impacto para Mexico.';

        // Format USA events
        const usEventsSection = usdEvents.length > 0
            ? usdEvents.map(e => `- ${e.day || ''} ${e.time || ''} ${e.event} | Act: ${e.actual || '-'} / Fcst: ${e.consensus || e.forecast || '-'} / Prev: ${e.previous || '-'}`).join('\n')
            : 'Sin eventos de alto impacto para USA.';

        // Format tomorrow events
        const tomorrowSection = tomorrowsEvents.length > 0
            ? tomorrowsEvents.map(e => `- ${e.time || ''} [${e.currency}] ${e.event} | Fcst: ${e.consensus || e.forecast || '-'} / Prev: ${e.previous || '-'}`).join('\n')
            : 'Sin publicaciones de alto impacto programadas para manana.';

        // Format upcoming events (rest of week)
        const upcomingSection = marketData.calendar
            .filter(e => !todaysEvents.includes(e) && !tomorrowsEvents.includes(e))
            .slice(0, 8)
            .map(e => `- [${e.day || ''}] [${e.currency}] ${e.event}`)
            .join('\n');

        // Key facts section
        const keyFactsSection = keyFacts.length > 0
            ? keyFacts.map(f => `- ${f}`).join('\n')
            : 'No se detectaron datos clave especificos en el calendario.';

        // Detect Mexico high-impact events for detailed Section 2
        const mexicoHighImpact = keyFacts._mexicoHighImpact || [];
        const hasMexicoMacroData = mexicoHighImpact.length > 0;
        
        // Build detailed Mexico macro breakdown if available
        let mexicoMacroBreakdown = '';
        if (hasMexicoMacroData) {
            mexicoMacroBreakdown = mexicoHighImpact.map(evt => {
                const actNum = parseFloat(evt.actual);
                const fcstNum = parseFloat(evt.forecast);
                const prevNum = parseFloat(evt.previous);
                let verdict = '';
                if (!isNaN(actNum) && !isNaN(fcstNum)) {
                    if (actNum > fcstNum) verdict = 'ABOVE CONSENSUS (sorpresa al alza)';
                    else if (actNum < fcstNum) verdict = 'BELOW CONSENSUS (sorpresa a la baja)';
                    else verdict = 'IN LINE (en linea con expectativas)';
                }
                let trend = '';
                if (!isNaN(actNum) && !isNaN(prevNum)) {
                    if (actNum > prevNum) trend = 'ACELERACION vs periodo anterior';
                    else if (actNum < prevNum) trend = 'DESACELERACION vs periodo anterior';
                    else trend = 'SIN CAMBIO vs periodo anterior';
                }
                return `- ${evt.event}: ACTUAL ${evt.actual} vs CONSENSO ${evt.forecast || 'N/A'} vs PREVIO ${evt.previous || 'N/A'} => ${verdict}. ${trend}`;
            }).join('\n');
        }

        return `
Eres un Estratega FX Senior de mesa institucional. Genera el ANALISIS ${isWeekly ? 'SEMANAL' : 'DIARIO'} USD/MXN.
Fecha: ${dayOfWeekEs}, ${todayDate} | Hora Mexico: ${nowMexico}

REGLAS:
1. NO inventes datos. Usa SOLO la informacion proporcionada.
2. Tono profesional, claro y objetivo.
3. Formato Markdown con doble salto de linea entre secciones.
4. DEBES citar datos especificos (tasas, porcentajes, cifras) cuando esten disponibles.
5. Las noticias incluyen contexto (titulo + resumen). USA ESE CONTEXTO, no solo el titular.

═══════════════════════════════════════════════════
SECCION A: DATOS DE MERCADO
═══════════════════════════════════════════════════

Spot Price: ${marketData.spotPrice}
Open: ${marketData.spotFull?.open || 'N/A'} | Prev Close: ${marketData.spotFull?.prevClose || 'N/A'}

═══════════════════════════════════════════════════
SECCION B: DATOS CLAVE (CIFRAS EXACTAS - CITAR EN EL REPORTE)
═══════════════════════════════════════════════════

${keyFactsSection}

INSTRUCCION: Si hay datos de tasa de Banxico o Fed, DEBES mencionarlos con el numero exacto.
Ejemplo: "Banxico mantuvo la tasa en 9.50%" o "El diferencial con la Fed (4.50%) se mantiene en 500 puntos base".

═══════════════════════════════════════════════════
SECCION C: NOTICIAS DEL DIA (TITULO + CONTEXTO)
═══════════════════════════════════════════════════

${newsSection}

INSTRUCCION: Las noticias vienen CONSOLIDADAS POR TEMA. Si dice "[2 fuentes]" significa que hay multiples articulos sobre ese tema.
- Lee el contexto completo de cada noticia (titulo + resumen), no solo el titular.
- Noticias de Banxico, tasa, inflacion MX -> Seccion 2 (Mexico). CITA LA CIFRA EXACTA si aparece (ej: "7.00%").
- Noticias de Fed, empleo USA, dolar -> Seccion 3 (Estados Unidos).
- DEBES mencionar al menos 3 temas en tu analisis, parafraseando y analizando su impacto.
- Si una noticia menciona una cifra especifica (tasa, porcentaje, dato), CITA ESA CIFRA en tu analisis.

═══════════════════════════════════════════════════
SECCION D: CALENDARIO ECONOMICO
═══════════════════════════════════════════════════

EVENTOS DE HOY CON RESULTADOS:
${todayResultsSection}

EVENTOS MEXICO (MXN) - SEMANA:
${mxEventsSection}

EVENTOS USA (USD) - SEMANA:
${usEventsSection}

EVENTOS DE MANANA (PREVIEW):
${tomorrowSection}

RESTO DE LA SEMANA:
${upcomingSection || 'Sin eventos adicionales relevantes.'}

REGLAS DE INTERPRETACION:
- Act > Fcst para USD (PMI, Jobs, CPI): USD sube, Peso pierde terreno
- Act < Fcst para USD: USD baja, Peso se fortalece
- Act > Fcst para MXN (PIB, Inflacion): MXN fuerte, Peso se fortalece
- NUNCA atribuyas un evento USD a Mexico ni viceversa

═══════════════════════════════════════════════════
SECCION E: FORMATO DE SALIDA
═══════════════════════════════════════════════════

# ANALISIS ${isWeekly ? 'SEMANAL' : 'DIARIO'} USD/MXN ${shortDate} (TAGLINE)

INSTRUCCION TAGLINE: Reemplaza "(TAGLINE)" con un comentario editorial MUY CORTO (3-6 palabras) que resuma el sentimiento del dia entre parentesis.
Ejemplos: "(Peso en stand by)", "(MXN firme tras dato de inflacion)", "(Dolar presiona por NFP)", "(Lateral en espera de Banxico)", "(Peso cede terreno por aranceles)".
El tagline debe ser directo, tipo mesa de trading. NO uses signos de exclamacion. Basate en el contexto macro y tecnico del dia.

## 🔷 1️⃣ Resumen inicial
${hasMexicoMacroData
    ? `HAY DATOS MACRO IMPORTANTES DE MEXICO HOY. Esta seccion debe ser un RESUMEN EJECUTIVO ULTRA RAPIDO (4-5 lineas max) que cubra:
Linea 1: Direccion del peso + precio apertura + precio actual.
Linea 2: Rango de la sesion (maximo y minimo).
Linea 3: Mencionar brevemente el catalizador principal de Mexico (ej: "tras la publicacion de datos de inflacion de enero...") SIN entrar en detalle (el detalle va en Seccion 2).
Linea 4: Mencionar brevemente el contexto de USA si hay eventos relevantes (ej: "en espera de declaraciones del FOMC...").
Linea 5: Sesgo general del mercado en una oracion.
IMPORTANTE: NO detallar cifras aqui. Solo mencionar el evento. Las cifras van en Seccion 2 y 3.`
    : `(4-5 lineas)
Linea 1: Direccion del peso + precio apertura + precio actual.
Linea 2: Maximo y minimo de la sesion.
Linea 3: Contexto principal. SI HAY NOTICIAS DE ALTO IMPACTO (Banxico, Fed, inflacion, empleo, aranceles), mencionarlas aqui con datos especificos (ej: "Tras la decision de Banxico de mantener la tasa en X.XX%...").
Linea 4: Que vigilar en las proximas horas.
Linea 5: Sesgo general.`}

Rango de la sesion: {{VISUAL_RANGE_PLACEHOLDER}}
(Date: ${todayDate})

${hasMexicoMacroData
    ? `## 🔷 2️⃣ Mexico
🚨 HAY DATOS MACRO DE ALTO IMPACTO PARA MEXICO. DEBES hacer un analisis DETALLADO y PROFUNDO.

DATOS MACRO DISPONIBLES (CITAR TODOS CON CIFRAS EXACTAS):
${mexicoMacroBreakdown}

ESTRUCTURA OBLIGATORIA PARA ESTA SECCION (6-7 lineas maximo):

1. DATOS PUBLICADOS (2-3 lineas): Presenta cada dato en formato compacto:
   - Indicador: ACTUAL vs CONSENSO | PREVIO (sorpresa al alza/baja/en linea)
   - Si es inflacion: distinguir general vs subyacente en la misma lista.

2. LECTURA CLAVE + POLITICA MONETARIA (2-3 lineas): Interpreta en conjunto:
   - Que significan los datos para Banxico (pausa, recorte, alza). Tasa actual si disponible.
   - Impacto en carry trade y expectativas de proximas reuniones.

3. REACCION DEL PESO (1 linea): Contenida o agresiva y por que.

EJEMPLO DE CALIDAD ESPERADA (inflacion):
"Los datos de inflacion publicados por INEGI fueron el principal catalizador local:
- INPC anual: 3.79% (vs. 3.82% esperado | 3.69% previo)
- INPC mensual: 0.38% (vs. 0.41% esperado)
- Inflacion subyacente anual: 4.52% (vs. 4.49% esperado | 4.33% previo)
La inflacion general mostro moderacion frente al consenso, pero la subyacente volvio a acelerar, confirmando presiones internas. Esto valida la postura de Banxico de mantener la tasa en X.XX% y refuerza la expectativa de pausa prolongada.
El peso reacciona de forma contenida, respaldado por politica monetaria prudente."`
    : `NOTA: No hay eventos macro de alto impacto para Mexico hoy. NO generes la Seccion 2 (Mexico). En su lugar, incorpora una mencion breve del contexto mexicano (Banxico, carry trade, proximo evento MX) dentro de la Seccion 1 (Resumen inicial) en 1-2 lineas adicionales. Salta directamente a la Seccion 3 (Estados Unidos).`}

## 🔷 3️⃣ Estados Unidos - Eventos relevantes
Estructura obligatoria (minimo 5-6 lineas):
**HOY:** [Eventos con resultados: "Evento: Actual X vs Forecast Y = BEAT/MISS" + impacto en USD. Si no hay resultados aun, mencionar que eventos se esperan y a que hora.]
**MANANA:** [Eventos clave a vigilar con forecast esperado]
**CONTEXTO FED:** [Postura actual de la Fed, expectativas de tasas, declaraciones recientes de miembros del FOMC si las hay en las noticias]
**Impacto en USD/MXN:** [2-3 oraciones conectando los datos de USA con el comportamiento del par, incluyendo como afecta al diferencial de tasas y al atractivo del peso]

${isWeekly ? `## 🔷 Calendario de la Semana (Top 5-8 eventos criticos)\n` : ''}

## 🔷 4️⃣ Analisis tecnico del USD/MXN
- Nivel actual
- Tendencia
- Lectura tecnica: Estructura, Momentum, Volatilidad, Validacion

## 🔷 5️⃣ Proyeccion Semanal (Watchlist)
${isMonday ? 'Resumen de riesgos de la semana y zonas target.' : 'Eventos de manana, consolidacion/ruptura, narrativa macro.'}

## 🔷 6️⃣ Niveles clave
Soportes (clasificar: minimo reciente, estructural, psicologico)
Resistencias (clasificar: inmediata, alto anterior, invalidacion)

## 🔷 7️⃣ Escenarios posibles

INSTRUCCION CRITICA: Debes calcular las probabilidades de forma DINAMICA usando las 3 capas. NO uses valores fijos como 50%/30%/20%. Cada escenario debe tener una probabilidad calculada segun las condiciones del dia.

PROCESO DE CALCULO (ejecutar mentalmente antes de escribir):

PASO 1 - ESTRUCTURA TECNICA (60% del peso de la decision):
a) Identifica tendencia dominante: secuencia de maximos/minimos + ubicacion vs medias + pendiente
b) Clasifica volatilidad del dia:
   - Rango < 0.08 = COMPRESION → base tiende a lateral, probabilidad base SUBE a 55-60%
   - Rango 0.08-0.15 = NORMAL → base = continuacion moderada, probabilidad base 48-55%
   - Rango > 0.15 = EXPANSION → base = continuacion fuerte, probabilidad base BAJA a 45-50% (mas incertidumbre)
c) El escenario base SIEMPRE respeta la tendencia dominante. NUNCA pongas como base algo que requiera romper 2 niveles.

PASO 2 - CONTEXTO MACRO (30% del peso):
a) Sorpresas economicas: Compara Actual vs Esperado. La SORPRESA mueve, no el dato.
   - Sorpresa fuerte a favor de tendencia → refuerza base (+2-3% al base)
   - Sorpresa contra tendencia → reduce base (-3-5% al base, sube secundario)
   - Sin sorpresas → mantener calculo tecnico
b) Proximidad de evento alto impacto (<12h):
   - SI hay evento proximo → sesgo lateral, base SUBE 3-5% (mercado espera)
   - NO hay evento → sesgo continuacion tecnica, sin ajuste

PASO 3 - ASIGNAR PROBABILIDADES FINALES:
- Suma SIEMPRE = 100%
- Base: entre 45% y 60% (NUNCA fuera de este rango)
- Secundario: entre 25% y 35%
- Extremo: entre 10% y 20%
- Ajusta segun pasos 1 y 2. Ejemplo: tendencia bajista clara + sin eventos = base 55% bajista, secundario 28% rebote, extremo 17% ruptura

FORMATO DE SALIDA (COPIAR EXACTAMENTE ESTA ESTRUCTURA):

🔹 Tendencia dominante: [alcista/bajista/lateral] - [1 linea de justificacion tecnica]

🔹 Escenario base ([XX]%): [Nombre descriptivo]
Rango: [precio_min] - [precio_max]
[2-3 lineas explicando: por que respeta la tendencia, que condicion lo sostiene, que nivel NO debe romperse]

🔹 Escenario secundario ([XX]%): [Nombre descriptivo]
Rango: [precio_min] - [precio_max]
[2-3 lineas explicando: que tipo de correccion/rebote es, que lo activaria, por que NO invalida la tendencia mayor]

🔹 Escenario extremo ([XX]%): [Nombre descriptivo]
Activacion: [precio o evento que lo dispara]
[2-3 lineas explicando: que ruptura estructural requiere, que catalizador lo provocaria, por que tiene baja probabilidad]

REGLAS FINALES:
- Los rangos de precio deben ser REALISTAS basados en la volatilidad del dia (usa el rango observado como referencia)
- NUNCA escribas porcentajes fijos como 50/30/20. Calcula segun las condiciones.
- Si la tendencia es bajista, el base es bajista. Si es alcista, el base es alcista. NUNCA al reves.

## 🔷 8️⃣ Comentario final
Conclusion ejecutiva profesional. Sesgo del mercado y riesgos inmediatos.

═══════════════════════════════════════════════════
METODOLOGIA INTERNA (NO INCLUIR EN OUTPUT)
═══════════════════════════════════════════════════

Antes de escribir, procesa mentalmente estas 3 capas en orden:

CAPA 1 - ESTRUCTURA TECNICA (base del analisis):
1. Tendencia: Secuencia de maximos y minimos. Ubicacion respecto a medias. Pendiente.
2. Niveles estructurales: Ultimo maximo relevante, ultimo minimo relevante, nivel psicologico, nivel de invalidacion.
3. Volatilidad: Rango promedio de velas. Si hay expansion = continuacion. Si hay compresion = lateral.
4. Momentum: Aceleracion o desaceleracion del movimiento.

CAPA 2 - CONTEXTO MACRO:
1. Sorpresas economicas: Compara Actual vs Esperado. La sorpresa mueve el mercado, no el dato en si.
2. Proximidad de evento: Si hay evento en <12h, el mercado tiende a lateralizar esperando.
3. Direccion DXY: Solo como confirmacion del movimiento, no como driver principal.

CAPA 3 - CONSTRUCCION DE ESCENARIOS:
1. Escenario base = tendencia dominante + camino de menor resistencia (45-60%)
2. Escenario secundario = contratendencia sin romper estructura (25-35%)
3. Escenario extremo = ruptura estructural + catalizador (10-20%)
4. NUNCA poner como base algo que requiera romper 2 resistencias/soportes
5. Si hay evento fuerte en <12h, el base tiende a lateral
6. La suma siempre es 100%. Nunca mas de 60% a ningun escenario.

SINTETIZA: Usa este analisis para construir cada seccion del reporte de forma coherente.
`;
    }

    /**
     * Runs the Vision Agent (Claude primary, OpenAI fallback)
     * Extracts chart geometry: OHLC, trend, support/resistance
     */
    async _runVisionAgent(base64Image, dayNumber, currentHourMX, sessionEndTime) {
        const visionData = { 
            todayHigh: null, todayLow: null, 
            current: null, direction: null,
            trend: null, support: null, resistance: null,
            structure: null
        };

        if (!base64Image) return visionData;

        const visionPromptClaude = `Eres un analista tecnico profesional de Forex (USD/MXN).

HOY es dia ${dayNumber}. Hora Mexico: ${currentHourMX}. Grafico de velas de 15 minutos.

COMO LEER EL GRAFICO:
- El eje X muestra horas (15:00, 18:00, 21:00, 00:00, 03:00, 06:00, 09:00, etc.) y marcadores de dia
- La etiqueta "${dayNumber}" en el eje X marca el INICIO del dia ${dayNumber} (medianoche)
- IMPORTANTE: La sesion de trading de hoy incluye TODAS las velas desde la etiqueta "${dayNumber}" hasta la vela mas reciente
- Esto incluye velas de madrugada (00:00-06:00) Y velas de la manana/tarde (06:00 en adelante)
- NO ignores las velas de madrugada, son parte de la sesion de hoy
- Si ves un movimiento grande (caida o subida) despues de la etiqueta "${dayNumber}", ESO ES PARTE DE HOY

EXTRAER DE TODAS LAS VELAS DE HOY (desde etiqueta "${dayNumber}" hasta ahora):
- TODAY_OPEN: Precio de apertura de la PRIMERA vela despues de la etiqueta "${dayNumber}"
- TODAY_HIGH: La mecha superior MAS ALTA de TODAS las velas de hoy (revisa TODAS, incluyendo madrugada)
- TODAY_LOW: La mecha inferior MAS BAJA de TODAS las velas de hoy
- CURRENT: Precio mostrado en el recuadro/etiqueta a la derecha del grafico

VALIDACION: El rango (TODAY_HIGH - TODAY_LOW) normalmente es de 0.05 a 0.20 para USD/MXN intraday.
Si tu rango es menor a 0.03, probablemente estas ignorando velas. Revisa de nuevo TODAS las velas desde "${dayNumber}".

FORMATO DE RESPUESTA:
CURRENT: [precio]
TODAY_OPEN: [precio]
TODAY_HIGH: [precio]
TODAY_LOW: [precio]
DIRECTION: [UP si CURRENT > TODAY_OPEN, DOWN si CURRENT < TODAY_OPEN]
TREND: [alcista/bajista/lateral basado en la estructura de maximos y minimos]
SUPPORT: [nivel de soporte visible donde el precio reboto]
RESISTANCE: [nivel de resistencia visible donde el precio fue rechazado]
STRUCTURE: [descripcion breve del movimiento completo de hoy desde apertura]`;

        const visionPromptOpenAI = `Chart: 15-min candles USD/MXN. Today is day ${dayNumber}. Time: ${currentHourMX} Mexico.
Analyze ALL candles after the "${dayNumber}" label on X-axis (including overnight/early morning candles).
The day range for USD/MXN is typically 0.05-0.20. If your range is under 0.03, you are missing candles.

CURRENT: [price in box on right side]
TODAY_OPEN: [first candle after "${dayNumber}" label]
TODAY_HIGH: [highest wick of ALL today candles, including early morning]
TODAY_LOW: [lowest wick of ALL today candles]
DIRECTION: [UP if CURRENT > TODAY_OPEN, else DOWN]
TREND: [alcista/bajista/lateral]
SUPPORT: [support level where price bounced]
RESISTANCE: [resistance level where price was rejected]`;

        let visionText = "";
        let visionProvider = "none";

        // Try Claude first
        if (this.anthropic) {
            try {
                console.log("Trying Claude Vision (Primary)...");
                const claudeResponse = await this.anthropic.messages.create({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 600,
                    messages: [{
                        role: "user",
                        content: [
                            { type: "image", source: { type: "base64", media_type: "image/png", data: base64Image } },
                            { type: "text", text: visionPromptClaude }
                        ]
                    }]
                });
                visionText = claudeResponse.content[0].text;
                visionProvider = "Claude";
                console.log(`Claude Vision OK: ${visionText.substring(0, 100)}...`);
            } catch (err) {
                console.error("Claude Vision Failed:", err.message);
            }
        }

        // Fallback to OpenAI
        if (!visionText && this.openai) {
            try {
                console.log("Falling back to OpenAI Vision...");
                const openaiResponse = await this.openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{
                        role: "user",
                        content: [
                            { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } },
                            { type: "text", text: visionPromptOpenAI }
                        ]
                    }],
                    max_tokens: 400,
                    temperature: 0.5,
                });
                visionText = openaiResponse.choices[0].message.content;
                visionProvider = "OpenAI";
                console.log(`OpenAI Vision OK: ${visionText.substring(0, 100)}...`);
            } catch (err) {
                console.error("OpenAI Vision Failed:", err.message);
            }
        }

        // Parse vision response
        if (visionText) {
            const extract = (pattern) => {
                const m = visionText.match(pattern);
                return m ? m[1] : null;
            };

            const todayHighRaw = extract(/TODAY_HIGH[:\*]*\s*([\d.]+)/i);
            const todayLowRaw = extract(/TODAY_LOW[:\*]*\s*([\d.]+)/i);
            const currentRaw = extract(/CURRENT[:\*]*\s*([\d.]+)/i);
            const directionRaw = extract(/DIRECTION[:\*]*\s*(UP|DOWN|FLAT)/i);
            const trendRaw = extract(/TREND[:\*]*\s*(alcista|bajista|lateral)/i);
            const supportRaw = extract(/SUPPORT[:\*]*\s*([\d.]+)/i);
            const resistanceRaw = extract(/RESISTANCE[:\*]*\s*([\d.]+)/i);
            const structureRaw = extract(/STRUCTURE[:\*]*\s*(.+?)(?:\n|$)/i);

            if (todayHighRaw) visionData.todayHigh = parseFloat(todayHighRaw).toFixed(2);
            if (todayLowRaw) visionData.todayLow = parseFloat(todayLowRaw).toFixed(2);
            if (currentRaw) visionData.current = parseFloat(currentRaw).toFixed(2);
            if (directionRaw) visionData.direction = directionRaw.toUpperCase();
            if (trendRaw) visionData.trend = trendRaw.toLowerCase();
            if (supportRaw) visionData.support = parseFloat(supportRaw).toFixed(2);
            if (resistanceRaw) visionData.resistance = parseFloat(resistanceRaw).toFixed(2);
            if (structureRaw) visionData.structure = structureRaw.trim();

            console.log(`Vision [${visionProvider}]: ${visionData.todayLow} - ${visionData.todayHigh} | ${visionData.trend}`);
        }

        return visionData;
    }
}

module.exports = new AnalysisService();
