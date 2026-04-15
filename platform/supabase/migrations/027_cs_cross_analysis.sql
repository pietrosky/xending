-- Credit Scoring: Cross-Engine Analysis (20 intelligent cross-checks)

CREATE TABLE IF NOT EXISTS cs_cross_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  cross_number int NOT NULL CHECK (cross_number BETWEEN 1 AND 20),
  cross_name text NOT NULL,
  engines_involved text[] NOT NULL,
  pattern_detected boolean NOT NULL DEFAULT false,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'hard_stop')),
  interpretation text,
  recommended_action text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, cross_number)
);

-- Indexes
CREATE INDEX idx_cs_cross_analysis_app ON cs_cross_analysis(application_id);

-- RLS
ALTER TABLE cs_cross_analysis ENABLE ROW LEVEL SECURITY;
