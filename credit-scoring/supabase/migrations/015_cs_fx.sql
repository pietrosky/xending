-- Credit Scoring: FX Risk Engine

CREATE TABLE IF NOT EXISTS cs_fx_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  moneda_credito text NOT NULL CHECK (moneda_credito IN ('MXN', 'USD')),
  moneda_ingresos text,
  moneda_costos text,
  moneda_facturacion text,
  moneda_cuentas_cobrar text,
  moneda_deuda text,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_fx_exposure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  currency_mismatch_ratio numeric,
  pct_ingresos_misma_moneda numeric,
  natural_hedge_ratio numeric,
  uncovered_fx_exposure numeric,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_fx_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  scenario_type text NOT NULL CHECK (scenario_type IN ('base', 'stress_mxn_10', 'stress_mxn_20', 'stress_mxn_30')),
  ebitda_sensitivity numeric,
  dscr_stressed numeric,
  ltv_stressed numeric,
  scenario_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_fx_results (
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
  fx_vulnerability text,
  recommended_currency text,
  hedge_obligation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_fx_inputs_app ON cs_fx_inputs(application_id);
CREATE INDEX idx_cs_fx_exposure_app ON cs_fx_exposure(application_id);
CREATE INDEX idx_cs_fx_scenarios_app ON cs_fx_scenarios(application_id);
CREATE INDEX idx_cs_fx_results_app ON cs_fx_results(application_id);

-- RLS
ALTER TABLE cs_fx_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_fx_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_fx_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_fx_results ENABLE ROW LEVEL SECURITY;
