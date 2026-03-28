# M05 — Contratos y Documentos

## Resumen
Generación automática de contratos, cartas, formatos y documentos legales basados en los resultados del análisis crediticio. Incluye templates configurables, firma digital futura, y versionado de documentos.

## Estado: PLACEHOLDER (estructura lista, sin implementar)

## Dependencias: M04 Decision Engines (resultado de decisión, monto, condiciones)

---

## Concepto

Cuando un crédito es aprobado (M04), este módulo genera automáticamente:
- Contrato de crédito (con monto, plazo, tasa, covenants)
- Carta de aprobación
- Pagaré
- Formato de garantías
- Checklist de formalización

Los templates son configurables por tenant. Cada documento se genera con los datos del expediente y los resultados del scoring.

---

## Flujo

```
M04 Decision → approved
         │
         ▼
M05 genera documentos automáticamente
         │
         ├── Contrato de crédito (PDF)
         ├── Carta de aprobación (PDF)
         ├── Pagaré (PDF)
         ├── Formato de garantías (PDF)
         └── Checklist de formalización
         │
         ▼
Documentos disponibles en portal del solicitante
Firma digital (futuro)
```

---

## Tablas futuras

```
cs_document_templates    — Templates de documentos por tenant
cs_generated_documents   — Documentos generados por expediente
cs_document_signatures   — Firmas digitales (futuro)
```

---

## AI en este módulo

- AI genera borradores de contratos basados en templates + datos
- AI revisa consistencia entre contrato y condiciones aprobadas
- AI sugiere cláusulas adicionales basadas en el perfil de riesgo
