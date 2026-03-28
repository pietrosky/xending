# I01 — Data Layer Compartido

## Resumen
Capa de datos compartida por todos los módulos. Contiene la entidad maestra de empresa (cs_companies) y los datos extraídos de providers externos (cs_provider_data). Cualquier módulo puede leer datos de aquí sin duplicar llamadas a APIs.

## Estado: POR CONSTRUIR

## Tipo: Infraestructura (siempre activa)

---

## Principio fundamental

Los datos de una empresa son de la empresa, no del expediente ni del módulo. Si la empresa ABC ya tiene facturas extraídas de Syntage, esos datos están disponibles para:
- M03 Scoring (análisis crediticio)
- M10 Portal Empresa (dashboard de salud)
- M11 Cobranza (cuentas por cobrar)
- M14 Agente (consultas AI)
- Cualquier otro módulo que los necesite

---

## Tablas

### cs_companies (entidad maestra)

```sql
CREATE TABLE cs_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'xending',
  rfc TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT,                    -- nombre comercial
  business_activity TEXT,             -- giro o actividad
  tax_regime TEXT,                    -- régimen fiscal (se llena de SAT)
  incorporation_date DATE,            -- fecha de constitución
  address JSONB,                      -- domicilio fiscal
  syntage_entity_id TEXT,             -- ID en Syntage (si existe)
  scory_entity_id TEXT,               -- ID en Scory (si existe)
  status TEXT DEFAULT 'active',       -- active, inactive, blacklisted
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, rfc)
);
```

Un RFC es único por tenant. La misma empresa puede existir en múltiples tenants (cada SOFOM tiene su propia relación con la empresa).

### cs_company_contacts

```sql
CREATE TABLE cs_company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cs_companies(id),
  contact_type TEXT NOT NULL,         -- 'email', 'phone', 'legal_rep'
  contact_value TEXT NOT NULL,
  contact_name TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### cs_provider_data (datos externos compartidos)

```sql
CREATE TABLE cs_provider_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES cs_companies(id),
  provider TEXT NOT NULL,             -- 'syntage', 'scory', 'manual'
  data_type TEXT NOT NULL,            -- 'invoices', 'tax_returns', 'buro_report',
                                      -- 'tax_status', 'compliance_opinion',
                                      -- 'pld_check', 'hawk_checks', 'insights',
                                      -- 'accounting', 'financial_statements'
  data_payload JSONB NOT NULL,        -- datos crudos
  extraction_id TEXT,                 -- ID de extracción en Syntage
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,            -- cuándo hay que refrescar
  status TEXT DEFAULT 'fresh',        -- 'fresh', 'stale', 'refreshing', 'error'
  triggered_by TEXT,                  -- qué módulo/expediente lo pidió
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Lógica de frescura

Cada tipo de dato tiene una vigencia:

| Tipo de dato | Vigencia | Razón |
|-------------|----------|-------|
| invoices | 24 horas | Facturas se emiten diario |
| tax_returns | 30 días | Declaraciones son mensuales |
| tax_status | 7 días | Cambios poco frecuentes |
| compliance_opinion | 7 días | Puede cambiar |
| buro_report | 30 días | Consultas tienen costo |
| pld_check | Según M08 config | Configurable |
| hawk_checks | 7 días | Listas se actualizan frecuentemente |
| insights | 24 horas | Depende de facturas |
| financial_statements | 90 días | Trimestrales |

Si un módulo pide datos y están "stale" (vencidos), se dispara un refresh automático.

---

## Separación de responsabilidades

```
cs_provider_data     → Datos CRUDOS de la empresa (compartidos)
cs_engine_results    → Resultados de ANÁLISIS por expediente (específicos)
cs_module_config     → Configuración de REGLAS por tenant (personalizables)
```
