-- Rename buys_usd → quantity in fx_transactions
-- The generated column pays_mxn depends on buys_usd, so we must drop and recreate it.

ALTER TABLE fx_transactions DROP COLUMN IF EXISTS pays_mxn;
ALTER TABLE fx_transactions RENAME COLUMN buys_usd TO quantity;
ALTER TABLE fx_transactions ADD COLUMN pays_mxn NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * exchange_rate) STORED;
