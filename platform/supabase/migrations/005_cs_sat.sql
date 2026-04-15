-- Credit Scoring: SAT/Facturacion Engine (Syntage)
-- Core tables + specialized analysis tables
-- SAT Engine contributes 15% to weighted score

-- ============================================================
-- Core Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS cs_sat_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  data_type text NOT NULL, -- 'cfdis_emitidas', 'cfdis_recibidas', 'declaraciones', 'constancia_fiscal', 'opinion_cumplimiento', 'balanza', 'nomina', 'lista_69b'
  raw_data jsonb NOT NULL,
  period text, -- '2025-01', '2024' etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_sat_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric,
  unit text,
  period text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_sat_results (
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
-- Specialized Tables — Revenue Quality & Payment Behavior
-- ============================================================

-- Revenue quality: cancelaciones, notas de credito, ingresos netos por periodo
CREATE TABLE IF NOT EXISTS cs_sat_revenue_quality (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  period text NOT NULL,
  gross_revenue numeric,
  cancellations numeric,
  credit_notes numeric,
  discounts numeric,
  net_revenue numeric,
  cancellation_ratio numeric,
  credit_note_ratio numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Payment behavior: PUE vs PPD analysis per period
CREATE TABLE IF NOT EXISTS cs_sat_payment_behavior (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  period text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('emitidas', 'recibidas')),
  total_pue numeric,
  total_ppd numeric,
  ppd_collected numeric,
  ppd_collection_ratio numeric,
  dso_days numeric,
  dpo_days numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Facturado vs declarado: discrepancy detection
CREATE TABLE IF NOT EXISTS cs_sat_facturado_vs_declarado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  fiscal_year int NOT NULL,
  total_facturado numeric,
  total_declarado numeric,
  discrepancy_amount numeric,
  discrepancy_percent numeric,
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Blacklisted counterparties: invoices with 69B entities
CREATE TABLE IF NOT EXISTS cs_sat_blacklisted_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  counterparty_rfc text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('emitidas', 'recibidas')),
  total_amount numeric,
  invoice_count int,
  list_type text, -- '69b_definitivo', '69b_presunto', '69b_desvirtuado'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Product/service diversification from CFDIs
CREATE TABLE IF NOT EXISTS cs_sat_product_diversification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  product_service_key text NOT NULL,
  description text,
  total_amount numeric,
  weight_percent numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cs_sat_data_app ON cs_sat_data(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_sat_data_type ON cs_sat_data(application_id, data_type);
CREATE INDEX IF NOT EXISTS idx_cs_sat_metrics_app ON cs_sat_metrics(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_sat_metrics_name ON cs_sat_metrics(application_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_cs_sat_results_app ON cs_sat_results(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_sat_revenue_app ON cs_sat_revenue_quality(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_sat_payment_app ON cs_sat_payment_behavior(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_sat_fvd_app ON cs_sat_facturado_vs_declarado(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_sat_blacklist_app ON cs_sat_blacklisted_invoices(application_id);
CREATE INDEX IF NOT EXISTS idx_cs_sat_product_app ON cs_sat_product_diversification(application_id);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE cs_sat_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_sat_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_sat_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_sat_revenue_quality ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_sat_payment_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_sat_facturado_vs_declarado ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_sat_blacklisted_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_sat_product_diversification ENABLE ROW LEVEL SECURITY;
