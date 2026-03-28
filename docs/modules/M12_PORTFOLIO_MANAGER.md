# M12 — Gestor de Cartera

## Resumen
Monitoreo post-crédito de todos los créditos activos. Detecta deterioro temprano, genera alertas, produce reportes de cartera (vigente, vencida, castigada), y se integra con el monitoreo PLD continuo (M08).

## Estado: POR CONSTRUIR

## Dependencias: M04 Decision (créditos aprobados), M08 Monitoreo PLD, M03a SAT (datos actualizados)

---

## Concepto

Cuando un crédito es aprobado y formalizado, entra al gestor de cartera. Este módulo:
1. Registra el crédito activo con sus condiciones
2. Monitorea periódicamente la salud del acreditado
3. Detecta señales de deterioro antes de que sea tarde
4. Genera reportes de cartera para la dirección y reguladores

---

## Señales de deterioro que monitorea

| Señal | Fuente | Severidad |
|-------|--------|-----------|
| Baja en facturación >20% vs promedio | M03a SAT (facturas) | Alta |
| Nuevos créditos en Buró | M03b Buró (re-consulta) | Media |
| Atraso en pagos Buró | M03b Buró | Alta |
| Opinión cumplimiento negativa | M03a SAT | Crítica |
| Aparición en lista 69B | M08 PLD | Crítica |
| Pérdida de cliente principal | M03a SAT (facturas) | Alta |
| Aumento de cancelaciones | M03a SAT | Media |
| Incumplimiento de covenants | M13 Covenant Tracking | Alta |
| Cambio de domicilio fiscal | M03a SAT | Baja |
| Reducción de empleados >30% | M03a SAT (nómina) | Media |

---

## Reportes de cartera

### Reporte de composición
- Cartera vigente (al corriente)
- Cartera vencida (por buckets: 1-30, 31-60, 61-90, 90+ días)
- Cartera castigada (write-offs)
- Concentración por sector, monto, plazo
- Distribución por calificación de riesgo

### Reporte de tendencia
- Evolución mensual de cartera vigente vs vencida
- Tasa de morosidad
- Provisiones requeridas (estimación)
- Comparación vs mes/trimestre/año anterior

---

## Tablas futuras

```
cs_active_credits          — Créditos otorgados y activos
cs_credit_monitoring       — Snapshots periódicos de salud del acreditado
cs_credit_alerts           — Alertas de deterioro
cs_portfolio_reports       — Reportes de cartera generados
cs_portfolio_snapshots     — Foto mensual de composición de cartera
```
