CREATE SEQUENCE fx_transaction_folio_seq START 1;

CREATE TABLE fx_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio TEXT UNIQUE NOT NULL DEFAULT 'XG-' || to_char(now(), 'YY') || '-' || lpad(nextval('fx_transaction_folio_seq')::text, 4, '0'),
    company_id UUID NOT NULL REFERENCES cs_companies(id),
    buys_usd NUMERIC(15, 2) NOT NULL CHECK (buys_usd > 0),
    exchange_rate NUMERIC(10, 4) NOT NULL CHECK (exchange_rate > 0),
    pays_mxn NUMERIC(15, 2) NOT NULL GENERATED ALWAYS AS (buys_usd * exchange_rate) STORED,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'completed')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    authorized_by UUID REFERENCES auth.users(id),
    authorized_at TIMESTAMPTZ,
    proof_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fx_transactions_company ON fx_transactions(company_id);
CREATE INDEX idx_fx_transactions_status ON fx_transactions(status);
CREATE INDEX idx_fx_transactions_created_by ON fx_transactions(created_by);
