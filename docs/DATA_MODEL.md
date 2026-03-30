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

## M12: Gestor de Cartera (DISEÑO COMPLETO — POR CONSTRUIR)

Diseño detallado en: docs/modules/M12_PORTFOLIO_MANAGER_V2.md

```
cs_credit_products                    -- Catálogo de productos por tenant
  id, tenant_id, product_code, product_name, product_type
  disbursement_currencies, payment_currencies, allows_cross_currency
  default_annual_rate, rate_type, rate_determination_rule
  min_term_days, max_term_days, amortization_type, allows_partial_payments
  moratory_rate_monthly, moratory_has_iva
  opening_commission_pct, annual_commission_pct, disbursement_commission_pct
  requires_signature, contract_template_code
  max_line_amount, max_line_currency, line_type
  is_active, phase
  UNIQUE(tenant_id, product_code)

cs_credit_lines                       -- Líneas de crédito aprobadas
  id, tenant_id, company_id, product_id
  line_category (authorized, service)  -- con o sin estudio de crédito
  expediente_id (null si service)      -- solo para líneas autorizadas
  approved_amount, currency, available_amount
  start_date, expiry_date, annual_renewal_date
  interest_rate_override, status, suspension_reason
  conditions jsonb, line_contract_id
  approved_by, approved_at

cs_credit_operations                  -- Disposiciones individuales
  id, credit_line_id, product_id, operation_number
  operation_type (standard, intraday)
  settlement_type (credit, client_funded)
  amount, disbursement_currency, payment_currency
  -- FX fields
  is_fx_operation, fx_rate_agreed, fx_rate_market, fx_payment_amount, fx_spread_gain
  -- Tasa e intereses
  annual_rate, rate_determination, interest_amount, iva_on_interest
  moratory_rate_monthly, moratory_amount, iva_on_moratory, moratory_days
  commission_amount, commission_type
  -- Plazos
  disbursement_date, maturity_date, term_days
  -- Estado
  status (pending_authorization, pending_signature, pending_disbursement,
          pending_client_funding, client_funded, executed,
          active, paid, paid_early, overdue, defaulted, cancelled, expired_unfunded)
  -- Contrato y firma
  contract_id, authorization_id, requires_signature, docusign_envelope_id
  -- Pago
  paid_at, paid_amount, paid_currency, payment_reference
  client_funded_at, client_funded_amount, client_funded_reference
  total_payable

cs_operation_alerts                   -- Alertas de vencimiento programadas
  id, operation_id, alert_type, alert_date, days_before_maturity
  status, sent_at, sent_to, channel, message_template

cs_collection_contacts                -- Registro de gestiones de cobranza
  id, operation_id, contact_date, contact_type, contact_by
  contact_result, promise_date, promise_amount, notes
  next_action, next_action_date

cs_portfolio_classification           -- Calificación de cartera (snapshot mensual)
  id, tenant_id, snapshot_date
  total_portfolio, performing_portfolio, non_performing_portfolio
  imor, icor
  grade_a1 through grade_e amounts
  total_reserves
  concentration_by_client/sector/currency/product jsonb
  avg_term_days, avg_rate, total_fx_gain, total_interest_earned

cs_portfolio_daily_position           -- Posición diaria para dashboard
  id, tenant_id, position_date
  active_lines, active_operations
  total_approved, total_utilized, total_available, utilization_pct
  performing, non_performing, imor
  maturing_today, maturing_7_days, maturing_30_days
  total_usd, total_mxn
```

## M17: Comité y Facultades (POR CONSTRUIR)

```
cs_authorization_requests
  id, tenant_id, entity_type, entity_id
  authorization_type (credit_line, service_operation, renewal)
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
