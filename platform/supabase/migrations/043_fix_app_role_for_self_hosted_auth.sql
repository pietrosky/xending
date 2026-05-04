-- ============================================================================
-- 043_fix_app_role_for_self_hosted_auth.sql
-- Read app role from auth.users for self-hosted Supabase JWT compatibility.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT AS $$
DECLARE
  db_role TEXT;
  jwt_role TEXT;
BEGIN
  SELECT raw_app_meta_data ->> 'role'
  INTO db_role
  FROM auth.users
  WHERE id = auth.uid();

  jwt_role := auth.jwt() -> 'app_metadata' ->> 'role';

  IF db_role IN ('admin', 'broker') THEN
    RETURN db_role;
  END IF;

  IF jwt_role IN ('admin', 'broker') THEN
    RETURN jwt_role;
  END IF;

  RETURN 'broker';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.current_app_role() = 'admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;
