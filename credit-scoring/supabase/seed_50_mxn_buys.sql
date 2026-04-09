-- 50 completed transactions: Xending buys MXN, pays USD
-- buys_usd stores the MXN amount, pays_mxn = buys_usd * exchange_rate (USD equivalent)
-- base_rate ~0.055-0.060 (MXN→USD), markup 3-15% above

DO $$
DECLARE
  companies UUID[] := ARRAY[
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'b2222222-2222-2222-2222-222222222222'::uuid
  ];
  brokers UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid
  ];
  i INT;
  co UUID;
  broker UUID;
  amt NUMERIC;
  brate NUMERIC;
  mrate NUMERIC;
  days_ago INT;
  tx_date TIMESTAMPTZ;
BEGIN
  FOR i IN 1..50 LOOP
    co := companies[1 + (i % 2)];
    broker := brokers[1 + (i % 3)];

    -- MXN amount between 100,000 and 3,000,000
    amt := round((100000 + random() * 2900000)::numeric, 2);

    -- Base rate MXN→USD ~0.055 to 0.060
    brate := round((0.055 + random() * 0.005)::numeric, 4);

    -- Markup 3-15% above base
    mrate := round((brate * (1 + 0.03 + random() * 0.12))::numeric, 4);

    days_ago := floor(random() * 180)::int;
    tx_date := now() - (days_ago || ' days')::interval;

    INSERT INTO fx_transactions (
      company_id, buys_currency, buys_usd, base_rate, markup_rate, exchange_rate,
      pays_currency, status, created_by, authorized_by, authorized_at,
      proof_url, created_at, updated_at
    ) VALUES (
      co, 'MXN', amt, brate, mrate, mrate,
      'USD', 'completed', broker, '00000000-0000-0000-0000-000000000001',
      tx_date + interval '1 hour',
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      tx_date, tx_date + interval '2 hours'
    );
  END LOOP;
END $$;
