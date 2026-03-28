# M03c — Data Source: Financieros Manuales

## Resumen
Permite que el solicitante o analista suba estados financieros en PDF o Excel. AI extrae los datos y los normaliza a un schema financiero estándar. Si el tenant también tiene M03a (SAT), se comparan ambas fuentes para detectar discrepancias.

## Estado: POR CONSTRUIR

## Dependencias: AI (OpenAI para OCR/parsing)

---

## Concepto

Hoy los engines financial, cashflow y working_capital consumen datos de Syntage (declaraciones anuales, balanza de comprobación). Pero muchas SOFOMs reciben estados financieros directamente del cliente en PDF o Excel.

M03c agrega una fuente alternativa/complementaria:

```
Escenario 1: Solo SAT (M03a)
  → Engines consumen datos de Syntage
  → Automático, sin intervención del cliente

Escenario 2: Solo Financieros Manuales (M03c)
  → Cliente sube PDF/Excel
  → AI extrae datos al schema estándar
  → Engines consumen datos manuales
  → Score se marca como "basado en información declarada"

Escenario 3: SAT + Financieros Manuales (M03a + M03c)
  → Ambas fuentes disponibles
  → Engines comparan SAT vs manual
  → cross01 detecta discrepancias
  → Score más robusto
```

---

## Schema financiero estándar (a construir)

### Balance General
```
activo_circulante
  caja_y_bancos
  cuentas_por_cobrar
  inventarios
  otros_activos_circulantes
activo_fijo
  propiedades_planta_equipo
  depreciacion_acumulada
  activo_fijo_neto
activo_total

pasivo_corto_plazo
  proveedores
  creditos_bancarios_cp
  otros_pasivos_cp
pasivo_largo_plazo
  creditos_bancarios_lp
  otros_pasivos_lp
pasivo_total

capital_contable
  capital_social
  utilidades_retenidas
  resultado_del_ejercicio
capital_total
```

### Estado de Resultados
```
ingresos_netos
costo_de_ventas
utilidad_bruta
gastos_de_operacion
  gastos_de_venta
  gastos_de_administracion
utilidad_operativa (EBIT)
depreciacion_amortizacion
ebitda
gastos_financieros
otros_ingresos_gastos
utilidad_antes_de_impuestos
impuestos
utilidad_neta
```

### Flujo de Efectivo
```
flujo_operativo
flujo_de_inversion
flujo_de_financiamiento
flujo_neto
saldo_inicial
saldo_final
```

---

## Ingesta

### PDF
1. Cliente sube PDF de estados financieros
2. AI (GPT-4 Vision o similar) extrae datos
3. Se mapean al schema estándar
4. Analista revisa y confirma (o corrige)
5. Datos se guardan en cs_provider_data

### Excel
1. Cliente sube Excel
2. Parser identifica columnas y mapea al schema
3. Si no puede mapear automáticamente, muestra UI para mapeo manual
4. Datos se guardan en cs_provider_data

### Captura manual
1. Formulario web con los campos del schema
2. El analista o cliente llena directamente
3. Datos se guardan en cs_provider_data

---

## Engines que habilita

| Engine | Peso base | Qué usa |
|--------|-----------|---------|
| financial | 11% | Balance, estado de resultados, razones financieras |
| cashflow | 16% | Flujo de efectivo, EBITDA, DSCR |
| working_capital | 4% | Cuentas por cobrar/pagar, ciclo de conversión |

---

## Tablas futuras

```
cs_financial_uploads     — Archivos subidos (PDF/Excel)
cs_financial_extractions — Datos extraídos por AI
cs_financial_schemas     — Datos normalizados al schema estándar
```
