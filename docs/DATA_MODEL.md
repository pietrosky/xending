# Xending Platform — Modelo de Datos Completo

## Convenciones
- Todas las tablas usan prefijo `cs_`
- UUIDs como primary keys
- `tenant_id` en tablas compartidas (default 'xending')
- `created_at` / `updated_at` en todas las tablas
- JSONB para datos flexibles y payloads de providers

---

## Infraestructura (I01-I04)

### I01: Data Layer Compartido

```
cs_companies
  id uuid pk
  tenant_id text default 'xending'
  rfc text not null
  legal_name text not null
  trade_name text
  business_activity text
  tax_regime text
  incorporation_date date
  address jsonb
  syntage_entity_id text
  scory_entity_id text
  status text default 'active'
  metadata jsonb default '{}'
  created_at timestamptz
  updated_at timestamptz
  UNIQUE(tenant_id, rfc)

cs_company_contacts
  id uuid pk
  company_id uuid fk → cs_companies
  contact_type text (email, phone, legal_rep)
  contact_value text
  contact_name text
  is_primary boolean
  created_at timestamptz
```

```
cs_provider_data
  id uuid pk
  company_id uuid fk → cs_companies
  provider text (syntage, scory, manual)
  data_type text (invoices, tax_returns, buro_report, tax_status,
                  compliance_opinion, pld_check, hawk_checks, insights,
                  accounting, financial_statements)
  data_payload jsonb
  extraction_id text
  fetched_at timestamptz
  expires_at timestamptz
  status text (fresh, stale, refreshing, error)
  triggered_by text
  created_at timestamptz
  updated_at timestamptz
```

### I02: Module Registry

```
cs_modules
  id text pk (M01, M02, etc.)
  name text
  group_code text (A, B, C, D, E, F, I)
  group_name text
  description text
  version text
  status text (available, beta, deprecated)
  dependencies text[]
  default_config jsonb
  created_at timestamptz

cs_tenant_modules
  id uuid pk
  tenant_id text
  module_id text fk → cs_modules
  is_active boolean
  config_overrides jsonb
  activated_at timestamptz
  UNIQUE(tenant_id, module_id)

cs_module_config
  id uuid pk
  tenant_id text
  module_id text
  config_key text
  config_value jsonb
  description text
  updated_by text
  updated_at timestamptz
  UNIQUE(tenant_id, module_id, config_key)
```

### I03: Event Bus

```
cs_platform_events
  id uuid pk
  tenant_id text default 'xending'
  event_type text
  source_module text
  entity_type text (expediente, company, credit)
  entity_id uuid
  payload jsonb
  processed boolean default false
  created_at timestamptz
```

### I04: Tenant Management

```
cs_tenants
  id text pk (xending, sofom_xyz)
  name text
  legal_name text
  branding jsonb
  config jsonb
  status text (active, suspended, trial)
  plan text (trial, basic, pro, enterprise)
  created_at timestamptz
  updated_at timestamptz
```

---

## M02: Expediente Digital (YA EXISTE — migración 030)

```
cs_expedientes
  id uuid pk
  folio text unique (XND-YYYY-NNNNN, auto-generado)
  rfc text
  company_name text
  requested_amount numeric(15,2)
  currency text (MXN, USD)
  credit_purpose text
  declared_annual_revenue numeric(15,2)
  declared_business_age numeric(4,1)
  term_days integer (2-90)
  stage text (pre_filter, pld_check, buro_authorization, sat_linkage,
              analysis, documentation, decision, approved, rejected,
              expired, manual_review)
  rejection_reason text
  rejected_at_stage text
  contact_email text
  contact_phone text
  legal_representative text
  syntage_entity_id text
  application_id uuid fk → cs_applications
  pre_filter_score numeric(5,2)
  buro_score numeric(5,1)
  pld_score numeric(5,2)
  metadata jsonb
  created_at timestamptz
  updated_at timestamptz

  -- Campos a agregar para M01 Onboarding:
  company_id uuid fk → cs_companies
  declared_monthly_sales_mxn numeric(15,2)
  business_activity text
  pre_filter_result text (approved, review, rejected)
  minimum_required_sales_mxn numeric(15,2)
  coverage_ratio numeric(5,4)
  source text (digital_onboarding, internal, referral)
  tenant_id text default 'xending'

cs_expediente_tokens
  id uuid pk
  expediente_id uuid fk → cs_expedientes
  token uuid unique (va en la URL)
  purpose text (buro_signature, ciec_linkage, document_upload, general_access)
  expires_at timestamptz
  is_used boolean
  access_count integer
  last_accessed_at timestamptz
  created_at timestamptz

cs_expediente_events
  id uuid pk
  expediente_id uuid fk → cs_expedientes
  event_type text
  stage text
  description text
  data jsonb
  actor text (system, analyst:id, applicant:token_id)
  created_at timestamptz

cs_business_rules
  id uuid pk
  rule_key text unique
  rule_value jsonb
  description text
  updated_by text
  updated_at timestamptz
```

---

## M03: Scoring (YA EXISTE — migraciones 001-028)

```
cs_applications (001)
  id uuid pk
  rfc text
  company_name text
  requested_amount numeric
  term_months int
  currency text
  status text (pending_scoring, scoring_in_progress, scored,
               approved, conditional, committee, rejected)
  scoring_version text
  created_by uuid
  created_at timestamptz
  updated_at timestamptz

cs_application_status_log (001)
  id uuid pk
  application_id uuid fk → cs_applications
  old_status text
  new_status text
  changed_by uuid
  reason text
  created_at timestamptz
```

Tablas de engines (cada engine tiene sus propias tablas):
- `cs_sat_*` (005) — Datos SAT procesados
- `cs_buro_*` (006) — Datos Buró procesados
- `cs_documentation_*` (007) — Checklist documental
- `cs_financial_*` (008) — Datos financieros procesados
- `cs_cashflow_*` (010) — Flujo de efectivo
- `cs_working_capital_*` (011) — Capital de trabajo
- `cs_stability_*` (012) — Estabilidad
- `cs_network_*` (013) — Red de clientes/proveedores
- `cs_guarantee_*` (014) — Garantías
- `cs_fx_*` (015) — Riesgo cambiario
- `cs_employee_*` (016) — Empleados
- `cs_ai_*` (017) — AI Risk
- `cs_credit_limits_*` (018) — Límites de crédito
- `cs_risk_matrix_*` (019) — Matriz de riesgo
- `cs_review_*` (020) — Frecuencia de revisión
- `cs_policies_*` (021) — Políticas
- `cs_workflow_*` (022) — Workflow de decisión
- `cs_portfolio_*` (023) — Portafolio
- `cs_scenarios_*` (025) — Escenarios
- `cs_covenants_*` (026) — Covenants
- `cs_cross_analysis_*` (027) — Cruces inteligentes
- `cs_benchmark_*` (028) — Benchmarks

Tablas de soporte:
- `cs_api_calls` (002) — Log de llamadas a APIs
- `cs_api_cache` (002) — Cache de respuestas
- `cs_metric_catalog` (003) — Catálogo de métricas
- `cs_metric_values` (003) — Valores de métricas por application
- `cs_scoring_versions` (003) — Versiones del scoring
- `cs_audit_log` (003) — Log de auditoría
- `cs_trend_*` (009) — Datos de tendencias

---

## Tablas futuras por módulo

### M05: Contratos
```
cs_document_templates
cs_generated_documents
cs_document_signatures
```

### M06: KYB
```
cs_kyb_checks
cs_kyb_results
cs_kyb_ai_reports
```

### M07: Listas Negras
```
cs_blacklist_checks
cs_blacklist_hits
cs_blacklist_decisions
```

### M08: Monitoreo PLD
```
cs_pld_monitoring_schedule
cs_pld_monitoring_runs
cs_pld_monitoring_results
cs_pld_alerts
cs_pld_alert_actions
```

### M09: Compliance Officer
```
cs_compliance_reviews
cs_compliance_decisions
cs_compliance_reports
cs_compliance_config
```

### M10: Portal Empresa
```
cs_portal_accounts
cs_portal_preferences
cs_portal_alerts
cs_company_metrics
```

### M11: Cobranza
```
cs_collections_snapshots
cs_collections_invoices
cs_collections_alerts
cs_collections_config
```

### M12: Gestor de Cartera
```
cs_active_credits
cs_credit_monitoring
cs_credit_alerts
cs_portfolio_reports
cs_portfolio_snapshots
```

### M13: Covenant Tracking
```
cs_covenant_definitions
cs_covenant_checks
cs_covenant_violations
cs_covenant_waivers
```

### M14: Agente Conversacional
```
cs_agent_conversations
cs_agent_queries
cs_agent_actions
```

---

## Diagrama de relaciones principales

```
cs_tenants
  │
  ├── cs_companies (tenant_id)
  │     ├── cs_company_contacts
  │     ├── cs_provider_data
  │     └── cs_expedientes (company_id)
  │           ├── cs_expediente_tokens
  │           ├── cs_expediente_events
  │           └── cs_applications (application_id)
  │                 ├── cs_application_status_log
  │                 ├── cs_[engine]_* (resultados por engine)
  │                 ├── cs_metric_values
  │                 └── cs_cross_analysis_*
  │
  ├── cs_tenant_modules (tenant_id)
  ├── cs_module_config (tenant_id)
  └── cs_platform_events (tenant_id)

cs_modules (catálogo global, no por tenant)
cs_business_rules (configurables, futuro: por tenant)
```
