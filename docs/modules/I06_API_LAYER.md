# I06 — API Layer

## Resumen
API REST unificada que expone todas las funciones de la plataforma. Es el punto de entrada para el frontend, agentes AI, MCP server, y cualquier integración externa. Implementada con Supabase Edge Functions.

## Estado: POR CONSTRUIR

## Tipo: Infraestructura (siempre activa)

## Prioridad: ALTA — todo lo demás depende de esto

---

## Principio

Cada módulo tiene lógica determinista (funciones TypeScript puras). La API las expone como endpoints REST. Cualquier cliente (frontend React, agente AI, MCP, webhook externo) consume la misma API.

---

## Endpoints

### Empresas (I01 Data Layer)

```
GET  /api/companies/{rfc}
  → Datos de la empresa (nombre, giro, status, IDs externos)

GET  /api/companies/{rfc}/data
  → Qué datos tiene disponibles, por tipo y periodo
  → { invoices: { desde: '2023-01', hasta: '2026-03', periodos: 36 }, ... }

GET  /api/companies/{rfc}/health
  → Resumen de salud financiera
  → Calculable por periodo: ?period=monthly|quarterly|annual
  → { facturacion_mensual_promedio, tendencia, concentracion_hhi, 
      opinion_cumplimiento, score_buro, alertas_activas }

GET  /api/companies/{rfc}/health/history
  → Historia de salud financiera (para gráficas de tendencia)
  → ?from=2024-01&to=2026-03
```

### Expedientes (M02)

```
POST /api/archive
  → Crear expediente desde onboarding
  → Body: { rfc, company_name, business_activity, 
            declared_monthly_sales_mxn, requested_line_usd, contact_email }
  → Response: { expediente_id, folio, pre_filter_result, next_step }

GET  /api/archive/{id}
  → Estado completo del expediente (stage, scores, eventos)

POST /api/archive/{id}/advance
  → Avanzar etapa (con validaciones de state machine)
  → Body: { target_stage, actor, data }

GET  /api/archive/{id}/timeline
  → Historial de eventos del expediente
```

### Scoring (M03)

```
POST /api/scoring/run/{expediente_id}
  → Ejecutar scoring completo (todos los engines activos)
  → Response: { consolidated_score, grade, engine_results, cross_results }

GET  /api/scoring/{expediente_id}
  → Resultados del último scoring

GET  /api/scoring/{expediente_id}/engine/{engine_name}
  → Resultado detallado de un engine específico
```

### Decisión (M04)

```
GET  /api/decision/{expediente_id}
  → Recomendación del sistema (score, decision, credit_limit, covenants)

POST /api/decision/{expediente_id}/submit-to-committee
  → Enviar caso a comité (M17)
```

### Cartera (M12)

```
GET  /api/portfolio
  → Resumen de cartera: vigente, vencida, castigada
  → ?as_of=2026-03-31 (para reportes a fecha)

GET  /api/portfolio/credits
  → Lista de líneas de crédito activas

GET  /api/portfolio/credits/{id}
  → Detalle de línea (operaciones, disponible, vencimientos)

POST /api/portfolio/operations
  → Crear operación (estándar o intradía)
  → Body: { credit_line_id, amount, term_days, operation_type }

GET  /api/portfolio/operations/{id}
  → Detalle de operación (status, contrato, alertas)

POST /api/portfolio/operations/{id}/mark-paid
  → Marcar operación como pagada
```

### Autorizaciones (M17)

```
POST /api/authorizations
  → Solicitar autorización (comité o facultades)
  → Body: { entity_type, entity_id, authorization_type, amount }

GET  /api/authorizations/{id}
  → Estado de la autorización (votos, quórum)

POST /api/authorizations/{id}/vote
  → Votar (vía token del socio)
  → Body: { vote: 'approve'|'reject', comment }
```

### Documentos (M05)

```
POST /api/documents/generate
  → Generar contrato desde template
  → Body: { template_type, entity_id, data }

GET  /api/documents/{id}
  → Descargar documento generado

POST /api/documents/{id}/send-to-docusign
  → Enviar a DocuSign para firma
```

### PLD / Compliance (M06-M09)

```
GET  /api/compliance/{rfc}/status
  → Estado PLD de la empresa (último check, alertas)

POST /api/compliance/{rfc}/check
  → Ejecutar check PLD (Scory + Hawk)

GET  /api/compliance/alerts
  → Alertas PLD activas (para dashboard compliance officer)
```

### Agente (M14)

```
POST /api/agent/query
  → Pregunta en lenguaje natural
  → Body: { question: "¿Cómo está la empresa ABC?" }
  → Response: { answer, sources, actions_available }

GET  /api/agent/capabilities
  → Lista de qué puede hacer el agente (tools disponibles)
```

---

## Implementación

Supabase Edge Functions (Deno runtime). Cada grupo de endpoints es una función:

```
supabase/functions/
  api-companies/index.ts
  api-expedientes/index.ts
  api-scoring/index.ts
  api-portfolio/index.ts
  api-authorizations/index.ts
  api-documents/index.ts
  api-compliance/index.ts
  api-agent/index.ts
```

Autenticación: Supabase Auth para usuarios internos. Tokens para solicitantes y socios. API keys para integraciones externas.

---

## Por qué es desechable sin afectar el core

La API es solo un wrapper sobre las funciones deterministas que ya existen. Si mañana cambias de Supabase Edge Functions a AWS Lambda, Cloudflare Workers, o un servidor Express, solo reescribes los handlers. La lógica de negocio (engines, state machine, calculadores) no cambia.
