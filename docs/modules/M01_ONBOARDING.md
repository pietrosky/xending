# M01 — Onboarding Digital

## Resumen
Landing page pública donde empresas solicitan crédito en menos de 60 segundos. Sin login, sin documentos, sin fricción. Captura el lead, ejecuta pre-filtro comercial y hace routing automático.

## Estado: POR CONSTRUIR

## Dependencias
- I01 Data Layer (cs_companies, cs_expedientes)
- M02 Expediente Digital (crea expediente al hacer submit)

---

## Flujo funcional

```
Usuario llega a /onboarding (landing pública)
         │
         ▼
┌──────────────────────────────────────┐
│  Formulario (5 campos + 1 opcional)  │
│                                      │
│  1. Nombre de la empresa             │
│  2. RFC                              │
│  3. Giro o actividad (selector)      │
│  4. Ventas mensuales aprox (MXN)     │
│  5. Línea deseada (selector)         │
│  6. Email de contacto                │
│                                      │
│  Info: "Plazo hasta 45 días"         │
│  [ENVIAR SOLICITUD]                  │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│  Backend: submitOnboarding()         │
│                                      │
│  1. Buscar RFC en cs_companies       │
│     → existe: reutilizar             │
│     → no existe: crear empresa       │
│  2. Crear cs_expediente              │
│     stage: pre_filter                │
│  3. Ejecutar pre-filtro              │
│  4. Guardar resultado + métricas     │
│  5. Registrar evento en audit log    │
│  6. Routing según resultado          │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│  Resultado → Pantalla de respuesta   │
│                                      │
│  approved → "Cumples el perfil.      │
│    Te enviamos un correo para        │
│    continuar."                       │
│    → Email con link (token)          │
│    → Stage → pld_check               │
│                                      │
│  review → "Estamos revisando tu      │
│    solicitud. Te contactaremos."     │
│    → Notificar analista interno      │
│    → Stage → manual_review           │
│                                      │
│  rejected → "Por ahora no cumples    │
│    el perfil mínimo. Guardamos tus   │
│    datos para futuras opciones."     │
│    → Stage → rejected                │
│    → Lead guardado para remarketing  │
└──────────────────────────────────────┘
```

---

## Campos del formulario

### 1. Nombre de la empresa
- Tipo: texto libre
- Requerido: sí
- Validación: mínimo 3 caracteres

### 2. RFC
- Tipo: texto, uppercase automático
- Requerido: sí
- Validación: formato RFC persona moral (3 letras + 6 dígitos + 3 alfanuméricos) o persona física (4+6+3)
- Nota: se normaliza a mayúsculas, se quita espacios

### 3. Giro o actividad
- Tipo: selector (dropdown)
- Requerido: sí
- Opciones:
  - Comercio internacional (importación/exportación)
  - Manufactura
  - Servicios profesionales
  - Tecnología
  - Construcción
  - Agroindustria
  - Transporte y logística
  - Comercio al por mayor
  - Comercio al por menor
  - Alimentos y bebidas
  - Textil y confección
  - Químicos y farmacéuticos
  - Energía
  - Otro (especificar)
- Si elige "Otro": aparece campo de texto libre

### 4. Ventas mensuales aproximadas (MXN)
- Tipo: numérico con formato de moneda ($X,XXX,XXX)
- Requerido: sí
- Validación: mayor a 0
- Nota: NO ponemos mínimo en el UI. El pre-filtro clasifica. Así captamos el lead aunque no califique hoy.
- Placeholder: "$0"
- Formato en vivo: al escribir "8000000" se muestra "$8,000,000"

### 5. Línea de crédito deseada
- Tipo: selector (radio buttons o cards)
- Requerido: sí
- Opciones:
  - $100,000 USD
  - $250,000 USD
  - $500,000 USD
- Diseño: cards grandes con el monto prominente

### 6. Email de contacto
- Tipo: email
- Requerido: sí
- Validación: formato email válido

### Información mostrada (no campo)
- "Plazo: hasta 45 días"
- "Sin documentos en esta etapa"
- "Respuesta en menos de 1 minuto"

---

## Reglas del pre-filtro (onboarding simplificado)

| Línea solicitada | Ventas mensuales mínimas (MXN) |
|-----------------|-------------------------------|
| $100,000 USD | $8,000,000 MXN |
| $250,000 USD | $15,000,000 MXN |
| $500,000 USD | $30,000,000 MXN |

### Clasificación

```
coverage_ratio = ventas_mensuales_declaradas / ventas_minimas_requeridas

Si coverage_ratio >= 1.0  → approved
Si coverage_ratio >= 0.8  → review
Si coverage_ratio < 0.8   → rejected
```

### Datos que se guardan del pre-filtro
- resultado: approved / review / rejected
- regla aplicada (qué línea, qué mínimo)
- ventas declaradas
- ventas mínimas requeridas
- coverage_ratio
- razón del resultado

---

## Servicio backend: submitOnboarding()

```
Entrada:
  company_name: string
  rfc: string
  business_activity: string
  declared_monthly_sales_mxn: number
  requested_line_usd: 100000 | 250000 | 500000
  contact_email: string

Proceso:
  1. Validar campos mínimos
  2. Normalizar RFC (uppercase, trim)
  3. Buscar empresa por RFC en cs_companies
     → Si existe: reutilizar (actualizar nombre si cambió)
     → Si no: crear nueva empresa
  4. Crear expediente en cs_expedientes
     - company_id → empresa encontrada/creada
     - requested_amount = requested_line_usd
     - currency = 'USD'
     - declared_monthly_sales_mxn = ventas declaradas
     - stage = 'pre_filter'
     - source = 'digital_onboarding'
  5. Ejecutar pre-filtro simplificado
  6. Actualizar expediente con resultado
     - pre_filter_result
     - pre_filter_score (coverage_ratio * 100)
     - minimum_required_sales_mxn
     - coverage_ratio
  7. Registrar evento: 'pre_filter_passed' o 'pre_filter_rejected'
  8. Routing:
     - approved → stage = 'pld_check', generar token, enviar email
     - review → stage = 'manual_review', notificar analista
     - rejected → stage = 'rejected', guardar motivo

Salida:
  result: 'approved' | 'review' | 'rejected'
  message: string (mensaje para el usuario)
  expediente_folio: string (XND-2026-XXXXX)
  next_step: string (descripción de qué sigue)
```

---

## Mensajes al usuario

### Si approved
> Tu empresa cumple con el perfil inicial para una línea de $[monto] USD.
> Te enviamos un correo a [email] con los siguientes pasos.
> El proceso toma menos de 10 minutos.

### Si review
> Tu empresa está cerca del perfil requerido para esta línea.
> Nuestro equipo revisará tu solicitud y te contactará en las próximas 24 horas.
> Folio de seguimiento: [folio]

### Si rejected
> Por ahora tu empresa no cumple con el perfil mínimo para una línea de $[monto] USD.
> Guardamos tus datos y te contactaremos cuando tengamos opciones disponibles para tu perfil.
> Folio de seguimiento: [folio]

---

## UX / Diseño

- Mobile-first: debe sentirse como un formulario de 30-60 segundos
- Lenguaje simple, sin términos técnicos
- Barra de progreso sutil (1 paso, pero que se sienta rápido)
- Branding Xending (logo, colores del brand guide)
- Después del submit: pantalla de resultado con animación sutil
- NO pedir documentos, NO pedir login, NO pedir datos financieros detallados

---

## Tablas involucradas

- `cs_companies` (I01) — crear/reutilizar empresa
- `cs_expedientes` (M02) — crear expediente
- `cs_expediente_events` (M02) — registrar evento
- `cs_expediente_tokens` (M02) — generar token si approved
- `cs_business_rules` (M02) — leer reglas configurables

---

## Eventos que emite

| Evento | Cuándo | Quién escucha |
|--------|--------|---------------|
| `onboarding_submitted` | Al hacer submit | M02 (crear expediente) |
| `pre_filter_approved` | Si approved | M06 (iniciar KYB), Email service |
| `pre_filter_review` | Si review | Notificación a analista |
| `pre_filter_rejected` | Si rejected | CRM / remarketing |

---

## Ruta

- URL: `/onboarding`
- Acceso: público (sin autenticación)
- Layout: independiente del dashboard interno (sin sidebar, sin nav)
