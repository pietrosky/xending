# Implementation Plan: Expediente Digital (M02)

## Overview

Implementación incremental del ciclo de vida completo de solicitudes de crédito para Xending Capital SOFOM ENR. El plan migra los servicios existentes (en memoria) a Supabase, crea servicios nuevos (PLD, decisión), integra el scoring delegado a Scory API, construye el portal del solicitante y extiende el dashboard administrativo. Cada tarea construye sobre la anterior y termina con integración end-to-end.

## Tasks

- [ ] 1. Migraciones de base de datos y configuración de Supabase
  - [ ] 1.1 Crear migración SQL 031+ para campos faltantes en cs_expedientes
    - Agregar columnas: company_id, declared_monthly_sales_mxn, business_activity, pre_filter_result, minimum_required_sales_mxn, coverage_ratio, source, tenant_id
    - Crear constraint de unicidad `idx_expediente_dedup` sobre (rfc, requested_amount, date_trunc('day', created_at)) WHERE stage NOT IN ('rejected', 'expired')
    - Crear RLS policies para cs_expedientes, cs_expediente_events y cs_expediente_tokens
    - Agregar policy INSERT-only en cs_expediente_events (sin UPDATE/DELETE)
    - _Requirements: 14.1, 14.3, 14.5, 9.3_

  - [ ] 1.2 Crear tabla cs_business_rules con seed de valores por defecto
    - Crear tabla con columnas: id, rule_key (UK), rule_value (JSONB), description, updated_by, updated_at
    - Insertar seed con todos los umbrales de DEFAULT_BUSINESS_RULES: min_amount_usd, max_amount_usd, min_revenue_multiplier, min_business_age_years, accepted_purposes, min_term_days, max_term_days, min_buro_score, token_expiry_hours, reminder_after_hours, approval_threshold (75), rejection_threshold (50)
    - _Requirements: 17.1, 17.3_

  - [ ] 1.3 Crear servicio `businessRulesService.ts` para lectura runtime de reglas
    - Implementar `getBusinessRules(): Promise<BusinessRules>` que lee de cs_business_rules vía Supabase
    - Fallback a DEFAULT_BUSINESS_RULES cuando un rule_key no existe en la tabla
    - Sin caché en memoria (cada evaluación lee de BD para reflejar cambios sin reinicio)
    - _Requirements: 17.1, 17.2, 17.3_

  - [ ]* 1.4 Write property tests for business rules configurability
    - **Property 24: Business rules runtime configurability**
    - **Property 25: Business rules defaults fallback**
    - **Validates: Requirements 17.2, 17.3**

- [ ] 2. Migrar servicios core a Supabase y pre-filtro
  - [ ] 2.1 Migrar `expedienteService.ts` de Map en memoria a Supabase
    - Reemplazar `expedientesStore` y `eventsStore` por queries a cs_expedientes y cs_expediente_events
    - Implementar `createExpediente` con verificación de duplicados (RFC + monto + fecha) para idempotencia
    - Hacer transiciones atómicas con transacciones SQL (RPC o función Supabase)
    - Mantener la interfaz pública existente (createExpediente, advanceExpediente, rejectExpediente, getExpediente, listExpedientes, getExpedienteEvents, countByStage, addExpedienteNote)
    - _Requirements: 14.1, 14.2, 14.4, 11.5, 9.1, 9.4, 9.5_

  - [ ] 2.2 Implementar pre-filtro con reglas de negocio dinámicas
    - Crear `preFilter.ts` en engines/ con función `runPreFilter(input: PreFilterInput, rules: BusinessRules): PreFilterResult`
    - Validar RFC contra RFC_3_REGEX y RFC_4_REGEX con toUpperCase previo
    - Validar monto, ventas, antigüedad, propósito, plazo contra umbrales de BusinessRules
    - Retornar score 0-100 con lista de reglas evaluadas
    - Integrar con `businessRulesService` para leer umbrales de cs_business_rules
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11_

  - [ ]* 2.3 Write property tests for pre-filter
    - **Property 1: Pre-filter score is bounded 0-100**
    - **Property 2: Pre-filter rejects on any single rule violation**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8**

  - [ ]* 2.4 Write property test for expediente creation
    - **Property 3: Pre-filter pass creates expediente at pld_check stage**
    - **Property 23: Duplicate detection by RFC, amount, and date**
    - **Validates: Requirements 1.7, 14.4**

- [ ] 3. Migrar tokenService a Supabase y seguridad de tokens
  - [ ] 3.1 Migrar `tokenService.ts` de Map en memoria a Supabase
    - Reemplazar `tokensStore` por queries a cs_expediente_tokens
    - Generar tokens con crypto.randomUUID()
    - Leer token_expiry_hours desde businessRulesService
    - Validación server-side de expiración (comparar expires_at con now())
    - Incrementar access_count y actualizar last_accessed_at en cada validación exitosa
    - Invalidar token si access_count > 50 (registrar evento de seguridad en audit log)
    - Implementar invalidateAllTokens para expedientes rechazados/expirados
    - Mantener interfaz pública: createToken, validateToken, markTokenUsed, invalidateAllTokens, getTokensNearExpiry
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 15.1, 15.2, 15.5_

  - [ ]* 3.2 Write property tests for token service
    - **Property 6: Stage-required token generation**
    - **Property 7: Token mark-as-used prevents reuse**
    - **Property 8: Expired tokens fail validation**
    - **Property 11: Token format and expiry configuration**
    - **Property 12: Token validation with access counting**
    - **Property 13: Token invalidation on expediente rejection or expiry**
    - **Property 18: Near-expiry token detection for reminders**
    - **Property 22: Token resend invalidates previous token**
    - **Validates: Requirements 3.1, 3.6, 4.1, 4.6, 4.7, 6.1, 6.5, 6.7, 8.1-8.8, 10.3, 13.7, 15.1, 15.5**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implementar servicios de PLD, scoring y decisión
  - [ ] 5.1 Crear `pldService.ts` para verificación PLD/KYC
    - Implementar `runPldCheck(expedienteId: string): Promise<PldCheckResult>`
    - Usar `validateCompliance(rfc)` del scoryClient existente
    - Mapear ComplianceResult a PldCheckResult (passed, score, alerts, hasCriticalAlerts)
    - Si sin alertas críticas: actualizar pld_score, crear evento "pld_check_passed", avanzar a buro_authorization
    - Si alertas críticas: rechazar expediente con motivo "PLD: alertas críticas encontradas", invalidar tokens
    - Si falla después de 3 reintentos: registrar error, notificar analista para revisión manual
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 5.2 Write property test for PLD check
    - **Property 4: PLD check outcome determines stage advancement**
    - **Validates: Requirements 2.2, 2.3**

  - [ ] 5.3 Integrar `scoryScoringService.ts` con el flujo del expediente
    - Crear función orquestadora `runAnalysis(expedienteId: string)` que:
      - Registra evento "analysis_started" en audit log
      - Llama a `runScoryAnalysis({ rfc, syntage_entity_id, buro_score })`
      - Mapea resultados a cs_applications (engine_results + composite_score)
      - Registra evento "analysis_completed" en audit log
      - Avanza etapa a documentation
    - Manejar engines en estado "error": usar resultados parciales, registrar engines fallidos
    - Si falla después de 3 reintentos: registrar "analysis_failed", notificar analista
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ]* 5.4 Write property test for Scory scoring
    - **Property 9: Composite score from Scory API**
    - **Validates: Requirements 5.2**

  - [ ] 5.5 Crear `decisionService.ts` para decisión crediticia
    - Implementar `makeDecision(expedienteId: string): Promise<DecisionResult>`
    - Leer umbrales approval_threshold y rejection_threshold de cs_business_rules
    - Score ≥ approval_threshold → auto_approved, avanzar a "approved", email de aprobación
    - Score entre rejection_threshold y approval_threshold → committee, evento "decision_sent_to_committee"
    - Score < rejection_threshold → auto_rejected, avanzar a "rejected", email de rechazo
    - Implementar `committeDecision(expedienteId, approved: boolean, reason?: string)` para resolución de comité
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 5.6 Write property test for decision service
    - **Property 10: Decision outcome determined by score thresholds**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 6. State machine, audit log y email
  - [ ] 6.1 Verificar y completar state machine
    - Verificar que `expedienteStateMachine.ts` cubre todas las transiciones del Req 11.1
    - Asegurar que transiciones inválidas se rechazan y registran error en audit log
    - Asegurar que estados finales (approved, rejected) impiden cualquier transición
    - Asegurar que expired solo permite transición a pre_filter
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 6.2 Write property tests for state machine
    - **Property 15: State machine transition validity**
    - **Property 16: State machine round-trip consistency**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.6**

  - [ ]* 6.3 Write property test for audit log
    - **Property 14: Audit log event completeness on transitions**
    - **Validates: Requirements 9.1, 9.4**

  - [ ] 6.4 Integrar emailService con proveedor real y templates
    - Integrar Resend (o Amazon SES) en `emailService.ts` reemplazando el placeholder actual
    - Implementar templates HTML con branding Xending para: bienvenida, link de acción, recordatorio, aprobación, rechazo
    - Implementar job de recordatorio: detectar tokens activos no usados a 48h de expirar y enviar email
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ]* 6.5 Write property tests for email service
    - **Property 17: Email generation correctness**
    - **Validates: Requirements 10.1, 10.2, 10.4, 10.5**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. InputMasks module y validación de formularios
  - [ ] 8.1 Implementar `utils/inputMasks.ts` con máscaras posicionales
    - Exportar constantes RFC_3_REGEX, RFC_4_REGEX, EMAIL_REGEX
    - Implementar `maskRfc(value: string, cursorPos: number)`: letras en pos 1-3, letra/dígito en pos 4, dígitos en pos 5-10, alfanuméricos en pos 11-13, auto-uppercase
    - Implementar `maskPhone(value: string)`: solo dígitos, espacios automáticos después de pos 2 y 6, máximo 10 dígitos, formato "55 1234 5678"
    - Detectar persona moral (pos 4 = dígito, 12 chars max) vs persona física (pos 4 = letra, 13 chars max)
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_

- [ ] 9. Portal del Solicitante (React)
  - [ ] 9.1 Crear routing y layout del portal del solicitante
    - Agregar rutas `/solicitud/nuevo` (público) y `/solicitud/:token` (con validación de token)
    - Crear layout con branding Xending (logo, colores corporativos), diseño responsivo
    - Crear `TokenRouter` que valida el token y renderiza la vista según el propósito (buro_signature, ciec_linkage, document_upload, general_access)
    - Crear `TokenErrorView` con mensajes para token expirado, usado e inválido (sin revelar info del sistema)
    - _Requirements: 8.3, 8.5, 8.6, 8.7, 12.5, 12.6_

  - [ ] 9.2 Crear `PreFilterForm` - formulario público de solicitud
    - Formulario con campos: RFC (con maskRfc), nombre empresa, monto, moneda, propósito, ventas anuales, antigüedad, plazo, email, teléfono (con maskPhone)
    - Importar validaciones y máscaras desde inputMasks.ts
    - Al enviar: llamar a createExpediente, mostrar resultado (folio si pasa, motivo si rechaza)
    - _Requirements: 1.1, 18.7_

  - [ ] 9.3 Crear `BuroSignatureView` - firma de autorización Buró
    - Mostrar datos del expediente y formulario de firma electrónica
    - Al firmar: registrar evento "buro_signed", consultar Buró vía Syntage API, marcar token como usado
    - Mostrar resultado: avance a sat_linkage o rechazo por score insuficiente
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 12.1_

  - [ ] 9.4 Crear `CiecLinkageView` - vinculación SAT/CIEC
    - Formulario de ingreso de CIEC con indicador de progreso
    - Al ingresar CIEC: crear entidad Syntage, credencial CIEC, iniciar extracciones
    - Polling cada 10 segundos para actualizar estado de extracciones
    - Al completar: vincular syntage_entity_id, avanzar a analysis, marcar token como usado
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.7, 12.2_

  - [ ] 9.5 Crear `DocumentUploadView` - carga de documentos
    - Interfaz con checklist de documentos requeridos (acta constitutiva, estados financieros, ID representante legal, comprobante domicilio)
    - Soporte drag-and-drop y selección de archivos
    - Almacenar en Supabase Storage, registrar evento "document_uploaded" por cada documento
    - Al completar todos: ejecutar KYB vía Scory API, avanzar a decision, marcar token como usado
    - _Requirements: 6.2, 6.3, 6.4, 6.6, 6.7, 12.3_

  - [ ] 9.6 Crear `ExpedienteTrackingView` - seguimiento del expediente
    - Vista con etapa actual, porcentaje de progreso (usando getProgress), timeline de eventos
    - Accesible con token de propósito "general_access"
    - _Requirements: 12.4_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Dashboard Administrativo
  - [ ] 11.1 Crear `ExpedienteListPage` con pipeline visual
    - Lista de expedientes con paginación, ordenados por updated_at descendente
    - Filtros por etapa, rango de fechas, búsqueda por folio o RFC
    - Contadores por etapa como pipeline visual (Kanban-style)
    - _Requirements: 13.1, 13.2, 13.3_

  - [ ]* 11.2 Write property tests for dashboard filters and counts
    - **Property 19: Dashboard filter correctness**
    - **Property 20: Dashboard stage counts**
    - **Validates: Requirements 13.1, 13.2, 13.3**

  - [ ] 11.3 Crear `ExpedienteDetailPage` con timeline y acciones
    - Detalle completo del expediente con timeline de eventos del audit log
    - Acción "rechazar": solicitar motivo, ejecutar transición a rejected con actor "analyst"
    - Acción "agregar nota": registrar en audit log con tipo "note_added" y actor "analyst"
    - Acción "reenviar token": generar nuevo token, invalidar anterior, enviar email
    - _Requirements: 13.4, 13.5, 13.6, 13.7_

  - [ ]* 11.4 Write property test for analyst rejection
    - **Property 21: Analyst rejection records reason and actor**
    - **Validates: Requirements 13.5**

- [ ] 12. Observabilidad y métricas
  - [ ] 12.1 Implementar logging estructurado y métricas del pipeline
    - Agregar logging JSON en cada transición de etapa: timestamp, folio, stage_from, stage_to, duration_in_stage
    - Calcular y mostrar en dashboard: tiempo promedio por etapa, tasa de conversión entre etapas, tasa de expiración de tokens por etapa
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

- [ ] 13. Rate limiting y seguridad
  - [ ] 13.1 Implementar rate limiting en validación de tokens
    - Aplicar rate limiting: máximo 10 intentos por IP en 5 minutos en el endpoint de validación de tokens
    - Requerir HTTPS para URLs de tokens en producción
    - _Requirements: 15.3, 15.4_

- [ ] 14. Integración end-to-end y wiring
  - [ ] 14.1 Conectar flujo completo del expediente
    - Wiring: PreFilterForm → createExpediente → pldService → tokenService (buro link) → BuroSignatureView → Syntage Buró → tokenService (ciec link) → CiecLinkageView → syntageOrchestrator → scoryScoringService → tokenService (docs link) → DocumentUploadView → decisionService
    - Asegurar que cada transición genera tokens, emails y eventos de audit log correctamente
    - Conectar portal del solicitante con rutas en App.tsx
    - Conectar dashboard admin con nuevas páginas de expedientes
    - _Requirements: 1.9, 2.2, 3.1, 4.1, 5.1, 6.1, 7.1, 8.3, 11.5_

  - [ ]* 14.2 Write integration tests for end-to-end flow
    - Test del flujo completo: pre-filtro → PLD → Buró → SAT → análisis → documentación → decisión
    - Mock de APIs externas (Scory, Syntage)
    - Verificar que cada etapa genera los eventos correctos en audit log
    - _Requirements: 9.2, 11.1_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (25 properties)
- The project uses TypeScript with Vitest + fast-check for property-based testing
- Existing services (expedienteService, tokenService, emailService, syntageOrchestrator, scoryScoringService) are migrated/extended rather than rewritten
- The state machine (`expedienteStateMachine.ts`) is already complete and covers all required transitions
