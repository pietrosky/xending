-- Seed: 5 companies, 3 users, 150 FX transactions (mixed statuses + currencies)
-- Run: docker exec xending-db psql -U postgres -f /migrations/../seed_150_transactions.sql

-- ─── Companies ───────────────────────────────────────────────────────

INSERT INTO cs_companies (id, rfc, legal_name, trade_name, business_activity, address) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'DAZ010101AAA', 'Distribuidora Azteca SA de CV', 'Dist. Azteca', 'Comercio al por mayor', '{"street":"Av Reforma 100","city":"CDMX","state":"CDMX","zip":"06600","country":"Mexico"}'),
  ('b2222222-2222-2222-2222-222222222222', 'TNO020202BBB', 'TecNorte Industrial SA de CV', 'TecNorte', 'Manufactura', '{"street":"Blvd Roble 500","city":"Monterrey","state":"NL","zip":"64000","country":"Mexico"}'),
  ('c3333333-3333-3333-3333-333333333333', 'PAS030303CCC', 'Pacific Supplies SA de CV', 'PacSupplies', 'Importación', '{"street":"Av del Mar 200","city":"Mazatlán","state":"SIN","zip":"82100","country":"Mexico"}'),
  ('d4444444-4444-4444-4444-444444444444', 'GFI040404DDD', 'Grupo Financiero Istmo SA de CV', 'GF Istmo', 'Servicios financieros', '{"street":"Calle 60 #300","city":"Mérida","state":"YUC","zip":"97000","country":"Mexico"}'),
  ('e5555555-5555-5555-5555-555555555555', 'ALO050505EEE', 'Alimentos del Occidente SA de CV', 'AliOccidente', 'Alimentos y bebidas', '{"street":"Av Vallarta 1500","city":"Guadalajara","state":"JAL","zip":"44100","country":"Mexico"}')
ON CONFLICT DO NOTHING;

-- ─── Payment accounts ────────────────────────────────────────────────

INSERT INTO cs_company_payment_accounts (id, company_id, clabe, bank_name, is_primary) VALUES
  ('aa111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '012345678901234567', 'BBVA Mexico', true),
  ('bb222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '021345678901234567', 'Banorte', true),
  ('cc333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', '032345678901234567', 'Santander', true),
  ('dd444444-4444-4444-4444-444444444444', 'd4444444-4444-4444-4444-444444444444', '042345678901234567', 'HSBC', true),
  ('ee555555-5555-5555-5555-555555555555', 'e5555555-5555-5555-5555-555555555555', '052345678901234567', 'Banamex', true)
ON CONFLICT DO NOTHING;

-- ─── Owners (3 brokers) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cs_companies_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, user_id)
);

INSERT INTO cs_companies_owners (company_id, user_id) VALUES
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001'),
  ('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001'),
  ('c3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000002'),
  ('d4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000002'),
  ('e5555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000003')
ON CONFLICT DO NOTHING;

-- ─── 150 Transactions ────────────────────────────────────────────────
-- Mix: ~50 pending, ~40 authorized, ~40 completed, ~20 cancelled
-- Mix: ~110 buy USD (buys_currency=USD), ~40 sell USD (buys_currency=MXN)

DO $$
DECLARE
  companies UUID[] := ARRAY[
    'a1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333',
    'd4444444-4444-4444-4444-444444444444',
    'e5555555-5555-5555-5555-555555555555'
  ];
  brokers UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003'
  ];
  admin_id UUID := '00000000-0000-0000-0000-000000000001';
  i INT;
  co UUID;
  broker UUID;
  stat TEXT;
  is_sell BOOLEAN;
  qty NUMERIC;
  b_rate NUMERIC;
  m_rate NUMERIC;
  is_cancelled BOOLEAN;
  dt TIMESTAMPTZ;
BEGIN
  FOR i IN 1..150 LOOP
    co := companies[1 + (i % 5)];
    broker := brokers[1 + (i % 3)];
    is_sell := (i % 4 = 0);  -- ~25% sell
    is_cancelled := (i % 8 = 0);  -- ~12% cancelled

    -- Status distribution
    IF is_cancelled THEN
      stat := CASE WHEN i % 2 = 0 THEN 'pending' ELSE 'authorized' END;
    ELSIF i % 5 < 2 THEN
      stat := 'pending';
    ELSIF i % 5 < 4 THEN
      stat := 'authorized';
    ELSE
      stat := 'completed';
    END IF;

    -- Random-ish amounts and rates
    IF is_sell THEN
      qty := 100000 + (i * 7777 % 900000);  -- MXN 100k-1M
      b_rate := 0.0540 + (i % 20) * 0.0003;  -- MXN→USD ~0.054-0.060
      m_rate := b_rate * (1 + (3 + i % 13)::NUMERIC / 100);  -- 3-15% markup
    ELSE
      qty := 5000 + (i * 3333 % 195000);  -- USD 5k-200k
      b_rate := 17.00 + (i % 30) * 0.05;  -- USD→MXN ~17.00-18.50
      m_rate := b_rate + 0.05 + (i % 10) * 0.02;  -- +0.05 to +0.25
    END IF;

    dt := now() - ((150 - i) || ' hours')::INTERVAL;

    INSERT INTO fx_transactions (
      company_id, buys_currency, pays_currency,
      quantity, base_rate, markup_rate,
      status, created_by, authorized_by, authorized_at,
      proof_url, cancelled, cancelled_at, cancelled_by,
      payment_account_id, created_at, updated_at
    ) VALUES (
      co,
      CASE WHEN is_sell THEN 'MXN' ELSE 'USD' END,
      CASE WHEN is_sell THEN 'USD' ELSE 'MXN' END,
      ROUND(qty, 2),
      ROUND(b_rate, 4),
      ROUND(m_rate, 4),
      stat,
      broker,
      CASE WHEN stat IN ('authorized','completed') THEN admin_id ELSE NULL END,
      CASE WHEN stat IN ('authorized','completed') THEN dt + INTERVAL '2 hours' ELSE NULL END,
      CASE WHEN stat = 'completed' THEN 'https://example.com/proof-' || i || '.pdf' ELSE NULL END,
      is_cancelled,
      CASE WHEN is_cancelled THEN dt + INTERVAL '4 hours' ELSE NULL END,
      CASE WHEN is_cancelled THEN admin_id ELSE NULL END,
      CASE
        WHEN co = 'a1111111-1111-1111-1111-111111111111' THEN 'aa111111-1111-1111-1111-111111111111'::UUID
        WHEN co = 'b2222222-2222-2222-2222-222222222222' THEN 'bb222222-2222-2222-2222-222222222222'::UUID
        WHEN co = 'c3333333-3333-3333-3333-333333333333' THEN 'cc333333-3333-3333-3333-333333333333'::UUID
        WHEN co = 'd4444444-4444-4444-4444-444444444444' THEN 'dd444444-4444-4444-4444-444444444444'::UUID
        ELSE 'ee555555-5555-5555-5555-555555555555'::UUID
      END,
      dt, dt
    );
  END LOOP;
END $$;
