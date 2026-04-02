# M12 — Gestor de Cartera (V2 — Diseño Completo)

## Resumen

Sistema de administración de cartera crediticia para SOFOMs en México. Gestiona el ciclo completo post-aprobación: líneas de crédito revolventes, disposiciones individuales, cálculo de intereses, seguimiento de pagos, clasificación de cartera, alertas de vencimiento, cobranza interna, renovación anual, y reportes regulatorios.

## Estado: DISEÑO COMPLETO — POR CONSTRUIR

## Dependencias: M05 Contratos, M17 Comité, I05 Scheduler, M16 Banking, M03 Scoring (re-scoring)

---

## 1. Modelo de Negocio Xending Capital (Fase 1)

### Contexto

Xending Capital es una SOFOM ENR que otorga financiamiento a importadores mexicanos para:
- Pago de contenedores de importación
- Adelanto de pago de facturas a proveedores internacionales
- Financiamiento de capital de trabajo vinculado a operaciones de comercio exterior

### Productos activos (Fase 1)

#### Producto 1: Financiamiento con Conversión Cambiaria (FX Financing)

```
Tipo:                 Línea revolvente
Moneda desembolso:    USD
Moneda pago:          MXN (a tipo de cambio pactado)
Tasa de interés:      0% (ganancia vía spread cambiario)
Plazo:                2-45 días
Amortización:         Bullet (pago total al vencimiento)
Monto máximo línea:   Hasta $500,000 USD
Comisiones:           Sin comisiones (estructura lista para futuro)
Moratorios:           5% mensual sobre monto vencido + IVA sobre intereses
Pagos parciales:      No permitidos
Contrato:             Por cada disposición + firma digital

Ejemplo:
  Cliente recibe: $100,000 USD
  TC pactado: $20.50 MXN/USD
  Plazo: 30 días
  Cliente paga en 30 días: $2,050,000 MXN
  Ganancia Xending: spread entre TC pactado y TC de mercado al momento del desembolso
```

#### Producto 2: Financiamiento Directo (Direct Lending)

```
Tipo:                 Línea revolvente
Moneda desembolso:    USD o MXN
Moneda pago:          Misma moneda del desembolso
Tasa de interés:      40% anual (ordinaria)
Plazo:                2-45 días
Amortización:         Bullet (pago total al vencimiento)
Monto máximo línea:   Hasta $500,000 USD (o equivalente MXN)
Comisiones:           Sin comisiones (estructura lista para futuro)
Moratorios:           5% mensual sobre monto vencido + IVA sobre intereses
Pagos parciales:      No permitidos
Contrato:             Por cada disposición + firma digital

Ejemplo:
  Cliente recibe: $100,000 USD
  Tasa: 40% anual → 40/365 × 30 = 3.2877% por 30 días
  Interés ordinario: $3,287.67 USD
  IVA sobre interés: $526.03 USD
  Total a pagar en 30 días: $103,813.70 USD
```

### Regla automática de determinación de tasa

```
SI moneda_desembolso ≠ moneda_pago:
  → Producto: FX Financing
  → Tasa: 0%
  → Se registra TC pactado
  → Ganancia = spread cambiario

SI moneda_desembolso = moneda_pago:
  → Producto: Direct Lending
  → Tasa: 40% anual (configurable por tenant)
  → Se calculan intereses ordinarios
```

### Tipos de línea de crédito

Existen dos tipos de línea según el nivel de análisis del cliente:

#### Línea Autorizada (con estudio de crédito)
```
- El cliente pasó por el proceso completo de scoring (M03) y comité (M17)
- Tiene línea aprobada con monto, plazo, y condiciones
- default_settlement_type configurable:
  * 'client_funded' → cliente fondea primero (default inicial, más seguro)
  * 'credit' → liberación automática sin autorización (cuando admin decide)
- Admin puede cambiar el default en cualquier momento
- Se monitorea vía covenants (M13) y revisión periódica (reviewFrequency)
- Renovación anual con re-scoring
```

#### Línea de Servicio (sin estudio de crédito)
```
- Cliente sin análisis formal de crédito
- Se le otorga servicio por relación comercial o confianza
- NO tiene expediente ni score
- default_settlement_type = 'client_funded' SIEMPRE por default
- NO se puede cambiar a 'credit' desde configuración (no tiene estudio)
- Si el cliente necesita crédito (anticipado):
  * El analista presiona botón "Solicitar crédito anticipado"
  * Se crea operación con settlement_type = 'credit' (override puntual)
  * Se dispara autorización por facultades (M17):
    - Hasta $100K USD → 3 de 5 socios
    - $100K-$350K USD → 4 de 5 socios
    - Más de $350K USD → 5 de 5 socios (unanimidad)
  * Es una excepción por operación, no cambia el default del cliente
```

### Operaciones intradía

Aplican las mismas reglas de producto, pero:
- Plazo: 1 día (mismo día)
- No requiere firma DocuSign (solo email de confirmación)
- Autorización depende del tipo de línea:
  - Línea Autorizada → NO requiere autorización de socios (ya fue evaluado)
  - Línea de Servicio → SÍ requiere autorización por facultades (M17)
- Se concilia pago el mismo día

---

## 2. Catálogo de Productos (Multi-tenant / Futuro)

El sistema soporta un catálogo configurable de productos por tenant. Cada producto define sus reglas de negocio. Xending arranca con 2 productos; otros tenants pueden configurar los suyos.

### Productos soportados (por prioridad de desarrollo)

| Prioridad | Producto | Tipo | Estado |
|-----------|----------|------|--------|
| FASE 1 | FX Financing | Revolvente bullet | A CONSTRUIR |
| FASE 1 | Direct Lending | Revolvente bullet | A CONSTRUIR |
| FASE 2 | Factoraje | Compra de CxC | FUTURO — diseño pendiente |
| FASE 2 | Crédito Simple Empresarial | Amortizable periódico | FUTURO — diseño pendiente |
| FASE 3 | Arrendamiento Financiero | Leasing | FUTURO — solo si cliente lo requiere |

### Nota sobre productos NO contemplados
- Crédito de nómina: No aplica (enfoque 100% empresarial)
- Microcrédito: No aplica
- Hipotecario: No aplica
- Estos podrían habilitarse si un tenant whitelabel lo requiere, pero no se diseñan activamente.

---

## 3. Modelo de Datos

### 3.1 cs_credit_products (Catálogo de productos por tenant)

```sql
cs_credit_products
  id uuid pk
  tenant_id text default 'xending'
  product_code text not null          -- 'fx_financing', 'direct_lending', 'factoring', 'simple_loan', 'leasing'
  product_name text not null          -- 'Financiamiento con Conversión Cambiaria'
  product_type text not null          -- 'revolving_bullet', 'revolving_amortizable', 'factoring', 'term_loan', 'leasing'
  description text
  -- Configuración de moneda
  disbursement_currencies text[]      -- ['USD'] o ['USD','MXN']
  payment_currencies text[]           -- ['MXN'] o ['USD','MXN']
  allows_cross_currency boolean       -- true = desembolso y pago pueden ser diferente moneda
  -- Configuración de tasa
  default_annual_rate numeric         -- 0 para FX, 40 para Direct
  rate_type text                      -- 'fixed', 'variable', 'zero_spread'
  rate_determination_rule text        -- 'auto_by_currency' | 'manual' | 'market_based'
  -- Costo de fondeo FX (default, override por operación)
  default_fx_daily_funding_cost numeric default 0.01  -- centavos/día default (ej: $0.01)
  -- Configuración de plazo
  min_term_days int                   -- 1 (intradía) o 2
  max_term_days int                   -- 45
  -- Configuración de amortización
  amortization_type text              -- 'bullet', 'french', 'german', 'interest_only'
  allows_partial_payments boolean     -- false para Xending Fase 1
  -- Moratorios
  moratory_rate_monthly numeric       -- 5 (5% mensual)
  moratory_has_iva boolean            -- true
  -- Comisiones (estructura lista, valores en 0 para Fase 1)
  opening_commission_pct numeric default 0
  annual_commission_pct numeric default 0
  disbursement_commission_pct numeric default 0
  -- Contrato
  requires_signature boolean          -- true para estándar, false para intradía
  contract_template_code text         -- referencia a M05
  -- Línea
  max_line_amount numeric             -- 500000
  max_line_currency text              -- 'USD'
  line_type text                      -- 'revolving', 'single'
  -- Estado
  is_active boolean default true
  phase text default 'fase_1'        -- 'fase_1', 'fase_2', 'fase_3' (para filtrar qué está disponible)
  created_at timestamptz default now()
  updated_at timestamptz default now()
  UNIQUE(tenant_id, product_code)
```

### 3.2 cs_credit_lines (Líneas de crédito aprobadas)

```sql
cs_credit_lines
  id uuid pk
  tenant_id text default 'xending'
  company_id uuid fk -> cs_companies
  product_id uuid fk -> cs_credit_products
  -- Tipo de línea
  line_category text not null          -- 'authorized' (con estudio) o 'service' (sin estudio)
  expediente_id uuid fk -> cs_expedientes  -- null si line_category = 'service'
  -- Montos
  approved_amount numeric not null     -- monto aprobado (ej: 500,000)
  currency text not null               -- 'USD'
  available_amount numeric not null    -- se recalcula: approved - sum(operaciones activas)
  -- Vigencia
  start_date date not null
  expiry_date date not null            -- vencimiento anual
  annual_renewal_date date             -- próxima renovación
  -- Tasa (heredada del producto, override posible)
  interest_rate_override numeric       -- null = usa la del producto
  -- Settlement default del cliente
  default_settlement_type text not null default 'client_funded'
    -- 'client_funded'  → Cliente fondea primero (default para TODOS los clientes nuevos)
    -- 'credit'         → Liberación automática sin autorización (solo si line_category = 'authorized')
    -- Líneas de servicio: SIEMPRE 'client_funded'. Para crédito puntual se usa botón override.
    -- Cambios se registran en audit log.
  -- Estado
  status text not null default 'active'
    -- 'pending_contract', 'active', 'suspended', 'expired',
    -- 'cancelled', 'in_renewal', 'defaulted'
  suspension_reason text               -- si status = suspended
  -- Condiciones especiales
  conditions jsonb                     -- covenants, restricciones adicionales
  -- Contrato de línea
  line_contract_id uuid fk -> cs_generated_documents
  -- Auditoría
  approved_by text                     -- usuario que aprobó
  approved_at timestamptz
  created_at timestamptz default now()
  updated_at timestamptz default now()
```

### 3.3 cs_credit_operations (Disposiciones individuales)

```sql
cs_credit_operations
  id uuid pk
  credit_line_id uuid fk -> cs_credit_lines
  product_id uuid fk -> cs_credit_products
  operation_number serial             -- consecutivo por línea (OP-001, OP-002...)
  -- Tipo
  operation_type text not null         -- 'standard' (2-45 días), 'intraday' (1 día)
  settlement_type text not null default 'client_funded'
    -- 'credit'         → Xending desembolsa primero, cliente paga después (usa línea)
    -- 'client_funded'  → Cliente fondea primero, Xending libera después (no usa línea)
  -- Montos
  amount numeric not null              -- monto desembolsado
  disbursement_currency text not null  -- 'USD'
  payment_currency text not null       -- 'MXN' o 'USD'
  -- FX (solo cuando disbursement_currency != payment_currency)
  is_fx_operation boolean not null default false
  fx_rate_agreed numeric               -- TC pactado (ej: 20.50)
  fx_rate_market numeric               -- TC mercado al momento del desembolso
  fx_payment_amount numeric            -- monto en moneda de pago (ej: 2,050,000 MXN)
  fx_spread_gain numeric               -- ganancia por spread (calculada al cierre)
  -- FX fondeo y settlement
  fx_daily_funding_cost numeric        -- costo diario de fondeo en TC (configurable por operación)
                                       -- Default viene del producto, promotor puede override al crear
  fx_rate_settlement numeric           -- TC de cierre real (ajustado si pago anticipado)
  fx_early_discount numeric            -- descuento por pago anticipado (daily_cost × días_no_usados)
  -- Tasa e intereses
  annual_rate numeric not null         -- 0 para FX, 40 para Direct (determinada automáticamente)
  rate_determination text              -- 'auto_cross_currency' | 'auto_same_currency' | 'manual_override'
  interest_amount numeric default 0    -- interés ordinario calculado
  iva_on_interest numeric default 0    -- IVA 16% sobre interés
  -- Moratorios (se calculan si overdue)
  moratory_rate_monthly numeric        -- 5% mensual (heredado del producto)
  moratory_amount numeric default 0    -- interés moratorio acumulado
  iva_on_moratory numeric default 0    -- IVA sobre moratorios
  moratory_days int default 0          -- días de mora
  -- Comisiones (0 en Fase 1, estructura lista)
  commission_amount numeric default 0
  commission_type text                 -- 'opening', 'disbursement', null
  -- Plazos
  disbursement_date date               -- fecha de desembolso
  maturity_date date                   -- fecha de vencimiento
  term_days int not null               -- 1-45
  -- Estado
  status text not null default 'pending_authorization'
    -- 'pending_authorization'    → esperando facultades (línea servicio a crédito)
    -- 'pending_signature'        → esperando firma DocuSign (estándar)
    -- 'pending_disbursement'     → firmado, esperando liberación de pago
    -- 'pending_client_funding'   → esperando que cliente fondee (client_funded)
    -- 'client_funded'            → cliente fondeó, pendiente ejecución
    -- 'executed'                 → operación ejecutada (client_funded completada)
    -- 'active'                   → desembolsado, corriendo plazo (crédito)
    -- 'paid'                     → pagado en tiempo
    -- 'paid_early'               → pago anticipado
    -- 'overdue'                  → vencido sin pago
    -- 'defaulted'                → en incumplimiento (>90 días mora)
    -- 'cancelled'                → cancelada antes de desembolso
    -- 'expired_unfunded'         → client_funded que no fondeó a tiempo
  -- Contrato y firma
  contract_id uuid fk -> cs_generated_documents
  authorization_id uuid fk -> cs_authorization_requests
  requires_signature boolean not null
  docusign_envelope_id text
  -- Pago
  paid_at timestamptz
  paid_amount numeric                  -- monto total pagado
  paid_currency text                   -- moneda del pago
  payment_reference text               -- referencia bancaria
  -- Client-funded (solo cuando settlement_type = 'client_funded')
  client_funded_at timestamptz         -- fecha/hora en que el cliente fondeó
  client_funded_amount numeric         -- monto fondeado por el cliente
  client_funded_reference text         -- referencia del depósito del cliente
  -- Total a pagar (calculado)
  total_payable numeric                -- principal + interés + IVA + moratorios
  -- Auditoría
  created_by text
  disbursed_by text
  created_at timestamptz default now()
  updated_at timestamptz default now()
```

### 3.4 cs_operation_alerts (Alertas de vencimiento programadas)

```sql
cs_operation_alerts
  id uuid pk
  operation_id uuid fk -> cs_credit_operations
  alert_type text not null             -- 'pre_maturity', 'maturity_day', 'overdue', 'overdue_escalation'
  alert_date date not null             -- fecha programada de la alerta
  days_before_maturity int             -- 5, 3, 1, 0, -1, -7, -30...
  status text default 'pending'        -- 'pending', 'sent', 'acknowledged', 'cancelled'
  sent_at timestamptz
  sent_to text[]                       -- emails destinatarios
  channel text default 'email'         -- 'email', 'sms', 'push', 'whatsapp'
  message_template text                -- template usado
  created_at timestamptz default now()
```

Reglas de alertas (función determinista, ya definida en arquitectura):

```
Plazo 1 día (intradía):     sin alertas pre-vencimiento
Plazo 2-7 días:             1 día antes
Plazo 8-14 días:            3 días antes + 1 día antes
Plazo 15-45 días:           5 días antes + 3 días antes + 1 día antes
Todos:                      día de vencimiento (maturity_day)
Si overdue:                 día 1, día 3, día 7, día 15, día 30, cada 30 días
```

### 3.5 cs_collection_contacts (Registro de gestiones de cobranza)

```sql
cs_collection_contacts
  id uuid pk
  operation_id uuid fk -> cs_credit_operations
  contact_date timestamptz not null
  contact_type text not null           -- 'email', 'phone', 'whatsapp', 'visit', 'legal_notice'
  contact_by text                      -- usuario que hizo el contacto
  contact_result text                  -- 'no_answer', 'promise_to_pay', 'partial_info', 'dispute', 'confirmed_payment'
  promise_date date                    -- si prometió pagar, cuándo
  promise_amount numeric               -- monto prometido
  notes text
  next_action text                     -- siguiente paso acordado
  next_action_date date
  created_at timestamptz default now()
```

### 3.6 cs_portfolio_classification (Calificación de cartera regulatoria)

```sql
cs_portfolio_classification
  id uuid pk
  tenant_id text default 'xending'
  snapshot_date date not null          -- fecha del corte
  -- Totales
  total_portfolio numeric              -- cartera total
  performing_portfolio numeric         -- cartera vigente
  non_performing_portfolio numeric     -- cartera vencida
  -- Índices
  imor numeric                         -- Índice de Morosidad (vencida / total)
  icor numeric                         -- Índice de Cobertura (reservas / vencida)
  -- Clasificación por grado de riesgo (estándar México)
  grade_a1_amount numeric default 0    -- 0 días mora, reserva 0-0.5%
  grade_a2_amount numeric default 0    -- 1-7 días, reserva 0.99%
  grade_b1_amount numeric default 0    -- 8-30 días, reserva 1-5%
  grade_b2_amount numeric default 0    -- 31-60 días, reserva 5-10%
  grade_b3_amount numeric default 0    -- 61-90 días, reserva 10-15%
  grade_c1_amount numeric default 0    -- 91-120 días, reserva 15-40%
  grade_c2_amount numeric default 0    -- 121-180 días, reserva 40-60%
  grade_d_amount numeric default 0     -- 181-365 días, reserva 60-90%
  grade_e_amount numeric default 0     -- >365 días, reserva 90-100%
  -- Reservas preventivas estimadas
  total_reserves numeric default 0
  -- Concentración
  concentration_by_client jsonb        -- top 10 clientes con % de cartera
  concentration_by_sector jsonb        -- por sector/giro
  concentration_by_currency jsonb      -- MXN vs USD
  concentration_by_product jsonb       -- por producto
  -- Métricas adicionales
  avg_term_days numeric                -- plazo promedio ponderado
  avg_rate numeric                     -- tasa promedio ponderada
  total_fx_operations int              -- operaciones FX activas
  total_direct_operations int          -- operaciones directas activas
  total_fx_gain numeric                -- ganancia cambiaria acumulada del periodo
  total_interest_earned numeric        -- intereses devengados del periodo
  -- Auditoría
  generated_by text default 'system'
  created_at timestamptz default now()
  UNIQUE(tenant_id, snapshot_date)
```

### 3.7 cs_portfolio_daily_position (Posición diaria para dashboard)

```sql
cs_portfolio_daily_position
  id uuid pk
  tenant_id text default 'xending'
  position_date date not null
  -- Resumen rápido
  active_lines int
  active_operations int
  total_approved numeric               -- suma de líneas aprobadas
  total_utilized numeric               -- suma de operaciones activas
  total_available numeric              -- total_approved - total_utilized
  utilization_pct numeric              -- total_utilized / total_approved
  -- Cartera
  performing numeric                   -- vigente
  non_performing numeric               -- vencida
  imor numeric
  -- Vencimientos próximos
  maturing_today numeric
  maturing_7_days numeric
  maturing_30_days numeric
  -- Moneda
  total_usd numeric
  total_mxn numeric
  created_at timestamptz default now()
  UNIQUE(tenant_id, position_date)
```

---

## 4. Flujos Operativos

### 4.1 Flujo: Nueva disposición estándar (2-45 días)

```
1. Analista selecciona línea activa del cliente
2. Ingresa datos de la operación:
   - Monto (ej: $100,000 USD)
   - Moneda de pago (MXN o USD)
   - Plazo (ej: 30 días)
   - Si MXN: TC pactado
3. Sistema determina automáticamente:
   - Producto (FX Financing o Direct Lending)
   - Tasa (0% o 40% anual)
   - Interés ordinario + IVA
   - Total a pagar
   - Fecha de vencimiento
4. Validaciones:
   - available_amount >= monto solicitado
   - Línea está activa y no vencida
   - Plazo dentro de rango permitido
5. Se crea operación: status = 'pending_signature'
6. M05 genera contrato con datos de la operación
7. DocuSign envía contrato al cliente
8. Cliente firma → status = 'pending_disbursement'
9. Admin confirma liberación de pago → status = 'active'
10. available_amount -= operation.amount
11. I05 programa alertas según getAlertDays(term_days)
12. Al vencimiento:
    - Si paga → status = 'paid', available_amount += amount
    - Si no paga → status = 'overdue', comienzan moratorios
```

### 4.2 Flujo: Operación intradía (mismo día)

El sistema determina automáticamente la ruta según el tipo de línea y el settlement_type default del cliente.

```
1. Analista selecciona cliente e ingresa datos:
   - Monto, moneda de pago, TC si FX
2. Sistema valida y calcula (producto, tasa, total)
3. Sistema lee default_settlement_type de la línea del cliente:

   ┌─────────────────────────────────────────────────────────────┐
   │  ¿Cuál es el settlement del cliente?                        │
   └──────────┬──────────────────┬───────────────────────────────┘
              │                  │
   CLIENT_FUNDED              CREDIT
   (default mayoría)     (solo authorized con permiso)
              │                  │
              ▼                  ▼
   RUTA A:                RUTA B:
   Fondeo previo          Liberación automática
   (cualquier línea)      (solo authorized + credit)

   + RUTA C (excepción puntual):
   Botón "Solicitar crédito anticipado"
   (solo service, dispara autorización socios)

RUTA A — Client-funded (default para todos los clientes nuevos):
  → Se pacta la operación primero: monto, TC, plazo — todo queda fijado
  → Se crea operación: status = 'pending_client_funding'
  → settlement_type = 'client_funded'
  → NO requiere autorización de socios
  → NO consume disponible de la línea
  → Se notifica al cliente: monto a depositar, cuenta destino, TC pactado
  → Cliente deposita fondos
  → Admin confirma recepción → status = 'client_funded'
  → Xending ejecuta (libera USD o transfiere) → status = 'executed'
  → Operación completada → status = 'completed'

RUTA B — Crédito con liberación automática (authorized + credit):
  → Solo disponible si line_category = 'authorized' Y default_settlement = 'credit'
  → Se crea operación: status = 'pending_disbursement'
   → se crea contrato y manda a firma, cliente firma y se procede a liberacion
  → settlement_type = 'credit'
  → NO requiere autorización (tiene estudio de crédito)
  → Consume disponible de la línea
  → Ir al paso 7

RUTA C — Solicitud de crédito anticipado (SIN ESTUDIO DE CRÉDITO — excepción, botón):
  → Solo para líneas de servicio (SIN estudio de crédito) cuando cliente necesita crédito puntual
  → El cliente NO tiene scoring ni aprobación de comité
  → Analista presiona botón "Solicitar crédito anticipado"
  → Se crea operación: status = 'pending_authorization'
  → settlement_type = 'credit' (override puntual, no cambia default)
  → M17 solicita autorización por facultades:
    - Hasta $100K USD → 3 de 5 socios
    - $100K-$350K → 4 de 5 socios
    - >$350K → 5 de 5 socios
  → Socios autorizan vía email/link
  → Cuando se alcanza quórum → status = 'pending_disbursement'
  → Consume disponible de la línea
  → Ir al paso 7

7. M05 genera contrato (sin DocuSign, solo email de confirmación)
8. Xending ejecuta la operación:
   - Ruta A: Se ejecuta conversión/transferencia → status = 'executed'
   - Ruta B/C: Admin libera pago → status = 'active'
9. Mismo día: se concilia pago/operación
   - Ruta A: operación completada → status = 'completed'
   - Ruta B/C: cliente paga → status = 'paid', liberar disponible
10. Registrar ganancia FX si aplica
```

### Configuración default del cliente

```
cs_credit_lines.default_settlement_type:
  'client_funded'  → Cliente fondea primero (default para TODOS los clientes nuevos)
  'credit'         → Liberación automática (solo si line_category = 'authorized')

Reglas de cambio:
  - Línea Authorized: admin puede cambiar entre 'client_funded' y 'credit'
  - Línea Service: SIEMPRE 'client_funded', no se puede cambiar a 'credit'
    (para crédito puntual se usa el botón "Solicitar crédito anticipado")
  - Cambios se registran en audit log

Ejemplo Plásticos Villagar:
  1. Inicio: line_category = 'authorized', default_settlement = 'client_funded'
     → Opera con fondeo previo (Ruta A)
  2. Futuro: admin cambia default a 'credit'
     → Opera con liberación automática (Ruta B)

Ejemplo cliente sin estudio:
  1. Siempre: line_category = 'service', default_settlement = 'client_funded'
     → Opera con fondeo previo (Ruta A)
  2. Excepción: necesita crédito → botón "Solicitar crédito anticipado"
     → Dispara autorización socios (Ruta C), no cambia el default
```

### Matriz de decisión simplificada

```
┌──────────────┬─────────────────┬──────────────┬──────────────┬──────────────┐
│ line_category│ settlement_type │ Autorización │ Usa línea    │ Riesgo       │
├──────────────┼─────────────────┼──────────────┼──────────────┼──────────────┤
│ authorized   │ client_funded   │ NO           │ NO           │ Cero         │
│ authorized   │ credit          │ NO           │ SÍ           │ Evaluado     │
│ service      │ client_funded   │ NO           │ NO           │ Cero         │
│ service      │ credit (botón)  │ SÍ (socios)  │ SÍ           │ SIN ESTUDIO  │
└──────────────┴─────────────────┴──────────────┴──────────────┴──────────────┘
```

### 4.3 Flujo: Pago recibido

```
1. Se registra pago (manual o vía M16 Banking conciliación)
2. Validar:
   - Monto pagado = total_payable (no parciales en Fase 1)

3. SI es operación FX (is_fx_operation = true):

   El TC pactado incluye un costo de fondeo diario (configurable por operación/promotor).
   Si el cliente paga antes del vencimiento, se descuentan los días no utilizados.

   Composición del TC pactado al crear la operación:
     fx_rate_agreed = fx_rate_market + (fx_daily_funding_cost × term_days)

   Al recibir pago:
     SI pago anticipado (días_reales < term_days):
       días_no_usados = term_days - días_reales
       fx_early_discount = fx_daily_funding_cost × días_no_usados
       fx_rate_settlement = fx_rate_agreed - fx_early_discount

     SI pago en tiempo o tardío:
       fx_rate_settlement = fx_rate_agreed (sin descuento)

     Opción admin: override manual del fx_rate_settlement
     (acuerdo especial, se registra motivo en audit log)

   Cálculos finales:
     fx_payment_amount_final = amount × fx_rate_settlement
     fx_spread_gain = amount × (fx_rate_settlement - fx_rate_market)

   Ejemplo (default $0.01/día, configurable por promotor):
     TC mercado: $20.00, costo fondeo: $0.01/día, plazo: 30 días
     TC pactado: $20.00 + ($0.01 × 30) = $20.30
     Monto: $100,000 USD → cliente debe: $2,030,000 MXN

     Pago 10 días antes:
       Descuento: $0.01 × 10 = $0.10
       TC cierre: $20.30 - $0.10 = $20.20
       Cliente paga: $2,020,000 MXN (ahorra $10,000 MXN)
       Ganancia Xending: $100K × ($20.20 - $20.00) = $20,000 MXN

     Nota: el costo de fondeo default es $0.01/día pero el promotor
     puede cambiarlo por operación (ej: $0.02, $0.03, etc.)

4. SI es operación Direct Lending (misma moneda):
   - Si pago anticipado: recalcular intereses al día real
     (documentado en flujo 4.6)
   - Si pago en tiempo: intereses originales

5. Actualizar operación:
   - paid_at = fecha del pago
   - paid_amount = monto recibido
   - paid_currency = moneda del pago
   - payment_reference = referencia bancaria
   - status = 'paid' o 'paid_early'
   - Si FX: fx_rate_settlement, fx_early_discount, fx_spread_gain

6. Liberar disponible: credit_line.available_amount += operation.amount
   (solo si settlement_type = 'credit')

7. Cancelar alertas pendientes de esta operación
```

### 4.4 Flujo: Operación vencida (overdue)

```
1. I05 Scheduler detecta: maturity_date < hoy AND status = 'active'
2. Cambiar status → 'overdue'
3. Calcular moratorios diarios:
   moratory_per_day = amount × (moratory_rate_monthly / 30)
   iva_moratory_per_day = moratory_per_day × 0.16
4. Programar alertas de cobranza escalonadas
5. Registrar en cs_collection_contacts (alerta automática)
6. Si overdue > 90 días → status = 'defaulted'
7. Actualizar clasificación de cartera
```

### 4.5 Flujo: Renovación anual de línea

```
1. I05 detecta: 30 días antes de expiry_date
2. Cambiar status línea → 'in_renewal'
3. Disparar re-scoring completo:
   - M03a: datos frescos del SAT vía Syntage
   - M03b: consulta fresca de Buró
   - M03: correr 16 engines + 20 cruces
   - M04: engines de decisión
4. Re-check PLD (M08)
5. Presentar caso a comité (M17):
   - Resumen de comportamiento de la línea:
     * Operaciones realizadas en el año
     * Pagos a tiempo vs overdue
     * Moratorios generados
     * Ganancia total (spread + intereses)
   - Score actualizado vs score original
   - Recomendación del sistema
6. Comité vota:
   - Aprobar → generar contrato renovación (M05), expiry_date += 1 año
   - Aprobar con condiciones → ajustar monto/tasa, generar contrato
   - Rechazar → status = 'expired', no más operaciones
7. Si hay operaciones activas al vencer la línea:
   - Las operaciones siguen su curso hasta su propio vencimiento
   - No se permiten nuevas disposiciones
```

### 4.6 Flujo: Pago anticipado

```
1. Cliente notifica que quiere pagar antes del vencimiento
2. Recalcular intereses al día real de pago:
   - Para Direct Lending: interés = amount × (annual_rate/365) × días_reales
   - Para FX Financing: no hay interés, solo el monto en MXN al TC pactado
3. Generar nuevo total_payable con intereses recalculados
4. Registrar pago con status = 'paid_early'
5. Liberar disponible en la línea
```

### 4.7 Flujo: Operación client-funded (cliente fondea primero)

```
1. Analista selecciona línea del cliente (marcado como client_funded)
2. Se pacta la operación PRIMERO:
   - Monto, moneda de pago, plazo, TC pactado (si FX)
   - Sistema determina producto, tasa, costo de fondeo, total
   - Todo queda fijado en este momento (el TC ya no cambia)
3. Se crea operación:
   - settlement_type = 'client_funded'
   - status = 'pending_client_funding'
   - fx_rate_agreed, fx_daily_funding_cost, fx_payment_amount ya calculados
4. Se notifica al cliente:
   - Monto a depositar (en moneda de pago)
   - Cuenta destino
   - TC pactado y plazo
5. Cliente deposita fondos
6. Admin confirma recepción de fondos:
   - client_funded_at = ahora
   - client_funded_amount = monto recibido
   - client_funded_reference = referencia del depósito
   - status = 'client_funded'
7. Xending ejecuta la operación (libera USD o transfiere)
   - status = 'executed'
8. Se registra como completada:
   - status = 'completed'
   - NO consume disponible de la línea
   - NO requiere autorización de socios
   - Se calcula fx_spread_gain si es FX
9. Si el cliente NO fondea en tiempo razonable (configurable):
   - status = 'expired_unfunded'
   - Se cancela la operación

Nota: La línea existe como respaldo. Si en algún momento se necesita
operar a crédito (contingencia), se usa el botón "Solicitar crédito
anticipado" y se aplican las reglas de autorización.
```

---

## 5. Funciones Deterministas

Todas las funciones son TypeScript puro, sin LLM, mismo input = mismo output.

### 5.1 Determinación de producto y tasa

```typescript
function determineProductAndRate(
  disbursementCurrency: 'USD' | 'MXN',
  paymentCurrency: 'USD' | 'MXN',
  productConfig: CreditProduct
): { productType: string; annualRate: number; isFxOperation: boolean } {
  const isFx = disbursementCurrency !== paymentCurrency;
  if (isFx) {
    return {
      productType: 'fx_financing',
      annualRate: 0,
      isFxOperation: true,
    };
  }
  return {
    productType: 'direct_lending',
    annualRate: productConfig.default_annual_rate, // 40%
    isFxOperation: false,
  };
}
```

### 5.2 Cálculo de intereses

```typescript
function calcOrdinaryInterest(amount: number, annualRate: number, days: number): number {
  // Interés simple: M × (tasa/365) × días
  return amount * (annualRate / 100 / 365) * days;
}

function calcIVAOnInterest(interestAmount: number): number {
  return interestAmount * 0.16; // IVA 16%
}

function calcMoratoryInterest(amount: number, monthlyRate: number, overdueDays: number): number {
  // Moratorio: M × (tasa_mensual/30) × días_mora
  return amount * (monthlyRate / 100 / 30) * overdueDays;
}

function calcTotalPayable(operation: CreditOperation): TotalPayable {
  const interest = calcOrdinaryInterest(operation.amount, operation.annual_rate, operation.term_days);
  const ivaInterest = calcIVAOnInterest(interest);
  const moratory = calcMoratoryInterest(operation.amount, operation.moratory_rate_monthly, operation.moratory_days);
  const ivaMoratory = calcIVAOnInterest(moratory);
  const commission = operation.commission_amount;

  return {
    principal: operation.amount,
    interest,
    iva_on_interest: ivaInterest,
    moratory,
    iva_on_moratory: ivaMoratory,
    commission,
    total: operation.amount + interest + ivaInterest + moratory + ivaMoratory + commission,
  };
}
```

### 5.3 Cálculo FX

```typescript
function calcFxPaymentAmount(amountUsd: number, fxRateAgreed: number): number {
  return amountUsd * fxRateAgreed;
}

function calcFxSpreadGain(amountUsd: number, fxRateAgreed: number, fxRateMarket: number): number {
  // Ganancia = monto × (TC pactado - TC mercado)
  // Positivo si TC pactado > TC mercado (Xending gana)
  return amountUsd * (fxRateAgreed - fxRateMarket);
}
```

### 5.4 Disponible de línea

```typescript
function calcAvailableAmount(
  approvedAmount: number,
  activeOperations: CreditOperation[]
): number {
  // client_funded operations do NOT consume available (no credit risk)
  // credit operations DO consume available
  const utilized = activeOperations
    .filter(op => op.settlement_type === 'credit')
    .filter(op => ['active', 'overdue', 'pending_disbursement', 'pending_signature', 'pending_authorization'].includes(op.status))
    .reduce((sum, op) => sum + op.amount, 0);
  return approvedAmount - utilized;
}
```

### 5.5 Determinación de autorización requerida

```typescript
type LineCategory = 'authorized' | 'service';
type SettlementType = 'credit' | 'client_funded';

interface AuthorizationRequirement {
  requires_authorization: boolean;
  required_approvals: number;  // 0, 3, 4, o 5
  reason: string;
}

function determineAuthorizationRequired(
  lineCategory: LineCategory,
  settlementType: SettlementType,
  amountUsd: number
): AuthorizationRequirement {
  // Línea autorizada (con estudio): no requiere autorización
  if (lineCategory === 'authorized') {
    return {
      requires_authorization: false,
      required_approvals: 0,
      reason: 'Línea autorizada con estudio de crédito',
    };
  }

  // Línea de servicio + client_funded: no requiere autorización
  if (settlementType === 'client_funded') {
    return {
      requires_authorization: false,
      required_approvals: 0,
      reason: 'Client-funded: cliente fondea primero, sin riesgo',
    };
  }

  // Línea de servicio + crédito (botón override): requiere autorización por monto
  let approvals: number;
  if (amountUsd <= 100_000) approvals = 3;
  else if (amountUsd <= 350_000) approvals = 4;
  else approvals = 5;

  return {
    requires_authorization: true,
    required_approvals: approvals,
    reason: `Línea de servicio — requiere ${approvals} de 5 socios para $${amountUsd.toLocaleString()} USD`,
  };
}
```

### 5.6 Alertas de vencimiento

```typescript
function getAlertDays(termDays: number): number[] {
  if (termDays <= 1) return [];                    // intradía: sin alertas
  if (termDays <= 7) return [1];                   // 2-7 días: 1 día antes
  if (termDays <= 14) return [3, 1];               // 8-14 días: 3 y 1 día antes
  return [5, 3, 1];                                // 15-45 días: 5, 3 y 1 día antes
}

function getOverdueAlertDays(): number[] {
  return [1, 3, 7, 15, 30];  // después de vencido: día 1, 3, 7, 15, 30
  // después del día 30: cada 30 días adicionales
}
```

### 5.7 Clasificación de cartera

```typescript
type RiskGrade = 'A1' | 'A2' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'D' | 'E';

function classifyOperation(overdueDays: number): RiskGrade {
  if (overdueDays <= 0) return 'A1';
  if (overdueDays <= 7) return 'A2';
  if (overdueDays <= 30) return 'B1';
  if (overdueDays <= 60) return 'B2';
  if (overdueDays <= 90) return 'B3';
  if (overdueDays <= 120) return 'C1';
  if (overdueDays <= 180) return 'C2';
  if (overdueDays <= 365) return 'D';
  return 'E';
}

const RESERVE_RATES: Record<RiskGrade, number> = {
  A1: 0.005,   // 0.5%
  A2: 0.0099,  // 0.99%
  B1: 0.05,    // 5%
  B2: 0.10,    // 10%
  B3: 0.15,    // 15%
  C1: 0.40,    // 40%
  C2: 0.60,    // 60%
  D:  0.90,    // 90%
  E:  1.00,    // 100%
};

function calcReserve(amount: number, grade: RiskGrade): number {
  return amount * RESERVE_RATES[grade];
}

function calcIMOR(nonPerforming: number, totalPortfolio: number): number {
  if (totalPortfolio <= 0) return 0;
  return nonPerforming / totalPortfolio;
}

function calcICOR(totalReserves: number, nonPerforming: number): number {
  if (nonPerforming <= 0) return 0;
  return totalReserves / nonPerforming;
}
```

### 5.8 Pago anticipado (recálculo de intereses)

```typescript
function recalcInterestForEarlyPayment(
  amount: number,
  annualRate: number,
  originalTermDays: number,
  actualDays: number
): { originalInterest: number; adjustedInterest: number; savings: number } {
  const originalInterest = calcOrdinaryInterest(amount, annualRate, originalTermDays);
  const adjustedInterest = calcOrdinaryInterest(amount, annualRate, actualDays);
  return {
    originalInterest,
    adjustedInterest,
    savings: originalInterest - adjustedInterest,
  };
}
```

---

## 6. Dashboard de Cartera

### 6.1 Vista principal (Portfolio Overview)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CARTERA TOTAL                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ $2.1M    │  │ $1.8M    │  │ $300K    │  │ 14.3%    │            │
│  │ Total    │  │ Vigente  │  │ Vencida  │  │ IMOR     │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 85%      │  │ $450K    │  │ 12       │  │ 8        │            │
│  │ ICOR     │  │ Reservas │  │ Líneas   │  │ Op.Activ │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
│                                                                      │
│  UTILIZACIÓN DE LÍNEAS          VENCIMIENTOS PRÓXIMOS                │
│  ┌─────────────────────┐       ┌─────────────────────┐              │
│  │ ████████░░░ 72%     │       │ Hoy:     $50K       │              │
│  │ Utilizado / Aprobado│       │ 7 días:  $200K      │              │
│  └─────────────────────┘       │ 30 días: $800K      │              │
│                                └─────────────────────┘              │
│                                                                      │
│  GANANCIA DEL PERIODO           CONCENTRACIÓN                        │
│  ┌─────────────────────┐       ┌─────────────────────┐              │
│  │ Spread FX:  $45K    │       │ Top 1: 25%          │              │
│  │ Intereses:  $32K    │       │ Top 3: 55%          │              │
│  │ Total:      $77K    │       │ Top 5: 78%          │              │
│  └─────────────────────┘       └─────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Vista por línea de crédito

```
┌─────────────────────────────────────────────────────────────────────┐
│  LÍNEA: Importadora ABC S.A. de C.V.                                │
│  RFC: IAB201015XYZ                                                   │
│                                                                      │
│  Aprobado: $500,000 USD    Disponible: $200,000 USD                 │
│  Utilizado: $300,000 USD   Utilización: 60%                         │
│  ████████████░░░░░░░░ 60%                                           │
│                                                                      │
│  Vigencia: 15/Mar/2026 - 15/Mar/2027   Renovación en: 45 días      │
│  Producto: FX Financing + Direct Lending                             │
│  Status: ACTIVA                                                      │
│                                                                      │
│  OPERACIONES ACTIVAS                                                 │
│  ┌────┬──────────┬────────┬──────┬────────────┬──────────┐          │
│  │ #  │ Monto    │ Tipo   │ Días │ Vencimiento│ Status   │          │
│  ├────┼──────────┼────────┼──────┼────────────┼──────────┤          │
│  │ 01 │ $100K USD│ FX     │ 30   │ 15/Abr     │ Activa   │          │
│  │ 02 │ $150K USD│ Direct │ 15   │ 02/Abr     │ Activa   │          │
│  │ 03 │ $50K USD │ FX     │ 45   │ 30/Abr     │ Activa   │          │
│  └────┴──────────┴────────┴──────┴────────────┴──────────┘          │
│                                                                      │
│  HISTORIAL (últimos 12 meses)                                        │
│  Operaciones: 24  |  A tiempo: 22  |  Overdue: 2  |  Default: 0    │
│  Ganancia total: $180K (spread: $120K + intereses: $60K)            │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Calendario de vencimientos

```
┌─────────────────────────────────────────────────────────────────────┐
│  CALENDARIO DE VENCIMIENTOS - Abril 2026                             │
│                                                                      │
│  Lu  Ma  Mi  Ju  Vi  Sa  Do                                         │
│           1   2   3   4   5                                          │
│               ●$150K                                                 │
│   6   7   8   9  10  11  12                                          │
│                                                                      │
│  13  14  15  16  17  18  19                                          │
│           ●$100K                                                     │
│                   ●$75K                                              │
│  20  21  22  23  24  25  26                                          │
│                                                                      │
│  27  28  29  30                                                      │
│               ●$50K                                                  │
│               ●$200K                                                 │
│                                                                      │
│  Total vencimientos abril: $575K USD                                 │
│  Flujo esperado de cobranza: $575K USD + $18K intereses              │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.4 Clasificación de cartera (vista regulatoria)

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLASIFICACIÓN DE CARTERA - Corte: 30/Mar/2026                      │
│                                                                      │
│  Grado │ Días mora │ Monto      │ % Cartera │ Reserva  │ % Reserva │
│  ──────┼───────────┼────────────┼───────────┼──────────┼───────────│
│  A-1   │ 0         │ $1,500,000 │ 71.4%     │ $7,500   │ 0.5%     │
│  A-2   │ 1-7       │ $200,000   │ 9.5%      │ $1,980   │ 0.99%    │
│  B-1   │ 8-30      │ $150,000   │ 7.1%      │ $7,500   │ 5%       │
│  B-2   │ 31-60     │ $100,000   │ 4.8%      │ $10,000  │ 10%      │
│  B-3   │ 61-90     │ $50,000    │ 2.4%      │ $7,500   │ 15%      │
│  C-1   │ 91-120    │ $50,000    │ 2.4%      │ $20,000  │ 40%      │
│  C-2   │ 121-180   │ $50,000    │ 2.4%      │ $30,000  │ 60%      │
│  D     │ 181-365   │ $0         │ 0%        │ $0       │ 90%      │
│  E     │ >365      │ $0         │ 0%        │ $0       │ 100%     │
│  ──────┼───────────┼────────────┼───────────┼──────────┼───────────│
│  TOTAL │           │ $2,100,000 │ 100%      │ $84,480  │           │
│                                                                      │
│  IMOR: 14.3%  │  ICOR: 28.2%  │  Reservas: $84,480                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Señales de Deterioro y Monitoreo

| Señal | Fuente | Acción automática |
|-------|--------|-------------------|
| Operación overdue | cs_credit_operations | Alerta crítica + iniciar moratorios |
| Operación >30 días mora | cs_credit_operations | Escalar a gerencia + suspender nuevas disposiciones |
| Operación >90 días mora | cs_credit_operations | Marcar como defaulted + notificar comité |
| Baja facturación >20% | M03a SAT (re-check trimestral) | Alerta al analista |
| Nuevos créditos en Buró | M03b (re-consulta) | Alerta de posible sobreendeudamiento |
| Opinión cumplimiento negativa SAT | M03a | Alerta crítica + revisión inmediata |
| Aparición en lista 69B | M08 PLD | Suspensión inmediata de línea |
| Incumplimiento covenant | M13 | Alerta + posible suspensión |
| Score deteriorado >10 pts | M03 re-scoring | Trigger de revisión extraordinaria (reviewFrequency engine) |
| Buró score cae >50 pts | M03b | Trigger de revisión extraordinaria |
| Línea próxima a vencer | I05 Scheduler | Iniciar proceso de renovación 30 días antes |

---

## 8. Integración con Módulos Existentes

### Módulos que alimentan al M12

| Módulo | Qué provee | Cuándo |
|--------|-----------|--------|
| M03 Scoring | Score para aprobación y renovación | Al aprobar línea y en renovación anual |
| M04 Decision | Recomendación de aprobación, monto, condiciones | Al aprobar línea |
| M05 Contratos | Contratos generados y firmados | Por cada operación |
| M17 Comité | Autorización de línea y operaciones intradía | Al aprobar y en intradía |
| M08 PLD | Alertas de compliance | Monitoreo continuo |
| M13 Covenants | Estado de cumplimiento de condiciones | Revisión periódica |
| M16 Banking | Conciliación de pagos | Al recibir pagos |
| I05 Scheduler | Alertas de vencimiento y renovación | Automático |

### Módulos que consumen del M12

| Módulo | Qué consume | Para qué |
|--------|-----------|----------|
| M03 Portfolio Engine | Posiciones activas, concentración | Evaluar impacto de nuevo crédito |
| M04 Credit Limit | Líneas existentes del cliente | No exceder capacidad |
| M13 Covenants | Comportamiento de pago | Evaluar cumplimiento |
| reviewFrequency Engine | Días de mora, pagos tardíos | Determinar frecuencia de revisión |
| Dashboard ejecutivo | Métricas de cartera | Reportes a socios |

---

## 9. Eventos que Emite el M12

| Evento | Cuándo | Consumido por |
|--------|--------|---------------|
| `line_created` | Se aprueba nueva línea | Dashboard, M13 |
| `line_renewed` | Se renueva línea anual | Dashboard, M13 |
| `line_suspended` | Se suspende línea | Dashboard, alertas |
| `line_expired` | Línea vence sin renovar | Dashboard |
| `operation_created` | Se crea nueva disposición | M05, M17 (si intradía) |
| `operation_signed` | Cliente firma contrato | Admin (liberar pago) |
| `operation_disbursed` | Se libera pago | Dashboard, línea (recalc disponible) |
| `operation_paid` | Se recibe pago total | Línea (liberar disponible), Dashboard |
| `operation_paid_early` | Pago anticipado | Línea, Dashboard |
| `operation_overdue` | Vence sin pago | Alertas, cobranza, Dashboard |
| `operation_defaulted` | >90 días mora | Comité, compliance, Dashboard |
| `operation_client_funded` | Cliente fondeó la operación | Admin (ejecutar operación) |
| `operation_executed` | Operación client-funded ejecutada | Dashboard, ganancia FX |
| `operation_expired_unfunded` | Client-funded no fondeó a tiempo | Dashboard, notificación |
| `moratory_calculated` | Se calculan moratorios diarios | Operación, Dashboard |
| `alert_sent` | Se envía alerta de vencimiento | Audit log |
| `collection_contact` | Se registra gestión de cobranza | Audit log |
| `portfolio_snapshot` | Foto mensual de cartera | Reportes |
| `renewal_triggered` | 30 días antes de vencimiento línea | M03, M08, M17 |

---

## 10. Reportes

### 10.1 Reportes operativos (diarios/semanales)

| Reporte | Contenido | Frecuencia |
|---------|-----------|------------|
| Posición diaria | Cartera vigente/vencida, disponible, vencimientos del día | Diario |
| Vencimientos próximos | Operaciones que vencen en 7/15/30 días | Diario |
| Operaciones overdue | Lista de operaciones vencidas con días de mora y moratorios | Diario |
| Gestiones de cobranza | Contactos realizados, promesas de pago, resultados | Semanal |

### 10.2 Reportes gerenciales (mensuales)

| Reporte | Contenido | Frecuencia |
|---------|-----------|------------|
| Clasificación de cartera | Grados A1-E, reservas, IMOR, ICOR | Mensual |
| Concentración de riesgo | Por cliente, sector, moneda, producto | Mensual |
| Rentabilidad | Ganancia FX + intereses - moratorios no cobrados | Mensual |
| Comportamiento de pago | % a tiempo, % anticipado, % overdue, tendencia | Mensual |
| Utilización de líneas | Aprobado vs utilizado por cliente | Mensual |

### 10.3 Reportes regulatorios (buena práctica para SOFOM ENR)

| Reporte | Contenido | Frecuencia |
|---------|-----------|------------|
| R04 equivalente | Cartera por calificación (aunque ENR no está obligada) | Trimestral |
| Concentración >10% | Clientes con >10% de la cartera total | Trimestral |
| Operaciones partes relacionadas | Si aplica | Trimestral |
| Reporte a Buró de Crédito | Comportamiento de pago de clientes | Mensual |

---

## 11. Productos Futuros (Fase 2 y 3 — Solo Anotados)

### FASE 2: Factoraje (diseño pendiente)

```
Concepto: Xending compra cuentas por cobrar del cliente a descuento
Flujo básico:
  1. Cliente presenta facturas PPD emitidas a sus clientes
  2. Xending valida facturas contra SAT (vía Syntage)
  3. Se aplica aforo (ej: 90% del valor nominal)
  4. Se descuenta tasa de descuento por plazo estimado de cobro
  5. Xending desembolsa monto aforado - descuento
  6. Cuando el deudor paga la factura → Xending cobra
  7. Si no paga → recurso contra el cliente (factoraje con recurso)

Tablas adicionales necesarias:
  cs_factoring_operations    — operaciones de factoraje
  cs_factoring_invoices      — facturas cedidas
  cs_factoring_collections   — cobros a deudores

Nota: Se puede cruzar con M11 Cobranza Inteligente (datos SAT)
```

### FASE 2: Crédito Simple Empresarial (diseño pendiente)

```
Concepto: Préstamo a plazo fijo con amortización periódica
Flujo básico:
  1. Se aprueba crédito por monto y plazo (6-36 meses típico)
  2. Se genera tabla de amortización (francés o alemán)
  3. Pagos mensuales de capital + interés
  4. Si no paga cuota → mora sobre cuota vencida

Tablas adicionales necesarias:
  cs_amortization_schedules  — tabla de amortización por operación
  cs_amortization_payments   — pagos por cuota

Métodos de amortización a soportar:
  - Francés (cuota fija)
  - Alemán (amortización constante)
  - Bullet (solo intereses, capital al final) — ya soportado en Fase 1
  - Interest-only (solo intereses periódicos, capital al final)
```

### FASE 3: Arrendamiento Financiero (solo si cliente lo requiere)

```
Concepto: Financiamiento de activos (maquinaria, equipo, vehículos)
Solo se desarrollará si un tenant whitelabel lo solicita.
Requiere: valor residual, depreciación, opción de compra.
```

### NO CONTEMPLADOS (solo si un tenant lo pide explícitamente)
- Crédito de nómina
- Microcrédito
- Hipotecario
- Crédito al consumo

---

## 12. Consideraciones Técnicas

### 12.1 Recálculo de disponible

El `available_amount` de una línea se recalcula en tiempo real:
```
available = approved_amount - SUM(amount) WHERE
  settlement_type = 'credit' AND
  status IN (
    'pending_authorization', 'pending_signature',
    'pending_disbursement', 'active', 'overdue'
  )
```
Las operaciones `paid`, `paid_early`, `cancelled`, `defaulted` NO consumen disponible.
Las operaciones `client_funded` NUNCA consumen disponible (no hay riesgo crediticio).
Nota: `defaulted` libera disponible pero la línea probablemente estará suspendida.

### 12.2 Moratorios diarios

Un job de I05 Scheduler corre diariamente y para cada operación `overdue`:
```
moratory_days = today - maturity_date
moratory_amount = amount × (moratory_rate_monthly / 100 / 30) × moratory_days
iva_on_moratory = moratory_amount × 0.16
total_payable = amount + interest + iva_interest + moratory + iva_moratory
```

### 12.3 Snapshots mensuales

El primer día de cada mes, un job genera `cs_portfolio_classification` con:
- Foto de toda la cartera al cierre del mes anterior
- Clasificación A1-E de cada operación
- Cálculo de reservas preventivas
- Métricas de concentración
- IMOR e ICOR

### 12.4 Multi-tenant

Todas las tablas tienen `tenant_id`. El catálogo de productos es por tenant.
Cada SOFOM puede tener sus propios productos, tasas, moratorios, y reglas.

### 12.5 Auditoría

Cada cambio de status en líneas y operaciones genera un evento en `cs_expediente_events` (o tabla equivalente de audit log). Incluye: quién, cuándo, de qué status a qué status, y metadata relevante.

---

## 13. Plan de Implementación Sugerido

### Paso 1: Migración SQL
- Crear tablas: cs_credit_products, cs_credit_lines, cs_credit_operations, cs_operation_alerts, cs_collection_contacts, cs_portfolio_classification, cs_portfolio_daily_position
- Seed de productos Xending (fx_financing + direct_lending)
- RLS policies

### Paso 2: Funciones deterministas (TypeScript puro)
- portfolioCalc.ts: todas las funciones de cálculo (intereses, moratorios, FX, clasificación, disponible, alertas)
- Tests unitarios para cada función

### Paso 3: Servicios
- portfolioService.ts: CRUD de líneas y operaciones, integración con M05/M17
- alertService.ts: programación y envío de alertas
- snapshotService.ts: generación de snapshots mensuales

### Paso 4: UI
- PortfolioPage (dashboard principal)
- CreditLinePage (detalle de línea)
- OperationPage (detalle de operación)
- NewOperationForm (crear disposición)
- CalendarView (vencimientos)
- ClassificationView (cartera regulatoria)

### Paso 5: Integración
- Conectar con M05 (contratos), M17 (facultades), I05 (scheduler)
- Conectar con reviewFrequency engine (triggers de deterioro)
- Conectar con portfolio engine (posiciones para scoring)
