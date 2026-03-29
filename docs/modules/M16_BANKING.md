# M16 — Conexión Bancaria

## Resumen
Conexión con bancos para obtener estados de cuenta y conciliar pagos de operaciones de crédito. Permite detectar automáticamente cuándo un cliente pagó sin intervención manual.

## Estado: POR CONSTRUIR

## Dependencias: M12 Gestor de Cartera

---

## Concepto

Cuando un cliente tiene una operación activa y paga, hoy el admin lo detecta manualmente revisando el estado de cuenta del banco. Este módulo automatiza eso:

1. Conexión con la banca de Xending (no del cliente)
2. Obtener movimientos periódicamente
3. Cruzar movimientos con operaciones activas
4. Si detecta pago → marcar operación como paid automáticamente
5. Si hay discrepancia → alerta al admin

---

## Opciones de implementación

### Opción A: Open Banking API
- Conexión directa con API del banco
- Tiempo real o near-real-time
- Depende de que el banco tenga API disponible

### Opción B: Scraping de portal bancario
- Robot que entra al portal del banco y descarga movimientos
- Menos confiable, más frágil
- Funciona con cualquier banco

### Opción C: Upload manual de estado de cuenta
- Admin sube CSV/Excel del estado de cuenta
- Sistema cruza automáticamente con operaciones
- Más simple, menos automático

### Recomendación
Empezar con Opción C (upload manual) y migrar a Opción A cuando haya API disponible.

---

## Tablas futuras

```
cs_bank_accounts          — Cuentas bancarias de Xending
cs_bank_transactions      — Movimientos importados
cs_payment_reconciliation — Cruce movimientos vs operaciones
```

---

## Flujo de conciliación

```
1. Obtener movimientos (API, scraping, o upload)
2. Para cada movimiento de ingreso:
   - Buscar operación activa que coincida (monto, referencia, RFC)
   - Si match → marcar operación como paid
   - Si no match → marcar como "pendiente de identificar"
3. Para operaciones overdue sin pago detectado:
   - Alerta al admin
```
