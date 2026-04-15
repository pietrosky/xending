-- Credit Scoring: Risk Matrix Results & Decision Gates (Decision Layer)

CREATE TABLE IF NOT EXISTS cs_risk_matrix_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  gate1_result text,
  gate1_flags jsonb NOT NULL DEFAULT '[]',
  gate2_result text,
  gate2_semaphores jsonb NOT NULL DEFAULT '[]',
  gate3_score numeric,
  gate3_breakdown jsonb NOT NULL DEFAULT '{}',
  final_decision text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_decision_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  gate_number int NOT NULL,
  result text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_risk_matrix_results_app ON cs_risk_matrix_results(application_id);
CREATE INDEX idx_cs_decision_gates_app ON cs_decision_gates(application_id);

-- RLS
ALTER TABLE cs_risk_matrix_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_decision_gates ENABLE ROW LEVEL SECURITY;
