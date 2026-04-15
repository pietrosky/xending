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

/** Valores demo por motor → por metrica. Incluye desglose del calculo */
export const DEMO_VALUES: Record<string, Record<string, string>> = {
  cashflow: {
    'EBITDA': '$1,300,000 + $550,000 + $100,000 = $2,900,000 MXN',
    'DSCR (Cobertura de Deuda)': '$2,900,000 / $2,120,000 = 1.37x',
    'Flujo Libre': '$2,900,000 - $510,000 - $450,000 - $370,000 = $1,570,000 MXN',
    'Margen EBITDA': '$2,900,000 / $15,000,000 x 100 = 19.3%',
  },
  sat_facturacion: {
    'Ventas Netas Reales': '$15,200,000 - $320,000 - $480,000 - $200,000 = $14,200,000 MXN',
    'Tasa de Cancelacion': '38 facturas canceladas / 1,812 total x 100 = 2.1%',
    'DSO (Dias de Cobro)': '$1,520,000 / ($14,200,000 / 365) = 38 dias',
    'DPO (Dias de Pago)': '$1,080,000 / ($9,400,000 / 365) = 42 dias',
    '% PUE vs PPD': '1,178 PUE / 1,812 total x 100 = 65% PUE / 35% PPD',
    'Facturado vs Declarado': '$15,200,000 / $14,580,000 = 1.043 → diferencia 4.3%',
  },
  financial: {
    'Razon Circulante': '$8,000,000 / $4,940,000 = 1.62x',
    'Apalancamiento': '$6,720,000 / $14,000,000 x 100 = 48%',
    'Margen Neto': '$1,860,000 / $15,000,000 x 100 = 12.4%',
    'ROE': '$1,860,000 / $9,950,000 x 100 = 18.7%',
    'Cobertura de Intereses': '$2,900,000 / $760,000 = 3.8x',
  },
  buro: {
    'Score PyME': 'Dato directo Buro = 720',
    'Creditos Activos': '2 creditos vigentes',
    'Vigente / Original': '$1,350,000 / $3,000,000 x 100 = 45%',
    'Consultas Recientes (3m)': '1 consulta en ultimos 90 dias',
    'Rotacion de Deuda': '2 creditos (< 4) + 1 consulta (< 5) → No detectada',
  },
  stability: {
    'Coeficiente de Variacion': '$177,600 / $1,200,000 x 100 = 14.8%',
    'Tendencia': 'Pendiente regresion = +$8,333/mes → +8% anual',
    'Estacionalidad': 'Pico en nov-dic (Q4), valle en feb-mar',
  },
  operational: {
    'Inscripcion RPC': 'Acta constitutiva inscrita = Si',
    'Garantias RUG': '1 inmueble comercial, sin gravamen',
    'Incidencias Legales': '0 demandas, 0 embargos, 0 litigios',
  },
  network: {
    'HHI Clientes': '(18%)² + (12%)² + (10%)² + ... = 1,180',
    'Top 1 Cliente (%)': '$2,556,000 / $14,200,000 x 100 = 18%',
    '% Gobierno': '$710,000 / $14,200,000 x 100 = 5%',
  },
  fx_risk: {
    '% Ingresos USD': '$5,320,000 USD / $15,200,000 total x 100 = 35%',
    'Hedge Natural': '35% ingresos USD - 23% gastos USD = +12%',
    'DSCR Estresado': 'TC +20%: $2,900,000 / $2,520,000 = 1.15x',
  },
  portfolio: {
    'Concentracion Sector': '$18,000,000 sector comercial / $150,000,000 cartera = 12%',
    'Concentracion Grupo': '$12,000,000 grupo / $150,000,000 cartera = 8%',
  },
  working_capital: {
    'CCC (Ciclo de Conversion)': '38 dias cobro + 20 dias inventario - 42 dias pago = 16 dias',
    'Capital de Trabajo': '$8,000,000 - $4,800,000 = $3,200,000 MXN',
  },
  documentation: {
    '% Completitud': '11 de 13 documentos entregados = 85% (falta tabla de pasivos y acta matrimonio)',
  },
  employee: {
    'Headcount': '42 empleados unicos en nomina (mes actual)',
    'Ventas por Empleado': '$14,200,000 / 12 meses / 42 empleados = $28,175/mes',
    'Nomina / Ingresos': '$4,200,000 nomina anual / $15,000,000 ventas x 100 = 28%',
  },
  compliance: {
    'Listas Negras': 'OFAC: limpio, ONU: limpio, 69-B: limpio, PEPs: no',
    'PEPs': 'Representante legal y accionistas: no son PEP',
  },
  guarantee: {
    'Cobertura': 'Inmueble $8,280,000 x (1 - 0.30) / $2,500,000 = 2.3x',
    'Haircut': 'Inmueble comercial = 30% haircut',
  },
  graph_fraud: {
    'Facturacion Circular': '0 ciclos detectados en grafo de 847 nodos',
    'Contrapartes en 69-B': '0 de 156 contrapartes en lista 69-B',
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
