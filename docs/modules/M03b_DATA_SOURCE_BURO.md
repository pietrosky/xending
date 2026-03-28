# M03b — Data Source: Buró de Crédito (vía Syntage)

## Resumen
Datos del Buró de Crédito extraídos vía Syntage API. Incluye Score PyME, créditos activos y liquidados, historial de consultas, calificación de cartera, e información comercial. Requiere autorización firmada del solicitante.

## Estado: CONSTRUIDO

## Provider: Syntage
## Dependencias: Autorización firmada del solicitante (etapa buro_authorization)

---

## Datos que extrae

| Dato | Qué contiene | Para qué sirve |
|------|-------------|----------------|
| Score PyME | Valor numérico + causas del score | Calificación crediticia principal |
| Créditos activos | Otorgante, tipo, moneda, plazo, monto, buckets de atraso, histórico de pagos | Deuda actual, comportamiento de pago, rotación de deuda |
| Créditos liquidados | Quitas, daciones, quebrantos | Historial de defaults |
| Consultas | Últimos 3/12/24/+24 meses, por tipo | Detectar búsqueda desesperada de crédito |
| Calificación cartera | Mensual histórica (vigente, vencido por buckets) | Tendencia de deterioro |
| Información comercial | Situación último mes, montos | Comportamiento comercial |

---

## Engine que habilita

| Engine | Peso base | Qué usa del Buró |
|--------|-----------|-------------------|
| buro | 10% | Score, créditos activos/liquidados, rotación de deuda, consultas, Hawk checks |

---

## Cruces que habilita

02 (DSCR vs Debt), 04 (Debt Rotation), 12 (Credit Seeking), 18 (Over-Leveraging)

---

## Flujo

```
1. Solicitante firma autorización de Buró (etapa buro_authorization, vía token)
2. syntageOrchestrator crea autorización en Syntage
3. Se inicia extracción buro_de_credito_report
4. Polling hasta completar
5. Datos se guardan en cs_provider_data
6. Engine buro consume datos
```

---

## Archivos existentes

```
api/syntageBuro.ts — Cliente para Buró (reportes, score, créditos, consultas)
engines/buro.ts    — Engine de análisis de Buró
```
