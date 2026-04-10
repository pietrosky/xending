# Plan de Implementación: Tabs Compra/Venta USD en Registro de Transacción FX

## Resumen

Implementación incremental del reemplazo del dropdown de selección de moneda por un componente de tabs ("Compra USD" / "Vender USD") en el formulario de transacciones FX. Se crean primero las utilidades de conversión con sus tests de propiedades, luego el componente OperationTabs, y finalmente se integra todo en TransactionForm.

## Tareas

- [x] 1. Crear módulo de utilidades `fxConversion`
  - [x] 1.1 Crear archivo `credit-scoring/src/features/fx-transactions/utils/fxConversion.ts` con las funciones: `invertRate`, `computePaysAmount`, `transformRatesForSubmit`, `deriveTabFromCurrency`, `getCurrenciesForTab`
    - Importar tipo `OperationTab` (definir como `'buy' | 'sell'`) y `FXCurrency` desde `transaction.types.ts`
    - `invertRate(rate)`: retorna `1 / rate` redondeado a 4 decimales con `Math.round(x * 10000) / 10000`. Precondición: `rate > 0`
    - `computePaysAmount(amount, rate)`: retorna `amount × rate` redondeado a 2 decimales
    - `transformRatesForSubmit(tab, baseRate, markupRate)`: si `tab === 'buy'` retorna rates sin modificar; si `tab === 'sell'` retorna `invertRate(baseRate)`, `invertRate(markupRate)` y `exchange_rate = invertRate(markupRate)`
    - `deriveTabFromCurrency(buysCurrency)`: `'USD' → 'buy'`, `'MXN' → 'sell'`
    - `getCurrenciesForTab(tab)`: `'buy' → { buys: 'USD', pays: 'MXN' }`, `'sell' → { buys: 'MXN', pays: 'USD' }`
    - _Requerimientos: 2.2, 2.3, 2.4, 3.1, 3.2, 4.2, 4.3, 4.4_

  - [ ]* 1.2 Instalar `fast-check` como dependencia de desarrollo
    - Ejecutar `npm install -D fast-check` en el directorio `credit-scoring/`
    - _Requerimientos: Estrategia de Testing del diseño_

  - [ ]* 1.3 Escribir test de propiedad: Round-trip de inversión del tipo de cambio
    - Crear archivo `credit-scoring/src/features/fx-transactions/utils/fxConversion.test.ts`
    - **Propiedad 1: Round-trip de la inversión del tipo de cambio**
    - Para cualquier `rate > 0`, `invertRate(invertRate(rate))` debe ser igual a `rate` con tolerancia ±0.0001
    - Usar `fc.double({ min: 0.0001, max: 100, noNaN: true })`, mínimo 100 iteraciones
    - **Valida: Requerimiento 4.4**

  - [ ]* 1.4 Escribir test de propiedad: Transformación de rates según pestaña
    - En el mismo archivo `fxConversion.test.ts`
    - **Propiedad 2: Transformación de rates según pestaña**
    - Para `baseRate > 0` y `markupRate > 0`: pestaña `'buy'` retorna rates sin modificar; pestaña `'sell'` retorna `1/baseRate` y `1/markupRate`
    - **Valida: Requerimientos 2.2, 2.3, 4.2, 4.3**

  - [ ]* 1.5 Escribir test de propiedad: Cálculo de monto a pagar
    - En el mismo archivo `fxConversion.test.ts`
    - **Propiedad 3: Cálculo de monto a pagar**
    - Para `amount > 0` y `rate > 0`, `computePaysAmount(amount, rate)` retorna `amount × rate` redondeado a 2 decimales
    - **Valida: Requerimientos 3.1, 3.2**

  - [ ]* 1.6 Escribir test de propiedad: Preservación de validación de markup negativo tras inversión
    - En el mismo archivo `fxConversion.test.ts`
    - **Propiedad 4: Preservación de markup negativo tras inversión**
    - Para `baseRate > 0` y `markupRate > 0` donde `markupRate < baseRate`, después de `transformRatesForSubmit('sell', ...)`, el `markup_rate` resultante debe ser mayor que `base_rate` resultante
    - **Valida: Requerimiento 4.5**

  - [ ]* 1.7 Escribir tests unitarios para `deriveTabFromCurrency` y `getCurrenciesForTab`
    - En el mismo archivo `fxConversion.test.ts`
    - `deriveTabFromCurrency('USD')` retorna `'buy'`, `deriveTabFromCurrency('MXN')` retorna `'sell'`
    - `getCurrenciesForTab('buy')` retorna `{ buysCurrency: 'USD', paysCurrency: 'MXN' }`, y viceversa para `'sell'`
    - _Requerimientos: 1.3, 1.4, 1.5_

- [x] 2. Checkpoint — Verificar utilidades
  - Asegurar que todos los tests pasan ejecutando `npx vitest run` en `credit-scoring/`. Preguntar al usuario si surgen dudas.

- [x] 3. Crear componente `OperationTabs`
  - [x] 3.1 Crear archivo `credit-scoring/src/features/fx-transactions/components/OperationTabs.tsx`
    - Exportar tipo `OperationTab = 'buy' | 'sell'` y la interfaz `OperationTabsProps { activeTab, onChange, disabled? }`
    - Renderizar contenedor con `role="tablist"` y dos botones con `role="tab"`, `aria-selected`, y manejo de `onClick`
    - Soportar navegación por teclado: Tab para foco, Enter/Espacio para activar
    - Cuando `disabled === true`, no permitir cambio de pestaña (modo readOnly)
    - Estilos con Tailwind: pestaña activa con fondo primario (`bg-[hsl(213,67%,25%)]`) y texto blanco; inactiva con borde y fondo transparente; hover sutil en inactiva
    - Cada pestaña ocupa 50% del ancho (`w-1/2`)
    - Labels: "Compra USD" para `'buy'`, "Vender USD" para `'sell'`
    - _Requerimientos: 1.1, 1.2, 1.6, 1.7, 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.2 Escribir tests unitarios para `OperationTabs`
    - Crear archivo `credit-scoring/src/features/fx-transactions/components/OperationTabs.test.tsx`
    - Verificar que renderiza dos pestañas con labels "Compra USD" y "Vender USD"
    - Verificar atributos ARIA: `role="tablist"`, `role="tab"`, `aria-selected`
    - Verificar que click en pestaña inactiva llama `onChange` con el tab correcto
    - Verificar que `disabled=true` no permite cambio de pestaña
    - _Requerimientos: 1.1, 1.6, 1.7, 5.1_

- [x] 4. Integrar `OperationTabs` en `TransactionForm`
  - [x] 4.1 Reemplazar el dropdown `<select>` de moneda por `<OperationTabs>` en `credit-scoring/src/features/fx-transactions/components/TransactionForm.tsx`
    - Importar `OperationTabs` y `OperationTab` desde `./OperationTabs`
    - Importar funciones de `../utils/fxConversion`
    - Agregar estado `activeTab: OperationTab` inicializado con `deriveTabFromCurrency(initialData?.buys_currency ?? 'USD')`
    - Reemplazar el bloque del `<select>` de moneda (dentro de "Xending Compra") por `<OperationTabs activeTab={activeTab} onChange={handleTabChange} disabled={readOnly} />`
    - Posicionar `OperationTabs` antes de los campos de "Datos de la Operación", fuera del grid de campos
    - _Requerimientos: 1.1, 1.2, 1.5, 5.4_

  - [x] 4.2 Implementar `handleTabChange` y actualizar etiquetas dinámicas
    - `handleTabChange(tab)`: actualizar `activeTab`, `buysCurrency` y `paysCurrency` usando `getCurrenciesForTab(tab)`, y recalcular `paysDisplay`
    - Cambiar label del campo de monto de compra: "Compra (USD)" cuando `activeTab === 'buy'`, "Vende (USD)" cuando `activeTab === 'sell'`
    - Cambiar label del campo de monto de pago: "Paga (MXN)" cuando `activeTab === 'buy'`, "Recibe (MXN)" cuando `activeTab === 'sell'`
    - Agregar indicación "(MXP por USD)" a las etiquetas de TC Base y TC Markup, independientemente de la pestaña
    - _Requerimientos: 2.1, 3.3, 3.4, 3.5_

  - [x] 4.3 Modificar `handleSubmit` para aplicar conversión inversa
    - Antes de construir `CreateTransactionInput`, llamar `transformRatesForSubmit(activeTab, baseRate, markupRate)` para obtener `base_rate`, `markup_rate` y `exchange_rate` transformados
    - Agregar validación: si `activeTab === 'sell'` y (`baseRate === 0` o `markupRate === 0`), mostrar error "Tipo de cambio debe ser mayor a 0" y no intentar la inversión
    - Enviar `buys_currency` y `pays_currency` según la pestaña activa
    - Mantener la estructura existente de `CreateTransactionInput` sin cambios
    - _Requerimientos: 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3_

  - [ ]* 4.4 Escribir tests unitarios para la integración de `TransactionForm`
    - Crear archivo `credit-scoring/src/features/fx-transactions/components/TransactionForm.test.tsx`
    - Verificar que en modo creación la pestaña "Compra USD" está seleccionada por defecto
    - Verificar que en modo edición con `buys_currency: 'MXN'` se selecciona "Vender USD"
    - Verificar que labels dinámicos cambian al cambiar de pestaña
    - Verificar que labels TC muestran "(MXP por USD)" en ambas pestañas
    - Verificar que `readOnly` muestra tabs pero no permite cambio
    - Verificar que submit con pestaña "Vender USD" aplica conversión inversa a los rates
    - Verificar validación de TC = 0 en pestaña "Vender USD"
    - _Requerimientos: 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.3, 2.5, 3.4, 3.5, 4.1, 4.2, 4.3_

- [x] 5. Checkpoint final — Verificar integración completa
  - Asegurar que todos los tests pasan ejecutando `npx vitest run` en `credit-scoring/`. Preguntar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requerimientos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los tests de propiedades validan propiedades universales de correctitud con `fast-check`
- Los tests unitarios validan ejemplos específicos y casos borde
- No se requieren cambios en backend, servicios ni en la interfaz `CreateTransactionInput`
