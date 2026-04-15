-- Credit Scoring: Business Stability Engine

CREATE TABLE IF NOT EXISTS cs_stability_timeseries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  period text NOT NULL,
  value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_stability_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric,
  unit text,
  period text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_stability_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  module_status text NOT NULL,
  module_score numeric NOT NULL,
  module_grade text NOT NULL,
  pattern_classification text CHECK (pattern_classification IN ('estable', 'ciclico', 'erratico', 'deteriorando')),
  risk_flags jsonb NOT NULL DEFAULT '[]',
  key_metrics jsonb NOT NULL DEFAULT '{}',
  benchmark_comparison jsonb NOT NULL DEFAULT '{}',
  explanation text,
  recommended_actions jsonb NOT NULL DEFAULT '[]',
  trend_factor numeric NOT NULL DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_stab_ts_app ON cs_stability_timeseries(application_id);
CREATE INDEX idx_cs_stab_metrics_app ON cs_stability_metrics(application_id);
CREATE INDEX idx_cs_stab_results_app ON cs_stability_results(application_id);

-- RLS
ALTER TABLE cs_stability_timeseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_stability_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_stability_results ENABLE ROW LEVEL SECURITY;
