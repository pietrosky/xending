<!-- 1. Registro de Empresas
    1.1 Razon social
    1.2 RFC
    1.3 Teléfono
    1.4 Direccion Fiscal
    1.5 Cuentas de Pago ( a donde pagamos "cliente")
    1.6 Cuentas de Cobro ( a donde nos pagan "Xending" )
2. Registro de Transacciones
/** 3. Recordatorios de Pagos **/
4. Registros de Transacciones
5. PDF -> descargar


Registro de Cliente
    1.- Scory
        1.1 Agregar Columna de Xending Sync solo usuarios especificos
Transacciones
    2.- Captura de operacion
        2.1- PDF -> descargar
        2.2 Datos de PDF
            2.2.1 Razon social
            2.2.2 RFC
            2.2.3 Teléfono
            2.2.4 Direccion Fiscal
            2.2.5 Cuentas de Pago ( a donde pagamos "cliente")
            2.2.6 Cuentas de Cobro ( a donde nos pagan "Xending" )
    3.- Pago de Cliente "Concilacion Banco" -
        - Adjunto Archivos
            -- Comprobante de Cliente
            -- Extracto Bancario LEMA -
    4.- Liberacion de Pago por Admin
    5.- Comprobante de Pago Bancario, Marcado como copletado


    ### Opciones de Menu

    - Registro de Empresas
    - Catalogo de Empresas
    - Registro de Transacciones
    - Historial de Transacciones


    ### Usuarios que interactuan

    - Administrador
    - Broker -->


# Requerimientos por Vista

## Registro de Empresas

### Campos Disponibles:
- Broker
    1. Razon social
    1. RFC 
    1. Teléfono
    1. Direccion Fiscal
    1. Cuentas de Pago ( a donde pagamos "cliente") (CABLE)

### Estructura de base de datos
    - cs_companies
    - cs_companies_owners
        Tabla relación con cs_companies.id y auth.users


### Permisos de CRUD
    - Administrador puede hacer CRUD a todas las Emrpesas
    - Broker puede hacer CRU a las empresas que el dio de alta
        
### Archivo
    - un schema archive, debe ser creado para que en cada actualizacion de cs_companies, se guarde una copia antes de realizar los cambios con el usuario y la fecha en que se realizaron los cambios
    
## Registro de Transacciones

### Campos Disponibles:
- Busqueda de empresa, se puede encontrar por **Razon Social** o por **RFC**
    -  Al seleccionar una de las empresas del listado de sugerencias por búsqueda, que no estén deshabilitadas se llenan los siguientes campos que no pueden ser editados
    1. Razon social
    1. RFC 
    1. Teléfono
    1. Direccion Fiscal
    1. Cuentas de Pago ( a donde pagamos "cliente") (CABLE mask: [0-9]{3}-[0-9]{3}-[0-9]{11}-[0-9]{1})
- Buys (Currrency Mask con prefijo USD)
- Exchange Rate (Decimal number 4 digitos de prescicion)
- Pays (display only) Buys * Exchange Rate que cambia con cualquier cambio en ambos campos
- Orden de Pago - PDF basado en: Confirmacion-XG-25-0032.pdf, disponible después de generar el folio de Transacción
- Autorizado - fecha y que administrador autorizó
- Comprobante - disponible después de ser autorizado, archivo adjunto imagen o PDF con drag and drop field, y progreso de carga

## Catálogo de Empresas

- Administrador: puede ver todas las empresa
- Broker: solo puede crear, ver y editar sus propias empresas, relación cs_companies_owners
- Esta vista mostrará una tabla con los siquientes campos:
    - Razon Social
    - RFC
    - Broker (visible Administrador)
    - Total transacciones (Suma de USD)
    - Última Transacción
    - Deshabilitar (visible Administrador) marcar como deshabilitados para Broker

## Catálogo Transacciones
- Administrador: puede ver todas las transacciones
    - Agrupadas entre:
        - No Autorizadas, en Orden ASC de creación para encontrar las más urgentes antes (siempre visible)
        - Autorizadas sin comprobante en Orden ASC de creación (siempre visible)
        - Historial / Autorizadas con comprobante
- Esta vista mostrará una tabla con los siquientes campos:
    - Razon Social
    - RFC
    - Broker (visible Administrador)
    - Tipo de Cambio
    - Buys USD prefijo con Formato Currency
    - Tipo de Cambio
    - Pays MXP prefijo con Formato Currency
    - Fecha
    - Orden de Pago liga PDF
    - Autorizada (Fecha)
    - Autorizo (Admin User Name)
    - Comprobante - Liga


# Formatos y máscaras de campos
- Basado en credit-scoring\src\features\credit-scoring\utils\inputMasks.ts
    1. RFC
    1. Telefono
    1. CLABE: 
        ```typescript
        [0-9]{3}-[0-9]{3}-[0-9]{11}-[0-9]{1}
        ```