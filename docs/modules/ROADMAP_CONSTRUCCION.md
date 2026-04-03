# Roadmap de Construcción — Xending Capital
## Basado en scope 202604

Dos fases de entrega. La Fase 1 permite operar con clientes reales (compra/venta de divisas client-funded + compliance mínimo). La Fase 2 agrega los módulos completos que en Fase 1 se sustituyen con datos manuales del usuario/admin.

---

## FASE 1 — OPERACIÓN INMEDIATA (MVP operativo)

Objetivo: poder recibir un cliente, darlo de alta, operar compra/venta de divisas con fondeo previo (Ruta A client-funded), generar contratos/PDFs, y tener el front de PLD aunque la validación sea manual.

### Orden de construcción y dependencias

```
Paso 1: Infraestructura base
  I01 → I02 → I03 → I06 → I05

Paso 2: Alta de clientes + operaciones
  M01(lite) → M12 → M15

Paso 3: Compliance front
  M06(manual) → M07(manual) → M08(manual) → M09

Paso 4: Contratos y cierre
  M05 → M17
```

### Paso 1 — Infraestructura base

| # | Módulo | Qué construir | Notas |
|---|--------|---------------|-------|
| 1 | I01 Data Layer | Tablas cs_companies, cs_company_contacts, cs_provider_data, cs_data_extractions | Sin esto no hay datos. Es la base de todo |
| 2 | I02 Module Registry | Tablas cs_modules, cs_tenant_modules, cs_module_config. Seed de módulos Fase 1 | Permite configurar qué está activo por tenant |
| 3 | I03 Event Bus | Tabla cs_platform_events + lógica de emit/listen básica (polling) | Comunicación entre módulos. Fase 1 con polling simple |
| 4 | I06 API Layer | Estructura de Supabase Edge Functions + endpoints de companies y portfolio | Punto de entrada para el frontend |
| 5 | I05 Scheduled Events | Tabla cs_scheduled_events + cron diario básico | Alertas de vencimiento y re-checks PLD |

### Paso 2 — Alta de clientes y operaciones

| # | Módulo | Qué construir | Sustituciones manuales en Fase 1 |
|---|--------|---------------|----------------------------------|
| 6 | M01 Onboarding (lite) | Formulario simplificado: nombre, RFC, giro, email, datos de contacto. Sin pre-filtro automático, sin scoring | El admin da de alta al cliente directamente. No hay landing pública ni pre-filtro por ventas. El admin ingresa los datos básicos y crea la empresa + línea de servicio |
| 7 | M12 Portfolio Manager | Core completo: cs_credit_products (seed FX Financing), cs_credit_lines (tipo service), cs_credit_operations (Ruta A client-funded). Flujo: pactar → pending_client_funding → client_funded → executed → completed | Este es el módulo más importante. Solo Ruta A (client-funded). Sin Ruta B ni C por ahora. Sin moratorios (todo es intradía funded). Sin renovación anual (no hay líneas authorized aún) |
| 8 | M15 FX | Cotizador USD/MXN, TC pactado, cálculo de fx_payment_amount. Reutilizar lo que ya está construido del proyecto fx-pdf-generator | Solo producto FX Financing (tasa 0%, ganancia por spread). Sin Direct Lending por ahora |

### Paso 3 — Compliance (front con validación manual)

| # | Módulo | Qué construir | Sustituciones manuales en Fase 1 |
|---|--------|---------------|----------------------------------|
| 9 | M06 KYB (manual) | Pantalla donde el admin registra resultado de verificación KYB. Campos: RFC válido (sí/no), domicilio verificado (sí/no), accionistas identificados (sí/no), notas, resultado general (pass/warning/fail) | Sin integración Scory. El admin verifica manualmente y captura el resultado en el sistema. Sin Agentic AI |
| 10 | M07 Listas Negras (manual) | Pantalla donde el admin registra resultado de verificación contra listas. Campos: checklist de listas verificadas (69B, OFAC, PEPs, etc.), resultado por lista, resultado general (clear/alert/blocked), evidencia/notas | Sin integración Scory ni Syntage Hawk. El admin consulta las listas manualmente (portales SAT, OFAC website, etc.) y captura resultados |
| 11 | M08 PLD Monitoring (manual) | Dashboard de monitoreo: lista de clientes activos con fecha de último check, alerta cuando un cliente supera umbral de operación acumulada (configurable), registro de operaciones inusuales con campos: cliente, monto, motivo, fecha detección | Sin re-checks automáticos. El admin revisa periódicamente y registra hallazgos. El sistema solo alerta por umbral de monto acumulado |
| 12 | M09 Compliance Officer | Dashboard: alertas activas, clientes pendientes de revisión, workflow de revisión (aprobar/escalar/bloquear con justificación), historial por empresa. Exportación básica de reportes (CSV/PDF) | Sin generación automática de reportes regulatorios (UIF, CNBV). El compliance officer llena los reportes manualmente pero tiene los datos organizados en el sistema |

### Paso 4 — Contratos y autorizaciones

| # | Módulo | Qué construir | Sustituciones manuales en Fase 1 |
|---|--------|---------------|----------------------------------|
| 13 | M05 Contratos | Templates de contrato para operación FX client-funded. Generación de PDF con datos de la operación (monto, TC, cuenta destino, fecha). Envío por email | Sin DocuSign. El PDF se genera y se envía por email. La firma es implícita (el cliente fondea = acepta). Para operaciones intradía client-funded no se necesita firma formal |
| 14 | M17 Comité y Facultades | Estructura básica de cs_authorization_requests y cs_authorization_votes. No se usa activamente en Fase 1 porque Ruta A no requiere autorización | Se construye la estructura para que esté lista cuando se habilite Ruta B/C en Fase 2. En Fase 1 todas las operaciones son client-funded y no pasan por autorización |

### Resumen Fase 1

```
Total módulos: 14 (5 infra + 9 negocio)
Integraciones externas: NINGUNA (todo manual o con datos del admin)
Producto activo: FX Financing client-funded (Ruta A)
Tipo de línea: Service (sin estudio de crédito)
PLD: Front completo, validación manual
Contratos: PDF generado, sin DocuSign
Autorizaciones: Estructura lista, no activa
```

---

## FASE 2 — SEGUNDO HITO (automatización + crédito real)

Objetivo: sustituir los procesos manuales de Fase 1 con integraciones reales, habilitar líneas autorizadas (con estudio de crédito), y activar Ruta B/C.

### Módulos que se agregan o completan

| # | Módulo | Qué cambia vs Fase 1 | Dependencias |
|---|--------|----------------------|--------------|
| 1 | M01 Onboarding (completo) | Landing pública, pre-filtro automático por ventas, routing (approved/review/rejected), tokens de acceso, email automático | I01, M02 |
| 2 | M02 Expediente Digital | State machine completa: pre_filter → buro_authorization → sat_linkage → analysis → documentation_and_kyb → committee → approved/rejected. Tokens, portal de seguimiento | I01, I03 |
| 3 | M03 Scoring Framework | 16 engines + 20 cruces + pesos dinámicos. Refactor para modularidad (engine registry dinámico, pesos por tenant) | M02, M03a-e |
| 4 | M03a Data Source SAT | Integración Syntage: extracción de facturas, declaraciones, constancia fiscal vía CIEC | Syntage API |
| 5 | M03b Data Source Buró | Integración Syntage: consulta Buró con autorización firmada | Syntage API |
| 6 | M03c Data Source Financieros | Upload y parsing de estados financieros (PDF/Excel) | I01 |
| 7 | M03d Data Source Compliance | Integración Syntage Hawk Checks + Scory PLD | Syntage + Scory APIs |
| 8 | M03e Data Source Registro Público | Integración Syntage: accionistas, RUG, incidencias legales | Syntage API |
| 9 | M04 Decision Engines | 8 engines de decisión: AI Risk, Credit Limit, Risk Matrix, Scenarios, Covenants, Review Frequency, Policy, Decision Workflow | M03 |
| 10 | M06 KYB (Scory) | Integración real con Scory API. Verificación automática de RFC, domicilio, accionistas. Agentic AI para investigación | Scory API |
| 11 | M07 Listas Negras (automático) | Integración Scory + Syntage Hawk. Verificación automática contra 30+ listas. Rechazo automático en listas críticas | Scory + Syntage APIs |
| 12 | M08 PLD Monitoring (automático) | Re-checks automáticos según frecuencia configurable (diario/semanal/mensual). Scheduling vía I05 | I05, M07 |
| 13 | M09 Compliance Officer (completo) | Generación automática de reportes regulatorios (UIF, CNBV, CONDUSEF). AI para resúmenes y sugerencias | M08 |
| 14 | M05 Contratos (DocuSign) | Integración DocuSign para firma digital. Webhook de confirmación. Flujo completo de firma → liberación | DocuSign API |
| 15 | M12 Portfolio Manager (completo) | Ruta B (credit con liberación automática) + Ruta C (crédito anticipado con autorización). Moratorios, renovación anual, clasificación de cartera regulatoria, Direct Lending (tasa 40%) | M17, M05, I05 |
| 16 | M17 Comité y Facultades (activo) | Flujo completo: email a socios, votación vía link/token, quórum automático, timeout configurable | I03 |
| 17 | M16 Banking | Conciliación de pagos. Empezar con upload manual de estado de cuenta (CSV), cruce automático con operaciones activas | M12 |
| 18 | M13 Covenant Tracking | Monitoreo de covenants post-aprobación. Alertas por violación | M12, I05 |

### Módulos que se pueden mover entre fases

Los siguientes módulos están en Fase 2 pero podrían adelantarse o posponerse según necesidad:

```
ADELANTAR a Fase 1 si hay urgencia:
  M16 Banking (upload CSV) → si necesitan conciliar pagos desde el inicio
  M17 Comité activo       → si hay operaciones que requieran autorización de socios

POSPONER a Fase 3 si no hay presión:
  M03e Registro Público   → datos de accionistas se pueden capturar manualmente
  M13 Covenant Tracking   → monitoreo de covenants se puede hacer en Excel
  M04 Scenarios           → stress testing no es crítico para operar
  M14 AI Agent            → no está en scope, se agrega cuando haya volumen
```

---

## Mapa de sustituciones: Manual (Fase 1) → Automático (Fase 2)

| Proceso | Fase 1 (manual) | Fase 2 (automático) |
|---------|-----------------|---------------------|
| Alta de cliente | Admin captura datos en formulario interno | Landing pública con pre-filtro automático |
| Verificación KYB | Admin verifica manualmente y captura resultado | Scory API verifica automáticamente |
| Listas negras | Admin consulta portales (SAT, OFAC) y captura resultado | Scory + Syntage Hawk verifican 30+ listas automáticamente |
| Monitoreo PLD | Admin revisa periódicamente, sistema alerta por umbral | Re-checks automáticos con scheduling configurable |
| Reportes regulatorios | Compliance officer llena manualmente con datos del sistema | Generación automática en formatos regulatorios |
| Scoring crediticio | No aplica (solo líneas de servicio) | 16 engines + 20 cruces automáticos |
| Decisión de crédito | No aplica (solo client-funded) | 8 engines de decisión + comité |
| Contratos | PDF generado, sin firma digital | DocuSign con webhook de confirmación |
| Conciliación de pagos | Admin confirma manualmente en el sistema | Upload CSV o API bancaria con cruce automático |
| Autorización de socios | No aplica (Ruta A no requiere) | Email + votación vía link + quórum automático |
| Datos SAT | No aplica | Syntage extrae 3 años de historia automáticamente |
| Datos Buró | No aplica | Syntage consulta con autorización firmada |
