# M08 — Monitoreo Continuo PLD

## Resumen
Re-verificación periódica automática de clientes activos contra listas negras y bases de riesgo. Detecta si un cliente que fue aprobado posteriormente cae en alguna lista. Genera alertas automáticas al compliance officer.

## Estado: POR CONSTRUIR

## Dependencias: M06 KYB, M07 Listas Negras, M09 Compliance Officer

---

## Concepto

Una vez que un crédito es aprobado, el monitoreo PLD no termina. Este módulo:
1. Re-ejecuta checks de M07 periódicamente
2. Monitorea cambios en el perfil de la empresa
3. Genera alertas si algo cambia
4. Alimenta el dashboard del compliance officer (M09)

---

## Scheduling configurable

| Frecuencia | Para quién | Qué verifica |
|-----------|-----------|-------------|
| Diario | Clientes de alto riesgo | Listas críticas (69B, OFAC) |
| Semanal | Todos los clientes activos | Todas las listas |
| Mensual | Clientes de bajo riesgo | Listas + cambios en SAT |
| On-demand | Cualquier cliente | Todo |

El tenant configura la frecuencia por nivel de riesgo.

---

## Alertas

| Tipo de alerta | Trigger | Acción |
|---------------|---------|--------|
| Crítica | Cliente aparece en 69B, OFAC, Interpol | Notificación inmediata a compliance officer + bloqueo de operaciones |
| Alta | Cliente aparece en PEPs, Panama Papers | Notificación a compliance officer |
| Media | Cambio en opinión de cumplimiento SAT | Notificación al analista |
| Baja | Cambio de domicilio, régimen fiscal | Info en dashboard |

---

## Flujo

```
Scheduler (cron)
         │
         ▼
Para cada cliente activo según frecuencia:
         │
         ├── Re-ejecutar checks M07
         ├── Comparar con resultado anterior
         ├── Si hay cambio → generar alerta
         ├── Guardar resultado en historial
         │
         ▼
Si alerta crítica:
  → Notificar compliance officer (M09)
  → Notificar gestor de cartera (M12)
  → Bloquear operaciones si aplica
```

---

## Tablas futuras

```
cs_pld_monitoring_schedule  — Configuración de frecuencia por cliente/riesgo
cs_pld_monitoring_runs      — Ejecuciones del monitoreo (cuándo, qué se verificó)
cs_pld_monitoring_results   — Resultados de cada run
cs_pld_alerts               — Alertas generadas
cs_pld_alert_actions        — Acciones tomadas sobre alertas
```
