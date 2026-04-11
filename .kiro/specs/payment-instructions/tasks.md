# Plan de Implementación: Payment Instructions

## Resumen

Implementar el módulo Payment Instructions como un nuevo feature en `credit-scoring/src/features/payment-instructions/`, siguiendo los patrones existentes de `fx-transactions`. Incluye tipos, validadores, servicio PostgREST, hooks React Query, componentes de UI (tabla catálogo y modal de creación), integración con navegación y routing, y scripts SQL para la tabla y políticas RLS.

## Tareas

- [x] 1. Crear tipos, validadores y servicio de datos
  - [x] 1.1 Crear tipos TypeScript del módulo
    - Crear `credit-scoring/src/features/payment-instructions/types/payment-instruction.types.ts`
    - Definir interfaces `PaymentInstructionAccount`, `CreateAccountInput` y `ValidationResult` según el diseño
    - _Requerimientos: 1.1, 2.1_

  - [x] 1.2 Implementar funciones de validación
    - Crear `credit-scoring/src/features/payment-instructions/utils/validators.ts`
    - Implementar `validateSWIFT`: aceptar solo 8-11 caracteres alfanuméricos
    - Implementar `validateAccountNumber`: no vacío, solo alfanumérico
    - Implementar `validateRequiredFields`: verificar todos los campos obligatorios presentes
    - Implementar `validateCreateAccountForm`: combinar todas las validaciones
    - _Requerimientos: 1.2, 1.3, 1.4_

  - [ ]* 1.3 Escribir test de propiedad para validación de formato de campos
    - **Propiedad 1: Validación de formato de campos**
    - Generar strings aleatorios con `fast-check`, verificar que `validateSWIFT` acepta solo strings de 8-11 caracteres alfanuméricos y `validateAccountNumber` acepta solo strings no vacíos alfanuméricos
    - Instalar `fast-check` como devDependency si no existe
    - **Valida: Requerimientos 1.2, 1.3**

  - [ ]* 1.4 Escribir test de propiedad para validación de campos obligatorios
    - **Propiedad 2: Validación de campos obligatorios**
    - Generar objetos `CreateAccountInput` con subconjuntos aleatorios de campos omitidos, verificar que `validateRequiredFields` rechaza e identifica exactamente los campos faltantes
    - **Valida: Requerimiento 1.4**

  - [x] 1.5 Implementar servicio de acceso a datos
    - Crear `credit-scoring/src/features/payment-instructions/services/paymentAccountService.ts`
    - Implementar `getPaymentAccounts()`: SELECT con ordenamiento (activas primero, desc por fecha)
    - Implementar `createPaymentAccount(input)`: INSERT con validación de duplicado por account_number, retornar error "Ya existe una cuenta con este número de cuenta" si duplicado
    - Implementar `disablePaymentAccount(id)`: UPDATE solo de `is_active`, `disabled_at`, `disabled_by`
    - Usar el cliente Supabase existente en `@/lib/supabase`
    - _Requerimientos: 1.1, 1.5, 3.1, 3.5, 4.4_

  - [ ]* 1.6 Escribir test de propiedad para ordenamiento del catálogo
    - **Propiedad 6: Ordenamiento del catálogo**
    - Generar conjuntos aleatorios de cuentas con estados mixtos, aplicar la lógica de ordenamiento del servicio, verificar que activas van antes que deshabilitadas y dentro de cada grupo el orden es descendente por `created_at`
    - **Valida: Requerimiento 4.4**

- [x] 2. Checkpoint - Verificar tipos, validadores y servicio
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 3. Crear hooks React Query
  - [x] 3.1 Implementar hooks de datos
    - Crear `credit-scoring/src/features/payment-instructions/hooks/usePaymentInstructions.ts`
    - Implementar `usePaymentAccounts()`: query que lista cuentas (filtradas por RLS según rol)
    - Implementar `useCreatePaymentAccount()`: mutation para crear cuenta con invalidación de cache
    - Implementar `useDisablePaymentAccount()`: mutation para deshabilitar cuenta con invalidación de cache
    - Reutilizar `useRole` de `@/features/fx-transactions/hooks/useRole`
    - _Requerimientos: 1.1, 3.1, 4.1, 4.2_

  - [ ]* 3.2 Escribir tests unitarios para hooks
    - Testear con mocks del servicio que las queries y mutations se comportan correctamente
    - Verificar invalidación de cache tras crear y deshabilitar
    - _Requerimientos: 1.1, 3.1_

- [x] 4. Implementar componentes de UI
  - [x] 4.1 Crear componente AccountCatalogTable
    - Crear `credit-scoring/src/features/payment-instructions/components/AccountCatalogTable.tsx`
    - Props: `accounts`, `isAdmin`, `onDisable`
    - Admin ve todas las cuentas con columnas: Account Number, Account Name, SWIFT, Bank Name, Bank Address, Tipo de Cambio, Estado, Acciones (botón deshabilitar solo en activas)
    - Broker ve solo cuentas activas sin columna Estado ni Acciones
    - Cuentas deshabilitadas con indicador visual de estado
    - _Requerimientos: 4.1, 4.2, 3.2, 3.3_

  - [x] 4.2 Crear componente CreateAccountModal
    - Crear `credit-scoring/src/features/payment-instructions/components/CreateAccountModal.tsx`
    - Props: `isOpen`, `onClose`, `onSuccess`
    - Campos: Account Number, Account Name, SWIFT, Bank Name, Bank Address
    - Checkboxes para Tipo de Cambio (USD, MXN, EUR, etc.)
    - Validación client-side usando `validateCreateAccountForm` antes de envío
    - Mostrar errores de validación inline por campo
    - Mostrar error de duplicado desde el servicio
    - _Requerimientos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_

  - [x] 4.3 Crear página PaymentInstructionsPage
    - Crear `credit-scoring/src/features/payment-instructions/pages/PaymentInstructionsPage.tsx`
    - Usar `usePaymentAccounts()` para obtener datos
    - Usar `useRole()` para determinar permisos
    - Mostrar botón "Nueva Cuenta" solo para admin
    - Renderizar `AccountCatalogTable` con datos y permisos
    - Controlar apertura/cierre de `CreateAccountModal`
    - Manejar acción de deshabilitar con confirmación
    - _Requerimientos: 4.1, 4.2, 5.3, 5.4, 1.6, 3.4_

  - [ ]* 4.4 Escribir tests unitarios de componentes
    - Verificar que admin ve botón "Nueva Cuenta" y broker no
    - Verificar que admin ve columna Estado y control Deshabilitar, broker no
    - Verificar que modal muestra errores de validación correctamente
    - Verificar que cuenta deshabilitada muestra indicador visual
    - _Requerimientos: 4.1, 4.2, 5.3, 5.4_

- [x] 5. Checkpoint - Verificar componentes y hooks
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

- [x] 6. Integración con navegación y routing
  - [x] 6.1 Agregar ruta y entrada de navegación
    - Modificar `credit-scoring/src/App.tsx`: agregar ruta `payment-instructions` dentro del `ProtectedRoute` y `CreditScoringLayout`, accesible para ambos roles (admin y broker)
    - Modificar `credit-scoring/src/features/credit-scoring/pages/CreditScoringLayout.tsx`: agregar entrada "Payment Instructions" al array `NAV_ITEMS` con icono `CreditCard` de lucide-react, visible para ambos roles
    - _Requerimientos: 5.1, 5.2_

  - [ ]* 6.2 Escribir tests de integración de navegación
    - Verificar que la ruta `/payment-instructions` es accesible para admin y broker
    - Verificar que el enlace aparece en el menú lateral para ambos roles
    - _Requerimientos: 5.1, 5.2_

- [x] 7. Crear script SQL para base de datos
  - [x] 7.1 Crear script de migración SQL
    - Crear `credit-scoring/src/features/payment-instructions/sql/migration.sql`
    - Incluir CREATE TABLE `pi_accounts` con todos los campos, constraints y índices según el diseño
    - Incluir políticas RLS: `broker_read_active`, `admin_insert`, `admin_disable_only`
    - Incluir trigger `prevent_data_field_update` para inmutabilidad de campos de datos
    - Habilitar RLS en la tabla
    - _Requerimientos: 6.1, 6.2, 6.3, 6.5, 2.2_

- [ ] 8. Tests de propiedades adicionales
  - [ ]* 8.1 Escribir test de propiedad para cuentas deshabilitadas excluidas de listados activos
    - **Propiedad 5: Cuentas deshabilitadas excluidas de listados activos**
    - Generar conjuntos mixtos de cuentas activas y deshabilitadas, filtrar por activas, verificar que ninguna cuenta con `is_active = false` aparece en los resultados
    - **Valida: Requerimiento 3.3**

  - [ ]* 8.2 Escribir test de propiedad para creación produce registro activo
    - **Propiedad 3: Creación produce registro activo con timestamp**
    - Generar datos válidos de cuenta, crear con mock del servicio, verificar que el registro resultante tiene `is_active = true` y `created_at` no nulo
    - **Valida: Requerimiento 1.1**

- [x] 9. Checkpoint final - Verificar integración completa
  - Asegurar que todos los tests pasan, preguntar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requerimientos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los tests de propiedades validan propiedades universales de correctitud definidas en el diseño
- Se reutiliza el hook `useRole` existente de `fx-transactions` para consistencia
- La Propiedad 4 (inmutabilidad) se valida a nivel de base de datos con el trigger SQL y no requiere test de propiedad en frontend
