-- Credit Scoring: Documentation Engine

CREATE TABLE IF NOT EXISTS cs_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- 'acta_constitutiva', 'poder', 'ine', 'comprobante_domicilio', 'estados_financieros', 'declaraciones'
  file_name text,
  file_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'validated', 'rejected', 'expired')),
  is_required boolean NOT NULL DEFAULT true,
  is_blocking boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_document_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES cs_documents(id) ON DELETE CASCADE,
  validation_type text NOT NULL, -- 'format', 'readability', 'ocr', 'expiration'
  result text NOT NULL CHECK (result IN ('pass', 'fail', 'warning')),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_documentation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  module_status text NOT NULL,
  module_score numeric NOT NULL,
  module_grade text NOT NULL,
  completeness_percent numeric NOT NULL DEFAULT 0,
  risk_flags jsonb NOT NULL DEFAULT '[]',
  key_metrics jsonb NOT NULL DEFAULT '{}',
  explanation text,
  recommended_actions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cs_documents_app ON cs_documents(application_id);
CREATE INDEX idx_cs_doc_validations_doc ON cs_document_validations(document_id);
CREATE INDEX idx_cs_doc_results_app ON cs_documentation_results(application_id);

ALTER TABLE cs_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_document_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_documentation_results ENABLE ROW LEVEL SECURITY;
