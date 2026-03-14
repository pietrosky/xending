-- Credit Scoring: Guarantee Engine

CREATE TABLE IF NOT EXISTS cs_guarantee_guarantees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN (
    'inmueble', 'vehiculo', 'cuentas_por_cobrar', 'inventario',
    'cash_collateral', 'aval_personal', 'aval_corporativo',
    'garantia_prendaria', 'cesion_derechos', 'fideicomiso'
  )),
  valor_comercial numeric,
  valor_forzoso numeric,
  liquidez numeric,
  moneda text CHECK (moneda IN ('MXN', 'USD')),
  jurisdiccion text,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_guarantee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  guarantee_id uuid REFERENCES cs_guarantee_guarantees(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_status text,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_guarantee_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  guarantee_id uuid REFERENCES cs_guarantee_guarantees(id) ON DELETE CASCADE,
  valuation_date timestamptz,
  valuation_amount numeric,
  appraiser text,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_guarantee_haircuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES cs_applications(id) ON DELETE CASCADE,
  guarantee_id uuid REFERENCES cs_guarantee_guarantees(id) ON DELETE CASCADE,
  guarantee_type text NOT NULL,
  haircut_min numeric,
  haircut_max numeric,
  haircut_applied numeric,
  raw_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cs_guarantee_results (
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
  valor_elegible_neto numeric,
  cobertura_neta numeric,
  faltante_garantia numeric,
  cumple_2_1 boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_cs_guar_guarantees_app ON cs_guarantee_guarantees(application_id);
CREATE INDEX idx_cs_guar_documents_app ON cs_guarantee_documents(application_id);
CREATE INDEX idx_cs_guar_valuations_app ON cs_guarantee_valuations(application_id);
CREATE INDEX idx_cs_guar_haircuts_app ON cs_guarantee_haircuts(application_id);
CREATE INDEX idx_cs_guar_results_app ON cs_guarantee_results(application_id);

-- RLS
ALTER TABLE cs_guarantee_guarantees ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_guarantee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_guarantee_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_guarantee_haircuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_guarantee_results ENABLE ROW LEVEL SECURITY;
