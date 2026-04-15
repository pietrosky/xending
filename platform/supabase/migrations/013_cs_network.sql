-- Credit Scoring: Network Engine

CREATE TABLE IF NOT EXISTS cs_network_counterparties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  counterparty_type text NOT NULL CHECK (counterparty_type IN ('client', 'supplier')),
  rfc text,
  name text,
  revenue_share numeric,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_network_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  metric_value numeric,
  unit text,
  period text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_network_concentration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  concentration_type text NOT NULL,
  hhi numeric,
  top1_percent numeric,
  top3_percent numeric,
  analysis_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_network_results (
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

CREATE TABLE IF NOT EXISTS cs_network_clients_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  client_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_network_suppliers_detail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  supplier_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_network_government (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  gov_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_network_financial_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  fi_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_network_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  product_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_net_counterparties_app ON cs_network_counterparties(application_id);
CREATE INDEX idx_cs_net_metrics_app ON cs_network_metrics(application_id);
CREATE INDEX idx_cs_net_concentration_app ON cs_network_concentration(application_id);
CREATE INDEX idx_cs_net_results_app ON cs_network_results(application_id);
CREATE INDEX idx_cs_net_clients_app ON cs_network_clients_detail(application_id);
CREATE INDEX idx_cs_net_suppliers_app ON cs_network_suppliers_detail(application_id);
CREATE INDEX idx_cs_net_gov_app ON cs_network_government(application_id);
CREATE INDEX idx_cs_net_fi_app ON cs_network_financial_institutions(application_id);
CREATE INDEX idx_cs_net_products_app ON cs_network_products(application_id);

-- RLS
ALTER TABLE cs_network_counterparties ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_network_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_network_concentration ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_network_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_network_clients_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_network_suppliers_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_network_government ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_network_financial_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_network_products ENABLE ROW LEVEL SECURITY;
