-- Credit Scoring: AI Analysis (Decision Layer)

CREATE TABLE IF NOT EXISTS cs_ai_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  risk_narrative text,
  top_risks jsonb NOT NULL DEFAULT '[]',
  top_strengths jsonb NOT NULL DEFAULT '[]',
  confidence_score numeric,
  hidden_risks jsonb NOT NULL DEFAULT '[]',
  trend_narrative text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_ai_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  scenario_type text NOT NULL,
  scenario_description text,
  impact_assessment jsonb NOT NULL DEFAULT '{}',
  probability text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  recommendation_text text,
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  engine_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_ai_analysis_app ON cs_ai_analysis(application_id);
CREATE INDEX idx_cs_ai_scenarios_app ON cs_ai_scenarios(application_id);
CREATE INDEX idx_cs_ai_recommendations_app ON cs_ai_recommendations(application_id);

-- RLS
ALTER TABLE cs_ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_ai_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_ai_recommendations ENABLE ROW LEVEL SECURITY;
