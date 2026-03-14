---
inclusion: always
---

# 🧹 PROCESO DE DEBUGGING LIMPIO - REGLA OBLIGATORIA

## 🚨 REGLA CRÍTICA: DEBUGGING TEMPORAL CON LIMPIEZA AUTOMÁTICA

Cuando hagas debugging de cualquier problema, SIEMPRE seguir este proceso:

### 📋 **FASE 1: DEBUGGING TEMPORAL**

1. **🏷️ MARCAR TODOS LOS LOGS TEMPORALES:**
   ```javascript
   // 🔍 DEBUG-TEMP: [DESCRIPCIÓN DEL PROBLEMA]
   console.log('🔍 DEBUG-TEMP: USD→MXN data:', data);
   ```

2. **📝 DOCUMENTAR QUÉ ESTÁS DEBUGGEANDO:**
   - Siempre usar el prefijo `🔍 DEBUG-TEMP:` 
   - Incluir descripción clara del problema
   - Usar emojis consistentes para fácil identificación

3. **🎯 LOGS ESPECÍFICOS Y ÚTILES:**
   - No logs genéricos, solo datos relevantes al problema
   - Incluir contexto suficiente para entender el flujo
   - Mostrar valores antes y después de transformaciones

### 📋 **FASE 2: IDENTIFICACIÓN Y FIX**

1. **🔍 ANALIZAR RESULTADOS:**
   - Identificar exactamente dónde está el problema
   - Confirmar la causa raíz
   - Proponer solución específica

2. **🔧 APLICAR FIX MÍNIMO:**
   - Solo cambiar lo necesario para resolver el problema
   - No hacer refactors grandes durante debugging
   - Mantener la lógica existente que funciona

### 📋 **FASE 3: LIMPIEZA AUTOMÁTICA (OBLIGATORIA)**

1. **🧹 BUSCAR Y ELIMINAR TODOS LOS LOGS TEMPORALES:**
   ```bash
   # Buscar todos los logs temporales
   grep -r "DEBUG-TEMP" src/
   ```

2. **✅ VERIFICAR LIMPIEZA COMPLETA:**
   - Confirmar que NO quedan logs temporales
   - Verificar que el fix funciona sin los logs
   - Hacer commit limpio sin debugging code

3. **📝 DOCUMENTAR LA SOLUCIÓN:**
   - Explicar qué se encontró y cómo se arregló
   - No incluir detalles del proceso de debugging
   - Solo la solución final y el razonamiento

## 🎯 **EJEMPLO DE PROCESO CORRECTO:**

### **Debugging Temporal:**
```javascript
// 🔍 DEBUG-TEMP: USD→MXN mapping issue
console.log('🔍 DEBUG-TEMP: realQuotedData:', realQuotedData);
console.log('🔍 DEBUG-TEMP: toCurrency vs fromCurrency:', { toCurrency, fromCurrency });
console.log('🔍 DEBUG-TEMP: amount vs cost:', { amount: realQuotedData.amount, cost: realQuotedData.cost });
```

### **Fix Aplicado:**
```javascript
// ✅ FIX: Use correct field for BOUGHT amount
const boughtAmount = realQuotedData.amount; // Was using wrong field
```

### **Limpieza Final:**
```javascript
// Código limpio sin logs temporales
const boughtAmount = realQuotedData.amount;
```

## ⚠️ **NUNCA HAGAS ESTO:**

❌ Dejar logs temporales en el código final
❌ Hacer commits con código de debugging
❌ Usar console.log sin el prefijo DEBUG-TEMP durante debugging
❌ Hacer múltiples cambios mientras debuggeas

## ✅ **SIEMPRE HAZ ESTO:**

✅ Marcar TODOS los logs temporales con `🔍 DEBUG-TEMP:`
✅ Limpiar completamente antes del commit final
✅ Verificar que el fix funciona sin los logs
✅ Documentar solo la solución final, no el proceso

## 🔄 **FLUJO AUTOMÁTICO:**

1. **Agregar logs temporales** → Identificar problema → **Aplicar fix** → **Limpiar logs** → **Commit limpio**

2. **Al final de cada debugging session, SIEMPRE preguntar:**
   - "¿Eliminé todos los logs DEBUG-TEMP?"
   - "¿El código funciona sin los logs?"
   - "¿Está el commit limpio?"

---

**RECUERDA: El código de producción debe estar siempre limpio. El debugging es temporal, la solución es permanente.**