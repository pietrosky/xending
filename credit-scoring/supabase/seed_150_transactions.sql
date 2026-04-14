-- Seed: 150 completed transactions with proof_url
-- Split between Dist. Azteca (a111...) and TecNorte (b222...)
-- Varied amounts (5K-200K USD), exchange rates (16.5-18.5), dates spread over 6 months

DO $$
DECLARE
  companies UUID[] := ARRAY[
    'a1111111-1111-1111-1111-111111111111'::uuid,
    'b2222222-2222-2222-2222-222222222222'::uuid
  ];
  admin_id UUID := '00000000-0000-0000-0000-000000000001';
  i INT;
  co UUID;
  amt NUMERIC;
  rate NUMERIC;
  days_ago INT;
  tx_date TIMESTAMPTZ;
BEGIN
  FOR i IN 1..150 LOOP
    -- Alternate companies with slight bias
    co := companies[1 + (i % 2)];

    -- Random amount between 5000 and 200000
    amt := round((5000 + random() * 195000)::numeric, 2);

    -- Random exchange rate between 16.50 and 18.50
    rate := round((16.50 + random() * 2.0)::numeric, 4);

    -- Spread over last 180 days
    days_ago := floor(random() * 180)::int;
    tx_date := now() - (days_ago || ' days')::interval - (floor(random() * 12)::int || ' hours')::interval;

    INSERT INTO fx_transactions (
      company_id, quantity, markup_rate, status,
      created_by, authorized_by, authorized_at,
      proof_url, created_at, updated_at
    ) VALUES (
      co, amt, rate, 'completed',
      admin_id, admin_id, tx_date + interval '1 hour',
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      tx_date, tx_date + interval '2 hours'
    );
  END LOOP;
END $$;
