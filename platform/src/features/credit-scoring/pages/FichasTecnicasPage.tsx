/**
 * Fichas Tecnicas de Motores — /fichas-tecnicas
 *
 * Pagina plana con el detalle de cada motor: nombre, peso, fuente,
 * formulas, umbrales y donde verificar cada dato. Sin imagenes,
 * puro texto util para que el analista valide.
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { DEMO_VALUES, DEMO_SCORES } from '../lib/fichasDemoValues';

// ─── Tipos ───────────────────────────────────────────────────────────

interface Metrica {
  nombre: string;
  formula: string;
  donde: string;
  bueno?: string;
  malo?: string;
}

interface FichaMotor {
  id: string;
  nombre: string;
  peso: string;
  fuente: string;
  tabla: string;
  descripcion: string;
  metricas: Metrica[];
  ejemplo?: string;
  esGate?: boolean;
}

// ─── Data de fichas ──────────────────────────────────────────────────

const FICHAS: FichaMotor[] = [
  {
    id: 'cashflow',
    nombre: 'Flujo de Efectivo',
    peso: '16%',
    fuente: 'M03a SAT (Syntage) + M03c Financieros (upload)',
    tabla: 'cs_provider_data → invoices_issued, financial_statements',
    descripcion: 'Evalua la capacidad real de la empresa para generar efectivo y pagar sus deudas. Es el motor mas importante porque responde la pregunta: puede pagar o no puede pagar.',
    metricas: [
      { nombre: 'EBITDA', formula: 'Utilidad Operativa + Depreciacion + Amortizacion', donde: 'Estado de Resultados, renglones de depreciacion y amortizacion', bueno: '> 0 y creciendo', malo: 'Negativo o decreciendo' },
      { nombre: 'DSCR (Cobertura de Deuda)', formula: 'EBITDA / Servicio de Deuda Anual', donde: 'EBITDA del P&L / suma de pagos anuales de creditos (del Buro)', bueno: '>= 1.3x', malo: '< 1.0x' },
      { nombre: 'Flujo Libre', formula: 'EBITDA - Impuestos - CAPEX - Cambio en Capital de Trabajo', donde: 'Combinacion de P&L + Balance', bueno: 'Positivo', malo: 'Negativo sostenido' },
      { nombre: 'Margen EBITDA', formula: 'EBITDA / Ventas Netas x 100', donde: 'Estado de Resultados', bueno: '>= 15%', malo: '< 5%' },
    ],
    ejemplo: 'EBITDA $5M, pagos de deuda $3.5M → DSCR = 5M / 3.5M = 1.43x ✓ (puede pagar)',
  },
  {
    id: 'sat_facturacion',
    nombre: 'Facturacion SAT',
    peso: '14%',
    fuente: 'M03a SAT (Syntage)',
    tabla: 'cs_provider_data → invoices_issued, invoices_received',
    descripcion: 'Analiza la facturacion real de la empresa desde el SAT. Mide calidad de ingresos, cancelaciones, comportamiento de cobro y pago, y compara facturado vs declarado.',
    metricas: [
      { nombre: 'Ventas Netas Reales', formula: 'Total Facturado - Cancelaciones - Notas de Credito - Descuentos', donde: 'Facturas emitidas tipo Ingreso (I)', bueno: 'Estable o creciendo', malo: 'Cayendo > 20%' },
      { nombre: 'Tasa de Cancelacion', formula: 'Facturas Canceladas / Total Facturas x 100', donde: 'Facturas con status cancelado', bueno: '< 3%', malo: '> 5%' },
      { nombre: 'DSO (Dias de Cobro)', formula: 'Cuentas por Cobrar PPD / Ventas Diarias', donde: 'Facturas PPD pendientes de pago', bueno: '< 45 dias', malo: '> 90 dias' },
      { nombre: 'DPO (Dias de Pago)', formula: 'Cuentas por Pagar PPD / Compras Diarias', donde: 'Facturas recibidas PPD pendientes', bueno: '30-60 dias', malo: '> 90 dias' },
      { nombre: '% PUE vs PPD', formula: 'Facturas PUE / Total x 100', donde: 'Campo paymentMethod de cada factura', bueno: 'Alto % PUE = cobra de contado', malo: 'Alto % PPD sin cobrar' },
      { nombre: 'Facturado vs Declarado', formula: 'Total Facturado / Ingresos Declarados', donde: 'Facturas vs declaracion anual', bueno: 'Diferencia < 10%', malo: 'Diferencia > 10% = alerta' },
    ],
    ejemplo: 'Facturado $12M, declarado $11.5M → diferencia 4.3% ✓. Cancelaciones 2.1% ✓',
  },
  {
    id: 'financial',
    nombre: 'Financiero',
    peso: '11%',
    fuente: 'M03a SAT (balanza) + M03c Financieros (upload)',
    tabla: 'cs_provider_data → electronic_accounting, financial_statements',
    descripcion: 'Analiza el balance general y estado de resultados. Calcula razones financieras clasicas para medir liquidez, apalancamiento y rentabilidad.',
    metricas: [
      { nombre: 'Razon Circulante', formula: 'Activo Circulante / Pasivo Circulante', donde: 'Balance General', bueno: '>= 1.5', malo: '< 1.0' },
      { nombre: 'Apalancamiento', formula: 'Pasivo Total / Activo Total x 100', donde: 'Balance General', bueno: '< 50%', malo: '> 65%' },
      { nombre: 'Margen Neto', formula: 'Utilidad Neta / Ventas Netas x 100', donde: 'Estado de Resultados', bueno: '>= 10%', malo: '< 3%' },
      { nombre: 'ROE', formula: 'Utilidad Neta / Capital Contable x 100', donde: 'P&L / Balance', bueno: '>= 15%', malo: '< 5%' },
      { nombre: 'Cobertura de Intereses', formula: 'EBITDA / Gastos Financieros', donde: 'Estado de Resultados', bueno: '>= 3x', malo: '< 1.5x' },
    ],
    ejemplo: 'Activo Circulante $8M, Pasivo Circulante $5M → Razon Circulante = 1.6x ✓',
  },
  {
    id: 'buro',
    nombre: 'Buro de Credito',
    peso: '10%',
    fuente: 'M03b Buro (Syntage)',
    tabla: 'cs_provider_data → buro_report, buro_score',
    descripcion: 'Analiza el historial crediticio de la empresa en Buro de Credito. Mide score, creditos activos, rotacion de deuda y consultas recientes.',
    metricas: [
      { nombre: 'Score PyME', formula: 'Dato directo de Buro (0-999)', donde: 'Reporte Buro → campo score', bueno: '>= 700', malo: '< 600 = rechazo' },
      { nombre: 'Creditos Activos', formula: 'Conteo de creditos vigentes', donde: 'Reporte Buro → seccion creditos', bueno: '1-3 creditos', malo: '> 5 = sobreendeudamiento' },
      { nombre: 'Vigente / Original', formula: 'Saldo Actual / Monto Original x 100', donde: 'Cada credito activo', bueno: '< 50%', malo: '> 90% = no esta pagando' },
      { nombre: 'Consultas Recientes (3m)', formula: 'Conteo de consultas ultimos 90 dias', donde: 'Reporte Buro → consultas', bueno: '0-2', malo: '>= 5 = busqueda desesperada' },
      { nombre: 'Rotacion de Deuda', formula: 'Si tiene >= 4 creditos + >= 5 consultas en 3m + vigente/original > 90%', donde: 'Combinacion de metricas', bueno: 'No detectada', malo: 'Detectada = alerta critica' },
    ],
    ejemplo: 'Score 720, 2 creditos activos, 1 consulta en 3m, vigente/original 45% → todo bien ✓',
  },
  {
    id: 'stability',
    nombre: 'Estabilidad del Negocio',
    peso: '9%',
    fuente: 'M03a SAT (Syntage)',
    tabla: 'cs_provider_data → invoices_issued (12-36 meses)',
    descripcion: 'Mide que tan estables y predecibles son los ingresos de la empresa. Detecta volatilidad, estacionalidad y tendencias.',
    metricas: [
      { nombre: 'Coeficiente de Variacion', formula: 'Desviacion Estandar de Ventas / Promedio de Ventas', donde: 'Ventas mensuales de facturas emitidas', bueno: '< 20%', malo: '> 30% = alta volatilidad' },
      { nombre: 'Tendencia', formula: 'Pendiente de regresion lineal sobre ventas mensuales', donde: 'Serie de tiempo de ventas', bueno: 'Positiva', malo: 'Negativa sostenida' },
      { nombre: 'Estacionalidad', formula: 'Deteccion de patrones repetitivos por mes', donde: 'Comparar mismos meses entre anios', bueno: 'Patron predecible', malo: 'Erratico sin patron' },
    ],
    ejemplo: 'Ventas promedio $1.2M/mes, desviacion $180K → CV = 15% ✓ (estable)',
  },
  {
    id: 'operational',
    nombre: 'Riesgo Operativo',
    peso: '9%',
    fuente: 'M03e Registro Publico (Syntage)',
    tabla: 'cs_provider_data → hawk_checks, insights Syntage',
    descripcion: 'Evalua la estructura corporativa, situacion legal y garantias registradas de la empresa.',
    metricas: [
      { nombre: 'Inscripcion RPC', formula: 'Acta constitutiva inscrita en Registro Publico = SI/NO', donde: 'Registro Publico de Comercio via Syntage', bueno: 'Inscrita', malo: 'No inscrita' },
      { nombre: 'Garantias RUG', formula: 'Conteo y tipo de garantias registradas', donde: 'RUG via Syntage', bueno: 'Garantias libres', malo: 'Todo gravado' },
      { nombre: 'Incidencias Legales', formula: 'Conteo de demandas, embargos, litigios', donde: 'Hawk Checks via Syntage', bueno: '0 incidencias', malo: 'Multiples activas' },
    ],
  },
  {
    id: 'network',
    nombre: 'Red de Clientes y Proveedores',
    peso: '8%',
    fuente: 'M03a SAT (Syntage)',
    tabla: 'cs_provider_data → invoices_issued, invoices_received',
    descripcion: 'Mide la concentracion de clientes y proveedores. Una empresa que depende de 1 solo cliente es mas riesgosa.',
    metricas: [
      { nombre: 'HHI Clientes', formula: 'Suma de (% de cada cliente)²', donde: 'Facturas emitidas agrupadas por receptor', bueno: '< 1500', malo: '> 2500 = concentracion alta' },
      { nombre: 'Top 1 Cliente (%)', formula: 'Ventas al cliente #1 / Ventas Totales x 100', donde: 'Facturas emitidas', bueno: '< 25%', malo: '> 40% = dependencia peligrosa' },
      { nombre: '% Gobierno', formula: 'Ventas a gobierno / Ventas Totales x 100', donde: 'RFC de receptores gubernamentales', bueno: '< 30%', malo: '> 50% = dependencia gobierno' },
    ],
    ejemplo: 'Top 1 cliente = 18%, HHI = 1200 → diversificado ✓',
  },
  {
    id: 'fx_risk',
    nombre: 'Riesgo Cambiario',
    peso: '7%',
    fuente: 'M03a SAT (Syntage)',
    tabla: 'cs_provider_data → invoices_issued, invoices_received',
    descripcion: 'Mide el descalce entre monedas de ingreso y gasto. Si cobra en pesos pero pide credito en dolares, el riesgo cambiario es alto.',
    metricas: [
      { nombre: '% Ingresos USD', formula: 'Facturas en USD / Total Facturas x 100', donde: 'Campo currency de facturas emitidas', bueno: 'Alto si pide credito en USD', malo: '0% y pide en USD = descalce total' },
      { nombre: 'Hedge Natural', formula: '% Ingresos USD - % Gastos USD', donde: 'Diferencia entre ambos', bueno: 'Cercano a 0 = equilibrado', malo: 'Muy negativo = descalce' },
      { nombre: 'DSCR Estresado', formula: 'DSCR recalculado con TC +10%, +20%, +30%', donde: 'Escenarios sobre DSCR base', bueno: 'DSCR > 1.0x aun con TC +20%', malo: 'DSCR < 1.0x con TC +10%' },
    ],
  },
  {
    id: 'portfolio',
    nombre: 'Portafolio',
    peso: '5%',
    fuente: 'Datos internos de Xending',
    tabla: 'cs_portfolio_positions, cs_portfolio_exposure',
    descripcion: 'Evalua el impacto de aprobar este credito en la cartera total de Xending. Mide concentracion por sector, moneda y grupo.',
    metricas: [
      { nombre: 'Concentracion Sector', formula: '% de cartera en el mismo sector', donde: 'Cartera activa de Xending', bueno: '< 25% del portafolio', malo: '> 40%' },
      { nombre: 'Concentracion Grupo', formula: '% de cartera en el mismo grupo empresarial', donde: 'Cartera activa', bueno: '< 15%', malo: '> 25%' },
    ],
  },
  {
    id: 'working_capital',
    nombre: 'Capital de Trabajo',
    peso: '4%',
    fuente: 'M03a SAT + M03c Financieros',
    tabla: 'cs_provider_data → invoices_issued, invoices_received, financial_statements',
    descripcion: 'Mide el ciclo de conversion de efectivo: cuanto tarda en cobrar, cuanto tarda en pagar, y si necesita financiamiento del ciclo.',
    metricas: [
      { nombre: 'CCC (Ciclo de Conversion)', formula: 'DSO + DIO - DPO', donde: 'DSO de facturas + DIO de inventarios + DPO de facturas recibidas', bueno: '< 45 dias', malo: '> 60 dias = necesita financiar ciclo' },
      { nombre: 'Capital de Trabajo', formula: 'Activo Circulante - Pasivo Circulante', donde: 'Balance General', bueno: 'Positivo', malo: 'Negativo = problemas de liquidez' },
    ],
    ejemplo: 'DSO 35 dias + DIO 20 dias - DPO 40 dias = CCC 15 dias ✓ (ciclo corto)',
  },
  {
    id: 'documentation',
    nombre: 'Documentacion',
    peso: '4%',
    fuente: 'Expediente digital (M02)',
    tabla: 'cs_expedientes, cs_documents',
    descripcion: 'Mide que tan completo esta el expediente. Documentos faltantes o vencidos bajan el score.',
    metricas: [
      { nombre: '% Completitud', formula: 'Documentos entregados / Documentos requeridos x 100', donde: 'Expediente digital', bueno: '100%', malo: '< 80%' },
    ],
  },
  {
    id: 'employee',
    nombre: 'Empleados',
    peso: '3%',
    fuente: 'M03a SAT (nomina via Syntage)',
    tabla: 'cs_provider_data → payroll_invoices',
    descripcion: 'Analiza la plantilla laboral desde los CFDIs de nomina. Detecta tendencias de crecimiento o contraccion.',
    metricas: [
      { nombre: 'Headcount', formula: 'Conteo de empleados unicos por mes', donde: 'CFDIs de nomina', bueno: 'Estable o creciendo', malo: 'Cayendo > 20%' },
      { nombre: 'Ventas por Empleado', formula: 'Ventas Mensuales / Headcount', donde: 'Facturas / nomina', bueno: 'Creciendo', malo: 'Cayendo = ineficiencia' },
      { nombre: 'Nomina / Ingresos', formula: 'Total Nomina / Ventas x 100', donde: 'Nomina vs facturas emitidas', bueno: '< 40%', malo: '> 60% = empresa de servicios pesada' },
    ],
  },
  // ── Gates ──
  {
    id: 'compliance',
    nombre: 'Cumplimiento PLD',
    peso: 'GATE',
    fuente: 'M03d Scory + Hawk Checks',
    tabla: 'cs_provider_data → pld_check, hawk_checks',
    descripcion: 'Verifica que la empresa no aparezca en listas negras. Si falla, es rechazo automatico sin importar el score.',
    metricas: [
      { nombre: 'Listas Negras', formula: 'Busqueda en OFAC, ONU, UE, FinCEN, Interpol, 69-B', donde: 'Scory API + Hawk Checks Syntage', bueno: 'No aparece en ninguna', malo: 'Aparece = rechazo' },
      { nombre: 'PEPs', formula: 'Persona Politicamente Expuesta', donde: 'Scory API', bueno: 'No es PEP', malo: 'Es PEP = revision especial' },
    ],
    esGate: true,
  },
  {
    id: 'guarantee',
    nombre: 'Garantias',
    peso: 'GATE',
    fuente: 'Expediente + M03e Registro Publico',
    tabla: 'cs_guarantee_guarantees, cs_provider_data → RUG',
    descripcion: 'Verifica que las garantias ofrecidas cubran al menos 2:1 del monto solicitado, aplicando haircuts por tipo.',
    metricas: [
      { nombre: 'Cobertura', formula: 'Valor Garantia x (1 - Haircut) / Monto Solicitado', donde: 'Avaluo + tipo de garantia', bueno: '>= 2.0x', malo: '< 1.5x' },
      { nombre: 'Haircut', formula: 'Descuento por tipo: inmueble 30%, vehiculo 40%, inventario 50%', donde: 'Politica de haircuts', bueno: 'Inmueble (menor haircut)', malo: 'Inventario (mayor haircut)' },
    ],
    esGate: true,
  },
  {
    id: 'graph_fraud',
    nombre: 'Fraude en Red',
    peso: 'GATE',
    fuente: 'M03a SAT + M03d Compliance',
    tabla: 'cs_graph_nodes, cs_graph_edges, cs_graph_alerts',
    descripcion: 'Construye un grafo de relaciones entre la empresa y sus contrapartes. Detecta facturacion circular, empresas fachada y redes sospechosas.',
    metricas: [
      { nombre: 'Facturacion Circular', formula: 'Detectar ciclos A→B→C→A en facturas', donde: 'Grafo de facturas emitidas/recibidas', bueno: 'Sin ciclos', malo: 'Ciclo detectado = alerta critica' },
      { nombre: 'Contrapartes en 69-B', formula: 'Facturas con emisor/receptor en lista 69-B del SAT', donde: 'Cruce facturas vs lista 69-B', bueno: '0 contrapartes', malo: '> 0 = riesgo fiscal' },
    ],
    esGate: true,
  },
];

// ─── Secciones especiales ────────────────────────────────────────────

const SECCION_SCORE = {
  titulo: 'Score Consolidado',
  formula: 'Score = Suma de (score_motor x peso_motor)',
  detalle: 'Se suman los 12 motores con peso. Los pesos se normalizan al 100% segun motores activos. Los gates (PLD, garantias, fraude) no suman pero pueden bloquear.',
  desglose: 'flujo(16%) + facturacion(14%) + financiero(11%) + buro(10%) + estabilidad(9%) + operativo(9%) + red(8%) + fx(7%) + portafolio(5%) + capital_trabajo(4%) + documentacion(4%) + empleados(3%) = 100%',
};

const SECCION_LIMITE = {
  titulo: 'Limite de Credito (Regla del Minimo)',
  descripcion: 'Se calculan 5 limites independientes. El monto aprobado es el MENOR de los 5.',
  limites: [
    { nombre: 'Por Flujo (DSCR)', formula: 'EBITDA x Factor DSCR / Tasa', fuente: 'Motor Flujo de Efectivo' },
    { nombre: 'Por Ventas', formula: 'Ventas Anuales x 20%', fuente: 'Motor Facturacion SAT' },
    { nombre: 'Por EBITDA', formula: 'EBITDA x 2', fuente: 'Motor Flujo de Efectivo' },
    { nombre: 'Por Garantia', formula: 'Valor Garantia x (1 - Haircut) / 2', fuente: 'Motor Garantias' },
    { nombre: 'Por Portafolio', formula: 'Limite maximo por concentracion de cartera', fuente: 'Motor Portafolio' },
  ],
  ejemplo: 'Limites: $3.2M, $4.5M, $3.8M, $1.8M, $8M → Monto aprobado: $1.8M (limitado por garantia)',
};

const SECCION_PE = {
  titulo: 'Perdida Esperada (PE)',
  formula: 'PE = PD x EAD x LGD',
  variables: [
    { nombre: 'PD', significado: 'Probabilidad de Incumplimiento', como: 'Tabla por dias de atraso' },
    { nombre: 'EAD', significado: 'Exposicion al Incumplimiento', como: 'Saldo utilizado del credito' },
    { nombre: 'LGD', significado: 'Severidad de Perdida', como: '40% estandar CNBV para SOFOM ENR' },
  ],
  tablaPD: [
    { dias: '0', pd: '2%', cat: 'Al corriente' },
    { dias: '1-30', pd: '5%', cat: 'Atraso leve' },
    { dias: '31-60', pd: '10%', cat: 'Atraso moderado' },
    { dias: '61-90', pd: '25%', cat: 'Atraso significativo' },
    { dias: '91-120', pd: '50%', cat: 'Atraso grave' },
    { dias: '121-180', pd: '75%', cat: 'Atraso severo' },
    { dias: '> 180', pd: '100%', cat: 'Irrecuperable' },
  ],
  ejemplo: 'Saldo $3M, al corriente → PE = 0.02 x 3,000,000 x 0.40 = $24,000',
};

// ─── Componente Accordion ────────────────────────────────────────────

function FichaAccordion({ ficha, defaultOpen }: { ficha: FichaMotor; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultOpen && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [defaultOpen]);

  return (
    <div ref={ref} id={ficha.id} className={`rounded-lg border ${ficha.esGate ? 'border-red-400/40' : 'border-border'} bg-card ${defaultOpen ? 'ring-2 ring-primary/30' : ''}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${
            ficha.esGate ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'
          }`}>
            {ficha.peso}
          </span>
          <span className="text-sm font-semibold text-foreground">{ficha.nombre}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground">{ficha.descripcion}</p>

          {/* Score demo badge */}
          {DEMO_SCORES[ficha.id] && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Score demo:</span>
              <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
                (DEMO_SCORES[ficha.id]?.score ?? 0) >= 80 ? 'bg-green-500/10 text-green-600' :
                (DEMO_SCORES[ficha.id]?.score ?? 0) >= 60 ? 'bg-yellow-500/10 text-yellow-600' :
                'bg-red-500/10 text-red-600'
              }`}>
                {DEMO_SCORES[ficha.id]?.score}/100 ({DEMO_SCORES[ficha.id]?.grade})
              </span>
              <span className="text-[10px] text-muted-foreground italic">Empresa demo: Comercializadora del Norte S.A.</span>
            </div>
          )}

          <div className="text-xs space-y-1">
            <div><span className="text-muted-foreground">Fuente de datos:</span> <span className="text-foreground">{ficha.fuente}</span></div>
            <div><span className="text-muted-foreground">Tabla en BD:</span> <span className="font-mono text-foreground">{ficha.tabla}</span></div>
          </div>

          {/* Tabla de metricas con valores demo */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1.5 text-muted-foreground font-medium">Metrica</th>
                <th className="text-left py-1.5 text-muted-foreground font-medium">Formula</th>
                <th className="text-left py-1.5 text-muted-foreground font-medium">Valor (demo)</th>
                <th className="text-left py-1.5 text-muted-foreground font-medium">Bueno</th>
                <th className="text-left py-1.5 text-muted-foreground font-medium">Malo</th>
              </tr>
            </thead>
            <tbody>
              {ficha.metricas.map((m) => {
                const demoVal = DEMO_VALUES[ficha.id]?.[m.nombre];
                return (
                  <tr key={m.nombre} className="border-b border-border/50">
                    <td className="py-1.5 font-medium text-foreground">{m.nombre}</td>
                    <td className="py-1.5 font-mono text-foreground">{m.formula}</td>
                    <td className="py-1.5 font-semibold text-primary">{demoVal ?? '—'}</td>
                    <td className="py-1.5 text-green-600">{m.bueno ?? '—'}</td>
                    <td className="py-1.5 text-red-500">{m.malo ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Donde verificar (colapsado) */}
          <details className="text-xs">
            <summary className="text-muted-foreground cursor-pointer hover:text-foreground">Donde verificar cada dato</summary>
            <div className="mt-2 space-y-1 pl-3">
              {ficha.metricas.map((m) => (
                <div key={m.nombre}><span className="font-medium text-foreground">{m.nombre}:</span> <span className="text-muted-foreground">{m.donde}</span></div>
              ))}
            </div>
          </details>

          {ficha.ejemplo && (
            <div className="bg-muted/30 rounded p-2 text-xs font-mono text-foreground">
              Ejemplo: {ficha.ejemplo}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pagina ──────────────────────────────────────────────────────────

export function FichasTecnicasPage() {
  const location = useLocation();
  const hashId = location.hash.replace('#', '');
  const motoresConPeso = FICHAS.filter((f) => !f.esGate);
  const gates = FICHAS.filter((f) => f.esGate);

  return (
    <div className="max-w-5xl pb-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver al dashboard
      </Link>

      <h2 className="text-2xl font-semibold text-foreground mb-1">
        Fichas Tecnicas de Motores
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Cada motor con su formula, fuente de datos, y umbrales. Para que puedas verificar de donde viene cada calculo.
      </p>

      {/* Motores con peso */}
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Motores de Analisis (contribuyen al score)
      </div>
      <div className="space-y-2 mb-8">
        {motoresConPeso.map((f) => (
          <FichaAccordion key={f.id} ficha={f} defaultOpen={f.id === hashId} />
        ))}
      </div>

      {/* Gates */}
      <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
        Gates (bloquean si fallan, no dan puntos)
      </div>
      <div className="space-y-2 mb-8">
        {gates.map((f) => (
          <FichaAccordion key={f.id} ficha={f} defaultOpen={f.id === hashId} />
        ))}
      </div>

      {/* Score Consolidado */}
      <div className="rounded-lg border border-border bg-card p-4 mb-4">
        <div className="text-sm font-semibold text-foreground mb-2">{SECCION_SCORE.titulo}</div>
        <div className="text-xs font-mono text-foreground mb-1">{SECCION_SCORE.formula}</div>
        <div className="text-xs text-muted-foreground mb-2">{SECCION_SCORE.detalle}</div>
        <div className="text-[10px] font-mono text-muted-foreground bg-muted/30 rounded p-2">{SECCION_SCORE.desglose}</div>
      </div>

      {/* Limite de Credito */}
      <div className="rounded-lg border border-border bg-card p-4 mb-4">
        <div className="text-sm font-semibold text-foreground mb-1">{SECCION_LIMITE.titulo}</div>
        <div className="text-xs text-muted-foreground mb-3">{SECCION_LIMITE.descripcion}</div>
        <table className="w-full text-xs border-collapse mb-2">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1 text-muted-foreground font-medium">Limite</th>
              <th className="text-left py-1 text-muted-foreground font-medium">Formula</th>
              <th className="text-left py-1 text-muted-foreground font-medium">Fuente</th>
            </tr>
          </thead>
          <tbody>
            {SECCION_LIMITE.limites.map((l) => (
              <tr key={l.nombre} className="border-b border-border/50">
                <td className="py-1 font-medium text-foreground">{l.nombre}</td>
                <td className="py-1 font-mono text-foreground">{l.formula}</td>
                <td className="py-1 text-muted-foreground">{l.fuente}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bg-muted/30 rounded p-2 text-xs font-mono text-foreground">{SECCION_LIMITE.ejemplo}</div>
      </div>

      {/* Perdida Esperada */}
      <div className="rounded-lg border border-border bg-card p-4 mb-4">
        <div className="text-sm font-semibold text-foreground mb-1">{SECCION_PE.titulo}</div>
        <div className="text-xs font-mono text-foreground mb-2">{SECCION_PE.formula}</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {SECCION_PE.variables.map((v) => (
            <div key={v.nombre} className="text-xs">
              <span className="font-semibold text-foreground">{v.nombre}</span>
              <span className="text-muted-foreground"> = {v.significado}</span>
              <div className="text-[10px] text-muted-foreground">{v.como}</div>
            </div>
          ))}
        </div>
        <table className="w-full text-xs border-collapse mb-2">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-1 text-muted-foreground font-medium">Dias de atraso</th>
              <th className="text-left py-1 text-muted-foreground font-medium">PD</th>
              <th className="text-left py-1 text-muted-foreground font-medium">Categoria</th>
            </tr>
          </thead>
          <tbody>
            {SECCION_PE.tablaPD.map((r) => (
              <tr key={r.dias} className="border-b border-border/50">
                <td className="py-1 font-mono text-foreground">{r.dias}</td>
                <td className="py-1 font-mono text-foreground">{r.pd}</td>
                <td className="py-1 text-muted-foreground">{r.cat}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bg-muted/30 rounded p-2 text-xs font-mono text-foreground">{SECCION_PE.ejemplo}</div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Para ver el flujo visual de datos, ve a{' '}
        <Link to="/mapa-datos" className="text-primary hover:underline">Mapa de Datos</Link>.
      </p>
    </div>
  );
}
