# M03 — Scoring Framework

## Resumen
Framework de análisis crediticio con 16 motores de análisis independientes, 20 cruces inteligentes, y pesos dinámicos configurables. Cada engine implementa la misma interfaz (`EngineInput → EngineOutput`), se ejecuta de forma independiente, y produce datos estructurados que la capa de decisión (M04) consume.

## Estado: CONSTRUIDO (refactor pendiente para modularidad dinámica)

## Dependencias
- I01 Data Layer (datos de empresa)
- M02 Expediente (contexto de la solicitud)
- Data Sources: M03a (SAT), M03b (Buró), M03c (Financieros), M03d (Compliance), M03e (Registro Público)

---

## Arquitectura del scoring

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA SOURCES (configurables por tenant)                        │
│  M03a SAT │ M03b Buró │ M03c Financieros │ M03d PLD │ M03e RPC │
└──────┬──────────┬───────────┬──────────────┬──────────┬─────────┘
       │          │           │              │          │
       ▼          ▼           ▼              ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│  ENGINE REGISTRY (dinámico)                                     │
│  Solo se activan engines cuyo data source está disponible       │
│                                                                 │
│  16 engines de análisis:                                        │
│  sat_facturacion │ financial │ cashflow │ working_capital │ buro │
│  network │ stability │ operational │ fx_risk │ guarantee │       │
│  employee │ documentation │ portfolio │ graph_fraud │ benchmark │
│  compliance (gate)                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  CROSS ANALYZER (20 cruces)                                     │
│  Solo se ejecutan cruces cuyos engines participantes están      │
│  activos. Si falta un engine, el cruce se salta gracefully.    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  SCORE CONSOLIDATOR                                             │
│  Pesos dinámicos: se normalizan al 100% según engines activos  │
│  Override manual: el tenant puede definir pesos custom          │
│  Gate engines: no contribuyen al score, pero pueden bloquear   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Los 16 engines de análisis

### Engines con peso en el score (contribuyen al score consolidado)

| Engine | Peso base | Data Source | Qué analiza |
|--------|-----------|-------------|-------------|
| cashflow | 16% | M03a SAT / M03c Financieros | EBITDA, DSCR, capacidad de pago, flujo operativo |
| sat_facturacion | 14% | M03a SAT | Facturación total, promedio mensual, tendencia, calidad de ingresos, cancelaciones |
| financial | 11% | M03a SAT / M03c Financieros | Balance general, estado de resultados, razones financieras, partes relacionadas |
| buro | 10% | M03b Buró | Score PyME, créditos activos/liquidados, rotación de deuda, consultas |
| stability | 9% | M03a SAT | Volatilidad de ingresos, estacionalidad, tendencia, cancelaciones |
| operational | 9% | M03e Registro Público | Estructura corporativa, RUG, incidencias legales, consistencia accionistas |
| network | 8% | M03a SAT | Concentración clientes/proveedores, HHI, dependencia gobierno, diversificación |
| fx_risk | 7% | M03a SAT | Descalce cambiario, hedge natural, DSCR estresado por FX |
| portfolio | 5% | Datos internos | Concentración de cartera, impacto en portafolio |
| working_capital | 4% | M03a SAT / M03c Financieros | Días de cobro, ciclo de conversión, capital de trabajo |
| documentation | 4% | Expediente | Completitud documental |
| employee | 3% | M03a SAT | Headcount, tendencia de crecimiento |

### Gate engines (bloquean pero no contribuyen al score)

| Engine | Data Source | Qué analiza |
|--------|-------------|-------------|
| compliance | M03d Compliance | PLD/KYC: listas negras, OFAC, PEPs, 69B. Si falla = rechazo automático |
| guarantee | Expediente | Cobertura de garantía, haircuts, política 2:1 |
| graph_fraud | M03a SAT + M03d Compliance | Facturación circular, empresas fachada, contrapartes en lista negra |

---

## Pesos dinámicos

### Cálculo automático

```
1. Tomar BASE_WEIGHTS (pesos ideales de cada engine)
2. Filtrar solo engines activos (según data sources del tenant)
3. Sumar pesos activos
4. Normalizar: peso_normalizado = peso_base / suma_pesos_activos
5. Resultado: pesos que suman 100%
```

### Ejemplo

SOFOM que solo tiene SAT + Financieros (sin Buró, sin Compliance, sin RPC):

| Engine | Peso base | Peso normalizado |
|--------|-----------|-----------------|
| cashflow | 16% | 22.5% |
| sat_facturacion | 14% | 19.7% |
| financial | 11% | 15.5% |
| stability | 9% | 12.7% |
| network | 8% | 11.3% |
| fx_risk | 7% | 9.9% |
| working_capital | 4% | 5.6% |
| employee | 3% | 4.2% |
| **Total** | **71%** | **100%** |

### Override manual

El tenant puede definir pesos custom en `cs_module_config`:
```json
{
  "score_weights": {
    "cashflow": 0.25,
    "sat_facturacion": 0.20,
    "financial": 0.15,
    ...
  }
}
```

Si define pesos custom, se usan esos en vez de los dinámicos. Se valida que sumen ~1.0.

---

## Los 20 cruces inteligentes

Cada cruce combina métricas de 2+ engines para detectar patrones complejos.

| # | Cruce | Engines requeridos | Qué detecta |
|---|-------|-------------------|-------------|
| 01 | SAT vs Financial Revenue | sat_facturacion + financial | Discrepancia entre ventas facturadas y declaradas |
| 02 | DSCR vs Debt Burden | cashflow + buro | Capacidad de pago vs carga de deuda |
| 03 | Concentration + Stability | network + stability | Alta concentración + alta volatilidad = riesgo |
| 04 | Debt Rotation | buro + cashflow | Pedir crédito para pagar otro crédito |
| 05 | Working Capital vs Payment | working_capital + cashflow | Ciclo de cobro vs capacidad de pago |
| 06 | Employee Productivity | employee + sat_facturacion | Ventas por empleado (eficiencia) |
| 07 | Guarantee vs Risk | guarantee + operational | Cobertura de garantía vs riesgo operativo |
| 08 | FX Exposure vs Revenue | fx_risk + sat_facturacion | Exposición cambiaria vs ingresos |
| 09 | Financial Ratios Cross | financial + cashflow | Consistencia entre razones financieras |
| 10 | Documentation vs Risk | documentation + (varios) | Documentación incompleta en caso de alto riesgo |
| 11 | Cancellations vs Client Quality | sat_facturacion + network | Muchas cancelaciones + pocos clientes |
| 12 | Credit Seeking Behavior | buro + (varios) | Muchas consultas recientes = búsqueda desesperada |
| 13 | Related Party Exposure | financial + network | Transacciones con partes relacionadas |
| 14 | Revenue Trend vs Stability | sat_facturacion + stability | Tendencia de ingresos vs volatilidad |
| 15 | Cashflow Stress vs Guarantee | cashflow + guarantee | Flujo estresado + garantía insuficiente |
| 16 | Government Dependency | network + sat_facturacion | Dependencia de contratos gubernamentales |
| 17 | Shell Company Indicators | graph_fraud + compliance | Indicadores de empresa fachada |
| 18 | Over-Leveraging | buro + financial | Sobreendeudamiento |
| 19 | Seasonal vs Term | stability + (expediente) | Estacionalidad vs plazo solicitado |
| 20 | Overall Risk Coherence | (todos) | Coherencia general del perfil de riesgo |

Si un engine requerido no está activo, el cruce se salta sin error.

---

## Interfaz de engine

Todos los engines implementan:

```typescript
interface EngineInput {
  application_id: string;
  syntage_data?: unknown;
  documents?: unknown;
  other_engine_results?: Record<string, EngineOutput>;
  policy_config: PolicyConfig;
}

interface EngineOutput {
  engine_name: string;
  module_status: 'pass' | 'fail' | 'warning' | 'blocked';
  module_score: number;        // 0-100
  module_max_score: number;    // siempre 100
  module_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  risk_flags: RiskFlag[];
  key_metrics: Record<string, MetricValue>;
  benchmark_comparison: Record<string, BenchmarkComparison>;
  trends: TrendResult[];
  explanation: string;         // Texto legible (AI lo consume)
  recommended_actions: string[];
  created_at: string;
}
```

---

## Archivos existentes

### Engines (16)
```
engines/satFacturacion.ts, engines/financial.ts, engines/cashflow.ts,
engines/workingCapital.ts, engines/buro.ts, engines/network.ts,
engines/stability.ts, engines/employee.ts, engines/fxRisk.ts,
engines/guarantee.ts, engines/documentation.ts, engines/portfolio.ts,
engines/graphFraud.ts, engines/benchmark.ts, engines/compliance.ts,
engines/aiRisk.ts
```

### Framework
```
lib/engineRunner.ts          — runEngine(), runEnginesParallel()
lib/scoreCalculator.ts       — calculateConsolidatedScore(), calculateDecision()
lib/crossAnalyzer.ts         — 20 cruces inteligentes
types/engine.types.ts        — EngineInput, EngineOutput, SCORE_WEIGHTS
hooks/useScoringOrchestrator.ts — Hook que ejecuta todo el pipeline
```

---

## Refactor pendiente para modularidad

1. Mover SCORE_WEIGHTS de constante hardcoded a función dinámica
2. Crear engine registry dinámico (en vez de imports directos en useScoringOrchestrator)
3. Hacer que crossAnalyzer verifique engines activos antes de ejecutar cada cruce
4. Agregar configuración de pesos por tenant en cs_module_config
