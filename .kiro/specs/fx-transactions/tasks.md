# Plan de Implementación: Transacciones FX (Xending Capital)

## Resumen

Implementación incremental del módulo de Transacciones FX. Se comienza con la capa de datos y utilidades, luego servicios, hooks, componentes y finalmente integración de rutas. Cada tarea construye sobre las anteriores. El lenguaje de implementación es TypeScript con React, Supabase y Tailwind CSS.

## Tareas

- [x] 1. Configurar estructura del feature y tipos base
  - [x] 1.1 Crear la estructura de carpetas `src/features/fx-transactions/` con subcarpetas: `components/`, `hooks/`, `pages/`, `services/`, `types/`
    - Crear archivos de tipos `types/company-fx.types.ts` y `types/transaction.types.ts` con las interfaces `PaymentAccount`, `CompanyFX`, `CreateCompanyFXInput`, `TransactionStatus`, `FXTransaction`, `FXTransactionSummary` y `CreateTransactionInput` según el diseño
    - _Requerimientos: 1.1, 1.6, 5.7_

  - [x] 1.2 Agregar `maskClabe` y `CLABE_REGEX` al módulo de máscaras existente en `credit-scoring/src/features/credit-scoring/utils/inputMasks.ts`
    - Implementar `maskClabe` que filtre no-numéricos, limite a 18 dígitos y formatee como `NNN-NNN-NNNNNNNNNNN-N`
    - Exportar `CLABE_REGEX` con patrón `/^\d{3}-\d{3}-\d{11}-\d{1}$/`
    - _Requerimientos: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 1.3 Escribir test de propiedad para maskClabe (round-trip)
    - **Propiedad 1: Round-trip de maskClabe**
    - **Valida: Requerimientos 10.1, 10.2, 10.3, 10.5**

  - [ ]* 1.4 Escribir test de propiedad para validación de RFC
    - **Propiedad 2: Validación de RFC acepta válidos y rechaza inválidos**
    - **Valida: Requerimientos 1.2**

  - [x] 1.5 Crear funciones de formato de moneda en `src/features/fx-transactions/utils/formatters.ts`
    - Implementar `formatCurrency(amount: number, currency: 'USD' | 'MXN'): string` con prefijo, separadores de miles y 2 decimales
    - _Requerimientos: 5.4, 5.6_

  - [ ]* 1.6 Escribir test de propiedad para formato de moneda
    - **Propiedad 22: Formato de moneda con prefijo y separadores de miles**
    - **Valida: Requerimientos 5.4**

- [x] 2. Checkpoint — Verificar que los tipos, máscaras y utilidades compilan correctamente
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.


- [x] 3. Implementar migraciones SQL de base de datos
  - [x] 3.1 Crear script SQL para la tabla `cs_company_payment_accounts`
    - Crear tabla con campos `id`, `company_id` (FK a `cs_companies`), `clabe`, `bank_name`, `is_primary`, `created_at`
    - Agregar CHECK constraint para validar 18 dígitos en CLABE
    - Crear índice `idx_payment_accounts_company` sobre `company_id`
    - _Requerimientos: 1.4, 1.6_

  - [x] 3.2 Crear script SQL para la tabla `fx_transactions`
    - Crear secuencia `fx_transaction_folio_seq`
    - Crear tabla con campos: `id`, `folio` (unique, generado automáticamente con formato `XG-YY-NNNN`), `company_id`, `buys_usd`, `exchange_rate`, `pays_mxn` (GENERATED ALWAYS AS stored), `status`, `created_by`, `authorized_by`, `authorized_at`, `proof_url`, `created_at`, `updated_at`
    - Agregar CHECK constraints para `buys_usd > 0`, `exchange_rate > 0` y valores válidos de `status`
    - Crear índices sobre `company_id`, `status` y `created_by`
    - _Requerimientos: 5.7, 5.5_

  - [x] 3.3 Crear script SQL para el schema `archive` y tabla `archive.cs_companies`
    - Crear schema `archive`
    - Crear tabla `archive.cs_companies` con campos: `id`, `original_id`, `full_record` (JSONB), `archived_by`, `archived_at`
    - Revocar permisos UPDATE y DELETE sobre la tabla
    - Crear función trigger `archive_company_on_update()` que inserte copia del registro previo
    - Crear trigger `trg_archive_company` BEFORE UPDATE en `cs_companies`
    - _Requerimientos: 3.1, 3.2, 3.3_

  - [x] 3.4 Crear script SQL para políticas RLS
    - Habilitar RLS en `cs_companies` con políticas `admin_full_access` y `broker_own_companies`
    - Habilitar RLS en `fx_transactions` con políticas `admin_full_access_tx`, `broker_own_transactions` (SELECT) y `broker_create_transactions` (INSERT)
    - _Requerimientos: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 4. Implementar servicios Supabase
  - [x] 4.1 Crear `services/companyServiceFX.ts` — CRUD de empresas FX
    - Implementar `getCompaniesFX()` con JOIN a `cs_companies_owners` y agregados de transacciones (total USD, última fecha)
    - Implementar `getCompanyFXById(id)` con cuentas de pago incluidas
    - Implementar `searchCompanies(query)` que busque por `legal_name` o `rfc`, excluyendo empresas deshabilitadas
    - Implementar `createCompanyFX(input, userId)` que inserte en `cs_companies`, `cs_companies_owners` y `cs_company_payment_accounts` con rollback en caso de error
    - Implementar `updateCompanyFX(id, input)` que actualice los campos de la empresa (el trigger de archive se ejecuta automáticamente)
    - Implementar `toggleCompanyStatus(id, disabled)` para deshabilitar/habilitar empresas
    - Implementar `getCompanyArchive(companyId)` que retorne historial ordenado por `archived_at` DESC
    - _Requerimientos: 1.1, 1.5, 1.6, 2.1, 2.2, 2.3, 4.3, 4.6, 5.1, 5.3_

  - [ ]* 4.2 Escribir tests unitarios para companyServiceFX
    - Test de creación happy path, RFC duplicado, rollback en error de cuentas
    - Test de búsqueda por RFC, por nombre, empresa deshabilitada excluida
    - _Requerimientos: 1.1, 1.5, 5.1_

  - [x] 4.3 Crear `services/transactionService.ts` — CRUD de transacciones FX
    - Implementar `getTransactions()` con JOIN a `cs_companies` y datos de broker/autorizador
    - Implementar `createTransaction(input)` que inserte en `fx_transactions` y retorne el registro con folio generado
    - Implementar `authorizeTransaction(transactionId, adminUserId)` que actualice `status` a `'authorized'`, `authorized_by` y `authorized_at`, verificando que el status actual sea `'pending'`
    - Implementar `groupTransactionsByStatus(transactions)` que clasifique en tres grupos: "No Autorizadas" (pending), "Autorizadas sin Comprobante" (authorized, proof_url nulo), "Historial" (completed)
    - _Requerimientos: 5.7, 7.1, 9.1_

  - [ ]* 4.4 Escribir test de propiedad para cálculo Pays = Buys × Rate
    - **Propiedad 11: Pays es invariante del producto Buys × Exchange Rate**
    - **Valida: Requerimientos 5.5, 5.6**

  - [ ]* 4.5 Escribir test de propiedad para agrupación de transacciones por estado
    - **Propiedad 20: Agrupación de transacciones por estado**
    - **Valida: Requerimientos 9.1**

  - [ ]* 4.6 Escribir test de propiedad para validación de formulario incompleto
    - **Propiedad 13: Validación rechaza formularios incompletos**
    - **Valida: Requerimientos 5.8**

  - [x] 4.7 Crear `services/fileService.ts` — Upload/download de comprobantes
    - Implementar `uploadProof(transactionId, file)` que suba archivo a bucket `fx-proofs` en Supabase Storage y actualice `proof_url` y `status` a `'completed'` en `fx_transactions`
    - Implementar `validateFile(file)` que verifique tipo MIME (JPEG, PNG, PDF) y tamaño ≤ 10 MB
    - Implementar `getProofUrl(transactionId)` que retorne URL pública del comprobante
    - _Requerimientos: 8.1, 8.2, 8.4, 8.5_

  - [ ]* 4.8 Escribir test de propiedad para validación de archivo
    - **Propiedad 19: Validación de archivo acepta solo JPEG/PNG/PDF bajo 10 MB**
    - **Valida: Requerimientos 8.4, 8.5**

  - [x] 4.9 Crear `services/pdfService.ts` — Generación de orden de pago PDF
    - Implementar `generatePaymentOrderPDF(transaction, company, paymentAccount)` usando jspdf, replicando la plantilla `Confirmacion-XG-25-0032.pdf`
    - Incluir en el PDF: folio, razón social, RFC, dirección fiscal, cuenta CLABE, monto USD, tipo de cambio, monto MXN y fecha
    - _Requerimientos: 6.1, 6.2_

- [x] 5. Checkpoint — Verificar que todos los servicios y tests pasan
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.


- [x] 6. Implementar hooks de React Query
  - [x] 6.1 Crear `hooks/useRole.ts`
    - Implementar hook que determine el rol del usuario actual (`admin` o `broker`) consultando `auth.users` vía Supabase
    - Exportar `useRole()` que retorne `{ role, isAdmin, isBroker, isLoading }`
    - _Requerimientos: 11.4, 11.6_

  - [x] 6.2 Crear `hooks/useCompaniesFX.ts`
    - Implementar `useCompaniesFX()` — query de listado de empresas con React Query
    - Implementar `useCompanyFX(id)` — query de empresa individual con cuentas de pago
    - Implementar `useSearchCompanies(query)` — query de búsqueda con debounce
    - Implementar `useCreateCompanyFX()` — mutation de creación con invalidación de cache
    - Implementar `useUpdateCompanyFX()` — mutation de edición con invalidación de cache
    - Implementar `useToggleCompanyStatus()` — mutation de deshabilitar/habilitar
    - _Requerimientos: 1.1, 2.1, 4.1, 4.2, 5.1_

  - [x] 6.3 Crear `hooks/useTransactions.ts`
    - Implementar `useTransactions()` — query de listado de transacciones
    - Implementar `useCreateTransaction()` — mutation de creación
    - Implementar `useAuthorizeTransaction()` — mutation de autorización
    - _Requerimientos: 5.7, 7.1, 9.1_

  - [x] 6.4 Crear `hooks/useFileUpload.ts`
    - Implementar `useFileUpload()` — mutation para subir comprobante con estado de progreso
    - Manejar estados: idle, uploading, success, error
    - _Requerimientos: 8.1, 8.2, 8.3_

- [x] 7. Implementar componentes de empresas
  - [x] 7.1 Crear `components/CompanyFormFX.tsx` — Formulario de registro/edición de empresa
    - Campos: razón social, RFC (con maskRfc), teléfono (con maskPhone), dirección fiscal (calle, ciudad, estado, CP, país), cuentas de pago CLABE (con maskClabe, dinámicas — agregar/eliminar)
    - Validaciones: RFC contra RFC_3_REGEX/RFC_4_REGEX, CLABE contra CLABE_REGEX, teléfono 10 dígitos, campos requeridos
    - Modo `create` y modo `edit` (precarga datos existentes)
    - Campo adicional para admin: selector de usuarios (owners) para asignar acceso
    - _Requerimientos: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 2.4_

  - [x] 7.2 Crear `components/CompanySearchInput.tsx` — Buscador de empresas con autocompletado
    - Input de texto que busca por razón social o RFC con sugerencias en tiempo real
    - Excluir empresas deshabilitadas de los resultados
    - Al seleccionar, emitir evento `onSelect(company)` con datos completos de la empresa
    - _Requerimientos: 5.1, 5.2, 5.3_

  - [x] 7.3 Crear `components/CompanyCatalogTable.tsx` — Tabla del catálogo de empresas
    - Columnas para admin: Razón Social, RFC, Broker, Total Transacciones (USD), Última Transacción, control Deshabilitar
    - Columnas para broker: Razón Social, RFC, Total Transacciones (USD), Última Transacción (sin columna Broker ni control Deshabilitar)
    - Indicador visual para empresas deshabilitadas
    - Acciones: editar empresa (navegar a formulario de edición)
    - _Requerimientos: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Implementar componentes de transacciones
  - [x] 8.1 Crear `components/TransactionForm.tsx` — Formulario de registro de transacción
    - Integrar `CompanySearchInput` para selección de empresa
    - Mostrar campos no editables al seleccionar empresa: razón social, RFC, teléfono, dirección fiscal, cuentas CLABE
    - Campos editables: Buys (USD con formato moneda), Exchange Rate (4 decimales), selector de cuenta de pago
    - Campo calculado display-only: Pays (MXN) = Buys × Exchange Rate, recalculado en tiempo real
    - Validaciones: empresa seleccionada, buys > 0, exchange_rate > 0
    - _Requerimientos: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 8.2 Crear `components/AuthorizeButton.tsx` — Botón de autorización (solo admin)
    - Renderizar botón solo si `isAdmin` es true
    - Al hacer click, llamar a `useAuthorizeTransaction` mutation
    - Deshabilitar si la transacción ya está autorizada
    - _Requerimientos: 7.1, 7.4, 7.5_

  - [x] 8.3 Crear `components/ProofUpload.tsx` — Drag-and-drop para comprobante
    - Zona de drag-and-drop y botón de selección de archivo
    - Validar tipo (JPEG, PNG, PDF) y tamaño (≤ 10 MB) antes de subir
    - Mostrar barra de progreso durante la carga
    - Mostrar enlace de descarga cuando existe `proof_url`
    - Deshabilitar si la transacción no está autorizada (`status !== 'authorized'`)
    - _Requerimientos: 8.1, 8.2, 8.3, 8.4, 8.5, 7.2, 7.3_

  - [x] 8.4 Crear `components/PaymentOrderPDF.tsx` — Enlace de descarga de PDF
    - Botón/enlace que genera y descarga el PDF de orden de pago usando `pdfService`
    - Habilitado solo si la transacción tiene folio asignado
    - Deshabilitado si no tiene folio
    - _Requerimientos: 6.1, 6.3_

  - [x] 8.5 Crear `components/TransactionCatalogTable.tsx` — Tabla del catálogo de transacciones
    - Tres secciones: "No Autorizadas" (siempre expandida), "Autorizadas sin Comprobante" (siempre expandida), "Historial" (colapsable)
    - Columnas: Razón Social, RFC, Buys (USD), Tipo de Cambio, Pays (MXN), Fecha, Orden de Pago (enlace PDF), Autorizada (fecha), Autorizó (nombre admin), Comprobante (enlace/upload)
    - Columna Broker visible solo para admin
    - Integrar `AuthorizeButton` en filas de transacciones pendientes (solo admin)
    - Integrar `ProofUpload` en filas de transacciones autorizadas
    - Integrar `PaymentOrderPDF` en cada fila con folio
    - _Requerimientos: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 9. Checkpoint — Verificar que todos los componentes renderizan correctamente
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.


- [x] 10. Implementar páginas y conectar rutas
  - [x] 10.1 Crear `pages/CompanyCatalogPage.tsx`
    - Página que renderiza `CompanyCatalogTable` con datos de `useCompaniesFX`
    - Botón "Nueva Empresa" que navega a `/fx/companies/new`
    - Usar `useRole` para pasar el rol al componente de tabla
    - _Requerimientos: 4.1, 4.2_

  - [x] 10.2 Crear `pages/CompanyFormFXPage.tsx`
    - Página wrapper para `CompanyFormFX` en modo `create` o `edit` según la ruta
    - En modo `edit`, cargar datos de la empresa con `useCompanyFX(id)` y verificar permisos de edición
    - _Requerimientos: 1.1, 1.7, 2.1, 2.3_

  - [x] 10.3 Crear `pages/TransactionCatalogPage.tsx`
    - Página que renderiza `TransactionCatalogTable` con datos de `useTransactions`
    - Botón "Nueva Transacción" que navega a `/fx/transactions/new`
    - Usar `useRole` para pasar el rol al componente de tabla
    - _Requerimientos: 9.1, 9.2_

  - [x] 10.4 Crear `pages/CreateTransactionPage.tsx`
    - Página que renderiza `TransactionForm`
    - Al crear exitosamente, mostrar confirmación con folio y enlace a PDF
    - _Requerimientos: 5.7, 6.1_

  - [x] 10.5 Registrar rutas FX en `credit-scoring/src/App.tsx`
    - Agregar rutas dentro del layout `CreditScoringLayout`:
      - `fx/companies` → `CompanyCatalogPage`
      - `fx/companies/new` → `CompanyFormFXPage` (mode=create)
      - `fx/companies/:id/edit` → `CompanyFormFXPage` (mode=edit)
      - `fx/transactions` → `TransactionCatalogPage`
      - `fx/transactions/new` → `CreateTransactionPage`
    - Agregar imports correspondientes
    - _Requerimientos: 1.1, 4.1, 5.7, 9.1_

- [x] 11. Integración final y permisos
  - [x] 11.1 Implementar guards de permisos en componentes
    - Verificar que `AuthorizeButton` solo se renderiza para admin
    - Verificar que el control Deshabilitar en `CompanyCatalogTable` solo aparece para admin
    - Verificar que la columna Broker solo aparece para admin en ambos catálogos
    - Mostrar mensaje "Permisos insuficientes" si un broker intenta acciones restringidas
    - _Requerimientos: 11.4, 11.5, 11.6_

  - [x] 11.2 Configurar bucket `fx-proofs` en Supabase Storage
    - Crear bucket con políticas de acceso: INSERT para usuario autenticado con transacción autorizada, SELECT para usuario vinculado o admin
    - Configurar límite de 10 MB y tipos MIME permitidos
    - _Requerimientos: 8.1, 8.4_

  - [ ]* 11.3 Escribir test de propiedad para folio único y estado pendiente
    - **Propiedad 12: Creación de transacción genera folio único y estado pendiente**
    - **Valida: Requerimientos 5.7**

  - [ ]* 11.4 Escribir test de propiedad para autorización registra admin y timestamp
    - **Propiedad 15: Autorización registra identidad del admin y timestamp**
    - **Valida: Requerimientos 7.1**

  - [ ]* 11.5 Escribir test de propiedad para carga de comprobante habilitada solo si autorizada
    - **Propiedad 16: Carga de comprobante habilitada si y solo si la transacción está autorizada**
    - **Valida: Requerimientos 7.2, 7.3**

  - [ ]* 11.6 Escribir test de propiedad para solo admin puede autorizar
    - **Propiedad 17: Solo el rol administrador puede autorizar transacciones**
    - **Valida: Requerimientos 7.4, 7.5**

- [x] 12. Checkpoint final — Verificar integración completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.
  - Verificar que las rutas funcionan correctamente
  - Verificar que los permisos RLS funcionan según el rol
  - Verificar que el flujo completo funciona: registro empresa → registro transacción → PDF → autorización → comprobante

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requerimientos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los tests de propiedades validan correctitud universal con fast-check
- Los tests unitarios validan ejemplos específicos y edge cases
