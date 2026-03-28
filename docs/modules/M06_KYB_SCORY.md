# M06 — KYB: Know Your Business (Scory)

## Resumen
Verificación completa de identidad empresarial vía Scory. Valida que la empresa es real, que su información es consistente, y que no hay indicios de fraude o irregularidades. Incluye Agentic AI para investigación automática profunda.

## Estado: POR CONSTRUIR

## Provider: Scory
## Dependencias: I01 Data Layer (cs_companies)

---

## Qué verifica

### Identidad empresarial
| Verificación | Fuente | Resultado |
|-------------|--------|-----------|
| RFC válido y activo | SAT vía Scory | pass / fail |
| Razón social coincide | SAT vs declarado | pass / warning |
| Domicilio fiscal existe | Geolocalización + fotos | pass / warning / fail |
| Antigüedad real | Fecha de constitución | dato |
| Régimen fiscal correcto | SAT | pass / warning |
| Actividades económicas | SAT | dato |

### Accionistas y representantes
| Verificación | Fuente | Resultado |
|-------------|--------|-----------|
| Accionistas identificados | Scory + RPC | lista |
| Perfil económico de socios | Scory | pass / warning |
| Detección de prestanombres | Scory AI | pass / warning / fail |
| Representante legal válido | Scory | pass / fail |

### Consistencia
| Verificación | Fuente | Resultado |
|-------------|--------|-----------|
| Giro declarado vs instalaciones | Scory (fotos + AI) | pass / warning / fail |
| Tamaño declarado vs real | Empleados, facturación | pass / warning |
| Dirección vs operación real | Geolocalización | pass / warning |

---

## Agentic AI

El módulo KYB incluye un agente AI que:
1. Recibe los datos de Scory
2. Busca información adicional en fuentes públicas
3. Cruza datos para detectar inconsistencias
4. Genera un reporte de investigación
5. Clasifica el riesgo KYB: bajo / medio / alto / crítico

Ejemplo de hallazgo AI:
> "La empresa declara ser manufacturera pero su domicilio fiscal es un departamento residencial de 60m2. Las fotos de Scory muestran un edificio de oficinas sin área de producción. Riesgo: ALTO."

---

## Flujo en el expediente

```
M01 Onboarding → pre_filter_approved
         │
         ▼
M06 KYB se ejecuta automáticamente
         │
         ├── Scory checks (RFC, domicilio, accionistas, giro)
         ├── AI investiga inconsistencias
         ├── Genera reporte KYB
         │
         ▼
Resultado:
  pass → expediente avanza a M07 (Listas Negras)
  warning → expediente va a manual_review + alerta a analista
  fail → expediente rechazado automáticamente
```

---

## Eventos que emite

| Evento | Cuándo |
|--------|--------|
| kyb_started | Se inicia verificación |
| kyb_completed | Verificación terminada |
| kyb_passed | Resultado positivo |
| kyb_warning | Resultado con alertas |
| kyb_failed | Resultado negativo (rechazo) |

---

## Tablas futuras

```
cs_kyb_checks        — Checks realizados por empresa
cs_kyb_results       — Resultados consolidados
cs_kyb_ai_reports    — Reportes generados por AI
```
