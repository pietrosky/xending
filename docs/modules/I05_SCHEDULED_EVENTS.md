# I05 — Scheduled Events

## Resumen
Scheduler de eventos programados por entidad. No es un cron genérico de cada X minutos. Cada crédito/operación tiene sus propias fechas calculadas. Un cron diario revisa qué eventos toca ejecutar hoy.

## Estado: POR CONSTRUIR

## Tipo: Infraestructura

---

## Concepto

Cuando se crea una operación de crédito, el sistema calcula automáticamente:
- Fecha de vencimiento (disbursement_date + term_days)
- Fechas de alerta (según getAlertDays)
- Fecha de renovación anual (si aplica)
- Fecha de revisión de cartera (trimestral/semestral)
- Fecha de re-check PLD (6 o 12 meses)

Estas fechas se insertan como eventos programados. Un cron diario (1 vez al día) revisa la tabla y ejecuta lo que toca.

---

## Reglas de alertas de vencimiento (función determinista)

```
Plazo 1 día (intradía):     sin alertas
Plazo 2-7 días:             1 día antes
Plazo 8-14 días:            3 días antes, 1 día antes
Plazo 15-45 días:           5 días antes, 3 días antes, 1 día antes
```

---

## Tipos de eventos programados

| Tipo | Trigger | Acción |
|------|---------|--------|
| maturity_reminder | X días antes de vencimiento | Email al cliente + analista |
| maturity_due | Día de vencimiento | Email urgente |
| overdue | Día después de vencimiento | Alerta crítica, cambiar status |
| portfolio_review | Cada 3 o 6 meses | Re-run scoring, alerta a analista |
| annual_renewal | 30 días antes de vencimiento anual | Iniciar proceso de renovación |
| pld_recheck | Cada 6 o 12 meses | Re-check listas negras |
| covenant_check | Según frecuencia del covenant | Verificar ratios |

---

## Tabla

```
cs_scheduled_events
  id uuid pk
  tenant_id text
  entity_type text          -- 'operation', 'credit_line', 'company'
  entity_id uuid
  event_type text           -- 'maturity_reminder', 'overdue', etc.
  scheduled_date date
  status text               -- 'pending', 'executed', 'skipped', 'failed'
  action_type text          -- 'send_email', 'change_status', 'run_workflow'
  action_config jsonb       -- destinatarios, template, workflow
  recurrence jsonb          -- null (una vez) o { interval: '3 months' }
  executed_at timestamptz
  created_at timestamptz
```

---

## Cron diario

Un job que corre 1 vez al día (ej: 7 AM):
1. SELECT de cs_scheduled_events WHERE scheduled_date <= hoy AND status = 'pending'
2. Para cada evento: ejecutar action_type con action_config
3. Marcar como 'executed'
4. Si tiene recurrence: crear siguiente evento
