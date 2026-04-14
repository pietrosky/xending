-- Drop exchange_rate column, use markup_rate everywhere.
-- pays_mxn generated column depends on exchange_rate, must be recreated.

-- 1. Backfill markup_rate from exchange_rate where null
UPDATE fx_transactions SET markup_rate = exchange_rate WHERE markup_rate IS NULL;

-- 2. Drop generated column that depends on exchange_rate
ALTER TABLE fx_transactions DROP COLUMN pays_mxn;

-- 3. Drop exchange_rate column + its check constraint
ALTER TABLE fx_transactions DROP CONSTRAINT IF EXISTS fx_transactions_exchange_rate_check;
ALTER TABLE fx_transactions DROP COLUMN exchange_rate;

-- 4. Make markup_rate NOT NULL with check
ALTER TABLE fx_transactions ALTER COLUMN markup_rate SET NOT NULL;
ALTER TABLE fx_transactions ADD CONSTRAINT fx_transactions_markup_rate_check CHECK (markup_rate > 0);

-- 5. Recreate pays_mxn using markup_rate
ALTER TABLE fx_transactions ADD COLUMN pays_mxn NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * markup_rate) STORED;
