# Documento de Requerimientos — Payment Instructions (Xending Capital)

## Introducción

El módulo de Payment Instructions proporciona un catálogo de cuentas bancarias para depósito dentro de la plataforma Xending Capital. Permite a los Administradores crear y deshabilitar cuentas bancarias que contienen información de depósito (Account Number, Account Name, SWIFT, Bank Name, Bank Address y tipo de cambio). Las cuentas son inmutables una vez creadas: no se permite editar su información, solo deshabilitarlas. Los usuarios regulares (Brokers) pueden consultar el catálogo de cuentas activas pero no pueden crear ni deshabilitar cuentas. El módulo se integra como una nueva opción en el menú principal de la aplicación.

## Glosario

- **Sistema_PI**: Módulo de Payment Instructions dentro de la plataforma Xending Capital que gestiona el catálogo de cuentas bancarias para depósito.
- **Cuenta_Bancaria**: Registro que representa una cuenta de depósito con los campos: Account Number, Account Name, SWIFT, Bank Name, Bank Address y Tipo de Cambio.
- **Account_Number**: Número identificador único de la cuenta bancaria.
- **Account_Name**: Nombre del titular o alias de la cuenta bancaria.
- **SWIFT**: Código SWIFT/BIC del banco (entre 8 y 11 caracteres alfanuméricos) que identifica a la institución financiera internacionalmente.
- **Bank_Name**: Nombre de la institución bancaria donde se encuentra la cuenta.
- **Bank_Address**: Dirección física de la sucursal o sede del banco.
- **Tipo_de_Cambio**: Clasificación de la moneda o tipo de cambio asociado a la cuenta (por ejemplo: USD, MXN, EUR).
- **Administrador**: Usuario con rol "admin" que tiene permiso para crear y deshabilitar cuentas bancarias en el catálogo.
- **Broker**: Usuario con rol "broker" que puede consultar el catálogo de cuentas activas pero no puede crear ni deshabilitar cuentas.
- **Catálogo_Cuentas**: Vista de tabla accesible desde el menú principal que lista las cuentas bancarias con sus datos y estado.
- **Supabase**: Plataforma de backend que provee base de datos PostgreSQL, autenticación y Row Level Security (RLS).

## Requerimientos

### Requerimiento 1: Creación de cuentas bancarias

**User Story:** Como Administrador, quiero crear nuevas cuentas bancarias en el catálogo de Payment Instructions, de modo que estén disponibles como opciones de depósito para las operaciones.

#### Criterios de Aceptación

1. WHEN el Administrador envía el formulario de creación con Account Number, Account Name, SWIFT, Bank Name, Bank Address y Tipo de Cambio, THE Sistema_PI SHALL crear un registro de Cuenta_Bancaria con estado activo y la fecha de creación.
2. WHEN el Administrador ingresa el campo SWIFT, THE Sistema_PI SHALL validar que el código contenga entre 8 y 11 caracteres alfanuméricos antes de permitir el envío.
3. WHEN el Administrador ingresa el campo Account Number, THE Sistema_PI SHALL validar que el campo no esté vacío y contenga únicamente caracteres alfanuméricos.
4. IF el Administrador envía el formulario sin completar alguno de los campos obligatorios (Account Number, Account Name, Bank Name, Bank Address, Tipo de Cambio), THEN THE Sistema_PI SHALL mostrar mensajes de validación indicando los campos requeridos faltantes.
5. WHEN el Administrador intenta crear una Cuenta_Bancaria con un Account Number que ya existe en el catálogo, THE Sistema_PI SHALL rechazar la creación indicando "Ya existe una cuenta con este número de cuenta".
6. IF un usuario con rol Broker intenta acceder al formulario de creación de cuentas, THEN THE Sistema_PI SHALL denegar el acceso y mostrar un mensaje de permisos insuficientes.
7. El Administrador debe seleccionar de una lista de checkbox Tipo de cambio que esa cuenta tendra activo

### Requerimiento 2: Inmutabilidad de cuentas bancarias

**User Story:** Como Administrador, quiero que las cuentas bancarias no puedan ser editadas una vez creadas, de modo que se garantice la integridad de la información de depósito.

#### Criterios de Aceptación

1. THE Sistema_PI SHALL impedir la modificación de cualquier campo de una Cuenta_Bancaria después de su creación (Account Number, Account Name, SWIFT, Bank Name, Bank Address, Tipo de Cambio).
2. THE Sistema_PI SHALL aplicar la restricción de inmutabilidad tanto a nivel de interfaz de usuario (sin botón de edición) como a nivel de base de datos (sin permitir UPDATE en los campos de datos de la cuenta).
3. WHEN un usuario consulta el detalle de una Cuenta_Bancaria, THE Sistema_PI SHALL mostrar todos los campos en modo de solo lectura sin opción de edición.

### Requerimiento 3: Deshabilitación de cuentas bancarias

**User Story:** Como Administrador, quiero deshabilitar cuentas bancarias que ya no deben utilizarse, de modo que dejen de aparecer como opciones activas sin perder el registro histórico.

#### Criterios de Aceptación

1. WHEN el Administrador activa el control de deshabilitar sobre una Cuenta_Bancaria activa, THE Sistema_PI SHALL marcar la Cuenta_Bancaria como deshabilitada registrando la fecha de deshabilitación y el identificador del Administrador que ejecutó la acción.
2. WHILE una Cuenta_Bancaria está deshabilitada, THE Sistema_PI SHALL mostrarla en el Catálogo_Cuentas con un indicador visual de estado deshabilitado.
3. WHILE una Cuenta_Bancaria está deshabilitada, THE Sistema_PI SHALL excluirla de cualquier selector o listado de cuentas activas disponibles para operaciones.
4. IF un usuario con rol Broker intenta deshabilitar una Cuenta_Bancaria, THEN THE Sistema_PI SHALL denegar la operación y mostrar un mensaje de permisos insuficientes.
5. THE Sistema_PI SHALL conservar el registro completo de las cuentas deshabilitadas en la base de datos sin permitir su eliminación física.

### Requerimiento 4: Catálogo de cuentas bancarias

**User Story:** Como usuario, quiero ver un listado de cuentas bancarias con su información y estado, de modo que pueda consultar las cuentas disponibles para depósito.

#### Criterios de Aceptación

1. WHEN el Administrador accede al Catálogo_Cuentas, THE Sistema_PI SHALL mostrar todas las cuentas bancarias (activas y deshabilitadas) en una tabla con las columnas: Account Number, Account Name, SWIFT, Bank Name, Bank Address, Tipo de Cambio, Estado y un control para Deshabilitar (visible solo para cuentas activas).
2. WHEN el Broker accede al Catálogo_Cuentas, THE Sistema_PI SHALL mostrar únicamente las cuentas bancarias con estado activo, con las columnas: Account Number, Account Name, SWIFT, Bank Name, Bank Address y Tipo de Cambio, sin mostrar el control de Deshabilitar.
3. THE Sistema_PI SHALL mostrar el Catálogo_Cuentas como una opción accesible desde el menú principal de navegación de la aplicación con el nombre "Payment Instructions".
4. WHEN el usuario accede al Catálogo_Cuentas, THE Sistema_PI SHALL ordenar las cuentas activas primero y las deshabilitadas después, ambas en orden descendente por fecha de creación.

### Requerimiento 5: Navegación y acceso al módulo

**User Story:** Como usuario, quiero acceder al catálogo de Payment Instructions desde el menú principal, de modo que pueda consultar las cuentas de depósito de forma rápida.

#### Criterios de Aceptación

1. THE Sistema_PI SHALL agregar una entrada "Payment Instructions" en el menú de navegación principal de la aplicación, visible para usuarios con rol Administrador y Broker.
2. WHEN el usuario selecciona "Payment Instructions" en el menú, THE Sistema_PI SHALL navegar a la ruta `/payment-instructions` y mostrar el Catálogo_Cuentas.
3. WHEN el Administrador accede a la ruta `/payment-instructions`, THE Sistema_PI SHALL mostrar un botón "Nueva Cuenta" que permita acceder al formulario de creación.
4. WHEN el Broker accede a la ruta `/payment-instructions`, THE Sistema_PI SHALL ocultar el botón "Nueva Cuenta".

### Requerimiento 6: Permisos y control de acceso

**User Story:** Como Administrador, quiero que el sistema restrinja las acciones del módulo Payment Instructions según el rol del usuario, de modo que solo los Administradores puedan crear y deshabilitar cuentas.

#### Criterios de Aceptación

1. THE Sistema_PI SHALL aplicar Row Level Security (RLS) en la tabla de cuentas bancarias de modo que el Broker solo pueda leer cuentas con estado activo.
2. THE Sistema_PI SHALL permitir al Administrador leer todos los registros de cuentas bancarias (activas y deshabilitadas) sin restricción.
3. THE Sistema_PI SHALL permitir únicamente al Administrador ejecutar las acciones de: crear cuentas bancarias y deshabilitar cuentas bancarias.
4. IF un usuario sin rol Administrador intenta ejecutar una acción restringida (crear o deshabilitar cuentas), THEN THE Sistema_PI SHALL denegar la operación y mostrar un mensaje de permisos insuficientes.
5. THE Sistema_PI SHALL impedir operaciones UPDATE sobre los campos de datos de las cuentas bancarias a nivel de política de base de datos, permitiendo únicamente la actualización del campo de estado (activo/deshabilitado) por parte del Administrador.
