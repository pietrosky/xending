-- Credit Scoring: Credit Limits (Decision Layer)

CREATE TABLE IF NOT EXISTS cs_credit_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  limit_by_flow numeric,
  limit_by_sales numeric,
  limit_by_ebitda numeric,
  limit_by_guarantee numeric,
  limit_by_portfolio numeric,
  final_limit numeric,
  binding_constraint text,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_limit_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  limit_type text NOT NULL,
  input_values jsonb NOT NULL DEFAULT '{}',
  calculation_steps jsonb NOT NULL DEFAULT '[]',
  result_value numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_credit_limits_app ON cs_credit_limits(application_id);
CREATE INDEX idx_cs_limit_calculations_app ON cs_limit_calculations(application_id);

-- RLS
ALTER TABLE cs_credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_limit_calculations ENABLE ROW LEVEL SECURITY;
