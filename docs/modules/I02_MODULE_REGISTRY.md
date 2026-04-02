# I02 — Module Registry

## Resumen
Catálogo central de módulos disponibles y configuración por tenant. Define qué módulos están activos, con qué reglas, y con qué pesos de scoring. Es la pieza que permite que cada SOFOM tenga su propia configuración sin cambiar código.

## Estado: POR CONSTRUIR

## Tipo: Infraestructura (siempre activa)

---

## Tablas

### cs_modules (catálogo de módulos)

```sql
CREATE TABLE cs_modules (
  id TEXT PRIMARY KEY,              -- 'M01', 'M02', etc.
  name TEXT NOT NULL,               -- 'Onboarding Digital'
  group_code TEXT NOT NULL,         -- 'A', 'B', 'C', 'D', 'E', 'F', 'I'
  group_name TEXT NOT NULL,         -- 'Originacion de Credito'
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  status TEXT DEFAULT 'available',  -- 'available', 'beta', 'deprecated'
  dependencies TEXT[],              -- ['I01', 'M02']
  default_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### cs_tenant_modules (módulos activos por tenant)

```sql
CREATE TABLE cs_tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  module_id TEXT NOT NULL REFERENCES cs_modules(id),
  is_active BOOLEAN DEFAULT true,
  config_overrides JSONB DEFAULT '{}',  -- reglas custom del tenant
  activated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, module_id)
);
```

### cs_module_config (configuración detallada)

```sql
CREATE TABLE cs_module_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, module_id, config_key)
);
```

---

## Ejemplo de configuración

### Xending (todos los módulos activos)

```json
// cs_tenant_modules
{ "tenant_id": "xending", "module_id": "M01", "is_active": true }
{ "tenant_id": "xending", "module_id": "M02", "is_active": true }
{ "tenant_id": "xending", "module_id": "M03", "is_active": true }
// ... todos activos

// cs_module_config - pesos custom (opcional)
{ "tenant_id": "xending", "module_id": "M03", "config_key": "score_weights",
  "config_value": { "cashflow": 0.16, "sat_facturacion": 0.14, ... } }

// cs_module_config - reglas de pre-filtro
{ "tenant_id": "xending", "module_id": "M01", "config_key": "pre_filter_thresholds",
  "config_value": {
    {
      "credit": 100_000,
      "sales": 8_000_000
    },
    {
      "credit": 250_000,
      "sales": 15_000_000
    },
    {
      "credit": 500_000,
      "sales": 30_000_000
    }
  }
}
```

### Otra SOFOM (solo módulos básicos)

```json
// cs_tenant_modules
{ "tenant_id": "sofom_xyz", "module_id": "M01", "is_active": true }
{ "tenant_id": "sofom_xyz", "module_id": "M02", "is_active": true }
{ "tenant_id": "sofom_xyz", "module_id": "M03", "is_active": true }
{ "tenant_id": "sofom_xyz", "module_id": "M03a", "is_active": true }
{ "tenant_id": "sofom_xyz", "module_id": "M04", "is_active": true }
{ "tenant_id": "sofom_xyz", "module_id": "M06", "is_active": true }
// M03b (Buró) desactivado — no consultan Buró
// M07-M09 desactivados — no quieren PLD avanzado
// M10-M11 desactivados — no quieren portal público
```

---

## Cómo se usa en el código

```typescript
// El scoring orchestrator consulta qué engines están activos
const activeModules = await getActiveModules(tenantId);
const activeEngines = getEnginesForModules(activeModules);
const weights = calculateActiveWeights(activeEngines, tenantConfig);

// Solo corre engines activos
const results = await runEnginesParallel(
  filterRegistry(engineRegistry, activeEngines),
  input
);

// Score consolidado con pesos dinámicos
const score = calculateConsolidatedScore(results, weights);
```
