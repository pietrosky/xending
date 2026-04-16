-- Seed: 2 empresas de prueba con contactos y solicitudes
-- Empresa 1: Distribuidora Azteca
INSERT INTO cs_companies (id, rfc, legal_name, trade_name, business_activity, tax_regime, incorporation_date, address, status)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'DAZ050101AAA',
  'Distribuidora Azteca S.A. de C.V.',
  'Dist. Azteca',
  'Comercio al por mayor',
  'Regimen General de Ley',
  '2005-01-15',
  '{"street":"Av. Reforma 250","city":"Ciudad de Mexico","state":"CDMX","zip":"06600"}',
  'active'
);

INSERT INTO cs_company_contacts (company_id, contact_type, contact_value, contact_name, is_primary) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'email', 'contacto@distazteca.com.mx', 'Juan Perez', true),
  ('a1111111-1111-1111-1111-111111111111', 'phone', '+525512345678', 'Juan Perez', true),
  ('a1111111-1111-1111-1111-111111111111', 'legal_rep', 'juan.perez@distazteca.com.mx', 'Juan Perez Lopez', false);

INSERT INTO cs_applications (rfc, company_name, requested_amount, term_months, currency, status)
VALUES ('DAZ050101AAA', 'Distribuidora Azteca S.A. de C.V.', 5000000, 24, 'MXN', 'pending_scoring');

-- Empresa 2: Tecnologia Nortena
INSERT INTO cs_companies (id, rfc, legal_name, trade_name, business_activity, tax_regime, incorporation_date, address, status)
VALUES (
  'b2222222-2222-2222-2222-222222222222',
  'TNO180315BBB',
  'Tecnologia Nortena S. de R.L. de C.V.',
  'TecNorte',
  'Servicios de tecnologia',
  'Regimen General de Ley',
  '2018-03-15',
  '{"street":"Blvd. Constitucion 1500","city":"Monterrey","state":"Nuevo Leon","zip":"64000"}',
  'active'
);

INSERT INTO cs_company_contacts (company_id, contact_type, contact_value, contact_name, is_primary) VALUES
  ('b2222222-2222-2222-2222-222222222222', 'email', 'admin@tecnorte.mx', 'Maria Garcia', true),
  ('b2222222-2222-2222-2222-222222222222', 'phone', '+528198765432', 'Maria Garcia', true),
  ('b2222222-2222-2222-2222-222222222222', 'legal_rep', 'maria.garcia@tecnorte.mx', 'Maria Garcia Rodriguez', false);

INSERT INTO cs_applications (rfc, company_name, requested_amount, term_months, currency, status)
VALUES ('TNO180315BBB', 'Tecnologia Nortena S. de R.L. de C.V.', 250000, 12, 'USD', 'pending_scoring');
