-- Credit Scoring: Scenario Engine

CREATE TABLE IF NOT EXISTS cs_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  scenario_type text NOT NULL CHECK (scenario_type IN ('revenue_decline', 'margin_compression', 'dso_increase', 'fx_shock', 'combined')),
  scenario_name text NOT NULL,
  parameters jsonb NOT NULL,
  base_values jsonb,
  stressed_values jsonb,
  impact_summary jsonb,
  breaking_point boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_scenario_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  total_scenarios_run int,
  scenarios_passed int,
  scenarios_failed int,
  worst_case_scenario text,
  breaking_points jsonb,
  resilience_score numeric,
  module_status text NOT NULL,
  module_score numeric NOT NULL,
  module_grade text NOT NULL,
  risk_flags jsonb NOT NULL DEFAULT '[]',
  explanation text,
  recommended_actions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_scenarios_app ON cs_scenarios(application_id);
CREATE INDEX idx_cs_scenario_results_app ON cs_scenario_results(application_id);

-- RLS
ALTER TABLE cs_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_scenario_results ENABLE ROW LEVEL SECURITY;
