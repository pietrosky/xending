# M07 — Listas Negras y Sanciones

## Resumen
Verificación contra todas las listas negras, sanciones y bases de datos de riesgo disponibles. Cubre listas nacionales (SAT, CNBV, FGJ) e internacionales (OFAC, Interpol, Panama Papers). Es un gate: si la empresa o sus accionistas aparecen en listas críticas, se rechaza automáticamente.

## Estado: POR CONSTRUIR

## Providers: Scory + Syntage Hawk Checks
## Dependencias: M06 KYB (datos de empresa y accionistas)

---

## Listas verificadas

### Listas nacionales (México)

| Lista | Fuente | Impacto si aparece |
|-------|--------|-------------------|
| 69B — Factureras SAT | SAT / Scory / Syntage | Rechazo automático |
| SYGER — Gestión de Riesgos SAT | SAT / Scory | Alerta alta |
| Créditos fiscales SAT | Syntage Hawk | Alerta |
| CNBV sanciones | Syntage Hawk | Rechazo automático |
| FGJ / FGR investigaciones | Syntage Hawk | Rechazo automático |
| Servidores públicos sancionados (SFP) | Syntage Hawk | Alerta |
| PROFECO quejas | Syntage Hawk | Info |
| Quiebras / Concursos mercantiles | Syntage Hawk | Rechazo automático |
| Actividades vulnerables (LFPIORPI) | Syntage Hawk | Alerta alta |
| FOBAPROA | Syntage Hawk | Info |

### Listas internacionales

| Lista | Fuente | Impacto si aparece |
|-------|--------|-------------------|
| OFAC — Sanciones EE.UU. | Scory | Rechazo automático |
| Interpol | Syntage Hawk | Rechazo automático |
| PEPs — Personas Políticamente Expuestas | Scory | Revisión obligatoria |
| Panama Papers | Syntage Hawk | Alerta alta |
| Paradise Papers | Syntage Hawk | Alerta alta |
| Offshore Leaks | Syntage Hawk | Alerta alta |
| Bahama Papers | Syntage Hawk | Alerta alta |
| Banco Mundial sanciones | Syntage Hawk | Rechazo automático |
| FCPA — Foreign Corrupt Practices Act | Syntage Hawk | Alerta alta |

---

## Quién se verifica

No solo la empresa, también:
- Accionistas principales (>10% participación)
- Representante legal
- Apoderados
- Empresas relacionadas (grupo empresarial)

---

## Flujo en el expediente

```
M06 KYB → kyb_passed
         │
         ▼
M07 Listas Negras se ejecuta
         │
         ├── Scory: 69B, OFAC, PEPs, SYGER, RUG
         ├── Syntage Hawk: 30+ fuentes
         ├── Verifica empresa + accionistas + representante
         │
         ▼
Resultado:
  clear → expediente avanza a buro_authorization
  alert → expediente va a manual_review + alerta a compliance officer
  blocked → expediente rechazado automáticamente
```

---

## Eventos que emite

| Evento | Cuándo |
|--------|--------|
| blacklist_check_started | Se inicia verificación |
| blacklist_clear | No aparece en ninguna lista |
| blacklist_alert | Aparece en lista no-crítica (PEPs, SYGER) |
| blacklist_blocked | Aparece en lista crítica (69B, OFAC, Interpol) |

---

## Tablas futuras

```
cs_blacklist_checks     — Checks realizados (empresa + personas)
cs_blacklist_hits       — Coincidencias encontradas
cs_blacklist_decisions  — Decisiones tomadas (aprobar/rechazar/escalar)
```
