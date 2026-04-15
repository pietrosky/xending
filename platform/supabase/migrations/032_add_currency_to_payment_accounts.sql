-- Add currency column to payment accounts
ALTER TABLE cs_company_payment_accounts
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD'
  CHECK (currency IN ('USD', 'MXP'));
