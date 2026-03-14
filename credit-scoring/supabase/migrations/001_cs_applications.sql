-- Credit Scoring: Applications
-- Tablas principales de solicitudes de crédito

CREATE TABLE IF NOT EXISTS cs_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfc text NOT NULL,
  company_name text NOT NULL,
  requested_amount numeric NOT NULL CHECK (requested_amount > 0),
  term_months int NOT NULL CHECK (term_months > 0),
  currency text NOT NULL CHECK (currency IN ('MXN', 'USD')),
  status text NOT NULL DEFAULT 'pending_scoring'
    CHECK (status IN ('pending_scoring', 'scoring_in_progress', 'scored', 'approved', 'conditional', 'committee', 'rejected')),
  scoring_version text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_application_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_applications_rfc ON cs_applications(rfc);
CREATE INDEX idx_cs_applications_status ON cs_applications(status);
CREATE INDEX idx_cs_applications_created ON cs_applications(created_at DESC);
CREATE INDEX idx_cs_status_log_app ON cs_application_status_log(application_id);

-- RLS
ALTER TABLE cs_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_application_status_log ENABLE ROW LEVEL SECURITY;
