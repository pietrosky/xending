-- Credit Scoring: Trend Analysis Layer

CREATE TABLE IF NOT EXISTS cs_trend_timeseries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  engine_name text NOT NULL,
  metric_name text NOT NULL,
  period text NOT NULL,
  value numeric NOT NULL,
  benchmark numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_trend_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  engine_name text NOT NULL,
  metric_name text NOT NULL,
  direction text NOT NULL,
  speed text NOT NULL,
  classification text NOT NULL,
  change_percent numeric,
  slope numeric,
  r_squared numeric,
  projection jsonb,
  months_to_threshold int,
  threshold_value numeric,
  risk_flags jsonb NOT NULL DEFAULT '[]',
  chart_config jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_trend_ai_narrative (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  executive_summary text,
  top_positive jsonb NOT NULL DEFAULT '[]',
  top_negative jsonb NOT NULL DEFAULT '[]',
  threshold_projections jsonb NOT NULL DEFAULT '[]',
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_trend_charts_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_name text NOT NULL,
  metric_name text NOT NULL,
  chart_type text NOT NULL DEFAULT 'line',
  thresholds jsonb,
  higher_is_better boolean NOT NULL DEFAULT true,
  y_axis_format text NOT NULL DEFAULT '$',
  brand_colors jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(engine_name, metric_name)
);

-- Indexes
CREATE INDEX idx_cs_trend_ts_app ON cs_trend_timeseries(application_id);
CREATE INDEX idx_cs_trend_ts_engine ON cs_trend_timeseries(application_id, engine_name, metric_name);
CREATE INDEX idx_cs_trend_results_app ON cs_trend_results(application_id);
CREATE INDEX idx_cs_trend_narrative_app ON cs_trend_ai_narrative(application_id);

-- RLS
ALTER TABLE cs_trend_timeseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_trend_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_trend_ai_narrative ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_trend_charts_config ENABLE ROW LEVEL SECURITY;
