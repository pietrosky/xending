-- ============================================================================
-- 044_grant_supabase_runtime_roles.sql
-- Ensure Supabase/PostgREST runtime roles have table privileges.
-- RLS remains responsible for row-level access.
-- ============================================================================

DO $$
DECLARE
  runtime_role TEXT;
BEGIN
  FOREACH runtime_role IN ARRAY ARRAY['authenticated', 'admin', 'broker']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_role) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', runtime_role);
      EXECUTE format('GRANT USAGE ON SCHEMA archive TO %I', runtime_role);
      EXECUTE format('GRANT USAGE ON SCHEMA storage TO %I', runtime_role);

      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_companies TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_companies_owners TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_company_contacts TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_company_payment_accounts TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON public.fx_transactions TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE ON public.pi_accounts TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT SELECT, UPDATE ON public.profiles TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT SELECT, INSERT ON archive.cs_companies TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT SELECT ON storage.buckets TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO %I',
        runtime_role
      );
    END IF;
  END LOOP;
END $$;
