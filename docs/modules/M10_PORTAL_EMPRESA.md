# M10 — Portal Salud Financiera (Público / Freemium)

## Resumen
Dashboard gratuito donde cualquier empresa puede conectar su SAT y ver la salud de su negocio con AI. Es el gancho comercial principal: la empresa obtiene valor gratis, y Xending obtiene un lead calificado con datos reales.

## Estado: POR CONSTRUIR

## Dependencias: Syntage (SAT), AI (interpretación)

---

## Concepto

```
Empresa se registra gratis
         │
         ▼
Conecta su CIEC del SAT (vía Syntage)
         │
         ▼
Syntage extrae datos automáticamente
         │
         ▼
Portal muestra dashboard con:
  - Facturación mensual y tendencias
  - Top clientes y proveedores
  - Concentración (HHI)
  - Salud fiscal (opinión cumplimiento, 69B)
  - Indicadores financieros básicos
  - Resumen AI de la salud del negocio
  - Alertas y recomendaciones
         │
         ▼
CTA: "¿Necesitas crédito? Solicita aquí" → M01 Onboarding
```

---

## Métricas que muestra

### Facturación
- Facturación mensual (últimos 12-24 meses)
- Tendencia (creciendo, estable, decreciendo)
- Estacionalidad
- Promedio mensual
- Mejor y peor mes

### Clientes y proveedores
- Top 10 clientes por facturación
- Top 10 proveedores por gasto
- Índice de concentración (HHI)
- Alerta si concentración > 25% en un solo cliente
- Diversificación de cartera

### Salud fiscal
- Opinión de cumplimiento SAT (positiva/negativa)
- Estatus en lista 69B
- Declaraciones presentadas a tiempo
- Retenciones al corriente

### Indicadores financieros (si hay declaraciones)
- Margen bruto
- Margen operativo
- Razón circulante
- Endeudamiento
- ROE / ROA

### AI Insights
- Resumen ejecutivo en lenguaje natural
- "Tu facturación creció 15% vs año anterior"
- "Tienes alta concentración en 2 clientes (45% de ingresos)"
- "Tu opinión de cumplimiento es positiva"
- Recomendaciones personalizadas

---

## Modelo de negocio

| Tier | Precio | Qué incluye |
|------|--------|-------------|
| Free | $0 | Dashboard básico, métricas de facturación, 1 actualización/mes |
| Pro (futuro) | $X/mes | Actualización diaria, alertas, cobranza (M11), AI insights avanzados |
| Enterprise (futuro) | Custom | Multi-empresa, API, reportes custom |

El tier Free es suficiente para captar leads. El upgrade a Pro viene cuando la empresa quiere monitoreo continuo.

---

## Datos compartidos

Los datos que la empresa conecta en el portal se guardan en `cs_provider_data` (I01 Data Layer). Si esa misma empresa después solicita crédito (M01), los datos ya están disponibles sin volver a extraer.

---

## Tablas futuras

```
cs_portal_accounts       — Cuentas de empresas en el portal
cs_portal_preferences    — Preferencias de visualización
cs_portal_alerts         — Alertas configuradas por la empresa
cs_company_metrics       — Métricas calculadas periódicamente
```
