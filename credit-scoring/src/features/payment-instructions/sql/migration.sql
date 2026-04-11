-- Migration: Payment Instructions - pi_accounts table
-- Requerimientos: 6.1, 6.2, 6.3, 6.5, 2.2

-- Tabla principal de cuentas bancarias
CREATE TABLE pi_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  swift_code TEXT CHECK (swift_code IS NULL OR length(swift_code) BETWEEN 8 AND 11),
  bank_name TEXT NOT NULL,
  bank_address TEXT NOT NULL,
  currency_types TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  disabled_at TIMESTAMPTZ,
  disabled_by UUID,
  tenant_id TEXT NOT NULL DEFAULT 'xending'
);

-- Índices
CREATE INDEX idx_pi_accounts_active ON pi_accounts (is_active, created_at DESC);
CREATE INDEX idx_pi_accounts_tenant ON pi_accounts (tenant_id);

-- Habilitar Row Level Security
ALTER TABLE pi_accounts ENABLE ROW LEVEL SECURITY;

-- Admin: acceso completo (mismo patrón que fx_transactions)
CREATE POLICY "admin_full_access_pi" ON pi_accounts
  FOR ALL USING (auth.role() = 'admin');

-- Broker: solo lectura de cuentas activas
CREATE POLICY "broker_read_active_pi" ON pi_accounts
  FOR SELECT USING (is_active = true);

-- Trigger para impedir UPDATE en campos de datos (inmutabilidad)
CREATE OR REPLACE FUNCTION prevent_data_field_update() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.account_number IS DISTINCT FROM NEW.account_number
     OR OLD.account_name IS DISTINCT FROM NEW.account_name
     OR OLD.swift_code IS DISTINCT FROM NEW.swift_code
     OR OLD.bank_name IS DISTINCT FROM NEW.bank_name
     OR OLD.bank_address IS DISTINCT FROM NEW.bank_address
     OR OLD.currency_types IS DISTINCT FROM NEW.currency_types
  THEN
    RAISE EXCEPTION 'No se permite modificar los datos de la cuenta bancaria';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_data_update
  BEFORE UPDATE ON pi_accounts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_data_field_update();
