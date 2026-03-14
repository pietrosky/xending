-- Credit Scoring: Covenants & Covenant Monitoring

CREATE TABLE IF NOT EXISTS cs_covenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  covenant_type text NOT NULL CHECK (covenant_type IN ('financial_ratio', 'revenue_minimum', 'dscr_minimum', 'leverage_maximum', 'reporting', 'insurance', 'guarantee_maintenance')),
  covenant_name text NOT NULL,
  metric_name text NOT NULL,
  threshold_value numeric NOT NULL,
  threshold_operator text NOT NULL CHECK (threshold_operator IN ('>=', '<=', '>', '<', '=')),
  frequency text NOT NULL DEFAULT 'quarterly' CHECK (frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  grace_period_days int DEFAULT 30,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical', 'hard_stop')),
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_covenant_monitoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  covenant_id uuid NOT NULL REFERENCES cs_covenants(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  check_date timestamptz NOT NULL DEFAULT now(),
  actual_value numeric,
  threshold_value numeric NOT NULL,
  compliant boolean NOT NULL,
  breach_severity text CHECK (breach_severity IN ('minor', 'material', 'critical')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_covenants_app ON cs_covenants(application_id);
CREATE INDEX idx_cs_covenant_monitoring_app ON cs_covenant_monitoring(application_id);
CREATE INDEX idx_cs_covenant_monitoring_covenant ON cs_covenant_monitoring(covenant_id);

-- RLS
ALTER TABLE cs_covenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_covenant_monitoring ENABLE ROW LEVEL SECURITY;
