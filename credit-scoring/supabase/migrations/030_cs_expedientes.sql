-- ============================================================================
-- Migration 030: Sistema de Expedientes Digitales de Crédito
-- Fase 6A: Expedientes + Tokens + Eventos + Pre-filtro
-- ============================================================================

-- ─── Tabla principal de expedientes ──────────────────────────────────

CREATE TABLE IF NOT EXISTS cs_expedientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Folio legible: XND-YYYY-NNNNN
  folio TEXT NOT NULL UNIQUE,
  rfc TEXT NOT NULL,
  company_name TEXT NOT NULL,
  requested_amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('MXN', 'USD')),
  credit_purpose TEXT NOT NULL CHECK (credit_purpose IN (
    'importacion', 'factoraje', 'operaciones_fx', 'exportacion'
  )),
  declared_annual_revenue NUMERIC(15,2) NOT NULL,
  declared_business_age NUMERIC(4,1) NOT NULL,
  term_days INTEGER NOT NULL CHECK (term_days BETWEEN 2 AND 90),
  -- Estado del expediente
  stage TEXT NOT NULL DEFAULT 'pre_filter' CHECK (stage IN (
    'pre_filter', 'pld_check', 'buro_authorization', 'sat_linkage',
    'analysis', 'documentation', 'decision', 'approved', 'rejected', 'expired'
  )),
  rejection_reason TEXT,
  rejected_at_stage TEXT,
  -- Contacto
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  legal_representative TEXT,
  -- IDs externos (se llenan conforme avanza el flujo)
  syntage_entity_id TEXT,
  application_id UUID REFERENCES cs_applications(id),
  -- Scores parciales
  pre_filter_score NUMERIC(5,2),
  buro_score NUMERIC(5,1),
  pld_score NUMERIC(5,2),
  -- Metadata flexible
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para expedientes
CREATE INDEX idx_cs_expedientes_rfc ON cs_expedientes(rfc);
CREATE INDEX idx_cs_expedientes_folio ON cs_expedientes(folio);
CREATE INDEX idx_cs_expedientes_stage ON cs_expedientes(stage);
CREATE INDEX idx_cs_expedientes_created ON cs_expedientes(created_at DESC);
CREATE INDEX idx_cs_expedientes_email ON cs_expedientes(contact_email);

-- ─── Secuencia para folios ───────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS cs_expediente_folio_seq START 1;

-- Función para generar folio automático: XND-2026-00001
CREATE OR REPLACE FUNCTION generate_expediente_folio()
RETURNS TRIGGER AS $$
BEGIN
  NEW.folio := 'XND-' || EXTRACT(YEAR FROM now())::TEXT || '-' ||
               LPAD(nextval('cs_expediente_folio_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expediente_folio
  BEFORE INSERT ON cs_expedientes
  FOR EACH ROW
  WHEN (NEW.folio IS NULL OR NEW.folio = '')
  EXECUTE FUNCTION generate_expediente_folio();

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_expediente_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expediente_updated
  BEFORE UPDATE ON cs_expedientes
  FOR EACH ROW
  EXECUTE FUNCTION update_expediente_timestamp();

-- ─── Tokens de acceso (sesiones por link) ────────────────────────────

CREATE TABLE IF NOT EXISTS cs_expediente_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id UUID NOT NULL REFERENCES cs_expedientes(id) ON DELETE CASCADE,
  -- Token UUID que va en la URL
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN (
    'buro_signature', 'ciec_linkage', 'document_upload', 'general_access'
  )),
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cs_tokens_token ON cs_expediente_tokens(token);
CREATE INDEX idx_cs_tokens_expediente ON cs_expediente_tokens(expediente_id);
CREATE INDEX idx_cs_tokens_expires ON cs_expediente_tokens(expires_at);

-- ─── Eventos del expediente (audit log inmutable) ────────────────────

CREATE TABLE IF NOT EXISTS cs_expediente_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expediente_id UUID NOT NULL REFERENCES cs_expedientes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stage TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB,
  -- Quién generó: 'system', 'analyst:user_id', 'applicant:token_id'
  actor TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cs_events_expediente ON cs_expediente_events(expediente_id);
CREATE INDEX idx_cs_events_type ON cs_expediente_events(event_type);
CREATE INDEX idx_cs_events_created ON cs_expediente_events(created_at DESC);

-- ─── Tabla de reglas de negocio (configurable) ───────────────────────

CREATE TABLE IF NOT EXISTS cs_business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL UNIQUE,
  rule_value JSONB NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar reglas por defecto de Xending
INSERT INTO cs_business_rules (rule_key, rule_value, description) VALUES
  ('min_amount_usd', '100000', 'Monto mínimo de crédito en USD'),
  ('max_amount_usd', '1000000', 'Monto máximo de crédito en USD'),
  ('min_revenue_multiplier', '10', 'Ventas anuales mínimas = X veces el monto solicitado'),
  ('min_business_age_years', '2', 'Antigüedad mínima del negocio en años'),
  ('accepted_purposes', '["importacion","factoraje","operaciones_fx","exportacion"]', 'Propósitos de crédito aceptados'),
  ('min_term_days', '2', 'Plazo mínimo en días'),
  ('max_term_days', '45', 'Plazo máximo en días sin garantía'),
  ('max_term_days_with_guarantee', '90', 'Plazo máximo en días con garantía'),
  ('min_buro_score', '600', 'Score mínimo de Buró para continuar'),
  ('token_expiry_hours', '72', 'Horas de vigencia del token de acceso'),
  ('reminder_after_hours', '48', 'Horas antes de enviar recordatorio')
ON CONFLICT (rule_key) DO NOTHING;

-- ─── Vista útil: expedientes activos con último evento ───────────────

CREATE OR REPLACE VIEW cs_expedientes_dashboard AS
SELECT
  e.id,
  e.folio,
  e.rfc,
  e.company_name,
  e.requested_amount,
  e.currency,
  e.credit_purpose,
  e.stage,
  e.pre_filter_score,
  e.buro_score,
  e.pld_score,
  e.contact_email,
  e.created_at,
  e.updated_at,
  -- Último evento
  (SELECT ev.description FROM cs_expediente_events ev
   WHERE ev.expediente_id = e.id ORDER BY ev.created_at DESC LIMIT 1
  ) AS last_event,
  -- Tokens activos
  (SELECT COUNT(*) FROM cs_expediente_tokens t
   WHERE t.expediente_id = e.id AND t.expires_at > now() AND NOT t.is_used
  ) AS active_tokens
FROM cs_expedientes e;

-- ─── Comentarios ─────────────────────────────────────────────────────

COMMENT ON TABLE cs_expedientes IS 'Expedientes digitales de crédito - ciclo completo de solicitud';
COMMENT ON TABLE cs_expediente_tokens IS 'Tokens de acceso por link para solicitantes (sesiones sin login)';
COMMENT ON TABLE cs_expediente_events IS 'Log inmutable de eventos del expediente (auditoría)';
COMMENT ON TABLE cs_business_rules IS 'Reglas de negocio configurables para el flujo de otorgamiento';
COMMENT ON COLUMN cs_expedientes.folio IS 'Folio legible auto-generado: XND-YYYY-NNNNN';
COMMENT ON COLUMN cs_expediente_tokens.token IS 'UUID único que va en la URL del link enviado al solicitante';
