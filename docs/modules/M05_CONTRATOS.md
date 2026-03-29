# M05 — Contratos y Documentos

## Resumen
Generación de contratos para cada operación de crédito. Una línea puede tener múltiples operaciones, cada una con su propio contrato. Integración con DocuSign para firma digital. Operaciones intradía generan contrato sin firma (solo email).

## Estado: POR CONSTRUIR

## Dependencias: M04 Decision, M12 Gestor Cartera, M17 Comité

---

## Tipos de contrato

### Contrato de línea de crédito
- Se genera cuando el comité aprueba la línea
- Define: monto máximo, plazo de vigencia (anual), condiciones, covenants
- Se firma vía DocuSign
- 1 por línea aprobada

### Contrato de operación estándar (2-45 días)
- Se genera cada vez que se pacta una operación bajo la línea
- Define: monto, plazo, tasa, fecha de vencimiento
- Se firma vía DocuSign
- Cuando el cliente firma → email a admin para liberar pago
- N contratos por línea (revolvente)

### Contrato de operación intradía
- Se genera al pactar operación intradía
- NO requiere firma DocuSign
- Solo se envía por email como confirmación
- Requiere autorización previa por facultades (M17)

### Contrato de renovación
- Se genera cuando se renueva la línea anualmente
- Misma estructura que contrato de línea
- Se firma vía DocuSign

---

## Flujo de firma (operación estándar)

```
1. Se pacta operación → sistema genera contrato PDF desde template
2. Se envía a DocuSign con datos del firmante
3. DocuSign envía email al cliente con link de firma
4. Cliente firma en DocuSign
5. DocuSign webhook notifica al sistema → status: signed
6. Sistema envía email a admin: "ABC firmó operación por $X, liberar pago"
7. Admin confirma liberación
8. Operación pasa a status: active
```

## Flujo intradía (sin firma)

```
1. Se pacta operación → M17 solicita autorización por facultades
2. Socios autorizan (3, 4 o 5 según monto)
3. Sistema genera contrato PDF (sin DocuSign)
4. Se envía email de confirmación al cliente y admin
5. Admin libera pago
6. Se concilia pago el mismo día
```

---

## Tablas

```
cs_document_templates
  id uuid pk
  tenant_id text
  template_type text        -- 'credit_line', 'operation', 'intraday', 'renewal'
  template_name text
  template_content text     -- HTML/Markdown template con variables
  version text
  is_active boolean
  created_at timestamptz

cs_generated_documents
  id uuid pk
  tenant_id text
  entity_type text          -- 'credit_line', 'operation'
  entity_id uuid
  template_id uuid fk → cs_document_templates
  document_type text        -- 'contract', 'promissory_note', 'approval_letter'
  document_data jsonb       -- datos usados para generar
  file_url text             -- URL del PDF generado
  docusign_envelope_id text -- null si intradía
  signature_status text     -- 'pending', 'signed', 'declined', 'not_required'
  signed_at timestamptz
  generated_at timestamptz
  created_at timestamptz
```
