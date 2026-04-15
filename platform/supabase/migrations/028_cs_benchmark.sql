-- Credit Scoring: Benchmarks & Cross-Validation

-- Industry benchmark definitions
CREATE TABLE IF NOT EXISTS cs_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector text NOT NULL,
  size_category text NOT NULL CHECK (size_category IN ('micro', 'small', 'medium', 'large')),
  region text,
  metric_name text NOT NULL,
  metric_label text NOT NULL,
  benchmark_value numeric NOT NULL,
  percentile_25 numeric,
  percentile_50 numeric,
  percentile_75 numeric,
  unit text NOT NULL,
  source text,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sector, size_category, region, metric_name, effective_date)
);

-- Per-application benchmark comparison results
CREATE TABLE IF NOT EXISTS cs_benchmark_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  benchmark_id uuid REFERENCES cs_benchmarks(id),
  engine_name text NOT NULL,
  metric_name text NOT NULL,
  applicant_value numeric NOT NULL,
  benchmark_value numeric NOT NULL,
  deviation_percent numeric,
  percentile_rank numeric,
  status text NOT NULL CHECK (status IN ('above', 'at', 'below')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Syntage financial ratios for cross-validation
CREATE TABLE IF NOT EXISTS cs_benchmark_syntage_ratios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  ratio_category text NOT NULL,
  ratio_name text NOT NULL,
  syntage_value numeric,
  calculated_value numeric,
  deviation_percent numeric,
  match_status text CHECK (match_status IN ('match', 'minor_deviation', 'major_deviation')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Cross-validation results between Syntage and own calculations
CREATE TABLE IF NOT EXISTS cs_benchmark_cross_validation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  total_ratios_compared int,
  ratios_matched int,
  ratios_minor_deviation int,
  ratios_major_deviation int,
  overall_confidence numeric,
  flags jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_benchmarks_sector ON cs_benchmarks(sector, size_category);
CREATE INDEX idx_cs_benchmark_comparisons_app ON cs_benchmark_comparisons(application_id);
CREATE INDEX idx_cs_benchmark_syntage_app ON cs_benchmark_syntage_ratios(application_id);
CREATE INDEX idx_cs_benchmark_cross_val_app ON cs_benchmark_cross_validation(application_id);

-- RLS
ALTER TABLE cs_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_benchmark_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_benchmark_syntage_ratios ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_benchmark_cross_validation ENABLE ROW LEVEL SECURITY;
