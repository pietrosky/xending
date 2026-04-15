-- Credit Scoring: Metadata tables

CREATE TABLE IF NOT EXISTS cs_metric_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  source text NOT NULL,
  formula text,
  unit text NOT NULL,
  engine_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_metric_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  value numeric,
  benchmark numeric,
  deviation_percent numeric,
  interpretation text,
  impact_on_score text CHECK (impact_on_score IN ('positive', 'neutral', 'negative')),
  flag text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_scoring_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  model_config jsonb NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES cs_applications(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cs_metric_values_app ON cs_metric_values(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_metric_catalog_name ON cs_metric_catalog(metric_name);
CREATE INDEX IF NOT EXISTS idx_cs_scoring_versions_active ON cs_scoring_versions(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_cs_audit_log_app ON cs_audit_log(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_audit_log_user ON cs_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_cs_audit_log_created ON cs_audit_log(created_at DESC);

-- RLS
ALTER TABLE cs_metric_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_metric_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_scoring_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_audit_log ENABLE ROW LEVEL SECURITY;
