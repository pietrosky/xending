# Documento de Requerimientos — Expediente Digital (M02)

## Introducción

El Expediente Digital implementa el ciclo de vida completo de una solicitud de crédito en Xending Capital (SOFOM ENR), desde la captura inicial del solicitante (pre-filtro) hasta la decisión final (aprobación automática, escalamiento a comité o rechazo). El sistema opera con tokens de acceso sin login para el solicitante, audit log inmutable, notificaciones por email y un portal de seguimiento en tiempo real. El flujo principal es: pre-filtro → verificación PLD → autorización Buró → vinculación SAT → análisis crediticio → documentación/KYB → decisión.

## Glosario

- **Expediente**: Registro digital que contiene toda la información de una solicitud de crédito, identificado por un folio único XND-YYYY-NNNNN.
- **Solicitante**: Persona moral (empresa) que solicita un crédito a través del sistema Xending.
- **Analista**: Usuario interno de Xending que revisa y gestiona expedientes desde el dashboard administrativo.
- **Etapa (Stage)**: Estado actual del expediente dentro del flujo de otorgamiento. Valores: pre_filter, pld_check, buro_authorization, sat_linkage, analysis, documentation, decision, approved, rejected, expired.
- **Token_de_Acceso**: UUID v4 criptográficamente seguro que permite al Solicitante acceder al portal sin login. Tiene propósito, expiración (72h por defecto) y contador de accesos.
- **Pre_Filtro**: Validación automática de datos mínimos del Solicitante contra reglas de negocio configurables de Xending.
- **PLD_Check**: Verificación contra listas negras, PEPs y artículo 69-B del SAT vía API Scory.
- **Buró_de_Crédito**: Consulta del historial crediticio del Solicitante vía API Syntage, previa autorización firmada.
- **SAT_Linkage**: Proceso de vinculación de la CIEC del Solicitante para extracción de datos fiscales vía API Syntage.
- **Engine_de_Scoring**: Módulo de análisis que evalúa un aspecto específico del riesgo crediticio y produce un score numérico (0-100).
- **Score_Compuesto**: Puntaje agregado resultante de la ejecución de todos los Engine_de_Scoring sobre los datos del expediente.
- **Audit_Log**: Registro inmutable de eventos del expediente en la tabla cs_expediente_events (solo INSERT, nunca UPDATE/DELETE).
- **Reglas_de_Negocio**: Parámetros configurables almacenados en cs_business_rules que definen umbrales y límites del sistema.
- **Folio**: Identificador legible del expediente con formato XND-YYYY-NNNNN.
- **Syntage_API**: Servicio externo que provee consulta de Buró de Crédito y extracción de datos fiscales del SAT.
- **Scory_API**: Servicio externo que provee verificación PLD/KYC, KYB empresarial y análisis crediticio completo (scoring de todos los engines) vía API REST con autenticación Bearer token.
- **Portal_del_Solicitante**: Interfaz web pública accesible vía Token_de_Acceso donde el Solicitante completa cada etapa.
- **Dashboard_Admin**: Interfaz web interna para Analistas con lista de expedientes, filtros, detalle y acciones manuales.
- **Máquina_de_Estados**: Componente que define las transiciones válidas entre Etapas del Expediente y garantiza la integridad del flujo.
- **Supabase**: Plataforma de backend que provee base de datos PostgreSQL, autenticación, storage y Row Level Security (RLS).
- **RFC_3_REGEX**: Expresión regular para RFC de persona moral (empresa): `/^[A-Z]{3}[0-9]{6}[A-Z0-9]{3}$/` — 12 caracteres, case-sensitive tras conversión a mayúsculas.
- **RFC_4_REGEX**: Expresión regular para RFC de persona física (individuo): `/^[A-Z]{4}[0-9]{6}[A-Z0-9]{3}$/` — 13 caracteres, case-sensitive tras conversión a mayúsculas.
- **Máscara_Posicional**: Función que filtra caracteres en tiempo real según la posición del cursor, impidiendo la entrada de caracteres inválidos antes de que se registren en el campo.
- **InputMasks_Module**: Módulo reutilizable ubicado en `utils/inputMasks.ts` que exporta RFC_3_REGEX, RFC_4_REGEX, EMAIL_REGEX, maskRfc y maskPhone.

## Requerimientos

### Requerimiento 1: Pre-filtro automático de solicitudes

**User Story:** Como Solicitante, quiero enviar mis datos básicos para obtener una evaluación inmediata de elegibilidad, de modo que sepa si puedo continuar con el proceso de crédito.

#### Criterios de Aceptación

1. WHEN el Solicitante envía un formulario con RFC, nombre de empresa, monto solicitado, moneda, propósito de crédito, ventas anuales declaradas, antigüedad del negocio, plazo en días, email de contacto y teléfono opcional, THE Pre_Filtro SHALL validar cada campo contra las Reglas_de_Negocio y producir un score de 0 a 100 con la lista de reglas evaluadas.
2. WHEN el Pre_Filtro valida el RFC, THE Pre_Filtro SHALL convertir el valor a mayúsculas mediante toUpperCase y validar contra los patrones posicionales estrictos RFC_3_REGEX (`/^[A-Z]{3}[0-9]{6}[A-Z0-9]{3}$/` para persona moral, 12 caracteres) y RFC_4_REGEX (`/^[A-Z]{4}[0-9]{6}[A-Z0-9]{3}$/` para persona física, 13 caracteres), sin aceptar caracteres especiales como & ni Ñ.
3. WHEN el RFC no cumple con RFC_3_REGEX ni con RFC_4_REGEX después de la conversión a mayúsculas, THE Pre_Filtro SHALL rechazar la solicitud indicando "RFC con formato inválido".
4. WHEN el monto solicitado es menor a $100,000 USD o mayor a $1,000,000 USD, THE Pre_Filtro SHALL rechazar la solicitud indicando "Monto fuera de rango permitido".
5. WHEN las ventas anuales declaradas son menores a 10 veces el monto solicitado, THE Pre_Filtro SHALL rechazar la solicitud indicando "Ventas insuficientes respecto al monto solicitado".
6. WHEN la antigüedad del negocio es menor a 2 años, THE Pre_Filtro SHALL rechazar la solicitud indicando "Antigüedad mínima no cumplida".
7. WHEN el propósito de crédito no es uno de los valores aceptados (importación, factoraje, operaciones FX, exportación), THE Pre_Filtro SHALL rechazar la solicitud indicando "Propósito de crédito no válido".
8. WHEN el plazo solicitado es menor a 2 días o mayor a 90 días, THE Pre_Filtro SHALL rechazar la solicitud indicando "Plazo fuera de rango permitido".
9. WHEN todas las reglas del Pre_Filtro pasan, THE Sistema SHALL crear un Expediente con Folio XND-YYYY-NNNNN, registrar el score, crear un evento "pre_filter_passed" en el Audit_Log y avanzar la Etapa a pld_check.
10. WHEN alguna regla del Pre_Filtro falla, THE Sistema SHALL crear un Expediente con Etapa "rejected", registrar el motivo de rechazo y crear un evento "pre_filter_rejected" en el Audit_Log.
11. THE Pre_Filtro SHALL evaluar los umbrales desde la tabla cs_business_rules en lugar de valores fijos en el código fuente.

### Requerimiento 2: Verificación PLD/KYC

**User Story:** Como Analista, quiero que el sistema verifique automáticamente al Solicitante contra listas negras y PEPs, de modo que se cumpla con la regulación de prevención de lavado de dinero.

#### Criterios de Aceptación

1. WHEN el Expediente avanza a la Etapa pld_check, THE Sistema SHALL consultar la Scory_API con el RFC y nombre de empresa del Solicitante.
2. WHEN la Scory_API responde con un score PLD de 0 a 100 y sin alertas críticas, THE Sistema SHALL actualizar el campo pld_score del Expediente, crear un evento "pld_check_passed" en el Audit_Log y avanzar la Etapa a buro_authorization.
3. WHEN la Scory_API responde con alertas críticas (listas negras, PEPs o artículo 69-B del SAT), THE Sistema SHALL rechazar el Expediente con motivo "PLD: alertas críticas encontradas", crear un evento "pld_check_failed" en el Audit_Log e invalidar todos los Token_de_Acceso activos del Expediente.
4. IF la Scory_API no responde en un plazo de 30 segundos, THEN THE Sistema SHALL reintentar la consulta hasta 3 veces con espera exponencial y registrar cada intento en el Audit_Log.
5. IF la Scory_API falla después de 3 reintentos, THEN THE Sistema SHALL registrar un evento de error en el Audit_Log y notificar al Analista para revisión manual.

### Requerimiento 3: Autorización y consulta de Buró de Crédito

**User Story:** Como Solicitante, quiero firmar electrónicamente la autorización de consulta de Buró de Crédito a través de un link seguro, de modo que el sistema pueda obtener mi historial crediticio.

#### Criterios de Aceptación

1. WHEN el Expediente avanza a la Etapa buro_authorization, THE Sistema SHALL generar un Token_de_Acceso con propósito "buro_signature", enviar un email al Solicitante con el link de acceso al Portal_del_Solicitante y crear un evento "buro_link_sent" en el Audit_Log.
2. WHEN el Solicitante accede al link con un Token_de_Acceso válido de propósito "buro_signature", THE Portal_del_Solicitante SHALL mostrar el formulario de autorización de consulta de Buró_de_Crédito con los datos del Expediente.
3. WHEN el Solicitante firma la autorización en el Portal_del_Solicitante, THE Sistema SHALL registrar un evento "buro_signed" en el Audit_Log y consultar el Buró_de_Crédito vía Syntage_API.
4. WHEN la Syntage_API responde con un score de Buró igual o mayor a 600, THE Sistema SHALL actualizar el campo buro_score del Expediente, crear un evento "buro_score_received" en el Audit_Log y avanzar la Etapa a sat_linkage.
5. WHEN la Syntage_API responde con un score de Buró menor a 600, THE Sistema SHALL rechazar el Expediente con motivo "Score de Buró insuficiente", crear un evento "buro_rejected" en el Audit_Log y notificar al Solicitante por email.
6. THE Sistema SHALL marcar el Token_de_Acceso como usado después de que el Solicitante complete la firma de autorización.

### Requerimiento 4: Vinculación SAT (CIEC)

**User Story:** Como Solicitante, quiero conectar mi CIEC del SAT a través de un link seguro, de modo que el sistema pueda extraer mis datos fiscales para el análisis crediticio.

#### Criterios de Aceptación

1. WHEN el Expediente avanza a la Etapa sat_linkage, THE Sistema SHALL generar un Token_de_Acceso con propósito "ciec_linkage", enviar un email al Solicitante con el link de acceso al Portal_del_Solicitante y crear un evento "ciec_link_sent" en el Audit_Log.
2. WHEN el Solicitante accede al link con un Token_de_Acceso válido de propósito "ciec_linkage", THE Portal_del_Solicitante SHALL mostrar el formulario de ingreso de CIEC con un indicador de progreso de extracción.
3. WHEN el Solicitante ingresa la CIEC en el Portal_del_Solicitante, THE Sistema SHALL crear una entidad en Syntage_API, crear una credencial CIEC, iniciar las extracciones de datos fiscales (facturas, declaraciones, opinión de cumplimiento) y registrar un evento "ciec_connected" en el Audit_Log.
4. WHILE las extracciones de Syntage_API están en progreso, THE Portal_del_Solicitante SHALL mostrar el estado de cada extracción actualizado mediante polling cada 10 segundos.
5. WHEN todas las extracciones de Syntage_API completan exitosamente, THE Sistema SHALL vincular el syntage_entity_id al Expediente, crear un evento "extraction_completed" en el Audit_Log y avanzar la Etapa a analysis.
6. IF el Token_de_Acceso de propósito "ciec_linkage" expira después de 72 horas sin que el Solicitante complete la vinculación, THEN THE Sistema SHALL cambiar la Etapa del Expediente a "expired" y crear un evento "token_expired" en el Audit_Log.
7. THE Sistema SHALL marcar el Token_de_Acceso como usado después de que el Solicitante complete el ingreso de la CIEC.

### Requerimiento 5: Análisis crediticio vía Scory API

**User Story:** Como Analista, quiero que el sistema solicite automáticamente el análisis crediticio completo a la API de Scory.ai, de modo que se genere un perfil de riesgo completo del Solicitante sin depender de cálculos locales.

#### Criterios de Aceptación

1. WHEN el Expediente avanza a la Etapa analysis, THE Sistema SHALL enviar una solicitud `POST` al endpoint `/v1/scoring/analyze` de la Scory_API con el RFC del Solicitante, el `syntage_entity_id` vinculado y el `buro_score` obtenido, autenticándose con un Bearer token (`VITE_SCORY_API_KEY`).
2. WHEN la Scory_API responde exitosamente con los resultados de todos los engines (financiero, cashflow, compliance, buró, facturación SAT, benchmark, estabilidad, red, fraude, garantías, empleados, documentación, políticas, covenants, escenarios, riesgo AI) y el Score_Compuesto, THE Sistema SHALL mapear cada resultado al tipo `EngineOutput` existente, crear o actualizar el registro en cs_applications con los resultados individuales y el Score_Compuesto, crear un evento "analysis_completed" en el Audit_Log y avanzar la Etapa a documentation.
3. THE Sistema SHALL registrar un evento "analysis_started" en el Audit_Log al iniciar la solicitud a la Scory_API.
4. IF la Scory_API no responde en un plazo de 60 segundos, THEN THE Sistema SHALL reintentar la solicitud hasta 3 veces con espera exponencial (2s, 4s, 8s) y registrar cada intento en el Audit_Log.
5. IF la Scory_API falla después de 3 reintentos, THEN THE Sistema SHALL registrar un evento de error "analysis_failed" en el Audit_Log, marcar el análisis como fallido y notificar al Analista para revisión manual.
6. IF la Scory_API responde con engines individuales en estado "error", THEN THE Sistema SHALL registrar el error de cada engine fallido en el Audit_Log y utilizar los resultados parciales de los engines exitosos para calcular el Score_Compuesto.
7. THE Sistema SHALL cachear los resultados del análisis en la tabla `cs_api_cache` con provider "scory", endpoint "scoring/analyze" y expiración de 1 hora, para evitar llamadas duplicadas durante la misma sesión de análisis.
8. THE Sistema SHALL registrar cada llamada al endpoint de scoring en la tabla `cs_api_calls` con status_code, latency_ms y error_message para observabilidad.

### Requerimiento 6: Documentación y KYB

**User Story:** Como Solicitante, quiero subir los documentos complementarios requeridos a través de un link seguro, de modo que el sistema pueda completar la verificación de mi empresa.

#### Criterios de Aceptación

1. WHEN el Expediente avanza a la Etapa documentation, THE Sistema SHALL generar un Token_de_Acceso con propósito "document_upload", enviar un email al Solicitante con el link de acceso al Portal_del_Solicitante y crear un evento "docs_link_sent" en el Audit_Log.
2. WHEN el Solicitante accede al link con un Token_de_Acceso válido de propósito "document_upload", THE Portal_del_Solicitante SHALL mostrar una interfaz de carga de documentos con checklist de documentos requeridos (acta constitutiva, estados financieros, identificación del representante legal, comprobante de domicilio).
3. WHEN el Solicitante sube un documento, THE Sistema SHALL almacenar el archivo en Supabase Storage, registrar un evento "document_uploaded" en el Audit_Log con el nombre y tipo del documento.
4. WHEN el Solicitante ha subido todos los documentos requeridos, THE Sistema SHALL ejecutar la verificación KYB vía Scory_API, crear un evento "documentation_complete" en el Audit_Log y avanzar la Etapa a decision.
5. IF el Token_de_Acceso de propósito "document_upload" expira después de 72 horas sin que el Solicitante complete la carga de documentos, THEN THE Sistema SHALL cambiar la Etapa del Expediente a "expired" y crear un evento "token_expired" en el Audit_Log.
6. THE Portal_del_Solicitante SHALL permitir carga de documentos mediante drag-and-drop y selección de archivos.
7. THE Sistema SHALL marcar el Token_de_Acceso como usado después de que el Solicitante complete la carga de todos los documentos requeridos.

### Requerimiento 7: Decisión crediticia

**User Story:** Como Analista, quiero que el sistema tome una decisión automática basada en el Score_Compuesto o escale a comité cuando sea necesario, de modo que se agilice el proceso de otorgamiento.

#### Criterios de Aceptación

1. WHEN el Expediente avanza a la Etapa decision y el Score_Compuesto es igual o mayor a 75, THE Sistema SHALL aprobar el Expediente automáticamente, cambiar la Etapa a "approved", crear un evento "decision_auto_approved" en el Audit_Log y notificar al Solicitante por email.
2. WHEN el Expediente avanza a la Etapa decision y el Score_Compuesto está entre 50 y 74 (inclusive), THE Sistema SHALL escalar el Expediente al comité de socios, crear un evento "decision_sent_to_committee" en el Audit_Log y notificar al Analista.
3. WHEN el Expediente avanza a la Etapa decision y el Score_Compuesto es menor a 50, THE Sistema SHALL rechazar el Expediente automáticamente, cambiar la Etapa a "rejected", registrar el motivo "Score compuesto insuficiente", crear un evento "decision_rejected" en el Audit_Log y notificar al Solicitante por email.
4. THE Sistema SHALL evaluar los umbrales de decisión (75 para aprobación, 50 para rechazo) desde la tabla cs_business_rules en lugar de valores fijos en el código fuente.
5. WHEN el comité aprueba el Expediente, THE Sistema SHALL cambiar la Etapa a "approved", crear un evento "decision_approved" en el Audit_Log y notificar al Solicitante por email.
6. WHEN el comité rechaza el Expediente, THE Sistema SHALL cambiar la Etapa a "rejected", registrar el motivo del comité, crear un evento "decision_rejected" en el Audit_Log y notificar al Solicitante por email.

### Requerimiento 8: Tokens de acceso sin login

**User Story:** Como Solicitante, quiero acceder al portal de mi solicitud mediante un link único sin necesidad de crear una cuenta, de modo que el proceso sea ágil y sin fricción.

#### Criterios de Aceptación

1. THE Sistema SHALL generar Token_de_Acceso como UUID v4 criptográficamente seguros con propósito específico (buro_signature, ciec_linkage, document_upload, general_access).
2. THE Token_de_Acceso SHALL expirar después de 72 horas por defecto, con el período configurable desde la tabla cs_business_rules.
3. WHEN el Solicitante accede a la URL /solicitud/{token-uuid}, THE Sistema SHALL validar la existencia, expiración y estado de uso del Token_de_Acceso antes de mostrar el contenido.
4. WHEN un Token_de_Acceso es válido, THE Sistema SHALL incrementar el contador de accesos del token y registrar la fecha del último acceso.
5. IF el Solicitante accede con un Token_de_Acceso expirado, THEN THE Sistema SHALL mostrar un mensaje indicando que el enlace ha expirado y sugerir contactar a Xending.
6. IF el Solicitante accede con un Token_de_Acceso ya utilizado, THEN THE Sistema SHALL mostrar un mensaje indicando que el enlace ya fue completado.
7. IF el Solicitante accede con un Token_de_Acceso inexistente, THEN THE Sistema SHALL mostrar un mensaje de error genérico sin revelar información del sistema.
8. WHEN un Expediente es rechazado o expirado, THE Sistema SHALL invalidar todos los Token_de_Acceso activos asociados a ese Expediente.

### Requerimiento 9: Audit log inmutable

**User Story:** Como Analista, quiero que cada evento del expediente quede registrado de forma inmutable, de modo que exista trazabilidad completa del proceso para auditoría y cumplimiento regulatorio.

#### Criterios de Aceptación

1. THE Audit_Log SHALL registrar cada evento con: tipo de evento, Etapa del Expediente al momento del evento, descripción legible, datos adicionales en formato JSON, actor (system, analyst o applicant) y timestamp.
2. THE Audit_Log SHALL soportar los 27 tipos de eventos definidos: created, pre_filter_passed, pre_filter_rejected, pld_check_passed, pld_check_failed, buro_link_sent, buro_signed, buro_score_received, buro_rejected, ciec_link_sent, ciec_connected, extraction_started, extraction_completed, analysis_started, analysis_completed, docs_link_sent, document_uploaded, documentation_complete, decision_auto_approved, decision_sent_to_committee, decision_approved, decision_rejected, token_generated, token_expired, reminder_sent, stage_changed, note_added.
3. THE tabla cs_expediente_events SHALL permitir únicamente operaciones INSERT, sin permitir UPDATE ni DELETE.
4. WHEN ocurre una transición de Etapa en el Expediente, THE Sistema SHALL crear un registro en el Audit_Log con el tipo de evento correspondiente a la transición.
5. WHEN un Analista agrega una nota al Expediente, THE Sistema SHALL crear un registro en el Audit_Log con tipo "note_added", el contenido de la nota y actor "analyst".

### Requerimiento 10: Notificaciones por email

**User Story:** Como Solicitante, quiero recibir notificaciones por email en cada paso relevante de mi solicitud, de modo que esté informado del progreso y sepa cuándo debo tomar acción.

#### Criterios de Aceptación

1. WHEN se crea un Expediente que pasa el Pre_Filtro, THE Sistema SHALL enviar un email de bienvenida al Solicitante con el Folio del Expediente y los próximos pasos.
2. WHEN el Sistema genera un Token_de_Acceso para una Etapa que requiere acción del Solicitante, THE Sistema SHALL enviar un email con el link de acceso, la descripción de la acción requerida y la fecha de expiración del token.
3. WHEN faltan 48 horas para la expiración de un Token_de_Acceso activo no utilizado, THE Sistema SHALL enviar un email de recordatorio al Solicitante con el link de acceso y la fecha de expiración.
4. WHEN el Expediente es aprobado, THE Sistema SHALL enviar un email de aprobación al Solicitante con el Folio y los próximos pasos de formalización.
5. WHEN el Expediente es rechazado, THE Sistema SHALL enviar un email de rechazo al Solicitante con el Folio y el motivo general del rechazo.
6. THE Sistema SHALL utilizar templates HTML con la identidad visual de Xending para todos los emails.
7. THE Sistema SHALL integrar un proveedor de email transaccional (Resend o Amazon SES) para el envío de emails en producción.

### Requerimiento 11: Máquina de estados del expediente

**User Story:** Como Sistema, quiero garantizar que las transiciones entre etapas del expediente sigan un flujo definido e inmutable, de modo que se preserve la integridad del proceso de otorgamiento.

#### Criterios de Aceptación

1. THE Máquina_de_Estados SHALL permitir únicamente las siguientes transiciones: pre_filter→pld_check, pre_filter→rejected, pld_check→buro_authorization, pld_check→rejected, buro_authorization→sat_linkage, buro_authorization→rejected, sat_linkage→analysis, sat_linkage→rejected, sat_linkage→expired, analysis→documentation, analysis→rejected, documentation→decision, documentation→rejected, documentation→expired, decision→approved, decision→rejected, expired→pre_filter.
2. WHEN se intenta una transición no definida en la Máquina_de_Estados, THE Sistema SHALL rechazar la operación y registrar un error en el Audit_Log.
3. WHILE el Expediente está en Etapa "approved" o "rejected", THE Sistema SHALL impedir cualquier transición de Etapa.
4. WHEN el Expediente está en Etapa "expired", THE Máquina_de_Estados SHALL permitir únicamente la transición a "pre_filter" para reactivación.
5. WHEN ocurre una transición válida, THE Sistema SHALL ejecutar la transición de forma atómica dentro de una transacción SQL.
6. FOR ALL transiciones válidas, avanzar un Expediente y luego consultar su Etapa SHALL producir la Etapa destino de la transición (propiedad de consistencia).

### Requerimiento 12: Portal del solicitante

**User Story:** Como Solicitante, quiero acceder a un portal web donde pueda completar cada etapa de mi solicitud y ver el progreso en tiempo real, de modo que tenga visibilidad completa del proceso.

#### Criterios de Aceptación

1. WHEN el Solicitante accede con un Token_de_Acceso de propósito "buro_signature", THE Portal_del_Solicitante SHALL mostrar el formulario de autorización de consulta de Buró_de_Crédito con los datos del Expediente y un botón de firma electrónica.
2. WHEN el Solicitante accede con un Token_de_Acceso de propósito "ciec_linkage", THE Portal_del_Solicitante SHALL mostrar el formulario de ingreso de CIEC con un indicador de progreso de las extracciones de Syntage_API.
3. WHEN el Solicitante accede con un Token_de_Acceso de propósito "document_upload", THE Portal_del_Solicitante SHALL mostrar la interfaz de carga de documentos con checklist de documentos requeridos y soporte para drag-and-drop.
4. WHEN el Solicitante accede con un Token_de_Acceso de propósito "general_access", THE Portal_del_Solicitante SHALL mostrar la vista de seguimiento del Expediente con la Etapa actual, porcentaje de progreso y timeline de eventos.
5. THE Portal_del_Solicitante SHALL mostrar la identidad visual de Xending (logo, colores corporativos) en todas las vistas.
6. THE Portal_del_Solicitante SHALL funcionar en dispositivos móviles y de escritorio con diseño responsivo.

### Requerimiento 13: Dashboard administrativo de expedientes

**User Story:** Como Analista, quiero tener un dashboard con la lista de expedientes, filtros y acciones manuales, de modo que pueda gestionar eficientemente el pipeline de solicitudes.

#### Criterios de Aceptación

1. THE Dashboard_Admin SHALL mostrar la lista de Expedientes con paginación, ordenados por fecha de actualización descendente.
2. THE Dashboard_Admin SHALL permitir filtrar Expedientes por Etapa, rango de fechas y búsqueda por Folio o RFC.
3. THE Dashboard_Admin SHALL mostrar contadores de Expedientes agrupados por Etapa como pipeline visual.
4. WHEN el Analista selecciona un Expediente, THE Dashboard_Admin SHALL mostrar el detalle completo con timeline de eventos del Audit_Log.
5. WHEN el Analista ejecuta la acción "rechazar" sobre un Expediente, THE Dashboard_Admin SHALL solicitar un motivo de rechazo, ejecutar la transición a "rejected" y registrar el evento en el Audit_Log con actor "analyst".
6. WHEN el Analista ejecuta la acción "agregar nota" sobre un Expediente, THE Dashboard_Admin SHALL registrar la nota en el Audit_Log con tipo "note_added" y actor "analyst".
7. WHEN el Analista ejecuta la acción "reenviar token" sobre un Expediente, THE Sistema SHALL generar un nuevo Token_de_Acceso para la Etapa actual, invalidar el token anterior y enviar un nuevo email al Solicitante.

### Requerimiento 14: Persistencia en Supabase

**User Story:** Como Sistema, quiero que todos los datos del expediente persistan en Supabase con tipos generados y Row Level Security, de modo que los datos sobrevivan recargas y estén protegidos por tenant.

#### Criterios de Aceptación

1. THE Sistema SHALL persistir Expedientes, Token_de_Acceso y eventos del Audit_Log en las tablas cs_expedientes, cs_expediente_tokens y cs_expediente_events de Supabase.
2. THE Sistema SHALL utilizar tipos TypeScript generados desde el esquema de Supabase para todas las operaciones de lectura y escritura.
3. THE Sistema SHALL aplicar Row Level Security (RLS) en todas las tablas de expedientes para aislamiento multi-tenant.
4. WHEN se crea un Expediente con un RFC, monto y fecha que ya existen en la base de datos, THE Sistema SHALL rechazar la operación como duplicado en lugar de crear un registro nuevo (idempotencia).
5. THE Sistema SHALL ejecutar las migraciones incrementales (031+) para agregar los campos faltantes: company_id, declared_monthly_sales_mxn, business_activity, pre_filter_result, minimum_required_sales_mxn, coverage_ratio, source y tenant_id.

### Requerimiento 15: Seguridad de tokens

**User Story:** Como Sistema, quiero que los tokens de acceso sean criptográficamente seguros con expiración server-side y protección contra fuerza bruta, de modo que se prevenga el acceso no autorizado.

#### Criterios de Aceptación

1. THE Sistema SHALL generar Token_de_Acceso utilizando UUID v4 con generación criptográficamente segura (crypto.randomUUID).
2. THE Sistema SHALL validar la expiración de Token_de_Acceso en el servidor, sin depender de validaciones del cliente.
3. THE Sistema SHALL aplicar rate limiting en el endpoint de validación de tokens, permitiendo un máximo de 10 intentos por dirección IP en un período de 5 minutos.
4. THE Sistema SHALL requerir HTTPS para todas las URLs de Token_de_Acceso en el entorno de producción.
5. IF un Token_de_Acceso es accedido más de 50 veces sin completar la acción, THEN THE Sistema SHALL invalidar el token y registrar un evento de seguridad en el Audit_Log.

### Requerimiento 16: Observabilidad y métricas

**User Story:** Como Analista, quiero tener visibilidad sobre el rendimiento del pipeline de expedientes, de modo que pueda identificar cuellos de botella y optimizar el proceso.

#### Criterios de Aceptación

1. THE Sistema SHALL registrar logging estructurado (JSON) en cada transición de Etapa del Expediente con timestamp, Folio, Etapa origen, Etapa destino y duración en la etapa anterior.
2. THE Dashboard_Admin SHALL mostrar el tiempo promedio que un Expediente permanece en cada Etapa.
3. THE Dashboard_Admin SHALL mostrar la tasa de conversión entre Etapas consecutivas (porcentaje de expedientes que avanzan de una Etapa a la siguiente).
4. THE Dashboard_Admin SHALL mostrar la tasa de expiración de Token_de_Acceso por Etapa.

### Requerimiento 17: Configurabilidad de reglas de negocio

**User Story:** Como Administrador, quiero poder modificar los umbrales y parámetros del sistema sin necesidad de un nuevo despliegue, de modo que se pueda ajustar la política crediticia ágilmente.

#### Criterios de Aceptación

1. THE Sistema SHALL leer todos los umbrales de decisión (montos mínimo y máximo, multiplicador de ventas, antigüedad mínima, score mínimo de Buró, umbrales de decisión, vigencia de tokens, tiempo de recordatorio) desde la tabla cs_business_rules.
2. WHEN un Administrador modifica un valor en cs_business_rules, THE Sistema SHALL aplicar el nuevo valor en la siguiente evaluación sin requerir reinicio ni redespliegue.
3. THE Sistema SHALL utilizar los valores por defecto definidos en DEFAULT_BUSINESS_RULES únicamente cuando no exista un valor configurado en cs_business_rules.

### Requerimiento 18: Máscaras de entrada y validación en formularios

**User Story:** Como Solicitante, quiero que los campos del formulario de pre-filtro restrinjan la entrada de caracteres inválidos en tiempo real según la posición, de modo que se prevengan errores de formato antes del envío.

#### Criterios de Aceptación

1. THE InputMasks_Module SHALL exportar las constantes RFC_3_REGEX, RFC_4_REGEX, EMAIL_REGEX y las funciones maskRfc y maskPhone desde el archivo `utils/inputMasks.ts` para reutilización en todos los formularios del sistema.
2. WHEN el Solicitante escribe en el campo RFC, THE Máscara_Posicional maskRfc SHALL permitir únicamente letras (A-Z) en las posiciones 1 a 3, letra o dígito en la posición 4, dígitos (0-9) en las posiciones 5 a 10, y caracteres alfanuméricos (A-Z, 0-9) en las posiciones 11 a 13.
3. WHEN la posición 4 del RFC contiene un dígito, THE Máscara_Posicional maskRfc SHALL tratar el RFC como persona moral (12 caracteres máximo, bloque de fecha inicia en posición 4).
4. WHEN la posición 4 del RFC contiene una letra, THE Máscara_Posicional maskRfc SHALL tratar el RFC como persona física (13 caracteres máximo, bloque de fecha inicia en posición 5).
5. WHEN el Solicitante escribe en el campo RFC, THE Formulario SHALL convertir automáticamente todos los caracteres a mayúsculas mediante toUpperCase antes de aplicar la Máscara_Posicional.
6. WHEN el Solicitante escribe en el campo teléfono, THE Máscara_Posicional maskPhone SHALL aceptar únicamente dígitos (0-9), insertar un espacio automáticamente después de la posición 2 y después de la posición 6, y limitar la entrada a un máximo de 10 dígitos con formato "55 1234 5678".
7. THE Formulario SHALL importar RFC_3_REGEX, RFC_4_REGEX, EMAIL_REGEX, maskRfc y maskPhone desde el InputMasks_Module en lugar de definir lógica de validación y enmascaramiento duplicada en cada componente.
8. FOR ALL cadenas RFC válidas, aplicar maskRfc y luego validar contra RFC_3_REGEX o RFC_4_REGEX SHALL producir un resultado positivo (propiedad de consistencia entre máscara y validación).
