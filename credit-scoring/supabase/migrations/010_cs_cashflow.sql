-- Credit Scoring: CashFlow Engine

CREATE TABLE IF NOT EXISTS cs_cashflow_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('sat', 'financial_statements', 'buro', 'manual', 'combined')),
  requested_amount numeric,
  term_months int,
  interest_rate numeric,
  currency text CHECK (currency IN ('MXN', 'USD')),
  raw_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_cashflow_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric,
  formula text,
  period text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_cashflow_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  scenario_type text NOT NULL CHECK (scenario_type IN ('base', 'stress')),
  assumptions jsonb NOT NULL DEFAULT '{}',
  results jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_cashflow_results (
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
CREATE INDEX idx_cs_cf_inputs_app ON cs_cashflow_inputs(application_id);
CREATE INDEX idx_cs_cf_calc_app ON cs_cashflow_calculations(application_id);
CREATE INDEX idx_cs_cf_scenarios_app ON cs_cashflow_scenarios(application_id);
CREATE INDEX idx_cs_cf_results_app ON cs_cashflow_results(application_id);

-- RLS
ALTER TABLE cs_cashflow_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_cashflow_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_cashflow_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_cashflow_results ENABLE ROW LEVEL SECURITY;
