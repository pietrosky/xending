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
