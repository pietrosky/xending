-- Credit Scoring: Add source column + seed static SOFOM benchmarks
-- Fase 1: Conservative thresholds for Mexican SOFOM lending to SMEs
-- These will be superseded by portfolio (Fase 2) and industry (Fase 3) data

-- Add source column to track benchmark origin
ALTER TABLE cs_benchmarks ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'static'
  CHECK (source IN ('static', 'portfolio', 'industry'));

-- Add sample_size for portfolio-derived benchmarks
ALTER TABLE cs_benchmarks ADD COLUMN IF NOT EXISTS sample_size int DEFAULT 0;

-- Update unique constraint to include source
ALTER TABLE cs_benchmarks DROP CONSTRAINT IF EXISTS cs_benchmarks_sector_size_category_region_metric_name_effe_key;
ALTER TABLE cs_benchmarks ADD CONSTRAINT cs_benchmarks_unique_metric
  UNIQUE (sector, size_category, region, metric_name, source, effective_date);

-- Index for source-based queries
CREATE INDEX IF NOT EXISTS idx_cs_benchmarks_source ON cs_benchmarks(source, active);


-- ============================================================
-- SEED: Static benchmarks - "general" sector, all sizes
-- Values represent conservative SOFOM thresholds for SME lending
-- ============================================================

-- Helper: insert only if not exists
INSERT INTO cs_benchmarks (sector, size_category, region, metric_name, metric_label, benchmark_value, percentile_25, percentile_50, percentile_75, unit, source, effective_date, active)
VALUES
  -- Financial ratios
  ('general', 'small', NULL, 'dscr', 'Debt Service Coverage Ratio', 1.3, 1.1, 1.3, 1.8, 'ratio', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'dscr', 'Debt Service Coverage Ratio', 1.3, 1.1, 1.3, 1.8, 'ratio', 'static', '2026-01-01', true),
  ('general', 'large', NULL, 'dscr', 'Debt Service Coverage Ratio', 1.3, 1.2, 1.5, 2.0, 'ratio', 'static', '2026-01-01', true),
  ('general', 'micro', NULL, 'dscr', 'Debt Service Coverage Ratio', 1.2, 1.0, 1.2, 1.5, 'ratio', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'current_ratio', 'Current Ratio', 1.2, 1.0, 1.2, 1.6, 'ratio', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'current_ratio', 'Current Ratio', 1.2, 1.0, 1.2, 1.6, 'ratio', 'static', '2026-01-01', true),
  ('general', 'large', NULL, 'current_ratio', 'Current Ratio', 1.3, 1.1, 1.3, 1.8, 'ratio', 'static', '2026-01-01', true),
  ('general', 'micro', NULL, 'current_ratio', 'Current Ratio', 1.1, 0.9, 1.1, 1.4, 'ratio', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'quick_ratio', 'Quick Ratio', 0.8, 0.6, 0.8, 1.1, 'ratio', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'quick_ratio', 'Quick Ratio', 0.8, 0.6, 0.8, 1.1, 'ratio', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'leverage', 'Leverage (Debt/Assets)', 0.65, 0.45, 0.55, 0.65, 'ratio', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'leverage', 'Leverage (Debt/Assets)', 0.65, 0.40, 0.50, 0.65, 'ratio', 'static', '2026-01-01', true),
  ('general', 'large', NULL, 'leverage', 'Leverage (Debt/Assets)', 0.60, 0.35, 0.45, 0.60, 'ratio', 'static', '2026-01-01', true),
  ('general', 'micro', NULL, 'leverage', 'Leverage (Debt/Assets)', 0.70, 0.50, 0.60, 0.70, 'ratio', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'debt_equity_ratio', 'Debt to Equity', 2.0, 1.0, 1.5, 2.0, 'ratio', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'debt_equity_ratio', 'Debt to Equity', 2.0, 0.8, 1.3, 2.0, 'ratio', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'margin', 'Operating Margin', 0.10, 0.05, 0.10, 0.18, '%', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'margin', 'Operating Margin', 0.10, 0.06, 0.10, 0.18, '%', 'static', '2026-01-01', true),
  ('general', 'large', NULL, 'margin', 'Operating Margin', 0.12, 0.07, 0.12, 0.20, '%', 'static', '2026-01-01', true),
  ('general', 'micro', NULL, 'margin', 'Operating Margin', 0.08, 0.03, 0.08, 0.15, '%', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'gross_margin', 'Gross Margin', 0.25, 0.18, 0.25, 0.35, '%', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'gross_margin', 'Gross Margin', 0.25, 0.18, 0.25, 0.35, '%', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'roa', 'Return on Assets', 0.05, 0.02, 0.05, 0.10, '%', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'roa', 'Return on Assets', 0.05, 0.03, 0.05, 0.10, '%', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'roe', 'Return on Equity', 0.10, 0.05, 0.10, 0.20, '%', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'roe', 'Return on Equity', 0.10, 0.05, 0.10, 0.20, '%', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'interest_coverage', 'Interest Coverage', 2.0, 1.5, 2.0, 3.5, 'ratio', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'interest_coverage', 'Interest Coverage', 2.0, 1.5, 2.5, 4.0, 'ratio', 'static', '2026-01-01', true),

  -- Operational metrics
  ('general', 'small', NULL, 'dso', 'Days Sales Outstanding', 60, 35, 50, 60, 'days', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'dso', 'Days Sales Outstanding', 60, 30, 45, 60, 'days', 'static', '2026-01-01', true),
  ('general', 'large', NULL, 'dso', 'Days Sales Outstanding', 55, 25, 40, 55, 'days', 'static', '2026-01-01', true),
  ('general', 'micro', NULL, 'dso', 'Days Sales Outstanding', 70, 40, 55, 70, 'days', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'dpo', 'Days Payable Outstanding', 45, 25, 35, 45, 'days', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'dpo', 'Days Payable Outstanding', 45, 25, 35, 45, 'days', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'inventory_days', 'Inventory Days', 90, 30, 60, 90, 'days', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'inventory_days', 'Inventory Days', 90, 25, 55, 90, 'days', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'revenue_growth', 'Revenue Growth YoY', 0.05, 0.00, 0.05, 0.15, '%', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'revenue_growth', 'Revenue Growth YoY', 0.05, 0.00, 0.05, 0.15, '%', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'cash_conversion_cycle', 'Cash Conversion Cycle', 90, 30, 60, 90, 'days', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'cash_conversion_cycle', 'Cash Conversion Cycle', 90, 25, 55, 90, 'days', 'static', '2026-01-01', true),

  -- Efficiency metrics
  ('general', 'small', NULL, 'employee_productivity', 'Revenue per Employee', 400000, 200000, 400000, 700000, 'MXN', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'employee_productivity', 'Revenue per Employee', 400000, 250000, 450000, 800000, 'MXN', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'working_capital_efficiency', 'Working Capital / Revenue', 0.15, 0.08, 0.15, 0.25, '%', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'working_capital_efficiency', 'Working Capital / Revenue', 0.15, 0.08, 0.15, 0.25, '%', 'static', '2026-01-01', true),

  ('general', 'small', NULL, 'asset_turnover', 'Asset Turnover', 0.8, 0.5, 0.8, 1.2, 'ratio', 'static', '2026-01-01', true),
  ('general', 'medium', NULL, 'asset_turnover', 'Asset Turnover', 0.8, 0.5, 0.8, 1.3, 'ratio', 'static', '2026-01-01', true)

ON CONFLICT ON CONSTRAINT cs_benchmarks_unique_metric DO NOTHING;
