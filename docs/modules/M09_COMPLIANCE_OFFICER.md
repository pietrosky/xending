# M09 — Compliance Officer Dashboard

## Resumen
Panel de control para el oficial de cumplimiento. Centraliza alertas PLD, historial de verificaciones, workflow de revisión y aprobación, y generación de reportes regulatorios para CNBV, UIF y CONDUSEF.

## Estado: POR CONSTRUIR

## Dependencias: M06 KYB, M07 Listas Negras, M08 Monitoreo PLD

---

## Funcionalidades

### Dashboard principal
- Alertas activas (por prioridad: crítica, alta, media, baja)
- Clientes pendientes de revisión
- Estadísticas: checks realizados, alertas generadas, resoluciones
- Timeline de actividad reciente

### Workflow de revisión
- Cola de alertas por resolver
- Para cada alerta: contexto completo (qué se encontró, en qué lista, desde cuándo)
- Acciones: aprobar (falso positivo), escalar, bloquear, reportar
- Justificación obligatoria para cada decisión
- Historial de decisiones (auditable)

### Reportes regulatorios
- Reporte de operaciones inusuales (UIF)
- Reporte de operaciones relevantes (CNBV)
- Reporte de quejas y reclamaciones (CONDUSEF)
- Exportación en formatos regulatorios estándar
- Scheduling automático de reportes periódicos

### Historial por empresa
- Todos los checks realizados desde el inicio
- Todas las alertas generadas
- Todas las decisiones tomadas
- Timeline completo de compliance

---

## Tablas futuras

```
cs_compliance_reviews      — Revisiones realizadas por el officer
cs_compliance_decisions    — Decisiones tomadas (con justificación)
cs_compliance_reports      — Reportes regulatorios generados
cs_compliance_config       — Configuración del módulo por tenant
```

---

## AI en este módulo

- AI genera resúmenes ejecutivos de alertas
- AI sugiere acción recomendada basada en historial
- AI pre-llena reportes regulatorios
- AI detecta patrones de riesgo en el portafolio
