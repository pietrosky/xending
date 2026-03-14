-- Credit Scoring: CashFlow Engine

CREATE TABLE IF NOT EXISTS cs_cashflow_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  ingresos_sat jsonb,
  gastos_sat jsonb,
  declaraciones jsonb,
  estados_financieros jsonb,
  deuda_buro numeric,
  monto_solicitado numeric NOT NULL,
  plazo_meses int NOT NULL,
  tasa numeric NOT NULL,
  moneda text NOT NULL CHECK (moneda IN ('MXN', 'USD')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_cashflow_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  ebitda numeric,
  ebitda_margin numeric,
  flujo_operativo numeric,
  capex numeric,
  free_cash_flow numeric,
  servicio_deuda_actual numeric,
  servicio_deuda_proyectado numeric,
  dscr_actual numeric,
  dscr_proforma numeric,
  capacidad_maxima_pago numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_cashflow_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  scenario_type text NOT NULL CHECK (scenario_type IN ('base', 'stress')),
  scenario_data jsonb NOT NULL,
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

CREATE INDEX idx_cs_cf_inputs_app ON cs_cashflow_inputs(application_id);
CREATE INDEX idx_cs_cf_calc_app ON cs_cashflow_calculations(application_id);
CREATE INDEX idx_cs_cf_scenarios_app ON cs_cashflow_scenarios(application_id);
CREATE INDEX idx_cs_cf_results_app ON cs_cashflow_results(application_id);

ALTER TABLE cs_cashflow_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_cashflow_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_cashflow_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_cashflow_results ENABLE ROW LEVEL SECURITY;
