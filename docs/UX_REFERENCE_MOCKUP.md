# 🎨 UX Reference Mockup — Credit Scoring Dashboard

> **NOTA**: Este archivo es una REFERENCIA VISUAL generada con Gemini. 
> NO es el diseño final. El diseño final debe usar:
> - Colores del Brand Guide de Xending Capital (`brand/BRAND_GUIDE.md`)
> - Logo de Xending (Xending.png / Logoxending.png)
> - Pesos correctos del `CREDIT_SCORING_SYSTEM_OVERVIEW.md`
> - Vista de Tendencias (Trend Analysis Layer) que no está en este mockup
> - CSS Variables de Xending en lugar de Tailwind slate/blue genérico

## Mapeo de Colores: Gemini → Xending Brand

| Gemini (Tailwind genérico) | Xending Brand Guide |
|---------------------------|---------------------|
| `bg-slate-900` (sidebar) | `hsl(213, 67%, 25%)` — Primary azul oscuro |
| `bg-blue-600` (active) | `hsl(213, 67%, 35%)` — Sidebar Active |
| `bg-slate-50` (background) | `hsl(0, 0%, 98%)` — Background (#fafafa) |
| `bg-white` (cards) | `hsl(0, 0%, 100%)` — Card |
| `text-slate-900` (texto) | `hsl(215, 25%, 27%)` — Foreground |
| `text-emerald-*` (success) | `hsl(142, 76%, 36%)` — Status Success |
| `text-amber-*` (warning) | `hsl(45, 93%, 47%)` — Status Warning |
| `text-rose-*` (error) | `hsl(0, 84%, 60%)` — Status Error |
| `text-blue-*` (info) | `hsl(213, 67%, 55%)` — Status Info |
| Gradient sidebar | `linear-gradient(135deg, hsl(210 50% 18%), hsl(174 54% 55%))` |

## Vistas que faltan agregar al diseño final

1. **Vista de Tendencias por Motor** — Gráficos sparkline/línea con:
   - Data real (línea primary azul oscuro)
   - Proyección (línea teal punteada)
   - Zonas de umbral (verde/amarillo/rojo de status colors)
   - Benchmark de industria (línea gris muted)
   - Clasificación A-F de tendencia
   - Narrativa AI por métrica

2. **AI Trend Narrative** — Panel consolidado con:
   - Top 3 tendencias positivas y negativas
   - Proyecciones de cruce de umbrales
   - Resumen ejecutivo generado por AI Risk Engine

3. **Vista de Arquitectura** — Diagrama de 3 capas interactivo

4. **Employee Engine** y **Working Capital Engine** en vista de Motores

## Pesos que corregir (Gemini vs Overview)

| Motor | Gemini | Overview (correcto) |
|-------|--------|-------------------|
| CashFlow | 18% | 16% |
| SAT | 15% | 14% |
| Financial | 12% | 11% |
| Stability | 10% | 9% |
| Operational | 10% | 9% |
| Documentation | 5% | 4% |
| Working Capital | — | 4% |
| Employee | — | 3% |

## Componente React de Referencia

El código fuente del mockup está abajo. Usar SOLO como referencia de layout y UX patterns.
Reescribir con los colores de Xending y las vistas faltantes.

