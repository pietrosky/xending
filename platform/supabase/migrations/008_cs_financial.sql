-- Credit Scoring: Financial Engine

CREATE TABLE IF NOT EXISTS cs_financial_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('syntage', 'manual', 'both')),
  fiscal_year int,
  raw_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_financial_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric,
  formula text,
  period text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_financial_results (
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

CREATE TABLE IF NOT EXISTS cs_financial_balance_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL,
  balance_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_financial_income_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL,
  income_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_financial_related_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  rp_data jsonb NOT NULL,
  total_exposure_percent numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_financial_balanza (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  period text NOT NULL,
  balanza_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_fin_inputs_app ON cs_financial_inputs(application_id);
CREATE INDEX idx_cs_fin_calc_app ON cs_financial_calculations(application_id);
CREATE INDEX idx_cs_fin_results_app ON cs_financial_results(application_id);
CREATE INDEX idx_cs_fin_balance_app ON cs_financial_balance_detail(application_id);
CREATE INDEX idx_cs_fin_income_app ON cs_financial_income_detail(application_id);
CREATE INDEX idx_cs_fin_rp_app ON cs_financial_related_parties(application_id);
CREATE INDEX idx_cs_fin_balanza_app ON cs_financial_balanza(application_id);

-- RLS
ALTER TABLE cs_financial_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_financial_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_financial_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_financial_balance_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_financial_income_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_financial_related_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_financial_balanza ENABLE ROW LEVEL SECURITY;
