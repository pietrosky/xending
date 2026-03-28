# I03 — Event Bus

## Resumen
Sistema de comunicación entre módulos vía eventos. Ningún módulo llama directamente a otro. Cuando algo pasa en un módulo, emite un evento. Los módulos interesados escuchan y reaccionan.

## Estado: POR CONSTRUIR

## Tipo: Infraestructura (siempre activa)

---

## Concepto

```
M01 Onboarding emite: "pre_filter_approved"
         │
         ▼
Event Bus distribuye a módulos suscritos:
  → M06 KYB escucha y arranca verificación
  → Email Service escucha y envía correo al solicitante
  → Dashboard interno escucha y actualiza lista
```

---

## Tabla

```sql
CREATE TABLE cs_platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'xending',
  event_type TEXT NOT NULL,
  source_module TEXT NOT NULL,       -- 'M01', 'M02', etc.
  entity_type TEXT,                  -- 'expediente', 'company', 'credit'
  entity_id UUID,                    -- ID de la entidad afectada
  payload JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Eventos principales

| Evento | Emisor | Listeners |
|--------|--------|-----------|
| onboarding_submitted | M01 | M02 |
| pre_filter_approved | M01 | M06, Email |
| pre_filter_review | M01 | Notificaciones |
| pre_filter_rejected | M01 | CRM |
| kyb_passed | M06 | M07 |
| kyb_failed | M06 | M02 (reject) |
| blacklist_clear | M07 | M02 (advance) |
| blacklist_blocked | M07 | M02 (reject), M09 |
| buro_completed | M02 | M03 |
| extraction_completed | M02 | M03 |
| scoring_completed | M03 | M04 |
| decision_approved | M04 | M05, M12, M08 |
| decision_rejected | M04 | M02, Email |
| covenant_violation | M13 | M12, Notificaciones |
| pld_alert | M08 | M09, M12 |
| document_uploaded | M02 | M03 (re-score si aplica) |

---

## Implementación

Fase 1 (ahora): Tabla de eventos + polling simple. Los módulos escriben eventos y otros los leen.

Fase 2 (futuro): Supabase Realtime para eventos en tiempo real. Los módulos se suscriben a canales.

Fase 3 (futuro SaaS): Message queue dedicado (ej: Redis Streams) para alto volumen.
