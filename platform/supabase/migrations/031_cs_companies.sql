-- ============================================================================
-- Migration 031: I01 Data Layer — cs_companies + cs_company_contacts
-- M01 Onboarding Lite: Alta de clientes por admin
-- ============================================================================

-- ─── Tabla maestra de empresas ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS cs_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'xending',
  rfc TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  business_activity TEXT,
  tax_regime TEXT,
  incorporation_date DATE,
  address JSONB DEFAULT '{}'::jsonb,
  -- IDs de proveedores externos (se llenan en Fase 2)
  syntage_entity_id TEXT,
  scory_entity_id TEXT,
  -- Estado
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'blacklisted')),
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- RFC único por tenant
  UNIQUE(tenant_id, rfc)
);

CREATE INDEX idx_cs_companies_tenant ON cs_companies(tenant_id);
CREATE INDEX idx_cs_companies_rfc ON cs_companies(rfc);
CREATE INDEX idx_cs_companies_status ON cs_companies(status);
CREATE INDEX idx_cs_companies_activity ON cs_companies(business_activity);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_company_timestamp()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trg_company_updated
  BEFORE UPDATE ON cs_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_company_timestamp();

-- ─── Contactos de empresa ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cs_company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cs_companies(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL
    CHECK (contact_type IN ('email', 'phone', 'legal_rep', 'admin', 'billing')),
  contact_value TEXT NOT NULL,
  contact_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cs_contacts_company ON cs_company_contacts(company_id);
CREATE INDEX idx_cs_contacts_type ON cs_company_contacts(contact_type);

-- ─── Vista de empresas con contacto principal ────────────────────────

CREATE OR REPLACE VIEW cs_companies_summary AS
SELECT
  c.id,
  c.tenant_id,
  c.rfc,
  c.legal_name,
  c.trade_name,
  c.business_activity,
  c.status,
  c.created_at,
  c.updated_at,
  -- Email principal
  (SELECT cc.contact_value FROM cs_company_contacts cc
   WHERE cc.company_id = c.id AND cc.contact_type = 'email' AND cc.is_primary = true
   LIMIT 1
  ) AS primary_email,
  -- Teléfono principal
  (SELECT cc.contact_value FROM cs_company_contacts cc
   WHERE cc.company_id = c.id AND cc.contact_type = 'phone' AND cc.is_primary = true
   LIMIT 1
  ) AS primary_phone,
  -- Total contactos
  (SELECT COUNT(*) FROM cs_company_contacts cc WHERE cc.company_id = c.id) AS contact_count
FROM cs_companies c;

-- ─── Comentarios ─────────────────────────────────────────────────────

COMMENT ON TABLE cs_companies IS 'Entidad maestra de empresas — I01 Data Layer';
COMMENT ON TABLE cs_company_contacts IS 'Contactos de empresa (email, teléfono, representante legal, etc.)';
COMMENT ON COLUMN cs_companies.tenant_id IS 'Tenant al que pertenece (default xending). RFC es único por tenant';
COMMENT ON COLUMN cs_companies.status IS 'active = operando, inactive = suspendido, blacklisted = bloqueado por PLD';
