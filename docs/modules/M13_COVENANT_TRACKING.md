# M13 — Covenant Tracking

## Resumen
Seguimiento automático de las condiciones del crédito (covenants). Verifica periódicamente si el acreditado cumple con los ratios financieros, reportes, y restricciones definidas al momento de la aprobación. Genera alertas de incumplimiento.

## Estado: ENGINE CONSTRUIDO, UI POR CONSTRUIR

## Dependencias: M04 Decision (covenants definidos), M12 Gestor de Cartera

---

## Tipos de covenants

### Financieros
| Covenant | Ejemplo | Frecuencia de revisión |
|----------|---------|----------------------|
| DSCR mínimo | DSCR >= 1.2x | Trimestral |
| Razón circulante mínima | RC >= 1.5 | Trimestral |
| Endeudamiento máximo | Pasivo/Capital <= 3.0 | Trimestral |
| Margen EBITDA mínimo | EBITDA/Ventas >= 10% | Trimestral |

### Operativos
| Covenant | Ejemplo | Frecuencia |
|----------|---------|-----------|
| Concentración máxima | Ningún cliente > 30% de ventas | Mensual |
| Facturación mínima | Ventas mensuales >= $X MXN | Mensual |
| Empleados mínimos | Headcount >= X | Trimestral |

### Informativos
| Covenant | Ejemplo | Frecuencia |
|----------|---------|-----------|
| Entrega de estados financieros | Cada trimestre | Trimestral |
| Opinión de cumplimiento SAT | Positiva vigente | Mensual |
| Actualización de garantías | Avalúo vigente | Anual |

---

## Flujo

```
Scheduler (según frecuencia del covenant)
         │
         ▼
Para cada crédito activo:
  Para cada covenant:
    1. Obtener dato actual (de M03a SAT, M03c Financieros, etc.)
    2. Comparar vs umbral definido
    3. Si incumple → generar alerta
    4. Guardar resultado en historial
         │
         ▼
Si incumplimiento:
  → Alerta a analista / gestor de cartera (M12)
  → Posible trigger de revisión anticipada
  → Registro en historial del crédito
```

---

## Archivos existentes

```
engines/covenantEngine.ts      — Engine que define y evalúa covenants
engines/reviewFrequency.ts     — Engine que define frecuencia de revisión
```

---

## Tablas futuras

```
cs_covenant_definitions    — Covenants definidos por crédito
cs_covenant_checks         — Verificaciones realizadas
cs_covenant_violations     — Incumplimientos detectados
cs_covenant_waivers        — Dispensas otorgadas (con justificación)
```
