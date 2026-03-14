-- Credit Scoring: RLS Policies — Fase 2
-- Idempotent: uses DROP POLICY IF EXISTS before CREATE POLICY
--
-- Covers all Fase 2 engine tables:
--   010_cs_cashflow.sql, 011_cs_working_capital.sql, 012_cs_stability.sql,
--   013_cs_network.sql, 014_cs_guarantee.sql, 015_cs_fx.sql, 016_cs_employee.sql
--
-- Uses existing helper: cs_can_access_application(app_id uuid)
--
-- Pattern for application-linked tables:
--   SELECT/INSERT granted if user owns the parent cs_applications row OR has elevated role
--   UPDATE only for manager/committee/admin
--   DELETE only for admin
--
-- Special: cs_guarantee_haircuts is a config/reference table (not application-linked)


-- ============================================================
-- 1. CashFlow Engine Tables (all application-linked)
-- ============================================================

-- cs_cashflow_inputs
DROP POLICY IF EXISTS "cs_cashflow_inputs_select" ON cs_cashflow_inputs;
CREATE POLICY "cs_cashflow_inputs_select" ON cs_cashflow_inputs
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_cashflow_inputs_insert" ON cs_cashflow_inputs;
CREATE POLICY "cs_cashflow_inputs_insert" ON cs_cashflow_inputs
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_cashflow_inputs_update" ON cs_cashflow_inputs;
CREATE POLICY "cs_cashflow_inputs_update" ON cs_cashflow_inputs
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_cashflow_inputs_delete" ON cs_cashflow_inputs;
CREATE POLICY "cs_cashflow_inputs_delete" ON cs_cashflow_inputs
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_cashflow_calculations
DROP POLICY IF EXISTS "cs_cashflow_calc_select" ON cs_cashflow_calculations;
CREATE POLICY "cs_cashflow_calc_select" ON cs_cashflow_calculations
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_cashflow_calc_insert" ON cs_cashflow_calculations;
CREATE POLICY "cs_cashflow_calc_insert" ON cs_cashflow_calculations
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_cashflow_calc_update" ON cs_cashflow_calculations;
CREATE POLICY "cs_cashflow_calc_update" ON cs_cashflow_calculations
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_cashflow_calc_delete" ON cs_cashflow_calculations;
CREATE POLICY "cs_cashflow_calc_delete" ON cs_cashflow_calculations
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_cashflow_scenarios
DROP POLICY IF EXISTS "cs_cashflow_scenarios_select" ON cs_cashflow_scenarios;
CREATE POLICY "cs_cashflow_scenarios_select" ON cs_cashflow_scenarios
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_cashflow_scenarios_insert" ON cs_cashflow_scenarios;
CREATE POLICY "cs_cashflow_scenarios_insert" ON cs_cashflow_scenarios
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_cashflow_scenarios_update" ON cs_cashflow_scenarios;
CREATE POLICY "cs_cashflow_scenarios_update" ON cs_cashflow_scenarios
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_cashflow_scenarios_delete" ON cs_cashflow_scenarios;
CREATE POLICY "cs_cashflow_scenarios_delete" ON cs_cashflow_scenarios
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_cashflow_results
DROP POLICY IF EXISTS "cs_cashflow_results_select" ON cs_cashflow_results;
CREATE POLICY "cs_cashflow_results_select" ON cs_cashflow_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_cashflow_results_insert" ON cs_cashflow_results;
CREATE POLICY "cs_cashflow_results_insert" ON cs_cashflow_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_cashflow_results_update" ON cs_cashflow_results;
CREATE POLICY "cs_cashflow_results_update" ON cs_cashflow_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_cashflow_results_delete" ON cs_cashflow_results;
CREATE POLICY "cs_cashflow_results_delete" ON cs_cashflow_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 2. Working Capital Engine Tables (all application-linked)
-- ============================================================

-- cs_working_capital_inputs
DROP POLICY IF EXISTS "cs_wc_inputs_select" ON cs_working_capital_inputs;
CREATE POLICY "cs_wc_inputs_select" ON cs_working_capital_inputs
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_wc_inputs_insert" ON cs_working_capital_inputs;
CREATE POLICY "cs_wc_inputs_insert" ON cs_working_capital_inputs
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_wc_inputs_update" ON cs_working_capital_inputs;
CREATE POLICY "cs_wc_inputs_update" ON cs_working_capital_inputs
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_wc_inputs_delete" ON cs_working_capital_inputs;
CREATE POLICY "cs_wc_inputs_delete" ON cs_working_capital_inputs
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_working_capital_cycle
DROP POLICY IF EXISTS "cs_wc_cycle_select" ON cs_working_capital_cycle;
CREATE POLICY "cs_wc_cycle_select" ON cs_working_capital_cycle
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_wc_cycle_insert" ON cs_working_capital_cycle;
CREATE POLICY "cs_wc_cycle_insert" ON cs_working_capital_cycle
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_wc_cycle_update" ON cs_working_capital_cycle;
CREATE POLICY "cs_wc_cycle_update" ON cs_working_capital_cycle
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_wc_cycle_delete" ON cs_working_capital_cycle;
CREATE POLICY "cs_wc_cycle_delete" ON cs_working_capital_cycle
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_working_capital_aging
DROP POLICY IF EXISTS "cs_wc_aging_select" ON cs_working_capital_aging;
CREATE POLICY "cs_wc_aging_select" ON cs_working_capital_aging
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_wc_aging_insert" ON cs_working_capital_aging;
CREATE POLICY "cs_wc_aging_insert" ON cs_working_capital_aging
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_wc_aging_update" ON cs_working_capital_aging;
CREATE POLICY "cs_wc_aging_update" ON cs_working_capital_aging
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_wc_aging_delete" ON cs_working_capital_aging;
CREATE POLICY "cs_wc_aging_delete" ON cs_working_capital_aging
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_working_capital_results
DROP POLICY IF EXISTS "cs_wc_results_select" ON cs_working_capital_results;
CREATE POLICY "cs_wc_results_select" ON cs_working_capital_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_wc_results_insert" ON cs_working_capital_results;
CREATE POLICY "cs_wc_results_insert" ON cs_working_capital_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_wc_results_update" ON cs_working_capital_results;
CREATE POLICY "cs_wc_results_update" ON cs_working_capital_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_wc_results_delete" ON cs_working_capital_results;
CREATE POLICY "cs_wc_results_delete" ON cs_working_capital_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 3. Stability Engine Tables (all application-linked)
-- ============================================================

-- cs_stability_timeseries
DROP POLICY IF EXISTS "cs_stability_ts_select" ON cs_stability_timeseries;
CREATE POLICY "cs_stability_ts_select" ON cs_stability_timeseries
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_stability_ts_insert" ON cs_stability_timeseries;
CREATE POLICY "cs_stability_ts_insert" ON cs_stability_timeseries
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_stability_ts_update" ON cs_stability_timeseries;
CREATE POLICY "cs_stability_ts_update" ON cs_stability_timeseries
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_stability_ts_delete" ON cs_stability_timeseries;
CREATE POLICY "cs_stability_ts_delete" ON cs_stability_timeseries
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_stability_metrics
DROP POLICY IF EXISTS "cs_stability_metrics_select" ON cs_stability_metrics;
CREATE POLICY "cs_stability_metrics_select" ON cs_stability_metrics
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_stability_metrics_insert" ON cs_stability_metrics;
CREATE POLICY "cs_stability_metrics_insert" ON cs_stability_metrics
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_stability_metrics_update" ON cs_stability_metrics;
CREATE POLICY "cs_stability_metrics_update" ON cs_stability_metrics
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_stability_metrics_delete" ON cs_stability_metrics;
CREATE POLICY "cs_stability_metrics_delete" ON cs_stability_metrics
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_stability_results
DROP POLICY IF EXISTS "cs_stability_results_select" ON cs_stability_results;
CREATE POLICY "cs_stability_results_select" ON cs_stability_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_stability_results_insert" ON cs_stability_results;
CREATE POLICY "cs_stability_results_insert" ON cs_stability_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_stability_results_update" ON cs_stability_results;
CREATE POLICY "cs_stability_results_update" ON cs_stability_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_stability_results_delete" ON cs_stability_results;
CREATE POLICY "cs_stability_results_delete" ON cs_stability_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 4. Network Engine Tables (all application-linked)
-- ============================================================

-- cs_network_counterparties
DROP POLICY IF EXISTS "cs_network_counterparties_select" ON cs_network_counterparties;
CREATE POLICY "cs_network_counterparties_select" ON cs_network_counterparties
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_counterparties_insert" ON cs_network_counterparties;
CREATE POLICY "cs_network_counterparties_insert" ON cs_network_counterparties
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_counterparties_update" ON cs_network_counterparties;
CREATE POLICY "cs_network_counterparties_update" ON cs_network_counterparties
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_network_counterparties_delete" ON cs_network_counterparties;
CREATE POLICY "cs_network_counterparties_delete" ON cs_network_counterparties
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_network_metrics
DROP POLICY IF EXISTS "cs_network_metrics_select" ON cs_network_metrics;
CREATE POLICY "cs_network_metrics_select" ON cs_network_metrics
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_metrics_insert" ON cs_network_metrics;
CREATE POLICY "cs_network_metrics_insert" ON cs_network_metrics
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_metrics_update" ON cs_network_metrics;
CREATE POLICY "cs_network_metrics_update" ON cs_network_metrics
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_network_metrics_delete" ON cs_network_metrics;
CREATE POLICY "cs_network_metrics_delete" ON cs_network_metrics
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_network_concentration
DROP POLICY IF EXISTS "cs_network_concentration_select" ON cs_network_concentration;
CREATE POLICY "cs_network_concentration_select" ON cs_network_concentration
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_concentration_insert" ON cs_network_concentration;
CREATE POLICY "cs_network_concentration_insert" ON cs_network_concentration
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_concentration_update" ON cs_network_concentration;
CREATE POLICY "cs_network_concentration_update" ON cs_network_concentration
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_network_concentration_delete" ON cs_network_concentration;
CREATE POLICY "cs_network_concentration_delete" ON cs_network_concentration
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_network_results
DROP POLICY IF EXISTS "cs_network_results_select" ON cs_network_results;
CREATE POLICY "cs_network_results_select" ON cs_network_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_results_insert" ON cs_network_results;
CREATE POLICY "cs_network_results_insert" ON cs_network_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_results_update" ON cs_network_results;
CREATE POLICY "cs_network_results_update" ON cs_network_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_network_results_delete" ON cs_network_results;
CREATE POLICY "cs_network_results_delete" ON cs_network_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_network_clients_detail
DROP POLICY IF EXISTS "cs_network_clients_select" ON cs_network_clients_detail;
CREATE POLICY "cs_network_clients_select" ON cs_network_clients_detail
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_clients_insert" ON cs_network_clients_detail;
CREATE POLICY "cs_network_clients_insert" ON cs_network_clients_detail
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_clients_update" ON cs_network_clients_detail;
CREATE POLICY "cs_network_clients_update" ON cs_network_clients_detail
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_network_clients_delete" ON cs_network_clients_detail;
CREATE POLICY "cs_network_clients_delete" ON cs_network_clients_detail
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_network_suppliers_detail
DROP POLICY IF EXISTS "cs_network_suppliers_select" ON cs_network_suppliers_detail;
CREATE POLICY "cs_network_suppliers_select" ON cs_network_suppliers_detail
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_suppliers_insert" ON cs_network_suppliers_detail;
CREATE POLICY "cs_network_suppliers_insert" ON cs_network_suppliers_detail
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_suppliers_update" ON cs_network_suppliers_detail;
CREATE POLICY "cs_network_suppliers_update" ON cs_network_suppliers_detail
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_network_suppliers_delete" ON cs_network_suppliers_detail;
CREATE POLICY "cs_network_suppliers_delete" ON cs_network_suppliers_detail
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_network_government
DROP POLICY IF EXISTS "cs_network_government_select" ON cs_network_government;
CREATE POLICY "cs_network_government_select" ON cs_network_government
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_government_insert" ON cs_network_government;
CREATE POLICY "cs_network_government_insert" ON cs_network_government
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_government_update" ON cs_network_government;
CREATE POLICY "cs_network_government_update" ON cs_network_government
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_network_government_delete" ON cs_network_government;
CREATE POLICY "cs_network_government_delete" ON cs_network_government
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_network_financial_institutions
DROP POLICY IF EXISTS "cs_network_fi_select" ON cs_network_financial_institutions;
CREATE POLICY "cs_network_fi_select" ON cs_network_financial_institutions
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_fi_insert" ON cs_network_financial_institutions;
CREATE POLICY "cs_network_fi_insert" ON cs_network_financial_institutions
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_fi_update" ON cs_network_financial_institutions;
CREATE POLICY "cs_network_fi_update" ON cs_network_financial_institutions
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_network_fi_delete" ON cs_network_financial_institutions;
CREATE POLICY "cs_network_fi_delete" ON cs_network_financial_institutions
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_network_products
DROP POLICY IF EXISTS "cs_network_products_select" ON cs_network_products;
CREATE POLICY "cs_network_products_select" ON cs_network_products
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_products_insert" ON cs_network_products;
CREATE POLICY "cs_network_products_insert" ON cs_network_products
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_network_products_update" ON cs_network_products;
CREATE POLICY "cs_network_products_update" ON cs_network_products
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_network_products_delete" ON cs_network_products;
CREATE POLICY "cs_network_products_delete" ON cs_network_products
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 5. Guarantee Engine Tables
-- ============================================================

-- cs_guarantee_guarantees (application-linked)
DROP POLICY IF EXISTS "cs_guarantee_guarantees_select" ON cs_guarantee_guarantees;
CREATE POLICY "cs_guarantee_guarantees_select" ON cs_guarantee_guarantees
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_guarantee_guarantees_insert" ON cs_guarantee_guarantees;
CREATE POLICY "cs_guarantee_guarantees_insert" ON cs_guarantee_guarantees
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_guarantee_guarantees_update" ON cs_guarantee_guarantees;
CREATE POLICY "cs_guarantee_guarantees_update" ON cs_guarantee_guarantees
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_guarantee_guarantees_delete" ON cs_guarantee_guarantees;
CREATE POLICY "cs_guarantee_guarantees_delete" ON cs_guarantee_guarantees
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_guarantee_documents (application-linked)
DROP POLICY IF EXISTS "cs_guarantee_documents_select" ON cs_guarantee_documents;
CREATE POLICY "cs_guarantee_documents_select" ON cs_guarantee_documents
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_guarantee_documents_insert" ON cs_guarantee_documents;
CREATE POLICY "cs_guarantee_documents_insert" ON cs_guarantee_documents
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_guarantee_documents_update" ON cs_guarantee_documents;
CREATE POLICY "cs_guarantee_documents_update" ON cs_guarantee_documents
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_guarantee_documents_delete" ON cs_guarantee_documents;
CREATE POLICY "cs_guarantee_documents_delete" ON cs_guarantee_documents
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_guarantee_valuations (application-linked)
DROP POLICY IF EXISTS "cs_guarantee_valuations_select" ON cs_guarantee_valuations;
CREATE POLICY "cs_guarantee_valuations_select" ON cs_guarantee_valuations
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_guarantee_valuations_insert" ON cs_guarantee_valuations;
CREATE POLICY "cs_guarantee_valuations_insert" ON cs_guarantee_valuations
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_guarantee_valuations_update" ON cs_guarantee_valuations;
CREATE POLICY "cs_guarantee_valuations_update" ON cs_guarantee_valuations
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_guarantee_valuations_delete" ON cs_guarantee_valuations;
CREATE POLICY "cs_guarantee_valuations_delete" ON cs_guarantee_valuations
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_guarantee_haircuts (config/reference — NOT application-linked)
DROP POLICY IF EXISTS "cs_guarantee_haircuts_select" ON cs_guarantee_haircuts;
CREATE POLICY "cs_guarantee_haircuts_select" ON cs_guarantee_haircuts
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cs_guarantee_haircuts_insert" ON cs_guarantee_haircuts;
CREATE POLICY "cs_guarantee_haircuts_insert" ON cs_guarantee_haircuts
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_guarantee_haircuts_update" ON cs_guarantee_haircuts;
CREATE POLICY "cs_guarantee_haircuts_update" ON cs_guarantee_haircuts
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_guarantee_haircuts_delete" ON cs_guarantee_haircuts;
CREATE POLICY "cs_guarantee_haircuts_delete" ON cs_guarantee_haircuts
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_guarantee_results (application-linked)
DROP POLICY IF EXISTS "cs_guarantee_results_select" ON cs_guarantee_results;
CREATE POLICY "cs_guarantee_results_select" ON cs_guarantee_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_guarantee_results_insert" ON cs_guarantee_results;
CREATE POLICY "cs_guarantee_results_insert" ON cs_guarantee_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_guarantee_results_update" ON cs_guarantee_results;
CREATE POLICY "cs_guarantee_results_update" ON cs_guarantee_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_guarantee_results_delete" ON cs_guarantee_results;
CREATE POLICY "cs_guarantee_results_delete" ON cs_guarantee_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 6. FX Risk Engine Tables (all application-linked)
-- ============================================================

-- cs_fx_inputs
DROP POLICY IF EXISTS "cs_fx_inputs_select" ON cs_fx_inputs;
CREATE POLICY "cs_fx_inputs_select" ON cs_fx_inputs
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fx_inputs_insert" ON cs_fx_inputs;
CREATE POLICY "cs_fx_inputs_insert" ON cs_fx_inputs
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fx_inputs_update" ON cs_fx_inputs;
CREATE POLICY "cs_fx_inputs_update" ON cs_fx_inputs
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fx_inputs_delete" ON cs_fx_inputs;
CREATE POLICY "cs_fx_inputs_delete" ON cs_fx_inputs
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_fx_exposure
DROP POLICY IF EXISTS "cs_fx_exposure_select" ON cs_fx_exposure;
CREATE POLICY "cs_fx_exposure_select" ON cs_fx_exposure
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fx_exposure_insert" ON cs_fx_exposure;
CREATE POLICY "cs_fx_exposure_insert" ON cs_fx_exposure
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fx_exposure_update" ON cs_fx_exposure;
CREATE POLICY "cs_fx_exposure_update" ON cs_fx_exposure
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fx_exposure_delete" ON cs_fx_exposure;
CREATE POLICY "cs_fx_exposure_delete" ON cs_fx_exposure
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_fx_scenarios
DROP POLICY IF EXISTS "cs_fx_scenarios_select" ON cs_fx_scenarios;
CREATE POLICY "cs_fx_scenarios_select" ON cs_fx_scenarios
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fx_scenarios_insert" ON cs_fx_scenarios;
CREATE POLICY "cs_fx_scenarios_insert" ON cs_fx_scenarios
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fx_scenarios_update" ON cs_fx_scenarios;
CREATE POLICY "cs_fx_scenarios_update" ON cs_fx_scenarios
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fx_scenarios_delete" ON cs_fx_scenarios;
CREATE POLICY "cs_fx_scenarios_delete" ON cs_fx_scenarios
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_fx_results
DROP POLICY IF EXISTS "cs_fx_results_select" ON cs_fx_results;
CREATE POLICY "cs_fx_results_select" ON cs_fx_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fx_results_insert" ON cs_fx_results;
CREATE POLICY "cs_fx_results_insert" ON cs_fx_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fx_results_update" ON cs_fx_results;
CREATE POLICY "cs_fx_results_update" ON cs_fx_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fx_results_delete" ON cs_fx_results;
CREATE POLICY "cs_fx_results_delete" ON cs_fx_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 7. Employee Engine Tables (all application-linked)
-- ============================================================

-- cs_employee_headcount
DROP POLICY IF EXISTS "cs_employee_headcount_select" ON cs_employee_headcount;
CREATE POLICY "cs_employee_headcount_select" ON cs_employee_headcount
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_employee_headcount_insert" ON cs_employee_headcount;
CREATE POLICY "cs_employee_headcount_insert" ON cs_employee_headcount
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_employee_headcount_update" ON cs_employee_headcount;
CREATE POLICY "cs_employee_headcount_update" ON cs_employee_headcount
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_employee_headcount_delete" ON cs_employee_headcount;
CREATE POLICY "cs_employee_headcount_delete" ON cs_employee_headcount
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_employee_payroll
DROP POLICY IF EXISTS "cs_employee_payroll_select" ON cs_employee_payroll;
CREATE POLICY "cs_employee_payroll_select" ON cs_employee_payroll
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_employee_payroll_insert" ON cs_employee_payroll;
CREATE POLICY "cs_employee_payroll_insert" ON cs_employee_payroll
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_employee_payroll_update" ON cs_employee_payroll;
CREATE POLICY "cs_employee_payroll_update" ON cs_employee_payroll
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_employee_payroll_delete" ON cs_employee_payroll;
CREATE POLICY "cs_employee_payroll_delete" ON cs_employee_payroll
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_employee_productivity
DROP POLICY IF EXISTS "cs_employee_productivity_select" ON cs_employee_productivity;
CREATE POLICY "cs_employee_productivity_select" ON cs_employee_productivity
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_employee_productivity_insert" ON cs_employee_productivity;
CREATE POLICY "cs_employee_productivity_insert" ON cs_employee_productivity
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_employee_productivity_update" ON cs_employee_productivity;
CREATE POLICY "cs_employee_productivity_update" ON cs_employee_productivity
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_employee_productivity_delete" ON cs_employee_productivity;
CREATE POLICY "cs_employee_productivity_delete" ON cs_employee_productivity
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_employee_results
DROP POLICY IF EXISTS "cs_employee_results_select" ON cs_employee_results;
CREATE POLICY "cs_employee_results_select" ON cs_employee_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_employee_results_insert" ON cs_employee_results;
CREATE POLICY "cs_employee_results_insert" ON cs_employee_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_employee_results_update" ON cs_employee_results;
CREATE POLICY "cs_employee_results_update" ON cs_employee_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_employee_results_delete" ON cs_employee_results;
CREATE POLICY "cs_employee_results_delete" ON cs_employee_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
