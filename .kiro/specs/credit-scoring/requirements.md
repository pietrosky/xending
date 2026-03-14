# Requirements Document

## Introduction

Sistema modular de originación y scoring de crédito empresarial para Xending Capital, separado de xending_, con tablas cs_, integraciones con Scory y Syntage, preparado para operar créditos en MXN y USD.

### Objetivos del Sistema

El sistema debe:
- Calcular cada módulo por separado
- Guardar inputs, outputs y explicación de cada variable
- Comparar cada módulo contra benchmarks
- Hacer cruces entre módulos
- Generar recomendación de crédito
- Calcular monto sugerido
- Calcular garantía requerida (política 2:1)
- Determinar periodicidad de revisión
- Detectar riesgos ocultos con IA
- Permitir agregar o quitar módulos sin romper el sistema

### Arquitectura de 3 Capas

**Capa 1: Data Layer**
- Scory (PLD/KYC)
- Syntage (SAT, Buró, Indicadores)
- Documentos (OCR, uploads)
- Estados financieros cargados por cliente
- Tablas internas de benchmarks
- Tablas internas de portafolio
- FX / tipo de cambio / moneda del crédito

**Capa 2: Engines Layer**
- Compliance_Engine
- Documentation_Engine
- SAT_Facturacion_Engine
- Financial_Engine
- CashFlow_Engine
- Buro_Engine
- Network_Engine
- Business_Stability_Engine
- Operational_Risk_Engine
- FX_Risk_Engine
- Guarantee_Engine
- Benchmark_Engine
- Portfolio_Engine
- Graph_Fraud_Engine

**Capa 3: Decision Layer**
- AI_Risk_Engine
- Credit_Limit_Engine
- Risk_Matrix_Engine
- Review_Frequency_Engine
- Decision_Workflow_Engine
- Policy_Engine
- Scenario_Engine
- Covenant_Engine

## Glossary

- **Credit_Scoring_Engine**: Motor principal que orquesta los módulos de scoring independientes
- **Compliance_Engine**: Módulo PLD/KYC (integración Scory) - listas negras, SYGER, RUG, PEPs, OFAC
- **SAT_Facturacion_Engine**: Análisis de facturación y cumplimiento fiscal (integración Syntage)
- **Documentation_Engine**: Evaluación de completitud documental
- **Financial_Engine**: Análisis de estados financieros e indicadores
- **CashFlow_Engine**: Análisis de flujo de caja, DSCR, capacidad de pago
- **Buro_Engine**: Análisis de buró de crédito (integración Syntage)
- **Network_Engine**: Análisis de concentración de clientes/proveedores, HHI
- **Business_Stability_Engine**: Análisis de estabilidad y volatilidad del negocio
- **Operational_Risk_Engine**: Validación de sustancia económica y riesgo operativo
- **FX_Risk_Engine**: Análisis de riesgo cambiario para créditos en USD
- **Guarantee_Engine**: Evaluación de garantías con haircuts y cobertura 2:1
- **Portfolio_Engine**: Análisis de impacto en concentración de cartera
- **Graph_Fraud_Engine**: Detección de fraude mediante análisis de grafos
- **Benchmark_Engine**: Comparación contra promedios de industria
- **AI_Risk_Engine**: Análisis de riesgo con inteligencia artificial
- **Credit_Limit_Engine**: Cálculo de monto máximo a prestar
- **Risk_Matrix_Engine**: Matriz de decisión multicapa
- **Review_Frequency_Engine**: Determinación de periodicidad de revisión
- **Policy_Engine**: Configuración dinámica de políticas y límites
- **Scenario_Engine**: Motor de escenarios de estrés
- **Covenant_Engine**: Gestión de covenants para aprobados condicionados
- **DSCR**: Debt Service Coverage Ratio - Cobertura del servicio de deuda
- **HHI**: Herfindahl-Hirschman Index - Índice de concentración
- **LGD**: Loss Given Default - Pérdida dado el incumplimiento (40%)
- **PD**: Probability of Default - Probabilidad de incumplimiento
- **EAD**: Exposure at Default - Exposición al momento del incumplimiento

## Requirements

### Requirement 1: Credit Application Management

**User Story:** As a credit analyst, I want to create and manage credit applications, so that I can track the complete lifecycle of loan requests.

#### Acceptance Criteria

1. THE Credit_Scoring_Engine SHALL create a new Credit_Application with unique identifier, applicant RFC, company name, requested amount, term, and currency (MXN/USD)
2. WHEN a Credit_Application is created, THE Credit_Scoring_Engine SHALL set initial status to "pending_scoring"
3. THE Credit_Scoring_Engine SHALL store Credit_Application data independently from existing xending_ tables using cs_ prefix
4. WHEN a Credit_Application status changes, THE Credit_Scoring_Engine SHALL log the transition with timestamp and user
5. THE Credit_Scoring_Engine SHALL version each data snapshot for audit purposes

---

### Requirement 2: Compliance Engine (Scory Integration)

**User Story:** As a compliance officer, I want to validate applicants against PLD/KYC requirements, so that I can ensure regulatory compliance before credit evaluation.

#### Acceptance Criteria

1. WHEN a Credit_Application is submitted, THE Compliance_Engine SHALL query Scory_API for compliance validations
2. THE Compliance_Engine SHALL validate against: listas negras, SYGER, RUG, PEPs, OFAC, and 69B
3. THE Compliance_Engine SHALL return Pass/Fail with detailed risk flags for each validation type
4. IF any critical validation fails (listas negras, OFAC, 69B directo), THEN THE Compliance_Engine SHALL trigger hard stop with blocking reason
5. IF non-critical validations have warnings (PEPs), THEN THE Compliance_Engine SHALL return status "review_required"
6. THE Compliance_Engine SHALL operate as gate (pass/fail), not contributing to weighted score
7. THE Compliance_Engine SHALL store results in cs_compliance_checks and cs_compliance_results

---

### Requirement 3: SAT/Facturación Engine (Syntage Integration)

**User Story:** As a credit analyst, I want to analyze the applicant's invoicing patterns and tax compliance, so that I can assess their commercial activity and fiscal health.

#### Acceptance Criteria

1. WHEN Compliance_Engine returns Pass, THE SAT_Facturacion_Engine SHALL query Syntage_API for SAT data
2. THE SAT_Facturacion_Engine SHALL retrieve: CFDIs emitidas, CFDIs recibidas, Declaraciones anuales, Constancia Situación Fiscal, Lista 69B status
3. THE SAT_Facturacion_Engine SHALL calculate: total facturado últimos 12 meses, promedio mensual, tendencia de crecimiento
4. THE SAT_Facturacion_Engine SHALL retrieve Syntage Score (0-1000) with 13 variables: DSO, DPO, margins, growth, solvency
5. THE SAT_Facturacion_Engine SHALL detect risk indicators: opinión cumplimiento negativa, contrapartes en lista negra, riesgo cambiario (>15% facturas en moneda extranjera), facturación intercompañía
6. THE SAT_Facturacion_Engine SHALL compare metrics against industry benchmarks
7. THE SAT_Facturacion_Engine SHALL contribute 15% to weighted score
8. THE SAT_Facturacion_Engine SHALL store results in cs_sat_data, cs_sat_metrics, cs_sat_results
9. THE SAT_Facturacion_Engine SHALL calculate revenue quality: ingresos netos reales (ventas - cancelaciones - notas de crédito - descuentos), ratio cancelaciones/ventas por cliente, ratio notas de crédito/ventas
10. THE SAT_Facturacion_Engine SHALL calculate payment behavior: % ventas PUE (pago inmediato) vs PPD (a plazo), % cobrado de PPD (eficiencia de cobranza real), días para cobrar promedio (DSO real desde CFDIs)
11. THE SAT_Facturacion_Engine SHALL calculate expense analysis: gastos netos, % gastos PUE vs PPD, días para pagar promedio (DPO real desde CFDIs), % pagado de PPD
12. THE SAT_Facturacion_Engine SHALL calculate income vs cost comparison: ingresos netos vs (gastos netos + nómina), margen operativo real desde facturación, ganancia o pérdida por periodo
13. THE SAT_Facturacion_Engine SHALL analyze cash flow from invoices: entradas PUE + pagos recibidos PPD, salidas PUE + pagos emitidos PPD + nómina, flujo neto mensual desde CFDIs
14. THE SAT_Facturacion_Engine SHALL calculate accounts receivable aging: saldo pendiente PPD emitidas, saldo pagado (PUE + pagos PPD), tendencia de CxC por periodo
15. THE SAT_Facturacion_Engine SHALL calculate accounts payable aging: saldo pendiente PPD recibidas, saldo pagado, tendencia de CxP por periodo
16. THE SAT_Facturacion_Engine SHALL analyze blacklisted invoices: facturas emitidas/recibidas con contrapartes en lista 69B, monto total expuesto a contrapartes en lista negra
17. THE SAT_Facturacion_Engine SHALL compare facturado vs declarado: total facturado desde última declaración vs ingresos totales declarados, detectar discrepancias > 10%
18. THE SAT_Facturacion_Engine SHALL analyze product/service diversification: desglose de productos/servicios vendidos con peso %, concentración por producto (HHI productos)
19. IF cancelaciones emitidas > 10% de ventas, THEN THE SAT_Facturacion_Engine SHALL flag "high_cancellation_risk"
20. IF cancelaciones recibidas > 12% de compras, THEN THE SAT_Facturacion_Engine SHALL flag "supplier_cancellation_risk"
21. IF facturado vs declarado discrepancia > 15%, THEN THE SAT_Facturacion_Engine SHALL flag "fiscal_inconsistency_risk"

---

### Requirement 4: Documentation Engine

**User Story:** As a credit analyst, I want to verify document completeness, so that I can ensure all required information is available for credit decision.

#### Acceptance Criteria

1. THE Documentation_Engine SHALL define required documents: Acta Constitutiva, Poder del Representante, INE Representante, Comprobante Domicilio, Estados Financieros, Declaraciones Anuales
2. WHEN documents are uploaded, THE Documentation_Engine SHALL validate document type, format, and readability via OCR
3. THE Documentation_Engine SHALL calculate completeness percentage
4. IF critical documents are missing (Acta Constitutiva, INE), THEN THE Documentation_Engine SHALL block further evaluation
5. THE Documentation_Engine SHALL track document expiration dates and flag documents expiring within 30 days
6. THE Documentation_Engine SHALL contribute 5% to weighted score
7. THE Documentation_Engine SHALL store results in cs_documents, cs_document_validations, cs_documentation_results

---

### Requirement 5: Financial Engine

**User Story:** As a credit analyst, I want to analyze financial statements and indicators, so that I can assess the applicant's financial health.

#### Acceptance Criteria

1. THE Financial_Engine SHALL accept financial data from: Syntage declaraciones anuales, manual upload, or both
2. THE Financial_Engine SHALL calculate indicators: Razón Corriente, Prueba Ácida, Endeudamiento Total, Cobertura de Intereses, ROE, ROA, Margen Operativo
3. THE Financial_Engine SHALL calculate Estado de Resultados: Ingresos, Costos, Utilidad Bruta, Gastos Operativos, EBITDA, Utilidad Neta
4. IF Razón Corriente < 1.0, THEN THE Financial_Engine SHALL flag "liquidity_risk"
5. IF Endeudamiento Total > 70%, THEN THE Financial_Engine SHALL flag "leverage_risk"
6. THE Financial_Engine SHALL compare each indicator against industry benchmarks
7. THE Financial_Engine SHALL contribute 12% to weighted score
8. THE Financial_Engine SHALL store results in cs_financial_inputs, cs_financial_calculations, cs_financial_results
9. THE Financial_Engine SHALL analyze Balance Sheet (Estado de Posición Financiera) from Syntage declaraciones anuales with full detail: Activo corto plazo (efectivo, inversiones, clientes nacionales/extranjeros partes relacionadas/no relacionadas, CxC, deudores diversos, inventarios, pagos anticipados), Activo largo plazo (propiedades/planta/equipo, intangibles, inversiones en asociadas), Pasivo corto plazo (préstamos bancarios, proveedores nacionales/extranjeros, CxP, instrumentos financieros, acreedores diversos, impuestos, anticipos clientes), Pasivo largo plazo (CxP LP, instrumentos financieros LP, beneficio empleados), Capital (capital social, utilidades acumuladas, pérdidas acumuladas)
10. THE Financial_Engine SHALL calculate asset quality metrics: % activos líquidos vs fijos, % activos corto vs largo plazo, calidad de cartera (CxC vigente vs vencida vs etapas de riesgo), estimación preventiva para riesgos crediticios, bienes adjudicados
11. THE Financial_Engine SHALL analyze related-party exposure: CxC con partes relacionadas nacionales/extranjeras, CxP con partes relacionadas, proveedores partes relacionadas, deudores diversos partes relacionadas, total exposición partes relacionadas como % del activo
12. THE Financial_Engine SHALL analyze international exposure: activos/pasivos en extranjero, clientes/proveedores extranjeros, inversiones extranjeras, efectivo extranjero
13. THE Financial_Engine SHALL analyze Income Statement detail from Syntage: ventas nacionales/extranjeras (partes relacionadas/no relacionadas), devoluciones/descuentos, costo de ventas detallado (materiales, mano de obra directa/indirecta, maquilas, gastos indirectos), gastos operación (generales, administración, venta), resultado integral de financiamiento (intereses a favor/cargo nacionales/extranjeros, ganancia/pérdida cambiaria, REPOMO), ISR corriente y diferido, PTU
14. THE Financial_Engine SHALL calculate cost structure analysis: % costo materiales vs mano de obra vs indirectos, margen bruto real, gastos operativos como % de ventas, carga financiera como % de ventas
15. THE Financial_Engine SHALL cross-validate Syntage financial ratios against own calculations: liquidez (coeficiente solvencia, prueba ácida, coeficiente caja, razón efectivo/activo, capital trabajo/ventas), actividad (rotación activos, rotación inventario, uso activos fijos, ventas/capital operativo, periodo pago/cobro), rentabilidad (ROA, ROE, rendimiento ventas, margen bruto, ROI), apalancamiento (coeficiente deuda, coeficiente endeudamiento), cobertura (intensidad capital), solvencia (costo financiamiento/ventas)
16. THE Financial_Engine SHALL analyze Balanza de Comprobación from Syntage: saldo inicial, debe, haber, saldo final por cuenta, detección de movimientos inusuales, tendencias mensuales por cuenta
17. IF exposición partes relacionadas > 20% del activo, THEN THE Financial_Engine SHALL flag "related_party_concentration_risk"
18. IF ISR diferido significativo vs corriente, THEN THE Financial_Engine SHALL flag "tax_planning_review"
19. IF pérdida cambiaria material, THEN THE Financial_Engine SHALL flag "fx_loss_risk" and notify FX_Risk_Engine

---

### Requirement 6: CashFlow Engine

**User Story:** As a credit analyst, I want to analyze if the applicant can actually pay the debt, so that I can assess repayment capacity beyond just financial ratios.

#### Acceptance Criteria

1. THE CashFlow_Engine SHALL calculate from: ingresos SAT, gastos SAT, declaraciones anuales, estados financieros, deuda actual buró, monto solicitado, plazo, tasa, moneda
2. THE CashFlow_Engine SHALL calculate: EBITDA, EBITDA margin, flujo operativo estimado, CAPEX, free cash flow
3. THE CashFlow_Engine SHALL calculate: servicio de deuda actual, servicio de deuda proyectado, DSCR actual, DSCR proforma
4. THE CashFlow_Engine SHALL apply rules: DSCR > 1.50 = fuerte, 1.20-1.49 = aceptable, 1.00-1.19 = débil, < 1.00 = crítico
5. IF DSCR proforma < 1.0, THEN THE CashFlow_Engine SHALL trigger hard stop
6. THE CashFlow_Engine SHALL calculate: capacidad máxima de pago mensual, monto máximo sostenible por flujo
7. THE CashFlow_Engine SHALL generate scenarios: base and stress
8. THE CashFlow_Engine SHALL contribute 18% to weighted score
9. THE CashFlow_Engine SHALL store results in cs_cashflow_inputs, cs_cashflow_calculations, cs_cashflow_scenarios, cs_cashflow_results

---

### Requirement 7: Buró Engine (Syntage Integration)

**User Story:** As a credit analyst, I want to analyze the applicant's credit bureau history, so that I can assess their payment behavior, existing obligations, and detect if they are rotating debt across institutions.

#### Acceptance Criteria

1. THE Buro_Engine SHALL query Syntage_API for Buró de Crédito report (Informe Buró + Score PyME + Califica)
2. THE Buro_Engine SHALL retrieve: Score PyME, Califica rating, payment history, existing credits, delinquency records
3. THE Buro_Engine SHALL apply score mapping: 700+ = excellent, 650-699 = good, 600-649 = fair, < 600 = poor
4. IF Score PyME < 550, THEN THE Buro_Engine SHALL flag "high_risk" requiring additional guarantees
5. THE Buro_Engine SHALL calculate total existing debt obligations
6. THE Buro_Engine SHALL identify negative records: atrasos > 90 días, créditos castigados, demandas
7. IF negative records exist in last 24 months, THEN THE Buro_Engine SHALL apply score penalty
8. THE Buro_Engine SHALL contribute 10% to weighted score
9. THE Buro_Engine SHALL store results in cs_buro_data, cs_buro_analysis, cs_buro_results
10. THE Buro_Engine SHALL analyze active credits detail: número de créditos activos simultáneos, número de instituciones otorgantes distintas, tipo de crédito por institución, moneda, plazo, monto original vs vigente, distribución de atraso por buckets (1-29, 30-59, 60-89, 90-119, 120-179, 180+ días), histórico de pagos por crédito
11. THE Buro_Engine SHALL detect debt rotation patterns: si abre crédito nuevo dentro de 60 días de liquidar otro = posible rotación, si monto vigente total es similar o mayor al original total = no está pagando capital, si tiene créditos con 3+ instituciones simultáneas = sobreendeudamiento potencial, si ratio deuda vigente / ingresos SAT > 40% = apalancamiento excesivo
12. THE Buro_Engine SHALL analyze bureau consultation frequency: consultas últimos 3 meses, consultas últimos 12 meses, consultas últimos 24 meses, consultas más de 24 meses, consultas por instituciones financieras vs comerciales
13. IF consultas financieras últimos 3 meses > 3, THEN THE Buro_Engine SHALL flag "desperate_credit_seeking" (está buscando dinero en todos lados)
14. IF consultas financieras últimos 12 meses > 8, THEN THE Buro_Engine SHALL flag "excessive_credit_shopping"
15. THE Buro_Engine SHALL analyze liquidated credits: quitas (haircuts taken by lender), daciones en pago, quebrantos (write-offs), pagos parciales
16. IF any crédito liquidado con quita/quebranto in last 36 months, THEN THE Buro_Engine SHALL flag "prior_default_history" and apply severe score penalty
17. THE Buro_Engine SHALL analyze historical portfolio quality: calificación de cartera mensual (vigente, vencido 1-29, 30-59, 60-89, 90+ días), tendencia de deterioro o mejora en últimos 12 meses
18. THE Buro_Engine SHALL run Hawk compliance checks from Syntage: juicios civiles/penales/amparo, servidores públicos sancionados, funcionarios públicos, fiscal créditos, 69B facturas, actividades vulnerables, FGJ, FGR, comunicados FGR, Interpol
19. IF any Hawk check returns positive match, THEN THE Buro_Engine SHALL flag with severity level and notify Compliance_Engine
20. THE Buro_Engine SHALL calculate debt service from bureau: total pagos mensuales estimados de créditos activos, para alimentar al CashFlow_Engine con deuda real
21. THE Buro_Engine SHALL analyze credit type concentration: % deuda en líneas de crédito vs créditos empresariales vs comerciales, diversificación de fuentes de financiamiento
22. IF créditos activos > 5 simultáneos, THEN THE Buro_Engine SHALL flag "over_leveraged"
23. IF monto vigente total / monto original total > 85% en créditos con > 6 meses, THEN THE Buro_Engine SHALL flag "not_paying_principal" (no está pagando capital, solo intereses o rolando)
24. THE Buro_Engine SHALL calculate Score PyME cause analysis: interpretar las causas del valor del score (ej: "Z3 - Morosidad en cuentas comerciales", "W3 - Falta de información reciente")
25. THE Buro_Engine SHALL store enhanced results in cs_buro_active_credits, cs_buro_consultations, cs_buro_liquidated, cs_buro_hawk_checks, cs_buro_debt_rotation

---

### Requirement 8: Network Engine

**User Story:** As a credit analyst, I want to detect commercial dependency and concentration, so that I can assess business fragility.

#### Acceptance Criteria

1. THE Network_Engine SHALL analyze from Syntage: CFDIs emitidos, CFDIs recibidos, contrapartes, pesos de concentración
2. THE Network_Engine SHALL calculate: HHI clientes, HHI proveedores, top 1 cliente %, top 3 clientes %, top 1 proveedor %, top 3 proveedores %
3. THE Network_Engine SHALL detect: dependencia de gobierno, dependencia de sector, concentración por moneda, concentración por país, related parties
4. THE Network_Engine SHALL apply rules: HHI > 1500 = atención, top 1 cliente > 35% = riesgo, top 1 cliente > 50% = alto riesgo, top 3 clientes > 70% = alerta fuerte
5. IF top 1 proveedor > 40%, THEN THE Network_Engine SHALL flag "operational_dependency_risk"
6. THE Network_Engine SHALL generate concentration map and dependency narrative
7. THE Network_Engine SHALL contribute 8% to weighted score
8. THE Network_Engine SHALL store results in cs_network_counterparties, cs_network_metrics, cs_network_concentration, cs_network_results
9. THE Network_Engine SHALL analyze client network detail from Syntage: emitido total, total cancelado emitido, % cancelado, descuentos, notas de crédito emitidas, emitido por cobrar, emitido neto, PUE emitido, PPD emitido, conteo PPD, monto pagado PPD, % cobrado PPD, días para cobrar — por cada cliente
10. THE Network_Engine SHALL analyze supplier network detail from Syntage: recibido total, total cancelado recibido, % cancelado, descuentos, notas de crédito recibidas, recibido por pagar, recibido neto, PUE recibido, PPD recibido, conteo PPD, monto pagado PPD, % pagado PPD, días para pagar — por cada proveedor
11. THE Network_Engine SHALL analyze government revenue from Syntage: clientes gubernamentales identificados por SAT, % ingresos de gobierno sobre ventas totales, diversificación de contratos gubernamentales, DSO específico gobierno vs privado
12. IF ingresos gobierno > 50%, THEN THE Network_Engine SHALL flag "government_dependency" (estable pero riesgo de pago lento y cambio de administración)
13. THE Network_Engine SHALL analyze financial institution relationships from Syntage/CONDUSEF: instituciones de banca múltiple, SOFOM ENR, instituciones de seguros, otros, volumen de transacciones por institución
14. THE Network_Engine SHALL analyze product/service diversification: productos/servicios vendidos con peso %, productos/servicios comprados con peso %, HHI por producto (concentración de oferta)
15. IF top 1 producto > 60% de ventas, THEN THE Network_Engine SHALL flag "product_concentration_risk"
16. THE Network_Engine SHALL detect payment behavior by counterparty: clientes que pagan lento (DSO > promedio + 1 std dev), proveedores a los que paga lento, clientes con alto % cancelaciones
17. THE Network_Engine SHALL store enhanced results in cs_network_clients_detail, cs_network_suppliers_detail, cs_network_government, cs_network_financial_institutions, cs_network_products

---

### Requirement 9: Business Stability Engine

**User Story:** As a credit analyst, I want to know if the business is stable or erratic, so that I can assess predictability of cash flows.

#### Acceptance Criteria

1. THE Business_Stability_Engine SHALL analyze: facturación mensual 24-36 meses, gastos mensuales, pagos y cobros, variación de clientes
2. THE Business_Stability_Engine SHALL calculate: variación mensual de ingresos, desviación estándar, coeficiente de variación, tendencia rolling 3/6/12 meses
3. THE Business_Stability_Engine SHALL detect: estacionalidad, meses con caída > 20%, meses con margen negativo
4. THE Business_Stability_Engine SHALL calculate: cancelaciones sobre ventas, notas de crédito sobre ventas
5. THE Business_Stability_Engine SHALL apply rules: volatilidad alta = score menor, ventas cayendo 3 trimestres = alerta, cancelaciones > 10% emitidas = alerta
6. THE Business_Stability_Engine SHALL classify pattern: estable / cíclico / errático / deteriorando
7. THE Business_Stability_Engine SHALL contribute 10% to weighted score
8. THE Business_Stability_Engine SHALL store results in cs_stability_timeseries, cs_stability_metrics, cs_stability_results

---

### Requirement 10: Operational Risk Engine

**User Story:** As a credit analyst, I want to detect if the company is real and operationally consistent, so that I can identify shell companies or nominees.

#### Acceptance Criteria

1. THE Operational_Risk_Engine SHALL validate from Scory: domicilio, geolocalización fotos, consistencia giro vs instalaciones
2. THE Operational_Risk_Engine SHALL validate: accionistas vs perfil económico, documentos societarios, representantes, RUG, registros públicos
3. THE Operational_Risk_Engine SHALL calculate: consistency score, legal existence score, operational footprint score, ownership clarity score
4. THE Operational_Risk_Engine SHALL detect: nominee risk score, shell-company risk score
5. THE Operational_Risk_Engine SHALL apply rules: domicilio inconsistente = alerta, fotos no corresponden = alerta, accionistas sin congruencia = alerta
6. IF poderes/representación dudosa, THEN THE Operational_Risk_Engine SHALL trigger review or block
7. IF empresa sin sustancia, THEN THE Operational_Risk_Engine SHALL require rechazo or garantía reforzada
8. THE Operational_Risk_Engine SHALL contribute 10% to weighted score
9. THE Operational_Risk_Engine SHALL store results in cs_operational_checks, cs_operational_evidence, cs_operational_flags, cs_operational_results
10. THE Operational_Risk_Engine SHALL analyze corporate structure from Syntage/Registro Público: FME, razón social, duración de la sociedad, domicilio social, fecha de constitución, accionistas (nombre, RFC, CURP, nacionalidad, acciones, porcentaje), actos protocolizados, asambleas
11. THE Operational_Risk_Engine SHALL analyze RUG (Registro Único de Garantías) from Syntage: garantías registradas (número, fecha, otorgante, acreedor, tipo, monto, moneda, descripción, vigencia), detectar si activos ya están comprometidos como garantía con otros acreedores
12. IF activos ofrecidos como garantía ya están registrados en RUG con otro acreedor, THEN THE Operational_Risk_Engine SHALL flag "guarantee_already_pledged" and notify Guarantee_Engine
13. THE Operational_Risk_Engine SHALL analyze Buró de Incidencias Legales from Syntage: juicios en 30+ jurisdicciones (Suprema Corte, tribunales estatales, laborales federales/estatales), procedimientos administrativos, FOBAPROA, PROFECO, funcionarios sancionados SFP, proveedores sancionados SFP, quiebras/concursos mercantiles, sanciones Banco Mundial, FCPA, sanciones CNBV, contribuyentes operaciones falsas SAT, inhabilitados SFP, Interpol, Panama/Paradise/Offshore/Bahama Papers
14. IF incidencias legales activas encontradas, THEN THE Operational_Risk_Engine SHALL classify severity (informativo/atención/crítico) and flag accordingly
15. THE Operational_Risk_Engine SHALL validate shareholder consistency: cruzar accionistas Syntage vs Scory vs documentos, verificar que RFC de accionistas no estén en listas negras, verificar congruencia entre % accionario y perfil económico
16. THE Operational_Risk_Engine SHALL analyze Constancia de Situación Fiscal from Syntage: estatus, fecha último cambio, correo, teléfono, dirección, actividades económicas, regímenes, obligaciones fiscales
17. IF actividad económica declarada no corresponde con facturación real, THEN THE Operational_Risk_Engine SHALL flag "activity_mismatch_risk"
18. THE Operational_Risk_Engine SHALL store enhanced results in cs_operational_corporate, cs_operational_rug, cs_operational_legal_incidents, cs_operational_shareholders, cs_operational_fiscal_status

---

### Requirement 11: FX Risk Engine

**User Story:** As a credit analyst, I want to assess currency risk for USD loans, so that I can protect against devaluation scenarios.

#### Acceptance Criteria

1. THE FX_Risk_Engine SHALL be mandatory for all USD credit applications
2. THE FX_Risk_Engine SHALL analyze: moneda del crédito, moneda de ingresos, moneda de costos, moneda de facturación, moneda de cuentas por cobrar, moneda de deuda
3. THE FX_Risk_Engine SHALL calculate: currency mismatch ratio, % ingresos en misma moneda del crédito, natural hedge ratio, uncovered FX exposure
4. THE FX_Risk_Engine SHALL calculate: EBITDA sensitivity a FX, DSCR stressed por FX, LTV stressed por FX si garantía en otra moneda
5. THE FX_Risk_Engine SHALL apply rules: crédito USD con ingresos 100% MXN sin cobertura = alto riesgo, ingresos USD > 70% = riesgo bajo
6. THE FX_Risk_Engine SHALL run scenarios: base, estrés MXN -10%, estrés MXN -20%, estrés MXN -30%
7. THE FX_Risk_Engine SHALL output: score FX, vulnerabilidad cambiaria, recomendación de moneda, obligación de cobertura, gatillos de revisión
8. THE FX_Risk_Engine SHALL contribute 7% to weighted score
9. THE FX_Risk_Engine SHALL store results in cs_fx_inputs, cs_fx_exposure, cs_fx_scenarios, cs_fx_results

---

### Requirement 12: Guarantee Engine

**User Story:** As a credit analyst, I want to evaluate guarantees with proper haircuts, so that I can ensure adequate collateral coverage (2:1 policy).

#### Acceptance Criteria

1. THE Guarantee_Engine SHALL accept guarantee types: inmueble, vehículo, cuentas por cobrar, inventario, cash collateral, aval personal/corporativo, garantía prendaria, cesión de derechos, fideicomiso de garantía
2. THE Guarantee_Engine SHALL capture: monto solicitado, monto aprobado preliminar, tipo garantía, valor comercial, valor forzoso, liquidez, documentación, moneda, jurisdicción
3. THE Guarantee_Engine SHALL apply haircuts: cash USD 0-10%, cash MXN contra crédito USD 10-20%, cuentas por cobrar 35-50%, inmueble 30-45%, inventario 50-70%, vehículo 45-60%
4. THE Guarantee_Engine SHALL enforce policy: cobertura objetivo mínima = 200% del monto aprobado (configurable)
5. IF score baja, THEN THE Guarantee_Engine SHALL increase required coverage (2.25x or 2.5x)
6. IF crédito USD con garantía MXN, THEN THE Guarantee_Engine SHALL apply additional FX haircut
7. THE Guarantee_Engine SHALL calculate: valor elegible neto, cobertura neta, faltante de garantía, si cumple 2:1
8. THE Guarantee_Engine SHALL store results in cs_guarantees, cs_guarantee_documents, cs_guarantee_valuations, cs_guarantee_haircuts, cs_guarantee_results

---

### Requirement 13: Portfolio Engine

**User Story:** As a credit committee member, I want to assess portfolio impact before approving, so that I can manage concentration risk.

#### Acceptance Criteria

1. THE Portfolio_Engine SHALL analyze current portfolio: sector, geografía, moneda, contrapartes, dependencia por cliente final
2. THE Portfolio_Engine SHALL calculate: exposición por sector, exposición por moneda, exposición por grupo económico, exposición por cliente final compartido
3. THE Portfolio_Engine SHALL calculate: correlación de cartera, concentración post-originación, expected loss incremental, worst-case loss incremental
4. THE Portfolio_Engine SHALL apply rules: si nueva operación eleva concentración sectorial arriba de límite = penalizar
5. IF aumenta exposición USD sin cobertura, THEN THE Portfolio_Engine SHALL penalize
6. IF varios acreditados dependen del mismo comprador, THEN THE Portfolio_Engine SHALL penalize
7. THE Portfolio_Engine SHALL output: score cartera, impacto incremental, semáforo portafolio, recomendación (aprobar/aprobar menor monto/rechazar por concentración)
8. THE Portfolio_Engine SHALL contribute 5% to weighted score
9. THE Portfolio_Engine SHALL store results in cs_portfolio_positions, cs_portfolio_limits, cs_portfolio_exposure, cs_portfolio_results

---

### Requirement 14: Graph Fraud Engine

**User Story:** As a compliance officer, I want to detect invoice fraud and suspicious networks, so that I can identify simulation and related-party schemes.

#### Acceptance Criteria

1. THE Graph_Fraud_Engine SHALL build graph from: CFDIs (RFC emisor/receptor, montos, fechas), accionistas, representantes, domicilios, teléfonos, cuentas bancarias, correos
2. THE Graph_Fraud_Engine SHALL create nodes: empresa solicitante, clientes, proveedores, accionistas, representantes legales, direcciones, teléfonos, cuentas, garantías, empresas relacionadas, entidades en listas negras
3. THE Graph_Fraud_Engine SHALL create edges: emitió factura a, recibió factura de, comparte accionista con, comparte representante con, comparte domicilio con, comparte teléfono con, comparte cuenta con
4. THE Graph_Fraud_Engine SHALL detect: facturación circular, contrapartes de vida corta, contrapartes en 69B, facturación masiva con pocas entidades, concentración extrema con entidades relacionadas
5. THE Graph_Fraud_Engine SHALL calculate: degree centrality, betweenness centrality, connected components, cycles/loops, related-party clusters, blacklisted-neighbor score, shell-network proximity score
6. THE Graph_Fraud_Engine SHALL apply rules: ciclo de facturación cerrado = alerta, > X% ventas con empresas relacionadas = alerta, varias contrapartes comparten domicilio = alerta, red cercana a 69B/OFAC = alerta fuerte
7. IF severe fraud detected, THEN THE Graph_Fraud_Engine SHALL trigger hard stop
8. THE Graph_Fraud_Engine SHALL store results in cs_graph_nodes, cs_graph_edges, cs_graph_runs, cs_graph_alerts, cs_graph_scores

---

### Requirement 15: Benchmark Engine

**User Story:** As a credit analyst, I want to compare applicant metrics against market benchmarks, so that I can contextualize performance relative to industry standards.

#### Acceptance Criteria

1. THE Benchmark_Engine SHALL maintain benchmark data by: sector económico, tamaño empresa, región geográfica
2. THE Benchmark_Engine SHALL compare financial indicators: Razón Corriente, ROE, Margen Operativo, Endeudamiento, DSCR
3. THE Benchmark_Engine SHALL compare Syntage Score against sector distribution percentiles
4. THE Benchmark_Engine SHALL generate deviation report: metric name, applicant value, benchmark value, deviation percentage
5. THE Benchmark_Engine SHALL flag metrics deviating > 1 standard deviation as "attention_required"
6. THE Benchmark_Engine SHALL update benchmark data quarterly from aggregated portfolio and external sources
7. THE Benchmark_Engine SHALL store results in cs_benchmarks, cs_benchmark_comparisons

---

### Requirement 16: AI Risk Engine

**User Story:** As a credit committee member, I want AI-generated risk analysis and scenarios, so that I can understand potential risks and mitigating factors.

#### Acceptance Criteria

1. WHEN all engines complete, THE AI_Risk_Engine SHALL generate risk narrative summarizing key findings
2. THE AI_Risk_Engine SHALL identify top 3 risk factors and top 3 strength factors
3. THE AI_Risk_Engine SHALL generate scenario analysis: best case, base case, stress case
4. THE AI_Risk_Engine SHALL provide sector-specific risk commentary based on economic indicators
5. THE AI_Risk_Engine SHALL suggest mitigating actions: additional guarantees, shorter term, monitoring frequency
6. THE AI_Risk_Engine SHALL generate confidence score (0-100%) based on data completeness and consistency
7. THE AI_Risk_Engine SHALL detect hidden risks from cross-module analysis
8. THE AI_Risk_Engine SHALL store results in cs_ai_analysis, cs_ai_scenarios, cs_ai_recommendations

---

### Requirement 17: Credit Limit Engine

**User Story:** As a credit analyst, I want to calculate the maximum loan amount from multiple constraints, so that I can recommend a sustainable credit line.

#### Acceptance Criteria

1. THE Credit_Limit_Engine SHALL calculate limit by flow: monto máximo soportado por DSCR mínimo
2. THE Credit_Limit_Engine SHALL calculate limit by sales: capital de trabajo 10-20% ventas anuales, trade finance % de órdenes
3. THE Credit_Limit_Engine SHALL calculate limit by EBITDA: deuda nueva máxima 1.0x a 2.5x EBITDA ajustado según riesgo
4. THE Credit_Limit_Engine SHALL calculate limit by guarantee: monto máximo compatible con cobertura 2:1
5. THE Credit_Limit_Engine SHALL calculate limit by portfolio: monto máximo permitido por exposición sectorial/cliente/moneda
6. THE Credit_Limit_Engine SHALL apply rule: monto_aprobado_final = MIN(límite_flujo, límite_ventas, límite_ebitda, límite_garantía, límite_portafolio)
7. THE Credit_Limit_Engine SHALL explain which limit is binding and why
8. THE Credit_Limit_Engine SHALL store results in cs_credit_limits, cs_limit_calculations

---

### Requirement 18: Risk Matrix Engine

**User Story:** As a credit committee member, I want a multi-layer decision matrix, so that I can make consistent credit decisions.

#### Acceptance Criteria

1. THE Risk_Matrix_Engine SHALL apply Gate 1 (Hard Stops): OFAC/lista negra crítica, 69B directo, fraude documental severo, empresa no verificable, DSCR proforma < 1.0, garantía insuficiente si política exige, red fraudulenta severa
2. THE Risk_Matrix_Engine SHALL apply Gate 2 (Structural Risk): semáforo por módulos críticos (Compliance, CashFlow, Buró, FX, Operacional, Garantías)
3. THE Risk_Matrix_Engine SHALL apply Gate 3 (Consolidated Score) with weights: Financial 12%, CashFlow 18%, SAT/Facturación 15%, Buró 10%, Stability 10%, Network 8%, Operational 10%, FX 7%, Documentation 5%, Portfolio 5%
4. THE Risk_Matrix_Engine SHALL output decision: Aprobado (score alto + sin alertas + cumple cobertura), Aprobado Condicionado (score medio + garantías + covenants), Comité (score medio con cruces complejos), Rechazado (hard stop o score bajo)
5. THE Risk_Matrix_Engine SHALL store results in cs_risk_matrix_results, cs_decision_gates

---

### Requirement 19: Review Frequency Engine

**User Story:** As a portfolio manager, I want automatic review frequency assignment, so that I can monitor high-risk credits more closely.

#### Acceptance Criteria

1. THE Review_Frequency_Engine SHALL assign frequency: riesgo bajo = semestral, riesgo medio = trimestral, riesgo alto aprobado = mensual
2. THE Review_Frequency_Engine SHALL assign monthly review for: crédito USD sin cobertura total, concentración alta
3. THE Review_Frequency_Engine SHALL define automatic triggers: caída ventas > 20%, DSO empeora > 25%, cliente top deja de facturar, entra a 69B contraparte, baja fuerte de score, cambio en accionistas, nueva demanda/juicio, devaluación material si crédito USD
4. WHEN trigger fires, THE Review_Frequency_Engine SHALL schedule extraordinary review
5. THE Review_Frequency_Engine SHALL store results in cs_review_schedule, cs_review_triggers

---

### Requirement 20: Policy Engine

**User Story:** As a system administrator, I want configurable policies, so that I can adjust limits and rules without code changes.

#### Acceptance Criteria

1. THE Policy_Engine SHALL manage: límites por sector, límites por moneda, límites por plazo, límites por score
2. THE Policy_Engine SHALL manage: políticas de garantía (base ratio 2.0x, adjustments by score/sector/term)
3. THE Policy_Engine SHALL manage: hard stops configuration, covenant templates
4. THE Policy_Engine SHALL allow runtime adjustments without deployment
5. THE Policy_Engine SHALL version all policy changes with effective dates
6. THE Policy_Engine SHALL store configuration in cs_policies, cs_policy_versions, cs_policy_audit

---

### Requirement 21: Scenario Engine

**User Story:** As a credit analyst, I want to run stress scenarios, so that I can understand credit resilience under adverse conditions.

#### Acceptance Criteria

1. THE Scenario_Engine SHALL run: escenario base, estrés ventas, estrés margen, estrés DSO, estrés FX, escenario combinado
2. THE Scenario_Engine SHALL recalculate DSCR, coverage, and limits under each scenario
3. THE Scenario_Engine SHALL identify breaking points where credit becomes non-viable
4. THE Scenario_Engine SHALL store results in cs_scenarios, cs_scenario_results

---

### Requirement 22: Covenant Engine

**User Story:** As a credit analyst, I want to define covenants for conditional approvals, so that I can monitor ongoing compliance.

#### Acceptance Criteria

1. THE Covenant_Engine SHALL support covenant types: mínimo DSCR, máximo endeudamiento, mínimo cobertura garantía, obligación información mensual, restricción dividendos, obligación cobertura cambiaria
2. THE Covenant_Engine SHALL track covenant compliance status
3. THE Covenant_Engine SHALL trigger alerts on covenant breach
4. THE Covenant_Engine SHALL store results in cs_covenants, cs_covenant_monitoring

---

### Requirement 23: Cross-Module Analysis

**User Story:** As a credit analyst, I want the system to detect patterns across modules, so that I can identify complex risk scenarios.

#### Acceptance Criteria

1. THE Credit_Scoring_Engine SHALL detect Cruce 1: Buró malo + facturación fuerte = posible empresa en expansión, revisar deuda real
2. THE Credit_Scoring_Engine SHALL detect Cruce 2: Buró bueno + facturación deteriorando = riesgo de empeoramiento, bajar monto/plazo
3. THE Credit_Scoring_Engine SHALL detect Cruce 3: Facturación fuerte + alta concentración = limitar línea, pedir garantía reforzada
4. THE Credit_Scoring_Engine SHALL detect Cruce 4: Liquidez buena + flujo malo = balance sano pero caja apretada
5. THE Credit_Scoring_Engine SHALL detect Cruce 5: Empresa estable + riesgo FX alto = sugerir crédito MXN o cobertura obligatoria
6. THE Credit_Scoring_Engine SHALL detect Cruce 6: Compliance limpio + operational risk dudoso = posible empresa formal sin sustancia
7. THE Credit_Scoring_Engine SHALL detect Cruce 7: Ventas altas + cancelaciones altas + red circular = alerta simulación
8. THE Credit_Scoring_Engine SHALL detect Cruce 8: Garantía fuerte + score medio = aprobar con monto controlado
9. THE Credit_Scoring_Engine SHALL detect Cruce 9: Score bueno + portafolio concentrado = aprobar monto menor
10. THE Credit_Scoring_Engine SHALL detect Cruce 10: Ingresos USD + crédito USD + garantía USD = perfil ideal para USD
11. THE Credit_Scoring_Engine SHALL detect Cruce 11: Muchos créditos activos + consultas frecuentes al buró + créditos nuevos al liquidar otros = debt rotation (le está dando vuelta al dinero)
12. THE Credit_Scoring_Engine SHALL detect Cruce 12: Buró con muchas instituciones + monto vigente similar al original + DSCR ajustado = sobreendeudamiento real
13. THE Credit_Scoring_Engine SHALL detect Cruce 13: CCC largo + DSO creciendo + CxC pendientes altas = crisis de cobranza inminente
14. THE Credit_Scoring_Engine SHALL detect Cruce 14: Headcount bajo + facturación alta + pocas contrapartes = posible empresa fachada (cruzar con Operational_Risk y Graph_Fraud)
15. THE Credit_Scoring_Engine SHALL detect Cruce 15: Nómina creciendo + ventas cayendo + CCC deteriorando = empresa en contracción que no ajusta costos
16. THE Credit_Scoring_Engine SHALL detect Cruce 16: Ingresos gobierno altos + DSO gobierno largo + CCC positivo largo = necesita financiamiento puente por ciclo de pago gobierno
17. THE Credit_Scoring_Engine SHALL detect Cruce 17: Garantías ofrecidas ya registradas en RUG + múltiples acreedores en buró = activos ya comprometidos
18. THE Credit_Scoring_Engine SHALL detect Cruce 18: Hawk checks positivos + incidencias legales + buró deteriorando = perfil de riesgo integral elevado
19. THE Credit_Scoring_Engine SHALL detect Cruce 19: Working capital real (facturas) vs contable (balance) inconsistente + partes relacionadas altas = posible manipulación contable
20. THE Credit_Scoring_Engine SHALL detect Cruce 20: Relación con muchas instituciones financieras (Syntage) + créditos activos múltiples (Buró) + consultas frecuentes = patrón de sobreendeudamiento sistémico
21. THE Credit_Scoring_Engine SHALL store cross-module findings in cs_cross_analysis

---

### Requirement 24: Metric Explainability

**User Story:** As a credit analyst, I want each variable explained with source and meaning, so that I can understand and justify scoring decisions.

#### Acceptance Criteria

1. THE Credit_Scoring_Engine SHALL store for each metric: nombre técnico, nombre visible, descripción simple, fuente, fórmula, periodo usado
2. THE Credit_Scoring_Engine SHALL store for each metric: valor calculado, benchmark, desviación contra benchmark, interpretación, impacto en score, flag si aplica
3. THE Credit_Scoring_Engine SHALL maintain metric catalog in cs_metric_catalog
4. THE Credit_Scoring_Engine SHALL store metric values in cs_metric_values with link to Credit_Application
5. THE Credit_Scoring_Engine SHALL store interpretations in cs_metric_interpretations

---

### Requirement 25: Engine Output Standard

**User Story:** As a system architect, I want all engines to return consistent output format, so that I can consolidate and compare results.

#### Acceptance Criteria

1. EACH engine SHALL return: module_status (pass/fail/warning/blocked), module_score, module_max_score, module_grade
2. EACH engine SHALL return: risk_flags (array), key_metrics (object), benchmark_comparison (object)
3. EACH engine SHALL return: explanation (narrative text), recommended_actions (array)
4. EACH engine SHALL allow recalculation without affecting other modules
5. EACH engine SHALL allow weight and rule changes via Policy_Engine configuration

---

### Requirement 26: Decision Workflow Engine

**User Story:** As a credit committee member, I want structured approval workflow, so that decisions follow proper authorization levels.

#### Acceptance Criteria

1. THE Decision_Workflow_Engine SHALL route by amount: < 500K = Analyst, 500K-2M = Manager, > 2M = Committee
2. WHEN hard stop triggered, THE Decision_Workflow_Engine SHALL auto-reject with reason
3. WHEN score high + amount < 500K + no alerts, THE Decision_Workflow_Engine SHALL auto-approve with standard terms
4. THE Decision_Workflow_Engine SHALL support manual override with: reason, approver id, additional conditions
5. THE Decision_Workflow_Engine SHALL notify approvers via system alerts
6. THE Decision_Workflow_Engine SHALL track SLA: 24h auto-decisions, 48h analyst, 72h committee
7. THE Decision_Workflow_Engine SHALL store results in cs_workflow_queue, cs_workflow_decisions, cs_workflow_overrides

---

### Requirement 27: Scoring Report Generation

**User Story:** As a credit analyst, I want comprehensive PDF reports, so that I can present analysis to credit committee.

#### Acceptance Criteria

1. THE Credit_Scoring_Engine SHALL generate PDF with: executive summary, score breakdown by module, benchmark comparison, risk analysis, recommendation
2. THE Credit_Scoring_Engine SHALL include visualizations: radar chart (score by module %), gauge chart (total score in risk bands), comparison bar chart (applicant vs benchmark)
3. THE Credit_Scoring_Engine SHALL include: AI-generated risk narrative, cross-module findings, recommended actions
4. THE Credit_Scoring_Engine SHALL format with Xending Capital branding
5. THE Credit_Scoring_Engine SHALL support report versioning

---

### Requirement 28: Database Independence

**User Story:** As a system architect, I want the credit scoring system completely independent, so that it can be maintained and scaled separately.

#### Acceptance Criteria

1. THE Credit_Scoring_Engine SHALL use table prefix "cs_" for all tables
2. THE Credit_Scoring_Engine SHALL NOT create foreign keys to xending_ tables
3. THE Credit_Scoring_Engine SHALL store external references (prospect_id, client_id) as text without constraints
4. THE Credit_Scoring_Engine SHALL implement own audit trail
5. THE Credit_Scoring_Engine SHALL support multiple scoring model versions for A/B testing

---

### Requirement 29: External API Integration

**User Story:** As a system administrator, I want centralized API management, so that I can monitor connectivity with Syntage and Scory.

#### Acceptance Criteria

1. THE Credit_Scoring_Engine SHALL store API credentials in environment variables
2. THE Credit_Scoring_Engine SHALL implement retry with exponential backoff (max 3 retries)
3. THE Credit_Scoring_Engine SHALL cache API responses for 24 hours
4. THE Credit_Scoring_Engine SHALL log all API calls with: timestamp, endpoint, status, latency
5. IF API unavailable, THEN THE Credit_Scoring_Engine SHALL allow manual data entry with "manual_override" flag
6. THE Credit_Scoring_Engine SHALL validate API response schemas

---

### Requirement 30: Audit and Compliance

**User Story:** As a compliance officer, I want complete audit trail, so that I can demonstrate regulatory compliance.

#### Acceptance Criteria

1. THE Credit_Scoring_Engine SHALL log every calculation with: input data, formula, result
2. THE Credit_Scoring_Engine SHALL store scoring model version per Credit_Application
3. THE Credit_Scoring_Engine SHALL maintain immutable history of score changes with reason codes
4. THE Credit_Scoring_Engine SHALL generate compliance reports: applications processed, approval rate, average score by segment, rejection reasons
5. THE Credit_Scoring_Engine SHALL retain data minimum 10 years
6. THE Credit_Scoring_Engine SHALL support recalculation with historical model version

---

### Requirement 31: Working Capital Engine

**User Story:** As a credit analyst, I want to analyze the cash conversion cycle and working capital management, so that I can assess how efficiently the company manages its operating liquidity.

#### Acceptance Criteria

1. THE Working_Capital_Engine SHALL calculate from Syntage invoice data: DSO real (días para cobrar desde CFDIs PPD pagadas), DPO real (días para pagar desde CFDIs PPD pagadas), DIO estimado (rotación de inventario desde declaraciones anuales)
2. THE Working_Capital_Engine SHALL calculate Cash Conversion Cycle (CCC): DSO + DIO - DPO, con tendencia mensual y rolling 3/6/12 meses
3. THE Working_Capital_Engine SHALL calculate working capital real: (CxC pendientes + inventarios) - (CxP pendientes + anticipos clientes), comparar vs capital de trabajo contable del balance
4. THE Working_Capital_Engine SHALL analyze collection efficiency: % cobrado de ventas PPD por periodo, aging de CxC (saldo pendiente PPD emitidas por antigüedad), tendencia de CxC como % de ventas
5. THE Working_Capital_Engine SHALL analyze payment management: % pagado de compras PPD por periodo, aging de CxP (saldo pendiente PPD recibidas por antigüedad), tendencia de CxP como % de compras
6. THE Working_Capital_Engine SHALL calculate negotiation power indicators: % ventas PUE vs PPD (si cobra más de contado = poder sobre clientes), % compras PUE vs PPD (si paga más a plazo = poder sobre proveedores), spread DSO-DPO (si cobra antes de pagar = ciclo favorable)
7. THE Working_Capital_Engine SHALL calculate working capital needs projection: necesidad de capital de trabajo mensual estimada, gap de financiamiento (si CCC > 0 = necesita financiar el ciclo), monto óptimo de línea de crédito para capital de trabajo
8. THE Working_Capital_Engine SHALL apply rules: CCC > 90 días = atención, CCC creciendo 3 meses consecutivos = deterioro, DSO > DPO + 30 = presión de liquidez, CxC pendientes > 40% ventas = riesgo de cobranza
9. IF CCC negativo (cobra antes de pagar), THEN THE Working_Capital_Engine SHALL flag "favorable_cycle" (positivo para scoring)
10. IF CxC pendientes creciendo mientras ventas estables = clientes no están pagando, THEN THE Working_Capital_Engine SHALL flag "collection_deterioration"
11. THE Working_Capital_Engine SHALL cross-validate: capital de trabajo real (desde facturas) vs capital de trabajo contable (desde balance), si hay discrepancia > 20% = flag "working_capital_inconsistency"
12. THE Working_Capital_Engine SHALL contribute 4% to weighted score (tomado de redistribución)
13. THE Working_Capital_Engine SHALL store results in cs_working_capital_inputs, cs_working_capital_cycle, cs_working_capital_aging, cs_working_capital_results

---

### Requirement 32: Employee Engine

**User Story:** As a credit analyst, I want to analyze the company's workforce and payroll, so that I can assess operational scale, productivity, and employment trends.

#### Acceptance Criteria

1. THE Employee_Engine SHALL calculate from Syntage nómina CFDIs: número de empleados por periodo (RFCs únicos con CFDI tipo N), costo de nómina total por periodo, nómina promedio por empleado
2. THE Employee_Engine SHALL calculate headcount trends: crecimiento/contracción de empleados mes a mes, tendencia rolling 3/6/12 meses, estacionalidad de contratación
3. THE Employee_Engine SHALL calculate productivity metrics: ingreso por empleado (ventas / headcount), costo nómina como % de ingresos (eficiencia laboral), costo nómina como % de gastos totales
4. THE Employee_Engine SHALL calculate payroll sustainability: nómina mensual vs flujo operativo, capacidad de cubrir nómina con ingresos netos, tendencia de costo laboral unitario
5. THE Employee_Engine SHALL apply rules: headcount cayendo > 20% en 6 meses = empresa contrayéndose, nómina > 40% de ingresos = alta carga laboral, ingreso por empleado cayendo = pérdida de productividad
6. IF headcount = 0 o muy bajo vs facturación alta, THEN THE Employee_Engine SHALL flag "possible_shell_company" and notify Operational_Risk_Engine (empresa factura mucho sin empleados = sospechoso)
7. IF nómina creciendo más rápido que ingresos, THEN THE Employee_Engine SHALL flag "payroll_sustainability_risk"
8. THE Employee_Engine SHALL cross-validate: headcount vs tamaño de instalaciones (Scory), nómina vs declaraciones anuales (PTU, gastos de personal), consistencia entre empleados y giro del negocio
9. THE Employee_Engine SHALL contribute 3% to weighted score (tomado de redistribución)
10. THE Employee_Engine SHALL store results in cs_employee_headcount, cs_employee_payroll, cs_employee_productivity, cs_employee_results

---

### Requirement 33: Syntage Financial Ratios Cross-Validation

**User Story:** As a credit analyst, I want to use Syntage's pre-calculated financial ratios as a validation layer, so that I can detect inconsistencies between our calculations and theirs.

#### Acceptance Criteria

1. THE Benchmark_Engine SHALL ingest Syntage pre-calculated ratios: Liquidez (coeficiente solvencia, prueba ácida, coeficiente caja, razón efectivo/activo total, razón capital trabajo/ventas), Actividad (rotación total activos, rotación inventario, razón uso activos fijos, razón ventas/capital operativo, periodo pago acreedores, periodo cobro deudores), Rentabilidad (ROA, ROE, rendimiento ventas, margen bruto, ROI), Apalancamiento (coeficiente deuda, coeficiente endeudamiento), Cobertura (coeficiente intensidad capital), Solvencia (razón costo financiamiento/ventas)
2. THE Benchmark_Engine SHALL compare Syntage ratios vs Financial_Engine own calculations for same metrics
3. IF discrepancy > 5% between Syntage ratio and own calculation, THEN THE Benchmark_Engine SHALL flag "calculation_discrepancy" with detail of which metric differs
4. THE Benchmark_Engine SHALL use Syntage ratios as additional benchmark source alongside industry data
5. THE Benchmark_Engine SHALL store results in cs_benchmark_syntage_ratios, cs_benchmark_cross_validation

---

### Phase 1: Core Engines
- Compliance_Engine (Scory)
- SAT_Facturacion_Engine (Syntage) — con revenue quality y payment behavior
- Buro_Engine (Syntage) — con debt rotation detection y Hawk checks
- Documentation_Engine
- Financial_Engine — con balance sheet y income statement detallado

### Phase 2: Advanced Analysis
- CashFlow_Engine
- Working_Capital_Engine (CCC, aging, collection efficiency)
- Business_Stability_Engine
- Network_Engine — con gobierno, instituciones financieras, productos
- Guarantee_Engine
- FX_Risk_Engine
- Employee_Engine (headcount, productividad, nómina)

### Phase 3: Decision Layer
- AI_Risk_Engine
- Credit_Limit_Engine
- Risk_Matrix_Engine
- Review_Frequency_Engine
- Policy_Engine

### Phase 4: Portfolio & Fraud
- Portfolio_Engine
- Graph_Fraud_Engine
- Scenario_Engine
- Covenant_Engine

---

## Score Weight Distribution

| Engine | Weight | Notes |
|--------|--------|-------|
| Compliance | Gate | Pass/Fail, not weighted |
| CashFlow | 18% | Critical for repayment |
| SAT/Facturación | 15% | Commercial activity |
| Financial | 12% | Balance sheet health |
| Buró | 10% | Credit history |
| Stability | 10% | Business predictability |
| Operational | 10% | Substance validation |
| Network | 8% | Concentration risk |
| FX | 7% | Currency risk (USD only) |
| Documentation | 5% | Completeness |
| Portfolio | 5% | Concentration impact |

---

## Guarantee Policy

**Base Rule**: required_collateral_ratio = 2.0x

**Dynamic Adjustments**:
- Score excelente: puede permitir 1.5x
- Score bueno: 2.0x
- Score medio: 2.25x o 2.5x
- Crédito USD con garantía MXN: +colchón FX
- Sector alto riesgo: +colchón
- Plazo largo: +colchón

**Haircuts by Type**:
- Cash USD: 0-10%
- Cash MXN (crédito USD): 10-20%
- Cuentas por cobrar: 35-50%
- Inmueble: 30-45%
- Inventario: 50-70%
- Vehículo: 45-60%
- Aval simple: no considerar 1:1

---

## Database Tables Summary

### Data Layer
- cs_applications, cs_application_status_log
- cs_api_calls, cs_api_cache

### Engine Results
- cs_compliance_*, cs_sat_*, cs_documentation_*
- cs_financial_*, cs_cashflow_*, cs_buro_*
- cs_network_*, cs_stability_*, cs_operational_*
- cs_fx_*, cs_guarantee_*, cs_portfolio_*
- cs_graph_*, cs_benchmark_*

### Decision Layer
- cs_ai_*, cs_credit_limits, cs_risk_matrix_*
- cs_review_*, cs_policies, cs_scenarios
- cs_covenants, cs_cross_analysis
- cs_workflow_*, cs_reports

### Metadata
- cs_metric_catalog, cs_metric_values, cs_metric_interpretations
- cs_scoring_versions, cs_audit_log
