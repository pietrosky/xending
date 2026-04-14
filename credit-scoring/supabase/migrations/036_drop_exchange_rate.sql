-- Drop exchange_rate, use markup_rate (no-op on fresh deploy)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fx_transactions' AND column_name = 'exchange_rate') THEN
    UPDATE fx_transactions SET markup_rate = exchange_rate WHERE markup_rate IS NULL;
    ALTER TABLE fx_transactions DROP CONSTRAINT IF EXISTS fx_transactions_exchange_rate_check;
    ALTER TABLE fx_transactions DROP COLUMN exchange_rate;
    ALTER TABLE fx_transactions ALTER COLUMN markup_rate SET NOT NULL;
  END IF;
END $$;
