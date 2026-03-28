# M03e — Data Source: Registro Público (vía Syntage)

## Resumen
Datos del Registro Público de Comercio extraídos vía Syntage API. Incluye estructura corporativa, accionistas, garantías registradas (RUG), e incidencias legales.

## Estado: CONSTRUIDO

## Provider: Syntage

---

## Datos que extrae

| Dato | Endpoint Syntage | Para qué sirve |
|------|-----------------|----------------|
| Entidades RPC | GET /entities/{id}/rpc-entities | Estructura corporativa, razón social, objeto social |
| Accionistas | GET /rpc-entities/{id}/shareholders | Socios, porcentajes, prestanombres |
| Garantías RUG | GET /entities/{id}/rug-guarantees | Garantías ya comprometidas con otros acreedores |

---

## Engine que habilita

| Engine | Peso base | Qué usa |
|--------|-----------|---------|
| operational | 9% | Estructura corporativa, RUG, incidencias legales, consistencia accionistas |

---

## Cruces que habilita

07 (Guarantee Coverage vs Risk)

---

## Archivos existentes

```
api/syntageRegistry.ts — Cliente para Registro Público (entidades, accionistas, RUG)
```
