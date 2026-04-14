-- Drop pays_mxn generated column (no-op on fresh deploy)
ALTER TABLE fx_transactions DROP COLUMN IF EXISTS pays_mxn;
