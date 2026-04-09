-- Add currency pair columns to fx_transactions
ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS buys_currency TEXT DEFAULT 'USD';
ALTER TABLE fx_transactions ADD COLUMN IF NOT EXISTS pays_currency TEXT DEFAULT 'MXN';

-- Set all existing transactions to USD/MXN
UPDATE fx_transactions SET buys_currency = 'USD', pays_currency = 'MXN' WHERE buys_currency IS NULL;

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON fx_transactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON fx_transactions TO broker;
GRANT SELECT, INSERT, UPDATE, DELETE ON fx_transactions TO admin;
