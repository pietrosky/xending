# M14 — Agente Conversacional

## Resumen
Chat AI que permite consultar información sobre cualquier empresa del sistema en lenguaje natural. Consume datos de todos los módulos activos y responde preguntas sobre ventas, riesgo, cobranza, tendencias, compliance, y más. Es la interfaz principal para usuarios no técnicos.

## Estado: POR CONSTRUIR (placeholder en arquitectura)

## Dependencias: AI (OpenAI), I01 Data Layer, todos los módulos activos

---

## Concepto

En vez de navegar dashboards y tablas, el usuario pregunta:

```
Usuario: "¿Cómo está la empresa ABC?"

Agente: "ABC tiene ventas mensuales promedio de $12.5M MXN con tendencia 
creciente (+8% vs año anterior). Su concentración de clientes es moderada 
(HHI 1,200). Opinión de cumplimiento SAT positiva. Tiene 3 facturas 
pendientes de cobro por $2.1M MXN con antigüedad promedio de 45 días. 
Score crediticio actual: 72/100 (Grade B). Sin alertas PLD activas."
```

---

## Preguntas que puede responder

### Sobre la empresa
- "¿Cuánto factura mensualmente?"
- "¿Cuáles son sus principales clientes?"
- "¿Tiene concentración de clientes?"
- "¿Está al corriente con el SAT?"
- "¿Aparece en alguna lista negra?"

### Sobre el crédito
- "¿En qué etapa está la solicitud de ABC?"
- "¿Cuál fue el resultado del scoring?"
- "¿Por qué se rechazó la solicitud?"
- "¿Qué covenants tiene el crédito de ABC?"
- "¿Está cumpliendo con sus condiciones?"

### Sobre la cartera
- "¿Cuántos créditos activos tenemos?"
- "¿Cuál es la tasa de morosidad?"
- "¿Qué clientes tienen alertas de deterioro?"
- "Dame un resumen de la cartera"

### Sobre cobranza
- "¿Cuánto le deben a ABC?"
- "¿Quién es el mayor deudor de ABC?"
- "¿Cómo va la tendencia de cobranza?"

---

## Arquitectura

```
Usuario pregunta en chat
         │
         ▼
AI interpreta la pregunta
         │
         ├── Identifica empresa(s) mencionada(s)
         ├── Identifica módulo(s) relevante(s)
         ├── Consulta datos de I01 Data Layer
         ├── Consulta resultados de engines relevantes
         │
         ▼
AI genera respuesta en lenguaje natural
         │
         ├── Datos concretos (números, fechas, estados)
         ├── Interpretación (qué significa)
         ├── Contexto (comparación vs benchmarks)
         └── Recomendación (si aplica)
```

---

## Contexto que consume

| Módulo | Datos que el agente puede consultar |
|--------|-------------------------------------|
| M02 Expediente | Etapa actual, folio, historial de eventos |
| M03 Scoring | Resultados de engines, métricas, risk flags |
| M04 Decision | Decisión, monto aprobado, condiciones |
| M06 KYB | Resultado de verificación, alertas |
| M07 Blacklists | Coincidencias en listas |
| M08 PLD | Alertas activas, historial de checks |
| M10 Portal | Métricas de salud financiera |
| M11 Cobranza | Cuentas por cobrar, deudores |
| M12 Cartera | Estado del crédito, alertas de deterioro |
| M13 Covenants | Cumplimiento de condiciones |

---

## Implementación futura

### Fase 1: Consultas básicas
- Preguntas sobre una empresa específica
- Datos de facturación, scoring, estado de expediente
- Respuestas basadas en datos estructurados

### Fase 2: Análisis comparativo
- "Compara ABC con DEF"
- "¿Cuáles son los clientes más riesgosos?"
- "¿Qué empresas tienen alertas activas?"

### Fase 3: Acciones
- "Envía un recordatorio a ABC para que suba documentos"
- "Genera el reporte de cartera de este mes"
- "Programa una revisión anticipada de ABC"

---

## Tablas futuras

```
cs_agent_conversations    — Historial de conversaciones
cs_agent_queries          — Queries ejecutados por el agente
cs_agent_actions          — Acciones ejecutadas por el agente
```
