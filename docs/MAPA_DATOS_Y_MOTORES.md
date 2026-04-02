# Mapa de Datos y Motores — Xending Credit Scoring

## Cómo leer este documento

Este mapa muestra de dónde viene cada dato, cómo fluye por el sistema, qué motor lo consume, y qué resultado produce. Todo en español México para que cualquier analista pueda validar.

---

## 1. Fuentes de Datos (Data Sources)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FUENTES DE DATOS CRUDOS                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  M03a — SAT  │  │ M03b — Buró  │  │ M03c — Financieros      │  │
│  │  (Syntage)   │  │  (Syntage)   │  │  (Upload PDF/Excel)     │  │
│  │              │  │              │  │                          │  │
│  │ • Facturas   │  │ • Score PyME │  │ • Balance General       │  │
│  │ • Declarac.  │  │ • Créditos   │  │ • Estado de Resultados  │  │
│  │ • Constancia │  │ • Consultas  │  │ • Razones Financieras   │  │
│  │ • Nómina     │  │ • Hawk       │  │ • Relación Patrimonial  │  │
│  │ • Balanza    │  │              │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                 │                        │                │
│  ┌──────┴──────┐  ┌──────┴──────────────┐  ┌──────┴──────────┐    │
│  │ M03d — PLD  │  │ M03e — Reg. Público │  │ M06 — KYB       │    │
│  │  (Scory)    │  │  (Syntage)          │  │  (Scory)        │    │
│  │             │  │                     │  │                  │    │
│  │ • Listas    │  │ • Accionistas       │  │ • Verificación   │    │
│  │ • OFAC/PEPs │  │ • RUG (garantías)   │  │   identidad     │    │
│  │ • 69-B      │  │ • Incidencias       │  │   empresarial   │    │
│  └─────────────┘  └─────────────────────┘  └────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Dónde se guardan los datos crudos

Todos los datos crudos van a la tabla `cs_provider_data` del Data Layer (I01):

| Tipo de dato | Proveedor | Periodo | Ejemplo |
|---|---|---|---|
| Facturas emitidas | Syntage | Mensual | `invoices_issued / 2026-01` |
| Facturas recibidas | Syntage | Mensual | `invoices_received / 2026-01` |
| Nómina | Syntage | Mensual | `payroll_invoices / 2026-01` |
| Declaración anual | Syntage | Anual | `tax_return_annual / 2025` |
| Declaración mensual | Syntage | Mensual | `tax_return_monthly / 2026-01` |
| Constancia fiscal | Syntage | Puntual | `tax_status / 2026-03-15` |
| Opinión cumplimiento | Syntage | Puntual | `compliance_opinion / 2026-03-15` |
| Balanza comprobación | Syntage | Mensual | `electronic_accounting / 2026-01` |
| Reporte Buró | Syntage | Puntual | `buro_report / 2026-03-15` |
| Score Buró | Syntage | Puntual | `buro_score / 2026-03-15` |
| Hawk Checks | Syntage | Puntual | `hawk_checks / 2026-03-15` |
| PLD/KYC | Scory | Puntual | `pld_check / 2026-03-15` |
| Estados financieros | Manual | Trimestral | `financial_statements / 2026-Q1` |

---

## 2. Motores de Análisis (16 engines)

Cada motor lee datos crudos, calcula métricas, y produce un score de 0 a 100.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MOTORES DE ANÁLISIS                             │
│                                                                     │
│  DATOS SAT ──────────────────────────────────────────────────────  │
│  │                                                                  │
│  ├─→ Facturación SAT (14%)     Ventas, cancelaciones, DSO, DPO    │
│  ├─→ Red de Clientes (8%)      Concentración, HHI, dependencia    │
│  ├─→ Estabilidad (9%)          Volatilidad, estacionalidad        │
│  ├─→ Empleados (3%)            Headcount, productividad           │
│  └─→ Riesgo Cambiario (7%)    Descalce USD/MXN, hedge natural    │
│                                                                     │
│  DATOS BURÓ ─────────────────────────────────────────────────────  │
│  │                                                                  │
│  └─→ Buró de Crédito (10%)    Score, créditos, rotación deuda    │
│                                                                     │
│  DATOS FINANCIEROS (SAT + Manual) ───────────────────────────────  │
│  │                                                                  │
│  ├─→ Financiero (11%)          Balance, P&L, razones financieras  │
│  ├─→ Flujo de Efectivo (16%)   EBITDA, DSCR, capacidad de pago   │
│  └─→ Capital de Trabajo (4%)   CCC, días de cobro/pago, aging    │
│                                                                     │
│  DATOS COMPLIANCE ───────────────────────────────────────────────  │
│  │                                                                  │
│  └─→ Cumplimiento (GATE)       PLD, listas negras — pasa o no    │
│                                                                     │
│  DATOS REGISTRO PÚBLICO ─────────────────────────────────────────  │
│  │                                                                  │
│  └─→ Riesgo Operativo (9%)    Accionistas, RUG, legales          │
│                                                                     │
│  DATOS INTERNOS ─────────────────────────────────────────────────  │
│  │                                                                  │
│  ├─→ Documentación (4%)        Completitud de expediente          │
│  ├─→ Portafolio (5%)           Impacto en cartera Xending        │
│  ├─→ Garantías (GATE)          Cobertura 2:1, haircuts           │
│  ├─→ Fraude en Red (GATE)      Facturación circular, fachadas    │
│  └─→ Benchmark (referencia)    Comparación vs industria          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detalle por Motor — Fórmulas y Fuentes


### 3.1 Flujo de Efectivo (16% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `cashflow` |
| Fuente de datos | M03a SAT (facturas) + M03c Financieros (estados financieros) |
| Tabla cruda | `cs_provider_data` → `invoices_issued`, `financial_statements` |

Métricas principales:

| Métrica | Fórmula | Dónde buscar el dato |
|---|---|---|
| EBITDA | Utilidad Operativa + Depreciación + Amortización | Estado de Resultados |
| DSCR (Cobertura de Deuda) | EBITDA ÷ Servicio de Deuda Anual | EBITDA del P&L ÷ pagos de créditos del Buró |
| Flujo Libre | EBITDA − Impuestos − CAPEX − Cambio en Capital de Trabajo | Combinación de P&L + Balance |
| Margen EBITDA | EBITDA ÷ Ventas Netas | Estado de Resultados |

Interpretación: DSCR ≥ 1.3x = bueno. Si DSCR < 1.0x = no puede pagar sus deudas con su flujo.

---

### 3.2 Facturación SAT (14% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `sat_facturacion` |
| Fuente de datos | M03a SAT (Syntage) |
| Tabla cruda | `cs_provider_data` → `invoices_issued`, `invoices_received` |

Métricas principales:

| Métrica | Fórmula | Dónde buscar el dato |
|---|---|---|
| Ventas Netas Reales | Total Facturado − Cancelaciones − Notas de Crédito − Descuentos | Facturas emitidas (tipo I) |
| Tasa de Cancelación | Facturas Canceladas ÷ Total Facturas × 100 | Facturas con status cancelado |
| DSO (Días de Cobro) | (Cuentas por Cobrar PPD ÷ Ventas Diarias) | Facturas PPD pendientes de pago |
| DPO (Días de Pago) | (Cuentas por Pagar PPD ÷ Compras Diarias) | Facturas recibidas PPD pendientes |
| % PUE vs PPD | Facturas PUE ÷ Total × 100 | Campo paymentMethod de cada factura |
| Facturado vs Declarado | Total Facturado ÷ Ingresos Declarados | Facturas vs declaración anual |

Interpretación: Si facturado vs declarado difiere > 10% = alerta. Cancelaciones > 5% = riesgo.

---

### 3.3 Financiero (11% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `financial` |
| Fuente de datos | M03a SAT (balanza) + M03c Financieros (upload) |
| Tabla cruda | `cs_provider_data` → `electronic_accounting`, `financial_statements` |

Métricas principales:

| Métrica | Fórmula | Dónde buscar el dato |
|---|---|---|
| Razón Circulante | Activo Circulante ÷ Pasivo Circulante | Balance General |
| Apalancamiento | Pasivo Total ÷ Activo Total × 100 | Balance General |
| Margen Neto | Utilidad Neta ÷ Ventas Netas × 100 | Estado de Resultados |
| ROE | Utilidad Neta ÷ Capital Contable × 100 | P&L ÷ Balance |
| ROA | Utilidad Neta ÷ Activo Total × 100 | P&L ÷ Balance |
| Cobertura de Intereses | EBITDA ÷ Gastos Financieros | P&L |

Interpretación: Apalancamiento > 65% = riesgo alto. Razón circulante < 1.0 = problemas de liquidez.

---

### 3.4 Buró de Crédito (10% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `buro` |
| Fuente de datos | M03b Buró (Syntage) |
| Tabla cruda | `cs_provider_data` → `buro_report`, `buro_score` |

Métricas principales:

| Métrica | Fórmula | Dónde buscar el dato |
|---|---|---|
| Score PyME | Dato directo de Buró (0-999) | Reporte Buró → campo score |
| Créditos Activos | Conteo de créditos vigentes | Reporte Buró → sección créditos |
| Monto Vigente / Original | Saldo Actual ÷ Monto Original × 100 | Cada crédito activo |
| Consultas Recientes (3m) | Conteo de consultas últimos 90 días | Reporte Buró → consultas |
| Rotación de Deuda | Si tiene ≥ 4 créditos + ≥ 5 consultas en 3m + vigente/original > 90% | Combinación de métricas |

Interpretación: Score < 600 = rechazo. Rotación de deuda detectada = alerta crítica.

---

### 3.5 Estabilidad del Negocio (9% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `stability` |
| Fuente de datos | M03a SAT (Syntage) |
| Tabla cruda | `cs_provider_data` → `invoices_issued` (12-36 meses) |

Métricas principales:

| Métrica | Fórmula | Dónde buscar el dato |
|---|---|---|
| Coeficiente de Variación | Desviación Estándar de Ventas ÷ Promedio de Ventas | Ventas mensuales de facturas |
| Tendencia | Pendiente de regresión lineal sobre ventas mensuales | Serie de tiempo de ventas |
| Estacionalidad | Detección de patrones repetitivos por mes | Comparar mismos meses entre años |

Interpretación: CV > 30% = alta volatilidad. Tendencia negativa sostenida = deterioro.

---

### 3.6 Riesgo Operativo (9% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `operational` |
| Fuente de datos | M03e Registro Público (Syntage) |
| Tabla cruda | `cs_provider_data` → `hawk_checks`, insights de Syntage |

Métricas: Estructura accionaria, inscripción en RPC, garantías RUG, incidencias legales.

---

### 3.7 Red de Clientes y Proveedores (8% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `network` |
| Fuente de datos | M03a SAT (Syntage) |
| Tabla cruda | `cs_provider_data` → `invoices_issued`, `invoices_received` |

Métricas principales:

| Métrica | Fórmula | Dónde buscar el dato |
|---|---|---|
| HHI Clientes | Σ (% de cada cliente)² | Facturas emitidas agrupadas por receptor |
| HHI Proveedores | Σ (% de cada proveedor)² | Facturas recibidas agrupadas por emisor |
| Top 1 Cliente (%) | Ventas al cliente #1 ÷ Ventas Totales × 100 | Facturas emitidas |
| % Gobierno | Ventas a gobierno ÷ Ventas Totales × 100 | RFC de receptores gubernamentales |

Interpretación: HHI > 2500 = concentración alta. Top 1 > 40% = dependencia peligrosa.

---

### 3.8 Riesgo Cambiario (7% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `fx_risk` |
| Fuente de datos | M03a SAT (Syntage) |
| Tabla cruda | `cs_provider_data` → `invoices_issued`, `invoices_received` |

Métricas principales:

| Métrica | Fórmula | Dónde buscar el dato |
|---|---|---|
| % Ingresos USD | Facturas en USD ÷ Total Facturas × 100 | Campo currency de facturas emitidas |
| % Gastos USD | Facturas recibidas en USD ÷ Total × 100 | Campo currency de facturas recibidas |
| Hedge Natural | % Ingresos USD − % Gastos USD | Diferencia entre ambos |
| DSCR Estresado | DSCR recalculado con TC +10%, +20%, +30% | Escenarios sobre DSCR base |

Interpretación: Si cobra en MXN y pide crédito en USD, el descalce es alto.

---

### 3.9 Portafolio (5% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `portfolio` |
| Fuente de datos | Datos internos de Xending |

Métricas: Concentración por sector, por moneda, por grupo. Impacto de aprobar este crédito en la cartera total.

---

### 3.10 Capital de Trabajo (4% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `working_capital` |
| Fuente de datos | M03a SAT + M03c Financieros |

| Métrica | Fórmula | Dónde buscar el dato |
|---|---|---|
| CCC (Ciclo de Conversión) | DSO + DIO − DPO | Facturas + inventarios del balance |
| Capital de Trabajo | Activo Circulante − Pasivo Circulante | Balance General |

Interpretación: CCC > 60 días = necesita financiamiento del ciclo. CCC negativo = ciclo favorable.

---

### 3.11 Documentación (4% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `documentation` |
| Fuente de datos | Expediente digital (M02) |

Métricas: % de documentos entregados, vigencia, validación OCR.

---

### 3.12 Empleados (3% del score)

| Campo | Detalle |
|---|---|
| Nombre técnico | `employee` |
| Fuente de datos | M03a SAT (nómina) |
| Tabla cruda | `cs_provider_data` → `payroll_invoices` |

| Métrica | Fórmula | Dónde buscar el dato |
|---|---|---|
| Headcount | Conteo de empleados únicos por mes | CFDIs de nómina |
| Ventas por Empleado | Ventas Mensuales ÷ Headcount | Facturas ÷ nómina |
| Nómina / Ingresos | Total Nómina ÷ Ventas × 100 | Nómina vs facturas emitidas |

Interpretación: Si headcount baja pero ventas suben = eficiencia o subcontratación.

