-- Credit Scoring: Working Capital Engine

CREATE TABLE IF NOT EXISTS cs_working_capital_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('sat', 'financial_statements', 'manual', 'combined')),
  raw_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_working_capital_cycle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  period text NOT NULL,
  dso numeric,
  dio numeric,
  dpo numeric,
  ccc numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_working_capital_aging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  aging_type text NOT NULL CHECK (aging_type IN ('cxc', 'cxp')),
  period text NOT NULL,
  aging_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_working_capital_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  module_status text NOT NULL,
  module_score numeric NOT NULL,
  module_grade text NOT NULL,
  risk_flags jsonb NOT NULL DEFAULT '[]',
  key_metrics jsonb NOT NULL DEFAULT '{}',
  benchmark_comparison jsonb NOT NULL DEFAULT '{}',
  explanation text,
  recommended_actions jsonb NOT NULL DEFAULT '[]',
  trend_factor numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_wc_inputs_app ON cs_working_capital_inputs(application_id);
CREATE INDEX idx_cs_wc_cycle_app ON cs_working_capital_cycle(application_id);
CREATE INDEX idx_cs_wc_aging_app ON cs_working_capital_aging(application_id);
CREATE INDEX idx_cs_wc_results_app ON cs_working_capital_results(application_id);

-- RLS
ALTER TABLE cs_working_capital_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_working_capital_cycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_working_capital_aging ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_working_capital_results ENABLE ROW LEVEL SECURITY;
