# I04 — Tenant Management

## Resumen
Gestión multi-tenant / whitelabel. Cada institución financiera cliente es un tenant con su propia configuración, branding, reglas de negocio, y módulos activos. El código es el mismo; lo que cambia es la configuración.

## Estado: POR CONSTRUIR

## Tipo: Infraestructura (siempre activa)

---

## Modelos de deployment

### Modelo A: Multi-tenant (un servidor, múltiples clientes)
- Todas las tablas tienen `tenant_id`
- RLS (Row Level Security) filtra por tenant
- Más barato, más complejo
- Para clientes pequeños o en trial

### Modelo B: Single-tenant (un servidor por cliente)
- Deployment dedicado por cliente
- Aislamiento total de datos
- Más caro, más simple, más seguro
- Para SOFOMs grandes

### Preparación actual
- Campo `tenant_id` en tablas clave (default 'xending')
- El código no asume single-tenant
- La decisión de modelo se toma por cliente

---

## Tabla

```sql
CREATE TABLE cs_tenants (
  id TEXT PRIMARY KEY,               -- 'xending', 'sofom_xyz'
  name TEXT NOT NULL,                -- 'Xending Capital'
  legal_name TEXT,                   -- razón social
  branding JSONB DEFAULT '{}',       -- logo, colores, fuentes
  config JSONB DEFAULT '{}',         -- configuración general
  status TEXT DEFAULT 'active',      -- 'active', 'suspended', 'trial'
  plan TEXT DEFAULT 'enterprise',    -- 'trial', 'basic', 'pro', 'enterprise'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Branding configurable

```json
{
  "logo_url": "https://...",
  "primary_color": "#1a365d",
  "secondary_color": "#2b6cb0",
  "company_name": "Xending Capital",
  "tagline": "Crédito empresarial inteligente",
  "email_from": "credito@xending.com",
  "support_email": "soporte@xending.com"
}
```

---

## Configuración por tenant

```json
{
  "default_currency": "USD",
  "min_credit_amount": 100000,
  "max_credit_amount": 1000000,
  "max_term_days": 45,
  "syntage_api_key": "...",
  "scory_api_key": "...",
  "email_provider": "sendgrid",
  "timezone": "America/Mexico_City",
  "language": "es-MX"
}
```

Cada tenant tiene sus propias API keys de Syntage y Scory. Esto permite que cada institución tenga su propia cuenta con los providers.
