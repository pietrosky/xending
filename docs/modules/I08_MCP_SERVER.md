# I08 — MCP Server (Model Context Protocol)

## Resumen
Servidor MCP que expone las funciones de la plataforma como tools consumibles por cualquier cliente MCP: Claude Desktop, Kiro, OpenClaw, Cursor, o agentes custom. Es un wrapper sobre la API (I06). Permite que agentes AI operen la plataforma sin integraciones custom.

## Estado: POR CONSTRUIR (después de I06 API)

## Tipo: Infraestructura

---

## Qué es MCP

MCP (Model Context Protocol) es un estándar abierto de Anthropic que define cómo los LLMs se conectan a herramientas externas. Es como un USB-C para AI: cualquier agente compatible puede conectarse a cualquier servidor MCP.

Supabase ya tiene soporte oficial para MCP. La comunidad tiene un MCP server para Supabase que permite queries directas a la DB. Pero nosotros queremos algo más específico: exponer nuestras funciones de negocio, no queries SQL crudas.

---

## Tools que expone el MCP Server

Cada tool corresponde a un endpoint de la API (I06), pero con descripciones ricas para que el LLM sepa cuándo usarlos.

### Consultas de empresa

```json
{
  "name": "get_company_info",
  "description": "Obtiene información básica de una empresa por RFC: nombre, giro, status, datos disponibles",
  "input_schema": { "rfc": "string" }
}

{
  "name": "get_company_health",
  "description": "Resumen de salud financiera: facturación, tendencia, concentración, opinión SAT, score Buró. Puede calcularse por mes, trimestre o año",
  "input_schema": { "rfc": "string", "period": "monthly|quarterly|annual" }
}

{
  "name": "get_company_data_availability",
  "description": "Qué datos tiene disponibles esta empresa: facturas, declaraciones, Buró, etc. Con fechas desde/hasta",
  "input_schema": { "rfc": "string" }
}
```

### Expedientes y scoring

```json
{
  "name": "get_expediente_status",
  "description": "Estado actual de un expediente de crédito: etapa, scores, último evento",
  "input_schema": { "expediente_id_or_folio": "string" }
}

{
  "name": "get_scoring_results",
  "description": "Resultados del scoring crediticio: score consolidado, grade, detalle por engine, risk flags",
  "input_schema": { "expediente_id": "string" }
}

{
  "name": "run_scoring",
  "description": "Ejecutar scoring completo para un expediente. Solo si hay datos disponibles",
  "input_schema": { "expediente_id": "string" }
}
```

### Cartera

```json
{
  "name": "get_portfolio_summary",
  "description": "Resumen de cartera de crédito: vigente, vencida, castigada, concentración. Puede ser a una fecha específica para reportes",
  "input_schema": { "as_of_date": "string (optional, default: today)" }
}

{
  "name": "get_credit_line_detail",
  "description": "Detalle de una línea de crédito: monto aprobado, disponible, operaciones activas, vencimientos",
  "input_schema": { "credit_line_id": "string" }
}

{
  "name": "list_active_operations",
  "description": "Lista operaciones de crédito activas, con filtros por status, vencimiento, empresa",
  "input_schema": { "status": "string (optional)", "company_rfc": "string (optional)" }
}
```

### Compliance

```json
{
  "name": "get_pld_status",
  "description": "Estado PLD de una empresa: último check, resultado, alertas activas",
  "input_schema": { "rfc": "string" }
}

{
  "name": "list_pld_alerts",
  "description": "Alertas PLD activas en toda la cartera",
  "input_schema": {}
}
```

### Documentos y RAG

```json
{
  "name": "search_documents",
  "description": "Buscar en documentos indexados (contratos, políticas, minutas) usando lenguaje natural",
  "input_schema": { "query": "string", "company_rfc": "string (optional)", "document_type": "string (optional)" }
}

{
  "name": "generate_report",
  "description": "Generar reporte: scoring completo, resumen de cartera, estado de empresa",
  "input_schema": { "report_type": "string", "entity_id": "string", "format": "pdf|json" }
}
```

---

## Implementación

El MCP server es un proceso Node.js/Deno que:
1. Lee la lista de tools disponibles (del manifest de cada módulo)
2. Cuando un cliente MCP invoca un tool, llama al endpoint correspondiente de la API (I06)
3. Retorna el resultado al cliente MCP

```
supabase/functions/mcp-server/index.ts
  → Lee tools de I06 API
  → Maneja protocolo MCP (JSON-RPC sobre stdio o HTTP)
  → Autenticación por API key del tenant
```

### Configuración para Claude Desktop

```json
{
  "mcpServers": {
    "xending": {
      "command": "npx",
      "args": ["xending-mcp-server"],
      "env": {
        "XENDING_API_URL": "https://tu-proyecto.supabase.co/functions/v1",
        "XENDING_API_KEY": "tu-api-key"
      }
    }
  }
}
```

---

## Por qué MCP y no solo API

La API (I06) es para integraciones programáticas (frontend, webhooks, cron jobs). MCP es para que agentes AI usen la plataforma de forma natural:

- Un analista abre Claude Desktop y pregunta "¿cómo está la cartera?" → Claude usa el MCP tool `get_portfolio_summary`
- Un compliance officer pregunta "¿hay alertas PLD?" → Claude usa `list_pld_alerts`
- Un socio pregunta "¿qué dice el contrato de ABC sobre penalizaciones?" → Claude usa `search_documents`

El agente no necesita saber SQL ni endpoints. Solo describe lo que quiere y el MCP server lo traduce a llamadas a tu API.
