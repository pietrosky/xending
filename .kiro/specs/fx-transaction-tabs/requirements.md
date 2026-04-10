# Documento de Requerimientos — Tabs Compra/Venta USD en Registro de Transacción FX

## Introducción

Este documento define los requerimientos para modificar el formulario de Registro de Transacción FX en Xending Capital. Actualmente, el usuario selecciona la dirección de la operación (compra o venta de USD) mediante un dropdown (`<select>`) en el campo "Xending Compra". Este cambio reemplaza el dropdown por un sistema de tabs con dos opciones: "Compra USD" y "Vender USD". Adicionalmente, el tipo de cambio siempre se expresará en MXP (pesos mexicanos por dólar), aplicando una conversión interna `1 / Tipo_de_Cambio` cuando la operación es de venta de USD, de modo que el usuario siempre capture el tipo de cambio en la misma unidad sin importar la dirección de la operación.

## Glosario

- **Sistema_FX**: Módulo de transacciones de compra-venta de divisas dentro de la plataforma Xending Capital.
- **TransactionForm**: Componente React (`TransactionForm.tsx`) que renderiza el formulario de registro y edición de transacciones FX.
- **Tab_Operación**: Control de interfaz con dos pestañas mutuamente excluyentes ("Compra USD" y "Vender USD") que reemplaza al dropdown de selección de moneda de compra.
- **Tipo_de_Cambio**: Valor numérico decimal con 4 dígitos de precisión que representa el precio en pesos mexicanos (MXP) por un dólar estadounidense (USD).
- **Conversión_Inversa**: Fórmula `1 / Tipo_de_Cambio` aplicada internamente cuando el usuario selecciona la pestaña "Vender USD", para convertir el tipo de cambio expresado en MXP a su equivalente inverso para el cálculo correcto de montos.
- **TC_Base**: Tipo de cambio base capturado por el usuario, siempre expresado en MXP.
- **TC_Markup**: Tipo de cambio con margen aplicado por el broker, siempre expresado en MXP.
- **Monto_Compra**: Cantidad en la moneda que Xending compra (USD en pestaña "Compra USD", USD en pestaña "Vender USD" donde Xending vende USD al cliente).
- **Monto_Pago**: Cantidad calculada en la moneda opuesta, resultado de aplicar el tipo de cambio al Monto_Compra.
- **CreateTransactionInput**: Interfaz TypeScript que define los datos enviados al servicio de creación de transacciones, incluyendo `buys_currency`, `pays_currency`, `base_rate`, `markup_rate` y `exchange_rate`.

## Requerimientos

### Requerimiento 1: Reemplazo del dropdown por tabs de operación

**User Story:** Como Broker, quiero seleccionar el tipo de operación (compra o venta de USD) mediante pestañas visibles en lugar de un dropdown, de modo que la dirección de la operación sea más clara e intuitiva.

#### Criterios de Aceptación

1. THE TransactionForm SHALL mostrar un Tab_Operación con dos pestañas mutuamente excluyentes: "Compra USD" y "Vender USD", en lugar del dropdown `<select>` actual para selección de moneda.
2. WHEN el formulario se carga en modo creación, THE TransactionForm SHALL seleccionar la pestaña "Compra USD" como valor predeterminado.
3. WHEN el usuario selecciona la pestaña "Compra USD", THE TransactionForm SHALL configurar `buys_currency` como "USD" y `pays_currency` como "MXN" en el modelo de datos.
4. WHEN el usuario selecciona la pestaña "Vender USD", THE TransactionForm SHALL configurar `buys_currency` como "MXN" y `pays_currency` como "USD" en el modelo de datos.
5. WHEN el formulario se carga en modo edición con una transacción existente, THE TransactionForm SHALL seleccionar la pestaña correspondiente según el valor de `buys_currency` de la transacción: "Compra USD" si `buys_currency` es "USD", "Vender USD" si `buys_currency` es "MXN".
6. WHILE el formulario está en modo solo lectura (`readOnly`), THE TransactionForm SHALL mostrar el Tab_Operación con la pestaña activa visible pero sin permitir cambio de pestaña.
7. THE Tab_Operación SHALL ser accesible mediante teclado, permitiendo navegación con las teclas Tab y activación con Enter o Espacio, e incluir los atributos ARIA `role="tablist"`, `role="tab"` y `aria-selected`.

### Requerimiento 2: Tipo de cambio siempre en MXP

**User Story:** Como Broker, quiero capturar el tipo de cambio siempre en pesos mexicanos por dólar, de modo que no tenga que hacer conversiones mentales al registrar operaciones de venta de USD.

#### Criterios de Aceptación

1. THE TransactionForm SHALL mostrar las etiquetas de TC_Base y TC_Markup con la indicación "(MXP por USD)" independientemente de la pestaña seleccionada.
2. WHEN el usuario captura TC_Base y TC_Markup en la pestaña "Compra USD", THE TransactionForm SHALL usar los valores capturados directamente como `base_rate`, `markup_rate` y `exchange_rate` en el CreateTransactionInput.
3. WHEN el usuario captura TC_Base y TC_Markup en la pestaña "Vender USD", THE TransactionForm SHALL aplicar la Conversión_Inversa (`1 / valor_capturado`) a TC_Base y TC_Markup antes de asignarlos a `base_rate`, `markup_rate` y `exchange_rate` en el CreateTransactionInput.
4. WHEN el usuario captura TC_Base y TC_Markup en la pestaña "Vender USD", THE TransactionForm SHALL almacenar internamente los valores invertidos sin mostrar la conversión al usuario.
5. IF el usuario ingresa un Tipo_de_Cambio igual a cero en la pestaña "Vender USD", THEN THE TransactionForm SHALL mostrar un mensaje de validación "Tipo de cambio debe ser mayor a 0" y no intentar la Conversión_Inversa.

### Requerimiento 3: Cálculo de montos según pestaña activa

**User Story:** Como Broker, quiero que el monto a pagar se calcule correctamente según la dirección de la operación, de modo que los valores mostrados reflejen la transacción real.

#### Criterios de Aceptación

1. WHEN la pestaña "Compra USD" está activa y el usuario modifica Monto_Compra o TC_Markup, THE TransactionForm SHALL calcular Monto_Pago como `Monto_Compra × TC_Markup` y mostrarlo con prefijo "MXN" y formato de moneda.
2. WHEN la pestaña "Vender USD" está activa y el usuario modifica Monto_Compra o TC_Markup, THE TransactionForm SHALL calcular Monto_Pago como `Monto_Compra × TC_Markup` (donde TC_Markup es el valor capturado en MXP, sin invertir para el cálculo de display) y mostrarlo con prefijo "MXN" y formato de moneda.
3. WHEN el usuario cambia de pestaña, THE TransactionForm SHALL recalcular Monto_Pago en tiempo real con los valores actuales de Monto_Compra y TC_Markup.
4. THE TransactionForm SHALL mostrar la etiqueta del campo de monto de compra como "Compra (USD)" cuando la pestaña "Compra USD" está activa, y como "Vende (USD)" cuando la pestaña "Vender USD" está activa.
5. THE TransactionForm SHALL mostrar la etiqueta del campo de monto de pago como "Paga (MXN)" cuando la pestaña "Compra USD" está activa, y como "Recibe (MXN)" cuando la pestaña "Vender USD" está activa.

### Requerimiento 4: Consistencia de datos con el modelo existente

**User Story:** Como desarrollador, quiero que los datos enviados al servicio de creación de transacciones mantengan compatibilidad con el modelo existente, de modo que no se requieran cambios en la base de datos ni en los servicios backend.

#### Criterios de Aceptación

1. THE TransactionForm SHALL enviar el CreateTransactionInput con la misma estructura de campos existente: `company_id`, `payment_account_id`, `buys_currency`, `buys_usd`, `base_rate`, `markup_rate`, `exchange_rate` y `pays_currency`.
2. WHEN la pestaña "Compra USD" está activa, THE TransactionForm SHALL enviar `buys_currency: "USD"`, `pays_currency: "MXN"`, y los tipos de cambio tal como fueron capturados.
3. WHEN la pestaña "Vender USD" está activa, THE TransactionForm SHALL enviar `buys_currency: "MXN"`, `pays_currency: "USD"`, y los tipos de cambio con la Conversión_Inversa aplicada.
4. FOR ALL transacciones creadas con la pestaña "Vender USD", aplicar la Conversión_Inversa al `exchange_rate` almacenado y luego aplicar la Conversión_Inversa nuevamente SHALL producir el valor original capturado por el usuario con una tolerancia de ±0.0001 (propiedad round-trip de la inversión).
5. THE TransactionForm SHALL preservar el comportamiento existente de validación de markup negativo: el campo `markup_rate` enviado al servicio (después de la Conversión_Inversa si aplica) debe cumplir la regla de que brokers no pueden tener markup negativo.

### Requerimiento 5: Experiencia visual del Tab_Operación

**User Story:** Como usuario, quiero que las pestañas de operación sean visualmente claras y consistentes con el diseño de la plataforma, de modo que pueda identificar rápidamente qué tipo de operación estoy registrando.

#### Criterios de Aceptación

1. THE Tab_Operación SHALL mostrar la pestaña activa con un estilo visual diferenciado (fondo sólido con color primario de la plataforma y texto blanco) y la pestaña inactiva con estilo secundario (fondo transparente con borde y texto en color de texto estándar).
2. THE Tab_Operación SHALL ocupar el ancho completo del contenedor del formulario, con cada pestaña ocupando el 50% del ancho disponible.
3. WHEN el usuario pasa el cursor sobre la pestaña inactiva, THE TransactionForm SHALL mostrar un efecto hover con cambio de color de fondo sutil.
4. THE Tab_Operación SHALL posicionarse antes de los campos de la sección "Datos de la Operación", reemplazando la posición actual del dropdown de moneda dentro del campo "Xending Compra".
