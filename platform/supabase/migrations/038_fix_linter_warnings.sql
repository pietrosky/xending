-- Fix Supabase linter warnings: search_path, extensions, permissive RLS

-- 1. Function search_path
ALTER FUNCTION public.archive_company_on_update() SET search_path = '';
ALTER FUNCTION public.generate_expediente_folio() SET search_path = '';
ALTER FUNCTION public.update_expediente_timestamp() SET search_path = '';
ALTER FUNCTION public.prevent_data_field_update() SET search_path = '';

-- 2. Move extensions out of public
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION "uuid-ossp" SET SCHEMA extensions;
ALTER EXTENSION pgcrypto SET SCHEMA extensions;

-- 3. Fix permissive RLS policies (USING(true)/WITH CHECK(true) → require auth.uid())
DROP POLICY IF EXISTS cs_rules_update ON cs_business_rules;
CREATE POLICY cs_rules_update ON cs_business_rules FOR UPDATE TO authenticated
  USING (auth.role() = 'admin') WITH CHECK (auth.role() = 'admin');

DROP POLICY IF EXISTS cs_events_insert ON cs_expediente_events;
CREATE POLICY cs_events_insert ON cs_expediente_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS cs_tokens_insert ON cs_expediente_tokens;
CREATE POLICY cs_tokens_insert ON cs_expediente_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS cs_tokens_update ON cs_expediente_tokens;
CREATE POLICY cs_tokens_update ON cs_expediente_tokens FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS cs_expedientes_insert ON cs_expedientes;
CREATE POLICY cs_expedientes_insert ON cs_expedientes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS cs_expedientes_update ON cs_expedientes;
CREATE POLICY cs_expedientes_update ON cs_expedientes FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
