-- ============================================================================
-- 040_role_permissions.sql
-- Correct permissions for admin and broker roles
--
-- Admin: full CRUD on all tables across all schemas
-- Broker: read/write on FX + payment tables, read-only on scoring/compliance
-- Both: can call RPC functions (login, etc.)
-- ============================================================================

-- ─── Ensure roles exist ──────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'broker') THEN
    CREATE ROLE broker NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin NOLOGIN;
  END IF;
END $$;

-- Allow authenticator to switch to these roles
GRANT broker TO authenticator;
GRANT admin TO authenticator;

-- ─── Schema-level access ─────────────────────────────────────────────

GRANT USAGE ON SCHEMA public     TO admin, broker;
GRANT USAGE ON SCHEMA archive    TO admin, broker;
GRANT USAGE ON SCHEMA auth       TO admin, broker;
GRANT USAGE ON SCHEMA extensions TO admin, broker;

-- ═════════════════════════════════════════════════════════════════════
-- ADMIN — full access to everything
-- ═════════════════════════════════════════════════════════════════════

-- public
GRANT ALL ON ALL TABLES    IN SCHEMA public TO admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO admin;

-- archive
GRANT ALL ON ALL TABLES    IN SCHEMA archive TO admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA archive TO admin;

-- Future tables auto-grant
ALTER DEFAULT PRIVILEGES IN SCHEMA public  GRANT ALL ON TABLES    TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public  GRANT ALL ON SEQUENCES TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public  GRANT ALL ON ROUTINES  TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA archive GRANT ALL ON TABLES    TO admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA archive GRANT ALL ON SEQUENCES TO admin;

-- ═════════════════════════════════════════════════════════════════════
-- BROKER — scoped access
-- ═════════════════════════════════════════════════════════════════════

-- ─── FX tables: full CRUD ────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON fx_transactions              TO broker;
GRANT SELECT, INSERT, UPDATE, DELETE ON cs_companies                 TO broker;
GRANT SELECT, INSERT, UPDATE, DELETE ON cs_companies_owners          TO broker;
GRANT SELECT, INSERT, UPDATE, DELETE ON cs_company_contacts          TO broker;
GRANT SELECT, INSERT, UPDATE, DELETE ON cs_company_payment_accounts  TO broker;
GRANT SELECT, INSERT, UPDATE, DELETE ON pi_accounts                  TO broker;

-- Sequences for inserts
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO broker;

-- ─── Auth / users: read own data ─────────────────────────────────────
GRANT SELECT ON local_users TO broker;

-- ─── Credit scoring tables: read-only ────────────────────────────────
GRANT SELECT ON cs_applications            TO broker;
GRANT SELECT ON cs_application_status_log  TO broker;
GRANT SELECT ON cs_scoring_versions        TO broker;
GRANT SELECT ON cs_expedientes             TO broker;
GRANT SELECT ON cs_expediente_tokens       TO broker;
GRANT SELECT ON cs_expediente_events       TO broker;
GRANT SELECT ON cs_business_rules          TO broker;

-- ─── Scoring engine results: read-only ───────────────────────────────
GRANT SELECT ON cs_sat_data                    TO broker;
GRANT SELECT ON cs_sat_results                 TO broker;
GRANT SELECT ON cs_sat_metrics                 TO broker;
GRANT SELECT ON cs_buro_data                   TO broker;
GRANT SELECT ON cs_buro_results                TO broker;
GRANT SELECT ON cs_buro_analysis               TO broker;
GRANT SELECT ON cs_compliance_checks           TO broker;
GRANT SELECT ON cs_compliance_results          TO broker;
GRANT SELECT ON cs_financial_inputs            TO broker;
GRANT SELECT ON cs_financial_results           TO broker;
GRANT SELECT ON cs_cashflow_inputs             TO broker;
GRANT SELECT ON cs_cashflow_results            TO broker;
GRANT SELECT ON cs_working_capital_inputs      TO broker;
GRANT SELECT ON cs_working_capital_results     TO broker;
GRANT SELECT ON cs_stability_results           TO broker;
GRANT SELECT ON cs_network_results             TO broker;
GRANT SELECT ON cs_guarantee_results           TO broker;
GRANT SELECT ON cs_fx_results                  TO broker;
GRANT SELECT ON cs_employee_results            TO broker;
GRANT SELECT ON cs_ai_analysis                 TO broker;
GRANT SELECT ON cs_ai_recommendations          TO broker;
GRANT SELECT ON cs_credit_limits               TO broker;
GRANT SELECT ON cs_risk_matrix_results         TO broker;
GRANT SELECT ON cs_decision_gates              TO broker;
GRANT SELECT ON cs_cross_analysis              TO broker;
GRANT SELECT ON cs_benchmarks                  TO broker;
GRANT SELECT ON cs_benchmark_comparisons       TO broker;

-- ─── Portfolio / monitoring: read-only ───────────────────────────────
GRANT SELECT ON cs_portfolio_positions     TO broker;
GRANT SELECT ON cs_portfolio_results       TO broker;
GRANT SELECT ON cs_covenants               TO broker;
GRANT SELECT ON cs_covenant_monitoring     TO broker;
GRANT SELECT ON cs_policies                TO broker;
GRANT SELECT ON cs_trend_results           TO broker;
GRANT SELECT ON cs_trend_timeseries        TO broker;

-- ─── Metadata / catalog: read-only ──────────────────────────────────
GRANT SELECT ON cs_metric_catalog          TO broker;
GRANT SELECT ON cs_metric_values           TO broker;
GRANT SELECT ON cs_api_cache               TO broker;

-- ─── Archive: read-only ──────────────────────────────────────────────
GRANT SELECT ON ALL TABLES IN SCHEMA archive TO broker;

-- ─── Functions: both roles can call login and other RPCs ─────────────
GRANT EXECUTE ON FUNCTION login(TEXT, TEXT) TO admin, broker, anon;

-- ─── Future tables default privileges for broker ─────────────────────
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO broker;
