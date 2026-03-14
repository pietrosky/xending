/**
 * Demo data for all credit scoring engines.
 * Provides realistic input data so the frontend orchestrator can run
 * ALL engines with real calculations instead of hardcoded mock results.
 *
 * Company: "Distribuidora Industrial del Norte S.A. de C.V."
 * Sector: Manufacturing / Commerce
 * Requested: $2,500,000 MXN, 24 months
 */

import type { CFDI, Declaracion, ScorePyME, CreditoActivo, CreditoLiquidado, ConsultasBuro, CalificacionMensual, HawkResult, RazonesFinancieras } from '../api/syntageClient';
import type { CashFlowInput } from '../engines/cashflow';
import type { SatFacturacionInput } from '../engines/satFacturacion';
import type { BuroInput } from '../engines/buro';
import type { FinancialInput, BalanceData, IncomeData } from '../engines/financial';
import type { WorkingCapitalInput, WorkingCapitalPeriod } from '../engines/workingCapital';
import type { StabilityInput, StabilityPeriod } from '../engines/stability';
import type { NetworkInput, NetworkPeriod } from '../engines/network';
import type { GuaranteeInput } from '../engines/guarantee';
import type { FxRiskInput } from '../engines/fxRisk';
import type { EmployeeInput, EmployeePeriod } from '../engines/employee';
import type { DocumentationInput } from '../engines/documentation';
import type { PortfolioInput } from '../engines/portfolio';
import type { GraphFraudInput } from '../engines/graphFraud';
import type { ScenarioInput } from '../engines/scenarioEngine';
import type { CovenantInput } from '../engines/covenantEngine';
import type { BenchmarkInput } from '../engines/benchmark';
import type { PolicyEngineInput } from '../engines/policyEngine';
import type { ReviewFrequencyInput } from '../engines/reviewFrequency';
import type { PolicyConfig } from '../types/engine.types';

// ============================================================
// Application info
// ============================================================

export const DEMO_APPLICATION = {
  id: 'demo-001',
  rfc: 'DIN120315AB9',
  company_name: 'Distribuidora Industrial del Norte S.A. de C.V.',
  requested_amount: 2_500_000,
  term_months: 24,
  currency: 'MXN' as const,
  status: 'pending_scoring' as const,
  created_at: new Date().toISOString(),
};

// ============================================================
// Policy config (shared across engines)
// ============================================================

export const DEMO_POLICY_CONFIG: PolicyConfig = {
  guarantee_base_ratio: 2.0,
  score_weights: {
    cashflow: 0.16, sat_facturacion: 0.14, financial: 0.11, buro: 0.10,
    stability: 0.09, operational: 0.09, network: 0.08, fx_risk: 0.07,
    portfolio: 0.05, working_capital: 0.04, documentation: 0.04, employee: 0.03,
  },
  hard_stop_rules: [
    { code: 'hs_listas_negras', description: 'Aparece en listas negras', engine: 'compliance', condition: 'listas_negras === fail', active: true },
    { code: 'hs_69b', description: 'Listado 69B definitivo', engine: 'compliance', condition: '69b_definitivo === fail', active: true },
    { code: 'hs_dscr', description: 'DSCR proforma < 1.0', engine: 'cashflow', condition: 'dscr_proforma < 1.0', active: true },
  ],
  sector_limits: { manufacturing: 10_000_000, services: 5_000_000, commerce: 8_000_000 },
  currency_limits: { MXN: 10_000_000, USD: 500_000 },
};

// ============================================================
// Helper: generate monthly CFDIs
// ============================================================

function generateCFDIs(months: number, baseRevenue: number, type: 'emitidas' | 'recibidas'): CFDI[] {
  const cfdis: CFDI[] = [];
  const clients = [
    { rfc: 'AAA010101AAA', name: 'Cliente Principal' },
    { rfc: 'BBB020202BBB', name: 'Cliente Secundario' },
    { rfc: 'CCC030303CCC', name: 'Cliente Terciario' },
    { rfc: 'DDD040404DDD', name: 'Cliente Cuarto' },
    { rfc: 'EEE050505EEE', name: 'Cliente Quinto' },
  ];
  const suppliers = [
    { rfc: 'SUP010101AA1', name: 'Proveedor A' },
    { rfc: 'SUP020202BB2', name: 'Proveedor B' },
    { rfc: 'SUP030303CC3', name: 'Proveedor C' },
  ];
  const counterparties = type === 'emitidas' ? clients : suppliers;
  // Distribution: 32%, 25%, 20%, 13%, 10%
  const distribution = type === 'emitidas' ? [0.32, 0.25, 0.20, 0.13, 0.10] : [0.45, 0.35, 0.20];

  for (let m = 0; m < months; m++) {
    const date = new Date();
    date.setMonth(date.getMonth() - months + m);
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthVariation = 0.9 + Math.sin(m * 0.5) * 0.15;
    const monthRevenue = baseRevenue * monthVariation;

    counterparties.forEach((cp, i) => {
      const share = distribution[i] ?? 0.10;
      const amount = monthRevenue * share;
      const isCancelled = Math.random() < 0.03;
      cfdis.push({
        uuid: `cfdi-${type}-${m}-${i}`,
        rfc_emisor: type === 'emitidas' ? DEMO_APPLICATION.rfc : cp.rfc,
        rfc_receptor: type === 'emitidas' ? cp.rfc : DEMO_APPLICATION.rfc,
        fecha: `${period}-15`,
        total: Math.round(amount),
        subtotal: Math.round(amount / 1.16),
        moneda: 'MXN',
        tipo_comprobante: i % 2 === 0 ? 'I' : 'E',
        metodo_pago: Math.random() > 0.4 ? 'PUE' : 'PPD',
        estatus: isCancelled ? 'cancelado' : 'vigente',
        raw: {},
      });
    });
  }
  return cfdis;
}

// ============================================================
// SAT Facturacion demo data
// ============================================================

export function getDemoSatData(): SatFacturacionInput {
  const declaraciones: Declaracion[] = [2023, 2024, 2025].map((year) => ({
    ejercicio: year,
    tipo: 'anual',
    fecha_presentacion: `${year}-03-31`,
    ingresos_totales: 12_000_000 + (year - 2023) * 1_500_000,
    deducciones: 9_500_000 + (year - 2023) * 1_200_000,
    resultado_fiscal: 2_500_000 + (year - 2023) * 300_000,
    isr_causado: 750_000 + (year - 2023) * 90_000,
    raw: {},
  }));

  return {
    cfdis_emitidas: generateCFDIs(12, 1_250_000, 'emitidas'),
    cfdis_recibidas: generateCFDIs(12, 800_000, 'recibidas'),
    declaraciones,
  };
}

// ============================================================
// Buro demo data
// ============================================================

export function getDemoBuroData(): BuroInput {
  const score_pyme: ScorePyME = {
    score: 710,
    califica_rating: 'A-',
    causas: ['Buen historial de pago', 'Bajo nivel de endeudamiento'],
    fecha_consulta: new Date().toISOString(),
    raw: {},
  };

  const creditos_activos: CreditoActivo[] = [
    { institucion: 'BBVA', tipo_credito: 'Revolvente', moneda: 'MXN', monto_original: 1_000_000, monto_vigente: 450_000, plazo_meses: 12, atraso_dias: 0, historico_pagos: 'VVVVVVVVVVVV', raw: {} },
    { institucion: 'Banorte', tipo_credito: 'Simple', moneda: 'MXN', monto_original: 2_000_000, monto_vigente: 1_200_000, plazo_meses: 36, atraso_dias: 0, historico_pagos: 'VVVVVVVVVVVV', raw: {} },
    { institucion: 'Santander', tipo_credito: 'Arrendamiento', moneda: 'MXN', monto_original: 800_000, monto_vigente: 350_000, plazo_meses: 24, atraso_dias: 0, historico_pagos: 'VVVVVVVVVVVV', raw: {} },
  ];

  const creditos_liquidados: CreditoLiquidado[] = [
    { institucion: 'HSBC', tipo_credito: 'Simple', monto_original: 500_000, fecha_liquidacion: '2024-06-15', tipo_liquidacion: 'normal', raw: {} },
    { institucion: 'Scotiabank', tipo_credito: 'Revolvente', monto_original: 300_000, fecha_liquidacion: '2024-01-20', tipo_liquidacion: 'normal', raw: {} },
  ];

  const consultas_buro: ConsultasBuro = {
    ultimos_3_meses: 2,
    ultimos_12_meses: 4,
    ultimos_24_meses: 7,
    mas_24_meses: 3,
    detalle: [
      { fecha: '2025-12-01', institucion: 'Xending', tipo: 'financiera' },
      { fecha: '2025-11-15', institucion: 'BBVA', tipo: 'financiera' },
    ],
    raw: {},
  };

  const calificacion_cartera: CalificacionMensual[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - 12 + m);
    calificacion_cartera.push({
      periodo: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      vigente: 1_800_000 + m * 10_000,
      vencido_1_29: 50_000 - m * 2_000,
      vencido_30_59: 20_000 - m * 1_000,
      vencido_60_89: 5_000,
      vencido_90_mas: 2_000,
      raw: {},
    });
  }

  const hawk_checks: HawkResult[] = [
    { check_type: 'identity_verification', match_found: false, severity: 'info', details: {} },
    { check_type: 'address_verification', match_found: false, severity: 'info', details: {} },
  ];

  return { score_pyme, creditos_activos, creditos_liquidados, consultas_buro, calificacion_cartera, hawk_checks };
}

// ============================================================
// Financial demo data
// ============================================================

export function getDemoFinancialData(): FinancialInput {
  const balance_data: BalanceData[] = [2023, 2024, 2025].map((year) => ({
    fiscal_year: year,
    total_assets: 8_000_000 + (year - 2023) * 800_000,
    current_assets: 4_500_000 + (year - 2023) * 400_000,
    cash: 800_000 + (year - 2023) * 100_000,
    accounts_receivable: 2_200_000 + (year - 2023) * 150_000,
    inventory: 1_500_000 + (year - 2023) * 150_000,
    fixed_assets: 3_500_000 + (year - 2023) * 400_000,
    total_liabilities: 4_800_000 + (year - 2023) * 300_000,
    current_liabilities: 2_800_000 + (year - 2023) * 100_000,
    long_term_debt: 2_000_000 + (year - 2023) * 200_000,
    equity: 3_200_000 + (year - 2023) * 500_000,
  }));

  const income_data: IncomeData[] = [2023, 2024, 2025].map((year) => ({
    fiscal_year: year,
    revenue: 12_000_000 + (year - 2023) * 1_500_000,
    cost_of_goods: 7_800_000 + (year - 2023) * 900_000,
    gross_profit: 4_200_000 + (year - 2023) * 600_000,
    operating_expenses: 2_400_000 + (year - 2023) * 200_000,
    operating_income: 1_800_000 + (year - 2023) * 400_000,
    interest_expense: 480_000 + (year - 2023) * 30_000,
    net_income: 920_000 + (year - 2023) * 250_000,
    ebitda: 2_300_000 + (year - 2023) * 450_000,
    depreciation: 500_000 + (year - 2023) * 50_000,
  }));

  const razones_financieras: RazonesFinancieras = {
    liquidez: { coeficiente_solvencia: 1.61, prueba_acida: 1.07, capital_trabajo: 1_700_000 },
    actividad: { rotacion_cxc: 6.8, rotacion_inventarios: 5.2, rotacion_cxp: 8.1 },
    rentabilidad: { margen_bruto: 0.35, margen_operativo: 0.15, margen_neto: 0.077, roe: 0.288 },
    apalancamiento: { coeficiente_endeudamiento: 1.50, razon_deuda: 0.60 },
    cobertura: { cobertura_intereses: 4.79 },
    raw: {},
  };

  return {
    razones_financieras,
    balance_data,
    income_data,
    related_parties_data: {
      total_exposure: 1_200_000,
      total_revenue: 15_000_000,
      exposure_pct: 0.08,
      parties: [
        { name: 'Grupo Industrial Norte', rfc: 'GIN100101XX0', amount: 800_000, type: 'client' },
        { name: 'Transportes del Norte', rfc: 'TDN100101XX0', amount: 400_000, type: 'supplier' },
      ],
    },
  };
}

// ============================================================
// CashFlow demo data
// ============================================================

export function getDemoCashFlowData(): CashFlowInput {
  return {
    periods: [2023, 2024, 2025].map((year) => ({
      fiscal_year: year,
      revenue: 12_000_000 + (year - 2023) * 1_500_000,
      costs: 7_800_000 + (year - 2023) * 900_000,
      operating_expenses: 2_400_000 + (year - 2023) * 200_000,
      depreciation: 500_000 + (year - 2023) * 50_000,
      amortization: 100_000,
      interest_expense: 480_000 + (year - 2023) * 30_000,
      taxes: 350_000 + (year - 2023) * 80_000,
      capex: 400_000 + (year - 2023) * 50_000,
    })),
    debt_info: { existing_debt_service_monthly: 85_000 },
    loan_request: {
      requested_amount: 2_500_000,
      term_months: 24,
      annual_interest_rate: 0.18,
      currency: 'MXN',
    },
  };
}

// ============================================================
// Working Capital demo data
// ============================================================

export function getDemoWorkingCapitalData(): WorkingCapitalInput {
  const periods: WorkingCapitalPeriod[] = [];
  for (let m = 0; m < 6; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - 6 + m);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    periods.push({
      period,
      revenue: 1_200_000 + m * 30_000,
      cost_of_goods_sold: 780_000 + m * 15_000,
      accounts_receivable: 2_200_000 + m * 50_000,
      inventory: 1_500_000 + m * 20_000,
      accounts_payable: 900_000 + m * 10_000,
      cxc_aging: { current: 1_600_000, days_1_30: 350_000, days_31_60: 150_000, days_61_90: 60_000, days_90_plus: 40_000 },
      cxp_aging: { current: 600_000, days_1_30: 200_000, days_31_60: 70_000, days_61_90: 20_000, days_90_plus: 10_000 },
      collections_received: 1_050_000 + m * 25_000,
      total_invoiced: 1_200_000 + m * 30_000,
      early_payment_discounts_taken: 15_000,
      early_payment_discounts_offered: 8_000,
      total_purchases: 780_000 + m * 15_000,
    });
  }
  return { periods };
}

// ============================================================
// Stability demo data
// ============================================================

export function getDemoStabilityData(): StabilityInput {
  const periods: StabilityPeriod[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - 12 + m);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const baseRevenue = 1_200_000;
    const variation = Math.sin(m * 0.5) * 0.08;
    const revenue = Math.round(baseRevenue * (1 + variation + m * 0.01));
    periods.push({
      period,
      revenue,
      expenses: Math.round(revenue * 0.82),
      collections: Math.round(revenue * 0.88),
      payments: Math.round(revenue * 0.75),
      cancellations: Math.round(revenue * 0.025),
      credit_notes: Math.round(revenue * 0.015),
      active_clients: 42 + Math.floor(m * 0.5),
    });
  }
  return { periods };
}

// ============================================================
// Network demo data
// ============================================================

export function getDemoNetworkData(): NetworkInput {
  const periods: NetworkPeriod[] = [];
  for (let m = 0; m < 6; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - 6 + m);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const totalRevenue = 1_250_000 + m * 30_000;
    periods.push({
      period,
      clients: [
        { rfc: 'AAA010101AAA', name: 'Aceros del Pacifico', total_amount: totalRevenue * 0.32, is_government: false, is_related_party: false, sector: 'manufacturing' },
        { rfc: 'BBB020202BBB', name: 'Construcciones MX', total_amount: totalRevenue * 0.25, is_government: false, is_related_party: false, sector: 'construction' },
        { rfc: 'CCC030303CCC', name: 'Gobierno Estatal NL', total_amount: totalRevenue * 0.12, is_government: true, is_related_party: false, sector: 'government' },
        { rfc: 'DDD040404DDD', name: 'Distribuidora Centro', total_amount: totalRevenue * 0.18, is_government: false, is_related_party: false, sector: 'commerce' },
        { rfc: 'EEE050505EEE', name: 'Grupo Industrial Norte', total_amount: totalRevenue * 0.08, is_government: false, is_related_party: true, sector: 'manufacturing' },
        { rfc: 'FFF060606FFF', name: 'Otros clientes', total_amount: totalRevenue * 0.05, is_government: false, is_related_party: false, sector: 'services' },
      ],
      suppliers: [
        { rfc: 'SUP010101AA1', name: 'Materias Primas SA', total_amount: 400_000, is_government: false, is_related_party: false, sector: 'manufacturing' },
        { rfc: 'SUP020202BB2', name: 'Transportes del Norte', total_amount: 200_000, is_government: false, is_related_party: true, sector: 'logistics' },
        { rfc: 'SUP030303CC3', name: 'Empaques Industriales', total_amount: 150_000, is_government: false, is_related_party: false, sector: 'manufacturing' },
      ],
      products: [
        { product_code: 'P001', product_name: 'Perfiles de acero', total_sales: totalRevenue * 0.45 },
        { product_code: 'P002', product_name: 'Laminas industriales', total_sales: totalRevenue * 0.30 },
        { product_code: 'P003', product_name: 'Tuberia', total_sales: totalRevenue * 0.15 },
        { product_code: 'P004', product_name: 'Accesorios', total_sales: totalRevenue * 0.10 },
      ],
      financial_institutions: [
        { name: 'BBVA', type: 'bank', transaction_volume: 800_000 },
        { name: 'Banorte', type: 'bank', transaction_volume: 400_000 },
      ],
      total_revenue: totalRevenue,
      total_expenses: Math.round(totalRevenue * 0.65),
    });
  }
  return { periods };
}

// ============================================================
// Guarantee demo data
// ============================================================

export function getDemoGuaranteeData(): GuaranteeInput {
  return {
    monto_solicitado: 2_500_000,
    monto_aprobado_preliminar: 2_000_000,
    moneda_credito: 'MXN',
    guarantees: [
      {
        tipo: 'inmueble',
        valor_comercial: 4_500_000,
        valor_forzoso: 3_600_000,
        liquidez: 0.7,
        documentacion_completa: true,
        moneda: 'MXN',
        jurisdiccion: 'Nuevo Leon',
      },
      {
        tipo: 'cuentas_por_cobrar',
        valor_comercial: 1_200_000,
        valor_forzoso: 800_000,
        liquidez: 0.85,
        documentacion_completa: true,
        moneda: 'MXN',
        jurisdiccion: 'Nuevo Leon',
      },
    ],
    consolidated_score: 72,
    historical_coverage: [
      { period: '2024-Q1', coverage_ratio: 2.1 },
      { period: '2024-Q2', coverage_ratio: 2.0 },
      { period: '2024-Q3', coverage_ratio: 1.95 },
      { period: '2024-Q4', coverage_ratio: 1.9 },
    ],
  };
}

// ============================================================
// FX Risk demo data
// ============================================================

export function getDemoFxRiskData(): FxRiskInput {
  return {
    moneda_credito: 'MXN',
    revenue: { usd: 180_000, mxn: 14_000_000 },
    costs: { usd: 120_000, mxn: 9_200_000 },
    accounts_receivable: { usd: 30_000, mxn: 2_200_000 },
    debt: { usd: 0, mxn: 4_000_000 },
    ebitda: 3_200_000,
    annual_debt_service: 1_020_000,
    guarantee_value_mxn: 4_400_000,
    loan_amount: 2_500_000,
    historical_mismatch: [
      { period: '2024-Q1', mismatch_ratio: 0.88 },
      { period: '2024-Q2', mismatch_ratio: 0.87 },
      { period: '2024-Q3', mismatch_ratio: 0.89 },
      { period: '2024-Q4', mismatch_ratio: 0.88 },
    ],
  };
}

// ============================================================
// Employee demo data
// ============================================================

export function getDemoEmployeeData(): EmployeeInput {
  const periods: EmployeePeriod[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - 12 + m);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    periods.push({
      period,
      headcount: 35 + Math.floor(m * 0.3),
      total_payroll: 420_000 + m * 5_000,
      revenue: 1_250_000 + m * 30_000,
    });
  }
  return { periods };
}

// ============================================================
// Documentation demo data
// ============================================================

export function getDemoDocumentationData(): DocumentationInput {
  const now = new Date().toISOString();
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 6);

  return {
    documents: [
      { id: 'd1', application_id: DEMO_APPLICATION.id, document_type: 'acta_constitutiva', file_name: 'acta.pdf', file_url: '/docs/acta.pdf', status: 'validated', is_required: true, is_blocking: true, expires_at: null, created_at: now },
      { id: 'd2', application_id: DEMO_APPLICATION.id, document_type: 'poder', file_name: 'poder.pdf', file_url: '/docs/poder.pdf', status: 'validated', is_required: true, is_blocking: false, expires_at: futureDate.toISOString(), created_at: now },
      { id: 'd3', application_id: DEMO_APPLICATION.id, document_type: 'ine', file_name: 'ine.pdf', file_url: '/docs/ine.pdf', status: 'validated', is_required: true, is_blocking: true, expires_at: futureDate.toISOString(), created_at: now },
      { id: 'd4', application_id: DEMO_APPLICATION.id, document_type: 'comprobante_domicilio', file_name: 'domicilio.pdf', file_url: '/docs/dom.pdf', status: 'uploaded', is_required: true, is_blocking: false, expires_at: null, created_at: now },
      { id: 'd5', application_id: DEMO_APPLICATION.id, document_type: 'estados_financieros', file_name: 'ef_2024.pdf', file_url: '/docs/ef.pdf', status: 'validated', is_required: true, is_blocking: false, expires_at: null, created_at: now },
      { id: 'd6', application_id: DEMO_APPLICATION.id, document_type: 'declaraciones', file_name: 'dec_2024.pdf', file_url: '/docs/dec.pdf', status: 'validated', is_required: true, is_blocking: false, expires_at: null, created_at: now },
    ],
    validations: [
      { id: 'v1', document_id: 'd1', validation_type: 'authenticity', result: 'pass', details: {}, created_at: now },
      { id: 'v2', document_id: 'd3', validation_type: 'identity_match', result: 'pass', details: {}, created_at: now },
      { id: 'v3', document_id: 'd5', validation_type: 'consistency', result: 'pass', details: {}, created_at: now },
      { id: 'v4', document_id: 'd6', validation_type: 'fiscal_match', result: 'pass', details: {}, created_at: now },
      { id: 'v5', document_id: 'd4', validation_type: 'address_match', result: 'warning', details: { note: 'Domicilio no coincide exactamente' }, created_at: now },
    ],
  };
}

// ============================================================
// Portfolio demo data
// ============================================================

export function getDemoPortfolioData(): PortfolioInput {
  return {
    periods: [
      {
        period: '2025-Q4',
        positions: [
          { name: 'Empresa A', sector: 'manufacturing', currency: 'MXN', group: 'independent', amount: 3_000_000 },
          { name: 'Empresa B', sector: 'services', currency: 'MXN', group: 'independent', amount: 2_500_000 },
          { name: 'Empresa C', sector: 'commerce', currency: 'MXN', group: 'grupo_norte', amount: 4_000_000 },
          { name: 'Empresa D', sector: 'manufacturing', currency: 'USD', group: 'independent', amount: 1_500_000 },
          { name: 'Empresa E', sector: 'agriculture', currency: 'MXN', group: 'independent', amount: 2_000_000 },
          { name: 'Empresa F', sector: 'services', currency: 'MXN', group: 'grupo_sur', amount: 1_800_000 },
        ],
        total_portfolio: 14_800_000,
      },
    ],
    new_loan: {
      sector: 'manufacturing',
      currency: 'MXN',
      group: 'independent',
      amount: 2_500_000,
      pd: 0.03,
      lgd: 0.40,
    },
  };
}

// ============================================================
// Graph Fraud demo data
// ============================================================

export function getDemoGraphFraudData(): GraphFraudInput {
  return {
    periods: [{
      period: '2025-Q4',
      nodes: [
        { id: 'n1', type: 'company', label: DEMO_APPLICATION.company_name, is_applicant: true, employee_count: 37, age_months: 156, transaction_count: 120 },
        { id: 'n2', type: 'company', label: 'Aceros del Pacifico', employee_count: 85, age_months: 240 },
        { id: 'n3', type: 'company', label: 'Construcciones MX', employee_count: 120, age_months: 180 },
        { id: 'n4', type: 'company', label: 'Grupo Industrial Norte', is_applicant: false, employee_count: 200, age_months: 300 },
        { id: 'n5', type: 'person', label: 'Juan Perez (Rep Legal)' },
        { id: 'n6', type: 'address', label: 'Av. Industrial 1234, Monterrey' },
      ],
      edges: [
        { source: 'n1', target: 'n2', type: 'invoiced', amount: 4_800_000, count: 48 },
        { source: 'n1', target: 'n3', type: 'invoiced', amount: 3_750_000, count: 36 },
        { source: 'n4', target: 'n1', type: 'invoiced', amount: 1_200_000, count: 12 },
        { source: 'n5', target: 'n1', type: 'shares_representative' },
        { source: 'n5', target: 'n4', type: 'shares_shareholder' },
        { source: 'n1', target: 'n6', type: 'shares_address' },
      ],
      total_invoiced: 15_000_000,
      total_received: 9_600_000,
    }],
  };
}

// ============================================================
// Scenario Engine demo data
// ============================================================

export function getDemoScenarioData(): ScenarioInput {
  return {
    base_revenue: 15_000_000,
    base_margin: 0.213,
    base_dso: 52,
    base_ebitda: 3_200_000,
    annual_debt_service: 1_020_000,
    cash_balance: 1_000_000,
    monthly_fixed_costs: 250_000,
    fx_exposure_pct: 0.013,
    currency: 'MXN',
    periods: [
      { period: '2024-Q1', revenue: 3_500_000, margin: 0.20, dso: 48, dscr: 1.45 },
      { period: '2024-Q2', revenue: 3_600_000, margin: 0.21, dso: 50, dscr: 1.48 },
      { period: '2024-Q3', revenue: 3_800_000, margin: 0.22, dso: 51, dscr: 1.52 },
      { period: '2024-Q4', revenue: 4_100_000, margin: 0.21, dso: 52, dscr: 1.50 },
    ],
  };
}

// ============================================================
// Covenant Engine demo data
// ============================================================

export function getDemoCovenantData(): CovenantInput {
  return {
    covenants: [
      { type: 'financial', name: 'dscr', threshold: 1.20, current_value: 1.38, higher_is_better: true },
      { type: 'financial', name: 'leverage', threshold: 3.0, current_value: 1.50, higher_is_better: false },
      { type: 'financial', name: 'current_ratio', threshold: 1.0, current_value: 1.61, higher_is_better: true },
      { type: 'financial', name: 'margin', threshold: 0.10, current_value: 0.15, higher_is_better: true },
      { type: 'reporting', name: 'timely_delivery', threshold: 1.0, current_value: 1.0, higher_is_better: true },
    ],
    periods: [
      {
        period: '2024-Q3',
        covenants: [
          { type: 'financial', name: 'dscr', threshold: 1.20, current_value: 1.35, higher_is_better: true },
          { type: 'financial', name: 'leverage', threshold: 3.0, current_value: 1.55, higher_is_better: false },
          { type: 'financial', name: 'current_ratio', threshold: 1.0, current_value: 1.55, higher_is_better: true },
        ],
      },
      {
        period: '2024-Q4',
        covenants: [
          { type: 'financial', name: 'dscr', threshold: 1.20, current_value: 1.38, higher_is_better: true },
          { type: 'financial', name: 'leverage', threshold: 3.0, current_value: 1.50, higher_is_better: false },
          { type: 'financial', name: 'current_ratio', threshold: 1.0, current_value: 1.61, higher_is_better: true },
        ],
      },
    ],
  };
}

// ============================================================
// Benchmark Engine demo data
// ============================================================

export function getDemoBenchmarkData(): BenchmarkInput {
  return {
    sector: 'manufacturing',
    company_size: 'medium',
    region: 'norte',
    applicant_metrics: [
      { metric_name: 'current_ratio', value: 1.85 },
      { metric_name: 'debt_to_equity', value: 0.62 },
      { metric_name: 'net_margin', value: 0.08 },
      { metric_name: 'roa', value: 0.06 },
      { metric_name: 'dscr', value: 1.38 },
      { metric_name: 'revenue_growth', value: 0.12 },
    ],
  };
}

// ============================================================
// Policy Engine demo data
// ============================================================

export function getDemoPolicyData(): PolicyEngineInput {
  return {
    requested_amount: 2_500_000,
    term_months: 24,
    currency: 'MXN',
    sector: 'manufacturing',
    consolidated_score: 72,
    grade: 'B',
  };
}

// ============================================================
// Review Frequency demo data
// ============================================================

export function getDemoReviewFrequencyData(): ReviewFrequencyInput {
  return {
    consolidated_score: 72,
    grade: 'B',
    dscr: 1.38,
    previous_score: 68,
    buro_score: 710,
    previous_buro_score: 700,
    has_covenant_breach: false,
    max_payment_delay_days: 0,
    has_new_legal_incidents: false,
    revenue_change_pct: 0.12,
    has_usd_exposure_uncovered: false,
    has_high_concentration: false,
  };
}
