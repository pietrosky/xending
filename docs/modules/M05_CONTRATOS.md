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

```sql
CREATE TABLE cs_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'xending',
  template_type TEXT NOT NULL
    CHECK (template_type IN ('credit_line', 'operation', 'intraday', 'renewal')),
  template_name TEXT NOT NULL,
  template_content TEXT NOT NULL,  -- HTML/Markdown template con variables
  version TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cs_generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'xending',
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('credit_line', 'operation')),
  entity_id UUID NOT NULL,
  template_id UUID REFERENCES cs_document_templates(id),
  document_type TEXT NOT NULL
    CHECK (document_type IN ('contract', 'promissory_note', 'approval_letter')),
  document_data JSONB DEFAULT '{}',       -- datos usados para generar
  file_url TEXT,                           -- URL del PDF generado
  docusign_envelope_id TEXT,               -- null si intradía
  signature_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (signature_status IN ('pending', 'signed', 'declined', 'not_required')),
  signed_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
```
