-- Create missing FX tables (local dev — no auth.users FK)

-- cs_companies_owners
CREATE TABLE IF NOT EXISTS cs_companies_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES cs_companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, user_id)
);

-- cs_company_payment_accounts
CREATE TABLE IF NOT EXISTS cs_company_payment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES cs_companies(id) ON DELETE CASCADE,
    clabe TEXT NOT NULL,
    bank_name TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- fx_transactions (no auth.users FK for local dev)
CREATE SEQUENCE IF NOT EXISTS fx_transaction_folio_seq START 1;

CREATE TABLE IF NOT EXISTS fx_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio TEXT UNIQUE NOT NULL DEFAULT 'XG-' || to_char(now(), 'YY') || '-' || lpad(nextval('fx_transaction_folio_seq')::text, 4, '0'),
    company_id UUID NOT NULL REFERENCES cs_companies(id),
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    exchange_rate NUMERIC(10, 4) NOT NULL CHECK (exchange_rate > 0),
    pays_mxn NUMERIC(15, 2) NOT NULL GENERATED ALWAYS AS (quantity * exchange_rate) STORED,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'completed')),
    created_by UUID NOT NULL,
    authorized_by UUID,
    authorized_at TIMESTAMPTZ,
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fx_transactions_company ON fx_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_fx_transactions_status ON fx_transactions(status);

-- Seed: payment accounts for test companies
INSERT INTO cs_company_payment_accounts (company_id, clabe, bank_name, is_primary) VALUES
  ('a1111111-1111-1111-1111-111111111111', '012345678901234567', 'BBVA Mexico', true),
  ('b2222222-2222-2222-2222-222222222222', '021345678901234567', 'Banorte', true);

-- Seed: owner relationships
INSERT INTO cs_companies_owners (company_id, user_id) VALUES
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
  ('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001');

-- Seed: FX transactions
-- Dist. Azteca: 2 transactions (1 authorized, 1 pending)
INSERT INTO fx_transactions (company_id, quantity, exchange_rate, status, created_by, authorized_by, authorized_at) VALUES
  ('a1111111-1111-1111-1111-111111111111', 50000.00, 17.2350, 'authorized', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now() - interval '2 days'),
  ('a1111111-1111-1111-1111-111111111111', 25000.00, 17.3100, 'pending', '00000000-0000-0000-0000-000000000001', NULL, NULL);

-- TecNorte: 2 transactions (1 completed with proof, 1 pending)
INSERT INTO fx_transactions (company_id, quantity, exchange_rate, status, created_by, authorized_by, authorized_at, proof_url) VALUES
  ('b2222222-2222-2222-2222-222222222222', 100000.00, 17.1500, 'completed', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', now() - interval '5 days', 'http://localhost:55421/storage/fx-proofs/proof-example.pdf'),
  ('b2222222-2222-2222-2222-222222222222', 75000.00, 17.2800, 'pending', '00000000-0000-0000-0000-000000000001', NULL, NULL);
