# Design Document — Credit Scoring System

## Introducción

Diseño técnico del sistema de Credit Scoring para Xending Capital. Sistema modular de 3 capas con 16 motores de análisis, 8 motores de decisión, 20 cruces inteligentes, y capa transversal de tendencias. Independiente de tablas xending_ (prefijo cs_).

Referencia: `docs/CREDIT_SCORING_SYSTEM_OVERVIEW.md`
Brand: `brand/BRAND_GUIDE.md`
UX Reference: `docs/UX_REFERENCE_MOCKUP.md`

---

## Arquitectura General

### Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| UI Components | shadcn/ui + Tailwind CSS (con CSS vars Xending) |
| Charts | Recharts (tendencias, radar, gauges, barras) |
| State Management | React Query (server state) + Zustand (UI state) |
| Backend | Supabase Edge Functions (Deno/TypeScript) |
| Database | Supabase PostgreSQL (tablas cs_*) |
| Auth | Supabase Auth (roles: analyst, manager, committee, admin) |
| AI | OpenAI GPT-4o (narrativas AI Risk Engine) |
| PDF | Puppeteer / html-pdf (reportes con branding Xending) |
| APIs Externas | Scory (PLD/KYC), Syntage (SAT/Buró/Indicadores) |

### Diagrama de Capas

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (React + TypeScript)                          │
│  Dashboard Analista │ Workspace │ Tendencias │ Reportes │
└──────────────────────────┬──────────────────────────────┘
                           │ REST / RPC
┌──────────────────────────▼──────────────────────────────┐
│  SUPABASE EDGE FUNCTIONS (Orchestrator)                 │
│  cs-orchestrator │ cs-engine-runner │ cs-trend-analyzer  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  ENGINE LAYER (funciones independientes por motor)       │
│  Cada engine: input → cálculo → TrendResult → output    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  DATA LAYER                                             │
│  Supabase DB (cs_*) │ Scory API │ Syntage API │ Cache   │
└─────────────────────────────────────────────────────────┘
```

---

## Componentes del Sistema

### 1. Orchestrator (cs-orchestrator)

Edge Function principal que coordina el flujo completo de una solicitud.

```typescript
// Flujo del Orchestrator
async function processApplication(applicationId: string): Promise<ScoringResult> {
  // 1. Gate: Compliance (Scory)
  const compliance = await runEngine('compliance', applicationId);
  if (compliance.status === 'hard_stop') return reject(compliance);

  // 2. Recolección de datos (Syntage + Docs)
  const syntageData = await fetchSyntageData(applicationId);
  const documents = await getDocuments(applicationId);

  // 3. Ejecutar 16 motores en paralelo (donde sea posible)
  const engineResults = await runEnginesParallel(applicationId, syntageData, documents);

  // 4. Calcular tendencias por motor
  const trendResults = await calculateTrends(engineResults);

  // 5. Ejecutar 20 cruces inteligentes
  const crossAnalysis = await runCrossAnalysis(engineResults, trendResults);

  // 6. Decision Layer
  const decision = await runDecisionLayer(engineResults, trendResults, crossAnalysis);

  return decision;
}
```

Dependencias entre motores:

```
Compliance (Gate) ──→ si pasa ──→ Syntage Data Fetch
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
              SAT Engine        Buro Engine      Documentation
                    │                  │                  │
          ┌────────┼────────┐         │                  │
          ▼        ▼        ▼         ▼                  ▼
     Financial  Network  Employee  CashFlow         (independiente)
          │        │        │         │
          ▼        ▼        ▼         ▼
     Working    Stability  Operational  FX Risk
     Capital       │           │          │
          │        │           ▼          │
          │        │      Guarantee       │
          │        │           │          │
          ▼        ▼           ▼          ▼
     ┌─────────────────────────────────────┐
     │  Benchmark Engine (compara todos)   │
     │  Portfolio Engine (impacto cartera) │
     │  Graph Fraud Engine (red completa)  │
     └──────────────┬──────────────────────┘
                    ▼
     ┌─────────────────────────────────────┐
     │  20 Cruces Inteligentes             │
     └──────────────┬──────────────────────┘
                    ▼
     ┌─────────────────────────────────────┐
     │  AI Risk Engine (narrativa + trends)│
     │  Credit Limit Engine                │
     │  Risk Matrix Engine (3 Gates)       │
     │  Scenario Engine                    │
     │  Covenant Engine                    │
     │  Review Frequency Engine            │
     │  Decision Workflow Engine           │
     └─────────────────────────────────────┘
```

### 2. Engine Interface (Contrato Estándar)

Todos los motores implementan la misma interfaz. Esto garantiza consistencia y permite agregar/quitar motores sin romper el sistema.

```typescript
// Interfaz base que TODOS los engines implementan
interface EngineInput {
  application_id: string;
  syntage_data?: SyntageResponse;
  documents?: DocumentSet;
  other_engine_results?: Record<string, EngineOutput>;
  policy_config: PolicyConfig;
}

interface EngineOutput {
  engine_name: string;
  module_status: 'pass' | 'fail' | 'warning' | 'blocked';
  module_score: number;        // 0-100
  module_max_score: number;    // 100
  module_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  risk_flags: RiskFlag[];
  key_metrics: Record<string, MetricValue>;
  benchmark_comparison: Record<string, BenchmarkComparison>;
  trends: TrendResult[];       // Tendencias de métricas clave
  explanation: string;
  recommended_actions: string[];
  created_at: string;
}

interface RiskFlag {
  code: string;              // "high_cancellation_risk"
  severity: 'info' | 'warning' | 'critical' | 'hard_stop';
  message: string;
  source_metric?: string;
  value?: number;
  threshold?: number;
}

interface MetricValue {
  name: string;
  label: string;
  value: number;
  unit: string;
  source: string;
  formula?: string;
  interpretation: string;
  impact_on_score: 'positive' | 'neutral' | 'negative';
}

interface BenchmarkComparison {
  metric: string;
  applicant_value: number;
  benchmark_value: number;
  deviation_percent: number;
  status: 'above' | 'at' | 'below';
}
```

### 3. TrendResult Interface (Capa Transversal)

```typescript
interface TimeSeriesPoint {
  period: string;        // "2025-01"
  value: number;
  benchmark?: number;
}

interface TrendResult {
  metric_name: string;
  metric_label: string;
  unit: string;
  time_series: TimeSeriesPoint[];
  current_value: number;
  previous_value: number;
  direction: 'improving' | 'stable' | 'deteriorating' | 'critical';
  speed: 'slow' | 'moderate' | 'fast';
  change_percent: number;
  change_absolute: number;
  slope: number;
  r_squared: number;
  trend_line: TimeSeriesPoint[];
  projection: TimeSeriesPoint[];
  months_to_threshold?: number;
  threshold_value?: number;
  threshold_type?: 'warning' | 'critical';
  classification: 'A' | 'B' | 'C' | 'D' | 'F';
  risk_flags: string[];
  chart_config: {
    thresholds: { warning?: number; critical?: number; benchmark?: number };
    higher_is_better: boolean;
    y_axis_format: string;
  };
}
```

### 4. trendUtils Library

Librería compartida que todos los motores consumen para calcular tendencias.

```typescript
// src/lib/credit-scoring/trendUtils.ts
export const trendUtils = {
  analyze(data: TimeSeriesPoint[], config: TrendConfig): TrendResult,
  classify(result: TrendResult): { direction, speed, classification },
  project(result: TrendResult, months: number): TimeSeriesPoint[],
  detectBreakpoints(data: TimeSeriesPoint[]): BreakPoint[],
  detectSeasonality(data: TimeSeriesPoint[]): SeasonalPattern | null,
  compareVsBenchmark(data: TimeSeriesPoint[], benchmark: TimeSeriesPoint[]): DeviationReport,
  rollingAverage(data: TimeSeriesPoint[], window: number): TimeSeriesPoint[],
};

// Clasificación de tendencias
// improving + fast/moderate → A
// improving + slow → B
// stable → B
// deteriorating + slow → C
// deteriorating + moderate → D
// deteriorating + fast / critical → F

// Factor de tendencia aplicado al score del motor:
// Todas mejorando: 1.05 | Estables: 1.00 | Algunas deteriorando: 0.95
// Mayoría deteriorando: 0.90 | Crítico: 0.80
```

### 5. API Integration Layer

```typescript
// Scory Client
interface ScoryClient {
  validateCompliance(rfc: string): Promise<ComplianceResult>;
  // Listas negras, OFAC, PEPs, SYGER, RUG, 69B
  // Domicilio, geolocalización, fotos
  // Accionistas, consistencia giro
}

// Syntage Client
interface SyntageClient {
  // SAT Data
  getCFDIs(rfc: string, type: 'emitidas' | 'recibidas'): Promise<CFDI[]>;
  getDeclaraciones(rfc: string): Promise<Declaracion[]>;
  getConstanciaFiscal(rfc: string): Promise<ConstanciaFiscal>;
  getOpinionCumplimiento(rfc: string): Promise<OpinionResult>;
  getBalanzaComprobacion(rfc: string): Promise<BalanzaMensual[]>;
  getNomina(rfc: string): Promise<NominaCFDI[]>;
  getLista69B(rfc: string): Promise<Lista69BResult>;

  // Buró
  getScorePyME(rfc: string): Promise<ScorePyME>;
  getCreditosActivos(rfc: string): Promise<CreditoActivo[]>;
  getCreditosLiquidados(rfc: string): Promise<CreditoLiquidado[]>;
  getConsultasBuro(rfc: string): Promise<ConsultasBuro>;
  getCalificacionCartera(rfc: string): Promise<CalificacionMensual[]>;
  getHawkChecks(rfc: string): Promise<HawkResult[]>;

  // Indicadores
  getSyntageScore(rfc: string): Promise<SyntageScore>;
  getRazonesFinancieras(rfc: string): Promise<RazonesFinancieras>;
  getInsightsFacturacion(rfc: string): Promise<InsightsFacturacion>;

  // Registro Público
  getEstructuraCorporativa(rfc: string): Promise<EstructuraCorporativa>;
  getRUG(rfc: string): Promise<GarantiasRUG[]>;
  getIncidenciasLegales(rfc: string): Promise<IncidenciaLegal[]>;
}

// Retry + Cache Strategy
// - Retry: exponential backoff, max 3 retries
// - Cache: 24h en cs_api_cache
// - Fallback: manual_override flag si API no disponible
// - Logging: cs_api_calls (timestamp, endpoint, status, latency)
```

---

## Modelo de Datos (Supabase PostgreSQL)

### Tablas Principales (65+ tablas, prefijo cs_)

#### Data Layer

```sql
-- Solicitudes de crédito
cs_applications (
  id uuid PK,
  rfc text NOT NULL,
  company_name text NOT NULL,
  requested_amount numeric NOT NULL,
  term_months int,
  currency text CHECK (currency IN ('MXN', 'USD')),
  status text DEFAULT 'pending_scoring',
  scoring_version text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
)

cs_application_status_log (
  id uuid PK,
  application_id uuid REFERENCES cs_applications,
  old_status text,
  new_status text,
  changed_by uuid,
  reason text,
  created_at timestamptz DEFAULT now()
)

-- Cache de APIs externas
cs_api_calls (
  id uuid PK,
  application_id uuid,
  provider text, -- 'scory' | 'syntage'
  endpoint text,
  status int,
  latency_ms int,
  created_at timestamptz DEFAULT now()
)

cs_api_cache (
  id uuid PK,
  provider text,
  endpoint text,
  rfc text,
  response_data jsonb,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
)
```

#### Engine Results (patrón repetido por motor)

```sql
-- Patrón: cada engine tiene tablas de inputs, cálculos y resultados
-- Ejemplo: SAT Engine
cs_sat_data (
  id uuid PK,
  application_id uuid,
  data_type text, -- 'cfdis_emitidas', 'cfdis_recibidas', 'declaraciones', etc.
  raw_data jsonb,
  created_at timestamptz
)

cs_sat_metrics (
  id uuid PK,
  application_id uuid,
  metric_name text,
  metric_value numeric,
  unit text,
  period text,
  created_at timestamptz
)

cs_sat_results (
  id uuid PK,
  application_id uuid,
  module_status text,
  module_score numeric,
  module_grade text,
  risk_flags jsonb,
  key_metrics jsonb,
  benchmark_comparison jsonb,
  explanation text,
  recommended_actions jsonb,
  trend_factor numeric DEFAULT 1.0,
  created_at timestamptz
)

-- Mismo patrón para: cs_compliance_*, cs_documentation_*, cs_financial_*,
-- cs_cashflow_*, cs_buro_*, cs_network_*, cs_stability_*,
-- cs_operational_*, cs_fx_*, cs_guarantee_*, cs_benchmark_*,
-- cs_portfolio_*, cs_graph_*, cs_employee_*, cs_working_capital_*
```

#### Tablas Especializadas por Motor

```sql
-- Buró: detección de rotación de deuda
cs_buro_active_credits (application_id, credit_data jsonb)
cs_buro_consultations (application_id, consultation_data jsonb)
cs_buro_liquidated (application_id, liquidation_data jsonb)
cs_buro_hawk_checks (application_id, hawk_data jsonb)
cs_buro_debt_rotation (application_id, rotation_flags jsonb)

-- Network: detalle de contrapartes
cs_network_clients_detail (application_id, client_data jsonb)
cs_network_suppliers_detail (application_id, supplier_data jsonb)
cs_network_government (application_id, gov_data jsonb)
cs_network_financial_institutions (application_id, fi_data jsonb)
cs_network_products (application_id, product_data jsonb)

-- Operational: estructura corporativa
cs_operational_corporate (application_id, corporate_data jsonb)
cs_operational_rug (application_id, rug_data jsonb)
cs_operational_legal_incidents (application_id, incidents_data jsonb)
cs_operational_shareholders (application_id, shareholders_data jsonb)
cs_operational_fiscal_status (application_id, fiscal_data jsonb)

-- Financial: detalle de estados financieros
cs_financial_balance_detail (application_id, balance_data jsonb)
cs_financial_income_detail (application_id, income_data jsonb)
cs_financial_related_parties (application_id, rp_data jsonb)
cs_financial_balanza (application_id, balanza_data jsonb)
```

#### Trend Analysis Tables

```sql
cs_trend_timeseries (
  id uuid PK,
  application_id uuid,
  engine_name text,
  metric_name text,
  period text,
  value numeric,
  benchmark numeric,
  created_at timestamptz
)

cs_trend_results (
  id uuid PK,
  application_id uuid,
  engine_name text,
  metric_name text,
  direction text,
  speed text,
  classification text,
  change_percent numeric,
  slope numeric,
  r_squared numeric,
  projection jsonb,
  months_to_threshold int,
  threshold_value numeric,
  risk_flags jsonb,
  chart_config jsonb,
  created_at timestamptz
)

cs_trend_ai_narrative (
  id uuid PK,
  application_id uuid,
  executive_summary text,
  top_positive jsonb,
  top_negative jsonb,
  threshold_projections jsonb,
  recommendation text,
  created_at timestamptz
)

cs_trend_charts_config (
  id uuid PK,
  engine_name text,
  metric_name text,
  chart_type text,
  thresholds jsonb,
  higher_is_better boolean,
  y_axis_format text,
  brand_colors jsonb
)
```

#### Decision Layer Tables

```sql
cs_cross_analysis (
  id uuid PK,
  application_id uuid,
  cross_number int,
  cross_name text,
  engines_involved text[],
  pattern_detected boolean,
  severity text,
  interpretation text,
  recommended_action text,
  created_at timestamptz
)

cs_ai_analysis (
  id uuid PK,
  application_id uuid,
  risk_narrative text,
  top_risks jsonb,
  top_strengths jsonb,
  confidence_score numeric,
  hidden_risks jsonb,
  created_at timestamptz
)

cs_credit_limits (
  id uuid PK,
  application_id uuid,
  limit_by_flow numeric,
  limit_by_sales numeric,
  limit_by_ebitda numeric,
  limit_by_guarantee numeric,
  limit_by_portfolio numeric,
  final_limit numeric,
  binding_constraint text,
  explanation text,
  created_at timestamptz
)

cs_risk_matrix_results (
  id uuid PK,
  application_id uuid,
  gate1_result text, -- 'pass' | 'hard_stop'
  gate1_flags jsonb,
  gate2_result text, -- 'pass' | 'warning' | 'fail'
  gate2_semaphores jsonb,
  gate3_score numeric,
  gate3_breakdown jsonb,
  final_decision text, -- 'approved' | 'conditional' | 'committee' | 'rejected'
  created_at timestamptz
)

cs_decision_gates (application_id, gate_number, result, details jsonb)
cs_workflow_queue (application_id, assigned_to, level, sla_deadline, status)
cs_workflow_decisions (application_id, decision, decided_by, conditions jsonb)
cs_workflow_overrides (application_id, override_reason, approved_by)
cs_scenarios (application_id, scenario_type, results jsonb)
cs_covenants (application_id, covenant_type, threshold, status)
cs_covenant_monitoring (covenant_id, check_date, compliant boolean)
cs_review_schedule (application_id, frequency, next_review, triggers jsonb)
cs_policies (policy_name, config jsonb, effective_date, version)
cs_policy_versions (policy_id, old_config, new_config, changed_by)

-- Metadata
cs_metric_catalog (metric_name, label, description, source, formula, unit)
cs_metric_values (application_id, metric_name, value, benchmark, interpretation)
cs_metric_interpretations (application_id, metric_name, impact, flag)
cs_scoring_versions (version, model_config jsonb, active boolean)
cs_audit_log (application_id, action, details jsonb, user_id, created_at)
```

---

## Diseño de Frontend (Dashboard)

### Design System — Xending Brand

Todos los componentes usan las CSS variables del Brand Guide:

```css
:root {
  --primary: 213 67% 25%;           /* Azul oscuro Xending */
  --brand-1: 210 50% 18%;           /* Azul profundo */
  --brand-2: 174 54% 55%;           /* Teal */
  --background: 0 0% 98%;           /* Gris claro */
  --card: 0 0% 100%;                /* Blanco */
  --foreground: 215 25% 27%;        /* Texto */
  --status-success: 142 76% 36%;    /* Verde */
  --status-warning: 45 93% 47%;     /* Amarillo */
  --status-error: 0 84% 60%;        /* Rojo */
  --status-info: 213 67% 55%;       /* Azul medio */
  --radius: 0.5rem;
}
```

### Estructura de Páginas

```
/credit-scoring/
  ├── /applications              → Lista de solicitudes
  ├── /applications/new          → Nueva solicitud
  ├── /applications/:id          → Workspace del analista
  │   ├── /overview              → Resumen ejecutivo + 3 Gates
  │   ├── /engines               → 16 motores con scores individuales
  │   ├── /engines/:engineName   → Detalle de un motor
  │   ├── /trends                → Dashboard de tendencias (gráficos)
  │   ├── /crosses               → 20 cruces inteligentes
  │   ├── /ai-analysis           → Narrativa AI + escenarios
  │   ├── /credit-limit          → Cálculo de monto (5 límites)
  │   ├── /decision              → Decisión final + workflow
  │   └── /report                → PDF preview + generación
  ├── /portfolio                 → Vista de cartera
  ├── /policies                  → Configuración de políticas
  └── /benchmarks                → Gestión de benchmarks
```

### Componentes Principales

#### 1. ApplicationOverview — Resumen Ejecutivo

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo Xending]  Credit Scoring — Empresa XYZ S.A. de C.V.     │
│  RFC: XXXX000000XXX  │  Solicitud: $2,500,000 MXN  │  24 meses │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Score    │  │ Decisión │  │ Monto    │  │ DSCR     │       │
│  │  72/100  │  │ COND.    │  │ $1.8M   │  │  1.35x   │       │
│  │  ████░░  │  │ 🟡       │  │ (de $2.5M)│ │  ████░   │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  3 GATES:                                                       │
│  Gate 1 (Hard Stops): ✅ Passed                                 │
│  Gate 2 (Semáforo):   🟢🟢🟡🟢🟡🟢                            │
│  Gate 3 (Score):      72/100 — Aprobado Condicionado            │
│                                                                 │
│  Top Riesgos:          Top Fortalezas:                          │
│  ⚠️ DSO creciendo      ✅ Ventas estables                       │
│  ⚠️ CCC > 60 días      ✅ Score buró 720                        │
│  ⚠️ Concentración 42%  ✅ DSCR 1.35x                            │
└─────────────────────────────────────────────────────────────────┘
```

#### 2. EngineScoreCard — Tarjeta por Motor

```
┌─────────────────────────────────┐
│  ⚙️ SAT/Facturación  14%       │
│  Score: 78/100  Grade: B        │
│  Tendencia: ↗ Mejorando (A)     │
│  ████████████████░░░░  78%      │
│                                 │
│  Flags: ⚠️ high_cancellation    │
│  [Ver detalle →]                │
└─────────────────────────────────┘
```

#### 3. TrendChart — Gráfico de Tendencia por Métrica

Usa Recharts con colores Xending:

```
Colores del gráfico:
- Línea data real:    hsl(213, 67%, 25%)  → Primary azul oscuro
- Línea proyección:   hsl(174, 54%, 55%)  → Teal punteada
- Línea benchmark:    hsl(215, 16%, 47%)  → Gris muted
- Zona OK:            hsl(142, 76%, 96%)  → Verde claro
- Zona warning:       hsl(45, 93%, 95%)   → Amarillo claro
- Zona critical:      hsl(0, 84%, 96%)    → Rojo claro
- Fondo:              hsl(0, 0%, 100%)    → Blanco card
```

Cada TrendChart muestra:
- Serie temporal real (línea sólida azul oscuro)
- Proyección (línea punteada teal)
- Benchmark industria (línea gris)
- Zonas de umbral (coloreadas)
- Clasificación A-F
- Meses para cruzar umbral crítico
- Mini narrativa AI debajo

#### 4. CrossAnalysisView — Cruces Inteligentes

```
┌─────────────────────────────────────────────────────────────┐
│  Cruce 11: Rotación de Deuda                    🔴 CRÍTICO │
│  Motores: Buró Engine                                       │
│                                                             │
│  Patrón detectado: 4 créditos activos, 5 consultas en 3m,  │
│  monto vigente/original = 92%                               │
│                                                             │
│  Interpretación: Le está dando vuelta al dinero             │
│  Acción: Rechazo o monto muy reducido + garantía reforzada  │
└─────────────────────────────────────────────────────────────┘
```

#### 5. CreditLimitBreakdown — Desglose de Monto

```
┌─────────────────────────────────────────────────────────────┐
│  Cálculo de Monto Máximo                                    │
│                                                             │
│  Por flujo (DSCR):     ████████████████████  $3.2M          │
│  Por ventas (20%):     ██████████████████████████  $4.5M    │
│  Por EBITDA (2x):      ███████████████████████  $3.8M       │
│  Por garantía (2:1):   ███████████████  $1.8M  ← BINDING   │
│  Por portafolio:       ██████████████████████████████  $8M  │
│                                                             │
│  Monto aprobado: $1,800,000 MXN                             │
│  Limitado por: Garantía (cobertura 2:1 con haircut 40%)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Estructura de Archivos del Proyecto

```
src/
├── features/
│   └── credit-scoring/
│       ├── components/
│       │   ├── ApplicationOverview.tsx
│       │   ├── EngineScoreCard.tsx
│       │   ├── EngineDetailView.tsx
│       │   ├── TrendChart.tsx
│       │   ├── TrendDashboard.tsx
│       │   ├── CrossAnalysisView.tsx
│       │   ├── CreditLimitBreakdown.tsx
│       │   ├── RiskMatrixGates.tsx
│       │   ├── AIAnalysisPanel.tsx
│       │   ├── DecisionWorkflow.tsx
│       │   ├── ApplicationList.tsx
│       │   ├── NewApplicationForm.tsx
│       │   └── ScoringReport.tsx
│       │
│       ├── hooks/
│       │   ├── useApplication.ts
│       │   ├── useEngineResults.ts
│       │   ├── useTrends.ts
│       │   ├── useCrossAnalysis.ts
│       │   ├── useDecision.ts
│       │   └── useCreditLimit.ts
│       │
│       ├── lib/
│       │   ├── trendUtils.ts          ← Librería compartida de tendencias
│       │   ├── engineRunner.ts        ← Ejecutor de motores
│       │   ├── crossAnalyzer.ts       ← 20 cruces inteligentes
│       │   ├── scoreCalculator.ts     ← Cálculo de score consolidado
│       │   └── chartColors.ts         ← Colores Xending para gráficos
│       │
│       ├── engines/                   ← Lógica de cada motor
│       │   ├── compliance.ts
│       │   ├── satFacturacion.ts
│       │   ├── documentation.ts
│       │   ├── financial.ts
│       │   ├── cashflow.ts
│       │   ├── workingCapital.ts
│       │   ├── buro.ts
│       │   ├── network.ts
│       │   ├── stability.ts
│       │   ├── operationalRisk.ts
│       │   ├── fxRisk.ts
│       │   ├── guarantee.ts
│       │   ├── benchmark.ts
│       │   ├── portfolio.ts
│       │   ├── graphFraud.ts
│       │   └── employee.ts
│       │
│       ├── decision/                  ← Motores de decisión
│       │   ├── aiRisk.ts
│       │   ├── creditLimit.ts
│       │   ├── riskMatrix.ts
│       │   ├── reviewFrequency.ts
│       │   ├── policyEngine.ts
│       │   ├── scenarioEngine.ts
│       │   ├── covenantEngine.ts
│       │   └── decisionWorkflow.ts
│       │
│       ├── api/                       ← Clientes de APIs externas
│       │   ├── scoryClient.ts
│       │   ├── syntageClient.ts
│       │   └── apiCache.ts
│       │
│       ├── types/                     ← Tipos TypeScript
│       │   ├── engine.types.ts
│       │   ├── trend.types.ts
│       │   ├── application.types.ts
│       │   ├── decision.types.ts
│       │   ├── scory.types.ts
│       │   └── syntage.types.ts
│       │
│       └── pages/
│           ├── CreditScoringLayout.tsx
│           ├── ApplicationsPage.tsx
│           ├── WorkspacePage.tsx
│           ├── TrendsPage.tsx
│           ├── CrossesPage.tsx
│           ├── DecisionPage.tsx
│           └── ReportPage.tsx

supabase/
├── migrations/
│   ├── 001_cs_applications.sql
│   ├── 002_cs_engine_tables.sql
│   ├── 003_cs_trend_tables.sql
│   ├── 004_cs_decision_tables.sql
│   ├── 005_cs_metadata_tables.sql
│   └── 006_cs_rls_policies.sql
│
└── functions/
    ├── cs-orchestrator/
    ├── cs-engine-runner/
    ├── cs-trend-analyzer/
    ├── cs-scory-proxy/
    ├── cs-syntage-proxy/
    └── cs-report-generator/
```

---

## Seguridad y Roles

### Row Level Security (RLS)

```sql
-- Roles del sistema
-- analyst: puede crear solicitudes, ver resultados, no puede aprobar > $500K
-- manager: puede aprobar hasta $2M, ver todo
-- committee: puede aprobar cualquier monto, override
-- admin: configurar políticas, benchmarks, gestión completa

-- Ejemplo RLS para cs_applications
CREATE POLICY "analysts_own_applications" ON cs_applications
  FOR SELECT USING (
    auth.uid() = created_by
    OR auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

-- Todas las tablas cs_* tienen RLS habilitado
-- Los datos de scoring son sensibles: solo usuarios autorizados
```

### API Keys

```
SCORY_API_KEY          → env variable, nunca en código
SYNTAGE_API_KEY        → env variable, nunca en código
OPENAI_API_KEY         → env variable, para AI Risk Engine
SUPABASE_SERVICE_KEY   → solo en Edge Functions
```

---

## Score Consolidado — Pesos y Cálculo

```typescript
const SCORE_WEIGHTS: Record<string, number> = {
  cashflow: 0.16,
  sat_facturacion: 0.14,
  financial: 0.11,
  buro: 0.10,
  stability: 0.09,
  operational: 0.09,
  network: 0.08,
  fx_risk: 0.07,
  portfolio: 0.05,
  working_capital: 0.04,
  documentation: 0.04,
  employee: 0.03,
  // Total: 1.00
};

// Gates (no pesan pero bloquean):
// compliance, guarantee, graph_fraud

function calculateConsolidatedScore(
  engineResults: Record<string, EngineOutput>,
  trendResults: Record<string, TrendResult[]>
): number {
  let totalScore = 0;

  for (const [engine, weight] of Object.entries(SCORE_WEIGHTS)) {
    const result = engineResults[engine];
    const trendFactor = calculateTrendFactor(trendResults[engine]);
    const adjustedScore = result.module_score * trendFactor;
    totalScore += adjustedScore * weight;
  }

  return Math.round(totalScore * 100) / 100;
}
```

---

## Decisión Final — Reglas

```
Score >= 75 + sin alertas + cobertura OK     → APROBADO
Score 60-74 + garantías + covenants posibles  → APROBADO CONDICIONADO
Score 50-74 + cruces complejos                → COMITÉ
Score < 50 o hard stop                        → RECHAZADO

Routing por monto:
< $500K + score alto + sin alertas → Auto-approve (analista)
$500K - $2M                        → Manager
> $2M                              → Comité

SLA:
Auto-decisiones: 24h
Analista: 48h
Comité: 72h
```

---

## Fases de Implementación

### Fase 1: Core Engines + trendUtils (8-10 semanas)
- Infraestructura: DB migrations, types, API clients, trendUtils
- Compliance Engine (Scory integration)
- SAT/Facturación Engine (Syntage integration) + tendencias
- Buró Engine (Syntage) + rotación de deuda + tendencias
- Documentation Engine
- Financial Engine + balance/income detail + tendencias
- Frontend: ApplicationList, NewApplicationForm, EngineScoreCards básicos

### Fase 2: Advanced Analysis + Trend Graphs (6-8 semanas)
- CashFlow Engine + tendencias DSCR
- Working Capital Engine (CCC, aging) + tendencias
- Business Stability Engine + tendencias
- Network Engine + gobierno, productos + tendencias
- Guarantee Engine
- FX Risk Engine
- Employee Engine + tendencias
- Frontend: TrendDashboard, TrendCharts, EngineDetailView

### Fase 3: Decision Layer + AI Narrative (4-6 semanas)
- AI Risk Engine (OpenAI integration + trend narrative)
- Credit Limit Engine (5 límites)
- Risk Matrix Engine (3 Gates)
- Review Frequency Engine
- Policy Engine
- Frontend: RiskMatrixGates, CreditLimitBreakdown, AIAnalysisPanel, DecisionWorkflow

### Fase 4: Portfolio, Fraud, Dashboard Completo (4-6 semanas)
- Portfolio Engine
- Graph Fraud Engine
- Scenario Engine
- Covenant Engine
- Cross-validation Syntage ratios
- Frontend: CrossAnalysisView, ScoringReport (PDF), Portfolio view
- Dashboard de tendencias interactivo completo

---

## Consideraciones Técnicas

### Performance
- Motores independientes se ejecutan en paralelo donde no hay dependencias
- Cache de Syntage/Scory por 24h para evitar llamadas repetidas
- React Query con staleTime apropiado para datos de scoring
- Lazy loading de páginas del dashboard

### Escalabilidad
- Edge Functions escalan automáticamente con Supabase
- Cada motor es una función independiente, se puede escalar por separado
- DB indexes en application_id, rfc, created_at para queries frecuentes

### Auditabilidad
- Cada cálculo se guarda con inputs, fórmula y resultado
- Versión del modelo de scoring por solicitud
- Historial inmutable de cambios de score
- Retención mínima 10 años

### Mantenibilidad
- Agregar motor nuevo: implementar EngineOutput interface + registrar en orchestrator
- Cambiar pesos: actualizar Policy Engine (sin deploy)
- Cambiar umbrales: actualizar Policy Engine (sin deploy)
- A/B testing: múltiples scoring_versions activas simultáneamente
