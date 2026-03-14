# 🏦 Sistema de Credit Scoring - Xending Capital
## Documento Ejecutivo Ultra-Detallado para Socios e Inversionistas

---

## 📋 Resumen Ejecutivo

### ¿Qué es este sistema?
Un motor de análisis crediticio empresarial que evalúa automáticamente si una PyME mexicana es sujeta de crédito, cuánto prestarle, qué garantías pedir, y con qué frecuencia monitorearla. Opera con 16 motores de análisis independientes, 8 motores de decisión, y 20 cruces inteligentes entre módulos.

### ¿Por qué lo necesitamos?
- Velocidad: Reducir tiempo de análisis de días a horas
- Consistencia: Decisiones basadas en datos, no en intuición
- Escalabilidad: Procesar más solicitudes sin aumentar personal
- Riesgo controlado: Detectar fraudes, rotación de deuda y riesgos ocultos automáticamente
- Compliance: Cumplir regulaciones PLD/KYC de forma sistemática
- Transparencia: Cada variable explicada con fuente, fórmula e interpretación

### Números clave del sistema
- 16 motores de análisis (Capa 2)
- 8 motores de decisión (Capa 3)
- 33 requerimientos formales
- 20 cruces inteligentes entre módulos
- 2 proveedores externos (Scory + Syntage)
- 100+ métricas calculadas por solicitud
- 60+ tablas de base de datos independientes (prefijo cs_)

### ¿Cómo funciona? (Flujo General)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CAPA 3: DECISIÓN (8 motores)                     │
│  AI Risk → Credit Limit → Risk Matrix → Scenarios → Covenants      │
│  Review Frequency → Policy → Decision Workflow                      │
│  "¿Aprobamos? ¿Cuánto? ¿Con qué condiciones? ¿Cada cuándo reviso?"│
└─────────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────────────┐
│                    CAPA 2: ANÁLISIS (16 motores)                    │
│  Compliance │ SAT │ Financial │ CashFlow │ Working Capital │ Buró   │
│  Network │ Stability │ Operational │ FX │ Guarantee │ Benchmark     │
│  Portfolio │ Graph Fraud │ Employee │ (+ 20 cruces inteligentes)    │
│  "¿Qué tan riesgoso es? ¿Le está dando vuelta al dinero?"          │
└─────────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────────────────────────────────────────────┐
│                    CAPA 1: DATOS (fuentes externas + internas)      │
│  Scory (PLD/KYC) │ Syntage (SAT + Buró + Indicadores + Hawk)       │
│  Documentos │ Estados Financieros │ Benchmarks │ Portafolio │ FX    │
│  "¿Qué información tenemos del solicitante?"                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Flujo paso a paso de una solicitud

```
  Empresa solicita crédito
           │
           ▼
  ┌─────────────────┐
  │ 1. COMPLIANCE    │ ← Scory: listas negras, OFAC, PEPs, 69B
  │    (Gate)        │   ¿Pasa PLD/KYC?
  └────────┬────────┘
           │ ✅ Pasa / ❌ Rechazado automático
           ▼
  ┌─────────────────┐
  │ 2. RECOLECCIÓN   │ ← Syntage: SAT, Buró, Indicadores, Hawk
  │    DE DATOS      │ ← Documentos: OCR, uploads
  └────────┬────────┘ ← Estados financieros
           │
           ▼
  ┌─────────────────┐
  │ 3. 16 MOTORES    │  Cada uno analiza independiente:
  │    DE ANÁLISIS   │  SAT, Financial, CashFlow, Working Capital,
  │                  │  Buró (+ rotación deuda), Network, Stability,
  │                  │  Operational, FX, Guarantee, Benchmark,
  │                  │  Portfolio, Graph Fraud, Employee, Documentation
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 4. 20 CRUCES     │  Detectar patrones complejos:
  │    INTELIGENTES  │  Rotación de deuda, empresa fachada,
  │                  │  sobreendeudamiento, manipulación contable...
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 5. DECISIÓN      │  AI Risk → Credit Limit → Risk Matrix
  │    (3 Gates)     │  Gate 1: Hard Stops
  │                  │  Gate 2: Semáforo por módulo
  │                  │  Gate 3: Score consolidado (100 pts)
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ 6. RESULTADO     │  → Aprobado / Aprobado Condicionado /
  │                  │    Comité / Rechazado
  │                  │  → Monto, plazo, garantía, covenants
  │                  │  → Frecuencia de revisión
  └─────────────────┘
```

---

## 🗂️ CAPA 1: DATA LAYER (Fuentes de Datos)

Esta capa recolecta toda la información necesaria para evaluar al solicitante. Son las "materias primas" del análisis.

---

### 1.1 Scory (Proveedor PLD/KYC)

¿Qué es? Servicio externo que valida identidad y cumplimiento regulatorio. Es el primer filtro antes de gastar recursos en análisis.

¿Qué datos nos da?

| Dato | Descripción | Para qué sirve |
|------|-------------|----------------|
| Listas Negras | Personas/empresas sancionadas en México | Rechazo automático si aparece |
| OFAC | Lista de sanciones de EE.UU. | Rechazo automático si aparece |
| PEPs | Personas Políticamente Expuestas | Requiere revisión adicional |
| SYGER | Sistema de Gestión de Riesgos SAT | Validar situación fiscal |
| RUG | Registro Único de Garantías | Ver garantías ya comprometidas |
| 69B | Lista de factureras del SAT | Rechazo automático si aparece |
| Validación Domicilio | Fotos, geolocalización | Confirmar que empresa existe físicamente |
| Validación Accionistas | Perfil económico de socios | Detectar prestanombres |
| Consistencia Giro | Giro declarado vs instalaciones | Detectar empresas fachada |

¿Cuándo se consulta? Primer paso obligatorio. Si no pasa, no se gasta en Syntage.

---

### 1.2 Syntage (Proveedor SAT + Buró + Indicadores)

¿Qué es? Servicio que extrae información directamente del SAT, Buró de Crédito, Registro Público, e Incidencias Legales. Es la fuente más rica de datos del sistema.

#### 1.2.1 Datos del SAT (Data Cruda)

| Dato | Campos principales | Para qué sirve |
|------|-------------------|----------------|
| CFDIs Emitidas | UUID, RFC emisor/receptor, monto, moneda, fecha, estatus, método pago (PUE/PPD), forma pago, cancelaciones, notas de crédito, impuestos | Ventas reales, clientes, concentración, calidad de ingreso |
| CFDIs Recibidas | Mismos campos que emitidas | Gastos reales, proveedores, estructura de costos |
| Retenciones | RFC emisor/receptor, monto operativo, impuestos retenidos | Obligaciones fiscales |
| Declaraciones | Tipo, periodo, año fiscal, adeudo, pago, banco, estados financieros completos | Balance, estado de resultados, razones financieras |
| Constancia Situación Fiscal | RFC, estatus, dirección, actividades, regímenes, obligaciones, correo, teléfono | Verificar que empresa está activa y su giro |
| Opinión Cumplimiento | Resultado (positiva/negativa), fecha | Si está al corriente con SAT |
| Lista 69B | Barrido contra lista negra SAT | Detectar factureras |
| Contabilidad Electrónica | Balanzas de comprobación mensuales (saldo inicial, debe, haber, saldo final) | Movimientos reales mes a mes |
| Nómina (CFDIs tipo N) | RFCs de empleados, montos | Headcount real, costo laboral |

#### 1.2.2 Datos del Buró de Crédito

| Dato | Campos principales | Para qué sirve |
|------|-------------------|----------------|
| Score PyME | Valor numérico + causas del score | Calificación crediticia |
| Califica | Variables para cálculo de reservas (Anexo 21/22 CUB) | Regulatorio |
| Créditos Activos | Otorgante, tipo, moneda, plazo, monto original/vigente, buckets de atraso (1-29, 30-59, 60-89, 90-119, 120-179, 180+), histórico de pagos | Deuda actual, comportamiento de pago, ROTACIÓN DE DEUDA |
| Créditos Liquidados | Quitas, daciones, quebrantos, pagos | Historial de defaults |
| Historia Consultas | Últimos 3/12/24/+24 meses, por tipo (financieras vs comerciales) | Detectar búsqueda desesperada de crédito |
| Calificación Cartera | Mensual histórica (vigente, vencido por buckets) | Tendencia de deterioro |
| Información Comercial | Situación último mes, montos, distribución vencimiento | Comportamiento comercial |

#### 1.2.3 Hawk Checks (Incidencias Legales y Compliance)

| Fuente | Qué busca |
|--------|-----------|
| Juicios civiles/penales/amparo | Demandas activas |
| Servidores públicos sancionados (SFP) | Sanciones gubernamentales |
| Funcionarios públicos | Exposición política |
| Fiscal créditos SAT | Adeudos fiscales |
| 69B Facturas SAT | Operaciones falsas |
| Actividades vulnerables | Lavado de dinero |
| FGJ / FGR | Investigaciones penales |
| Interpol | Búsqueda internacional |
| FOBAPROA | Historial bancario |
| PROFECO | Quejas de consumidores |
| Banco Mundial sanciones | Sanciones internacionales |
| FCPA | Prácticas corruptas (EE.UU.) |
| CNBV sanciones | Sanciones financieras |
| Panama/Paradise/Offshore/Bahama Papers | Estructuras offshore |
| Quiebras/Concursos Mercantiles | Insolvencia |
| 30+ fuentes adicionales | Cobertura completa |

#### 1.2.4 Syntage Score e Indicadores Procesados

| Indicador | Fuente | Lógica de riesgo |
|-----------|--------|-------------------|
| Syntage Score (0-1000) | 13 variables ponderadas | 0-250 Baja, 250-500 Regular, 500-750 Buena, 750-1000 Excelente |
| Opinión cumplimiento | SAT | Riesgo si negativa |
| Estatus Lista Negra | 69B SAT | Riesgo si presente |
| Contrapartes en Lista Negra | Facturas + 69B | Riesgo si hay facturas con empresas en lista |
| Facturación Intercompañía | Declaración anual | Riesgo si hay transacciones entre partes relacionadas |
| Concentración Clientes | Facturas (HHI) | Riesgo si HHI > 1500 |
| Concentración Proveedores | Facturas (HHI) | Riesgo si HHI > 1500 |
| Riesgo Cambiario | Facturas | Riesgo si > 15% en moneda extranjera |
| Razón Activos/Deuda | Declaración anual | Riesgo si < 100% (quiebra técnica) |
| Facturas Emitidas Canceladas | Facturas | Riesgo si > 10% |
| Facturas Recibidas Canceladas | Facturas | Riesgo si > 12% |

#### 1.2.5 Datos de Registro Público y Estructura Corporativa

| Dato | Campos | Para qué sirve |
|------|--------|----------------|
| Registro Público Comercio | Razón social, duración sociedad, domicilio, fecha constitución | Verificar existencia legal |
| Accionistas | Nombre, RFC, CURP, nacionalidad, acciones, porcentaje | Estructura de propiedad |
| Actos Protocolizados | Asambleas, actos, fechas | Cambios corporativos |
| RUG (Garantías) | Número, otorgante, acreedor, tipo, monto, moneda, vigencia | Activos ya comprometidos |
| Buró Incidencias Legales | 30+ jurisdicciones, grado máximo | Juicios y procedimientos |

#### 1.2.6 Razones Financieras Pre-calculadas por Syntage

| Categoría | Ratios |
|-----------|--------|
| Liquidez | Coeficiente solvencia, Prueba ácida, Coeficiente caja, Razón efectivo/activo, Capital trabajo/ventas |
| Actividad | Rotación activos, Rotación inventario, Uso activos fijos, Ventas/capital operativo, Periodo pago/cobro |
| Rentabilidad | ROA, ROE, Rendimiento ventas, Margen bruto, ROI |
| Apalancamiento | Coeficiente deuda, Coeficiente endeudamiento |
| Cobertura | Intensidad de capital |
| Solvencia | Costo financiamiento/ventas |

#### 1.2.7 Datos de Facturación Detallada (Insights)

| Sección | Qué contiene | Para qué sirve |
|---------|-------------|----------------|
| Ingresos por periodo | Ventas, por cobrar, cancelado, descuentos, notas crédito, netos, % PUE vs PPD, % cobrado PPD, DSO | Calidad real del ingreso |
| Gastos por periodo | Gastos, por pagar, cancelado, descuentos, notas crédito, nómina, netos, % PUE vs PPD, % pagado PPD, DPO | Estructura real de costos |
| Ingresos vs Gastos | Ingresos netos, gastos netos, nómina, ganancia/pérdida, margen | Rentabilidad real desde facturas |
| Flujo de Efectivo | Entradas PUE + pagos PPD, salidas PUE + pagos PPD + nómina | Cash flow real |
| Cuentas por Cobrar | Saldo pendiente PPD, saldo pagado, tendencia | Aging de cartera |
| Cuentas por Pagar | Saldo pendiente PPD, saldo pagado, tendencia | Presión de liquidez |
| Concentración Clientes | Nombre, RFC, total, peso %, transacciones mensuales | Dependencia comercial |
| Red de Clientes | Detalle por cliente: emitido, cancelado, descuentos, NC, por cobrar, neto, PUE/PPD, DSO | Comportamiento por cliente |
| Clientes Gubernamentales | Instituciones gobierno, peso %, montos | Estabilidad vs riesgo pago lento |
| Concentración Proveedores | Nombre, RFC, total, peso %, transacciones mensuales | Dependencia operativa |
| Red de Proveedores | Detalle por proveedor: recibido, cancelado, descuentos, NC, por pagar, neto, PUE/PPD, DPO | Comportamiento por proveedor |
| Productos/Servicios Vendidos | Categoría, total, peso %, historial | Diversificación de oferta |
| Productos/Servicios Comprados | Categoría, total, peso %, historial | Estructura de insumos |
| Relación Instituciones Financieras | Banca múltiple, SOFOM, seguros, otros (CONDUSEF) | Relaciones bancarias |
| Empleados | RFCs únicos con CFDI nómina, por periodo | Headcount real |
| Facturas Lista Negra | Emitidas/recibidas con contrapartes en 69B | Exposición a factureras |
| Balance (Estado Posición Financiera) | Activo CP/LP detallado, Pasivo CP/LP detallado, Capital | Salud financiera oficial |
| Estado de Resultados | Ingresos, costos detallados, gastos operación, resultado financiero, ISR, utilidad neta | Rentabilidad oficial |
| Balanza de Comprobación | Saldo inicial, debe, haber, saldo final por cuenta, mensual | Movimientos contables reales |

---

### 1.3 Documentos (Uploads + OCR)

| Documento | Obligatorio | Para qué sirve |
|-----------|-------------|----------------|
| Acta Constitutiva | Sí (bloquea) | Verificar existencia legal |
| Poder del Representante | Sí | Verificar autoridad para firmar |
| INE Representante | Sí (bloquea) | Identificación oficial |
| Comprobante Domicilio | Sí | Confirmar ubicación |
| Estados Financieros | Sí | Análisis financiero manual |
| Declaraciones Anuales | Sí | Cruzar con Syntage |

### 1.4 Datos Internos

| Fuente | Qué contiene |
|--------|-------------|
| Benchmarks por industria | Promedios sectoriales de ratios financieros |
| Portafolio actual | Créditos vigentes, exposición por sector/moneda/cliente |
| Tipo de cambio | FX spot para créditos en USD |

---

## ⚙️ CAPA 2: ENGINES LAYER (16 Motores de Análisis)

Cada motor funciona de forma independiente. Recibe datos de la Capa 1, calcula métricas, compara contra benchmarks, y devuelve un score + flags + explicación. Se pueden agregar o quitar motores sin romper el sistema.

Formato estándar de salida de cada motor:
- module_status: pass / fail / warning / blocked
- module_score: puntuación del módulo (0-100)
- module_grade: A / B / C / D / F
- risk_flags: alertas detectadas
- key_metrics: métricas calculadas
- benchmark_comparison: comparación vs industria
- explanation: narrativa explicativa
- recommended_actions: acciones sugeridas

---

### 2.1 Compliance Engine (Gate — No tiene peso en score)

Fuente de datos: Scory API
Función: Validar PLD/KYC antes de gastar recursos en análisis
Tipo: GATE (pasa o no pasa, no contribuye al score numérico)

¿Qué hace paso a paso?
1. Recibe RFC del solicitante
2. Consulta Scory API
3. Valida contra: Listas Negras, OFAC, PEPs, SYGER, RUG, 69B
4. Clasifica resultado:
   - PASS: Todo limpio, continuar
   - REVIEW_REQUIRED: Alertas menores (ej: PEP), necesita revisión humana
   - HARD STOP: Alerta crítica (lista negra, OFAC, 69B directo) → Rechazo automático

```
Solicitud → Scory API → ¿Lista negra? → ❌ RECHAZO
                       → ¿OFAC?       → ❌ RECHAZO
                       → ¿69B?        → ❌ RECHAZO
                       → ¿PEP?        → ⚠️ REVISIÓN
                       → Todo limpio  → ✅ CONTINUAR
```

Tablas: cs_compliance_checks, cs_compliance_results

---

### 2.2 SAT/Facturación Engine (Peso: 14%)

Fuente de datos: Syntage API (CFDIs, declaraciones, constancia fiscal)
Función: Analizar actividad comercial real, calidad de ingresos, comportamiento de cobro/pago

¿Qué hace paso a paso?

1. Consulta Syntage API para obtener toda la data SAT
2. Calcula facturación: total 12 meses, promedio mensual, tendencia crecimiento
3. Obtiene Syntage Score (0-1000) con 13 variables
4. Detecta indicadores de riesgo: opinión negativa, contrapartes en 69B, riesgo cambiario, facturación intercompañía

NUEVO — Análisis de Calidad de Ingreso:
5. Calcula ingresos netos reales: Ventas - Cancelaciones - Notas de Crédito - Descuentos
6. Ratio cancelaciones/ventas por cliente (detecta clientes problemáticos)
7. Ratio notas de crédito/ventas (calidad del ingreso)
8. Ingresos por cobrar como % del total (riesgo de cartera)

NUEVO — Análisis PUE vs PPD (Comportamiento de Cobro):
9. % ventas PUE (pago inmediato) vs PPD (a plazo)
10. % cobrado de PPD (eficiencia de cobranza real)
11. DSO real calculado desde CFDIs PPD pagadas

NUEVO — Análisis de Gastos:
12. Gastos netos, % PUE vs PPD, DPO real, % pagado de PPD

NUEVO — Comparación Ingresos vs Costos:
13. Ingresos netos vs (gastos netos + nómina)
14. Margen operativo real desde facturación
15. Ganancia o pérdida por periodo

NUEVO — Flujo de Efectivo desde Facturas:
16. Entradas: PUE emitidas + pagos recibidos PPD
17. Salidas: PUE recibidas + pagos emitidos PPD + nómina
18. Flujo neto mensual real

NUEVO — Aging de Cuentas:
19. CxC: saldo pendiente PPD emitidas, tendencia
20. CxP: saldo pendiente PPD recibidas, tendencia

NUEVO — Validación Cruzada:
21. Facturado vs declarado: detectar discrepancias > 10%
22. Diversificación de productos/servicios vendidos

Alertas automáticas:
- Cancelaciones emitidas > 10% → "high_cancellation_risk"
- Cancelaciones recibidas > 12% → "supplier_cancellation_risk"
- Facturado vs declarado > 15% discrepancia → "fiscal_inconsistency_risk"

Tablas: cs_sat_data, cs_sat_metrics, cs_sat_results, cs_sat_revenue_quality, cs_sat_payment_behavior, cs_sat_accounts_receivable, cs_sat_accounts_payable, cs_sat_cashflow_invoices, cs_sat_blacklisted_invoices, cs_sat_products

---

### 2.3 Documentation Engine (Peso: 4%)

Fuente de datos: Uploads del cliente + OCR
Función: Verificar que todos los documentos requeridos estén completos y vigentes

¿Qué hace?
1. Define lista de documentos requeridos
2. Valida tipo, formato, legibilidad (OCR)
3. Calcula % de completitud
4. Detecta documentos por vencer (< 30 días)
5. Si falta Acta Constitutiva o INE → BLOQUEO

Tablas: cs_documents, cs_document_validations, cs_documentation_results

---

### 2.4 Financial Engine (Peso: 11%)

Fuente de datos: Syntage (declaraciones anuales) + uploads manuales
Función: Análisis profundo de estados financieros, balance, estado de resultados, razones financieras

¿Qué hace paso a paso?

Indicadores básicos:
1. Razón Corriente, Prueba Ácida, Endeudamiento Total, Cobertura Intereses, ROE, ROA, Margen Operativo
2. Estado de Resultados: Ingresos, Costos, Utilidad Bruta, EBITDA, Utilidad Neta

NUEVO — Balance Sheet Detallado (desde Syntage declaraciones):
3. Activo corto plazo: efectivo (nacional/extranjero), inversiones, clientes (nacionales/extranjeros, partes relacionadas/no relacionadas), CxC, deudores diversos, inventarios (terminados, en proceso, materia prima), pagos anticipados
4. Activo largo plazo: propiedades/planta/equipo (terrenos, construcciones, maquinaria, transporte, mobiliario, cómputo con depreciaciones), intangibles, inversiones en asociadas
5. Pasivo corto plazo: préstamos bancarios, proveedores (nacionales/extranjeros, partes relacionadas), CxP, instrumentos financieros, acreedores diversos, impuestos, anticipos clientes
6. Pasivo largo plazo: CxP LP, instrumentos financieros LP, beneficio empleados, provisiones
7. Capital: capital social, utilidades/pérdidas acumuladas, reserva legal

NUEVO — Calidad de Activos:
8. % activos líquidos vs fijos
9. Calidad de cartera: CxC vigente vs vencida vs etapas de riesgo
10. Estimaciones de incobrables

NUEVO — Exposición Partes Relacionadas:
11. CxC con partes relacionadas nacionales/extranjeras
12. CxP con partes relacionadas
13. Total exposición partes relacionadas como % del activo
14. Si > 20% → "related_party_concentration_risk"

NUEVO — Exposición Internacional:
15. Activos/pasivos en extranjero
16. Clientes/proveedores extranjeros

NUEVO — Estado de Resultados Detallado:
17. Ventas nacionales/extranjeras (partes relacionadas/no relacionadas)
18. Costo de ventas detallado: materiales, mano de obra directa/indirecta, maquilas, gastos indirectos
19. Gastos operación: generales, administración, venta
20. Resultado integral financiamiento: intereses a favor/cargo (nacionales/extranjeros), ganancia/pérdida cambiaria, REPOMO
21. ISR corriente y diferido, PTU

NUEVO — Estructura de Costos:
22. % costo materiales vs mano de obra vs indirectos
23. Gastos operativos como % de ventas
24. Carga financiera como % de ventas

NUEVO — Cross-Validation con Syntage Ratios:
25. Comparar nuestros cálculos vs los ratios pre-calculados de Syntage
26. Si discrepancia > 5% → flag

NUEVO — Balanza de Comprobación:
27. Movimientos mensuales reales (debe/haber/saldo)
28. Detección de movimientos inusuales
29. Tendencias por cuenta

Alertas:
- Razón Corriente < 1.0 → "liquidity_risk"
- Endeudamiento > 70% → "leverage_risk"
- Partes relacionadas > 20% activo → "related_party_concentration_risk"
- ISR diferido significativo → "tax_planning_review"
- Pérdida cambiaria material → "fx_loss_risk"

Tablas: cs_financial_inputs, cs_financial_calculations, cs_financial_results, cs_financial_balance_detail, cs_financial_income_detail, cs_financial_related_parties, cs_financial_international, cs_financial_cost_structure, cs_financial_balanza

---

### 2.5 CashFlow Engine (Peso: 16%)

Fuente de datos: SAT Engine + Financial Engine + Buró Engine
Función: ¿Puede realmente pagar la deuda? Capacidad de pago real.

¿Qué hace?
1. Calcula EBITDA, margen EBITDA, flujo operativo, CAPEX, free cash flow
2. Calcula servicio de deuda actual (desde Buró) + proyectado (nuevo crédito)
3. Calcula DSCR actual y DSCR proforma

Reglas DSCR:
- > 1.50 = FUERTE (puede pagar cómodamente)
- 1.20-1.49 = ACEPTABLE
- 1.00-1.19 = DÉBIL
- < 1.00 = CRÍTICO → HARD STOP (no puede pagar)

4. Calcula capacidad máxima de pago mensual
5. Calcula monto máximo sostenible por flujo
6. Genera escenarios: base y estrés

Tablas: cs_cashflow_inputs, cs_cashflow_calculations, cs_cashflow_scenarios, cs_cashflow_results

---

### 2.6 Working Capital Engine (NUEVO — Peso: 4%)

Fuente de datos: SAT Engine (facturas PUE/PPD), Financial Engine (balance)
Función: ¿Qué tan eficiente es manejando su capital de trabajo? ¿Necesita financiamiento para operar?

¿Qué hace paso a paso?

1. Calcula Cash Conversion Cycle (CCC):
   - DSO real (días para cobrar desde CFDIs PPD pagadas)
   - DPO real (días para pagar desde CFDIs PPD pagadas)
   - DIO estimado (rotación inventario desde declaraciones)
   - CCC = DSO + DIO - DPO

```
  Compra materia prima    Vende producto    Cobra al cliente
        │                      │                  │
        ├──── DIO (inventario) ┤                  │
        │                      ├──── DSO (cobro) ─┤
        ├──── DPO (pago) ──────┤                  │
        │                                         │
        └──────── CCC (ciclo completo) ───────────┘
        
  CCC positivo = necesita financiar el ciclo
  CCC negativo = cobra antes de pagar (ideal)
```

2. Capital de trabajo real: (CxC pendientes + inventarios) - (CxP pendientes + anticipos)
3. Eficiencia de cobranza: % cobrado de PPD, aging de CxC
4. Gestión de pagos: % pagado de PPD, aging de CxP

5. Indicadores de poder de negociación:
   - % ventas PUE vs PPD (si cobra más de contado = poder sobre clientes)
   - % compras PUE vs PPD (si paga más a plazo = poder sobre proveedores)
   - Spread DSO-DPO (si cobra antes de pagar = ciclo favorable)

6. Proyección de necesidades:
   - Necesidad de capital de trabajo mensual
   - Gap de financiamiento
   - Monto óptimo de línea de crédito

Alertas:
- CCC > 90 días → atención
- CCC creciendo 3 meses → deterioro
- DSO > DPO + 30 → presión de liquidez
- CxC pendientes > 40% ventas → riesgo cobranza
- CCC negativo → "favorable_cycle" (positivo)
- Working capital real vs contable discrepancia > 20% → "working_capital_inconsistency"

Tablas: cs_working_capital_inputs, cs_working_capital_cycle, cs_working_capital_aging, cs_working_capital_results

---

### 2.7 Buró Engine (Peso: 10%) — CON DETECCIÓN DE ROTACIÓN DE DEUDA

Fuente de datos: Syntage API (Buró de Crédito + Hawk)
Función: Historial crediticio, deuda actual, Y DETECTAR SI LE ESTÁ DANDO VUELTA AL DINERO

¿Qué hace paso a paso?

Análisis básico:
1. Obtiene Score PyME + causas del score
2. Mapeo: 700+ excelente, 650-699 bueno, 600-649 regular, < 600 pobre
3. Calcula deuda total existente
4. Identifica negativos: atrasos > 90 días, castigados, demandas

NUEVO — Análisis de Créditos Activos Detallado:
5. Número de créditos activos simultáneos
6. Número de instituciones otorgantes distintas
7. Por cada crédito: tipo, moneda, plazo, monto original vs vigente, buckets de atraso, histórico de pagos
8. Servicio de deuda mensual estimado (para alimentar CashFlow Engine)

NUEVO — DETECCIÓN DE ROTACIÓN DE DEUDA (¿Le está dando vuelta al dinero?):
9. Si abre crédito nuevo dentro de 60 días de liquidar otro → posible rotación
10. Si monto vigente total ≈ monto original total → no está pagando capital, solo intereses
11. Si tiene créditos con 3+ instituciones simultáneas → sobreendeudamiento potencial
12. Si ratio deuda vigente / ingresos SAT > 40% → apalancamiento excesivo
13. Si monto vigente / monto original > 85% en créditos con > 6 meses → "not_paying_principal"

```
  PATRÓN DE ROTACIÓN DE DEUDA:
  
  Banco A: Crédito $1M ──── Liquida ──── Banco B: Crédito $1.2M ──── Liquida ──── Banco C: $1.5M
                                │                                        │
                                └── Usa dinero de B para pagar A ────────┘── Usa dinero de C para pagar B
                                
  SEÑALES DE ALERTA:
  ✗ Muchos créditos activos simultáneos
  ✗ Consultas frecuentes al buró (buscando dinero)
  ✗ Monto vigente ≈ monto original (no paga capital)
  ✗ Abre nuevo al cerrar otro (rola deuda)
```

NUEVO — Frecuencia de Consultas al Buró:
14. Consultas últimos 3 meses (financieras vs comerciales)
15. Consultas últimos 12 meses
16. Consultas últimos 24 meses
17. Si > 3 consultas financieras en 3 meses → "desperate_credit_seeking"
18. Si > 8 consultas financieras en 12 meses → "excessive_credit_shopping"

NUEVO — Créditos Liquidados:
19. Quitas (el banco perdió dinero)
20. Daciones en pago
21. Quebrantos (write-offs)
22. Si quita/quebranto en últimos 36 meses → "prior_default_history" + penalización severa

NUEVO — Calificación de Cartera Histórica:
23. Tendencia mensual: vigente vs vencido por buckets
24. Detectar deterioro o mejora en últimos 12 meses

NUEVO — Hawk Compliance Checks:
25. Juicios, servidores públicos sancionados, FGJ, FGR, Interpol, 69B, actividades vulnerables, etc.
26. Si match positivo → flag con severidad + notificar Compliance Engine

NUEVO — Análisis de Causas del Score:
27. Interpretar causas (ej: "Z3 - Morosidad en cuentas comerciales")

Alertas:
- Score < 550 → "high_risk"
- Créditos activos > 5 → "over_leveraged"
- Consultas 3 meses > 3 → "desperate_credit_seeking"
- Vigente/Original > 85% en créditos > 6 meses → "not_paying_principal"
- Quita/quebranto reciente → "prior_default_history"
- Hawk match → según severidad

Tablas: cs_buro_data, cs_buro_analysis, cs_buro_results, cs_buro_active_credits, cs_buro_consultations, cs_buro_liquidated, cs_buro_hawk_checks, cs_buro_debt_rotation

---

### 2.8 Network Engine (Peso: 8%)

Fuente de datos: Syntage (CFDIs, concentración, clientes gubernamentales, instituciones financieras)
Función: ¿De quién depende esta empresa? ¿Qué pasa si pierde su cliente principal?

¿Qué hace paso a paso?

Análisis básico de concentración:
1. HHI clientes y proveedores
2. Top 1/3 cliente %, Top 1/3 proveedor %
3. Detecta: dependencia gobierno, sector, moneda, país, partes relacionadas

NUEVO — Red de Clientes Detallada:
4. Por cada cliente: emitido total, cancelado, descuentos, notas crédito, por cobrar, neto, PUE/PPD, % cobrado PPD, DSO específico
5. Detecta clientes que pagan lento (DSO > promedio + 1 std dev)
6. Detecta clientes con alto % cancelaciones

NUEVO — Red de Proveedores Detallada:
7. Por cada proveedor: recibido total, cancelado, descuentos, notas crédito, por pagar, neto, PUE/PPD, % pagado PPD, DPO específico
8. Detecta proveedores a los que paga lento

NUEVO — Clientes Gubernamentales:
9. Instituciones gobierno identificadas por SAT
10. % ingresos de gobierno sobre ventas totales
11. DSO específico gobierno vs privado
12. Si gobierno > 50% → "government_dependency"

NUEVO — Relación con Instituciones Financieras:
13. Banca múltiple, SOFOM ENR, seguros, otros (desde CONDUSEF)
14. Volumen de transacciones por institución
15. Número de relaciones bancarias activas

NUEVO — Diversificación de Productos/Servicios:
16. Productos/servicios vendidos con peso %
17. Productos/servicios comprados con peso %
18. HHI por producto
19. Si top 1 producto > 60% ventas → "product_concentration_risk"

Reglas:
- HHI > 1500 → atención
- Top 1 cliente > 35% → riesgo
- Top 1 cliente > 50% → alto riesgo
- Top 3 clientes > 70% → alerta fuerte
- Top 1 proveedor > 40% → "operational_dependency_risk"

Tablas: cs_network_counterparties, cs_network_metrics, cs_network_concentration, cs_network_results, cs_network_clients_detail, cs_network_suppliers_detail, cs_network_government, cs_network_financial_institutions, cs_network_products

---

### 2.9 Business Stability Engine (Peso: 9%)

Fuente de datos: SAT Engine (facturación mensual 24-36 meses)
Función: ¿Es un negocio predecible o errático?

¿Qué hace?
1. Analiza facturación mensual, gastos, pagos y cobros
2. Calcula: variación mensual, desviación estándar, coeficiente de variación, tendencia rolling 3/6/12 meses
3. Detecta: estacionalidad, meses con caída > 20%, meses con margen negativo
4. Calcula: cancelaciones/ventas, notas de crédito/ventas
5. Clasifica patrón: ESTABLE / CÍCLICO / ERRÁTICO / DETERIORANDO

Reglas:
- Volatilidad alta → score menor
- Ventas cayendo 3 trimestres → alerta
- Cancelaciones > 10% emitidas → alerta

Tablas: cs_stability_timeseries, cs_stability_metrics, cs_stability_results

---

### 2.10 Operational Risk Engine (Peso: 9%)

Fuente de datos: Scory + Syntage (Registro Público, RUG, Incidencias Legales, Constancia Fiscal)
Función: ¿Esta empresa es real? ¿Tiene sustancia económica? ¿Es una fachada?

¿Qué hace paso a paso?

Validación básica (Scory):
1. Domicilio, geolocalización, fotos, consistencia giro vs instalaciones
2. Accionistas vs perfil económico
3. Calcula: consistency score, legal existence score, operational footprint score, ownership clarity score
4. Detecta: nominee risk, shell-company risk

NUEVO — Estructura Corporativa (Syntage/Registro Público):
5. FME, razón social, duración sociedad, domicilio social, fecha constitución
6. Accionistas: nombre, RFC, CURP, nacionalidad, acciones, porcentaje
7. Actos protocolizados, asambleas

NUEVO — RUG (Registro Único de Garantías):
8. Garantías registradas: número, otorgante, acreedor, tipo, monto, moneda, vigencia
9. Detectar si activos ofrecidos como garantía YA ESTÁN COMPROMETIDOS con otro acreedor
10. Si ya comprometidos → "guarantee_already_pledged" + notificar Guarantee Engine

NUEVO — Buró de Incidencias Legales:
11. Juicios en 30+ jurisdicciones
12. Procedimientos administrativos, FOBAPROA, PROFECO
13. Funcionarios sancionados, proveedores sancionados
14. Quiebras/concursos mercantiles
15. Sanciones internacionales (Banco Mundial, FCPA, CNBV)
16. Panama/Paradise/Offshore/Bahama Papers
17. Si incidencias activas → clasificar severidad

NUEVO — Validación de Accionistas:
18. Cruzar accionistas Syntage vs Scory vs documentos
19. Verificar RFC de accionistas no estén en listas negras
20. Congruencia % accionario vs perfil económico

NUEVO — Constancia de Situación Fiscal:
21. Estatus, actividades económicas, regímenes, obligaciones
22. Si actividad declarada no corresponde con facturación real → "activity_mismatch_risk"

Tablas: cs_operational_checks, cs_operational_evidence, cs_operational_flags, cs_operational_results, cs_operational_corporate, cs_operational_rug, cs_operational_legal_incidents, cs_operational_shareholders, cs_operational_fiscal_status

---

### 2.11 FX Risk Engine (Peso: 7%)

Fuente de datos: SAT Engine + Financial Engine + tipo de cambio
Función: ¿Qué pasa si el peso se devalúa? (Obligatorio para créditos en USD)

¿Qué hace?
1. Analiza: moneda del crédito vs moneda de ingresos/costos/facturación/CxC/deuda
2. Calcula: currency mismatch ratio, natural hedge ratio, uncovered FX exposure
3. Calcula: EBITDA sensitivity a FX, DSCR stressed por FX
4. Escenarios: base, estrés -10%, -20%, -30%
5. Output: score FX, vulnerabilidad, recomendación de moneda, obligación cobertura

Reglas:
- Crédito USD + ingresos 100% MXN sin cobertura = ALTO RIESGO
- Ingresos USD > 70% = riesgo bajo

Tablas: cs_fx_inputs, cs_fx_exposure, cs_fx_scenarios, cs_fx_results

---

### 2.12 Guarantee Engine (No tiene peso en score — es Gate)

Fuente de datos: Documentos + Operational Risk (RUG)
Función: ¿Las garantías cubren el 2:1 requerido?

¿Qué hace?
1. Acepta tipos: inmueble, vehículo, CxC, inventario, cash, aval, prendaria, cesión derechos, fideicomiso
2. Aplica haircuts por tipo:
   - Cash USD: 0-10%
   - Cash MXN (crédito USD): 10-20%
   - CxC: 35-50%
   - Inmueble: 30-45%
   - Inventario: 50-70%
   - Vehículo: 45-60%
3. Política base: cobertura mínima 200% (2:1)
4. Ajustes dinámicos: score bajo → 2.25x o 2.5x, crédito USD con garantía MXN → +colchón FX
5. Calcula: valor elegible neto, cobertura neta, faltante

Tablas: cs_guarantees, cs_guarantee_documents, cs_guarantee_valuations, cs_guarantee_haircuts, cs_guarantee_results

---

### 2.13 Benchmark Engine (No tiene peso propio — alimenta a todos)

Fuente de datos: Datos internos + Syntage ratios
Función: ¿Cómo se compara esta empresa vs su industria?

¿Qué hace?
1. Mantiene benchmarks por: sector, tamaño, región
2. Compara: Razón Corriente, ROE, Margen, Endeudamiento, DSCR
3. Compara Syntage Score vs distribución sectorial
4. Genera reporte de desviación
5. Flag si desviación > 1 std dev

NUEVO — Cross-Validation con Syntage Ratios:
6. Ingesta ratios pre-calculados de Syntage (liquidez, actividad, rentabilidad, apalancamiento, cobertura, solvencia)
7. Compara vs cálculos propios del Financial Engine
8. Si discrepancia > 5% → "calculation_discrepancy"

Tablas: cs_benchmarks, cs_benchmark_comparisons, cs_benchmark_syntage_ratios, cs_benchmark_cross_validation

---

### 2.14 Portfolio Engine (Peso: 5%)

Fuente de datos: Portafolio interno actual
Función: ¿Aprobar este crédito concentra demasiado nuestro portafolio?

¿Qué hace?
1. Analiza portafolio actual: sector, geografía, moneda, contrapartes
2. Calcula: exposición por sector/moneda/grupo económico
3. Calcula: correlación cartera, concentración post-originación, expected loss incremental
4. Si nueva operación eleva concentración arriba de límite → penalizar
5. Si varios acreditados dependen del mismo comprador → penalizar

Tablas: cs_portfolio_positions, cs_portfolio_limits, cs_portfolio_exposure, cs_portfolio_results

---

### 2.15 Graph Fraud Engine (Gate — puede bloquear)

Fuente de datos: SAT Engine (CFDIs) + Operational Risk (accionistas, domicilios)
Función: Detectar fraude de facturación, redes sospechosas, simulación

¿Qué hace?
1. Construye grafo: nodos (empresas, personas, direcciones, teléfonos, cuentas) + edges (facturas, comparte accionista, comparte domicilio, etc.)
2. Detecta: facturación circular, contrapartes de vida corta, contrapartes en 69B, concentración extrema con relacionadas
3. Calcula: degree centrality, betweenness centrality, connected components, cycles, clusters
4. Si fraude severo → HARD STOP

```
  Empresa A ──factura──→ Empresa B ──factura──→ Empresa C
       ↑                                            │
       └────────────── factura ─────────────────────┘
       
  = FACTURACIÓN CIRCULAR (alerta máxima)
```

Tablas: cs_graph_nodes, cs_graph_edges, cs_graph_runs, cs_graph_alerts, cs_graph_scores

---

### 2.16 Employee Engine (NUEVO — Peso: 3%)

Fuente de datos: Syntage (CFDIs tipo N — nómina)
Función: ¿Cuántos empleados tiene? ¿Es productiva? ¿Está creciendo o contrayéndose?

¿Qué hace?
1. Calcula headcount por periodo (RFCs únicos con CFDI nómina)
2. Costo de nómina total y per cápita
3. Tendencia: crecimiento/contracción mes a mes, rolling 3/6/12 meses
4. Productividad: ingreso por empleado, nómina como % de ingresos, nómina como % de gastos
5. Sostenibilidad: nómina mensual vs flujo operativo

Alertas:
- Headcount cayendo > 20% en 6 meses → empresa contrayéndose
- Nómina > 40% de ingresos → alta carga laboral
- Headcount = 0 con facturación alta → "possible_shell_company" (sospechoso)
- Nómina creciendo más rápido que ingresos → "payroll_sustainability_risk"

Cross-validación:
- Headcount vs tamaño instalaciones (Scory)
- Nómina vs declaraciones anuales (PTU, gastos personal)

Tablas: cs_employee_headcount, cs_employee_payroll, cs_employee_productivity, cs_employee_results

---

## 🔀 CRUCES INTELIGENTES (20 Patrones de Detección)

Los cruces son el diferenciador del sistema. Ningún motor individual puede detectar estos patrones — solo se ven al combinar resultados de múltiples motores.

---

### Cruce 1: Buró malo + Facturación fuerte
- Módulos: Buró Engine + SAT Engine
- Patrón: Score PyME bajo pero ventas creciendo
- Interpretación: Posible empresa en expansión que se endeudó para crecer
- Acción: Revisar deuda real, puede ser oportunidad si la tendencia es positiva

### Cruce 2: Buró bueno + Facturación deteriorando
- Módulos: Buró Engine + SAT Engine
- Patrón: Buen historial crediticio pero ventas cayendo
- Interpretación: Riesgo de empeoramiento futuro — el buró refleja el pasado, las ventas el futuro
- Acción: Bajar monto y/o plazo

### Cruce 3: Facturación fuerte + Alta concentración
- Módulos: SAT Engine + Network Engine
- Patrón: Vende mucho pero a pocos clientes
- Interpretación: Si pierde su cliente principal, colapsa
- Acción: Limitar línea, pedir garantía reforzada

### Cruce 4: Liquidez buena + Flujo malo
- Módulos: Financial Engine + CashFlow Engine
- Patrón: Balance sano pero caja apretada
- Interpretación: Tiene activos pero no genera efectivo suficiente
- Acción: Revisar ciclo de conversión, posible problema de cobranza

### Cruce 5: Empresa estable + Riesgo FX alto
- Módulos: Stability Engine + FX Risk Engine
- Patrón: Negocio predecible pero vulnerable a devaluación
- Interpretación: Buen negocio pero moneda equivocada
- Acción: Sugerir crédito MXN o cobertura obligatoria

### Cruce 6: Compliance limpio + Operational risk dudoso
- Módulos: Compliance Engine + Operational Risk Engine
- Patrón: No aparece en listas negras pero empresa parece no tener sustancia
- Interpretación: Posible empresa formal sin operación real
- Acción: Investigación adicional, visita física

### Cruce 7: Ventas altas + Cancelaciones altas + Red circular
- Módulos: SAT Engine + Graph Fraud Engine
- Patrón: Factura mucho pero cancela mucho y tiene ciclos en el grafo
- Interpretación: ALERTA MÁXIMA — posible simulación de facturación
- Acción: Investigación profunda, posible rechazo

### Cruce 8: Garantía fuerte + Score medio
- Módulos: Guarantee Engine + Risk Matrix
- Patrón: Colateral sólido pero perfil crediticio mediocre
- Interpretación: El riesgo está cubierto por la garantía
- Acción: Aprobar con monto controlado y monitoreo frecuente

### Cruce 9: Score bueno + Portafolio concentrado
- Módulos: Risk Matrix + Portfolio Engine
- Patrón: Buen solicitante pero aprobar concentraría nuestro portafolio
- Interpretación: El riesgo no es del cliente sino nuestro
- Acción: Aprobar monto menor para no concentrar

### Cruce 10: Ingresos USD + Crédito USD + Garantía USD
- Módulos: SAT Engine + FX Risk Engine + Guarantee Engine
- Patrón: Todo alineado en misma moneda
- Interpretación: Perfil ideal para crédito en USD — natural hedge completo
- Acción: Aprobar con condiciones favorables

### Cruce 11: Muchos créditos + Consultas frecuentes + Rola deuda (NUEVO)
- Módulos: Buró Engine (debt rotation detection)
- Patrón: 3+ créditos activos, > 3 consultas en 3 meses, abre nuevo al cerrar otro
- Interpretación: LE ESTÁ DANDO VUELTA AL DINERO — toma prestado para pagar lo que debe
- Acción: Rechazo o monto muy reducido con garantía reforzada

### Cruce 12: Muchas instituciones + Vigente ≈ Original + DSCR ajustado (NUEVO)
- Módulos: Buró Engine + CashFlow Engine
- Patrón: Deuda con muchos bancos, no paga capital, DSCR apenas pasa
- Interpretación: Sobreendeudamiento real — la capacidad de pago está al límite
- Acción: Rechazar o exigir reestructura de deuda existente como condición

### Cruce 13: CCC largo + DSO creciendo + CxC altas (NUEVO)
- Módulos: Working Capital Engine + SAT Engine
- Patrón: Ciclo de conversión largo, tarda más en cobrar, cartera creciendo
- Interpretación: Crisis de cobranza inminente — los clientes no le están pagando
- Acción: Reducir monto, plazo corto, monitoreo mensual de CxC

### Cruce 14: Headcount bajo + Facturación alta + Pocas contrapartes (NUEVO)
- Módulos: Employee Engine + SAT Engine + Network Engine
- Patrón: Factura millones pero tiene 2 empleados y 3 clientes
- Interpretación: POSIBLE EMPRESA FACHADA — no tiene operación real
- Acción: Cruzar con Operational Risk y Graph Fraud, probable rechazo

### Cruce 15: Nómina creciendo + Ventas cayendo + CCC deteriorando (NUEVO)
- Módulos: Employee Engine + SAT Engine + Working Capital Engine
- Patrón: Contrata más gente mientras vende menos y el ciclo se alarga
- Interpretación: Empresa en contracción que no ajusta costos
- Acción: Reducir monto significativamente, plazo corto

### Cruce 16: Ingresos gobierno altos + DSO gobierno largo + CCC positivo (NUEVO)
- Módulos: Network Engine + Working Capital Engine
- Patrón: Vende mucho a gobierno pero gobierno paga en 90-120 días
- Interpretación: Necesita financiamiento puente por ciclo de pago gobierno
- Acción: Línea de capital de trabajo atada a contratos gobierno, plazo corto

### Cruce 17: Garantías en RUG + Múltiples acreedores en buró (NUEVO)
- Módulos: Operational Risk Engine (RUG) + Buró Engine
- Patrón: Los activos que ofrece como garantía ya están comprometidos con otros
- Interpretación: No tiene garantías reales disponibles
- Acción: Exigir garantías adicionales no comprometidas o rechazar

### Cruce 18: Hawk checks positivos + Incidencias legales + Buró deteriorando (NUEVO)
- Módulos: Buró Engine (Hawk) + Operational Risk Engine + Buró Engine
- Patrón: Aparece en listas de riesgo, tiene juicios, y su buró empeora
- Interpretación: Perfil de riesgo integral elevado — múltiples señales negativas
- Acción: Rechazo salvo garantía excepcional

### Cruce 19: Working capital real vs contable inconsistente + Partes relacionadas altas (NUEVO)
- Módulos: Working Capital Engine + Financial Engine
- Patrón: El capital de trabajo calculado desde facturas no cuadra con el balance, y tiene mucha exposición a partes relacionadas
- Interpretación: POSIBLE MANIPULACIÓN CONTABLE — infla balance con transacciones entre relacionadas
- Acción: Investigación profunda, posible rechazo

### Cruce 20: Muchas instituciones financieras (Syntage) + Créditos múltiples (Buró) + Consultas frecuentes (NUEVO)
- Módulos: Network Engine + Buró Engine
- Patrón: Tiene relación con muchos bancos, créditos activos con varios, y lo consultan seguido
- Interpretación: SOBREENDEUDAMIENTO SISTÉMICO — está apalancado al máximo
- Acción: Rechazar o condicionar a reducción de deuda existente

---

## 🎯 CAPA 3: DECISION LAYER (8 Motores de Decisión)

---

### 3.1 AI Risk Engine
Función: Generar análisis de riesgo con inteligencia artificial

¿Qué hace?
1. Recibe resultados de los 16 motores + 20 cruces
2. Genera narrativa de riesgo resumiendo hallazgos clave
3. Identifica top 3 riesgos y top 3 fortalezas
4. Genera escenarios: mejor caso, base, estrés
5. Sugiere acciones mitigantes
6. Genera confidence score (0-100%) basado en completitud de datos
7. Detecta riesgos ocultos que ningún motor individual vio

Tablas: cs_ai_analysis, cs_ai_scenarios, cs_ai_recommendations

---

### 3.2 Credit Limit Engine
Función: ¿Cuánto es lo máximo que podemos prestar?

Calcula 5 límites independientes y toma el MÍNIMO:

```
  Límite por flujo:      Máximo soportado por DSCR mínimo
  Límite por ventas:     10-20% ventas anuales (capital trabajo)
  Límite por EBITDA:     1.0x a 2.5x EBITDA ajustado
  Límite por garantía:   Máximo compatible con cobertura 2:1
  Límite por portafolio: Máximo por exposición sectorial/moneda
  
  MONTO APROBADO = MIN(flujo, ventas, EBITDA, garantía, portafolio)
  
  Ejemplo:
  Flujo dice:      $5M
  Ventas dice:     $8M
  EBITDA dice:     $6M
  Garantía dice:   $4M  ← ESTE ES EL BINDING
  Portafolio dice: $10M
  
  Monto aprobado: $4M (limitado por garantía)
  Explicación: "La garantía disponible solo cubre hasta $4M con política 2:1"
```

Tablas: cs_credit_limits, cs_limit_calculations

---

### 3.3 Risk Matrix Engine (3 Gates)
Función: Decisión final estructurada en 3 niveles

```
  GATE 1: HARD STOPS (automático)
  ┌─────────────────────────────────────────┐
  │ ❌ OFAC / Lista negra crítica           │
  │ ❌ 69B directo                          │
  │ ❌ Fraude documental severo             │
  │ ❌ Empresa no verificable               │
  │ ❌ DSCR proforma < 1.0                  │
  │ ❌ Garantía insuficiente (si requerida) │
  │ ❌ Red fraudulenta severa               │
  │ Si cualquiera = RECHAZADO AUTOMÁTICO    │
  └─────────────────────────────────────────┘
                    │ Pasa
                    ▼
  GATE 2: SEMÁFORO POR MÓDULO
  ┌─────────────────────────────────────────┐
  │ 🟢🟡🔴 Compliance                      │
  │ 🟢🟡🔴 CashFlow                        │
  │ 🟢🟡🔴 Buró                            │
  │ 🟢🟡🔴 FX                              │
  │ 🟢🟡🔴 Operacional                     │
  │ 🟢🟡🔴 Garantías                       │
  │ Si muchos rojos = COMITÉ o RECHAZO      │
  └─────────────────────────────────────────┘
                    │ Pasa
                    ▼
  GATE 3: SCORE CONSOLIDADO (100 puntos)
  ┌─────────────────────────────────────────┐
  │ CashFlow:        16%                    │
  │ SAT/Facturación: 14%                    │
  │ Financial:       11%                    │
  │ Buró:            10%                    │
  │ Stability:        9%                    │
  │ Operational:      9%                    │
  │ Network:          8%                    │
  │ FX:               7%                    │
  │ Portfolio:         5%                   │
  │ Working Capital:   4%                   │
  │ Documentation:     4%                   │
  │ Employee:          3%                   │
  │ ─────────────────────                   │
  │ TOTAL:           100%                   │
  └─────────────────────────────────────────┘
```

Decisiones posibles:
- APROBADO: Score alto + sin alertas + cumple cobertura 2:1
- APROBADO CONDICIONADO: Score medio + garantías + covenants
- COMITÉ: Score medio con cruces complejos
- RECHAZADO: Hard stop o score bajo

Tablas: cs_risk_matrix_results, cs_decision_gates

---

### 3.4 Review Frequency Engine
Función: ¿Cada cuánto revisamos este crédito?

- Riesgo bajo → Semestral
- Riesgo medio → Trimestral
- Riesgo alto aprobado → Mensual
- Crédito USD sin cobertura → Mensual
- Concentración alta → Mensual

Triggers automáticos de revisión extraordinaria:
- Caída ventas > 20%
- DSO empeora > 25%
- Cliente top deja de facturar
- Contraparte entra a 69B
- Baja fuerte de score
- Cambio en accionistas
- Nueva demanda/juicio
- Devaluación material (crédito USD)

Tablas: cs_review_schedule, cs_review_triggers

---

### 3.5 Policy Engine
Función: Configuración dinámica sin cambiar código

Maneja: límites por sector/moneda/plazo/score, políticas de garantía, hard stops, covenant templates. Todo versionado con fechas efectivas.

Tablas: cs_policies, cs_policy_versions, cs_policy_audit

---

### 3.6 Scenario Engine
Función: ¿Qué pasa si las cosas salen mal?

Escenarios: base, estrés ventas, estrés margen, estrés DSO, estrés FX, combinado.
Recalcula DSCR, cobertura y límites bajo cada escenario.
Identifica breaking points donde el crédito se vuelve inviable.

Tablas: cs_scenarios, cs_scenario_results

---

### 3.7 Covenant Engine
Función: Condiciones para aprobados condicionados

Tipos: mínimo DSCR, máximo endeudamiento, mínimo cobertura garantía, obligación información mensual, restricción dividendos, obligación cobertura cambiaria.
Monitorea cumplimiento y alerta en breach.

Tablas: cs_covenants, cs_covenant_monitoring

---

### 3.8 Decision Workflow Engine
Función: ¿Quién aprueba?

- < $500K → Analista (auto-approve si score alto + sin alertas)
- $500K - $2M → Manager
- > $2M → Comité

SLA: 24h auto-decisiones, 48h analista, 72h comité.
Soporta override manual con razón y aprobador.

Tablas: cs_workflow_queue, cs_workflow_decisions, cs_workflow_overrides

---

## 📊 RESUMEN DE PESOS DEL SCORE

```
  ┌────────────────────────────────────────────────────────────┐
  │                    SCORE TOTAL: 100 pts                    │
  │                                                            │
  │  ████████████████  CashFlow          16%  ← Más importante│
  │  ██████████████    SAT/Facturación   14%                   │
  │  ███████████       Financial         11%                   │
  │  ██████████        Buró              10%                   │
  │  █████████         Stability          9%                   │
  │  █████████         Operational        9%                   │
  │  ████████          Network            8%                   │
  │  ███████           FX                 7%                   │
  │  █████             Portfolio          5%                   │
  │  ████              Working Capital    4%                   │
  │  ████              Documentation      4%                   │
  │  ███               Employee           3%                   │
  │                                                            │
  │  + Gates (no pesan pero bloquean):                         │
  │    Compliance, Guarantee, Graph Fraud                      │
  └────────────────────────────────────────────────────────────┘
```

---

## � TREND ANALYSIS LAYER (Capa Transversal de Tendencias)

### ¿Qué es?

Una capa de utilidades compartidas que permite a cada motor analizar la evolución temporal de sus métricas clave. No es un motor independiente — es una librería (`trendUtils`) que todos los motores consumen para calcular tendencias, clasificarlas, proyectarlas, y generar datos para gráficos. El AI Risk Engine consolida todas las tendencias en una narrativa ejecutiva.

### ¿Por qué es necesaria?

Un valor puntual no cuenta la historia completa. Una empresa con DSCR de 1.35 puede parecer sana, pero si hace 6 meses era 1.80 y viene cayendo 0.08/mes, en 4 meses cruza 1.0. La tendencia es más importante que el valor actual para predecir riesgo futuro.

### Profundidad Temporal Disponible por Fuente

| Fuente de Datos | Profundidad | Granularidad |
|-----------------|-------------|--------------|
| CFDIs emitidas/recibidas (Syntage) | 24-36+ meses | Por factura (diaria), agregable a mensual |
| Declaraciones anuales (Syntage) | 2-5 años fiscales | Anual |
| Balanza de comprobación (Syntage) | 12-24+ meses | Mensual |
| Buró - créditos activos (Syntage) | Histórico completo | Mensual (buckets de atraso) |
| Buró - calificación cartera (Syntage) | 12-24 meses | Mensual |
| Buró - consultas (Syntage) | 3/12/24/+24 meses | Por evento |
| Nómina CFDIs tipo N (Syntage) | 24-36 meses | Mensual |
| Ingresos/gastos insights (Syntage) | 12-24 meses | Mensual |
| CxC / CxP pendientes (Syntage) | 12-24 meses | Mensual |
| Concentración clientes/proveedores (Syntage) | 12-24 meses | Mensual |
| Flujo de efectivo desde facturas (Syntage) | 12-24 meses | Mensual |

### Arquitectura: Interfaz Estándar TrendResult

Todos los motores deben devolver sus tendencias usando esta interfaz estándar. TypeScript la enforza en compile time.

```typescript
interface TimeSeriesPoint {
  period: string;        // "2025-01", "2025-02", etc.
  value: number;         // Valor real de la métrica
  benchmark?: number;    // Benchmark de industria para ese periodo (si aplica)
}

interface TrendResult {
  metric_name: string;           // Ej: "monthly_revenue", "dso_real", "dscr"
  metric_label: string;          // Ej: "Ventas Mensuales", "DSO Real", "DSCR"
  unit: string;                  // Ej: "MXN", "días", "ratio", "%"
  
  // Data
  time_series: TimeSeriesPoint[];  // Serie temporal completa
  current_value: number;           // Último valor
  previous_value: number;          // Valor periodo anterior
  
  // Tendencia calculada
  direction: 'improving' | 'stable' | 'deteriorating' | 'critical';
  speed: 'slow' | 'moderate' | 'fast';
  change_percent: number;          // Cambio % periodo actual vs anterior
  change_absolute: number;         // Cambio absoluto
  
  // Regresión
  slope: number;                   // Pendiente de regresión lineal
  r_squared: number;               // R² (qué tan confiable es la tendencia)
  trend_line: TimeSeriesPoint[];   // Línea de tendencia calculada
  
  // Proyección
  projection: TimeSeriesPoint[];   // Proyección 3-6 meses adelante
  months_to_threshold?: number;    // Meses para cruzar umbral crítico (si aplica)
  threshold_value?: number;        // Valor del umbral que cruzaría
  threshold_type?: 'warning' | 'critical';
  
  // Clasificación
  classification: 'A' | 'B' | 'C' | 'D' | 'F';  // Grade de la tendencia
  risk_flags: string[];            // Flags generados por la tendencia
  
  // Para gráficos
  chart_config: {
    thresholds: {                  // Líneas horizontales de referencia
      warning?: number;
      critical?: number;
      benchmark?: number;
    };
    higher_is_better: boolean;     // true = ventas, false = DSO
    y_axis_format: string;         // "$", "días", "%", "x"
  };
}
```

### Funciones de trendUtils

```
trendUtils.analyze(data[], config)     → TrendResult
trendUtils.classify(TrendResult)       → direction + speed + classification
trendUtils.project(TrendResult, months)→ projection[]
trendUtils.detectBreakpoints(data[])   → puntos de quiebre
trendUtils.detectSeasonality(data[])   → patrón estacional
trendUtils.compareVsBenchmark(data[], benchmark[]) → desviación
trendUtils.rollingAverage(data[], window) → suavizado
```

### Métricas con Tendencia por Motor

#### SAT/Facturación Engine
| Métrica | Serie Temporal | higher_is_better | Umbrales |
|---------|---------------|-------------------|----------|
| Ventas mensuales netas | 12-36 meses | ✅ | warning: -10% YoY, critical: -20% YoY |
| Cancelaciones / ventas | 12-24 meses | ❌ | warning: 8%, critical: 10% |
| % PUE vs PPD | 12-24 meses | ✅ (más PUE = mejor) | warning: PUE < 30%, critical: PUE < 15% |
| DSO real (días cobro) | 12-24 meses | ❌ | warning: > benchmark + 15d, critical: > benchmark + 30d |
| DPO real (días pago) | 12-24 meses | Depende contexto | warning: DPO < 15d (sin poder negociación) |
| Margen operativo facturas | 12-24 meses | ✅ | warning: < 10%, critical: < 5% |
| Flujo neto mensual facturas | 12-24 meses | ✅ | warning: negativo 2 meses, critical: negativo 3+ meses |
| CxC pendientes / ventas | 12-24 meses | ❌ | warning: > 30%, critical: > 40% |
| CxP pendientes / compras | 12-24 meses | Depende contexto | — |

#### Financial Engine
| Métrica | Serie Temporal | higher_is_better | Umbrales |
|---------|---------------|-------------------|----------|
| Razón Corriente | 2-5 años | ✅ | warning: < 1.2, critical: < 1.0 |
| Prueba Ácida | 2-5 años | ✅ | warning: < 0.8, critical: < 0.5 |
| Endeudamiento Total | 2-5 años | ❌ | warning: > 60%, critical: > 70% |
| ROE | 2-5 años | ✅ | warning: < 5%, critical: < 0% |
| ROA | 2-5 años | ✅ | warning: < 3%, critical: < 0% |
| Margen Operativo | 2-5 años | ✅ | warning: < benchmark - 5pp |
| EBITDA | 2-5 años | ✅ | critical: negativo |
| Exposición partes relacionadas % | 2-5 años | ❌ | warning: > 15%, critical: > 20% |
| Carga financiera / ventas | 2-5 años | ❌ | warning: > 5%, critical: > 8% |
| Balanza - movimientos por cuenta | 12-24 meses (mensual) | — | Detección de anomalías |

#### CashFlow Engine
| Métrica | Serie Temporal | higher_is_better | Umbrales |
|---------|---------------|-------------------|----------|
| EBITDA mensual | 12-24 meses | ✅ | critical: negativo |
| DSCR rolling | 12-24 meses | ✅ | warning: < 1.30, critical: < 1.0 |
| Free Cash Flow | 12-24 meses | ✅ | warning: negativo 2 meses |
| Capacidad de pago mensual | 12-24 meses | ✅ | critical: < servicio deuda |

#### Working Capital Engine
| Métrica | Serie Temporal | higher_is_better | Umbrales |
|---------|---------------|-------------------|----------|
| CCC (ciclo conversión) | 12-24 meses | ❌ | warning: > 60d, critical: > 90d |
| DSO - DPO spread | 12-24 meses | ❌ (menor = mejor) | warning: > 30d, critical: > 45d |
| Eficiencia cobranza (% cobrado PPD) | 12-24 meses | ✅ | warning: < 70%, critical: < 50% |
| Capital de trabajo real | 12-24 meses | ✅ | critical: negativo |

#### Buró Engine
| Métrica | Serie Temporal | higher_is_better | Umbrales |
|---------|---------------|-------------------|----------|
| Calificación cartera (% vigente) | 12-24 meses | ✅ | warning: < 90%, critical: < 80% |
| Deuda total vigente | Histórico | ❌ | warning: creciendo > 15% semestral |
| Créditos activos simultáneos | Histórico | ❌ | warning: > 3, critical: > 5 |
| Consultas financieras acumuladas | 3/12/24 meses | ❌ | warning: > 3 en 3m, critical: > 8 en 12m |

#### Network Engine
| Métrica | Serie Temporal | higher_is_better | Umbrales |
|---------|---------------|-------------------|----------|
| HHI clientes | 12-24 meses | ❌ | warning: > 1500, critical: > 2500 |
| HHI proveedores | 12-24 meses | ❌ | warning: > 1500, critical: > 2500 |
| Top 1 cliente % | 12-24 meses | ❌ | warning: > 35%, critical: > 50% |
| Clientes activos (count) | 12-24 meses | ✅ | warning: cayendo > 20% |
| % ingresos gobierno | 12-24 meses | Depende contexto | warning: > 50% |

#### Employee Engine
| Métrica | Serie Temporal | higher_is_better | Umbrales |
|---------|---------------|-------------------|----------|
| Headcount | 12-36 meses | ✅ | warning: cayendo > 20% en 6m |
| Ingreso por empleado | 12-36 meses | ✅ | warning: cayendo > 15% |
| Nómina / ingresos % | 12-36 meses | ❌ | warning: > 35%, critical: > 40% |
| Nómina vs flujo operativo | 12-24 meses | ❌ | critical: nómina > flujo |

#### Business Stability Engine
| Métrica | Serie Temporal | higher_is_better | Umbrales |
|---------|---------------|-------------------|----------|
| Coeficiente de variación ingresos | 12-36 meses | ❌ | warning: > 25%, critical: > 40% |
| Tendencia rolling 3/6/12 meses | 12-36 meses | ✅ | warning: negativa 2 periodos |

### Clasificación de Tendencias

```
  CLASSIFICATION MATRIX:
  
  Direction + Speed → Grade
  ─────────────────────────────
  improving + fast      → A  "Mejorando rápidamente"
  improving + moderate  → A  "Mejorando consistentemente"
  improving + slow      → B  "Mejorando gradualmente"
  stable                → B  "Estable"
  deteriorating + slow  → C  "Deterioro leve"
  deteriorating + moderate → D  "Deterioro preocupante"
  deteriorating + fast  → F  "Deterioro acelerado"
  critical              → F  "Situación crítica"
  
  Speed se determina por:
  - slow: cambio < 5% en 6 meses
  - moderate: cambio 5-15% en 6 meses
  - fast: cambio > 15% en 6 meses
```

### Visualización: Gráficos por Métrica (UX)

Cada métrica con tendencia genera un componente visual en el dashboard del analista. Usa los colores del Brand Guide de Xending Capital:

```
  Colores de gráficos:
  - Línea data real:     hsl(213, 67%, 25%)  → Primary (azul oscuro Xending)
  - Línea proyección:    hsl(174, 54%, 55%)  → Brand-2 (teal) punteada
  - Línea benchmark:     hsl(215, 16%, 47%)  → Muted foreground (gris)
  - Zona OK:             hsl(142, 76%, 96%)  → Status success bg (verde claro)
  - Zona warning:        hsl(45, 93%, 95%)   → Status warning bg (amarillo claro)
  - Zona critical:       hsl(0, 84%, 96%)    → Status error bg (rojo claro)
  - Fondo card:          hsl(0, 0%, 100%)    → Card (blanco)
  - Texto:               hsl(215, 25%, 27%)  → Foreground
  - Border radius:       0.5rem (8px)
  - Font:                Segoe UI
```

Ejemplo de componente de tendencia:

```
  ┌─────────────────────────────────────────────────────────────┐
  │  📊 DSO Real (días para cobrar)                             │
  │  Valor actual: 48 días    Tendencia: ↗ +8d (6m)            │
  │  Clasificación: D — Deterioro preocupante                   │
  │                                                             │
  │  55d│                              ●···●···● proyección     │
  │  50d│                        ●───●╱         (teal punteado) │
  │  45d│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ umbral warning │
  │  40d│              ●───●───●╱                               │
  │  35d│  ●───●───●──╱          (azul oscuro Xending)         │
  │  30d│══════════════════════════════════════ benchmark (gris) │
  │     └──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐       │
  │       Ene Feb Mar Abr May Jun Jul Ago Sep Oct Nov Dic       │
  │                                                             │
  │  ⚠️ Cruza umbral crítico (60d) en ~4 meses si continúa     │
  │                                                             │
  │  🤖 AI: "DSO subiendo 3 días/mes consistentemente.         │
  │   Cobranza deteriorándose. Top 3 clientes con DSO > 60d    │
  │   representan 45% de CxC. Revisar política de crédito      │
  │   comercial con estos clientes."                            │
  └─────────────────────────────────────────────────────────────┘
```

### AI Trend Narrative (generada por AI Risk Engine)

El AI Risk Engine recibe todos los TrendResult de todos los motores y genera:

1. **Resumen ejecutivo de tendencias:**
   > "La empresa muestra un patrón mixto: ventas estables pero cobranza deteriorándose. El CCC se alargó de 35 a 52 días en 6 meses, impulsado por DSO creciente. Headcount creció 12% mientras ventas se mantuvieron flat, comprimiendo productividad. Si las tendencias actuales continúan, el DSCR caerá por debajo de 1.20 en ~3 meses."

2. **Top 3 tendencias positivas y negativas:**
   - ✅ Margen operativo mejorando (+2pp en 6m)
   - ✅ HHI clientes bajando (diversificación)
   - ✅ Score buró estable
   - ❌ DSO subiendo (+8 días en 6m)
   - ❌ CCC alargándose (+17 días en 6m)
   - ❌ Nómina/ingresos subiendo (+4pp en 6m)

3. **Proyecciones de cruce de umbrales:**
   - DSCR cruza 1.20 en ~3 meses
   - DSO cruza 60 días en ~4 meses
   - CCC cruza 90 días en ~5 meses

4. **Recomendación basada en tendencias:**
   > "Aprobar con monto reducido, plazo corto, y revisión trimestral. Covenant de DSO máximo 55 días. Monitorear CxC mensualmente."

### Tablas de Base de Datos para Tendencias

| Tabla | Contenido |
|-------|-----------|
| cs_trend_timeseries | Series temporales raw por aplicación, motor y métrica |
| cs_trend_results | TrendResult calculado por métrica (direction, speed, classification, projection) |
| cs_trend_ai_narrative | Narrativa AI consolidada por aplicación |
| cs_trend_charts_config | Configuración de gráficos por métrica (umbrales, colores, formato) |

### Impacto en el Score

Las tendencias no tienen peso propio en el score de 100 puntos. En su lugar, cada motor ajusta su propio score según la tendencia de sus métricas:

```
  Score del motor = Score base × Factor de tendencia
  
  Factor de tendencia:
  - Todas mejorando:     1.05 (bonus +5%)
  - Mayoría estables:    1.00 (sin cambio)
  - Algunas deteriorando: 0.95 (penalización -5%)
  - Mayoría deteriorando: 0.90 (penalización -10%)
  - Crítico:             0.80 (penalización -20%)
```

Esto significa que una empresa con buenos números actuales pero tendencias negativas verá su score reducido, y viceversa.

---

## 🗄️ BASE DE DATOS

Todas las tablas usan prefijo cs_ (credit scoring). Son independientes de las tablas xending_ existentes. Sin foreign keys cruzadas.

Total estimado: 65+ tablas organizadas en:
- Data Layer: cs_applications, cs_api_calls, cs_api_cache
- Engine Results: ~40 tablas (cada engine tiene 3-5 tablas)
- Trend Analysis: cs_trend_timeseries, cs_trend_results, cs_trend_ai_narrative, cs_trend_charts_config
- Decision Layer: ~15 tablas
- Metadata: cs_metric_catalog, cs_metric_values, cs_scoring_versions, cs_audit_log

---

## 🚀 FASES DE IMPLEMENTACIÓN

### Fase 1: Core Engines + Trend Utils
- trendUtils library (interfaz TrendResult, funciones de análisis, clasificación, proyección)
- Compliance Engine (Scory)
- SAT/Facturación Engine (Syntage) — con revenue quality, payment behavior y tendencias
- Buró Engine (Syntage) — con detección de rotación de deuda, Hawk checks y tendencias
- Documentation Engine
- Financial Engine — con balance sheet, income statement detallado y tendencias

### Fase 2: Advanced Analysis + Trend Graphs
- CashFlow Engine (con tendencias DSCR, FCF)
- Working Capital Engine (CCC, aging, eficiencia cobranza, tendencias)
- Business Stability Engine (con tendencias de volatilidad)
- Network Engine — con gobierno, instituciones financieras, productos, tendencias HHI
- Guarantee Engine
- FX Risk Engine
- Employee Engine (headcount, productividad, nómina, tendencias)

### Fase 3: Decision Layer + AI Trend Narrative
- AI Risk Engine (con consolidación de tendencias y narrativa AI)
- Credit Limit Engine
- Risk Matrix Engine (con factor de tendencia en score)
- Review Frequency Engine
- Policy Engine

### Fase 4: Portfolio, Fraud, Cross-Validation & Dashboard
- Portfolio Engine
- Graph Fraud Engine
- Scenario Engine
- Covenant Engine
- Syntage Financial Ratios Cross-Validation
- Dashboard de tendencias con gráficos interactivos (Recharts + brand colors)

---

## 💰 ROI ESPERADO

- Tiempo de análisis: de 3-5 días a 2-4 horas
- Consistencia: 100% de solicitudes evaluadas con mismos criterios
- Detección de fraude: Automática con Graph Fraud + 20 cruces
- Detección de rotación de deuda: Automática con Buró Engine enriquecido
- Detección temprana de deterioro: Análisis de tendencias con proyección de cruce de umbrales críticos
- Escalabilidad: De 10 solicitudes/mes a 100+ sin aumentar personal
- Compliance: Auditoría completa, retención 10 años, trazabilidad total
- Morosidad esperada: Reducción significativa por análisis profundo de capacidad de pago real + tendencias
- Narrativa AI: Resumen ejecutivo automático que identifica riesgos ocultos en las tendencias

---

Documento generado para presentación a socios e inversionistas de Xending Capital.
Sistema diseñado para operar créditos empresariales en MXN y USD con integración T7x.
