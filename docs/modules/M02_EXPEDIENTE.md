# M02 — Expediente Digital

## Resumen
Ciclo de vida completo de una solicitud de crédito. Desde el pre-filtro hasta la aprobación por comité. Incluye state machine, tokens de acceso para el solicitante (sin login), portal de seguimiento en tiempo real, y audit log inmutable.

## Estado: CONSTRUIDO (migración 030, ajustes pendientes)

---

## State machine (corregida)

```
pre_filter → buro_authorization → sat_linkage → analysis
→ documentation_and_kyb → committee → approved / rejected

Estados adicionales:
  manual_review   (pre-filtro borderline)
  expired         (token venció, puede reactivarse)
```

### Transiciones válidas

```
pre_filter           → buro_authorization, manual_review, rejected
manual_review        → buro_authorization, rejected
buro_authorization   → sat_linkage, rejected
sat_linkage          → analysis, rejected, expired
analysis             → documentation_and_kyb, rejected
documentation_and_kyb → committee, rejected
committee            → approved, rejected
approved             → (final)
rejected             → (final)
expired              → pre_filter (reactivación)
```

### Qué pasa en cada etapa

| Etapa | Qué pasa | Quién actúa |
|-------|----------|-------------|
| pre_filter | Pre-filtro comercial (ventas mensuales vs línea deseada) | Sistema |
| buro_authorization | Solicitante firma autorización Buró vía link. Se consulta Buró | Solicitante |
| sat_linkage | Solicitante ingresa CIEC. Syntage extrae datos SAT | Solicitante |
| analysis | 16 engines + 20 cruces corren sobre datos reales | Sistema |
| documentation_and_kyb | Solicitante sube financieros + docs. Scory KYB + listas negras. Score se recalcula | Solicitante + Sistema |
| committee | Comité de socios vota via M17 Facultades | Socios |
| approved | Línea aprobada. Se generan contratos | Sistema + Admin |
| rejected | Rechazado. Se guarda motivo y etapa | Sistema o Comité |

---

## Tokens de acceso

El solicitante accede al portal vía links únicos con token UUID. No necesita login.

| Propósito | Cuándo | Vigencia |
|-----------|--------|----------|
| buro_signature | Al entrar a buro_authorization | 72 horas |
| ciec_linkage | Al entrar a sat_linkage | 72 horas |
| document_upload | Al entrar a documentation_and_kyb | 72 horas |
| general_access | Cuando se necesite | 72 horas |

---

## Campos a agregar a cs_expedientes

```
company_id uuid fk → cs_companies
declared_monthly_sales_mxn numeric(15,2)
business_activity text
pre_filter_result text (approved, review, rejected)
minimum_required_sales_mxn numeric(15,2)
coverage_ratio numeric(5,4)
source text (digital_onboarding, internal, referral)
tenant_id text default 'xending'
```

---

## Archivos existentes

```
supabase/migrations/030_cs_expedientes.sql
src/features/credit-scoring/types/expediente.types.ts
src/features/credit-scoring/lib/expedienteStateMachine.ts
src/features/credit-scoring/services/tokenService.ts
src/features/credit-scoring/services/emailService.ts
src/features/credit-scoring/services/syntageOrchestrator.ts
```
