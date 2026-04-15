CREATE SEQUENCE IF NOT EXISTS fx_transaction_folio_seq START 1;

CREATE TABLE IF NOT EXISTS fx_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio TEXT UNIQUE NOT NULL DEFAULT 'XG-' || to_char(now(), 'YY') || '-' || lpad(nextval('fx_transaction_folio_seq')::text, 4, '0'),
    company_id UUID NOT NULL,
    quantity NUMERIC(15, 2) NOT NULL CHECK (quantity > 0),
    base_rate NUMERIC(10, 4),
    markup_rate NUMERIC(10, 4) NOT NULL CHECK (markup_rate > 0),
    buys_currency TEXT DEFAULT 'USD',
    pays_currency TEXT DEFAULT 'MXN',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'completed')),
    payment_account_id UUID,
    pi_account_id UUID,
    created_by UUID NOT NULL,
    authorized_by UUID,
    authorized_at TIMESTAMPTZ,
    proof_url TEXT,
    cancelled BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fx_transactions_company ON fx_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_fx_transactions_status ON fx_transactions(status);
CREATE INDEX IF NOT EXISTS idx_fx_transactions_created_by ON fx_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_fx_transactions_pi_account ON fx_transactions(pi_account_id);
