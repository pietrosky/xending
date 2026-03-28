# M11 — Cobranza Inteligente

## Resumen
Módulo de cuentas por cobrar automático basado en datos del SAT. Cruza facturas emitidas (PPD) con complementos de pago recibidos para calcular qué le deben a la empresa, cuánto, desde cuándo, y quién. Sin captura manual.

## Estado: POR CONSTRUIR

## Dependencias: Syntage (facturas + pagos del SAT), M10 Portal Empresa

---

## Concepto

```
Datos del SAT (vía Syntage):
│
├── Facturas emitidas tipo I con método PPD
│   = "Vendiste algo pero aún no te pagan"
│
├── Complementos de pago recibidos (tipo P)
│   = "Ya te pagaron esta factura"
│
└── Cruce automático:
    Facturas PPD sin complemento = CUENTAS POR COBRAR
```

No necesita que el usuario capture nada. Todo sale del SAT automáticamente.

---

## Métricas que calcula

| Métrica | Cómo se calcula | Para qué sirve |
|---------|----------------|----------------|
| Total por cobrar | Suma de facturas PPD sin pago | Saldo de cartera |
| Antigüedad de cartera | Días desde emisión: 0-30, 31-60, 61-90, 90+ | Calidad de cartera |
| Top deudores | Clientes con mayor saldo pendiente | Priorizar cobranza |
| DSO (Days Sales Outstanding) | Promedio de días para cobrar | Eficiencia de cobranza |
| Tendencia de cobranza | DSO mensual últimos 12 meses | ¿Mejorando o empeorando? |
| Tasa de cobro | % de facturas cobradas vs emitidas | Efectividad |

---

## Alertas

| Alerta | Trigger |
|--------|---------|
| Factura vencida | Factura PPD con más de 30 días sin pago |
| Cliente moroso | Cliente con 3+ facturas vencidas |
| Deterioro de cobranza | DSO aumentó >20% vs mes anterior |
| Concentración de riesgo | >40% del saldo por cobrar en un solo cliente |

---

## Vista del usuario

### Dashboard de cobranza
- Total por cobrar (número grande)
- Gráfica de antigüedad (barras: 0-30, 31-60, 61-90, 90+)
- Lista de facturas pendientes (ordenable por monto, antigüedad, cliente)
- Top 5 deudores
- Tendencia DSO (línea últimos 12 meses)

### Detalle por cliente
- Facturas pendientes de ese cliente
- Historial de pagos
- DSO promedio con ese cliente
- Alertas activas

---

## Tablas futuras

```
cs_collections_snapshots    — Foto mensual de cartera por cobrar
cs_collections_invoices     — Facturas pendientes de cobro (calculadas)
cs_collections_alerts       — Alertas de cobranza
cs_collections_config       — Configuración (umbrales de alerta, etc.)
```
