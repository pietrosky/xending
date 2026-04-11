-- Migration: Add pi_account_id to fx_transactions
-- Links each FX transaction to a Payment Instructions account (Xending deposit account)

ALTER TABLE fx_transactions
  ADD COLUMN IF NOT EXISTS pi_account_id UUID REFERENCES pi_accounts(id);

CREATE INDEX IF NOT EXISTS idx_fx_transactions_pi_account ON fx_transactions(pi_account_id);
