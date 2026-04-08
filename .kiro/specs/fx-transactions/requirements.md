# Documento de Requerimientos — Transacciones FX (Xending Capital)

## Introducción

El módulo de Transacciones FX gestiona el ciclo completo de operaciones de compra-venta de divisas en Xending Capital. Incluye el registro y catálogo de empresas (clientes/brokers), el registro y catálogo de transacciones FX, generación de órdenes de pago en PDF, flujo de autorización por administrador y carga de comprobantes. El sistema opera con dos roles: Administrador (acceso total) y Broker (acceso limitado a sus propias empresas). Se integra con la tabla existente `cs_companies` y extiende el modelo de datos con campos específicos para FX (dirección fiscal, cuentas CLABE, relación broker-empresa).

## Glosario

- **Sistema_FX**: Módulo de transacciones de compra-venta de divisas dentro de la plataforma Xending Capital.
- **Empresa**: Registro en la tabla `cs_companies` que representa a un cliente de Xending Capital con razón social, RFC, teléfono, dirección fiscal y cuentas de pago CLABE.
- **Broker**: Usuario con rol "broker" que registra y gestiona sus propias empresas y transacciones. Relación definida en `cs_companies_owners`.
- **Administrador**: Usuario con rol "admin" que tiene acceso completo a todas las empresas y transacciones, puede autorizar transacciones y deshabilitar empresas.
- **Transacción_FX**: Registro de una operación de compra de divisas que incluye empresa, monto en USD (Buys), tipo de cambio (Exchange Rate), monto en MXN (Pays), folio, estado de autorización y comprobante.
- **Folio**: Identificador único de una Transacción_FX con formato secuencial generado al momento de crear la transacción.
- **Orden_de_Pago**: Documento PDF generado a partir de la plantilla `Confirmacion-XG-25-0032.pdf` con los datos de la Transacción_FX, disponible después de generar el Folio.
- **Comprobante**: Archivo adjunto (imagen o PDF) que evidencia el pago realizado, cargado mediante drag-and-drop después de la autorización.
- **CLABE**: Clave Bancaria Estandarizada de 18 dígitos con máscara de visualización `[0-9]{3}-[0-9]{3}-[0-9]{11}-[0-9]{1}`.
- **Catálogo_Empresas**: Vista de tabla que lista empresas con filtros según el rol del usuario.
- **Catálogo_Transacciones**: Vista de tabla que lista transacciones agrupadas por estado de autorización y comprobante.
- **Archivo_Histórico**: Schema `archive` en la base de datos que almacena copias de `cs_companies` antes de cada actualización, con el usuario y fecha del cambio.
- **cs_companies_owners**: Tabla de relación entre `cs_companies.id` y `auth.users` que define qué Broker es dueño de qué Empresa.
- **maskClabe**: Función de máscara posicional para campos CLABE que formatea la entrada como `NNN-NNN-NNNNNNNNNNN-N` (18 dígitos).
- **Supabase**: Plataforma de backend que provee base de datos PostgreSQL, autenticación, storage y Row Level Security (RLS).
- **InputMasks_Module**: Módulo reutilizable en `credit-scoring/src/features/credit-scoring/utils/inputMasks.ts` que exporta funciones de máscara y validación (maskRfc, maskPhone, RFC_3_REGEX, RFC_4_REGEX).

## Requerimientos

### Requerimiento 1: Registro de empresas

**User Story:** Como Broker, quiero registrar nuevas empresas con sus datos fiscales y cuentas de pago, de modo que pueda crear transacciones FX asociadas a esas empresas.

#### Criterios de Aceptación

1. WHEN el Broker envía el formulario de registro con razón social, RFC, teléfono, dirección fiscal y al menos una cuenta de pago CLABE, THE Sistema_FX SHALL crear un registro en `cs_companies` y una relación en `cs_companies_owners` vinculando la Empresa al Broker que la registró.
2. WHEN el Broker ingresa un RFC, THE Sistema_FX SHALL aplicar la función maskRfc existente en InputMasks_Module para filtrar caracteres inválidos en tiempo real y validar contra RFC_3_REGEX (persona moral, 12 caracteres) o RFC_4_REGEX (persona física, 13 caracteres) antes de permitir el envío.
3. WHEN el Broker ingresa un teléfono, THE Sistema_FX SHALL aplicar la función maskPhone existente en InputMasks_Module para formatear la entrada como "NN NNNN NNNN" (10 dígitos).
4. WHEN el Broker ingresa una cuenta de pago CLABE, THE Sistema_FX SHALL aplicar la función maskClabe para formatear la entrada como "NNN-NNN-NNNNNNNNNNN-N" (18 dígitos) y validar que contenga exactamente 18 dígitos numéricos.
5. WHEN el Broker intenta registrar una Empresa con un RFC que ya existe en `cs_companies`, THE Sistema_FX SHALL rechazar el registro indicando "Ya existe una empresa con este RFC".
6. THE Sistema_FX SHALL permitir registrar múltiples cuentas de pago CLABE por Empresa.
7. WHEN el Administrador accede al formulario de registro de empresas, THE Sistema_FX SHALL permitir el registro con los mismos campos y validaciones que el Broker.
8. WHEN el Administrador accede al formulario de registro de empresas, puede agregar usuarios para que tengan acceso a esta empresa

### Requerimiento 2: Edición de empresas

**User Story:** Como Broker, quiero editar los datos de las empresas que registré, de modo que pueda mantener la información actualizada.

#### Criterios de Aceptación

1. WHEN el Broker solicita editar una Empresa, THE Sistema_FX SHALL verificar que existe una relación en `cs_companies_owners` entre la Empresa y el Broker antes de permitir la edición.
2. WHEN el Broker o Administrador modifica cualquier campo de una Empresa, THE Sistema_FX SHALL guardar una copia del registro anterior en el Archivo_Histórico (schema `archive`) con el identificador del usuario que realizó el cambio y la fecha del cambio, antes de aplicar la actualización.
3. WHEN el Administrador solicita editar cualquier Empresa, THE Sistema_FX SHALL permitir la edición sin restricción de propiedad.
4. THE Sistema_FX SHALL aplicar las mismas validaciones de máscara (maskRfc, maskPhone, maskClabe) durante la edición que durante el registro.
5. IF el Broker intenta editar una Empresa que no le pertenece, THEN THE Sistema_FX SHALL denegar la operación y mostrar un mensaje de acceso denegado.

### Requerimiento 3: Archivo histórico de empresas

**User Story:** Como Administrador, quiero que cada cambio en los datos de una empresa quede registrado con el usuario y la fecha, de modo que exista trazabilidad completa de modificaciones.

#### Criterios de Aceptación

1. THE Sistema_FX SHALL crear un schema `archive` en la base de datos con una tabla `archive.cs_companies` que replique la estructura de `cs_companies` más los campos `archived_by` (UUID del usuario) y `archived_at` (timestamp del cambio).
2. WHEN se ejecuta un UPDATE sobre un registro de `cs_companies`, THE Sistema_FX SHALL insertar una copia del registro previo al cambio en `archive.cs_companies` con el `archived_by` y `archived_at` correspondientes.
3. THE tabla `archive.cs_companies` SHALL permitir únicamente operaciones INSERT, sin permitir UPDATE ni DELETE.
4. WHEN el Administrador consulta el historial de una Empresa, THE Sistema_FX SHALL retornar todos los registros de `archive.cs_companies` para esa Empresa ordenados por `archived_at` en orden descendente.

### Requerimiento 4: Catálogo de empresas

**User Story:** Como usuario, quiero ver un listado de empresas con información resumida y acciones según mi rol, de modo que pueda gestionar las empresas de forma eficiente.

#### Criterios de Aceptación

1. WHEN el Administrador accede al Catálogo_Empresas, THE Sistema_FX SHALL mostrar todas las empresas en una tabla con las columnas: Razón Social, RFC, Broker (nombre del usuario propietario), Total Transacciones (suma de USD de todas las Transacciones_FX), Última Transacción (fecha) y un control para Deshabilitar.
2. WHEN el Broker accede al Catálogo_Empresas, THE Sistema_FX SHALL mostrar únicamente las empresas vinculadas al Broker en `cs_companies_owners`, con las columnas: Razón Social, RFC, Total Transacciones (suma de USD), Última Transacción (fecha), sin mostrar la columna Broker ni el control Deshabilitar.
3. WHEN el Administrador activa el control Deshabilitar sobre una Empresa, THE Sistema_FX SHALL marcar la Empresa como deshabilitada de modo que el Broker no pueda seleccionarla para nuevas transacciones.
4. WHILE una Empresa está deshabilitada, THE Sistema_FX SHALL mostrarla en el Catálogo_Empresas con indicador visual de estado deshabilitado.
5. WHILE una Empresa está deshabilitada, THE Sistema_FX SHALL impedir que sea seleccionada en el buscador del formulario de Registro de Transacciones.
6. WHEN el Administrador reactiva una Empresa deshabilitada, THE Sistema_FX SHALL restaurar la Empresa a estado activo y permitir su selección en nuevas transacciones.

### Requerimiento 5: Registro de transacciones FX

**User Story:** Como Broker, quiero registrar una transacción de compra de divisas seleccionando una empresa y capturando el monto y tipo de cambio, de modo que se genere un folio y una orden de pago.

#### Criterios de Aceptación

1. WHEN el usuario inicia el registro de una Transacción_FX, THE Sistema_FX SHALL mostrar un campo de búsqueda que permita encontrar empresas por Razón Social o RFC, mostrando sugerencias en tiempo real.
2. WHEN el usuario selecciona una Empresa del listado de sugerencias, THE Sistema_FX SHALL llenar automáticamente los campos no editables: Razón Social, RFC, Teléfono, Dirección Fiscal y Cuentas de Pago (CLABE con máscara).
3. WHILE una Empresa está deshabilitada, THE Sistema_FX SHALL excluirla de los resultados de búsqueda en el formulario de registro de transacciones.
4. WHEN el usuario ingresa el campo Buys, THE Sistema_FX SHALL aplicar formato de moneda con prefijo "USD" y separadores de miles.
5. WHEN el usuario ingresa el campo Exchange Rate, THE Sistema_FX SHALL aceptar un número decimal con exactamente 4 dígitos de precisión.
6. WHEN el usuario modifica el campo Buys o el campo Exchange Rate, THE Sistema_FX SHALL recalcular y mostrar el campo Pays (display only) como el producto de Buys multiplicado por Exchange Rate, con prefijo "MXN" y formato de moneda, en tiempo real.
7. WHEN el usuario envía el formulario con todos los campos válidos, THE Sistema_FX SHALL crear un registro de Transacción_FX con un Folio secuencial único, estado "no autorizada" y la fecha de creación.
8. IF el usuario envía el formulario sin seleccionar una Empresa o sin completar Buys o Exchange Rate, THEN THE Sistema_FX SHALL mostrar mensajes de validación indicando los campos requeridos faltantes.

### Requerimiento 6: Orden de pago PDF

**User Story:** Como Broker, quiero descargar la orden de pago en PDF después de generar el folio de la transacción, de modo que pueda compartirla con el cliente.

#### Criterios de Aceptación

1. WHEN una Transacción_FX tiene un Folio asignado, THE Sistema_FX SHALL habilitar el enlace de descarga de la Orden_de_Pago en formato PDF.
2. THE Sistema_FX SHALL generar la Orden_de_Pago basándose en la plantilla `Confirmacion-XG-25-0032.pdf`, incluyendo: Folio, Razón Social, RFC, Dirección Fiscal, Cuenta de Pago CLABE, monto Buys (USD), Exchange Rate, monto Pays (MXN) y fecha de la transacción.
3. WHILE una Transacción_FX no tiene Folio asignado, THE Sistema_FX SHALL deshabilitar el enlace de descarga de la Orden_de_Pago.

### Requerimiento 7: Autorización de transacciones

**User Story:** Como Administrador, quiero autorizar transacciones pendientes, de modo que se confirme la operación y se habilite la carga del comprobante de pago.

#### Criterios de Aceptación

1. WHEN el Administrador autoriza una Transacción_FX, THE Sistema_FX SHALL registrar la fecha de autorización y el identificador del Administrador que autorizó.
2. WHEN una Transacción_FX es autorizada, THE Sistema_FX SHALL habilitar el campo de carga de Comprobante para esa transacción.
3. WHILE una Transacción_FX no está autorizada, THE Sistema_FX SHALL deshabilitar el campo de carga de Comprobante.
4. THE Sistema_FX SHALL permitir únicamente a usuarios con rol Administrador ejecutar la acción de autorización.
5. IF un usuario con rol Broker intenta autorizar una Transacción_FX, THEN THE Sistema_FX SHALL denegar la operación.

### Requerimiento 8: Carga de comprobante

**User Story:** Como usuario, quiero adjuntar el comprobante de pago a una transacción autorizada, de modo que quede evidencia del pago realizado.

#### Criterios de Aceptación

1. WHEN el usuario arrastra o selecciona un archivo (imagen o PDF) sobre el campo de Comprobante de una Transacción_FX autorizada, THE Sistema_FX SHALL iniciar la carga del archivo a Supabase Storage y mostrar una barra de progreso.
2. WHEN la carga del Comprobante finaliza exitosamente, THE Sistema_FX SHALL vincular la URL del archivo al registro de la Transacción_FX y mostrar un enlace de descarga.
3. IF la carga del Comprobante falla, THEN THE Sistema_FX SHALL mostrar un mensaje de error y permitir reintentar la carga.
4. THE Sistema_FX SHALL aceptar únicamente archivos de tipo imagen (JPEG, PNG) o PDF con un tamaño máximo de 10 MB para el Comprobante.
5. IF el usuario intenta cargar un archivo con formato no soportado o que excede 10 MB, THEN THE Sistema_FX SHALL rechazar el archivo indicando el motivo.

### Requerimiento 9: Catálogo de transacciones

**User Story:** Como usuario, quiero ver un listado de transacciones agrupadas por estado, de modo que pueda identificar rápidamente las transacciones pendientes de autorización o comprobante.

#### Criterios de Aceptación

1. WHEN el Administrador accede al Catálogo_Transacciones, THE Sistema_FX SHALL mostrar todas las transacciones agrupadas en tres secciones: "No Autorizadas" (orden ascendente por fecha de creación, siempre visible), "Autorizadas sin Comprobante" (orden ascendente por fecha de creación, siempre visible) e "Historial" (autorizadas con comprobante).
2. WHEN el Broker accede al Catálogo_Transacciones, THE Sistema_FX SHALL mostrar únicamente las transacciones asociadas a empresas vinculadas al Broker en `cs_companies_owners`, con las mismas agrupaciones.
3. THE Sistema_FX SHALL mostrar en la tabla las columnas: Razón Social, RFC, Buys (USD con formato moneda), Tipo de Cambio, Pays (MXN con formato moneda), Fecha, Orden de Pago (enlace PDF), Autorizada (fecha), Autorizó (nombre del Administrador) y Comprobante (enlace).
4. WHEN el Administrador accede al Catálogo_Transacciones, THE Sistema_FX SHALL mostrar adicionalmente la columna Broker (nombre del usuario propietario de la empresa).
5. WHEN el Broker accede al Catálogo_Transacciones, THE Sistema_FX SHALL ocultar la columna Broker.
6. THE Sistema_FX SHALL mostrar las secciones "No Autorizadas" y "Autorizadas sin Comprobante" siempre expandidas, y la sección "Historial" colapsable.

### Requerimiento 10: Máscara CLABE

**User Story:** Como desarrollador, quiero agregar la función maskClabe al módulo de máscaras existente, de modo que se reutilice en todos los formularios que requieran entrada de CLABE.

#### Criterios de Aceptación

1. THE InputMasks_Module SHALL exportar una función `maskClabe` que acepte una cadena de texto y retorne la cadena formateada como "NNN-NNN-NNNNNNNNNNN-N" (18 dígitos con guiones en posiciones 3, 6 y 17).
2. THE función maskClabe SHALL filtrar todos los caracteres no numéricos de la entrada.
3. THE función maskClabe SHALL limitar la entrada a un máximo de 18 dígitos.
4. THE InputMasks_Module SHALL exportar una constante `CLABE_REGEX` con el patrón `/^\d{3}-\d{3}-\d{11}-\d{1}$/` para validación del formato completo.
5. FOR ALL cadenas de 18 dígitos numéricos, aplicar maskClabe y luego extraer los dígitos del resultado SHALL producir la cadena original de 18 dígitos (propiedad round-trip).

### Requerimiento 11: Permisos y control de acceso

**User Story:** Como Administrador, quiero que el sistema restrinja las acciones según el rol del usuario, de modo que los Brokers solo accedan a sus propias empresas y no puedan autorizar transacciones.

#### Criterios de Aceptación

1. THE Sistema_FX SHALL aplicar Row Level Security (RLS) en `cs_companies` de modo que el Broker solo pueda leer y modificar empresas vinculadas a su usuario en `cs_companies_owners`.
2. THE Sistema_FX SHALL aplicar Row Level Security (RLS) en la tabla de transacciones de modo que el Broker solo pueda leer transacciones asociadas a sus empresas.
3. THE Sistema_FX SHALL permitir al Administrador leer y modificar todos los registros de empresas y transacciones sin restricción.
4. THE Sistema_FX SHALL permitir únicamente al Administrador ejecutar las acciones de: autorizar transacciones, deshabilitar empresas y ver la columna Broker en los catálogos.
5. THE Sistema_FX SHALL permitir al Broker crear empresas, editar sus propias empresas, crear transacciones y cargar comprobantes en transacciones autorizadas de sus empresas.
6. IF un usuario sin rol Administrador intenta ejecutar una acción restringida a Administrador, THEN THE Sistema_FX SHALL denegar la operación y mostrar un mensaje de permisos insuficientes.
