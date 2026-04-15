-- Credit Scoring: RLS Policies — Fase 3
-- Idempotent: uses DROP POLICY IF EXISTS before CREATE POLICY
--
-- Covers all Fase 3 Decision Layer tables:
--   017_cs_ai.sql, 018_cs_credit_limits.sql, 019_cs_risk_matrix.sql,
--   020_cs_review.sql, 021_cs_policies.sql, 022_cs_workflow.sql
--
-- Uses existing helper: cs_can_access_application(app_id uuid)
--
-- Pattern for application-linked tables:
--   SELECT/INSERT granted if user owns the parent cs_applications row OR has elevated role
--   UPDATE only for manager/committee/admin
--   DELETE only for admin
--
-- Special:
--   cs_policies is a config/reference table (not application-linked)
--   cs_policy_audit is an audit table (restricted read)
--   cs_workflow_queue has assigned_to for user-specific access


-- ============================================================
-- 1. AI Engine Tables (all application-linked)
-- ============================================================

-- cs_ai_analysis
DROP POLICY IF EXISTS "cs_ai_analysis_select" ON cs_ai_analysis;
CREATE POLICY "cs_ai_analysis_select" ON cs_ai_analysis
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_ai_analysis_insert" ON cs_ai_analysis;
CREATE POLICY "cs_ai_analysis_insert" ON cs_ai_analysis
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_ai_analysis_update" ON cs_ai_analysis;
CREATE POLICY "cs_ai_analysis_update" ON cs_ai_analysis
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_ai_analysis_delete" ON cs_ai_analysis;
CREATE POLICY "cs_ai_analysis_delete" ON cs_ai_analysis
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_ai_scenarios
DROP POLICY IF EXISTS "cs_ai_scenarios_select" ON cs_ai_scenarios;
CREATE POLICY "cs_ai_scenarios_select" ON cs_ai_scenarios
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_ai_scenarios_insert" ON cs_ai_scenarios;
CREATE POLICY "cs_ai_scenarios_insert" ON cs_ai_scenarios
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_ai_scenarios_update" ON cs_ai_scenarios;
CREATE POLICY "cs_ai_scenarios_update" ON cs_ai_scenarios
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_ai_scenarios_delete" ON cs_ai_scenarios;
CREATE POLICY "cs_ai_scenarios_delete" ON cs_ai_scenarios
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_ai_recommendations
DROP POLICY IF EXISTS "cs_ai_recommendations_select" ON cs_ai_recommendations;
CREATE POLICY "cs_ai_recommendations_select" ON cs_ai_recommendations
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_ai_recommendations_insert" ON cs_ai_recommendations;
CREATE POLICY "cs_ai_recommendations_insert" ON cs_ai_recommendations
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_ai_recommendations_update" ON cs_ai_recommendations;
CREATE POLICY "cs_ai_recommendations_update" ON cs_ai_recommendations
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_ai_recommendations_delete" ON cs_ai_recommendations;
CREATE POLICY "cs_ai_recommendations_delete" ON cs_ai_recommendations
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 2. Credit Limits Tables (all application-linked)
-- ============================================================

-- cs_credit_limits
DROP POLICY IF EXISTS "cs_credit_limits_select" ON cs_credit_limits;
CREATE POLICY "cs_credit_limits_select" ON cs_credit_limits
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_credit_limits_insert" ON cs_credit_limits;
CREATE POLICY "cs_credit_limits_insert" ON cs_credit_limits
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_credit_limits_update" ON cs_credit_limits;
CREATE POLICY "cs_credit_limits_update" ON cs_credit_limits
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_credit_limits_delete" ON cs_credit_limits;
CREATE POLICY "cs_credit_limits_delete" ON cs_credit_limits
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_limit_calculations
DROP POLICY IF EXISTS "cs_limit_calc_select" ON cs_limit_calculations;
CREATE POLICY "cs_limit_calc_select" ON cs_limit_calculations
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_limit_calc_insert" ON cs_limit_calculations;
CREATE POLICY "cs_limit_calc_insert" ON cs_limit_calculations
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_limit_calc_update" ON cs_limit_calculations;
CREATE POLICY "cs_limit_calc_update" ON cs_limit_calculations
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_limit_calc_delete" ON cs_limit_calculations;
CREATE POLICY "cs_limit_calc_delete" ON cs_limit_calculations
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 3. Risk Matrix Tables (all application-linked)
-- ============================================================

-- cs_risk_matrix_results
DROP POLICY IF EXISTS "cs_risk_matrix_results_select" ON cs_risk_matrix_results;
CREATE POLICY "cs_risk_matrix_results_select" ON cs_risk_matrix_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_risk_matrix_results_insert" ON cs_risk_matrix_results;
CREATE POLICY "cs_risk_matrix_results_insert" ON cs_risk_matrix_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_risk_matrix_results_update" ON cs_risk_matrix_results;
CREATE POLICY "cs_risk_matrix_results_update" ON cs_risk_matrix_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_risk_matrix_results_delete" ON cs_risk_matrix_results;
CREATE POLICY "cs_risk_matrix_results_delete" ON cs_risk_matrix_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_decision_gates
DROP POLICY IF EXISTS "cs_decision_gates_select" ON cs_decision_gates;
CREATE POLICY "cs_decision_gates_select" ON cs_decision_gates
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_decision_gates_insert" ON cs_decision_gates;
CREATE POLICY "cs_decision_gates_insert" ON cs_decision_gates
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_decision_gates_update" ON cs_decision_gates;
CREATE POLICY "cs_decision_gates_update" ON cs_decision_gates
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_decision_gates_delete" ON cs_decision_gates;
CREATE POLICY "cs_decision_gates_delete" ON cs_decision_gates
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 4. Review Tables (all application-linked)
-- ============================================================

-- cs_review_schedule
DROP POLICY IF EXISTS "cs_review_schedule_select" ON cs_review_schedule;
CREATE POLICY "cs_review_schedule_select" ON cs_review_schedule
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_review_schedule_insert" ON cs_review_schedule;
CREATE POLICY "cs_review_schedule_insert" ON cs_review_schedule
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_review_schedule_update" ON cs_review_schedule;
CREATE POLICY "cs_review_schedule_update" ON cs_review_schedule
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_review_schedule_delete" ON cs_review_schedule;
CREATE POLICY "cs_review_schedule_delete" ON cs_review_schedule
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_review_triggers
DROP POLICY IF EXISTS "cs_review_triggers_select" ON cs_review_triggers;
CREATE POLICY "cs_review_triggers_select" ON cs_review_triggers
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_review_triggers_insert" ON cs_review_triggers;
CREATE POLICY "cs_review_triggers_insert" ON cs_review_triggers
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_review_triggers_update" ON cs_review_triggers;
CREATE POLICY "cs_review_triggers_update" ON cs_review_triggers
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_review_triggers_delete" ON cs_review_triggers;
CREATE POLICY "cs_review_triggers_delete" ON cs_review_triggers
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 5. Policy Tables
-- ============================================================

-- cs_policies (config/reference — NOT application-linked)
DROP POLICY IF EXISTS "cs_policies_select" ON cs_policies;
CREATE POLICY "cs_policies_select" ON cs_policies
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cs_policies_insert" ON cs_policies;
CREATE POLICY "cs_policies_insert" ON cs_policies
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_policies_update" ON cs_policies;
CREATE POLICY "cs_policies_update" ON cs_policies
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_policies_delete" ON cs_policies;
CREATE POLICY "cs_policies_delete" ON cs_policies
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_policy_versions (linked via policy_id — restricted read)
DROP POLICY IF EXISTS "cs_policy_versions_select" ON cs_policy_versions;
CREATE POLICY "cs_policy_versions_select" ON cs_policy_versions
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_policy_versions_insert" ON cs_policy_versions;
CREATE POLICY "cs_policy_versions_insert" ON cs_policy_versions
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_policy_versions_update" ON cs_policy_versions;
CREATE POLICY "cs_policy_versions_update" ON cs_policy_versions
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_policy_versions_delete" ON cs_policy_versions;
CREATE POLICY "cs_policy_versions_delete" ON cs_policy_versions
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_policy_audit (audit table — restricted read, any authenticated can insert)
DROP POLICY IF EXISTS "cs_policy_audit_select" ON cs_policy_audit;
CREATE POLICY "cs_policy_audit_select" ON cs_policy_audit
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_policy_audit_insert" ON cs_policy_audit;
CREATE POLICY "cs_policy_audit_insert" ON cs_policy_audit
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cs_policy_audit_update" ON cs_policy_audit;
CREATE POLICY "cs_policy_audit_update" ON cs_policy_audit
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "cs_policy_audit_delete" ON cs_policy_audit;
CREATE POLICY "cs_policy_audit_delete" ON cs_policy_audit
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 6. Workflow Tables (application-linked)
-- ============================================================

-- cs_workflow_queue (application-linked + assigned_to access)
DROP POLICY IF EXISTS "cs_workflow_queue_select" ON cs_workflow_queue;
CREATE POLICY "cs_workflow_queue_select" ON cs_workflow_queue
  FOR SELECT USING (
    cs_can_access_application(application_id)
    OR assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "cs_workflow_queue_insert" ON cs_workflow_queue;
CREATE POLICY "cs_workflow_queue_insert" ON cs_workflow_queue
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_workflow_queue_update" ON cs_workflow_queue;
CREATE POLICY "cs_workflow_queue_update" ON cs_workflow_queue
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
    OR assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "cs_workflow_queue_delete" ON cs_workflow_queue;
CREATE POLICY "cs_workflow_queue_delete" ON cs_workflow_queue
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_workflow_decisions
DROP POLICY IF EXISTS "cs_workflow_decisions_select" ON cs_workflow_decisions;
CREATE POLICY "cs_workflow_decisions_select" ON cs_workflow_decisions
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_workflow_decisions_insert" ON cs_workflow_decisions;
CREATE POLICY "cs_workflow_decisions_insert" ON cs_workflow_decisions
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_workflow_decisions_update" ON cs_workflow_decisions;
CREATE POLICY "cs_workflow_decisions_update" ON cs_workflow_decisions
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_workflow_decisions_delete" ON cs_workflow_decisions;
CREATE POLICY "cs_workflow_decisions_delete" ON cs_workflow_decisions
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_workflow_overrides (only committee/admin can insert overrides)
DROP POLICY IF EXISTS "cs_workflow_overrides_select" ON cs_workflow_overrides;
CREATE POLICY "cs_workflow_overrides_select" ON cs_workflow_overrides
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_workflow_overrides_insert" ON cs_workflow_overrides;
CREATE POLICY "cs_workflow_overrides_insert" ON cs_workflow_overrides
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_workflow_overrides_update" ON cs_workflow_overrides;
CREATE POLICY "cs_workflow_overrides_update" ON cs_workflow_overrides
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

DROP POLICY IF EXISTS "cs_workflow_overrides_delete" ON cs_workflow_overrides;
CREATE POLICY "cs_workflow_overrides_delete" ON cs_workflow_overrides
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
