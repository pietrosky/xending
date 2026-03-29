# M12 — Gestor de Cartera

## Resumen
Gestión post-crédito: líneas de crédito activas, operaciones individuales, vencimientos, pagos, líneas revolventes, operaciones intradía, renovación anual, y detección de deterioro.

## Estado: POR CONSTRUIR

## Dependencias: M05 Contratos, M17 Comité, I05 Scheduler, M16 Banking

---

## Conceptos clave

### Línea de crédito
- Monto máximo aprobado (ej: $500K USD)
- Vigencia anual (renovación obligatoria)
- Puede ser revolvente (múltiples operaciones simultáneas)
- Tiene disponible = aprobado - sum(operaciones activas)

### Operación de crédito
- Cada disposición bajo la línea
- Tiene su propio contrato, plazo, y vencimiento
- Dos tipos: estándar (2-45 días) e intradía (mismo día)
- Consume disponible de la línea al activarse
- Libera disponible al pagarse

---

## Tablas

```
cs_credit_lines
  id uuid pk
  tenant_id text
  company_id uuid fk → cs_companies
  expediente_id uuid fk → cs_expedientes
  approved_amount numeric
  currency text
  available_amount numeric      -- se recalcula con cada operación
  line_type text                -- 'revolving', 'single'
  start_date date
  expiry_date date              -- vencimiento anual
  annual_renewal_date date      -- fecha de próxima renovación
  interest_rate numeric
  status text                   -- 'active', 'suspended', 'expired', 'cancelled'
  conditions jsonb              -- covenants, restricciones
  created_at timestamptz
  updated_at timestamptz

cs_credit_operations
  id uuid pk
  credit_line_id uuid fk → cs_credit_lines
  operation_type text           -- 'standard', 'intraday'
  amount numeric
  currency text
  disbursement_date date
  maturity_date date            -- disbursement + term_days
  term_days int                 -- 1-45
  interest_rate numeric
  status text                   -- 'pending_authorization', 'pending_signature',
                                -- 'pending_disbursement', 'active', 'paid',
                                -- 'overdue', 'defaulted'
  contract_id uuid fk → cs_generated_documents
  authorization_id uuid fk → cs_authorization_requests  -- para intradía
  requires_signature boolean    -- false para intradía
  docusign_envelope_id text
  paid_at timestamptz
  paid_amount numeric
  created_at timestamptz
  updated_at timestamptz
```

---

## Flujo de operación estándar

```
1. Se pacta operación (monto, plazo)
2. calculateMaturityDate(disbursement, termDays) → fecha exacta
3. getAlertDays(termDays) → fechas de alerta
4. Crear operación status: pending_signature
5. M05 genera contrato → DocuSign
6. Cliente firma → status: pending_disbursement
7. Admin libera pago → status: active
8. available_amount -= operation.amount
9. I05 crea eventos de alerta según getAlertDays
10. Al vencimiento: si no paga → status: overdue
11. Cuando paga → status: paid, available_amount += operation.amount
```

## Flujo de operación intradía

```
1. Se pacta operación intradía
2. M17 solicita autorización por facultades
3. Socios autorizan → status: pending_disbursement
4. M05 genera contrato (sin DocuSign)
5. Email de confirmación
6. Admin libera pago → status: active
7. available_amount -= operation.amount
8. Mismo día: se concilia pago → status: paid
9. available_amount += operation.amount
```

---

## Renovación anual

```
1. I05 detecta: 30 días antes de expiry_date
2. Disparar re-scoring completo (M03 con datos frescos de Syntage)
3. Re-check PLD (M08)
4. Presentar caso a comité (M17)
5. Si aprueba: generar contrato de renovación (M05)
6. Actualizar expiry_date + 1 año
7. Si rechaza: status → expired, no se permiten nuevas operaciones
```

---

## Señales de deterioro

| Señal | Fuente | Acción |
|-------|--------|--------|
| Operación overdue | cs_credit_operations | Alerta crítica |
| Baja facturación >20% | M03a SAT (re-check) | Alerta al analista |
| Nuevos créditos en Buró | M03b (re-consulta) | Alerta |
| Opinión cumplimiento negativa | M03a SAT | Alerta crítica |
| Aparición en lista 69B | M08 PLD | Bloqueo inmediato |
| Incumplimiento covenant | M13 | Alerta + posible suspensión |
