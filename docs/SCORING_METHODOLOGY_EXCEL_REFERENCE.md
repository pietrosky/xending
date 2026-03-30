# 📊 Referencia Completa — Metodología de Scoring (Extraída de Excels)

> **Fuentes originales:**
> - `SCORIG OTORGAMIENTO ESPECIF PROYECT 0825_Entregable.xlsx` (6 hojas)
> - `Flujo Operativo de Otorgamiento de Crédito.xlsx` (10 hojas)
>
> **Fecha de extracción:** Marzo 2026
> **Propósito:** Documentar toda la metodología para que no sea necesario volver a leer los Excels.

---

## 1. SCORING INTERNO — Modelo de 2 Capas (1800 pts total)

### 1.1 Capa 1: SCORING DE SOLVENCIA (1300 pts máximo)

13 variables, cada una vale 100 puntos máximo:

| # | Variable | Pts Max | Descripción |
|---|----------|---------|-------------|
| 1 | Antigüedad del negocio | 100 | Mínimo 2 años |
| 2 | Giro del negocio | 100 | Tipo de actividad económica |
| 3 | Zona / Ubicación | 100 | Ubicación geográfica de la empresa |
| 4 | Enfoque del crédito | 100 | Capital de trabajo, instalaciones, equipamiento |
| 5 | Documentos básicos de identificación | 100 | CURP, INE, comprobante domicilio |
| 6 | Acta Constitutiva, poderes, asambleas | 100 | Documentos legales corporativos |
| 7 | Constancia de situación fiscal (empresa + accionista) | 100 | SAT constancia |
| 8 | Comprobante de domicilio empresa | 100 | Reciente |
| 9 | Estados Financieros (3 cierres + periodo en curso) | 100 | Análisis financiero completo |
| 10 | Declaraciones anuales (3 periodos) | 100 | SAT declaraciones |
| 11 | Tabla de pasivos financieros | 100 | Deudas actuales |
| 12 | Relación patrimonial principal accionista | 100 | Patrimonio personal |
| 13 | Copia acta de matrimonio principal accionista | 100 | Estado civil |

**Ejemplo del Excel:** Score = 1030/1300 (variables 11 y 13 en 0, variable 7 en 50, variable 6 en 90, variable 9 en 90)

---

### 1.2 Sub-variables Detalladas por Variable

#### Variable 1: Antigüedad del negocio
| Condición | Puntos |
|-----------|--------|
| > 1 año (más de 12 meses) | 100 |
| 11-12 meses | 80 |
| ≤ 10 meses | 70 |

#### Variable 2: Giro del negocio (Catálogo)
| Giro | Puntos |
|------|--------|
| Construcción | 100 |
| Manufactura | 100 |
| Transporte | 100 |
| Comercial | 100 |
| Industrial | 100 |
| Servicios | 100 |

> Nota: Todos los giros listados dan 100. Giros no listados = 0.

#### Variable 3: Zona / Ubicación (Catálogo)
| Zona | Puntos |
|------|--------|
| Fronteriza | 100 |
| Zona comercial | 90 |
| Zona industrial | 100 |

#### Variable 4: Enfoque del crédito
| Enfoque | Puntos |
|---------|--------|
| Capital de Trabajo | 100 |
| Instalaciones | 100 |
| Equipamiento | 100 |

#### Variable 5: Documentos básicos de identificación
| Documento | Puntos |
|-----------|--------|
| CURP | 25 |
| INE (Identificación oficial) | 25 |
| Comprobante domicilio empresa | 25 |
| Comprobante domicilio persona | 25 |
| **Total si presenta todos** | **100** |

#### Variable 6: Acta Constitutiva y poderes
| Condición | Puntos |
|-----------|--------|
| Con inscripción en Registro Público de Comercio | 100 |
| Poderes vigentes con inscripción | 100 |
| Sin inscripción en Registro Público | 80 |
| Asambleas con cambios de capital | 85 |

> Se toma el valor según la mejor condición que aplique.

#### Variable 7: Constancia de situación fiscal
| Componente | Puntos |
|------------|--------|
| Constancia empresa | 50 |
| Constancia accionista principal | 50 |
| **Total si presenta ambas** | **100** |

#### Variable 8: Comprobante de domicilio empresa
| Condición | Puntos |
|-----------|--------|
| Presenta (reciente) | 100 |
| No presenta | 0 |

#### Variable 9: Estados Financieros
Sub-variables de análisis financiero (cada una vale 20% del total = 20 pts):

| Sub-variable | Peso | Pts Max |
|-------------|------|---------|
| Análisis Vertical | 20% | 20 |
| Análisis Horizontal | 20% | 20 |
| Análisis de Apalancamiento | 20% | 20 |
| Análisis de Liquidez | 20% | 20 |
| Análisis de Rentabilidad | 20% | 20 |
| **Total** | **100%** | **100** |

#### Variable 10: Declaraciones anuales
| Condición | Puntos |
|-----------|--------|
| Presenta (últimos 3 periodos) | 100 |
| No presenta | 0 |

#### Variable 11: Tabla de pasivos financieros
| Condición | Puntos |
|-----------|--------|
| Presenta | 100 |
| No presenta | 0 |

#### Variable 12: Relación patrimonial principal accionista
| Condición | Puntos |
|-----------|--------|
| Presenta | 100 |
| No presenta | 0 |

#### Variable 13: Acta de matrimonio principal accionista
| Condición | Puntos |
|-----------|--------|
| Presenta | 100 |
| No presenta | 0 |

---

### 1.3 Capa 2: SCORING COMBINADO (1800 pts total)

Distribución por categoría del segundo Excel:

| # | Categoría | Pts Max | Descripción |
|---|-----------|---------|-------------|
| 1 | Información del solicitante | 700 | Datos de la empresa y representante |
| 2 | Fuentes de Información | 600 | Documentos y fuentes verificables |
| 3 | Estado de Resultados | 200 | Análisis de P&L |
| 4 | Indicadores Financieros | 200 | Razones financieras |
| 5 | Historial Crediticio (Buró) | 100 | Score de Buró de Crédito |
| **Total** | | **1800** | |

**Decisión:** score/1800 → si ≥ 60% (≥1080 pts) = **Aprobado**

---

#### Categoría 1: Información del Solicitante (700 pts)
| Campo | Pts Max |
|-------|---------|
| Razón Social | 100 |
| RFC | 100 |
| Representante Legal | 100 |
| Contacto | 100 |
| Giro | 100 |
| Antigüedad | 100 |
| Ubicación | 100 |
| **Total** | **700** |

Ejemplo del Excel: 690/700 (Ubicación = 90)

#### Categoría 2: Fuentes de Información (600 pts)
| Fuente | Pts Max |
|--------|---------|
| ID Oficial (INE) | 100 |
| Comprobante de Domicilio | 100 |
| Acta Constitutiva | 100 |
| Reporte Buró de Crédito | 100 |
| Estados de Cuenta | 100 |
| Constancia Fiscal | 100 |
| **Total** | **600** |

Ejemplo del Excel: 400/600 (Acta Constitutiva = 0, Estados de Cuenta = 0)

---

## 2. INDICADORES FINANCIEROS — Rangos de Scoring

### 2.1 Utilidad Bruta (margen)
| Rango | Puntos |
|-------|--------|
| 1% - 10% | 0 |
| 11% - 20% | 50 |
| 21% - 30% | 50 |
| 31% - 40% | 80 |
| 41% - 50% | 90 |
| > 50% | 100 |

### 2.2 Utilidad de Operación (margen)
| Rango | Puntos |
|-------|--------|
| 1% - 10% | 50 |
| 11% - 20% | 50 |
| 21% - 30% | 70 |
| 31% - 40% | 80 |
| 41% - 50% | 100 |
| > 50% | 100 |

### 2.3 Razón de Liquidez (current ratio)
| Nivel | Rango | Puntos |
|-------|-------|--------|
| Baja | 0 - 1.0 | 30 |
| Media | 1.1 - 1.5 | 70 |
| Alta | 1.5 - 2.5 | 100 |

### 2.4 Margen de Utilidad Operativa
| Nivel | Rango | Puntos |
|-------|-------|--------|
| Baja | 0% - 9% | 30 |
| Promedio | 10% - 15% | 70 |
| Fuerte | 16% - 20% | 90 |
| Excelente | > 21% | 100 |

### 2.5 Score de Buró de Crédito
| Nivel | Rango | Puntos |
|-------|-------|--------|
| Baja | 0 - 600 | 40 |
| Media | 601 - 700 | 90 |
| Alta | 701+ | 100 |

---

## 3. MATRIZ DE RIESGO — Clasificación por Score

### 3.1 Rangos de Riesgo
| Rango Score | Clasificación | Garantía Requerida |
|-------------|---------------|-------------------|
| < 652 | Riesgo Alto | Aval + Garantía |
| 652 - 680 | Riesgo Medio Alto | Aval + Garantía |
| 681 - 700 | Riesgo Medio Bajo | Solo Garantía |
| 701+ | Riesgo Bajo | No Aplica |

### 3.2 Matriz de Riesgo por Porcentaje (% del monto)
Porcentajes de línea de crédito según score y monto:

| Score \ % | 20-24% | 25-30% | 31-39% | 40-49% | 50-60% | 61-70% | 71-80% | 81-90% |
|-----------|--------|--------|--------|--------|--------|--------|--------|--------|
| < 652 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 652-680 | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| 681-700 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 701+ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 3.3 Montos de Línea de Crédito (MXN)
| Rango Monto | Descripción |
|-------------|-------------|
| $500,000 - $1,500,000 | Línea pequeña |
| $1,500,000 - $3,000,000 | Línea media-baja |
| $3,000,000 - $4,500,000 | Línea media |
| $4,500,000 - $6,000,000 | Línea media-alta |
| $6,000,000 - $7,500,000 | Línea alta |
| $7,500,000 - $10,000,000 | Línea máxima |

### 3.4 Plazos Disponibles
| Plazo (días) |
|-------------|
| 15 |
| 20 |
| 25 |
| 30 |
| 35 |
| 40 |
| 45 |

---

## 4. PÉRDIDA ESPERADA (PE)

### 4.1 Fórmula
```
PE = PD × EAD × LGD
```

Donde:
- **PD** = Probabilidad de Default (individual, basada en días de atraso)
- **EAD** = Exposure at Default = Saldo Utilizado
- **LGD** = Loss Given Default = **0.40 (40%)** para todos (supuesto estándar)

### 4.2 Tabla de PD por Días de Atraso
| Días de Atraso | PD (Probabilidad de Default) |
|----------------|------------------------------|
| 0 días (al corriente) | 2% |
| 1-30 días | 5% |
| 31-60 días | 10% |
| 61-90 días | 25% |
| 91-120 días | 50% |
| 121-180 días | 75% |
| > 180 días | 100% |

> Nota: Los rangos exactos del Excel mostraban clientes con 0-30 días y PD entre 2%-10%.
> La tabla anterior es la interpolación estándar CNBV para SOFOM ENR.

### 4.3 Ejemplo del Excel (Portafolio)
| Métrica | Valor |
|---------|-------|
| EAD Total (Saldo Utilizado) | $15,150,000 MXN |
| PE Total | $410,840 MXN |
| PE % del portafolio | 2.71% |

### 4.4 Cálculo por Cliente (ejemplo)
```
Cliente A:
  Saldo Utilizado (EAD) = $3,000,000
  Días de atraso = 0
  PD = 2%
  LGD = 40%
  PE = $3,000,000 × 0.02 × 0.40 = $24,000

Cliente B:
  Saldo Utilizado (EAD) = $1,500,000
  Días de atraso = 45
  PD = 10%
  LGD = 40%
  PE = $1,500,000 × 0.10 × 0.40 = $60,000
```

---

## 5. PLD / CNBV — Requerimientos (Para Fase 6D)

Extraído de la hoja "PLD Software" del segundo Excel.

### Módulo A: KYC (Conoce a tu Cliente)
- Identificación completa del cliente
- Verificación de identidad
- Perfil transaccional

### Módulo B: Listas Oficiales + PEPs
- OFAC (Office of Foreign Assets Control)
- ONU (Naciones Unidas)
- UE (Unión Europea)
- FinCEN (Financial Crimes Enforcement Network)
- Interpol
- PEPs (Personas Políticamente Expuestas)

### Módulo C: Monitoreo de Operaciones
- Operaciones ≥ $10,000 USD equivalente
- Alertas automáticas
- Detección de patrones inusuales
- Operaciones fraccionadas

### Módulo D: Reportes CNBV/UIF
- Formato XML compatible con SITI
- Reportes de operaciones relevantes
- Reportes de operaciones inusuales
- Reportes de operaciones preocupantes

### Módulo E: Auditoría y Control
- Bitácora inalterable (inmutable)
- Retención mínima: 10 años
- Control de acceso por roles PLD
- Trazabilidad completa

### Módulo F: Capacitación
- Documentación de capacitación PLD
- Registro de cursos y asistencia

---

## 6. FLUJO OPERATIVO COMPLETO (Resumen del Segundo Excel)

### Hojas del Excel "Flujo Operativo":
1. **Scoring de Otorgamiento** — Modelo combinado 1800 pts (sección 1.3 arriba)
2. **Solicitud de Crédito** — Campos del formulario con scoring interno
3. **Análisis Financiero** — Scoring de indicadores financieros
4. **Despegables** — Rangos y valores para dropdowns (sección 2 arriba)
5. **PE** — Pérdida Esperada (sección 4 arriba)
6. **PLD Software** — Requerimientos CNBV (sección 5 arriba)
7. **Hojas adicionales** — Formatos, plantillas, flujos operativos internos

---

## 7. MAPEO: Variables del Excel → Datos del Sistema

### Datos que ya tenemos (de Syntage/SAT/Buró):
| Variable Excel | Fuente en Sistema |
|---------------|-------------------|
| RFC | `PreFilterInput.rfc` |
| Antigüedad | `PreFilterInput.declared_business_age` + verificación SAT |
| Giro del negocio | Constancia de situación fiscal (Syntage `getTaxStatuses()`) |
| Zona/Ubicación | Dirección fiscal (Syntage `getAddresses()`) |
| Estados Financieros | Syntage Insights (`getBalanceSheet()`, `getIncomeStatement()`, `getFinancialRatios()`) |
| Declaraciones anuales | Syntage Fiscal (`getTaxReturns()`) |
| Score Buró | Syntage Buró (`getBuroReports()`) → `toScorePyME()` |
| Constancia fiscal | Syntage Fiscal (`getTaxStatuses()`) |
| Utilidad Bruta | Syntage Insights (`getIncomeStatement()`) |
| Utilidad Operación | Syntage Insights (`getIncomeStatement()`) |
| Razón de Liquidez | Syntage Insights (`getFinancialRatios()`) |
| Margen Utilidad Operativa | Syntage Insights (`getFinancialRatios()`) |

### Datos que requieren input del solicitante:
| Variable Excel | Fuente |
|---------------|--------|
| Documentos de identificación (CURP, INE) | Upload del solicitante |
| Acta Constitutiva | Upload del solicitante |
| Comprobante domicilio | Upload del solicitante |
| Tabla de pasivos | Upload del solicitante |
| Relación patrimonial | Upload del solicitante |
| Acta de matrimonio | Upload del solicitante |
| Estados de cuenta bancarios | Upload del solicitante |

---

> **Este documento es la referencia definitiva.** No es necesario volver a leer los Excels.
> Cualquier implementación de scoring debe basarse en estos datos.
