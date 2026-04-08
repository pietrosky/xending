CREATE TABLE cs_company_payment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES cs_companies(id) ON DELETE CASCADE,
    clabe TEXT NOT NULL CHECK (length(replace(clabe, '-', '')) = 18),
    bank_name TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payment_accounts_company ON cs_company_payment_accounts(company_id);
