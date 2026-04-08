# M02 — Expediente Digital: Documento de Requerimientos

## 1. Objetivo

Implementar el ciclo de vida completo de una solicitud de crédito Xending, desde la captura inicial (pre-filtro) hasta la decisión final (aprobación/rechazo por comité). El sistema debe operar con tokens de acceso sin login para el solicitante, audit log inmutable, y portal de seguimiento en tiempo real.

---

## 2. Estado Actual del Código

### 2.1 Archivos existentes

| Archivo | Estado | Notas |
|---------|--------|-------|
| `supabase/migrations/030_cs_expedientes.sql` | ✅ Completo | 4 tablas, vista dashboard, triggers, reglas de negocio |
| `types/expediente.types.ts` | ✅ Completo | Tipos, interfaces, business rules defaults |
| `lib/expedienteStateMachine.ts` | ✅ Completo | Transiciones, labels, progreso, tokens por etapa |
| `services/tokenService.ts` | ⚠️ In-memory | CRUD funcional pero usa Map, no Supabase |
| `services/emailService.ts` | ⚠️ Mock | Templates HTML listos, envío simulado (console.log) |
| `services/expedienteService.ts` | ⚠️ In-memory | Lógica completa pero usa Map, no Supabase |
| `services/syntageOrchestrator.ts` | ✅ Funcional | Orquesta entidad → credencial → buró → extracciones |
| `components/NewApplicationForm.tsx` | ✅ Funcional | Formulario de captura con validación |

### 2.2 Divergencias entre doc M02 y código

| Aspecto | Doc M02 | Código actual | Decisión |
|---------|---------|---------------|----------|
| Estado post pre-filtro | `buro_authorization` | `pld_check` | **Código correcto** — PLD va antes de Buró |
| Estado `manual_review` | Existe | No existe | Pendiente de evaluar necesidad |
| Estado `documentation_and_kyb` | Existe | `documentation` | **Código correcto** — KYB es parte de documentation |
| Estado `committee` | Existe | `decision` | **Código correcto** — decision engloba auto + comité |
| Campos extra (company_id, source, tenant_id) | Listados | No en migración | **Pendiente** — agregar en migración incremental |

---

## 3. Requerimientos Funcionales

### RF-01: Pre-filtro automático
- **Descripción:** Validar datos mínimos del solicitante contra reglas de negocio configurables.
- **Input:** `PreFilterInput` (RFC, empresa, monto, moneda, propósito, ventas anuales, antigüedad, plazo, contacto).
- **Reglas:** Monto entre $100K-$1M USD, ventas ≥ 10x monto, antigüedad ≥ 2 años, propósito válido, plazo 2-90 días.
- **Output:** Score 0-100, lista de reglas evaluadas, resultado (passed/rejected).
- **Acción al pasar:** Crear expediente, generar folio XND-YYYY-NNNNN, avanzar a `pld_check`.
- **Acción al rechazar:** Crear expediente con stage `rejected`, registrar motivo.
- **Estado actual:** ✅ Lógica implementada en `expedienteService.createExpediente()`.
- **Pendiente:** Migrar de in-memory a Supabase.

### RF-02: Verificación PLD/KYC (Scory)
- **Descripción:** Consultar Scory para verificar listas negras, PEPs, 69-B del SAT.
- **Input:** RFC y nombre de la empresa.
- **Output:** Score PLD (0-100), alertas encontradas.
- **Acción al pasar:** Actualizar `pld_score`, avanzar a `buro_authorization`.
- **Acción al rechazar:** Rechazar expediente con motivo PLD.
- **Estado actual:** ⚠️ Tipo y transición definidos, falta integración real con API Scory.
- **Dependencia:** M06 (KYB Scory), M07 (Blacklists).

### RF-03: Autorización y consulta Buró
- **Descripción:** Enviar link al solicitante para firmar autorización de consulta Buró. Una vez firmado, consultar Buró vía Syntage.
- **Input:** Token `buro_signature` enviado por email.
- **Flujo solicitante:** Accede al link → ve formulario de autorización → firma electrónica → sistema consulta Buró.
- **Output:** Score Buró, reporte completo.
- **Acción al pasar:** Actualizar `buro_score`, avanzar a `sat_linkage`.
- **Acción al rechazar:** Si score < 600, rechazar expediente.
- **Estado actual:** ✅ Token service y orchestrator de Buró implementados. ⚠️ Falta portal del solicitante.
- **Dependencia:** Syntage API (buró), tokenService, emailService.

### RF-04: Vinculación SAT (CIEC)
- **Descripción:** Enviar link al solicitante para ingresar CIEC. Syntage extrae datos fiscales del SAT.
- **Input:** Token `ciec_linkage` enviado por email.
- **Flujo solicitante:** Accede al link → ingresa CIEC → Syntage crea credencial → inicia extracciones.
- **Output:** Datos SAT extraídos (facturas, declaraciones, opinión de cumplimiento, etc.).
- **Acción al completar:** Crear entidad Syntage, vincular `syntage_entity_id`, avanzar a `analysis`.
- **Timeout:** Si token expira (72h) sin completar → stage `expired`.
- **Estado actual:** ✅ Orchestrator completo con polling. ⚠️ Falta portal del solicitante.
- **Dependencia:** Syntage API (fiscal, invoices, registry), tokenService.

### RF-05: Análisis crediticio (engines)
- **Descripción:** Ejecutar los 16+ engines de scoring sobre datos reales del SAT y Buró.
- **Input:** Datos extraídos de Syntage + score Buró + datos del expediente.
- **Output:** Scores individuales por engine, score compuesto, cruces entre engines.
- **Acción al completar:** Crear/actualizar `cs_applications` con resultados, avanzar a `documentation`.
- **Estado actual:** ✅ Engines implementados (financial, cashflow, compliance, etc.). ⚠️ Falta orquestación automática desde expediente.
- **Dependencia:** M03 (Scoring Framework), M04 (Decision Engines).

### RF-06: Documentación y KYB
- **Descripción:** Enviar link al solicitante para subir documentos complementarios. Ejecutar KYB vía Scory.
- **Input:** Token `document_upload` enviado por email.
- **Documentos requeridos:** Acta constitutiva, estados financieros, identificación del representante legal, comprobante de domicilio.
- **Flujo solicitante:** Accede al link → sube documentos → sistema valida completitud → ejecuta KYB.
- **Acción al completar:** Recalcular score con datos de documentos, avanzar a `decision`.
- **Estado actual:** ⚠️ Transición definida, falta componente de upload y validación de documentos.
- **Dependencia:** M06 (KYB Scory), storage de archivos (Supabase Storage o S3).

### RF-07: Decisión (automática o comité)
- **Descripción:** Decisión final basada en score compuesto. Si score > umbral → aprobación automática. Si borderline → escalar a comité de socios.
- **Input:** Score compuesto, resultados de engines, documentación completa.
- **Reglas de decisión:**
  - Score ≥ 75: aprobación automática.
  - Score 50-74: escalamiento a comité (M17 Facultades).
  - Score < 50: rechazo automático.
- **Acción al aprobar:** Stage `approved`, generar contratos (M05), notificar solicitante.
- **Acción al rechazar:** Stage `rejected`, registrar motivo y etapa, notificar solicitante.
- **Estado actual:** ⚠️ Transición definida, falta lógica de decisión automática y integración con M17.
- **Dependencia:** M17 (Comité/Facultades), M05 (Contratos).

### RF-08: Tokens de acceso sin login
- **Descripción:** El solicitante accede al portal vía URLs únicas con token UUID. Sin necesidad de crear cuenta.
- **URL:** `/solicitud/{token-uuid}`
- **Vigencia:** 72 horas por defecto (configurable en `cs_business_rules`).
- **Tipos:** `buro_signature`, `ciec_linkage`, `document_upload`, `general_access`.
- **Seguridad:** Token de un solo uso por propósito, contador de accesos, expiración automática.
- **Estado actual:** ✅ Lógica completa en tokenService. ⚠️ In-memory, falta Supabase y rutas del portal.

### RF-09: Audit log inmutable
- **Descripción:** Registrar cada evento del expediente en `cs_expediente_events`. Inmutable (solo INSERT, nunca UPDATE/DELETE).
- **Campos:** tipo de evento, etapa, descripción, datos JSON, actor (system/analyst/applicant).
- **Eventos registrados:** 25+ tipos definidos en `ExpedienteEventType`.
- **Estado actual:** ✅ Tipos y lógica de creación implementados. ⚠️ In-memory.

### RF-10: Notificaciones por email
- **Descripción:** Enviar emails al solicitante en cada transición relevante.
- **Templates:**
  - Welcome (al crear expediente).
  - Token link (al generar token para cada etapa).
  - Reminder (48h antes de expiración del token).
  - Aprobación / Rechazo (decisión final).
- **Estado actual:** ✅ Templates HTML generados. ⚠️ Envío simulado (console.log), falta integración con proveedor (Resend, SES, etc.).

### RF-11: Dashboard de expedientes (admin)
- **Descripción:** Vista para analistas/admin con lista de expedientes, filtros por etapa, búsqueda por folio/RFC, conteo por etapa.
- **Funcionalidades:**
  - Lista con paginación y filtros (etapa, fecha, RFC).
  - Detalle de expediente con timeline de eventos.
  - Acciones manuales: rechazar, agregar nota, reenviar token.
  - Contadores por etapa (pipeline visual).
- **Estado actual:** ⚠️ Vista SQL `cs_expedientes_dashboard` existe. Falta componente React.

### RF-12: Portal del solicitante
- **Descripción:** Interfaz pública accesible vía token donde el solicitante completa cada etapa.
- **Vistas por propósito:**
  - `buro_signature`: formulario de autorización + firma.
  - `ciec_linkage`: formulario de CIEC + indicador de progreso de extracción.
  - `document_upload`: drag & drop de documentos + checklist de requeridos.
  - `general_access`: vista de seguimiento del expediente (etapa actual, timeline).
- **Estado actual:** ❌ No implementado.

---

## 4. Requerimientos No Funcionales

### RNF-01: Persistencia en Supabase
- Migrar todos los servicios de in-memory (Map) a queries reales contra Supabase.
- Usar `supabase-js` con tipos generados.
- Aplicar RLS (Row Level Security) para multi-tenant.

### RNF-02: Seguridad de tokens
- Tokens UUID v4 criptográficamente seguros.
- Expiración server-side (no confiar en el cliente).
- Rate limiting en validación de tokens (prevenir brute force).
- HTTPS obligatorio en producción.

### RNF-03: Idempotencia
- Crear expediente debe ser idempotente por RFC + monto + fecha (evitar duplicados).
- Transiciones de estado deben ser atómicas (transacción SQL).

### RNF-04: Observabilidad
- Logging estructurado en cada transición.
- Métricas: tiempo promedio por etapa, tasa de conversión por etapa, tasa de expiración.

### RNF-05: Configurabilidad
- Reglas de negocio en `cs_business_rules` (no hardcodeadas).
- Umbrales de decisión configurables sin deploy.

---

## 5. Dependencias entre Módulos

```
M02 Expediente
├── M01 Onboarding ........... Captura inicial del prospecto
├── M03 Scoring Framework .... Engines de análisis
│   ├── M03a SAT (Syntage) ... Datos fiscales
│   ├── M03b Buró (Syntage) .. Score crediticio
│   ├── M03c Financieros ..... Estados financieros
│   └── M03d Compliance ...... Cumplimiento regulatorio
├── M04 Decision Engines ..... Lógica de decisión
├── M05 Contratos ............ Generación post-aprobación
├── M06 KYB Scory ............ Verificación de identidad empresarial
├── M07 Blacklists ........... Listas negras PLD
├── M08 PLD Monitoring ....... Monitoreo continuo
├── M10 Portal Empresa ....... Portal del solicitante
├── M17 Comité/Facultades .... Votación de socios
├── I01 Data Layer ........... Supabase, RLS, tipos
├── I03 Event Bus ............ Eventos entre módulos
└── I05 Scheduled Events ..... Expiración, reminders
```

---

## 6. Campos Pendientes en Migración

Agregar a `cs_expedientes` en migración incremental (031+):

```sql
ALTER TABLE cs_expedientes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES cs_companies(id);
ALTER TABLE cs_expedientes ADD COLUMN IF NOT EXISTS declared_monthly_sales_mxn NUMERIC(15,2);
ALTER TABLE cs_expedientes ADD COLUMN IF NOT EXISTS business_activity TEXT;
ALTER TABLE cs_expedientes ADD COLUMN IF NOT EXISTS pre_filter_result TEXT CHECK (pre_filter_result IN ('approved', 'review', 'rejected'));
ALTER TABLE cs_expedientes ADD COLUMN IF NOT EXISTS minimum_required_sales_mxn NUMERIC(15,2);
ALTER TABLE cs_expedientes ADD COLUMN IF NOT EXISTS coverage_ratio NUMERIC(5,4);
ALTER TABLE cs_expedientes ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'digital_onboarding' CHECK (source IN ('digital_onboarding', 'internal', 'referral'));
ALTER TABLE cs_expedientes ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'xending';
```

---

## 7. Plan de Implementación Sugerido

### Fase 1 — Persistencia (fundamento)
1. Migrar `expedienteService` a Supabase (queries reales).
2. Migrar `tokenService` a Supabase.
3. Crear migración 031 con campos faltantes.
4. Generar tipos de Supabase actualizados.

### Fase 2 — Portal del solicitante
5. Crear rutas `/solicitud/{token}` con validación.
6. Implementar vista de firma Buró.
7. Implementar vista de CIEC.
8. Implementar vista de upload de documentos.
9. Implementar vista de seguimiento general.

### Fase 3 — Integraciones reales
10. Integrar Scory para PLD/KYC (RF-02).
11. Conectar orchestrator de Syntage con flujo de expediente.
12. Integrar proveedor de email (Resend/SES).
13. Implementar scheduler para expiración y reminders.

### Fase 4 — Dashboard admin
14. Componente de lista de expedientes con filtros.
15. Vista de detalle con timeline de eventos.
16. Acciones manuales (rechazar, nota, reenviar token).
17. Pipeline visual (contadores por etapa).

### Fase 5 — Decisión y cierre
18. Lógica de decisión automática (umbrales de score).
19. Integración con M17 Comité para escalamiento.
20. Integración con M05 Contratos post-aprobación.

---

## 8. Criterios de Aceptación

| ID | Criterio | Verificación |
|----|----------|-------------|
| AC-01 | Un solicitante puede completar el pre-filtro y recibir resultado inmediato | Test E2E |
| AC-02 | El solicitante recibe email con link para cada etapa que requiere su acción | Test de integración |
| AC-03 | Los tokens expiran correctamente después de 72h | Test unitario + cron |
| AC-04 | Cada transición de estado genera un evento en el audit log | Test unitario |
| AC-05 | Un expediente rechazado no puede avanzar | Test unitario (state machine) |
| AC-06 | Un expediente expirado puede reactivarse a pre_filter | Test unitario |
| AC-07 | El dashboard muestra expedientes filtrados por etapa | Test de componente |
| AC-08 | Los datos persisten en Supabase (no se pierden al recargar) | Test de integración |
| AC-09 | El portal del solicitante funciona sin login (solo token) | Test E2E |
| AC-10 | Las reglas de negocio son configurables desde cs_business_rules | Test de integración |
