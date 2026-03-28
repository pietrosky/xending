# M15 — Operaciones FX

## Resumen
Módulo de operaciones de cambio de divisas. Incluye cotizador, ejecución de operaciones, y líneas FX vinculadas a crédito. Parcialmente construido en otro proyecto del workspace.

## Estado: PARCIALMENTE CONSTRUIDO (proyecto fx-pdf-generator y otros)

## Dependencias: APIs de tipo de cambio, M04 Decision (líneas FX)

---

## Funcionalidades

### Cotizador
- Cotización en tiempo real USD/MXN
- Spread configurable por tenant
- Rate limiting y cache

### Operaciones
- Compra/venta de divisas
- Confirmación y liquidación
- Generación de PDF de confirmación

### Líneas FX (futuro)
- Línea de crédito para operaciones FX
- Vinculada al scoring crediticio (M03/M04)
- Límite basado en Credit Limit engine

---

## Conexión con crédito

Si una empresa tiene crédito aprobado (M04), puede tener una línea FX asociada:
- El monto de la línea FX se calcula como % del crédito aprobado
- El riesgo FX del engine fx_risk influye en el límite
- El monitoreo de cartera (M12) incluye exposición FX
