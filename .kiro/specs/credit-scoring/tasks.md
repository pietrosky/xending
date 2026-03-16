# Tasks — Credit Scoring System

## Fase 1: Core Engines + trendUtils

### 1.1 Infraestructura Base
- [x] Crear tipos TypeScript base: `engine.types.ts`, `trend.types.ts`, `application.types.ts`
- [x] Crear `trendUtils.ts` — librería compartida (analyze, classify, project, detectBreakpoints, rollingAverage)
- [x] Crear `chartColors.ts` — colores Xending para gráficos
- [x] Crear `scoreCalculator.ts` — cálculo de score consolidado con pesos y trend factor
- [x] Crear `engineRunner.ts` — ejecutor genérico de motores con interfaz estándar

### 1.2 Base de Datos — Migrations Fase 1
- [x] Migration `001_cs_applications.sql` — cs_applications, cs_application_status_log
- [x] Migration `002_cs_api_tables.sql` — cs_api_calls, cs_api_cache
- [x] Migration `003_cs_metadata.sql` — cs_metric_catalog, cs_metric_values, cs_scoring_versions, cs_audit_log
- [x] Migration `004_cs_compliance.sql` — cs_compliance_checks, cs_compliance_results
- [x] Migration `005_cs_sat.sql` — cs_sat_data, cs_sat_metrics, cs_sat_results + tablas especializadas
- [x] Migration `006_cs_buro.sql` — cs_buro_* (data, analysis, results, active_credits, consultations, liquidated, hawk, debt_rotation)
- [x] Migration `007_cs_documentation.sql` — cs_documents, cs_document_validations, cs_documentation_results
- [x] Migration `008_cs_financial.sql` — cs_financial_* (inputs, calculations, results, balance, income, related_parties, balanza)
- [x] Migration `009_cs_trend_tables.sql` — cs_trend_timeseries, cs_trend_results, cs_trend_ai_narrative, cs_trend_charts_config
- [x] Configurar RLS policies para todas las tablas Fase 1

### 1.3 API Clients
- [x] Crear `scoryClient.ts` — validateCompliance() con retry + cache
- [x] Crear `syntageClient.ts` — getCFDIs, getDeclaraciones, getScorePyME, getBuro, getHawk, etc.
- [x] Crear `apiCache.ts` — lógica de cache 24h en cs_api_cache

### 1.4 Engines Fase 1
- [x] Implementar `compliance.ts` — Scory integration, gate logic (pass/fail/hard_stop)
- [x] Implementar `satFacturacion.ts` — revenue quality, payment behavior (PUE/PPD), DSO/DPO, cancelaciones, facturado vs declarado, tendencias
- [x] Implementar `buro.ts` — Score PyME, créditos activos, rotación de deuda, consultas, liquidados, Hawk checks, tendencias
- [x] Implementar `documentation.ts` — completitud documental, OCR validation, expiración
- [x] Implementar `financial.ts` — balance sheet detallado, income statement, razones financieras, partes relacionadas, cross-validation Syntage ratios, tendencias

### 1.5 Edge Functions Fase 1
- [x] Crear `cs-orchestrator` — flujo principal de solicitud
- [x] Crear `cs-scory-proxy` — proxy seguro a Scory API
- [x] Crear `cs-syntage-proxy` — proxy seguro a Syntage API
- [x] Crear `cs-engine-runner` — ejecutor genérico de motores

### 1.6 Frontend Fase 1
- [x] Crear `CreditScoringLayout.tsx` — layout con sidebar Xending (gradient brand-1 → brand-2)
- [x] Crear `ApplicationList.tsx` — lista de solicitudes con status
- [x] Crear `NewApplicationForm.tsx` — formulario de nueva solicitud (RFC, empresa, monto, plazo, moneda)
- [x] Crear `EngineScoreCard.tsx` — tarjeta de score por motor (score, grade, tendencia, flags)
- [x] Crear `ApplicationOverview.tsx` — resumen ejecutivo con KPIs y 3 Gates
- [x] Configurar rutas en React Router para /credit-scoring/*

---

## Fase 2: Advanced Analysis + Trend Graphs

### 2.1 Base de Datos — Migrations Fase 2
- [x] Migration `010_cs_cashflow.sql` — cs_cashflow_* (inputs, calculations, scenarios, results)
- [x] Migration `011_cs_working_capital.sql` — cs_working_capital_* (inputs, cycle, aging, results)
- [x] Migration `012_cs_stability.sql` — cs_stability_* (timeseries, metrics, results)
- [x] Migration `013_cs_network.sql` — cs_network_* (counterparties, metrics, concentration, results, clients_detail, suppliers_detail, government, financial_institutions, products)
- [x] Migration `014_cs_guarantee.sql` — cs_guarantee_* (guarantees, documents, valuations, haircuts, results)
- [x] Migration `015_cs_fx.sql` — cs_fx_* (inputs, exposure, scenarios, results)
- [x] Migration `016_cs_employee.sql` — cs_employee_* (headcount, payroll, productivity, results)
- [x] Configurar RLS policies para tablas Fase 2

### 2.2 Engines Fase 2
- [x] Implementar `cashflow.ts` — EBITDA, DSCR actual/proforma, free cash flow, escenarios base/estrés, tendencias
- [x] Implementar `workingCapital.ts` — CCC (DSO+DIO-DPO), aging CxC/CxP, eficiencia cobranza, poder negociación, tendencias
- [x] Implementar `stability.ts` — variación ingresos, coeficiente variación, estacionalidad, clasificación patrón, tendencias
- [x] Implementar `network.ts` — HHI clientes/proveedores, gobierno, instituciones financieras, productos, tendencias
- [x] Implementar `guarantee.ts` — haircuts por tipo, cobertura 2:1, ajustes dinámicos por score
- [x] Implementar `fxRisk.ts` — currency mismatch, natural hedge, escenarios FX -10/-20/-30%
- [x] Implementar `employee.ts` — headcount, productividad, nómina/ingresos, shell company detection, tendencias

### 2.3 Frontend Fase 2
- [x] Crear `TrendChart.tsx` — componente Recharts con colores Xending (data real, proyección, benchmark, zonas umbral)
- [x] Crear `TrendDashboard.tsx` — grid de TrendCharts por motor, filtros por clasificación A-F
- [x] Crear `EngineDetailView.tsx` — vista detallada de un motor con métricas, benchmarks, flags, tendencias
- [x] Integrar tendencias en `EngineScoreCard.tsx` — mostrar dirección + clasificación
- [x] Crear página `TrendsPage.tsx` — dashboard completo de tendencias

---

## Fase 3: Decision Layer + AI Narrative

### 3.1 Base de Datos — Migrations Fase 3
- [x] Migration `017_cs_ai.sql` — cs_ai_analysis, cs_ai_scenarios, cs_ai_recommendations
- [x] Migration `018_cs_credit_limits.sql` — cs_credit_limits, cs_limit_calculations
- [x] Migration `019_cs_risk_matrix.sql` — cs_risk_matrix_results, cs_decision_gates
- [x] Migration `020_cs_review.sql` — cs_review_schedule, cs_review_triggers
- [x] Migration `021_cs_policies.sql` — cs_policies, cs_policy_versions, cs_policy_audit
- [x] Migration `022_cs_workflow.sql` — cs_workflow_queue, cs_workflow_decisions, cs_workflow_overrides
- [x] Configurar RLS policies para tablas Fase 3

### 3.2 Decision Engines
- [x] Implementar `aiRisk.ts` — OpenAI integration, narrativa de riesgo, top 3 riesgos/fortalezas, escenarios, confidence score, trend narrative consolidada
- [x] Implementar `creditLimit.ts` — 5 límites (flujo, ventas, EBITDA, garantía, portafolio), MIN(), binding constraint
- [x] Implementar `riskMatrix.ts` — Gate 1 (hard stops), Gate 2 (semáforo), Gate 3 (score consolidado 100pts)
- [-] Implementar `reviewFrequency.ts` — asignación frecuencia por riesgo, triggers automáticos
- [x] Implementar `policyEngine.ts` — configuración dinámica de límites, garantías, hard stops, covenants
- [x] Implementar `crossAnalyzer.ts` — 20 cruces inteligentes entre motores

### 3.3 Frontend Fase 3
- [x] Crear `RiskMatrixGates.tsx` — visualización de 3 Gates (hard stops, semáforo, score)
- [x] Crear `CreditLimitBreakdown.tsx` — barras horizontales de 5 límites con binding constraint
- [x] Crear `AIAnalysisPanel.tsx` — narrativa AI, top riesgos/fortalezas, trend narrative, escenarios
- [x] Crear `DecisionWorkflow.tsx` — flujo de aprobación con routing por monto y SLA
- [x] Crear `CrossAnalysisView.tsx` — vista de 20 cruces con severidad y acciones
- [x] Crear página `DecisionPage.tsx` — decisión final integrada

---

## Fase 4: Portfolio, Fraud, Dashboard Completo

### 4.1 Base de Datos — Migrations Fase 4
- [x] Migration `023_cs_portfolio.sql` — cs_portfolio_* (positions, limits, exposure, results)
- [x] Migration `024_cs_graph.sql` — cs_graph_* (nodes, edges, runs, alerts, scores)
- [x] Migration `025_cs_scenarios.sql` — cs_scenarios, cs_scenario_results
- [x] Migration `026_cs_covenants.sql` — cs_covenants, cs_covenant_monitoring
- [x] Migration `027_cs_cross_analysis.sql` — cs_cross_analysis
- [x] Migration `028_cs_benchmark.sql` — cs_benchmarks, cs_benchmark_comparisons, cs_benchmark_syntage_ratios, cs_benchmark_cross_validation
- [x] Configurar RLS policies para tablas Fase 4

### 4.2 Engines Fase 4
- [x] Implementar `portfolio.ts` — exposición sector/moneda/grupo, concentración post-originación, expected loss
- [x] Implementar `graphFraud.ts` — construcción de grafo, detección ciclos, facturación circular, shell networks
- [x] Implementar `scenarioEngine.ts` — escenarios estrés (ventas, margen, DSO, FX, combinado), breaking points
- [x] Implementar `covenantEngine.ts` — tipos de covenants, monitoreo, alertas breach
- [x] Implementar `benchmark.ts` — benchmarks por sector/tamaño/región, cross-validation Syntage ratios

### 4.3 Edge Functions Fase 4
- [x] Crear `cs-trend-analyzer` — cálculo batch de tendencias para todas las métricas
- [x] Crear `cs-report-generator` — generación PDF con branding Xending

### 4.4 Frontend Fase 4
- [x] Crear `ScoringReport.tsx` — preview PDF con executive summary, radar chart, gauge, barras benchmark
- [x] Crear página `ReportPage.tsx` — generación y descarga de PDF
- [x] Crear vista de Portfolio — exposición por sector/moneda/cliente
- [x] Crear vista de Policies — configuración dinámica de políticas
- [x] Crear vista de Benchmarks — gestión de benchmarks por industria
- [x] Dashboard de tendencias interactivo completo con filtros y drill-down
- [x] Integrar logo Xending y branding completo en todas las vistas

---

## Fase 5: Integración Real Syntage API

### 5.0 Documentación
- [x] Crear `docs/SYNTAGE_API_INTEGRATION_MAP.md` — mapa completo de 47 endpoints, filtros, engines que consumen cada uno

### 5.1 Core del Cliente API (syntageClient.ts)
- [x] Reescribir `syntageClient.ts` como módulo core: config, syntageRequest() con retry/backoff, HydraCollection, fetchAllPages(), entityPath()
- [x] Implementar autenticación X-API-Key + Accept-Version header
- [x] Implementar rate limit tracking desde response headers
- [x] Implementar paginación automática Hydra (hydra:next)
- [x] Mantener tipos legacy (CFDI, Declaracion, ScorePyME, etc.) para compatibilidad con engines existentes

### 5.2 Grupo 1: Datos Crudos SAT (syntageInvoices.ts)
- [x] Crear `syntageInvoices.ts` — módulo para datos crudos SAT
- [x] Implementar getInvoices() / getAllInvoices() con filtros completos (type[], isIssuer, dates, currency, paymentMethod, blacklistStatus)
- [x] Implementar getAllLineItems() / getInvoiceLineItems() — conceptos de factura
- [x] Implementar getAllPayments() / getInvoicePayments() — pagos PPD
- [x] Implementar getAllBatchPayments() — pagos agrupados
- [x] Implementar getAllCreditNotes() / getIssuedCreditNotes() / getAppliedCreditNotes()
- [x] Implementar getAllTaxRetentions() / getTaxRetentions() — retenciones ISR/IVA
- [x] Crear transformer toCFDI() — SyntageInvoice → CFDI legacy format
- [x] Crear fetchCFDIs() — fetch + transform en una llamada

### 5.3 Grupo 2: Datos Fiscales (syntageFiscal.ts) [DONE]
- [x] Crear `syntageFiscal.ts`
- [x] Implementar getTaxReturns() / getAllTaxReturns() / getTaxReturn() / getTaxReturnData() — declaraciones anuales/mensuales + datos extraídos
- [x] Implementar getTaxStatuses() / getTaxStatus() — constancia de situación fiscal
- [x] Implementar getTaxComplianceChecks() / getTaxComplianceCheck() — opinión de cumplimiento
- [x] Implementar getElectronicAccountingRecords() / getAllElectronicAccountingRecords() — balanza de comprobación
- [x] Crear transformer toDeclaracion() + fetchDeclaraciones() — SyntageTaxReturn → Declaracion legacy

### 5.4 Grupo 3: Buró de Crédito (syntageBuro.ts) [DONE]
- [x] Crear `syntageBuro.ts`
- [x] Implementar getBuroReports() / getAllBuroReports() / getBuroReport() — reportes Buró completos
- [x] Implementar getBuroAuthorizations() / createBuroAuthorization() — autorizaciones Buró
- [x] Crear transformers: toScorePyME(), toCreditosActivos(), toCreditosLiquidados(), toConsultasBuro(), toCalificacionesCartera(), toHawkResults()
- [x] Crear fetchBuroData() — convenience function que retorna todos los datos transformados para el Buró engine

### 5.5 Grupo 4: Registro Público y Garantías (syntageRegistry.ts) [DONE]
- [x] Crear `syntageRegistry.ts`
- [x] Implementar getRpcEntities() / getAllRpcEntities() / getRpcEntity() — Registro Público de Comercio
- [x] Implementar getRpcShareholders() — accionistas (insight)
- [x] Implementar getRugGuarantees() / getAllRugGuarantees() / getRugGuarantee() — garantías RUG
- [x] Implementar getRugOperations() / getAllRugOperations() / getRugOperation() — operaciones RUG

### 5.6 Grupo 5: Insights Pre-procesados (syntageInsights.ts) [DONE]
- [x] Crear `syntageInsights.ts`
- [x] Implementar getBalanceSheet() — balance general (con X-Insight-Format header)
- [x] Implementar getIncomeStatement() — estado de resultados
- [x] Implementar getFinancialRatios() — razones financieras
- [x] Implementar calculateSyntageScore() / getScores() — Syntage Score
- [x] Implementar getCashFlow() — flujo de efectivo (con type: total/payment-method/currency/invoice-type)
- [x] Implementar getAccountsReceivable() / getAccountsPayable() — CxC/CxP
- [x] Implementar getCustomerConcentration() / getSupplierConcentration()
- [x] Implementar getCustomerNetwork() / getVendorNetwork()
- [x] Implementar getEmployees() — empleados por periodo
- [x] Implementar getSalesRevenue() / getExpenditures()
- [x] Implementar getFinancialInstitutions() / getGovernmentCustomers()
- [x] Implementar getInvoicingBlacklist() — lista negra 69B
- [x] Implementar getRisks() — riesgos pre-calculados por Syntage
- [x] Implementar getProductsBought() / getProductsSold()
- [x] Implementar getInvoicingAnnualComparison()
- [x] Implementar getTrialBalance() — balanza de comprobación insight
- [x] Crear transformer toRazonesFinancieras() — SyntageFinancialRatios → RazonesFinancieras legacy

### 5.7 Grupo 6: Background Checks (syntageChecks.ts) [DONE]
- [x] Crear `syntageChecks.ts`
- [x] Implementar getBackgroundChecks() / getAllBackgroundChecks() / getBackgroundCheck() — investigaciones legales BIL
- [x] Implementar getGlobalBackgroundChecks() — lista global
- [x] Implementar getBackgroundCheckPdf() — descargar PDF
- [x] Implementar getBackgroundCheckRecords() — registros detallados

### 5.8 Grupo 7: Gestión / Orquestador (syntageManagement.ts) [DONE]
- [x] Crear `syntageManagement.ts`
- [x] Implementar getEntities() / getEntity() / createEntity() — gestión de entidades
- [x] Implementar getCredentials() / getCredential() / createCredential() / revalidateCredential() — credenciales SAT
- [x] Implementar getExtractions() / getAllExtractions() / getExtraction() / createExtraction() / stopExtraction() — extracciones de datos
- [x] Implementar getAddresses() — direcciones por código postal
- [x] Implementar createScheduler() — extracciones programadas
- [x] Implementar createExport() / getExport() — exportaciones CSV/XLSX
- [x] Implementar getFile() / downloadFile() — archivos asociados

---

## Fase 6: Flujo de Otorgamiento de Crédito

### 6A: Expedientes + State Machine + Pre-filtro

#### 6A.1 Tipos TypeScript
- [x] Crear `expediente.types.ts` — Expediente, ExpedienteToken, ExpedienteEvent, PreFilterInput/Result, BusinessRules, DEFAULT_BUSINESS_RULES
- [x] Definir ExpedienteStage (10 estados), CreditPurpose (4 propósitos), TokenPurpose (4 tipos), ExpedienteEventType (26 eventos)

#### 6A.2 Base de Datos
- [x] Migration `030_cs_expedientes.sql` — cs_expedientes, cs_expediente_tokens, cs_expediente_events, cs_business_rules
- [x] Secuencia + trigger para folio automático XND-YYYY-NNNNN
- [x] Trigger updated_at automático
- [x] Vista cs_expedientes_dashboard (último evento + tokens activos)
- [x] Reglas de negocio por defecto insertadas

#### 6A.3 Engine Pre-filtro
- [x] Crear `preFilter.ts` — 7 reglas de negocio: RFC, monto ($100K-$1M USD), propósito, ventas (10x), antigüedad (2 años), plazo (2-90 días), email
- [x] Conversión MXN→USD automática
- [x] validatePreFilterInput() para validación de formulario
- [x] CREDIT_PURPOSE_OPTIONS para UI

#### 6A.4 State Machine
- [x] Crear `expedienteStateMachine.ts` — transiciones válidas, eventos por transición, labels, descripciones, progreso
- [x] isValidTransition(), getNextStages(), isFinalStage(), canAdvance()
- [x] STAGE_TOKEN_REQUIRED — qué etapas requieren enviar link al solicitante
- [x] getProgress() — porcentaje de avance del expediente

#### 6A.5 Formulario actualizado
- [x] Reescribir `NewApplicationForm.tsx` con campos: propósito, ventas declaradas, antigüedad, plazo días, email, teléfono, representante legal
- [x] Integrar pre-filtro en tiempo real (panel visual GO/NO-GO con detalle por regla)
- [x] Actualizar `NewApplicationPage.tsx` para usar PreFilterInput

#### 6A.6 RLS Policies
- [x] Migration `030b_cs_rls_policies_fase6.sql` — RLS para cs_expedientes, cs_expediente_tokens, cs_expediente_events, cs_business_rules
- [x] Acceso anónimo para tokens públicos (solicitantes sin login)

### 6B: Integración Syntage Live (Buró + SAT)

#### 6B.1 Servicio de Expedientes
- [x] Crear `expedienteService.ts` — CRUD expedientes, transiciones con state machine, eventos audit log
- [x] createExpediente() con pre-filtro automático y auto-avance a pld_check
- [x] advanceExpediente() con validación de transiciones
- [x] rejectExpediente(), updatePldScore(), updateBuroScore(), linkSyntageEntity()
- [x] Consultas: getExpediente, getByFolio, listExpedientes, countByStage, getEvents

#### 6B.2 Servicio de Tokens
- [x] Crear `tokenService.ts` — generación/validación de tokens UUID con URLs
- [x] createToken(), createTokenForStage() (auto-detecta propósito por etapa)
- [x] validateToken() con verificación de expiración y uso
- [x] getTokenUrl(), getTokenUrlWithContext() para emails
- [x] getActiveTokens(), getTokensNearExpiry(), invalidateAllTokens()

#### 6B.3 Orquestador Syntage
- [x] Crear `syntageOrchestrator.ts` — flujo completo createEntity→credential→extraction→polling
- [x] orchestrateSyntage() — flujo SAT completo (5 pasos con tracking)
- [x] orchestrateBuroFlow() — flujo Buró independiente (autorización→extracción→polling)
- [x] Polling con timeout configurable y estados terminales
- [x] Extracciones en paralelo por tipo

#### 6B.4 Sistema de Emails (pendiente)
- [ ] Templates Xending (bienvenida, link Buró, link CIEC, link documentos, reminder)
- [ ] Servicio de envío (placeholder, integración SMTP/SES posterior)
- [ ] Lógica de reminders automáticos (48h antes de expiración)

#### 6B.5 Webhook/Polling Extracciones (pendiente)
- [ ] Edge function para recibir webhooks de Syntage
- [ ] Fallback polling para extracciones sin webhook

### 6C: Scoring Interno + Pérdida Esperada
- [ ] Scoring 2 capas del Excel (solvencia 1300pts + financiero 100pts)
- [ ] Motor PE = PD × EAD × LGD por cliente
- [ ] Integración scoring interno con scoring existente de engines
- [ ] Dashboard de PE por portafolio

### 6D: PLD Completo CNBV
- [ ] Listas internacionales (OFAC/ONU/UE/FinCEN/Interpol)
- [ ] Monitoreo operaciones ≥ $10K USD equivalente
- [ ] Bitácora inalterable (10 años retención)
- [ ] Reportes CNBV/UIF (XML compatible SITI)
- [ ] Control de acceso por roles PLD

### 6E: Documentación + Decisión Final
- [ ] Upload de documentos con Supabase Storage
- [ ] Validación documental automática (completitud, vigencia)
- [ ] Flujo de decisión (automática < umbral, comité > umbral)
- [ ] Generación de expediente PDF completo
