# I01 — Data Layer Compartido

## Resumen
Capa de datos compartida por todos los módulos. Almacena datos históricos granulares por empresa, por tipo de dato, y por periodo. Cualquier módulo puede leer datos sin duplicar llamadas a APIs. Diseñado para mantener historia completa y soportar actualizaciones incrementales.

## Estado: POR CONSTRUIR

## Tipo: Infraestructura (siempre activa)

---

## Principio fundamental

Los datos de una empresa son de la empresa, no del expediente ni del módulo. Se guardan por periodo (mensual, trimestral, anual, puntual) y se acumulan con el tiempo. Nunca se borran, solo se marcan como superseded cuando hay una versión más reciente del mismo periodo.

---

## Fuentes de datos soportadas

| Fuente | Provider | Cómo llegan los datos | Frecuencia |
|--------|----------|----------------------|-----------|
| SAT (facturas, declaraciones, constancia) | Syntage | Extracción automática vía CIEC | Primera vez: 3 años. Después: mensual |
| Buró de Crédito | Syntage | Consulta con autorización firmada | Cada 6 meses o por evento |
| Hawk Checks (legales, sanciones) | Syntage | Consulta automática | Cada 6-12 meses |
| Registro Público (accionistas, RUG) | Syntage | Consulta automática | Por evento |
| PLD/KYC | Scory | Consulta automática | Cada 6-12 meses |
| Estados financieros manuales | Upload PDF/Excel | Analista o cliente sube | Trimestral o por evento |
| ERP / Contabilidad (futuro) | API directa o webhook | Integración con sistema del cliente | Tiempo real o diario |
| Open Banking (futuro) | API bancaria | Conexión con banco del cliente | Diario |

### Sobre ERPs y facturas automáticas (futuro)

En México los ERPs más comunes son CONTPAQi, Aspel, SAP Business One, Oracle NetSuite, Alegra, y Odoo. Muchos tienen APIs o exportan XML/CSV. La idea futura es:

1. El cliente conecta su ERP vía API o webhook
2. Las facturas se sincronizan automáticamente a cs_provider_data
3. Se cruzan con datos del SAT (Syntage) para validar consistencia
4. Si hay discrepancia → alerta

Por ahora, Syntage + SAT es la fuente de verdad. Los ERPs se agregan como fuente complementaria cuando haya demanda.

---

## Tablas

### cs_companies (entidad maestra de empresa)

```sql
CREATE TABLE cs_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'xending',
  rfc TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  business_activity TEXT,
  tax_regime TEXT,
  incorporation_date DATE,
  address JSONB,
  syntage_entity_id TEXT,
  scory_entity_id TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'blacklisted')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, rfc)
);
```

Un RFC es único por tenant. La misma empresa puede existir en múltiples tenants.

### cs_company_contacts

```sql
CREATE TABLE cs_company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cs_companies(id),
  contact_type TEXT NOT NULL
    CHECK (contact_type IN ('email', 'phone', 'legal_rep', 'admin', 'billing')),
  contact_value TEXT NOT NULL,
  contact_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### cs_data_extractions (cada vez que se extrae data)

```sql
CREATE TABLE cs_data_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cs_companies(id),
  provider TEXT NOT NULL
    CHECK (provider IN ('syntage', 'scory', 'manual', 'erp', 'banking')),
  extraction_type TEXT NOT NULL
    CHECK (extraction_type IN ('full', 'incremental', 'point_in_time')),
  triggered_by TEXT,
  syntage_extraction_id TEXT,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  data_types_extracted TEXT[],
  period_from DATE,
  period_to DATE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

Tipos de extracción:
- `full`: primera vez, se extraen 3 años de historia
- `incremental`: actualización mensual, solo el periodo nuevo
- `point_in_time`: dato puntual (Buró, constancia fiscal, PLD check)

### cs_provider_data (datos granulares por empresa + tipo + periodo)

```sql
CREATE TABLE cs_provider_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cs_companies(id),
  extraction_id UUID REFERENCES cs_data_extractions(id),
  provider TEXT NOT NULL,
  data_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  period_type TEXT NOT NULL
    CHECK (period_type IN ('monthly', 'quarterly', 'annual', 'point_in_time')),
  data_payload JSONB NOT NULL,
  record_count INT,
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  superseded_by UUID REFERENCES cs_provider_data(id),
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para queries frecuentes
CREATE INDEX idx_provider_data_company ON cs_provider_data(company_id);
CREATE INDEX idx_provider_data_type ON cs_provider_data(company_id, data_type);
CREATE INDEX idx_provider_data_current ON cs_provider_data(company_id, data_type, is_current)
  WHERE is_current = true;
CREATE INDEX idx_provider_data_period ON cs_provider_data(company_id, data_type, period_key);
```

---

## Tipos de datos y sus periodos

| data_type | period_type | period_key ejemplo | Qué contiene |
|-----------|-------------|-------------------|-------------|
| invoices_issued | monthly | '2024-01' | Facturas emitidas de enero 2024 |
| invoices_received | monthly | '2024-01' | Facturas recibidas de enero 2024 |
| payroll_invoices | monthly | '2024-01' | CFDIs de nómina de enero 2024 |
| tax_return_annual | annual | '2024' | Declaración anual 2024 |
| tax_return_monthly | monthly | '2024-01' | Declaración mensual enero 2024 |
| tax_status | point_in_time | '2026-03-15' | Constancia de situación fiscal |
| compliance_opinion | point_in_time | '2026-03-15' | Opinión de cumplimiento SAT |
| electronic_accounting | monthly | '2024-01' | Balanza de comprobación enero 2024 |
| buro_report | point_in_time | '2026-03-15' | Reporte completo de Buró |
| buro_score | point_in_time | '2026-03-15' | Score PyME |
| hawk_checks | point_in_time | '2026-03-15' | Resultados de Hawk Checks |
| pld_check | point_in_time | '2026-03-15' | Resultado PLD/KYC de Scory |
| kyb_result | point_in_time | '2026-03-15' | Resultado KYB de Scory |
| financial_statements | quarterly | '2026-Q1' | Estados financieros manuales |
| bank_statements | monthly | '2026-03' | Estado de cuenta bancario (futuro) |
| erp_invoices | monthly | '2026-03' | Facturas desde ERP (futuro) |
| insights | point_in_time | '2026-03-15' | Métricas pre-calculadas por Syntage |

---

## Cómo funciona la historia

### Primera extracción (onboarding)

```
Empresa ABC solicita crédito.
Syntage extrae 3 años de historia (2023-01 a 2026-03).

cs_data_extractions:
  { type: 'full', period_from: 2023-01-01, period_to: 2026-03-31 }

cs_provider_data genera:
  36 registros de invoices_issued (1 por mes, 3 años)
  36 registros de invoices_received
  36 registros de payroll_invoices
  3 registros de tax_return_annual (2023, 2024, 2025)
  36 registros de tax_return_monthly
  1 registro de tax_status
  1 registro de compliance_opinion
  1 registro de buro_report
  1 registro de hawk_checks
  Todos con is_current = true
```

### Actualización mensual (abril 2026)

```
Scheduler detecta: ABC tiene crédito activo, toca actualizar.

cs_data_extractions:
  { type: 'incremental', period_from: 2026-04-01, period_to: 2026-04-30 }

cs_provider_data agrega:
  1 registro nuevo de invoices_issued para '2026-04'
  1 registro nuevo de invoices_received para '2026-04'
  1 registro nuevo de payroll_invoices para '2026-04'
  Todos con is_current = true
```

### Re-extracción de un periodo (corrección)

```
Se detecta que marzo 2026 tenía facturas faltantes.

Se re-extrae marzo:
  Registro viejo: { period_key: '2026-03', is_current: false, superseded_by: nuevo_id }
  Registro nuevo: { period_key: '2026-03', is_current: true }

La historia se mantiene. Puedes ver qué tenías antes y qué tienes ahora.
```

### Consulta de Buró semestral

```
Cada 6 meses se re-consulta Buró.

cs_provider_data:
  { data_type: 'buro_report', period_key: '2026-03-15', is_current: false }
  { data_type: 'buro_report', period_key: '2026-09-15', is_current: true }

Puedes comparar: ¿mejoró o empeoró el score en 6 meses?
```

---

## Queries frecuentes

```sql
-- Historia completa de facturación de ABC (solo versiones actuales)
SELECT period_key, record_count, 
       (data_payload->>'total_amount')::numeric as total
FROM cs_provider_data
WHERE company_id = 'abc-uuid'
  AND data_type = 'invoices_issued'
  AND is_current = true
ORDER BY period_key;

-- Últimos 12 meses de facturas
SELECT * FROM cs_provider_data
WHERE company_id = 'abc-uuid'
  AND data_type = 'invoices_issued'
  AND is_current = true
  AND period_key >= to_char(now() - interval '12 months', 'YYYY-MM')
ORDER BY period_key;

-- Evolución del score de Buró
SELECT period_key, extracted_at,
       (data_payload->>'score')::int as score
FROM cs_provider_data
WHERE company_id = 'abc-uuid'
  AND data_type = 'buro_score'
ORDER BY extracted_at;

-- Comparar declaración anual 2024 vs 2025
SELECT period_key, data_payload
FROM cs_provider_data
WHERE company_id = 'abc-uuid'
  AND data_type = 'tax_return_annual'
  AND period_key IN ('2024', '2025')
  AND is_current = true;

-- ¿Qué datos tiene ABC disponibles?
SELECT data_type, period_type,
       MIN(period_key) as desde,
       MAX(period_key) as hasta,
       COUNT(*) as periodos
FROM cs_provider_data
WHERE company_id = 'abc-uuid' AND is_current = true
GROUP BY data_type, period_type
ORDER BY data_type;

-- Datos que necesitan refresh (stale)
SELECT DISTINCT company_id, data_type, MAX(extracted_at) as last_extracted
FROM cs_provider_data
WHERE is_current = true
GROUP BY company_id, data_type
HAVING MAX(extracted_at) < now() - interval '30 days';
```

---

## Integración futura con ERPs

### Cómo funcionaría

```
1. Cliente configura conexión con su ERP (CONTPAQi, Aspel, SAP, etc.)
2. ERP envía webhook o se hace polling periódico
3. Facturas del ERP se guardan como:
   { provider: 'erp', data_type: 'erp_invoices', period_key: '2026-04' }
4. Se cruzan con datos del SAT:
   erp_invoices de abril vs invoices_issued de abril
5. Si hay discrepancia → alerta
6. El engine de sat_facturacion puede usar ambas fuentes
```

### ERPs comunes en México

| ERP | Tipo de empresa | API disponible |
|-----|----------------|---------------|
| CONTPAQi | PyMEs | SDK / archivos XML |
| Aspel | PyMEs | Exportación CSV/XML |
| SAP Business One | Medianas | API REST |
| Oracle NetSuite | Medianas-grandes | API REST |
| Alegra | Micro-PyMEs | API REST |
| Odoo | Variado | API REST |
| Bind ERP | PyMEs | API REST |
| Facturama | Facturación | API REST |

La integración con ERPs no es prioridad ahora, pero el diseño de cs_provider_data ya lo soporta: solo se agrega un nuevo provider y data_type.

---

## Separación de responsabilidades

```
cs_provider_data     → Datos CRUDOS por empresa/periodo (compartidos, históricos)
cs_engine_results    → Resultados de ANÁLISIS por expediente (específicos a cada solicitud)
cs_module_config     → Configuración de REGLAS por tenant (personalizables)
```

Los engines leen de cs_provider_data (datos crudos) y escriben en cs_engine_results (análisis). Así puedes re-correr un engine con datos nuevos sin perder el análisis anterior.
