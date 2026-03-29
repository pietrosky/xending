# M04 — Decision Engines

## Resumen
8 motores de decisión que producen la recomendación final. El sistema recomienda, pero al inicio TODOS los casos van a comité de socios (M17). Futuro: auto-approve configurable por tenant según score y monto.

## Estado: CONSTRUIDO (ajuste pendiente: modo comité obligatorio)

## Dependencias: M03 Scoring (resultados de engines)

---

## Los 8 engines

| Engine | Qué hace |
|--------|----------|
| AI Risk | Análisis de riesgo con ML/AI, detecta patrones |
| Credit Limit | Calcula monto máximo (cashflow, colateral, concentración, regulatorio) |
| Risk Matrix | 3 gates: hard stops, semáforo por módulo, score consolidado |
| Scenarios | Stress testing: baja ventas, sube TC, pierde cliente principal |
| Covenants | Define condiciones del crédito: ratios, reportes, restricciones |
| Review Frequency | Cada cuánto re-evaluar (trimestral, semestral) |
| Policy Engine | Políticas dinámicas del tenant (límites sector, moneda, plazo) |
| Decision Workflow | Recomendación final: approved / conditional / committee / rejected |

---

## Flujo de decisión

```
Engine results (M03) + documentación + KYB
         │
         ▼
Gate 1: Hard Stops → ¿hay risk_flag severity='hard_stop'? → REJECTED
         │
         ▼
Gate 2: Semáforos → cada engine: verde/amarillo/rojo
         │
         ▼
Gate 3: Score consolidado (0-100)
  >= 75 → recomendación APPROVED
  60-74 → recomendación CONDITIONAL
  50-59 → recomendación COMMITTEE
  < 50  → recomendación REJECTED
         │
         ▼
IMPORTANTE: Al inicio, sin importar la recomendación,
TODOS los casos van a comité (M17).

Futuro configurable por tenant:
  auto_approve_threshold: 80
  auto_approve_max_amount: 200000
  Si score >= 80 Y monto <= 200K → auto-approve sin comité
```

---

## Ajuste pendiente

Agregar en M04 Decision Workflow:
- Flag `committee_required: true` (default, todos a comité)
- Configurable por tenant en cs_module_config
- La recomendación del sistema se presenta al comité como referencia
- El comité puede aprobar, condicionar, o rechazar independientemente del score

---

## Archivos existentes

```
engines/aiRisk.ts, engines/creditLimit.ts, engines/policyEngine.ts
engines/scenarioEngine.ts, engines/covenantEngine.ts
engines/reviewFrequency.ts
lib/scoreCalculator.ts, lib/crossAnalyzer.ts
components/RiskMatrixGates.tsx, components/CreditLimitBreakdown.tsx
components/DecisionWorkflow.tsx
```
