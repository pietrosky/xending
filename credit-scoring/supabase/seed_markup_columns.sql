-- Add base rate and markup rate columns
ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS base_rate NUMERIC(10,4);
ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS markup_rate NUMERIC(10,4);

-- Populate existing rows: base_rate = exchange_rate, markup_rate = exchange_rate (no markup)
UPDATE fx_transactions SET base_rate = exchange_rate, markup_rate = exchange_rate
WHERE base_rate IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON fx_transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON fx_transactions TO broker;
GRANT SELECT, INSERT, UPDATE, DELETE ON fx_transactions TO admin;
