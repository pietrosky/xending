-- Credit Scoring: Employee Engine

CREATE TABLE IF NOT EXISTS cs_employee_headcount (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  period text NOT NULL,
  employee_count int NOT NULL,
  source text,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_employee_payroll (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  period text NOT NULL,
  payroll_total numeric,
  nomina_ingresos_ratio numeric,
  payroll_trend numeric,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_employee_productivity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  period text NOT NULL,
  revenue_per_employee numeric,
  metric_name text,
  metric_value numeric,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_employee_results (
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
CREATE INDEX idx_cs_emp_headcount_app ON cs_employee_headcount(application_id);
CREATE INDEX idx_cs_emp_payroll_app ON cs_employee_payroll(application_id);
CREATE INDEX idx_cs_emp_productivity_app ON cs_employee_productivity(application_id);
CREATE INDEX idx_cs_emp_results_app ON cs_employee_results(application_id);

-- RLS
ALTER TABLE cs_employee_headcount ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_employee_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_employee_productivity ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_employee_results ENABLE ROW LEVEL SECURITY;
