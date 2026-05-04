-- ============================================================================
-- 041_supabase_auth_profiles_rls.sql
-- Move application data access to Supabase Auth + supabase-js.
-- ============================================================================

-- Profiles mirror public, display-safe fields from auth.users.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
  updated_at = now();

CREATE OR REPLACE FUNCTION public.handle_auth_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_profile();

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'broker');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.current_app_role() = 'admin';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.user_owns_company(company UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cs_companies_owners owner
    WHERE owner.company_id = company
      AND owner.user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.company_has_no_owners(company UUID)
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.cs_companies_owners owner
    WHERE owner.company_id = company
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.storage_object_transaction_id(object_name TEXT)
RETURNS UUID AS $$
  SELECT NULLIF((storage.foldername(object_name))[1], '')::UUID;
$$ LANGUAGE sql IMMUTABLE;

-- Archive trigger must use Supabase Auth instead of legacy app.current_user_id.
CREATE OR REPLACE FUNCTION public.archive_company_on_update()
RETURNS TRIGGER AS $$
DECLARE
  actor UUID := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Cannot archive company update without authenticated user';
  END IF;

  INSERT INTO archive.cs_companies (original_id, full_record, archived_by)
  VALUES (OLD.id, to_jsonb(OLD), actor);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, archive;

DROP TRIGGER IF EXISTS trg_archive_company ON public.cs_companies;
CREATE TRIGGER trg_archive_company
  BEFORE UPDATE ON public.cs_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_company_on_update();

-- Supabase Auth uses anon/authenticated roles. RLS still decides scope.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA archive TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.cs_companies,
  public.cs_companies_owners,
  public.cs_company_contacts,
  public.cs_company_payment_accounts,
  public.fx_transactions
TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pi_accounts TO authenticated;
GRANT SELECT ON archive.cs_companies TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Keep local_users during QA, but remove the legacy RPC login surface.
DROP FUNCTION IF EXISTS public.login(TEXT, TEXT);

-- Storage bucket: public URLs are stored in fx_transactions.proof_url.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fx-proofs',
  'fx-proofs',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_companies_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_company_payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pi_accounts ENABLE ROW LEVEL SECURITY;

-- Remove legacy and development-open policies from the exposed FX tables.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'cs_companies',
    'cs_companies_owners',
    'cs_company_contacts',
    'cs_company_payment_accounts',
    'fx_transactions',
    'pi_accounts'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS dev_open_select ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS dev_open_insert ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS dev_open_update ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS dev_open_delete ON public.%I', table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "admin_full_access" ON public.cs_companies;
DROP POLICY IF EXISTS "broker_own_companies" ON public.cs_companies;
DROP POLICY IF EXISTS "admin_full_access_tx" ON public.fx_transactions;
DROP POLICY IF EXISTS "broker_own_transactions" ON public.fx_transactions;
DROP POLICY IF EXISTS "broker_create_transactions" ON public.fx_transactions;
DROP POLICY IF EXISTS "admin_full_access_pi" ON public.pi_accounts;
DROP POLICY IF EXISTS "broker_read_active_pi" ON public.pi_accounts;

DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS cs_companies_admin_all ON public.cs_companies;
DROP POLICY IF EXISTS cs_companies_broker_select ON public.cs_companies;
DROP POLICY IF EXISTS cs_companies_authenticated_insert ON public.cs_companies;
DROP POLICY IF EXISTS cs_companies_broker_update ON public.cs_companies;
DROP POLICY IF EXISTS cs_companies_broker_delete ON public.cs_companies;
CREATE POLICY cs_companies_admin_all ON public.cs_companies
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY cs_companies_broker_select ON public.cs_companies
  FOR SELECT TO authenticated
  USING (public.user_owns_company(id));
CREATE POLICY cs_companies_authenticated_insert ON public.cs_companies
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY cs_companies_broker_update ON public.cs_companies
  FOR UPDATE TO authenticated
  USING (public.user_owns_company(id))
  WITH CHECK (public.user_owns_company(id));
CREATE POLICY cs_companies_broker_delete ON public.cs_companies
  FOR DELETE TO authenticated
  USING (public.user_owns_company(id));

DROP POLICY IF EXISTS cs_company_owners_admin_all ON public.cs_companies_owners;
DROP POLICY IF EXISTS cs_company_owners_select_related ON public.cs_companies_owners;
DROP POLICY IF EXISTS cs_company_owners_insert_initial_self ON public.cs_companies_owners;
DROP POLICY IF EXISTS cs_company_owners_delete_self ON public.cs_companies_owners;
CREATE POLICY cs_company_owners_admin_all ON public.cs_companies_owners
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY cs_company_owners_select_related ON public.cs_companies_owners
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_owns_company(company_id));
CREATE POLICY cs_company_owners_insert_initial_self ON public.cs_companies_owners
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.company_has_no_owners(company_id)
  );
CREATE POLICY cs_company_owners_delete_self ON public.cs_companies_owners
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS cs_company_contacts_admin_all ON public.cs_company_contacts;
DROP POLICY IF EXISTS cs_company_contacts_broker_all ON public.cs_company_contacts;
CREATE POLICY cs_company_contacts_admin_all ON public.cs_company_contacts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY cs_company_contacts_broker_all ON public.cs_company_contacts
  FOR ALL TO authenticated
  USING (public.user_owns_company(company_id))
  WITH CHECK (public.user_owns_company(company_id));

DROP POLICY IF EXISTS cs_company_payment_accounts_admin_all ON public.cs_company_payment_accounts;
DROP POLICY IF EXISTS cs_company_payment_accounts_broker_all ON public.cs_company_payment_accounts;
CREATE POLICY cs_company_payment_accounts_admin_all ON public.cs_company_payment_accounts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY cs_company_payment_accounts_broker_all ON public.cs_company_payment_accounts
  FOR ALL TO authenticated
  USING (public.user_owns_company(company_id))
  WITH CHECK (public.user_owns_company(company_id));

DROP POLICY IF EXISTS fx_transactions_admin_all ON public.fx_transactions;
DROP POLICY IF EXISTS fx_transactions_broker_select ON public.fx_transactions;
DROP POLICY IF EXISTS fx_transactions_broker_insert ON public.fx_transactions;
DROP POLICY IF EXISTS fx_transactions_broker_update ON public.fx_transactions;
DROP POLICY IF EXISTS fx_transactions_broker_delete ON public.fx_transactions;
CREATE POLICY fx_transactions_admin_all ON public.fx_transactions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY fx_transactions_broker_select ON public.fx_transactions
  FOR SELECT TO authenticated
  USING (public.user_owns_company(company_id));
CREATE POLICY fx_transactions_broker_insert ON public.fx_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_owns_company(company_id)
  );
CREATE POLICY fx_transactions_broker_update ON public.fx_transactions
  FOR UPDATE TO authenticated
  USING (public.user_owns_company(company_id))
  WITH CHECK (public.user_owns_company(company_id));
CREATE POLICY fx_transactions_broker_delete ON public.fx_transactions
  FOR DELETE TO authenticated
  USING (public.user_owns_company(company_id));

DROP POLICY IF EXISTS pi_accounts_admin_all ON public.pi_accounts;
DROP POLICY IF EXISTS pi_accounts_authenticated_read_active ON public.pi_accounts;
DROP POLICY IF EXISTS pi_accounts_authenticated_insert ON public.pi_accounts;
DROP POLICY IF EXISTS pi_accounts_creator_update ON public.pi_accounts;
CREATE POLICY pi_accounts_admin_all ON public.pi_accounts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY pi_accounts_authenticated_read_active ON public.pi_accounts
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin());
CREATE POLICY pi_accounts_authenticated_insert ON public.pi_accounts
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY pi_accounts_creator_update ON public.pi_accounts
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "upload_proof" ON storage.objects;
DROP POLICY IF EXISTS "read_proof" ON storage.objects;
DROP POLICY IF EXISTS fx_proofs_insert_authorized ON storage.objects;
DROP POLICY IF EXISTS fx_proofs_select_related ON storage.objects;
CREATE POLICY fx_proofs_insert_authorized ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fx-proofs'
    AND EXISTS (
      SELECT 1
      FROM public.fx_transactions tx
      WHERE tx.id = public.storage_object_transaction_id(name)
        AND tx.status IN ('authorized', 'completed')
        AND (public.is_admin() OR public.user_owns_company(tx.company_id))
    )
  );
CREATE POLICY fx_proofs_select_related ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'fx-proofs'
    AND EXISTS (
      SELECT 1
      FROM public.fx_transactions tx
      WHERE tx.id = public.storage_object_transaction_id(name)
        AND (public.is_admin() OR public.user_owns_company(tx.company_id))
    )
  );
