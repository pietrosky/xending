# M03a — Data Source: SAT (vía Syntage)

## Resumen
Datos del SAT extraídos automáticamente vía Syntage API. Incluye facturas (CFDIs), declaraciones fiscales, constancia de situación fiscal, opinión de cumplimiento, contabilidad electrónica, y nómina. Es la fuente de datos más rica del sistema.

## Estado: CONSTRUIDO

## Provider: Syntage
## Dependencias: Syntage API key + CIEC del solicitante

---

## Datos que extrae

| Dato | Endpoint Syntage | Engines que lo usan |
|------|-----------------|---------------------|
| Facturas emitidas (tipo I) | GET /entities/{id}/invoices | sat_facturacion, network, cashflow, employee, fx_risk, graph_fraud, compliance |
| Facturas recibidas | GET /entities/{id}/invoices | sat_facturacion, network |
| Nómina (tipo N) | GET /entities/{id}/invoices | employee |
| Pagos (tipo P) | GET /entities/{id}/invoices/payments | cashflow, working_capital |
| Notas de crédito | GET /invoices/credit-notes | sat_facturacion, cashflow |
| Retenciones | GET /entities/{id}/tax-retentions | financial, compliance |
| Declaraciones anuales/mensuales | GET /entities/{id}/tax-returns | financial, cashflow, employee, benchmark, compliance |
| Datos extraídos de declaraciones | GET /tax-returns/{id}/data | financial (balance, estado de resultados) |
| Constancia situación fiscal | GET /entities/{id}/tax-status | compliance, stability, sat_facturacion |
| Opinión de cumplimiento | GET /entities/{id}/tax-compliance-checks | compliance, sat_facturacion |
| Contabilidad electrónica | GET /entities/{id}/electronic-accounting-records | financial, working_capital |
| Insights procesados | GET /entities/{id}/insights | Todos (métricas pre-calculadas por Syntage) |

---

## Engines que habilita

| Engine | Peso base | Qué usa del SAT |
|--------|-----------|-----------------|
| sat_facturacion | 14% | Facturas emitidas/recibidas, cancelaciones, tendencia |
| network | 8% | Contrapartes (clientes/proveedores), concentración HHI |
| stability | 9% | Volatilidad de facturación mensual, estacionalidad |
| employee | 3% | CFDIs de nómina (tipo N) para headcount |
| fx_risk | 7% | Facturas en moneda extranjera |
| cashflow | 16% | Facturas + pagos + declaraciones para flujo real |
| financial | 11% | Declaraciones anuales, balanza de comprobación |
| working_capital | 4% | Pagos, días de cobro, ciclo de conversión |

---

## Cruces que habilita

01, 03, 06, 08, 11, 14, 16 (y parcialmente 01, 02, 05, 09, 13, 15 si también hay M03c)

---

## Flujo de extracción

```
1. Solicitante ingresa CIEC en portal (etapa sat_linkage)
2. syntageOrchestrator crea entidad en Syntage
3. syntageOrchestrator crea credencial CIEC
4. syntageOrchestrator inicia extracciones (invoice, tax_return, tax_status, etc.)
5. Polling hasta que todas terminen
6. Datos se guardan en cs_provider_data (compartidos por empresa)
7. Engines consumen datos de cs_provider_data
```

---

## Archivos existentes

```
api/syntageClient.ts         — Cliente HTTP base
api/syntageManagement.ts     — Entidades, credenciales, extracciones
api/syntageInvoices.ts       — Facturas, pagos, notas de crédito
api/syntageFiscal.ts         — Declaraciones, constancia, opinión
api/syntageInsights.ts       — Métricas pre-calculadas
api/syntageRegistry.ts       — Registro Público, accionistas
api/syntageBuro.ts           — Buró de Crédito
api/syntageChecks.ts         — Hawk Checks (legales, sanciones)
services/syntageOrchestrator.ts — Orquestador del flujo completo
```
