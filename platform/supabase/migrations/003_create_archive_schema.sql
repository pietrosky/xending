-- Migration: Create archive schema and archive.cs_companies table
-- Spec: fx-transactions, Task 3.3
-- Requirements: 3.1, 3.2, 3.3

CREATE SCHEMA IF NOT EXISTS archive;

CREATE TABLE archive.cs_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_id UUID NOT NULL,
    full_record JSONB NOT NULL,
    archived_by UUID NOT NULL REFERENCES auth.users(id),
    archived_at TIMESTAMPTZ DEFAULT now()
);

-- Solo INSERT permitido (sin UPDATE ni DELETE)
REVOKE UPDATE, DELETE ON archive.cs_companies FROM PUBLIC;

-- Trigger para archivar antes de UPDATE
CREATE OR REPLACE FUNCTION archive_company_on_update()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO archive.cs_companies (original_id, full_record, archived_by)
    VALUES (OLD.id, to_jsonb(OLD), current_setting('app.current_user_id')::uuid);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_archive_company
    BEFORE UPDATE ON cs_companies
    FOR EACH ROW
    EXECUTE FUNCTION archive_company_on_update();
