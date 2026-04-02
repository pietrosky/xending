/**
 * Valores demo pre-calculados para las fichas tecnicas.
 *
 * Estos valores representan una empresa demo tipo PyME mexicana
 * que solicita credito. Se usan para que el analista vea como
 * se ven los resultados reales en cada ficha.
 *
 * Empresa demo: "Comercializadora del Norte S.A. de C.V."
 * RFC: CDN180315AB1 | Giro: Comercial | Ventas: ~$15M MXN/anio
 */

/** Valores demo por motor → por metrica */
export const DEMO_VALUES: Record<string, Record<string, string>> = {
  cashflow: {
    'EBITDA': '$2,900,000 MXN',
    'DSCR (Cobertura de Deuda)': '1.37x',
    'Flujo Libre': '$1,570,000 MXN',
    'Margen EBITDA': '19.3%',
  },
  sat_facturacion: {
    'Ventas Netas Reales': '$14,200,000 MXN/anio',
    'Tasa de Cancelacion': '2.1%',
    'DSO (Dias de Cobro)': '38 dias',
    'DPO (Dias de Pago)': '42 dias',
    '% PUE vs PPD': '65% PUE / 35% PPD',
    'Facturado vs Declarado': '4.3% diferencia',
  },
  financial: {
    'Razon Circulante': '1.62x',
    'Apalancamiento': '48%',
    'Margen Neto': '12.4%',
    'ROE': '18.7%',
    'Cobertura de Intereses': '3.8x',
  },
  buro: {
    'Score PyME': '720',
    'Creditos Activos': '2',
    'Vigente / Original': '45%',
    'Consultas Recientes (3m)': '1',
    'Rotacion de Deuda': 'No detectada',
  },
  stability: {
    'Coeficiente de Variacion': '14.8%',
    'Tendencia': 'Positiva (+8% anual)',
    'Estacionalidad': 'Patron leve en Q4',
  },
  operational: {
    'Inscripcion RPC': 'Si — inscrita',
    'Garantias RUG': '1 inmueble libre',
    'Incidencias Legales': '0 activas',
  },
  network: {
    'HHI Clientes': '1,180',
    'Top 1 Cliente (%)': '18%',
    '% Gobierno': '5%',
  },
  fx_risk: {
    '% Ingresos USD': '35%',
    'Hedge Natural': '+12% (mas ingresos USD que gastos)',
    'DSCR Estresado': '1.15x con TC +20%',
  },
  portfolio: {
    'Concentracion Sector': '12% del portafolio',
    'Concentracion Grupo': '8%',
  },
  working_capital: {
    'CCC (Ciclo de Conversion)': '16 dias',
    'Capital de Trabajo': '$3,200,000 MXN',
  },
  documentation: {
    '% Completitud': '85% (falta tabla de pasivos)',
  },
  employee: {
    'Headcount': '42 empleados',
    'Ventas por Empleado': '$338,095 MXN/mes',
    'Nomina / Ingresos': '28%',
  },
  compliance: {
    'Listas Negras': 'No aparece en ninguna',
    'PEPs': 'No es PEP',
  },
  guarantee: {
    'Cobertura': '2.3x',
    'Haircut': '30% (inmueble)',
  },
  graph_fraud: {
    'Facturacion Circular': 'Sin ciclos detectados',
    'Contrapartes en 69-B': '0',
  },
};

/** Score demo por motor */
export const DEMO_SCORES: Record<string, { score: number; grade: string }> = {
  cashflow: { score: 78, grade: 'B' },
  sat_facturacion: { score: 82, grade: 'B' },
  financial: { score: 74, grade: 'C' },
  buro: { score: 85, grade: 'A' },
  stability: { score: 80, grade: 'B' },
  operational: { score: 88, grade: 'A' },
  network: { score: 76, grade: 'B' },
  fx_risk: { score: 65, grade: 'C' },
  portfolio: { score: 90, grade: 'A' },
  working_capital: { score: 83, grade: 'B' },
  documentation: { score: 70, grade: 'C' },
  employee: { score: 77, grade: 'B' },
  compliance: { score: 100, grade: 'A' },
  guarantee: { score: 92, grade: 'A' },
  graph_fraud: { score: 100, grade: 'A' },
};
