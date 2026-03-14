# Mapa de Integración: Syntage API → Credit Scoring System

## Configuración

| Variable | Valor | Dónde |
|----------|-------|-------|
| `VITE_SYNTAGE_API_KEY` | Tu API key | `credit-scoring/.env` |
| `VITE_SYNTAGE_API_URL` | `https://api.sandbox.syntage.com` (dev) / `https://api.syntage.com` (prod) | `credit-scoring/.env` |
| Auth Header | `X-API-Key: {apiKey}` | `syntageClient.ts` |
| Entity ID | `a0ee3bdb-5fb6-4b30-8313-aabb642175ed` | LEMAD CAPITAL SAPI DE CV SOFOM ENR |
| RFC | `LCA220601H50` | Taxpayer registrado |
| Rate Limit | 5,000 requests/ventana | Header `X-RateLimit-Remaining` |
| Paginación | `itemsPerPage` (max 1000), `page` o cursor | Todos los endpoints de colección |

## Nota sobre la estructura actual vs real

Nuestro `syntageClient.ts` actual usa endpoints inventados (`/v1/cfdis`, `/v1/buro/score`, etc.).
La API real de Syntage usa `/entities/{entityId}/...` para todo.
Este documento mapea cada endpoint real a nuestros engines para guiar la reescritura.

---

## GRUPO 1: Datos Crudos del SAT

### 1.1 Facturas (CFDIs)
- Endpoint: `GET /entities/{entityId}/invoices`
- Filtros clave: `type[]` (I=Ingreso, E=Egreso, P=Pago, N=Nómina, T=Traslado), `isIssuer`, `issuer.rfc`, `receiver.rfc`, `issuedAt[after]`, `issuedAt[before]`, `currency`, `status`, `paymentMethod` (PUE/PPD), `issuer.blacklistStatus`
- Paginación: cursor o offset, max 1000 por página
- Qué contiene cada factura: uuid, tipo, subtotal, total, moneda, método de pago, emisor (RFC, nombre, régimen, blacklistStatus), receptor (RFC, nombre, blacklistStatus), fecha emisión, estatus (vigente/cancelado), uso CFDI

Engines que lo usan:
| Engine | Cómo lo usa | Filtros que necesita |
|--------|-------------|---------------------|
| SAT/Facturación (14%) | Facturación total 12m, promedio mensual, tendencia, calidad de ingresos | `type[]=I`, `isIssuer=true`, últimos 24-36 meses |
| SAT/Facturación (14%) | Facturas recibidas para análisis de gastos | `type[]=I`, `isIssuer=false` |
| Network (8%) | Concentración de clientes/proveedores, contrapartes en 69B | `isIssuer=true/false`, `issuer.blacklistStatus` |
| Cashflow (7%) | Flujo de efectivo desde facturas, método de pago PUE vs PPD | `paymentMethod`, `currency` |
| Employee (3%) | CFDIs de nómina para conteo de empleados | `type[]=N`, `isIssuer=true` |
| FX Risk | Facturas en moneda extranjera | `currency` diferente a MXN |
| GraphFraud | Facturas con contrapartes en lista 69B | `issuer.blacklistStatus`, `receiver.blacklistStatus` |
| Compliance (12%) | Verificar actividad de facturación, facturas canceladas | `status` |

### 1.2 Line Items (Conceptos de Factura)
- Endpoint: `GET /entities/{entityId}/invoices/line-items` o `GET /invoices/{id}/line-items`
- Qué contiene: descripción del concepto, cantidad, valor unitario, importe, clave producto/servicio SAT, unidad

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Network (8%) | Identificar tipo de productos/servicios comercializados |
| SAT/Facturación (14%) | Análisis granular de conceptos facturados |

### 1.3 Pagos de Facturas
- Endpoint: `GET /entities/{entityId}/invoices/payments`
- Endpoint individual: `GET /invoices/{id}/payments`
- Qué contiene: monto pagado, fecha de pago, moneda, tipo de cambio, factura relacionada

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Cashflow (7%) | Flujo real de efectivo (no solo facturado sino cobrado) |
| Working Capital (5%) | Días de cobro reales, ciclo de conversión de efectivo |

### 1.4 Batch Payments (Pagos Agrupados)
- Endpoint: `GET /invoices/batch-payments`
- Qué contiene: agrupación de pagos de complementos tipo P

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Cashflow (7%) | Reconciliación de pagos con facturas PPD |

### 1.5 Notas de Crédito
- Endpoint: `GET /invoices/credit-notes`
- Endpoint por factura: `GET /invoices/{id}/issued-credit-notes`, `GET /invoices/{id}/applied-credit-notes`
- Qué contiene: notas de crédito emitidas y aplicadas

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| SAT/Facturación (14%) | Devoluciones, descuentos, calidad de ingresos |
| Cashflow (7%) | Ajustes al flujo real |

### 1.6 Retenciones de Impuestos
- Endpoint: `GET /entities/{entityId}/tax-retentions`
- Filtros: `uuid`, `type`, `issuedAt[after]`, `issuedAt[before]`, `isIssuer`
- Qué contiene: retenciones ISR/IVA emitidas y recibidas

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Financial (11%) | Carga fiscal, retenciones como indicador de actividad |
| Compliance (12%) | Cumplimiento de obligaciones de retención |

---

## GRUPO 2: Datos Fiscales Procesados

### 2.1 Declaraciones Anuales y Mensuales (Tax Returns)
- Endpoint lista: `GET /entities/{entityId}/tax-returns`
- Endpoint individual: `GET /tax-returns/{id}`
- Endpoint datos extraídos: `GET /tax-returns/{id}/data`
- Filtros: `type` (annual/monthly), `filedAt[after]`, `filedAt[before]`, `taxRegime`
- Qué contiene: tipo (anual/mensual), régimen fiscal, fecha presentación, ejercicio fiscal, archivos PDF/XLSX
- `/data` contiene: estados financieros extraídos (balance, estado de resultados), variables financieras (ventas, flujo de efectivo, empleados, nómina)

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Financial (11%) | Balance general, estado de resultados, EBITDA, utilidad neta |
| Cashflow (7%) | Flujo de efectivo declarado |
| Employee (3%) | Número de empleados declarados en mensuales |
| Benchmark | Comparar datos declarados vs facturados |
| Compliance (12%) | Verificar que presenta declaraciones a tiempo |

### 2.2 Constancia de Situación Fiscal (Tax Status)
- Endpoint: `GET /entities/{entityId}/tax-status`
- Endpoint individual: `GET /tax-status/{id}`
- Qué contiene: RFC, razón social, régimen fiscal, actividades económicas, estatus (activo/suspendido), domicilio fiscal, fecha último cambio

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Compliance (12%) | Verificar estatus activo, régimen correcto |
| Stability (6%) | Antigüedad de la empresa, cambios de domicilio |
| SAT/Facturación (14%) | Validar giro declarado vs actividad real |

### 2.3 Opinión de Cumplimiento (Tax Compliance Checks)
- Endpoint: `GET /entities/{entityId}/tax-compliance-checks`
- Endpoint individual: `GET /tax-compliance-checks/{id}`
- Qué contiene: resultado (positiva/negativa/no_inscrito), fecha emisión, vigencia

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Compliance (12%) | Gate obligatorio: si es negativa, alto riesgo |
| SAT/Facturación (14%) | Indicador de riesgo fiscal |

### 2.4 Contabilidad Electrónica (Electronic Accounting Records)
- Endpoint: `GET /entities/{entityId}/electronic-accounting-records`
- Endpoint individual: `GET /electronic-accounting-records/{id}`
- Qué contiene: balanza de comprobación, catálogo de cuentas, tipo (trial_balance/account_catalog), periodo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Financial (11%) | Balanza de comprobación mensual para análisis detallado |
| Working Capital (5%) | Cuentas por cobrar/pagar desde balanza |

### 2.5 Certificados SAT (e.firma)
- Endpoint: `GET /entities/{entityId}/datasources/mx/sat/certificados`
- Qué contiene: certificados digitales, vigencia, tipo (CSD/FIEL)

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Compliance (12%) | Verificar vigencia de certificados |

---

## GRUPO 3: Buró de Crédito

### 3.1 Reportes Buró de Crédito
- Endpoint: `GET /entities/{entityId}/datasources/mx/buro-de-credito/reports`
- Endpoint individual: `GET /datasources/mx/buro-de-credito/reports/{id}`
- Qué contiene: reporte completo de Buró, score, créditos activos, créditos liquidados, consultas, calificación de cartera
- Requiere: extracción previa tipo `buro_de_credito_report`

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Buró (10%) | Score Buró, créditos activos/liquidados, historial de pagos, atrasos |
| Buró (10%) | Detección de rotación de deuda (múltiples créditos, consultas frecuentes) |
| Network (8%) | Instituciones financieras con las que tiene relación |
| Credit Limit | Deuda actual para calcular capacidad de endeudamiento |

### 3.2 Autorizaciones Buró de Crédito
- Endpoint: `GET /entities/{entityId}/datasources/mx/buro-de-credito/authorizations`
- Qué contiene: autorizaciones para consultar Buró, estatus, fecha
- Uso: crear autorización antes de poder extraer reporte

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Orquestador | Verificar que existe autorización antes de solicitar extracción |

---

## GRUPO 4: Registro Público y Garantías

### 4.1 RPC Entidades (Registro Público de Comercio)
- Endpoint: `GET /entities/{entityId}/datasources/rpc/entidades`
- Endpoint individual: `GET /datasources/rpc/entidades/{id}`
- Qué contiene: datos de constitución, razón social, FME, duración sociedad, domicilio social, fecha constitución, actos registrados

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Stability (6%) | Antigüedad real de la empresa, tipo de sociedad |
| Compliance (12%) | Verificar existencia legal |
| GraphFraud | Detectar empresas fachada (constitución reciente, sin sustancia) |

### 4.2 Accionistas RPC (Insight)
- Endpoint: `GET /entities/{entityId}/insights/rpc-shareholders`
- Qué contiene: lista de accionistas iniciales (nombre, RFC, CURP, nacionalidad, acciones, porcentaje)
- Limitación: solo accionistas iniciales, no refleja cambios posteriores

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Stability (6%) | Estructura accionaria, concentración de control |
| GraphFraud | Cruzar accionistas con listas negras, detectar nominees |
| Compliance (12%) | Verificar accionistas vs Scory/documentos |

### 4.3 RUG Garantías
- Endpoint: `GET /entities/{entityId}/datasources/rug/garantias`
- Endpoint individual: `GET /datasources/rug/garantias/{id}`
- Qué contiene: garantías registradas (tipo, descripción, acreedor, deudor, monto, vigencia)

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Guarantee (4%) | Garantías existentes, cobertura, vigencia |
| Credit Limit | Garantías disponibles para respaldar nuevo crédito |

### 4.4 RUG Operaciones
- Endpoint: `GET /entities/{entityId}/datasources/rug/operaciones`
- Endpoint individual: `GET /datasources/rug/operaciones/{id}`
- Qué contiene: operaciones registradas en RUG (inscripciones, modificaciones, cancelaciones)

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Guarantee (4%) | Historial de operaciones de garantía |

---

## GRUPO 5: Insights Pre-procesados por Syntage

Estos endpoints son muy valiosos porque Syntage ya hace el procesamiento pesado. En lugar de calcular nosotros desde datos crudos, podemos consumir métricas listas.

### 5.1 Balance General (Balance Sheet)
- Endpoint: `GET /entities/{entityId}/insights/metrics/balance-sheet`
- Parámetros: `options[from]`, `options[to]`, header `X-Insight-Format: 2022`
- Qué contiene: árbol de categorías del balance (activos, pasivos, capital) por año fiscal
- Formatos: 2014 (desde PDF) y 2022 (desde XLSX)

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Financial (11%) | Activos, pasivos, capital contable, estructura del balance |
| Working Capital (5%) | Activo circulante, pasivo circulante |
| Credit Limit | Capital contable para calcular capacidad |
| Benchmark | Comparar estructura vs industria |

### 5.2 Estado de Resultados (Income Statement)
- Endpoint: `GET /entities/{entityId}/insights/metrics/income-statement`
- Parámetros: `options[from]`, `options[to]`, header `X-Insight-Format: 2022`
- Qué contiene: árbol de categorías (ingresos, costos, gastos, utilidades) por año fiscal

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Financial (11%) | Ingresos, EBITDA, utilidad neta, márgenes |
| Cashflow (7%) | Utilidad operativa como base de flujo |
| Credit Limit | EBITDA para calcular DSCR |
| Benchmark | Comparar márgenes vs industria |
| Covenant | Monitorear ratios financieros comprometidos |

### 5.3 Razones Financieras (Financial Ratios)
- Endpoint: `GET /entities/{entityId}/insights/financial-ratios`
- Parámetros: `options[from]`, `options[to]`
- Qué contiene por año:
  - Liquidez: current_ratio, quick_ratio, cash_ratio, cash_to_assets, net_working_capital_to_sales
  - Actividad: total_asset_turnover, inventory_turnover, fixed_asset_turnover_ratio, sales_to_capital_employed, accounts_payable_payment_period, accounts_receivable_collection_period
  - Rentabilidad: return_on_assets, return_on_equity, return_on_sales, gross_profit_margin, return_on_investment
  - Apalancamiento: total_debt_ratio, debt_equity_ratio, coverage, capital_intensity_ratio, solvency

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Financial (11%) | Cross-validation: comparar nuestros cálculos vs Syntage (flag si discrepancia > 5%) |
| Benchmark | Comparar ratios vs industria |
| Working Capital (5%) | Días de cobro/pago, rotación de inventario |
| Credit Limit | Ratios de cobertura y apalancamiento |
| Covenant | Monitorear ratios comprometidos |
| Scenario | Proyectar ratios bajo escenarios de estrés |

### 5.4 Syntage Score
- Endpoint: `POST /entities/{entityId}/datasources/syntage/score/calculate` (calcular)
- Endpoint: `GET /entities/{entityId}/insights/metrics/scores` (consultar)
- Qué contiene: score 0-1000 basado en 13 variables ponderadas, sub-scores por categoría

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| SAT/Facturación (14%) | Score como indicador agregado de salud fiscal |
| Benchmark | Comparar score vs distribución sectorial |
| AI Risk | Input para modelo de riesgo |

### 5.5 Flujo de Efectivo (Cash Flow)
- Endpoint: `GET /entities/{entityId}/insights/cash-flow`
- Parámetros: `options[periodicity]` (daily/weekly/monthly/quarterly/yearly), `options[type]` (total/payment-method/currency/invoice-type), `options[from]`, `options[to]`
- Qué contiene: inflows y outflows por periodo, agrupados por moneda, con conversión a MXN

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Cashflow (7%) | Flujo de efectivo real, estacionalidad, tendencia |
| FX Risk | Flujos en moneda extranjera vs MXN |
| Working Capital (5%) | Ciclo de conversión de efectivo |
| Scenario | Base para proyecciones de flujo |

### 5.6 Cuentas por Cobrar (Accounts Receivable)
- Endpoint: `GET /entities/{entityId}/insights/accounts-receivable`
- Parámetros: `options[from]`, `options[to]`
- Qué contiene: CxC pendientes, aging, montos por periodo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Working Capital (5%) | Días de cobro, aging de cartera |
| Cashflow (7%) | CxC como fuente futura de efectivo |
| Credit Limit | CxC como colateral potencial |

### 5.7 Cuentas por Pagar (Accounts Payable)
- Endpoint: `GET /entities/{entityId}/insights/accounts-payable`
- Parámetros: `options[from]`, `options[to]`
- Qué contiene: CxP pendientes, aging, montos por periodo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Working Capital (5%) | Días de pago, presión de liquidez |
| Cashflow (7%) | CxP como obligaciones futuras |

### 5.8 Concentración de Clientes
- Endpoint: `GET /entities/{entityId}/insights/customer-concentration`
- Parámetros: `options[from]`, `options[to]`
- Qué contiene: top clientes con nombre, RFC, total facturado, % de participación, transacciones por periodo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Network (8%) | Dependencia de clientes principales, riesgo de concentración |
| SAT/Facturación (14%) | Calidad de ingresos (diversificación) |

### 5.9 Concentración de Proveedores
- Endpoint: `GET /entities/{entityId}/insights/supplier-concentration`
- Parámetros: `options[from]`, `options[to]`
- Qué contiene: top proveedores con nombre, RFC, total, % participación, transacciones por periodo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Network (8%) | Dependencia de proveedores, riesgo de cadena de suministro |

### 5.10 Red de Clientes (Customer Network)
- Endpoint: `GET /entities/{entityId}/insights/metrics/customer-network`
- Qué contiene: red de relaciones comerciales con clientes, métricas de red

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Network (8%) | Análisis de red comercial, diversificación |
| GraphFraud | Detectar patrones de facturación circular |

### 5.11 Red de Proveedores (Vendor Network)
- Endpoint: `GET /entities/{entityId}/insights/metrics/vendor-network`
- Qué contiene: red de relaciones comerciales con proveedores

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Network (8%) | Análisis de cadena de suministro |
| GraphFraud | Detectar proveedores fantasma |

### 5.12 Empleados
- Endpoint: `GET /entities/{entityId}/insights/employees`
- Parámetros: `options[from]`, `options[to]`, `options[periodicity]` (monthly/quarterly/yearly)
- Qué contiene: número de empleados por periodo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Employee (3%) | Headcount, tendencia de crecimiento/contracción |
| Benchmark | Productividad por empleado vs industria |

### 5.13 Ingresos por Ventas (Sales Revenue)
- Endpoint: `GET /entities/{entityId}/insights/sales-revenue`
- Parámetros: `options[from]`, `options[to]`, `options[periodicity]`
- Qué contiene: ingresos por ventas desglosados por periodo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| SAT/Facturación (14%) | Tendencia de ingresos, estacionalidad |
| Financial (11%) | Cruzar con declaraciones |
| Benchmark | Comparar crecimiento vs industria |

### 5.14 Gastos (Expenditures)
- Endpoint: `GET /entities/{entityId}/insights/expenditures`
- Parámetros: `options[from]`, `options[to]`, `options[periodicity]`
- Qué contiene: gastos desglosados por categoría y periodo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Financial (11%) | Estructura de costos, eficiencia operativa |
| Cashflow (7%) | Gastos recurrentes vs variables |

### 5.15 Instituciones Financieras
- Endpoint: `GET /entities/{entityId}/insights/financial-institutions`
- Qué contiene: instituciones financieras con las que la empresa tiene relación comercial (bancos, aseguradoras, etc.)

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Network (8%) | Relaciones bancarias, diversificación financiera |
| Buró (10%) | Cruzar con créditos activos del Buró |
| GraphFraud | Detectar patrón de múltiples instituciones (rotación de deuda) |

### 5.16 Clientes Gubernamentales
- Endpoint: `GET /entities/{entityId}/insights/government-customers`
- Qué contiene: clientes del sector gobierno, montos, participación

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Network (8%) | Dependencia de gobierno, riesgo de concentración pública |
| Compliance (12%) | Exposición a riesgo político |

### 5.17 Lista Negra de Facturación (Invoicing Blacklist)
- Endpoint: `GET /entities/{entityId}/insights/invoicing-blacklist`
- Qué contiene: facturas con contrapartes en lista 69B del SAT (presumidos, definitivos, favorables, desvirtuados)

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Compliance (12%) | Riesgo de operar con EFOS |
| GraphFraud | Detectar cadenas de facturación con empresas en lista negra |
| SAT/Facturación (14%) | Calidad de contrapartes |

### 5.18 Riesgos Calculados por Syntage
- Endpoint: `GET /entities/{entityId}/insights/risks`
- Qué contiene (cada uno con valor + flag risky):
  - `taxCompliance`: opinión de cumplimiento (positive/negative)
  - `blacklistStatus`: estatus en lista 69B
  - `blacklistedCounterparties`: número de contrapartes en lista negra
  - `intercompanyTransactions`: % de transacciones intercompañía
  - `customerConcentration`: índice de concentración de clientes
  - `supplierConcentration`: índice de concentración de proveedores
  - `foreignExchangeRisk`: % de operaciones en moneda extranjera
  - `cashTransactionRisk`: % de operaciones en efectivo
  - `accountingInsolvency`: ratio de solvencia contable
  - `canceledIssuedInvoices`: % de facturas emitidas canceladas
  - `canceledReceivedInvoices`: % de facturas recibidas canceladas

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| AI Risk | Input directo: todos los riesgos pre-calculados |
| Compliance (12%) | taxCompliance, blacklistStatus |
| FX Risk | foreignExchangeRisk |
| Network (8%) | customerConcentration, supplierConcentration |
| GraphFraud | blacklistedCounterparties, intercompanyTransactions, canceledInvoices |
| SAT/Facturación (14%) | cashTransactionRisk, canceledInvoices |

### 5.19 Productos y Servicios Comprados
- Endpoint: `GET /entities/{entityId}/insights/products-and-services-bought`
- Parámetros: `options[from]`, `options[to]`, `page`, `itemsPerPage`
- Qué contiene: lista paginada de productos/servicios comprados con nombre, total, % participación, transacciones por periodo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Network (8%) | Tipo de insumos, dependencia de productos específicos |
| Financial (11%) | Estructura de costos por tipo de gasto |

### 5.20 Productos y Servicios Vendidos
- Endpoint: `GET /entities/{entityId}/insights/products-and-services-sold`
- Parámetros: `options[from]`, `options[to]`, `page`, `itemsPerPage`
- Qué contiene: lista paginada de productos/servicios vendidos con nombre, total, % participación, transacciones por periodo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Network (8%) | Diversificación de productos/servicios |
| SAT/Facturación (14%) | Análisis de líneas de negocio |

### 5.21 Comparativo Anual de Facturación
- Endpoint: `GET /entities/{entityId}/insights/metrics/invoicing-annual-comparison`
- Qué contiene: comparativo año vs año de facturación (emitida y recibida)

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| SAT/Facturación (14%) | Tendencia de crecimiento interanual |
| Benchmark | Comparar crecimiento vs industria |

### 5.22 Balanza de Comprobación (Trial Balance Insight)
- Endpoint: `GET /entities/{entityId}/insights/trial-balance`
- Parámetros: `options[from]`, `options[to]`, `options[periodicity]` (yearly/monthly)
- Qué contiene: cuentas contables con saldos, agrupadas por catálogo

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Financial (11%) | Análisis detallado de cuentas contables |
| Working Capital (5%) | Cuentas específicas de capital de trabajo |

---

## GRUPO 6: Background Checks (BIL - Buró de Investigaciones Legales)

### 6.1 Background Checks
- Endpoint lista: `GET /entities/{entityId}/background-checks`
- Endpoint global: `GET /background-checks`
- Endpoint individual: `GET /background-checks/{id}`
- Endpoint PDF: `GET /background-checks/{id}/pdf`
- Endpoint records: `GET /background-checks/{backgroundCheckId}/records`
- Requiere: extracción previa tipo `bil`
- Qué contiene: investigación legal, antecedentes, registros judiciales

Engines que lo usan:
| Engine | Cómo lo usa |
|--------|-------------|
| Compliance (12%) | Antecedentes legales, juicios, procedimientos |
| GraphFraud | Incidencias legales de accionistas/representantes |
| Stability (6%) | Riesgo legal de la empresa |

---

## GRUPO 7: Gestión de Datos (Extracciones y Entidades)

### 7.1 Entidades
- Endpoint lista: `GET /entities`
- Endpoint individual: `GET /entities/{entityId}`
- Endpoint crear: `POST /entities`
- Qué contiene: id, tipo (company/person), nombre, taxpayer (RFC), credenciales, tags
- Crear entidad devuelve `onboardingUrl` si requiere input del contribuyente

Uso en nuestro sistema:
| Componente | Cómo lo usa |
|------------|-------------|
| Orquestador | Buscar/crear entity por RFC al iniciar solicitud |
| NewApplicationForm | Crear entity nueva si no existe |

### 7.2 Credenciales SAT
- Endpoint crear: `POST /credentials`
- Endpoint lista: `GET /credentials`
- Endpoint individual: `GET /credentials/{id}`
- Endpoint revalidar: `POST /credentials/{id}/revalidate`
- Qué contiene: RFC, contraseña CIEC, estatus (pending/valid/invalid/deactivated)

Uso en nuestro sistema:
| Componente | Cómo lo usa |
|------------|-------------|
| Orquestador | Verificar que la entity tiene credenciales válidas antes de extraer |

### 7.3 Extracciones
- Endpoint crear: `POST /extractions`
- Endpoint lista: `GET /extractions`
- Endpoint individual: `GET /extractions/{id}`
- Endpoint cancelar: `DELETE /extractions/{id}/stop`
- Tipos de extracción disponibles:
  - `invoice` — CFDIs (con filtros de tipo, periodo, emitidas/recibidas)
  - `annual_tax_return` — Declaraciones anuales
  - `monthly_tax_return` — Declaraciones mensuales
  - `electronic_accounting` — Balanza y catálogo de cuentas
  - `tax_status` — Constancia de situación fiscal
  - `tax_compliance` — Opinión de cumplimiento
  - `rpc` — Registro Público de Comercio
  - `tax_retention` — Retenciones de impuestos
  - `buro_de_credito_report` — Reporte Buró de Crédito
  - `bil` — Buró de Investigaciones Legales (background checks)
- Estatus: pending → waiting → running → finished/failed/stopped/cancelled

Uso en nuestro sistema:
| Componente | Cómo lo usa |
|------------|-------------|
| Orquestador | Crear extracciones necesarias, monitorear estatus, reintentar si falla |
| ApplicationDetailPage | Mostrar progreso de extracción al usuario |

### 7.4 Eventos (Webhooks)
- Endpoint: `GET /events`
- Endpoint individual: `GET /events/{id}`
- Qué contiene: eventos del sistema (credential.created, extraction.updated, invoice.created, etc.)
- Webhooks: `POST /webhook-endpoints` para recibir notificaciones en tiempo real

Uso en nuestro sistema:
| Componente | Cómo lo usa |
|------------|-------------|
| Supabase Edge Function | Recibir webhook cuando extracción termina, disparar procesamiento |

### 7.5 Schedulers (Extracciones Programadas)
- Endpoint: `POST /schedulers`
- Endpoint reglas: `POST /schedulers/rules`
- Qué contiene: programar extracciones automáticas periódicas

Uso en nuestro sistema:
| Componente | Cómo lo usa |
|------------|-------------|
| Review Frequency | Programar re-extracciones según frecuencia de revisión asignada |

### 7.6 Exportaciones
- Endpoint: `POST /exports`
- Endpoint individual: `GET /exports/{id}`
- Qué contiene: exportar datos de facturas en CSV/XLSX

Uso en nuestro sistema:
| Componente | Cómo lo usa |
|------------|-------------|
| ReportPage | Exportar datos para reportes offline |

### 7.7 Archivos
- Endpoint: `GET /files/{id}`
- Endpoint descarga: `GET /files/{id}/download`
- Qué contiene: archivos asociados a recursos (PDFs de declaraciones, XMLs de facturas)

Uso en nuestro sistema:
| Componente | Cómo lo usa |
|------------|-------------|
| Documentation Engine | Descargar PDFs de declaraciones, XMLs de facturas |

### 7.8 Direcciones MX
- Endpoint: `GET /datasources/mx/addresses/{postalCode}`
- Qué contiene: colonias, municipio, estado, ciudad por código postal

Uso en nuestro sistema:
| Componente | Cómo lo usa |
|------------|-------------|
| NewApplicationForm | Autocompletar dirección al capturar código postal |
| Compliance (12%) | Validar domicilio fiscal |

---

## Resumen: Endpoints por Engine

| Engine | Peso | Endpoints de Syntage que consume |
|--------|------|----------------------------------|
| Compliance | 12% | tax-compliance-checks, tax-status, invoicing-blacklist, risks, background-checks, sat/certificados, invoices (canceladas), rpc/entidades |
| SAT/Facturación | 14% | invoices, credit-notes, sales-revenue, invoicing-annual-comparison, scores, risks, customer-concentration, products-and-services-sold |
| Financial | 11% | tax-returns, tax-returns/{id}/data, balance-sheet, income-statement, financial-ratios, trial-balance, electronic-accounting-records, expenditures, tax-retentions |
| Buró | 10% | buro-de-credito/reports, financial-institutions |
| Network | 8% | customer-concentration, supplier-concentration, customer-network, vendor-network, financial-institutions, government-customers, products-and-services-bought, products-and-services-sold, invoices |
| Cashflow | 7% | cash-flow, accounts-receivable, accounts-payable, invoices/payments, credit-notes |
| Stability | 6% | rpc/entidades, rpc-shareholders, tax-status, background-checks |
| Working Capital | 5% | accounts-receivable, accounts-payable, financial-ratios, trial-balance |
| Guarantee | 4% | rug/garantias, rug/operaciones |
| Employee | 3% | employees, invoices (tipo N) |
| FX Risk | — | cash-flow (por currency), risks (foreignExchangeRisk), invoices (currency != MXN) |
| GraphFraud | — | invoicing-blacklist, risks, rpc-shareholders, customer-network, vendor-network, background-checks |
| AI Risk | — | risks, scores, todos los anteriores como input |
| Benchmark | — | financial-ratios, scores, invoicing-annual-comparison, employees, balance-sheet, income-statement |
| Credit Limit | — | financial-ratios, balance-sheet, income-statement, buro-de-credito/reports, rug/garantias, accounts-receivable |
| Covenant | — | financial-ratios, income-statement, balance-sheet |
| Scenario | — | cash-flow, financial-ratios, income-statement |
| Review Frequency | — | schedulers (para programar re-extracciones) |
| Portfolio | — | Datos internos (no consume Syntage directamente) |
| Policy | — | Datos internos (no consume Syntage directamente) |

---

## Flujo de Extracción de Datos

El proceso para obtener datos de una empresa nueva es:

```
1. POST /entities          → Crear entity con RFC
   ↓
2. POST /credentials       → Registrar credenciales CIEC del SAT
   ↓ (esperar credential.status = "valid")
3. POST /extractions       → Crear extracciones:
   ├── type: "invoice"              (CFDIs)
   ├── type: "annual_tax_return"    (Declaraciones anuales)
   ├── type: "monthly_tax_return"   (Declaraciones mensuales)
   ├── type: "electronic_accounting" (Balanza)
   ├── type: "tax_status"           (Constancia fiscal)
   ├── type: "tax_compliance"       (Opinión cumplimiento)
   ├── type: "rpc"                  (Registro Público)
   ├── type: "tax_retention"        (Retenciones)
   └── type: "bil"                  (Background checks)
   ↓ (esperar extraction.status = "finished" via webhook o polling)
4. POST /entities/{id}/datasources/mx/buro-de-credito/authorizations
   ↓ (crear autorización Buró)
5. POST /extractions type: "buro_de_credito_report"
   ↓ (esperar finished)
6. POST /entities/{id}/datasources/syntage/score/calculate
   ↓ (calcular Syntage Score)
7. GET /entities/{id}/insights/...  → Consumir todos los insights
8. GET /entities/{id}/invoices      → Consumir datos crudos
9. GET /entities/{id}/tax-returns   → Consumir declaraciones
   ... etc.
```

---

## Archivo a Reescribir

`credit-scoring/src/features/credit-scoring/api/syntageClient.ts`

Cambios necesarios:
1. Reemplazar todos los endpoints ficticios por los reales
2. Cambiar la estructura de URL de `/v1/{endpoint}?rfc=` a `/entities/{entityId}/{endpoint}`
3. Agregar soporte para paginación (cursor y offset)
4. Agregar funciones para crear extracciones y monitorear estatus
5. Agregar funciones para todos los insights
6. Actualizar los tipos TypeScript para reflejar las respuestas reales de la API (formato JSON-LD con @context, @id, @type, hydra:member)
7. Manejar el header `Accept-Version: 2020-06-28`

---

## Estrategia de Benchmarks: 3 Capas Evolutivas

El Benchmark Engine usa un sistema de 3 capas que evoluciona conforme crece la cartera:

### Fase 1: Benchmarks Estaticos (Ahora)
- Valores conservadores para SOFOM que presta a PyMEs mexicanas
- Representan el piso minimo que Xending considera sano para aprobar
- Almacenados en `cs_benchmarks` con `source = 'static'`
- Tambien hardcodeados como `DEFAULT_BENCHMARKS` en `benchmark.ts` como fallback

Metricas clave y sus valores conservadores:

| Metrica | Valor | Interpretacion |
|---------|-------|----------------|
| DSCR | >= 1.3x | Puede pagar su deuda 1.3 veces |
| Current Ratio | >= 1.2 | Liquidez minima aceptable |
| Quick Ratio | >= 0.8 | Liquidez sin inventario |
| Leverage | <= 0.65 | Max 65% deuda sobre activos |
| Debt/Equity | <= 2.0 | Max 2x deuda sobre capital |
| Margen Operativo | >= 10% | Rentabilidad operativa minima |
| Margen Bruto | >= 25% | Margen bruto minimo |
| ROA | >= 5% | Retorno sobre activos |
| ROE | >= 10% | Retorno sobre capital |
| Cobertura de Intereses | >= 2.0x | Puede pagar intereses 2 veces |
| DSO | <= 60 dias | Cobrar en menos de 60 dias |
| DPO | >= 45 dias | Pagar a proveedores en 45+ dias |
| Dias de Inventario | <= 90 dias | Rotacion de inventario aceptable |
| Crecimiento Ingresos | >= 5% anual | Crecimiento minimo |
| Ciclo Conversion Efectivo | <= 90 dias | Ciclo de caja aceptable |
| Productividad/Empleado | >= $400K MXN | Ingreso por empleado |
| Eficiencia Capital Trabajo | >= 15% | Capital de trabajo / ingresos |
| Rotacion de Activos | >= 0.8x | Eficiencia en uso de activos |

### Fase 2: Benchmarks de Portafolio (Automatico conforme crece cartera)
- Cada vez que se aprueba un credito, se guardan las metricas del acreditado
- Cuando hay 5+ empresas en un sector, se calculan medianas y percentiles reales
- Se almacenan en `cs_benchmarks` con `source = 'portfolio'`
- El engine los prefiere sobre los estaticos cuando hay suficiente muestra

### Fase 3: Benchmarks de Industria (Futuro)
- Datos sectoriales de fuentes externas (CNBV, INEGI, o comprados)
- Se cargan en `cs_benchmarks` con `source = 'industry'`
- Maxima prioridad cuando estan disponibles

### Prioridad de Resolucion

```
industry (Fase 3) > portfolio con n>=5 (Fase 2) > static (Fase 1)
```

El Benchmark Engine resuelve automaticamente cual usar. Si no hay datos de industria, usa portafolio. Si el portafolio no tiene suficiente muestra, usa los estaticos.

### Tabla: `cs_benchmarks`

Columnas relevantes:
- `source`: 'static' | 'portfolio' | 'industry'
- `sample_size`: numero de empresas usadas para calcular (relevante para portfolio)
- `sector`, `size_category`: para filtrar benchmarks por sector y tamano
- `percentile_25`, `percentile_50`, `percentile_75`: distribucion estadistica

### Migracion: `029_cs_benchmark_seed.sql`

Agrega columna `source` y `sample_size` a `cs_benchmarks`, y siembra los valores estaticos conservadores para sector "general" en todos los tamanos.
