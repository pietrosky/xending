import type { InfoPopupData } from '../components/InfoPopup';

// ============================================================
// Engine descriptions (16 analysis + decision engines)
// ============================================================

export const ENGINE_INFO: Record<string, InfoPopupData> = {
  compliance: {
    title: 'Compliance Engine (Gate)',
    subtitle: 'FUENTE: SCORY API (PLD/KYC)',
    whatIs: 'Valida que la empresa no aparezca en listas negras (OFAC, PEPs, 69B, SYGER, RUG). Verifica identidad, domicilio, geolocalizacion y consistencia del giro. Es un gate: si no pasa, se rechaza automaticamente.',
    impact: 'Si este motor detecta un hard stop, la solicitud se rechaza sin pasar a los demas motores. Es la primera linea de defensa contra fraude y lavado de dinero.',
  },
  sat_facturacion: {
    title: 'SAT / Facturacion Engine (14%)',
    subtitle: 'FUENTE: SYNTAGE API (CFDIs)',
    whatIs: 'Analiza las facturas emitidas y recibidas del SAT para determinar ventas reales, concentracion de clientes, cancelaciones, y consistencia fiscal. Compara declaraciones vs facturacion real.',
    impact: 'Representa el 14% del score consolidado. Una alta tasa de cancelacion o discrepancia SAT vs declaraciones genera alertas criticas que pueden reducir el monto aprobado.',
  },
  buro: {
    title: 'Buro de Credito Engine (10%)',
    subtitle: 'FUENTE: SYNTAGE API (SCORE PYME)',
    whatIs: 'Evalua el historial crediticio: Score PyME, creditos activos, liquidados, consultas recientes, calificacion de cartera y deteccion de rotacion de deuda (pedir prestado para pagar otro prestamo).',
    impact: 'Representa el 10% del score. La rotacion de deuda es una senal critica: si se detecta, puede activar un hard stop o reducir drasticamente el monto aprobado.',
  },
  financial: {
    title: 'Financial Engine (11%)',
    subtitle: 'FUENTE: BALANCE + ESTADO DE RESULTADOS',
    whatIs: 'Analiza estados financieros: razones de liquidez (prueba acida, razon corriente), apalancamiento (deuda/capital), rentabilidad (ROE, ROA, margen neto) y eficiencia operativa.',
    impact: 'Representa el 11% del score. Una prueba acida baja (<1.0) indica riesgo de liquidez. Un apalancamiento alto (>3x) sugiere sobredeuda que limita capacidad de pago.',
  },
  cashflow: {
    title: 'CashFlow Engine (16%)',
    subtitle: 'FUENTE: SAT + FINANCIAL + BURO',
    whatIs: 'Calcula el flujo de caja libre (FCF = EBITDA - CAPEX - Delta Working Capital - Impuestos) y el DSCR (Debt Service Coverage Ratio = FCF / Servicio de Deuda). Es el motor mas importante del sistema.',
    impact: 'Representa el 16% del score (el mayor peso). Un DSCR < 1.00 es HARD STOP (no puede pagar). DSCR 1.00-1.19 es debil (riesgo alto). DSCR > 1.50 es fuerte.',
  },
  working_capital: {
    title: 'Working Capital Engine (4%)',
    subtitle: 'FUENTE: SAT (FACTURAS PUE/PPD) + BALANCE',
    whatIs: 'Calcula el Ciclo de Conversion de Efectivo (CCC = DSO + DIO - DPO). DSO son dias de cobro real, DIO dias de inventario, DPO dias de pago. Mide cuanto tarda el dinero en dar la vuelta.',
    impact: 'Un CCC > 90 dias indica necesidad de financiamiento puente. Si DSO > DPO + 30 dias, hay presion de liquidez inminente. Si Working Cap contable difiere mucho del real (facturas), posible fraude.',
  },
  stability: {
    title: 'Stability Engine (9%)',
    subtitle: 'FUENTE: SAT + IMSS + REGISTRO PUBLICO',
    whatIs: 'Evalua la estabilidad del negocio: antiguedad de la empresa, consistencia de ingresos mes a mes, rotacion de personal, diversificacion de productos/servicios y presencia geografica.',
    impact: 'Representa el 9% del score. Empresas con menos de 2 anos tienen penalizacion. Alta rotacion de personal o ingresos muy volatiles reducen la confianza en la capacidad de pago futura.',
  },
  network: {
    title: 'Network Engine (8%)',
    subtitle: 'FUENTE: SAT (CFDIs) + SYNTAGE',
    whatIs: 'Analiza la red comercial: concentracion de clientes (HHI), dependencia de gobierno, calidad de proveedores, diversificacion de productos. Usa el indice Herfindahl-Hirschman.',
    impact: 'Representa el 8% del score. Si el Top 1 cliente > 40% de ventas, hay riesgo sistemico: si pierde ese cliente, colapsa. Accion: limitar linea y pedir garantia reforzada.',
  },
  fx_risk: {
    title: 'FX Risk Engine (7%)',
    subtitle: 'FUENTE: BALANCE + CFDIs EN USD',
    whatIs: 'Evalua el riesgo cambiario: si el credito es en USD pero los ingresos son en MXN (o viceversa), calcula el descalce, cobertura natural (costos en misma moneda) y exposicion no cubierta.',
    impact: 'Representa el 7% del score. Si hay descalce alto sin cobertura, se sugiere credito en MXN o condicionante de cobertura cambiaria forzosa para mitigar riesgo de tipo de cambio.',
  },
  guarantee: {
    title: 'Guarantee Engine (Gate)',
    subtitle: 'FUENTE: AVALUOS + RUG',
    whatIs: 'Evalua las garantias aportadas: valor de mercado, haircut por tipo de activo, ratio de cobertura (valor garantia / monto credito), y verificacion en RUG (Registro Unico de Garantias).',
    impact: 'Es un gate: si la cobertura es menor a 1:1, puede bloquear la aprobacion. El ratio objetivo es 2:1. Garantias con haircut alto (>50%) reducen significativamente el monto aprobable.',
  },
  employee: {
    title: 'Employee Engine (3%)',
    subtitle: 'FUENTE: NOMINA CFDI + IMSS',
    whatIs: 'Analiza la nomina: numero de empleados, costo promedio, rotacion, cumplimiento de obligaciones patronales (IMSS, INFONAVIT). Detecta empresas fantasma (sin empleados reales).',
    impact: 'Representa el 3% del score. Una empresa sin empleados o con nomina inconsistente vs su facturacion es senal de empresa fantasma o facturera.',
  },
  documentation: {
    title: 'Documentation Engine (4%)',
    subtitle: 'FUENTE: DOCUMENTOS CARGADOS',
    whatIs: 'Verifica que todos los documentos requeridos esten completos, vigentes y sean consistentes entre si: acta constitutiva, poderes, estados financieros, declaraciones, identificaciones.',
    impact: 'Representa el 4% del score. Documentacion incompleta o vencida puede bloquear el proceso. Inconsistencias entre documentos generan alertas de posible fraude documental.',
  },
  portfolio: {
    title: 'Portfolio Engine (5%)',
    subtitle: 'FUENTE: CARTERA ACTUAL XENDING',
    whatIs: 'Evalua el impacto de aprobar este credito en la cartera total de Xending: concentracion sectorial, exposicion por cliente, diversificacion geografica y limites internos de riesgo.',
    impact: 'Representa el 5% del score. Si aprobar este credito excede los limites de concentracion sectorial o por cliente, el monto se reduce automaticamente al tope permitido.',
  },
  graph_fraud: {
    title: 'Graph Fraud Engine (Gate)',
    subtitle: 'FUENTE: NODOS (ENTIDADES) Y ARISTAS (FACTURAS)',
    whatIs: 'Construye un grafo de relaciones entre empresas usando facturas del SAT. Detecta patrones de facturacion circular, empresas fantasma conectadas, y redes de lavado de dinero.',
    impact: 'Es un gate: si detecta red circular o conexion con empresas en lista 69B, puede generar hard stop. Cualquier alteracion a estas formulas alteraria la forma en que Xending evalua el riesgo global.',
  },
  benchmark: {
    title: 'Benchmark Engine',
    subtitle: 'FUENTE: TODOS LOS MOTORES + INDUSTRIA',
    whatIs: 'Compara las metricas del solicitante contra benchmarks de su industria y tamano. Identifica donde esta por encima o debajo del promedio sectorial en cada dimension de riesgo.',
    impact: 'No tiene peso directo en el score, pero proporciona contexto critico. Un DSCR de 1.3x puede ser excelente en retail pero mediocre en tecnologia. Ajusta la interpretacion de todos los motores.',
  },
};

// ============================================================
// Decision layer engine descriptions
// ============================================================

export const DECISION_ENGINE_INFO: Record<string, InfoPopupData> = {
  ai_risk: {
    title: 'AI Risk Engine',
    subtitle: 'FUENTE: TODOS LOS MOTORES + CRUCES',
    whatIs: 'Genera una narrativa inteligente analizando todos los resultados de motores y cruces. Identifica riesgos ocultos, fortalezas no obvias, y produce escenarios de estres con recomendaciones.',
    impact: 'Proporciona la vision holistica que ningun motor individual puede dar. Sus recomendaciones influyen en las condiciones del credito y los covenants sugeridos.',
  },
  credit_limit: {
    title: 'Credit Limit Engine (Regla del Minimo)',
    subtitle: 'FUENTE: 5 CALCULOS INDEPENDIENTES',
    whatIs: 'Calcula 5 limites independientes: por flujo (FCF/1.2 - deuda actual), por ventas (15-20% de ingresos), por EBITDA (2x), por garantia (valor*(1-haircut)/2), por portafolio (tope sectorial). El monto aprobado es el MINIMO de los 5.',
    impact: 'El limite mas bajo (binding constraint) determina el monto final. Si la garantia es el binding, se puede mejorar aportando mas colateral. Si es el flujo, no hay forma de aumentar el monto sin mejorar el DSCR.',
  },
  scenario: {
    title: 'Scenario Engine',
    subtitle: 'FUENTE: FINANCIAL + CASHFLOW + MACRO',
    whatIs: 'Simula escenarios de estres: caida de ventas (-20%, -40%), aumento de tasas (+200bps, +400bps), depreciacion cambiaria, y combinaciones. Calcula el DSCR estresado en cada escenario.',
    impact: 'Si el DSCR cae por debajo de 1.0x en escenarios moderados, se sugieren condiciones adicionales (covenants mas estrictos, garantia adicional) o reduccion de monto.',
  },
  covenant: {
    title: 'Covenant Engine',
    subtitle: 'FUENTE: FINANCIAL + CASHFLOW + POLICY',
    whatIs: 'Sugiere covenants (condiciones contractuales) basados en el perfil de riesgo: DSCR minimo, razon corriente minima, limite de apalancamiento, restriccion de dividendos, reportes periodicos.',
    impact: 'Los covenants son la red de seguridad del credito. Si el acreditado los incumple, se activan triggers de revision anticipada o aceleracion del credito.',
  },
  review_frequency: {
    title: 'Review Frequency Engine',
    subtitle: 'FUENTE: SCORE + TENDENCIAS + RIESGO',
    whatIs: 'Determina cada cuanto se debe revisar el credito: mensual (alto riesgo), trimestral (medio), semestral (bajo). Considera el score, tendencias deteriorantes, y alertas activas.',
    impact: 'Una frecuencia de revision alta consume mas recursos del equipo de riesgo pero permite detectar deterioro temprano. Creditos de bajo riesgo se revisan menos frecuentemente.',
  },
  policy_engine: {
    title: 'Policy Engine',
    subtitle: 'FUENTE: CONFIGURACION DE POLITICAS',
    whatIs: 'Valida que la solicitud cumpla con todas las politicas internas de Xending: montos minimos/maximos, plazos permitidos, sectores restringidos, requisitos de documentacion por monto.',
    impact: 'Si una politica no se cumple, puede bloquear la aprobacion o requerir escalamiento a comite. Las politicas son configurables por el administrador del sistema.',
  },
};

// ============================================================
// Credit limit bar descriptions
// ============================================================

export const CREDIT_LIMIT_INFO: Record<string, InfoPopupData> = {
  limit_by_flow: {
    title: '1. Limite por Flujo',
    subtitle: 'FCF / 1.2 - Servicio Deuda Actual',
    whatIs: 'Calcula cuanto credito puede soportar el flujo de caja libre. Formula: (FCF / 1.2) - Servicio de Deuda Actual. Requiere mantener un DSCR >= 1.20 despues del nuevo credito.',
    impact: 'Tope para mantener un DSCR >= 1.20. Si este es el binding constraint, la empresa no genera suficiente flujo para soportar mas deuda sin comprometer su capacidad de pago.',
  },
  limit_by_sales: {
    title: '2. Limite por Ventas',
    subtitle: 'Ventas Anuales * 0.15',
    whatIs: 'Limita el credito al 15-20% de las ventas anuales. Logica: una empresa no deberia deber mas de lo que factura en 2-3 meses. Es un tope conservador de sobreexposicion.',
    impact: 'Tope del 15-20% sobre ingresos. Si este es el binding, la empresa tiene ventas bajas relativas al monto solicitado. Puede mejorar si demuestra crecimiento sostenido.',
  },
  limit_by_ebitda: {
    title: '3. Limite por EBITDA',
    subtitle: 'EBITDA Ajustado * 2.0x',
    whatIs: 'Limita el credito a 2 veces el EBITDA ajustado. Es el apalancamiento maximo tolerado. EBITDA se ajusta por partidas no recurrentes y gastos de partes relacionadas.',
    impact: 'Apalancamiento maximo tolerado. Si este es el binding, la empresa ya tiene un nivel de deuda alto relativo a su generacion operativa.',
  },
  limit_by_guarantee: {
    title: '4. Limite por Garantia',
    subtitle: 'Valor * (1 - Haircut) / 2.0',
    whatIs: 'Calcula el limite basado en el valor de las garantias aportadas, aplicando un haircut por tipo de activo (inmuebles 20-30%, maquinaria 40-50%, inventario 50-60%) y un ratio de cobertura 2:1.',
    impact: 'Ratio 2:1 sobre garantias aportadas. Si este es el binding, se puede mejorar aportando mas colateral o garantias de mejor calidad (menor haircut).',
  },
  limit_by_portfolio: {
    title: '5. Limite por Portafolio',
    subtitle: 'Max Exposicion Sectorial - Actual',
    whatIs: 'Limita el credito al tope interno de diversificacion de Xending. Cada sector tiene un limite maximo de exposicion para evitar concentracion de riesgo en la cartera.',
    impact: 'Tope interno de diversificacion. Si este es el binding, Xending ya tiene mucha exposicion en el sector del solicitante. No depende del solicitante sino de la cartera.',
  },
};

// ============================================================
// Gate descriptions
// ============================================================

export const GATE_INFO: Record<string, InfoPopupData> = {
  gate1: {
    title: 'Gate 1: Hard Stops',
    subtitle: 'COMPLIANCE + PLD/KYC + LISTAS NEGRAS',
    whatIs: 'Primera validacion critica. Verifica que la empresa no este en listas negras (OFAC, 69B, PEPs), que el compliance sea positivo, y que no haya alertas de fraude criticas en ningun motor.',
    impact: 'Si Gate 1 no pasa, la solicitud se RECHAZA automaticamente sin importar el score. Es la barrera de entrada mas importante del sistema.',
  },
  gate2: {
    title: 'Gate 2: Semaforos Modulares',
    subtitle: 'INDICADORES POR MOTOR DE ANALISIS',
    whatIs: 'Cada motor genera un semaforo (verde/amarillo/rojo) basado en su resultado. Gate 2 consolida todos los semaforos para dar una vision rapida del estado general de la solicitud.',
    impact: 'Los semaforos amarillos generan alertas pero no bloquean. Los rojos pueden requerir escalamiento a comite. La combinacion de semaforos influye en la decision final.',
  },
  gate3: {
    title: 'Gate 3: Score Consolidado',
    subtitle: 'PROMEDIO PONDERADO DE TODOS LOS MOTORES',
    whatIs: 'Calcula el score final (0-100) como promedio ponderado de los 12 motores con peso, ajustado por el factor de tendencia. Score >= 75 = Aprobado, 60-74 = Condicionado, < 60 = Comite/Rechazo.',
    impact: 'El score determina la decision final junto con los gates. Un score alto con gate 1 pasado y pocos amarillos = aprobacion rapida. Score bajo = comite o rechazo.',
  },
};

// ============================================================
// Cross analysis descriptions (20 crosses)
// ============================================================

export const CROSS_INFO: Record<number, InfoPopupData> = {
  1: {
    title: 'Buro malo + Facturacion fuerte',
    subtitle: 'CRUCE INTELIGENTE #1 — BURO + SAT',
    whatIs: 'Score PyME bajo pero ventas reales en crecimiento. Logica: el buro refleja el pasado, las facturas el presente. Puede ser una empresa en recuperacion o una que se endeudo para crecer.',
    impact: 'Accion IA: Revisar deuda real. Posible empresa en expansion que se endeudo para crecer. Si las ventas son genuinas y crecientes, el riesgo puede ser menor de lo que indica el buro.',
  },
  2: {
    title: 'Buro bueno + Facturacion deteriorando',
    subtitle: 'CRUCE INTELIGENTE #2 — BURO + SAT',
    whatIs: 'Buen historial crediticio (pasado) pero las ventas van en caida (futuro). El buro aun no refleja el deterioro porque los pagos se mantienen... por ahora.',
    impact: 'Accion IA: Bajar monto y/o plazo. Riesgo de empeoramiento inminente. El buro se deteriorara en 3-6 meses si la tendencia de ventas continua.',
  },
  3: {
    title: 'Facturacion fuerte + Alta concentracion',
    subtitle: 'CRUCE INTELIGENTE #3 — SAT + NETWORK',
    whatIs: 'Vende mucho pero a 1 o 2 clientes (Top 1 > 40%). Logica: el riesgo de impago no depende de nuestra empresa, sino del cliente de nuestra empresa (Riesgo Sistemico).',
    impact: 'Accion IA: Limitar linea, pedir garantia reforzada. Si pierde al cliente principal, colapsa. El monto debe considerar el escenario de perdida del cliente top.',
  },
  4: {
    title: 'Liquidez buena + Flujo malo',
    subtitle: 'CRUCE INTELIGENTE #4 — FINANCIAL + CASHFLOW',
    whatIs: 'Balance sano (razon corriente alta) pero la caja esta apretada. Puede ser que tiene activos liquidos pero no genera flujo operativo suficiente, o que el CCC es muy largo.',
    impact: 'Accion IA: Revisar ciclo de conversion (CCC). Posible problema de cobranza. La liquidez del balance puede ser ilusoria si no se convierte en flujo real.',
  },
  5: {
    title: 'Empresa estable + Riesgo FX alto',
    subtitle: 'CRUCE INTELIGENTE #5 — STABILITY + FX RISK',
    whatIs: 'Negocio predecible pero con ingresos MXN y deuda USD (o viceversa). La estabilidad operativa no protege contra movimientos cambiarios bruscos.',
    impact: 'Accion IA: Sugerir credito MXN o condicionar a cobertura cambiaria forzosa. Una depreciacion del 20% puede convertir un credito sano en impagable.',
  },
  6: {
    title: 'Compliance limpio + Operacional dudoso',
    subtitle: 'CRUCE INTELIGENTE #6 — COMPLIANCE + OPERATIONAL',
    whatIs: 'No aparece en listas negras, pero las fotos/geolocalizacion no cuadran con el giro declarado. Puede ser fachada limpia con operacion real diferente.',
    impact: 'Accion IA: Investigacion manual / Visita fisica. Posible fachada limpia. El compliance automatico tiene limites; se requiere verificacion humana.',
  },
  7: {
    title: 'Ventas altas + Cancelaciones + Red circular',
    subtitle: 'CRUCE INTELIGENTE #7 — SAT + GRAPH FRAUD',
    whatIs: 'Facturacion alta pero con tasa de cancelacion elevada y conexiones con empresas en red circular. Patron clasico de facturacion ficticia para inflar ventas.',
    impact: 'Accion IA: ALTO RIESGO. Posible esquema de facturacion ficticia. Requiere investigacion profunda antes de cualquier aprobacion.',
  },
  8: {
    title: 'Garantia fuerte + Score medio',
    subtitle: 'CRUCE INTELIGENTE #8 — GUARANTEE + RISK MATRIX',
    whatIs: 'Colateral solido pero perfil crediticio mediocre. La garantia mitiga el riesgo de perdida pero no el riesgo de impago. Puede terminar en ejecucion de garantia.',
    impact: 'Accion IA: Aprobar con condiciones estrictas. La garantia da margen pero los covenants deben ser agresivos para detectar deterioro temprano.',
  },
  9: {
    title: 'DSCR ajustado + Tendencia mejorando',
    subtitle: 'CRUCE INTELIGENTE #9 — CASHFLOW + TRENDS',
    whatIs: 'El DSCR actual es justo (1.1-1.3x) pero la tendencia es positiva. La empresa esta mejorando su generacion de flujo mes a mes.',
    impact: 'Accion IA: Aprobar con monto conservador y revision trimestral. Si la tendencia se mantiene, se puede ampliar la linea en la siguiente revision.',
  },
  10: {
    title: 'Multiples alertas leves sin criticas',
    subtitle: 'CRUCE INTELIGENTE #10 — TODOS LOS MOTORES',
    whatIs: 'Ningun motor tiene alerta critica individual, pero hay muchas alertas amarillas acumuladas. El efecto combinado puede ser peor que una sola alerta roja.',
    impact: 'Accion IA: Evaluar efecto acumulativo. 5+ alertas amarillas equivalen a una roja en terminos de riesgo real. Considerar escalamiento a comite.',
  },
  11: {
    title: 'Rotacion de deuda detectada',
    subtitle: 'CRUCE INTELIGENTE #11 — BURO (ESPECIALIZADO)',
    whatIs: 'Multiples creditos activos, consultas frecuentes al buro, y monto vigente cercano al original. Patron: pide prestado para pagar otro prestamo. Espiral de deuda.',
    impact: 'Accion IA: ALTO RIESGO. Rechazo o monto muy reducido + garantia reforzada. La rotacion de deuda es uno de los predictores mas fuertes de default.',
  },
  12: {
    title: 'Nomina inconsistente + Ventas altas',
    subtitle: 'CRUCE INTELIGENTE #12 — EMPLOYEE + SAT',
    whatIs: 'Factura millones pero tiene pocos empleados o nomina muy baja. Inconsistencia entre el volumen de negocio y la estructura operativa real.',
    impact: 'Accion IA: Posible empresa facturera o outsourcing no declarado. Requiere verificacion de la operacion real y estructura de personal.',
  },
  13: {
    title: 'Sector en declive + Empresa creciendo',
    subtitle: 'CRUCE INTELIGENTE #13 — BENCHMARK + SAT',
    whatIs: 'La empresa crece mientras su sector se contrae. Puede ser que esta ganando market share o que esta inflando numeros. Requiere analisis mas profundo.',
    impact: 'Accion IA: Verificar si el crecimiento es organico. Si el sector cae 10% y la empresa crece 20%, algo no cuadra a menos que haya una explicacion clara.',
  },
  14: {
    title: 'Documentacion incompleta + Monto alto',
    subtitle: 'CRUCE INTELIGENTE #14 — DOCUMENTATION + POLICY',
    whatIs: 'Solicita un monto que requiere documentacion completa pero faltan documentos clave. Puede ser descuido o intento de evitar escrutinio.',
    impact: 'Accion IA: No aprobar hasta completar documentacion. Para montos > $2M se requiere documentacion completa sin excepciones.',
  },
  15: {
    title: 'Portafolio concentrado + Nueva exposicion',
    subtitle: 'CRUCE INTELIGENTE #15 — PORTFOLIO + POLICY',
    whatIs: 'Xending ya tiene alta exposicion en el sector del solicitante. Aprobar este credito excederia los limites internos de concentracion.',
    impact: 'Accion IA: Reducir monto al tope de concentracion o rechazar. La diversificacion de cartera es critica para la salud financiera de Xending.',
  },
  16: {
    title: 'Working Capital negativo + Ventas creciendo',
    subtitle: 'CRUCE INTELIGENTE #16 — WORKING CAPITAL + SAT',
    whatIs: 'El capital de trabajo es negativo pero las ventas crecen. La empresa crece mas rapido de lo que puede financiar con recursos propios. Necesita capital de trabajo urgente.',
    impact: 'Accion IA: Credito de capital de trabajo puede ser la solucion correcta. Pero verificar que el crecimiento sea sostenible y no solo un pico temporal.',
  },
  17: {
    title: 'Garantia inmobiliaria + Zona de riesgo',
    subtitle: 'CRUCE INTELIGENTE #17 — GUARANTEE + COMPLIANCE',
    whatIs: 'La garantia es un inmueble pero esta en zona con problemas de seguridad o baja plusvalia. El valor de liquidacion puede ser mucho menor al avaluo.',
    impact: 'Accion IA: Aplicar haircut adicional por zona. Un inmueble en zona de riesgo puede perder 30-50% de valor en ejecucion vs avaluo comercial.',
  },
  18: {
    title: 'Tendencias mixtas entre motores',
    subtitle: 'CRUCE INTELIGENTE #18 — TRENDS (MULTI-MOTOR)',
    whatIs: 'Algunos motores mejoran mientras otros se deterioran. No hay una tendencia clara. La empresa tiene fortalezas y debilidades que se mueven en direcciones opuestas.',
    impact: 'Accion IA: Monitoreo cercano. Las tendencias mixtas son dificiles de predecir. Revision mensual hasta que se defina una direccion clara.',
  },
  19: {
    title: 'Score alto + Monto excesivo',
    subtitle: 'CRUCE INTELIGENTE #19 — RISK MATRIX + CREDIT LIMIT',
    whatIs: 'El score es bueno pero el monto solicitado excede todos los limites calculados. La empresa es buena pero pide demasiado para su capacidad actual.',
    impact: 'Accion IA: Aprobar por el monto calculado, no el solicitado. Explicar al cliente que puede solicitar ampliacion despues de demostrar capacidad de pago.',
  },
  20: {
    title: 'Accionistas en otras empresas con problemas',
    subtitle: 'CRUCE INTELIGENTE #20 — GRAPH FRAUD + COMPLIANCE',
    whatIs: 'Los accionistas o representantes legales tienen participacion en otras empresas con problemas crediticios, fiscales o legales. Riesgo de contagio.',
    impact: 'Accion IA: Investigar las otras empresas. Si los problemas son graves (69B, fraude), puede ser motivo de rechazo aunque esta empresa se vea bien individualmente.',
  },
};

/** Helper to get engine info with fallback */
export function getEngineInfo(engineName: string): InfoPopupData {
  return ENGINE_INFO[engineName] ?? DECISION_ENGINE_INFO[engineName] ?? {
    title: engineName.replace(/_/g, ' '),
    subtitle: 'Motor de analisis',
    whatIs: 'Este motor analiza un aspecto especifico del perfil crediticio del solicitante y genera un score, alertas y recomendaciones.',
    impact: 'El resultado de este motor contribuye al score consolidado y puede generar alertas que afecten la decision final.',
  };
}

/** Helper to get cross info with fallback */
export function getCrossInfo(crossNumber: number): InfoPopupData {
  return CROSS_INFO[crossNumber] ?? {
    title: `Cruce #${crossNumber}`,
    subtitle: 'CRUCE INTELIGENTE',
    whatIs: 'Este cruce combina resultados de multiples motores para detectar patrones de riesgo que ningun motor individual puede identificar.',
    impact: 'Los cruces inteligentes son la capa de analisis mas sofisticada del sistema. Detectan riesgos ocultos y contradicciones entre motores.',
  };
}
