-- Credit Scoring: Buro Engine (Syntage)
-- Core tables + specialized analysis tables
-- Buro Engine contributes 10% to weighted score
-- Analyzes: Score PyME, creditos activos, rotacion de deuda, consultas, liquidados, Hawk checks

-- ============================================================
-- Core Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS cs_buro_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  score_pyme numeric,
  score_causes jsonb,
  califica_data jsonb,
  raw_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_buro_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  total_debt numeric,
  monthly_debt_service numeric,
  negative_records jsonb,
  portfolio_quality jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_buro_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  module_status text NOT NULL CHECK (module_status IN ('pass', 'fail', 'warning', 'blocked')),
  module_score numeric NOT NULL,
  module_grade text NOT NULL CHECK (module_grade IN ('A', 'B', 'C', 'D', 'F')),
  risk_flags jsonb NOT NULL DEFAULT '[]',
  key_metrics jsonb NOT NULL DEFAULT '{}',
  benchmark_comparison jsonb NOT NULL DEFAULT '{}',
  explanation text,
  recommended_actions jsonb NOT NULL DEFAULT '[]',
  trend_factor numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Specialized Tables — Active Credits, Consultations, Liquidated, Hawk, Debt Rotation
-- ============================================================

-- Active credits detail: simultaneous credits, institutions, amounts, payment history
CREATE TABLE IF NOT EXISTS cs_buro_active_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  credit_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bureau consultation frequency: last 3/12/24 months, financial vs commercial
CREATE TABLE IF NOT EXISTS cs_buro_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  consultation_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Liquidated credits: quitas, daciones, quebrantos, pagos parciales
CREATE TABLE IF NOT EXISTS cs_buro_liquidated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  liquidation_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Hawk compliance checks: juicios, servidores publicos, 69B, Interpol, etc.
CREATE TABLE IF NOT EXISTS cs_buro_hawk_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  hawk_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Debt rotation detection: new credit within 60 days of liquidation, principal not decreasing
CREATE TABLE IF NOT EXISTS cs_buro_debt_rotation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  rotation_flags jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cs_buro_data_app ON cs_buro_data(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_buro_analysis_app ON cs_buro_analysis(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_buro_results_app ON cs_buro_results(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_buro_active_app ON cs_buro_active_credits(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_buro_consult_app ON cs_buro_consultations(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_buro_liquidated_app ON cs_buro_liquidated(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_buro_hawk_app ON cs_buro_hawk_checks(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_buro_rotation_app ON cs_buro_debt_rotation(application_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE cs_buro_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_buro_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_buro_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_buro_active_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_buro_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_buro_liquidated ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_buro_hawk_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_buro_debt_rotation ENABLE ROW LEVEL SECURITY;
