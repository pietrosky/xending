-- ============================================================================
-- 042_ensure_archive_company_table.sql
-- Ensure company archive infrastructure exists before cs_companies updates.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE IF NOT EXISTS archive.cs_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL,
  full_record JSONB NOT NULL,
  archived_by UUID NOT NULL REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_archive_cs_companies_original_id
  ON archive.cs_companies(original_id);

REVOKE UPDATE, DELETE ON archive.cs_companies FROM PUBLIC;
GRANT USAGE ON SCHEMA archive TO authenticated;
GRANT SELECT, INSERT ON archive.cs_companies TO authenticated;

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
