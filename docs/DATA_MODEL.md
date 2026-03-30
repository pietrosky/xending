# Xending Platform — Modelo de Datos Completo

## Convenciones
- Prefijo `cs_` en todas las tablas
- UUIDs como primary keys
- `tenant_id` en tablas compartidas (default 'xending')
- `created_at` / `updated_at` en todas las tablas
- JSONB para datos flexibles

---

## I01: Data Layer Compartido

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
  metadata jsonb
  UNIQUE(tenant_id, rfc)

cs_company_contacts
  id uuid pk
  company_id uuid fk → cs_companies
  contact_type text
  contact_value text
  contact_name text
  is_primary boolean

cs_data_extractions
  id uuid pk
  company_id uuid fk → cs_companies
  provider text (syntage, scory, manual, erp, banking)
  extraction_type text (full, incremental, point_in_time)
  triggered_by text
  syntage_extraction_id text
  status text (running, completed, failed, partial)
  started_at, completed_at timestamptz
  data_types_extracted text[]
  period_from date, period_to date

cs_provider_data (datos granulares por empresa + tipo + periodo)
  id uuid pk
  company_id uuid fk → cs_companies
  extraction_id uuid fk → cs_data_extractions
  provider text
  data_type text (invoices_issued, tax_return_annual, buro_report, etc.)
  period_key text ('2024-01' mensual, '2024' anual, '2026-03-15' puntual)
  period_type text (monthly, quarterly, annual, point_in_time)
  data_payload jsonb
  record_count int
  extracted_at timestamptz
  superseded_by uuid (si se re-extrajo, apunta al nuevo)
  is_current boolean (true = versión vigente de este periodo)
```

## I02-I05: Infraestructura

```
cs_modules                    -- Catálogo de módulos (I02)
cs_tenant_modules             -- Módulos activos por tenant (I02)
cs_module_config              -- Configuración por tenant/módulo (I02)
cs_platform_events            -- Event bus (I03)
cs_tenants                    -- Tenants/instituciones (I04)
cs_scheduled_events           -- Eventos programados (I05)
```

## M02: Expediente (YA EXISTE — migración 030)

```
cs_expedientes                -- Expediente principal (folio auto)
cs_expediente_tokens          -- Tokens de acceso por link
cs_expediente_events          -- Audit log inmutable
cs_business_rules             -- Reglas configurables
```

Campos a agregar: company_id, declared_monthly_sales_mxn,
business_activity, pre_filter_result, coverage_ratio, source, tenant_id

## M03: Scoring (YA EXISTE — migraciones 001-028)

```
cs_applications               -- Solicitudes de scoring (001)
cs_application_status_log     -- Log de cambios de status
cs_sat_*                      -- Datos SAT procesados (005)
cs_buro_*                     -- Datos Buró procesados (006)
cs_documentation_*            -- Checklist documental (007)
cs_financial_*                -- Datos financieros (008)
cs_trend_*                    -- Tendencias (009)
cs_cashflow_*                 -- Flujo de efectivo (010)
cs_working_capital_*          -- Capital de trabajo (011)
cs_stability_*                -- Estabilidad (012)
cs_network_*                  -- Red clientes/proveedores (013)
cs_guarantee_*                -- Garantías (014)
cs_fx_*                       -- Riesgo cambiario (015)
cs_employee_*                 -- Empleados (016)
cs_ai_*                       -- AI Risk (017)
cs_credit_limits_*            -- Límites de crédito (018)
cs_risk_matrix_*              -- Matriz de riesgo (019)
cs_review_*                   -- Frecuencia revisión (020)
cs_policies_*                 -- Políticas (021)
cs_workflow_*                 -- Workflow decisión (022)
cs_portfolio_*                -- Portafolio (023)
cs_scenarios_*                -- Escenarios (025)
cs_covenants_*                -- Covenants (026)
cs_cross_analysis_*           -- Cruces inteligentes (027)
cs_benchmark_*                -- Benchmarks (028)
cs_api_calls, cs_api_cache    -- API tracking (002)
cs_metric_catalog/values      -- Métricas (003)
cs_scoring_versions           -- Versiones scoring (003)
cs_audit_log                  -- Auditoría (003)
```

## M05: Contratos (POR CONSTRUIR)

```
cs_document_templates         -- Templates por tipo y tenant
cs_generated_documents        -- Documentos generados (PDF, DocuSign)
```

## M12: Gestor de Cartera (POR CONSTRUIR)

```
cs_credit_lines
  id, tenant_id, company_id, expediente_id
  approved_amount, currency, available_amount
  line_type (revolving, single)
  start_date, expiry_date, annual_renewal_date
  interest_rate, status, conditions jsonb

cs_credit_operations
  id, credit_line_id
  operation_type (standard, intraday)
  amount, currency, disbursement_date, maturity_date, term_days
  interest_rate, status
  contract_id fk → cs_generated_documents
  authorization_id fk → cs_authorization_requests
  requires_signature boolean
  docusign_envelope_id
  paid_at, paid_amount
```

## M17: Comité y Facultades (POR CONSTRUIR)

```
cs_authorization_requests
  id, tenant_id, entity_type, entity_id
  authorization_type (credit_line, intraday, renewal)
  amount, currency
  required_approvals, current_approvals, current_rejections
  status (pending, approved, rejected, expired)
  summary jsonb, expires_at, resolved_at

cs_authorization_votes
  id, request_id, voter_id, voter_name
  vote (approve, reject), comment, voted_at
```

## Tablas futuras por módulo

```
M03c: cs_financial_uploads, cs_financial_extractions, cs_financial_schemas
M06:  cs_kyb_checks, cs_kyb_results, cs_kyb_ai_reports
M07:  cs_blacklist_checks, cs_blacklist_hits, cs_blacklist_decisions
M08:  cs_pld_monitoring_schedule/runs/results, cs_pld_alerts
M09:  cs_compliance_reviews/decisions/reports/config
M10:  cs_portal_accounts/preferences/alerts, cs_company_metrics
M11:  cs_collections_snapshots/invoices/alerts/config
M13:  cs_covenant_definitions/checks/violations/waivers
M14:  cs_agent_conversations/queries/actions
M16:  cs_bank_accounts, cs_bank_transactions, cs_payment_reconciliation
```

## Relaciones principales

```
cs_tenants
  └── cs_companies (tenant_id)
        ├── cs_company_contacts
        ├── cs_provider_data
        ├── cs_credit_lines
        │     └── cs_credit_operations
        │           └── cs_generated_documents
        └── cs_expedientes (company_id)
              ├── cs_expediente_tokens
              ├── cs_expediente_events
              ├── cs_authorization_requests
              │     └── cs_authorization_votes
              └── cs_applications
                    └── cs_[engine]_* (resultados)
```
