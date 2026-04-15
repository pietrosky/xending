-- Rename buys_usd → quantity (no-op on fresh deploy, 002 already uses quantity)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fx_transactions' AND column_name = 'buys_usd') THEN
    ALTER TABLE fx_transactions DROP COLUMN IF EXISTS pays_mxn;
    ALTER TABLE fx_transactions RENAME COLUMN buys_usd TO quantity;
  END IF;
END $$;
