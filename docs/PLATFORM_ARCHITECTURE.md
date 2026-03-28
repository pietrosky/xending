# Xending Platform — Arquitectura General

## Visión del Producto

Xending Platform es un sistema modular de análisis crediticio empresarial diseñado para:

1. Operar como motor interno de Xending Capital (SOFOM ENR)
2. Venderse como whitelabel a otras SOFOMs e instituciones financieras
3. Ofrecer herramientas gratuitas de salud financiera como gancho comercial

Cada institución cliente recibe su propio deployment con configuración, branding y reglas independientes.

---

## Principios de Arquitectura

### Modularidad total
Cada módulo es independiente, activable/desactivable por tenant. Un módulo puede existir sin los demás. Los módulos se comunican exclusivamente vía eventos.

### AI-first
La AI no es un add-on, es la capa de interpretación principal:
- AI interpreta resultados de engines en lenguaje natural
- AI procesa documentos (OCR de PDFs, parsing de Excel)
- AI genera comunicaciones (emails, resúmenes ejecutivos)
- AI como interfaz principal (agente conversacional)
- Cada módulo produce datos estructurados; la AI los hace accesibles

### Syntage como provider principal
Syntage es el proveedor de datos del SAT, Buró, Registro Público y Hawk Checks. Es el provider principal y único por ahora. Si un cliente futuro requiere otro provider, se evalúa caso por caso (alianza con Syntage o desarrollo custom).

### Pesos dinámicos + configurables
Los pesos del scoring se calculan automáticamente según engines activos (normalización al 100%), pero cada tenant puede hacer override manual de los pesos si lo desea.

---

## Catálogo Completo de Módulos

### Grupo A: Originación de Crédito

| ID | Módulo | Descripción | Estado | Dependencias |
|----|--------|-------------|--------|-------------|
| M01 | Onboarding Digital | Landing pública, formulario simplificado, captación de leads, pre-filtro comercial, routing | POR CONSTRUIR | I01 |
| M02 | Expediente Digital | State machine del flujo de crédito, tokens de acceso, portal del solicitante, progreso en vivo | CONSTRUIDO | I01, M01 |
| M03 | Scoring Framework | Framework de engines + registry dinámico + pesos configurables + cruces inteligentes | CONSTRUIDO (refactor pendiente para modularidad) | I01, M02 |
| M03a | Data Source: SAT | Datos del SAT vía Syntage (facturas, declaraciones, constancia, opinión, contabilidad, nómina) | CONSTRUIDO | Syntage |
| M03b | Data Source: Buró | Buró de Crédito vía Syntage (score, créditos activos/liquidados, consultas, calificación) | CONSTRUIDO | Syntage |
| M03c | Data Source: Financieros Manuales | Upload de estados financieros (PDF/Excel), OCR con AI, schema estándar, comparación SAT vs manual | POR CONSTRUIR | AI |
| M03d | Data Source: Compliance | PLD/KYC vía Scory + Hawk Checks vía Syntage | CONSTRUIDO (parcial) | Scory, Syntage |
| M03e | Data Source: Registro Público | Accionistas, RUG, estructura corporativa vía Syntage | CONSTRUIDO | Syntage |
| M04 | Decision Engines | 8 motores de decisión: AI Risk, Credit Limit, Risk Matrix, Scenarios, Covenants, Review Freq, Policy, Decision Workflow | CONSTRUIDO | M03 |
| M05 | Contratos y Documentos | Templates, generación automática de contratos, cartas, formatos. Firma digital futura | PLACEHOLDER | M04 |

### Grupo B: Compliance y PLD

| ID | Módulo | Descripción | Estado | Dependencias |
|----|--------|-------------|--------|-------------|
| M06 | KYB — Know Your Business (Scory) | Verificación de identidad empresarial completa: RFC, domicilio, accionistas, giro, consistencia. Agentic AI para investigación automática | POR CONSTRUIR | Scory, AI |
| M07 | Listas Negras y Sanciones | 69B, OFAC, PEPs, SYGER, RUG, Interpol, Panama Papers, CNBV, FGJ/FGR, PROFECO, Banco Mundial, FCPA, quiebras, concursos mercantiles | POR CONSTRUIR | Scory, Syntage Hawk |
| M08 | Monitoreo Continuo PLD | Re-checks periódicos automáticos, alertas si cliente cae en lista, scheduling configurable (diario/semanal/mensual), historial completo | POR CONSTRUIR | M06, M07 |
| M09 | Compliance Officer Dashboard | Panel del oficial de cumplimiento, reportes regulatorios (CNBV, UIF, CONDUSEF), workflow de revisión/aprobación, historial de decisiones, exportación | POR CONSTRUIR | M06, M07, M08 |

### Grupo C: Portal Empresa (Público / Freemium)

| ID | Módulo | Descripción | Estado | Dependencias |
|----|--------|-------------|--------|-------------|
| M10 | Portal Salud Financiera | Dashboard gratuito para empresas: facturación, tendencias, estacionalidad, top clientes/proveedores, concentración, indicadores con AI, salud fiscal | POR CONSTRUIR | Syntage, AI |
| M11 | Cobranza Inteligente | Cuentas por cobrar automáticas desde SAT (facturas PPD sin complemento de pago), antigüedad de cartera, top deudores, DSO, alertas de facturas vencidas | POR CONSTRUIR | Syntage |

### Grupo D: Post-Crédito

| ID | Módulo | Descripción | Estado | Dependencias |
|----|--------|-------------|--------|-------------|
| M12 | Gestor de Cartera | Monitoreo de créditos activos, alertas de deterioro, reportes de cartera (vigente/vencida/castigada), integración con PLD | POR CONSTRUIR | M08 |
| M13 | Covenant Tracking | Seguimiento de condiciones del crédito, alertas de incumplimiento, review frequency automático | ENGINE CONSTRUIDO, UI POR CONSTRUIR | M04 |

### Grupo E: Inteligencia y AI

| ID | Módulo | Descripción | Estado | Dependencias |
|----|--------|-------------|--------|-------------|
| M14 | Agente Conversacional | Chat AI sobre la empresa: ventas, riesgo, cobranza, tendencias. Consume datos de todos los módulos activos. Interfaz principal para consultas | POR CONSTRUIR (placeholder) | AI, I01 |

### Grupo F: FX y Tesorería

| ID | Módulo | Descripción | Estado | Dependencias |
|----|--------|-------------|--------|-------------|
| M15 | Operaciones FX | Cotizador, operaciones de cambio, líneas FX vinculadas a crédito | PARCIALMENTE CONSTRUIDO (otro proyecto) | — |

### Infraestructura (siempre activa)

| ID | Módulo | Descripción | Estado |
|----|--------|-------------|--------|
| I01 | Data Layer Compartido | cs_companies, cs_provider_data, cs_company_contacts. Datos de empresa reutilizables por todos los módulos | POR CONSTRUIR |
| I02 | Module Registry | Catálogo de módulos, configuración por tenant, pesos de engines, reglas de negocio | POR CONSTRUIR |
| I03 | Event Bus | Comunicación entre módulos vía eventos. Ningún módulo llama directamente a otro | POR CONSTRUIR |
| I04 | Tenant Management | Multi-tenant / whitelabel, branding, reglas por institución | POR CONSTRUIR |

---

## Diagrama de conexión entre módulos

```
M01 Onboarding ──submit──→ M02 Expediente ──pre_filter_passed──→ M06 KYB
                                    │
                                    ├──kyb_passed──→ M07 Listas Negras
                                    │
                                    ├──blacklists_clear──→ M02 (buro_auth + ciec)
                                    │
                                    ├──data_ready──→ M03 Scoring (engines activos)
                                    │
                                    ├──scoring_done──→ M04 Decision
                                    │
                                    ├──approved──→ M05 Contratos
                                    │              M12 Gestor Cartera (crédito activo)
                                    │              M08 Monitoreo PLD (continuo)
                                    │              M13 Covenant Tracking
                                    │
                                    └──any_stage──→ M14 Agente (consultas)

M10 Portal Empresa ←──datos SAT──→ I01 Data Layer ←──→ M11 Cobranza
         │
         └── CTA "Solicita crédito" ──→ M01 Onboarding

M08 Monitoreo PLD ──alerta──→ M09 Compliance Officer
                   ──alerta──→ M12 Gestor Cartera
```

---

## Scoring Framework: Engines por Data Source

```
M03a SAT (Syntage):
  Engines: sat_facturacion (14%), network (8%), stability (9%), employee (3%)
  Cruces: 01, 03, 06, 08, 11, 14, 16

M03b Buró (Syntage):
  Engines: buro (10%)
  Cruces: 02, 04, 12, 18

M03c Financieros Manuales (futuro):
  Engines: financial (11%), cashflow (16%), working_capital (4%)
  Cruces: 01, 02, 05, 09, 13, 15
  Nota: Hoy estos engines consumen datos de Syntage (declaraciones).
        Cuando M03c exista, podrán consumir datos manuales también.
        Si ambas fuentes están activas, se comparan (cross-validation).

M03d Compliance (Scory + Hawk):
  Engines: compliance (gate), graph_fraud (gate)
  Cruces: 17

M03e Registro Público (Syntage):
  Engines: operational (9%)
  Cruces: 07

Engines independientes (siempre disponibles):
  fx_risk (7%), guarantee (gate), documentation (4%), portfolio (5%), benchmark
```

### Pesos dinámicos

Si un tenant desactiva M03b (Buró), el peso de `buro` (10%) se redistribuye proporcionalmente entre los engines activos restantes. El score consolidado siempre suma 100%.

Cada tenant puede hacer override manual de los pesos si lo desea.

---

## Stack Tecnológico

- Frontend: React + TypeScript + Vite + TailwindCSS
- Backend: Supabase (PostgreSQL + Edge Functions + Auth + Storage + Realtime)
- APIs externas: Syntage (SAT, Buró, RPC, Hawk), Scory (PLD/KYC)
- AI: OpenAI (GPT-4) para interpretación, OCR, agente, comunicaciones
- Deployment: Supabase hosted (futuro: self-hosted por tenant)

---

## Plan de construcción por bloques

### Bloque 1 (actual)
- I01 Data Layer: cs_companies, cs_provider_data
- I02 Module Registry: cs_modules, cs_tenant_modules
- M01 Onboarding: formulario público, pre-filtro, routing
- Documentación completa

### Bloque 2
- M02 mejoras: portal del solicitante vía token
- M06 KYB: estructura + integración Scory
- M07 Listas Negras: estructura + checks

### Bloque 3
- M10 Portal Empresa: dashboard público
- M11 Cobranza: cruce facturas PPD vs pagos
- M14 Agente: placeholder

### Bloque 4
- M03 refactor: engine registry dinámico, pesos configurables
- M03c Financieros Manuales: upload, OCR, schema
- M08 Monitoreo PLD
- M09 Compliance Officer

### Bloque 5
- M12 Gestor de Cartera
- M13 Covenant Tracking UI
- I04 Tenant Management completo
- Whitelabel / multi-tenant
