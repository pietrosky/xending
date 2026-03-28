# M03d — Data Source: Compliance (Scory + Syntage Hawk)

## Resumen
Datos de PLD/KYC vía Scory y verificaciones legales/sanciones vía Syntage Hawk Checks. Es un gate obligatorio: si falla, la solicitud se rechaza automáticamente sin gastar en otros análisis.

## Estado: CONSTRUIDO (parcial)

## Providers: Scory (PLD/KYC), Syntage (Hawk Checks)

---

## Datos de Scory

| Check | Qué valida | Resultado si falla |
|-------|-----------|-------------------|
| Listas Negras México | Personas/empresas sancionadas | Rechazo automático |
| OFAC | Sanciones de EE.UU. | Rechazo automático |
| PEPs | Personas Políticamente Expuestas | Revisión adicional |
| SYGER | Sistema de Gestión de Riesgos SAT | Alerta |
| RUG | Registro Único de Garantías | Info (garantías comprometidas) |
| 69B | Factureras del SAT | Rechazo automático |
| Validación domicilio | Fotos, geolocalización | Alerta si inconsistente |
| Validación accionistas | Perfil económico de socios | Alerta si prestanombres |
| Consistencia giro | Giro declarado vs instalaciones | Alerta si inconsistente |

## Datos de Syntage Hawk Checks

| Fuente | Qué busca |
|--------|-----------|
| Juicios civiles/penales/amparo | Demandas activas |
| Servidores públicos sancionados (SFP) | Sanciones gubernamentales |
| Fiscal créditos SAT | Adeudos fiscales |
| Actividades vulnerables | Lavado de dinero |
| FGJ / FGR | Investigaciones penales |
| Interpol | Búsqueda internacional |
| PROFECO | Quejas de consumidores |
| CNBV sanciones | Sanciones financieras |
| Panama/Paradise/Offshore Papers | Estructuras offshore |
| Quiebras/Concursos Mercantiles | Insolvencia |
| 30+ fuentes adicionales | Cobertura completa |

---

## Engines que habilita

| Engine | Tipo | Qué hace |
|--------|------|----------|
| compliance | Gate | Si falla = rechazo automático. No contribuye al score ponderado |
| graph_fraud | Gate | Facturación circular, empresas fachada, contrapartes en lista negra |

---

## Archivos existentes

```
api/scoryClient.ts     — Cliente Scory (PLD/KYC checks)
api/syntageChecks.ts   — Cliente Syntage Hawk Checks
engines/compliance.ts  — Engine gate de compliance
engines/graphFraud.ts  — Engine de detección de fraude
```
