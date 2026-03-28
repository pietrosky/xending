# M04 — Decision Engines

## Resumen
8 motores de decisión que toman los resultados de M03 (scoring) y producen la recomendación final: aprobar, condicionar, escalar a comité, o rechazar. Incluyen cálculo de límite de crédito, matriz de riesgo, escenarios de estrés, covenants, frecuencia de revisión, y políticas dinámicas.

## Estado: CONSTRUIDO

## Dependencias: M03 Scoring Framework (resultados de engines)

---

## Los 8 engines de decisión

| Engine | Qué hace | Input principal |
|--------|----------|----------------|
| AI Risk | Análisis de riesgo con ML/AI. Detecta patrones que las reglas no capturan | Todos los engine results |
| Credit Limit | Calcula monto máximo a prestar. Múltiples restricciones (cashflow, colateral, concentración, regulatorio) | cashflow, financial, guarantee, portfolio |
| Risk Matrix | 3 gates de decisión: Gate 1 (hard stops), Gate 2 (semáforo por módulo), Gate 3 (score consolidado) | Todos los engine results |
| Scenarios | Stress testing: qué pasa si ventas bajan 20%, si tipo de cambio sube 15%, si pierde cliente principal | cashflow, stability, fx_risk, network |
| Covenants | Define condiciones del crédito: ratios mínimos, reportes periódicos, restricciones | financial, cashflow, buro |
| Review Frequency | Cada cuánto re-evaluar al cliente (mensual, trimestral, semestral, anual) | Score consolidado, risk flags |
| Policy Engine | Aplica políticas dinámicas del tenant (límites por sector, moneda, plazo) | Todos + policy_config |
| Decision Workflow | Recomendación final: approved / conditional / committee / rejected | Todos los anteriores |

---

## Flujo de decisión

```
Engine results (M03)
         │
         ▼
┌─────────────────────┐
│  Gate 1: Hard Stops  │  ¿Hay algún risk_flag con severity='hard_stop'?
│                      │  Sí → REJECTED automático
│                      │  No → continuar
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Gate 2: Semáforos   │  Cada engine tiene status: pass/warning/fail
│                      │  Verde = pass, Amarillo = warning, Rojo = fail
│                      │  Si hay rojos críticos → COMMITTEE o REJECTED
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Gate 3: Score       │  Score consolidado (0-100)
│                      │  >= 75 → APPROVED
│                      │  60-74 → CONDITIONAL
│                      │  50-59 → COMMITTEE
│                      │  < 50  → REJECTED
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Credit Limit        │  ¿Cuánto prestar?
│                      │  Mínimo de: cashflow capacity, colateral,
│                      │  concentración de cartera, límite regulatorio
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Scenarios           │  ¿Aguanta estrés?
│                      │  Stress test con escenarios adversos
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Covenants           │  ¿Con qué condiciones?
│                      │  Ratios mínimos, reportes, restricciones
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Review Frequency    │  ¿Cada cuánto revisar?
│                      │  Basado en riesgo y score
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│  Decision Workflow   │  Recomendación final + routing
│                      │  → Aprobación automática (analyst)
│                      │  → Aprobación gerente (manager)
│                      │  → Comité de crédito (committee)
└─────────────────────┘
```

---

## Routing por monto

| Monto solicitado | Nivel de aprobación |
|-----------------|-------------------|
| < $500,000 USD | Analista |
| $500,000 - $2,000,000 USD | Gerente |
| > $2,000,000 USD | Comité |

---

## Adaptación a engines disponibles

Si un tenant no tiene todos los data sources, los decision engines se adaptan:
- Credit Limit usa solo las restricciones disponibles
- Scenarios solo estresan variables que existen
- El score consolidado se calcula con pesos normalizados

---

## Archivos existentes

```
engines/aiRisk.ts           — AI Risk engine
engines/creditLimit.ts      — Credit Limit engine
engines/policyEngine.ts     — Policy engine
engines/scenarioEngine.ts   — Scenario engine
engines/covenantEngine.ts   — Covenant engine
engines/reviewFrequency.ts  — Review Frequency engine
lib/scoreCalculator.ts      — Score consolidado, decisión, grade
lib/crossAnalyzer.ts        — 20 cruces inteligentes
components/RiskMatrixGates.tsx    — UI de gates
components/CreditLimitBreakdown.tsx — UI de límite
components/DecisionWorkflow.tsx   — UI de decisión
```
