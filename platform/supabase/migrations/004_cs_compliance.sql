-- Credit Scoring: Compliance Engine (Scory)
-- Gate logic: pass/fail/hard_stop — does NOT contribute to weighted score.
-- Validates: listas negras, SYGER, RUG, PEPs, OFAC, 69B.

CREATE TABLE IF NOT EXISTS cs_compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  check_type text NOT NULL CHECK (check_type IN ('listas_negras', 'syger', 'rug', 'peps', 'ofac', '69b')),
  result text NOT NULL CHECK (result IN ('pass', 'fail', 'review_required')),
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_compliance_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  overall_status text NOT NULL CHECK (overall_status IN ('pass', 'fail', 'hard_stop', 'review_required')),
  risk_flags jsonb NOT NULL DEFAULT '[]',
  blocking_reason text,
  scory_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cs_compliance_checks_app ON cs_compliance_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_compliance_results_app ON cs_compliance_results(application_id);

-- RLS
ALTER TABLE cs_compliance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_compliance_results ENABLE ROW LEVEL SECURITY;
