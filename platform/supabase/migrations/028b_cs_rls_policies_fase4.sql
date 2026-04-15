-- Credit Scoring: RLS Policies — Fase 4
-- Idempotent: uses DROP POLICY IF EXISTS before CREATE POLICY
--
-- Covers all Fase 4 tables:
--   023_cs_portfolio.sql, 024_cs_graph.sql, 025_cs_scenarios.sql,
--   026_cs_covenants.sql, 027_cs_cross_analysis.sql, 028_cs_benchmark.sql
--
-- Uses existing helper: cs_can_access_application(app_id uuid)


-- ============================================================
-- 1. Portfolio Tables (application-linked)
-- ============================================================

-- cs_portfolio_positions
DROP POLICY IF EXISTS "cs_portfolio_positions_select" ON cs_portfolio_positions;
CREATE POLICY "cs_portfolio_positions_select" ON cs_portfolio_positions
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_portfolio_positions_insert" ON cs_portfolio_positions;
CREATE POLICY "cs_portfolio_positions_insert" ON cs_portfolio_positions
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_portfolio_positions_update" ON cs_portfolio_positions;
CREATE POLICY "cs_portfolio_positions_update" ON cs_portfolio_positions
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_portfolio_positions_delete" ON cs_portfolio_positions;
CREATE POLICY "cs_portfolio_positions_delete" ON cs_portfolio_positions
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_portfolio_limits
DROP POLICY IF EXISTS "cs_portfolio_limits_select" ON cs_portfolio_limits;
CREATE POLICY "cs_portfolio_limits_select" ON cs_portfolio_limits
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_portfolio_limits_insert" ON cs_portfolio_limits;
CREATE POLICY "cs_portfolio_limits_insert" ON cs_portfolio_limits
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_portfolio_limits_update" ON cs_portfolio_limits;
CREATE POLICY "cs_portfolio_limits_update" ON cs_portfolio_limits
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_portfolio_limits_delete" ON cs_portfolio_limits;
CREATE POLICY "cs_portfolio_limits_delete" ON cs_portfolio_limits
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_portfolio_exposure
DROP POLICY IF EXISTS "cs_portfolio_exposure_select" ON cs_portfolio_exposure;
CREATE POLICY "cs_portfolio_exposure_select" ON cs_portfolio_exposure
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_portfolio_exposure_insert" ON cs_portfolio_exposure;
CREATE POLICY "cs_portfolio_exposure_insert" ON cs_portfolio_exposure
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_portfolio_exposure_update" ON cs_portfolio_exposure;
CREATE POLICY "cs_portfolio_exposure_update" ON cs_portfolio_exposure
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_portfolio_exposure_delete" ON cs_portfolio_exposure;
CREATE POLICY "cs_portfolio_exposure_delete" ON cs_portfolio_exposure
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_portfolio_results
DROP POLICY IF EXISTS "cs_portfolio_results_select" ON cs_portfolio_results;
CREATE POLICY "cs_portfolio_results_select" ON cs_portfolio_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_portfolio_results_insert" ON cs_portfolio_results;
CREATE POLICY "cs_portfolio_results_insert" ON cs_portfolio_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_portfolio_results_update" ON cs_portfolio_results;
CREATE POLICY "cs_portfolio_results_update" ON cs_portfolio_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_portfolio_results_delete" ON cs_portfolio_results;
CREATE POLICY "cs_portfolio_results_delete" ON cs_portfolio_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 2. Graph Fraud Tables (application-linked)
-- ============================================================

-- cs_graph_nodes
DROP POLICY IF EXISTS "cs_graph_nodes_select" ON cs_graph_nodes;
CREATE POLICY "cs_graph_nodes_select" ON cs_graph_nodes
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_graph_nodes_insert" ON cs_graph_nodes;
CREATE POLICY "cs_graph_nodes_insert" ON cs_graph_nodes
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_graph_nodes_update" ON cs_graph_nodes;
CREATE POLICY "cs_graph_nodes_update" ON cs_graph_nodes
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_graph_nodes_delete" ON cs_graph_nodes;
CREATE POLICY "cs_graph_nodes_delete" ON cs_graph_nodes
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_graph_edges
DROP POLICY IF EXISTS "cs_graph_edges_select" ON cs_graph_edges;
CREATE POLICY "cs_graph_edges_select" ON cs_graph_edges
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_graph_edges_insert" ON cs_graph_edges;
CREATE POLICY "cs_graph_edges_insert" ON cs_graph_edges
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_graph_edges_update" ON cs_graph_edges;
CREATE POLICY "cs_graph_edges_update" ON cs_graph_edges
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_graph_edges_delete" ON cs_graph_edges;
CREATE POLICY "cs_graph_edges_delete" ON cs_graph_edges
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_graph_runs
DROP POLICY IF EXISTS "cs_graph_runs_select" ON cs_graph_runs;
CREATE POLICY "cs_graph_runs_select" ON cs_graph_runs
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_graph_runs_insert" ON cs_graph_runs;
CREATE POLICY "cs_graph_runs_insert" ON cs_graph_runs
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_graph_runs_update" ON cs_graph_runs;
CREATE POLICY "cs_graph_runs_update" ON cs_graph_runs
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_graph_runs_delete" ON cs_graph_runs;
CREATE POLICY "cs_graph_runs_delete" ON cs_graph_runs
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_graph_alerts
DROP POLICY IF EXISTS "cs_graph_alerts_select" ON cs_graph_alerts;
CREATE POLICY "cs_graph_alerts_select" ON cs_graph_alerts
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_graph_alerts_insert" ON cs_graph_alerts;
CREATE POLICY "cs_graph_alerts_insert" ON cs_graph_alerts
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_graph_alerts_update" ON cs_graph_alerts;
CREATE POLICY "cs_graph_alerts_update" ON cs_graph_alerts
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_graph_alerts_delete" ON cs_graph_alerts;
CREATE POLICY "cs_graph_alerts_delete" ON cs_graph_alerts
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_graph_scores
DROP POLICY IF EXISTS "cs_graph_scores_select" ON cs_graph_scores;
CREATE POLICY "cs_graph_scores_select" ON cs_graph_scores
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_graph_scores_insert" ON cs_graph_scores;
CREATE POLICY "cs_graph_scores_insert" ON cs_graph_scores
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_graph_scores_update" ON cs_graph_scores;
CREATE POLICY "cs_graph_scores_update" ON cs_graph_scores
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_graph_scores_delete" ON cs_graph_scores;
CREATE POLICY "cs_graph_scores_delete" ON cs_graph_scores
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 3. Scenario Tables (application-linked)
-- ============================================================

-- cs_scenarios
DROP POLICY IF EXISTS "cs_scenarios_select" ON cs_scenarios;
CREATE POLICY "cs_scenarios_select" ON cs_scenarios
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_scenarios_insert" ON cs_scenarios;
CREATE POLICY "cs_scenarios_insert" ON cs_scenarios
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_scenarios_update" ON cs_scenarios;
CREATE POLICY "cs_scenarios_update" ON cs_scenarios
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_scenarios_delete" ON cs_scenarios;
CREATE POLICY "cs_scenarios_delete" ON cs_scenarios
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_scenario_results
DROP POLICY IF EXISTS "cs_scenario_results_select" ON cs_scenario_results;
CREATE POLICY "cs_scenario_results_select" ON cs_scenario_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_scenario_results_insert" ON cs_scenario_results;
CREATE POLICY "cs_scenario_results_insert" ON cs_scenario_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_scenario_results_update" ON cs_scenario_results;
CREATE POLICY "cs_scenario_results_update" ON cs_scenario_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_scenario_results_delete" ON cs_scenario_results;
CREATE POLICY "cs_scenario_results_delete" ON cs_scenario_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 4. Covenant Tables
-- ============================================================

-- cs_covenants (application-linked)
DROP POLICY IF EXISTS "cs_covenants_select" ON cs_covenants;
CREATE POLICY "cs_covenants_select" ON cs_covenants
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_covenants_insert" ON cs_covenants;
CREATE POLICY "cs_covenants_insert" ON cs_covenants
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_covenants_update" ON cs_covenants;
CREATE POLICY "cs_covenants_update" ON cs_covenants
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_covenants_delete" ON cs_covenants;
CREATE POLICY "cs_covenants_delete" ON cs_covenants
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_covenant_monitoring (application-linked)
DROP POLICY IF EXISTS "cs_covenant_monitoring_select" ON cs_covenant_monitoring;
CREATE POLICY "cs_covenant_monitoring_select" ON cs_covenant_monitoring
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_covenant_monitoring_insert" ON cs_covenant_monitoring;
CREATE POLICY "cs_covenant_monitoring_insert" ON cs_covenant_monitoring
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_covenant_monitoring_update" ON cs_covenant_monitoring;
CREATE POLICY "cs_covenant_monitoring_update" ON cs_covenant_monitoring
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_covenant_monitoring_delete" ON cs_covenant_monitoring;
CREATE POLICY "cs_covenant_monitoring_delete" ON cs_covenant_monitoring
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 5. Cross Analysis Table (application-linked)
-- ============================================================

-- cs_cross_analysis
DROP POLICY IF EXISTS "cs_cross_analysis_select" ON cs_cross_analysis;
CREATE POLICY "cs_cross_analysis_select" ON cs_cross_analysis
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_cross_analysis_insert" ON cs_cross_analysis;
CREATE POLICY "cs_cross_analysis_insert" ON cs_cross_analysis
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_cross_analysis_update" ON cs_cross_analysis;
CREATE POLICY "cs_cross_analysis_update" ON cs_cross_analysis
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_cross_analysis_delete" ON cs_cross_analysis;
CREATE POLICY "cs_cross_analysis_delete" ON cs_cross_analysis
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 6. Benchmark Tables
-- ============================================================

-- cs_benchmarks (config/reference — NOT application-linked)
DROP POLICY IF EXISTS "cs_benchmarks_select" ON cs_benchmarks;
CREATE POLICY "cs_benchmarks_select" ON cs_benchmarks
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cs_benchmarks_insert" ON cs_benchmarks;
CREATE POLICY "cs_benchmarks_insert" ON cs_benchmarks
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_benchmarks_update" ON cs_benchmarks;
CREATE POLICY "cs_benchmarks_update" ON cs_benchmarks
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_benchmarks_delete" ON cs_benchmarks;
CREATE POLICY "cs_benchmarks_delete" ON cs_benchmarks
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_benchmark_comparisons (application-linked)
DROP POLICY IF EXISTS "cs_benchmark_comparisons_select" ON cs_benchmark_comparisons;
CREATE POLICY "cs_benchmark_comparisons_select" ON cs_benchmark_comparisons
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_benchmark_comparisons_insert" ON cs_benchmark_comparisons;
CREATE POLICY "cs_benchmark_comparisons_insert" ON cs_benchmark_comparisons
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_benchmark_comparisons_update" ON cs_benchmark_comparisons;
CREATE POLICY "cs_benchmark_comparisons_update" ON cs_benchmark_comparisons
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_benchmark_comparisons_delete" ON cs_benchmark_comparisons;
CREATE POLICY "cs_benchmark_comparisons_delete" ON cs_benchmark_comparisons
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_benchmark_syntage_ratios (application-linked)
DROP POLICY IF EXISTS "cs_benchmark_syntage_select" ON cs_benchmark_syntage_ratios;
CREATE POLICY "cs_benchmark_syntage_select" ON cs_benchmark_syntage_ratios
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_benchmark_syntage_insert" ON cs_benchmark_syntage_ratios;
CREATE POLICY "cs_benchmark_syntage_insert" ON cs_benchmark_syntage_ratios
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_benchmark_syntage_update" ON cs_benchmark_syntage_ratios;
CREATE POLICY "cs_benchmark_syntage_update" ON cs_benchmark_syntage_ratios
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_benchmark_syntage_delete" ON cs_benchmark_syntage_ratios;
CREATE POLICY "cs_benchmark_syntage_delete" ON cs_benchmark_syntage_ratios
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_benchmark_cross_validation (application-linked)
DROP POLICY IF EXISTS "cs_benchmark_cross_val_select" ON cs_benchmark_cross_validation;
CREATE POLICY "cs_benchmark_cross_val_select" ON cs_benchmark_cross_validation
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_benchmark_cross_val_insert" ON cs_benchmark_cross_validation;
CREATE POLICY "cs_benchmark_cross_val_insert" ON cs_benchmark_cross_validation
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_benchmark_cross_val_update" ON cs_benchmark_cross_validation;
CREATE POLICY "cs_benchmark_cross_val_update" ON cs_benchmark_cross_validation
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_benchmark_cross_val_delete" ON cs_benchmark_cross_validation;
CREATE POLICY "cs_benchmark_cross_val_delete" ON cs_benchmark_cross_validation
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
