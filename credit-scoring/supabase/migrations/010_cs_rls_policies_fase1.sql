-- Credit Scoring: RLS Policies — Fase 1
-- Idempotent: uses DROP POLICY IF EXISTS before CREATE POLICY
--
-- Role model:
--   analyst   → own applications (created_by = auth.uid())
--   manager   → all applications
--   committee → all applications
--   admin     → all applications + delete
--
-- Pattern for application-linked tables:
--   SELECT/INSERT granted if user owns the parent cs_applications row OR has elevated role
--   UPDATE only for manager/committee/admin
--   DELETE only for admin

-- ============================================================
-- Helper: reusable function to check application ownership
-- ============================================================

CREATE OR REPLACE FUNCTION cs_can_access_application(app_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM cs_applications
    WHERE id = app_id
      AND (
        created_by = auth.uid()
        OR auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
      )
  );
$$;

-- ============================================================
-- 1. cs_applications
-- ============================================================

-- SELECT: analysts see own, elevated roles see all
DROP POLICY IF EXISTS "cs_applications_select" ON cs_applications;
CREATE POLICY "cs_applications_select" ON cs_applications
  FOR SELECT USING (
    created_by = auth.uid()
    OR auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

-- INSERT: analysts create own, elevated roles create any
DROP POLICY IF EXISTS "cs_applications_insert" ON cs_applications;
CREATE POLICY "cs_applications_insert" ON cs_applications
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    OR auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

-- UPDATE: only manager/committee/admin
DROP POLICY IF EXISTS "cs_applications_update" ON cs_applications;
CREATE POLICY "cs_applications_update" ON cs_applications
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

-- DELETE: only admin
DROP POLICY IF EXISTS "cs_applications_delete" ON cs_applications;
CREATE POLICY "cs_applications_delete" ON cs_applications
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );


-- ============================================================
-- 2. cs_application_status_log
-- ============================================================

DROP POLICY IF EXISTS "cs_app_status_log_select" ON cs_application_status_log;
CREATE POLICY "cs_app_status_log_select" ON cs_application_status_log
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_app_status_log_insert" ON cs_application_status_log;
CREATE POLICY "cs_app_status_log_insert" ON cs_application_status_log
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_app_status_log_update" ON cs_application_status_log;
CREATE POLICY "cs_app_status_log_update" ON cs_application_status_log
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_app_status_log_delete" ON cs_application_status_log;
CREATE POLICY "cs_app_status_log_delete" ON cs_application_status_log
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- ============================================================
-- 3. cs_api_calls
-- ============================================================

DROP POLICY IF EXISTS "cs_api_calls_select" ON cs_api_calls;
CREATE POLICY "cs_api_calls_select" ON cs_api_calls
  FOR SELECT USING (
    cs_can_access_application(application_id)
    OR application_id IS NULL AND auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_api_calls_insert" ON cs_api_calls;
CREATE POLICY "cs_api_calls_insert" ON cs_api_calls
  FOR INSERT WITH CHECK (
    (application_id IS NOT NULL AND cs_can_access_application(application_id))
    OR auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_api_calls_update" ON cs_api_calls;
CREATE POLICY "cs_api_calls_update" ON cs_api_calls
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_api_calls_delete" ON cs_api_calls;
CREATE POLICY "cs_api_calls_delete" ON cs_api_calls
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- ============================================================
-- 4. cs_api_cache
-- ============================================================

DROP POLICY IF EXISTS "cs_api_cache_select" ON cs_api_cache;
CREATE POLICY "cs_api_cache_select" ON cs_api_cache
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cs_api_cache_insert" ON cs_api_cache;
CREATE POLICY "cs_api_cache_insert" ON cs_api_cache
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cs_api_cache_update" ON cs_api_cache;
CREATE POLICY "cs_api_cache_update" ON cs_api_cache
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_api_cache_delete" ON cs_api_cache;
CREATE POLICY "cs_api_cache_delete" ON cs_api_cache
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );


-- ============================================================
-- 5. cs_metric_catalog (config/reference — read-only for all authenticated)
-- ============================================================

DROP POLICY IF EXISTS "cs_metric_catalog_select" ON cs_metric_catalog;
CREATE POLICY "cs_metric_catalog_select" ON cs_metric_catalog
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cs_metric_catalog_insert" ON cs_metric_catalog;
CREATE POLICY "cs_metric_catalog_insert" ON cs_metric_catalog
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_metric_catalog_update" ON cs_metric_catalog;
CREATE POLICY "cs_metric_catalog_update" ON cs_metric_catalog
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_metric_catalog_delete" ON cs_metric_catalog;
CREATE POLICY "cs_metric_catalog_delete" ON cs_metric_catalog
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- ============================================================
-- 6. cs_metric_values (application-linked)
-- ============================================================

DROP POLICY IF EXISTS "cs_metric_values_select" ON cs_metric_values;
CREATE POLICY "cs_metric_values_select" ON cs_metric_values
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_metric_values_insert" ON cs_metric_values;
CREATE POLICY "cs_metric_values_insert" ON cs_metric_values
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_metric_values_update" ON cs_metric_values;
CREATE POLICY "cs_metric_values_update" ON cs_metric_values
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_metric_values_delete" ON cs_metric_values;
CREATE POLICY "cs_metric_values_delete" ON cs_metric_values
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- ============================================================
-- 7. cs_scoring_versions (config/reference — read-only for all authenticated)
-- ============================================================

DROP POLICY IF EXISTS "cs_scoring_versions_select" ON cs_scoring_versions;
CREATE POLICY "cs_scoring_versions_select" ON cs_scoring_versions
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cs_scoring_versions_insert" ON cs_scoring_versions;
CREATE POLICY "cs_scoring_versions_insert" ON cs_scoring_versions
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "cs_scoring_versions_update" ON cs_scoring_versions;
CREATE POLICY "cs_scoring_versions_update" ON cs_scoring_versions
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "cs_scoring_versions_delete" ON cs_scoring_versions;
CREATE POLICY "cs_scoring_versions_delete" ON cs_scoring_versions
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- ============================================================
-- 8. cs_audit_log (restricted: only manager/committee/admin can read)
-- ============================================================

DROP POLICY IF EXISTS "cs_audit_log_select" ON cs_audit_log;
CREATE POLICY "cs_audit_log_select" ON cs_audit_log
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_audit_log_insert" ON cs_audit_log;
CREATE POLICY "cs_audit_log_insert" ON cs_audit_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cs_audit_log_update" ON cs_audit_log;
CREATE POLICY "cs_audit_log_update" ON cs_audit_log
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

DROP POLICY IF EXISTS "cs_audit_log_delete" ON cs_audit_log;
CREATE POLICY "cs_audit_log_delete" ON cs_audit_log
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );


-- ============================================================
-- 9. cs_compliance_checks (application-linked)
-- ============================================================

DROP POLICY IF EXISTS "cs_compliance_checks_select" ON cs_compliance_checks;
CREATE POLICY "cs_compliance_checks_select" ON cs_compliance_checks
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_compliance_checks_insert" ON cs_compliance_checks;
CREATE POLICY "cs_compliance_checks_insert" ON cs_compliance_checks
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_compliance_checks_update" ON cs_compliance_checks;
CREATE POLICY "cs_compliance_checks_update" ON cs_compliance_checks
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_compliance_checks_delete" ON cs_compliance_checks;
CREATE POLICY "cs_compliance_checks_delete" ON cs_compliance_checks
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- ============================================================
-- 10. cs_compliance_results (application-linked)
-- ============================================================

DROP POLICY IF EXISTS "cs_compliance_results_select" ON cs_compliance_results;
CREATE POLICY "cs_compliance_results_select" ON cs_compliance_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_compliance_results_insert" ON cs_compliance_results;
CREATE POLICY "cs_compliance_results_insert" ON cs_compliance_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_compliance_results_update" ON cs_compliance_results;
CREATE POLICY "cs_compliance_results_update" ON cs_compliance_results
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_compliance_results_delete" ON cs_compliance_results;
CREATE POLICY "cs_compliance_results_delete" ON cs_compliance_results
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );


-- ============================================================
-- 11. SAT Engine Tables (all application-linked)
-- ============================================================

-- Macro: each SAT table gets the same 4 policies (select, insert, update, delete)

-- cs_sat_data
DROP POLICY IF EXISTS "cs_sat_data_select" ON cs_sat_data;
CREATE POLICY "cs_sat_data_select" ON cs_sat_data
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_data_insert" ON cs_sat_data;
CREATE POLICY "cs_sat_data_insert" ON cs_sat_data
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_data_update" ON cs_sat_data;
CREATE POLICY "cs_sat_data_update" ON cs_sat_data
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_sat_data_delete" ON cs_sat_data;
CREATE POLICY "cs_sat_data_delete" ON cs_sat_data
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_sat_metrics
DROP POLICY IF EXISTS "cs_sat_metrics_select" ON cs_sat_metrics;
CREATE POLICY "cs_sat_metrics_select" ON cs_sat_metrics
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_metrics_insert" ON cs_sat_metrics;
CREATE POLICY "cs_sat_metrics_insert" ON cs_sat_metrics
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_metrics_update" ON cs_sat_metrics;
CREATE POLICY "cs_sat_metrics_update" ON cs_sat_metrics
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_sat_metrics_delete" ON cs_sat_metrics;
CREATE POLICY "cs_sat_metrics_delete" ON cs_sat_metrics
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_sat_results
DROP POLICY IF EXISTS "cs_sat_results_select" ON cs_sat_results;
CREATE POLICY "cs_sat_results_select" ON cs_sat_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_results_insert" ON cs_sat_results;
CREATE POLICY "cs_sat_results_insert" ON cs_sat_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_results_update" ON cs_sat_results;
CREATE POLICY "cs_sat_results_update" ON cs_sat_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_sat_results_delete" ON cs_sat_results;
CREATE POLICY "cs_sat_results_delete" ON cs_sat_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_sat_revenue_quality
DROP POLICY IF EXISTS "cs_sat_revenue_quality_select" ON cs_sat_revenue_quality;
CREATE POLICY "cs_sat_revenue_quality_select" ON cs_sat_revenue_quality
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_revenue_quality_insert" ON cs_sat_revenue_quality;
CREATE POLICY "cs_sat_revenue_quality_insert" ON cs_sat_revenue_quality
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_revenue_quality_update" ON cs_sat_revenue_quality;
CREATE POLICY "cs_sat_revenue_quality_update" ON cs_sat_revenue_quality
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_sat_revenue_quality_delete" ON cs_sat_revenue_quality;
CREATE POLICY "cs_sat_revenue_quality_delete" ON cs_sat_revenue_quality
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_sat_payment_behavior
DROP POLICY IF EXISTS "cs_sat_payment_behavior_select" ON cs_sat_payment_behavior;
CREATE POLICY "cs_sat_payment_behavior_select" ON cs_sat_payment_behavior
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_payment_behavior_insert" ON cs_sat_payment_behavior;
CREATE POLICY "cs_sat_payment_behavior_insert" ON cs_sat_payment_behavior
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_payment_behavior_update" ON cs_sat_payment_behavior;
CREATE POLICY "cs_sat_payment_behavior_update" ON cs_sat_payment_behavior
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_sat_payment_behavior_delete" ON cs_sat_payment_behavior;
CREATE POLICY "cs_sat_payment_behavior_delete" ON cs_sat_payment_behavior
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_sat_facturado_vs_declarado
DROP POLICY IF EXISTS "cs_sat_fvd_select" ON cs_sat_facturado_vs_declarado;
CREATE POLICY "cs_sat_fvd_select" ON cs_sat_facturado_vs_declarado
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_fvd_insert" ON cs_sat_facturado_vs_declarado;
CREATE POLICY "cs_sat_fvd_insert" ON cs_sat_facturado_vs_declarado
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_fvd_update" ON cs_sat_facturado_vs_declarado;
CREATE POLICY "cs_sat_fvd_update" ON cs_sat_facturado_vs_declarado
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_sat_fvd_delete" ON cs_sat_facturado_vs_declarado;
CREATE POLICY "cs_sat_fvd_delete" ON cs_sat_facturado_vs_declarado
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_sat_blacklisted_invoices
DROP POLICY IF EXISTS "cs_sat_blacklisted_select" ON cs_sat_blacklisted_invoices;
CREATE POLICY "cs_sat_blacklisted_select" ON cs_sat_blacklisted_invoices
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_blacklisted_insert" ON cs_sat_blacklisted_invoices;
CREATE POLICY "cs_sat_blacklisted_insert" ON cs_sat_blacklisted_invoices
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_blacklisted_update" ON cs_sat_blacklisted_invoices;
CREATE POLICY "cs_sat_blacklisted_update" ON cs_sat_blacklisted_invoices
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_sat_blacklisted_delete" ON cs_sat_blacklisted_invoices;
CREATE POLICY "cs_sat_blacklisted_delete" ON cs_sat_blacklisted_invoices
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_sat_product_diversification
DROP POLICY IF EXISTS "cs_sat_product_div_select" ON cs_sat_product_diversification;
CREATE POLICY "cs_sat_product_div_select" ON cs_sat_product_diversification
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_product_div_insert" ON cs_sat_product_diversification;
CREATE POLICY "cs_sat_product_div_insert" ON cs_sat_product_diversification
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_sat_product_div_update" ON cs_sat_product_diversification;
CREATE POLICY "cs_sat_product_div_update" ON cs_sat_product_diversification
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_sat_product_div_delete" ON cs_sat_product_diversification;
CREATE POLICY "cs_sat_product_div_delete" ON cs_sat_product_diversification
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 12. Buro Engine Tables (all application-linked)
-- ============================================================

-- cs_buro_data
DROP POLICY IF EXISTS "cs_buro_data_select" ON cs_buro_data;
CREATE POLICY "cs_buro_data_select" ON cs_buro_data
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_data_insert" ON cs_buro_data;
CREATE POLICY "cs_buro_data_insert" ON cs_buro_data
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_data_update" ON cs_buro_data;
CREATE POLICY "cs_buro_data_update" ON cs_buro_data
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_buro_data_delete" ON cs_buro_data;
CREATE POLICY "cs_buro_data_delete" ON cs_buro_data
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_buro_analysis
DROP POLICY IF EXISTS "cs_buro_analysis_select" ON cs_buro_analysis;
CREATE POLICY "cs_buro_analysis_select" ON cs_buro_analysis
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_analysis_insert" ON cs_buro_analysis;
CREATE POLICY "cs_buro_analysis_insert" ON cs_buro_analysis
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_analysis_update" ON cs_buro_analysis;
CREATE POLICY "cs_buro_analysis_update" ON cs_buro_analysis
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_buro_analysis_delete" ON cs_buro_analysis;
CREATE POLICY "cs_buro_analysis_delete" ON cs_buro_analysis
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_buro_results
DROP POLICY IF EXISTS "cs_buro_results_select" ON cs_buro_results;
CREATE POLICY "cs_buro_results_select" ON cs_buro_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_results_insert" ON cs_buro_results;
CREATE POLICY "cs_buro_results_insert" ON cs_buro_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_results_update" ON cs_buro_results;
CREATE POLICY "cs_buro_results_update" ON cs_buro_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_buro_results_delete" ON cs_buro_results;
CREATE POLICY "cs_buro_results_delete" ON cs_buro_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_buro_active_credits
DROP POLICY IF EXISTS "cs_buro_active_credits_select" ON cs_buro_active_credits;
CREATE POLICY "cs_buro_active_credits_select" ON cs_buro_active_credits
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_active_credits_insert" ON cs_buro_active_credits;
CREATE POLICY "cs_buro_active_credits_insert" ON cs_buro_active_credits
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_active_credits_update" ON cs_buro_active_credits;
CREATE POLICY "cs_buro_active_credits_update" ON cs_buro_active_credits
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_buro_active_credits_delete" ON cs_buro_active_credits;
CREATE POLICY "cs_buro_active_credits_delete" ON cs_buro_active_credits
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_buro_consultations
DROP POLICY IF EXISTS "cs_buro_consultations_select" ON cs_buro_consultations;
CREATE POLICY "cs_buro_consultations_select" ON cs_buro_consultations
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_consultations_insert" ON cs_buro_consultations;
CREATE POLICY "cs_buro_consultations_insert" ON cs_buro_consultations
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_consultations_update" ON cs_buro_consultations;
CREATE POLICY "cs_buro_consultations_update" ON cs_buro_consultations
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_buro_consultations_delete" ON cs_buro_consultations;
CREATE POLICY "cs_buro_consultations_delete" ON cs_buro_consultations
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_buro_liquidated
DROP POLICY IF EXISTS "cs_buro_liquidated_select" ON cs_buro_liquidated;
CREATE POLICY "cs_buro_liquidated_select" ON cs_buro_liquidated
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_liquidated_insert" ON cs_buro_liquidated;
CREATE POLICY "cs_buro_liquidated_insert" ON cs_buro_liquidated
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_liquidated_update" ON cs_buro_liquidated;
CREATE POLICY "cs_buro_liquidated_update" ON cs_buro_liquidated
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_buro_liquidated_delete" ON cs_buro_liquidated;
CREATE POLICY "cs_buro_liquidated_delete" ON cs_buro_liquidated
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_buro_hawk_checks
DROP POLICY IF EXISTS "cs_buro_hawk_checks_select" ON cs_buro_hawk_checks;
CREATE POLICY "cs_buro_hawk_checks_select" ON cs_buro_hawk_checks
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_hawk_checks_insert" ON cs_buro_hawk_checks;
CREATE POLICY "cs_buro_hawk_checks_insert" ON cs_buro_hawk_checks
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_hawk_checks_update" ON cs_buro_hawk_checks;
CREATE POLICY "cs_buro_hawk_checks_update" ON cs_buro_hawk_checks
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_buro_hawk_checks_delete" ON cs_buro_hawk_checks;
CREATE POLICY "cs_buro_hawk_checks_delete" ON cs_buro_hawk_checks
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_buro_debt_rotation
DROP POLICY IF EXISTS "cs_buro_debt_rotation_select" ON cs_buro_debt_rotation;
CREATE POLICY "cs_buro_debt_rotation_select" ON cs_buro_debt_rotation
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_debt_rotation_insert" ON cs_buro_debt_rotation;
CREATE POLICY "cs_buro_debt_rotation_insert" ON cs_buro_debt_rotation
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_buro_debt_rotation_update" ON cs_buro_debt_rotation;
CREATE POLICY "cs_buro_debt_rotation_update" ON cs_buro_debt_rotation
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_buro_debt_rotation_delete" ON cs_buro_debt_rotation;
CREATE POLICY "cs_buro_debt_rotation_delete" ON cs_buro_debt_rotation
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 13. Documentation Engine Tables (application-linked)
-- ============================================================

-- cs_documents
DROP POLICY IF EXISTS "cs_documents_select" ON cs_documents;
CREATE POLICY "cs_documents_select" ON cs_documents
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_documents_insert" ON cs_documents;
CREATE POLICY "cs_documents_insert" ON cs_documents
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_documents_update" ON cs_documents;
CREATE POLICY "cs_documents_update" ON cs_documents
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_documents_delete" ON cs_documents;
CREATE POLICY "cs_documents_delete" ON cs_documents
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_document_validations (linked via document_id → cs_documents → application_id)
-- Uses a subquery to resolve application ownership through cs_documents
DROP POLICY IF EXISTS "cs_doc_validations_select" ON cs_document_validations;
CREATE POLICY "cs_doc_validations_select" ON cs_document_validations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cs_documents d
      WHERE d.id = cs_document_validations.document_id
        AND cs_can_access_application(d.application_id)
    )
  );

DROP POLICY IF EXISTS "cs_doc_validations_insert" ON cs_document_validations;
CREATE POLICY "cs_doc_validations_insert" ON cs_document_validations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM cs_documents d
      WHERE d.id = cs_document_validations.document_id
        AND cs_can_access_application(d.application_id)
    )
  );

DROP POLICY IF EXISTS "cs_doc_validations_update" ON cs_document_validations;
CREATE POLICY "cs_doc_validations_update" ON cs_document_validations
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_doc_validations_delete" ON cs_document_validations;
CREATE POLICY "cs_doc_validations_delete" ON cs_document_validations
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- cs_documentation_results
DROP POLICY IF EXISTS "cs_doc_results_select" ON cs_documentation_results;
CREATE POLICY "cs_doc_results_select" ON cs_documentation_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_doc_results_insert" ON cs_documentation_results;
CREATE POLICY "cs_doc_results_insert" ON cs_documentation_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_doc_results_update" ON cs_documentation_results;
CREATE POLICY "cs_doc_results_update" ON cs_documentation_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_doc_results_delete" ON cs_documentation_results;
CREATE POLICY "cs_doc_results_delete" ON cs_documentation_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 14. Financial Engine Tables (all application-linked)
-- ============================================================

-- cs_financial_inputs
DROP POLICY IF EXISTS "cs_fin_inputs_select" ON cs_financial_inputs;
CREATE POLICY "cs_fin_inputs_select" ON cs_financial_inputs
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_inputs_insert" ON cs_financial_inputs;
CREATE POLICY "cs_fin_inputs_insert" ON cs_financial_inputs
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_inputs_update" ON cs_financial_inputs;
CREATE POLICY "cs_fin_inputs_update" ON cs_financial_inputs
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fin_inputs_delete" ON cs_financial_inputs;
CREATE POLICY "cs_fin_inputs_delete" ON cs_financial_inputs
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_financial_calculations
DROP POLICY IF EXISTS "cs_fin_calc_select" ON cs_financial_calculations;
CREATE POLICY "cs_fin_calc_select" ON cs_financial_calculations
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_calc_insert" ON cs_financial_calculations;
CREATE POLICY "cs_fin_calc_insert" ON cs_financial_calculations
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_calc_update" ON cs_financial_calculations;
CREATE POLICY "cs_fin_calc_update" ON cs_financial_calculations
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fin_calc_delete" ON cs_financial_calculations;
CREATE POLICY "cs_fin_calc_delete" ON cs_financial_calculations
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_financial_results
DROP POLICY IF EXISTS "cs_fin_results_select" ON cs_financial_results;
CREATE POLICY "cs_fin_results_select" ON cs_financial_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_results_insert" ON cs_financial_results;
CREATE POLICY "cs_fin_results_insert" ON cs_financial_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_results_update" ON cs_financial_results;
CREATE POLICY "cs_fin_results_update" ON cs_financial_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fin_results_delete" ON cs_financial_results;
CREATE POLICY "cs_fin_results_delete" ON cs_financial_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_financial_balance_detail
DROP POLICY IF EXISTS "cs_fin_balance_select" ON cs_financial_balance_detail;
CREATE POLICY "cs_fin_balance_select" ON cs_financial_balance_detail
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_balance_insert" ON cs_financial_balance_detail;
CREATE POLICY "cs_fin_balance_insert" ON cs_financial_balance_detail
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_balance_update" ON cs_financial_balance_detail;
CREATE POLICY "cs_fin_balance_update" ON cs_financial_balance_detail
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fin_balance_delete" ON cs_financial_balance_detail;
CREATE POLICY "cs_fin_balance_delete" ON cs_financial_balance_detail
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_financial_income_detail
DROP POLICY IF EXISTS "cs_fin_income_select" ON cs_financial_income_detail;
CREATE POLICY "cs_fin_income_select" ON cs_financial_income_detail
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_income_insert" ON cs_financial_income_detail;
CREATE POLICY "cs_fin_income_insert" ON cs_financial_income_detail
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_income_update" ON cs_financial_income_detail;
CREATE POLICY "cs_fin_income_update" ON cs_financial_income_detail
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fin_income_delete" ON cs_financial_income_detail;
CREATE POLICY "cs_fin_income_delete" ON cs_financial_income_detail
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_financial_related_parties
DROP POLICY IF EXISTS "cs_fin_rp_select" ON cs_financial_related_parties;
CREATE POLICY "cs_fin_rp_select" ON cs_financial_related_parties
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_rp_insert" ON cs_financial_related_parties;
CREATE POLICY "cs_fin_rp_insert" ON cs_financial_related_parties
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_rp_update" ON cs_financial_related_parties;
CREATE POLICY "cs_fin_rp_update" ON cs_financial_related_parties
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fin_rp_delete" ON cs_financial_related_parties;
CREATE POLICY "cs_fin_rp_delete" ON cs_financial_related_parties
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_financial_balanza
DROP POLICY IF EXISTS "cs_fin_balanza_select" ON cs_financial_balanza;
CREATE POLICY "cs_fin_balanza_select" ON cs_financial_balanza
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_balanza_insert" ON cs_financial_balanza;
CREATE POLICY "cs_fin_balanza_insert" ON cs_financial_balanza
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_fin_balanza_update" ON cs_financial_balanza;
CREATE POLICY "cs_fin_balanza_update" ON cs_financial_balanza
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_fin_balanza_delete" ON cs_financial_balanza;
CREATE POLICY "cs_fin_balanza_delete" ON cs_financial_balanza
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');


-- ============================================================
-- 15. Trend Analysis Tables
-- ============================================================

-- cs_trend_timeseries (application-linked)
DROP POLICY IF EXISTS "cs_trend_ts_select" ON cs_trend_timeseries;
CREATE POLICY "cs_trend_ts_select" ON cs_trend_timeseries
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_trend_ts_insert" ON cs_trend_timeseries;
CREATE POLICY "cs_trend_ts_insert" ON cs_trend_timeseries
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_trend_ts_update" ON cs_trend_timeseries;
CREATE POLICY "cs_trend_ts_update" ON cs_trend_timeseries
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_trend_ts_delete" ON cs_trend_timeseries;
CREATE POLICY "cs_trend_ts_delete" ON cs_trend_timeseries
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_trend_results (application-linked)
DROP POLICY IF EXISTS "cs_trend_results_select" ON cs_trend_results;
CREATE POLICY "cs_trend_results_select" ON cs_trend_results
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_trend_results_insert" ON cs_trend_results;
CREATE POLICY "cs_trend_results_insert" ON cs_trend_results
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_trend_results_update" ON cs_trend_results;
CREATE POLICY "cs_trend_results_update" ON cs_trend_results
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_trend_results_delete" ON cs_trend_results;
CREATE POLICY "cs_trend_results_delete" ON cs_trend_results
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_trend_ai_narrative (application-linked)
DROP POLICY IF EXISTS "cs_trend_narrative_select" ON cs_trend_ai_narrative;
CREATE POLICY "cs_trend_narrative_select" ON cs_trend_ai_narrative
  FOR SELECT USING (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_trend_narrative_insert" ON cs_trend_ai_narrative;
CREATE POLICY "cs_trend_narrative_insert" ON cs_trend_ai_narrative
  FOR INSERT WITH CHECK (cs_can_access_application(application_id));

DROP POLICY IF EXISTS "cs_trend_narrative_update" ON cs_trend_ai_narrative;
CREATE POLICY "cs_trend_narrative_update" ON cs_trend_ai_narrative
  FOR UPDATE USING (auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin'));

DROP POLICY IF EXISTS "cs_trend_narrative_delete" ON cs_trend_ai_narrative;
CREATE POLICY "cs_trend_narrative_delete" ON cs_trend_ai_narrative
  FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- cs_trend_charts_config (config/reference — read-only for all authenticated)
DROP POLICY IF EXISTS "cs_trend_charts_config_select" ON cs_trend_charts_config;
CREATE POLICY "cs_trend_charts_config_select" ON cs_trend_charts_config
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "cs_trend_charts_config_insert" ON cs_trend_charts_config;
CREATE POLICY "cs_trend_charts_config_insert" ON cs_trend_charts_config
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_trend_charts_config_update" ON cs_trend_charts_config;
CREATE POLICY "cs_trend_charts_config_update" ON cs_trend_charts_config
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('manager', 'committee', 'admin')
  );

DROP POLICY IF EXISTS "cs_trend_charts_config_delete" ON cs_trend_charts_config;
CREATE POLICY "cs_trend_charts_config_delete" ON cs_trend_charts_config
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );
