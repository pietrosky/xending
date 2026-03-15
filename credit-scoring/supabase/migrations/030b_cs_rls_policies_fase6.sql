-- ============================================================================
-- Migration 030b: RLS Policies para tablas de Fase 6 (Expedientes)
-- ============================================================================

-- ─── cs_expedientes ──────────────────────────────────────────────────

ALTER TABLE cs_expedientes ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden ver expedientes
CREATE POLICY cs_expedientes_select ON cs_expedientes
  FOR SELECT TO authenticated
  USING (true);

-- Usuarios autenticados pueden crear expedientes
CREATE POLICY cs_expedientes_insert ON cs_expedientes
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Usuarios autenticados pueden actualizar expedientes
CREATE POLICY cs_expedientes_update ON cs_expedientes
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── cs_expediente_tokens ────────────────────────────────────────────

ALTER TABLE cs_expediente_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_tokens_select ON cs_expediente_tokens
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY cs_tokens_insert ON cs_expediente_tokens
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY cs_tokens_update ON cs_expediente_tokens
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── cs_expediente_events ────────────────────────────────────────────

ALTER TABLE cs_expediente_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_events_select ON cs_expediente_events
  FOR SELECT TO authenticated
  USING (true);

-- Solo insertar, nunca actualizar ni borrar (audit log inmutable)
CREATE POLICY cs_events_insert ON cs_expediente_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ─── cs_business_rules ───────────────────────────────────────────────

ALTER TABLE cs_business_rules ENABLE ROW LEVEL SECURITY;

-- Todos pueden leer reglas
CREATE POLICY cs_rules_select ON cs_business_rules
  FOR SELECT TO authenticated
  USING (true);

-- Solo admins pueden modificar reglas (por ahora todos, se restringe después)
CREATE POLICY cs_rules_update ON cs_business_rules
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── Acceso anónimo para tokens públicos ─────────────────────────────
-- Los solicitantes acceden vía token sin login, necesitan leer su expediente

CREATE POLICY cs_expedientes_anon_select ON cs_expedientes
  FOR SELECT TO anon
  USING (
    id IN (
      SELECT expediente_id FROM cs_expediente_tokens
      WHERE expires_at > now() AND NOT is_used
    )
  );

CREATE POLICY cs_tokens_anon_select ON cs_expediente_tokens
  FOR SELECT TO anon
  USING (expires_at > now());

CREATE POLICY cs_tokens_anon_update ON cs_expediente_tokens
  FOR UPDATE TO anon
  USING (expires_at > now())
  WITH CHECK (expires_at > now());
