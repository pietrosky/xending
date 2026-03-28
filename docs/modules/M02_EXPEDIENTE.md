# M02 — Expediente Digital

## Resumen
Sistema de gestión del ciclo de vida completo de una solicitud de crédito. Desde el pre-filtro hasta la decisión final. Incluye state machine, tokens de acceso para el solicitante (sin login), portal de seguimiento en tiempo real, y audit log inmutable.

## Estado: CONSTRUIDO (migración 030)

## Dependencias
- I01 Data Layer (cs_companies)
- M01 Onboarding (crea el expediente)

---

## State Machine

```
pre_filter → pld_check → buro_authorization → sat_linkage
→ analysis → documentation → decision → approved / rejected

Cualquier etapa puede ir a 'rejected' o 'expired'.
'expired' puede reactivarse a 'pre_filter'.
'manual_review' es estado especial del onboarding (review del pre-filtro).
```

### Etapas

| Etapa | Descripción | Qué pasa | Token requerido |
|-------|-------------|----------|-----------------|
| pre_filter | Datos mínimos + validaciones automáticas | Pre-filtro comercial evalúa elegibilidad | No |
| pld_check | Verificación PLD/KYC rápida | Scory valida listas negras, PEPs, 69B | No |
| buro_authorization | Firma de autorización Buró | Solicitante firma vía link | buro_signature |
| sat_linkage | Vinculación CIEC del SAT | Solicitante ingresa CIEC vía Syntage | ciec_linkage |
| analysis | Ejecución de scoring engines | 16 engines corren sobre datos reales | No |
| documentation | Subida de documentos complementarios | Acta, estados financieros, etc. | document_upload |
| decision | Decisión final | Automática por score o escalada a comité | No |
| approved | Crédito aprobado | Se procede a formalización | No |
| rejected | Solicitud rechazada | En cualquier etapa | No |
| expired | Expirada por inactividad | Puede reactivarse | No |
| manual_review | Revisión manual (del pre-filtro) | Analista revisa caso borderline | No |

### Transiciones válidas

```
pre_filter       → pld_check, manual_review, rejected
manual_review    → pld_check, rejected
pld_check        → buro_authorization, rejected
buro_authorization → sat_linkage, rejected
sat_linkage      → analysis, rejected, expired
analysis         → documentation, rejected
documentation    → decision, rejected, expired
decision         → approved, rejected
approved         → (final)
rejected         → (final)
expired          → pre_filter (reactivación)
```

---

## Tokens de acceso

El solicitante no tiene login. Accede al portal vía links únicos con token UUID.

| Propósito | Cuándo se genera | Vigencia | Qué permite |
|-----------|-----------------|----------|-------------|
| buro_signature | Al entrar a buro_authorization | 72 horas | Firmar autorización de Buró |
| ciec_linkage | Al entrar a sat_linkage | 72 horas | Ingresar CIEC del SAT |
| document_upload | Al entrar a documentation | 72 horas | Subir documentos |
| general_access | Cuando se necesite | 72 horas | Ver estado del expediente |

Si el token expira sin usarse, el expediente pasa a 'expired'. Se puede reactivar generando nuevo token.

---

## Portal del solicitante (vía token)

El solicitante accede a `/expediente/{token}` y ve:

1. Barra de progreso con etapa actual
2. Información de su solicitud (folio, empresa, monto)
3. Acción requerida según la etapa:
   - buro_authorization: formulario de firma
   - sat_linkage: formulario de CIEC
   - documentation: upload de archivos
4. Historial de eventos (timeline)
5. Mensajes del analista (si aplica)

---

## Folio automático

Formato: `XND-YYYY-NNNNN`
Ejemplo: `XND-2026-00042`

Se genera automáticamente con trigger en PostgreSQL al insertar en cs_expedientes.

---

## Tablas

### cs_expedientes (principal)
```
id, folio, rfc, company_name, requested_amount, currency,
credit_purpose, declared_annual_revenue, declared_business_age,
term_days, stage, rejection_reason, rejected_at_stage,
contact_email, contact_phone, legal_representative,
syntage_entity_id, application_id, pre_filter_score,
buro_score, pld_score, metadata, created_at, updated_at
```

Campos a agregar para M01:
- `company_id` (FK → cs_companies)
- `declared_monthly_sales_mxn`
- `business_activity`
- `pre_filter_result` (approved/review/rejected)
- `minimum_required_sales_mxn`
- `coverage_ratio`
- `source` (digital_onboarding, internal, referral)
- `tenant_id` (default 'xending')

### cs_expediente_tokens
```
id, expediente_id, token (UUID), purpose, expires_at,
is_used, access_count, last_accessed_at, created_at
```

### cs_expediente_events (audit log inmutable)
```
id, expediente_id, event_type, stage, description,
data (JSONB), actor, created_at
```

### cs_business_rules (reglas configurables)
```
id, rule_key, rule_value (JSONB), description,
updated_by, updated_at
```

---

## Eventos que emite

| Evento | Cuándo |
|--------|--------|
| stage_changed | Cada cambio de etapa |
| pre_filter_passed / pre_filter_rejected | Resultado del pre-filtro |
| pld_check_passed / pld_check_failed | Resultado PLD |
| buro_link_sent | Se envió link de firma Buró |
| buro_signed | Solicitante firmó |
| buro_score_received | Score de Buró recibido |
| ciec_link_sent | Se envió link de CIEC |
| ciec_connected | CIEC conectada exitosamente |
| extraction_started / extraction_completed | Extracción Syntage |
| analysis_started / analysis_completed | Scoring engines |
| document_uploaded / documentation_complete | Documentos |
| decision_auto_approved / decision_sent_to_committee | Decisión |
| decision_approved / decision_rejected | Resultado final |
| token_generated / token_expired | Tokens |
| reminder_sent | Recordatorio enviado |

---

## Archivos existentes

- `credit-scoring/supabase/migrations/030_cs_expedientes.sql`
- `credit-scoring/src/features/credit-scoring/types/expediente.types.ts`
- `credit-scoring/src/features/credit-scoring/lib/expedienteStateMachine.ts`
- `credit-scoring/src/features/credit-scoring/services/tokenService.ts`
- `credit-scoring/src/features/credit-scoring/services/emailService.ts`
- `credit-scoring/src/features/credit-scoring/services/syntageOrchestrator.ts`
