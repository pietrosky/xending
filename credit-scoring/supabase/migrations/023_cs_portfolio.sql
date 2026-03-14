-- Credit Scoring: Portfolio Engine

CREATE TABLE IF NOT EXISTS cs_portfolio_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  position_type text NOT NULL CHECK (position_type IN ('sector', 'currency', 'client_group', 'geography')),
  position_name text NOT NULL,
  current_exposure numeric NOT NULL DEFAULT 0,
  exposure_percent numeric,
  counterparty_count int,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_portfolio_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  limit_type text NOT NULL CHECK (limit_type IN ('sector', 'currency', 'client_group', 'geography')),
  limit_name text NOT NULL,
  max_concentration numeric NOT NULL,
  current_concentration numeric,
  post_origination_concentration numeric,
  breach boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_portfolio_exposure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  exposure_by_sector jsonb NOT NULL DEFAULT '{}',
  exposure_by_currency jsonb NOT NULL DEFAULT '{}',
  exposure_by_group jsonb NOT NULL DEFAULT '{}',
  correlation numeric,
  concentration_post_origination numeric,
  expected_loss_incremental numeric,
  worst_case_loss_incremental numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_portfolio_results (
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
CREATE INDEX idx_cs_portfolio_positions_app ON cs_portfolio_positions(application_id);
CREATE INDEX idx_cs_portfolio_limits_app ON cs_portfolio_limits(application_id);
CREATE INDEX idx_cs_portfolio_exposure_app ON cs_portfolio_exposure(application_id);
CREATE INDEX idx_cs_portfolio_results_app ON cs_portfolio_results(application_id);

-- RLS
ALTER TABLE cs_portfolio_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_portfolio_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_portfolio_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_portfolio_results ENABLE ROW LEVEL SECURITY;
