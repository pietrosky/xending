import { describe, it, expect } from 'vitest';
import type { CFDI, Declaracion } from '../api/syntageClient';
import type { EngineInput, PolicyConfig } from '../types/engine.types';
import {
  calcRevenueConcentration,
  calcPaymentBehavior,
  calcDSO,
  calcDPO,
  calcCancellationRate,
  calcFacturadoVsDeclarado,
  calcProductDiversification,
  runSatFacturacionEngine,
} from './satFacturacion';
import type { SatFacturacionInput } from './satFacturacion';

// ============================================================
// Test helpers
// ============================================================

const POLICY_CONFIG: PolicyConfig = {
  guarantee_base_ratio: 2,
  score_weights: {},
  hard_stop_rules: [],
  sector_limits: {},
  currency_limits: {},
};

function makeCFDI(overrides: Partial<CFDI> = {}): CFDI {
  return {
    uuid: 'uuid-001',
    rfc_emisor: 'EMIT000000AAA',
    rfc_receptor: 'RECV000000BBB',
    fecha: '2024-06-15',
    total: 10000,
    subtotal: 8620,
    moneda: 'MXN',
    tipo_comprobante: 'I',
    metodo_pago: 'PUE',
    estatus: 'vigente',
    raw: {},
    ...overrides,
  };
}

function makeDeclaracion(overrides: Partial<Declaracion> = {}): Declaracion {
  return {
    ejercicio: 2024,
    tipo: 'anual',
    fecha_presentacion: '2025-04-01',
    ingresos_totales: 1000000,
    deducciones: 600000,
    resultado_fiscal: 400000,
    isr_causado: 120000,
    raw: {},
    ...overrides,
  };
}

function makeInput(satData: SatFacturacionInput): EngineInput {
  return {
    application_id: 'app-001',
    syntage_data: satData,
    policy_config: POLICY_CONFIG,
  };
}

// ============================================================
// Unit tests: calcRevenueConcentration
// ============================================================

describe('calcRevenueConcentration', () => {
  it('returns zero for empty array', () => {
    const result = calcRevenueConcentration([]);
    expect(result.top1_pct).toBe(0);
    expect(result.hhi).toBe(0);
    expect(result.total_revenue).toBe(0);
  });

  it('returns 100% concentration for single client', () => {
    const cfdis = [
      makeCFDI({ rfc_receptor: 'A', total: 5000 }),
      makeCFDI({ rfc_receptor: 'A', total: 3000 }),
    ];
    const result = calcRevenueConcentration(cfdis);
    expect(result.top1_pct).toBe(1);
    expect(result.hhi).toBe(10000);
    expect(result.total_revenue).toBe(8000);
  });

  it('calculates correct shares for multiple clients', () => {
    const cfdis = [
      makeCFDI({ rfc_receptor: 'A', total: 6000 }),
      makeCFDI({ rfc_receptor: 'B', total: 3000 }),
      makeCFDI({ rfc_receptor: 'C', total: 1000 }),
    ];
    const result = calcRevenueConcentration(cfdis);
    expect(result.top1_pct).toBe(0.6);
    expect(result.top3_pct).toBeCloseTo(1);
    expect(result.total_revenue).toBe(10000);
  });

  it('excludes cancelled CFDIs', () => {
    const cfdis = [
      makeCFDI({ rfc_receptor: 'A', total: 5000 }),
      makeCFDI({ rfc_receptor: 'B', total: 5000, estatus: 'cancelado' }),
    ];
    const result = calcRevenueConcentration(cfdis);
    expect(result.top1_pct).toBe(1);
    expect(result.total_revenue).toBe(5000);
  });
});

// ============================================================
// Unit tests: calcPaymentBehavior
// ============================================================

describe('calcPaymentBehavior', () => {
  it('returns zero for empty array', () => {
    const result = calcPaymentBehavior([]);
    expect(result.pue_ratio).toBe(0);
    expect(result.ppd_ratio).toBe(0);
  });

  it('calculates correct PUE/PPD split', () => {
    const cfdis = [
      makeCFDI({ metodo_pago: 'PUE', total: 7000 }),
      makeCFDI({ metodo_pago: 'PPD', total: 3000 }),
    ];
    const result = calcPaymentBehavior(cfdis);
    expect(result.pue_ratio).toBe(0.7);
    expect(result.ppd_ratio).toBe(0.3);
    expect(result.pue_total).toBe(7000);
    expect(result.ppd_total).toBe(3000);
  });

  it('excludes cancelled CFDIs', () => {
    const cfdis = [
      makeCFDI({ metodo_pago: 'PUE', total: 5000 }),
      makeCFDI({ metodo_pago: 'PPD', total: 5000, estatus: 'cancelado' }),
    ];
    const result = calcPaymentBehavior(cfdis);
    expect(result.pue_ratio).toBe(1);
    expect(result.ppd_ratio).toBe(0);
  });
});

// ============================================================
// Unit tests: calcDSO / calcDPO
// ============================================================

describe('calcDSO', () => {
  it('returns 0 for empty array', () => {
    expect(calcDSO([])).toBe(0);
  });

  it('returns 0 when all PUE', () => {
    const cfdis = [makeCFDI({ metodo_pago: 'PUE', total: 10000 })];
    expect(calcDSO(cfdis)).toBe(0);
  });

  it('calculates DSO based on PPD proportion', () => {
    const cfdis = [
      makeCFDI({ metodo_pago: 'PUE', total: 5000 }),
      makeCFDI({ metodo_pago: 'PPD', total: 5000 }),
    ];
    // PPD/total = 0.5, DSO = 0.5 * 30 = 15
    expect(calcDSO(cfdis)).toBe(15);
  });
});

describe('calcDPO', () => {
  it('returns 0 for empty array', () => {
    expect(calcDPO([])).toBe(0);
  });

  it('calculates DPO based on PPD proportion', () => {
    const cfdis = [
      makeCFDI({ metodo_pago: 'PUE', total: 3000 }),
      makeCFDI({ metodo_pago: 'PPD', total: 7000 }),
    ];
    // PPD/total = 0.7, DPO = 0.7 * 30 = 21
    expect(calcDPO(cfdis)).toBe(21);
  });
});

// ============================================================
// Unit tests: calcCancellationRate
// ============================================================

describe('calcCancellationRate', () => {
  it('returns 0 for empty array', () => {
    const result = calcCancellationRate([]);
    expect(result.rate).toBe(0);
    expect(result.cancelled_count).toBe(0);
  });

  it('calculates correct rate', () => {
    const cfdis = [
      makeCFDI({ estatus: 'vigente' }),
      makeCFDI({ estatus: 'vigente' }),
      makeCFDI({ estatus: 'cancelado', total: 3000 }),
    ];
    const result = calcCancellationRate(cfdis);
    expect(result.rate).toBeCloseTo(1 / 3);
    expect(result.cancelled_count).toBe(1);
    expect(result.total_count).toBe(3);
    expect(result.cancelled_amount).toBe(3000);
  });

  it('returns 0 when no cancellations', () => {
    const cfdis = [makeCFDI(), makeCFDI()];
    const result = calcCancellationRate(cfdis);
    expect(result.rate).toBe(0);
  });
});

// ============================================================
// Unit tests: calcFacturadoVsDeclarado
// ============================================================

describe('calcFacturadoVsDeclarado', () => {
  it('returns ratio 1 when amounts match', () => {
    const emitidas = [makeCFDI({ total: 500000 }), makeCFDI({ total: 500000 })];
    const declaraciones = [makeDeclaracion({ ingresos_totales: 1000000 })];
    const result = calcFacturadoVsDeclarado(emitidas, declaraciones);
    expect(result.ratio).toBe(1);
    expect(result.facturado).toBe(1000000);
    expect(result.declarado).toBe(1000000);
  });

  it('detects facturado > declarado', () => {
    const emitidas = [makeCFDI({ total: 1200000 })];
    const declaraciones = [makeDeclaracion({ ingresos_totales: 1000000 })];
    const result = calcFacturadoVsDeclarado(emitidas, declaraciones);
    expect(result.ratio).toBe(1.2);
  });

  it('handles zero declarado', () => {
    const emitidas = [makeCFDI({ total: 100000 })];
    const result = calcFacturadoVsDeclarado(emitidas, []);
    expect(result.ratio).toBe(999);
  });

  it('excludes cancelled CFDIs from facturado', () => {
    const emitidas = [
      makeCFDI({ total: 500000 }),
      makeCFDI({ total: 500000, estatus: 'cancelado' }),
    ];
    const declaraciones = [makeDeclaracion({ ingresos_totales: 500000 })];
    const result = calcFacturadoVsDeclarado(emitidas, declaraciones);
    expect(result.ratio).toBe(1);
  });
});

// ============================================================
// Unit tests: calcProductDiversification
// ============================================================

describe('calcProductDiversification', () => {
  it('returns max HHI for empty array', () => {
    const result = calcProductDiversification([]);
    expect(result.hhi).toBe(10000);
    expect(result.product_count).toBe(0);
  });

  it('returns 10000 for single product type', () => {
    const cfdis = [
      makeCFDI({ tipo_comprobante: 'I' }),
      makeCFDI({ tipo_comprobante: 'I' }),
    ];
    const result = calcProductDiversification(cfdis);
    expect(result.hhi).toBe(10000);
    expect(result.product_count).toBe(1);
  });

  it('returns lower HHI for diversified products', () => {
    const cfdis = [
      makeCFDI({ tipo_comprobante: 'I', total: 5000 }),
      makeCFDI({ tipo_comprobante: 'E', total: 5000 }),
    ];
    const result = calcProductDiversification(cfdis);
    // 50/50 split: HHI = 0.5^2 + 0.5^2 = 0.5 * 10000 = 5000
    expect(result.hhi).toBe(5000);
    expect(result.product_count).toBe(2);
  });
});

// ============================================================
// Integration tests: runSatFacturacionEngine
// ============================================================

describe('runSatFacturacionEngine', () => {
  it('returns blocked when no syntage_data', async () => {
    const input: EngineInput = {
      application_id: 'app-001',
      policy_config: POLICY_CONFIG,
    };
    const result = await runSatFacturacionEngine(input);

    expect(result.engine_name).toBe('sat_facturacion');
    expect(result.module_status).toBe('blocked');
    expect(result.module_score).toBe(0);
    expect(result.module_grade).toBe('F');
    expect(result.risk_flags[0]?.code).toBe('no_sat_data');
  });

  it('returns high score for healthy company', async () => {
    // Diversified clients, high PUE, low cancellations, matching declarations
    const emitidas: CFDI[] = [];
    const clients = ['A', 'B', 'C', 'D', 'E'];
    for (let m = 1; m <= 6; m++) {
      for (const client of clients) {
        emitidas.push(
          makeCFDI({
            uuid: `e-${m}-${client}`,
            rfc_receptor: client,
            fecha: `2024-${String(m).padStart(2, '0')}-15`,
            total: 20000,
            metodo_pago: 'PUE',
            estatus: 'vigente',
          }),
        );
      }
    }

    const totalFact = 20000 * 5 * 6; // 600000
    const input = makeInput({
      cfdis_emitidas: emitidas,
      cfdis_recibidas: [
        makeCFDI({ metodo_pago: 'PUE', total: 50000 }),
      ],
      declaraciones: [makeDeclaracion({ ingresos_totales: totalFact })],
    });

    const result = await runSatFacturacionEngine(input);

    expect(result.module_score).toBeGreaterThanOrEqual(75);
    expect(['A', 'B']).toContain(result.module_grade);
    expect(result.module_status).toBe('pass');
    expect(result.risk_flags).toHaveLength(0);
    expect(result.trends.length).toBeGreaterThan(0);
    expect(result.key_metrics.revenue_concentration).toBeDefined();
    expect(result.key_metrics.pue_ratio).toBeDefined();
    expect(result.key_metrics.dso).toBeDefined();
  });

  it('flags high cancellation rate', async () => {
    const emitidas = [
      makeCFDI({ total: 10000, estatus: 'vigente' }),
      makeCFDI({ total: 10000, estatus: 'vigente' }),
      makeCFDI({ total: 10000, estatus: 'cancelado' }),
      makeCFDI({ total: 10000, estatus: 'cancelado' }),
    ];

    const input = makeInput({
      cfdis_emitidas: emitidas,
      cfdis_recibidas: [],
      declaraciones: [makeDeclaracion({ ingresos_totales: 20000 })],
    });

    const result = await runSatFacturacionEngine(input);

    expect(result.risk_flags.some((f) => f.code === 'high_cancellation_risk')).toBe(true);
  });

  it('flags fiscal inconsistency when facturado >> declarado', async () => {
    const emitidas = [makeCFDI({ total: 2000000 })];
    const input = makeInput({
      cfdis_emitidas: emitidas,
      cfdis_recibidas: [],
      declaraciones: [makeDeclaracion({ ingresos_totales: 1000000 })],
    });

    const result = await runSatFacturacionEngine(input);

    expect(result.risk_flags.some((f) => f.code === 'fiscal_inconsistency_risk')).toBe(true);
  });

  it('flags high client concentration', async () => {
    const emitidas = [
      makeCFDI({ rfc_receptor: 'BIG_CLIENT', total: 900000 }),
      makeCFDI({ rfc_receptor: 'SMALL', total: 100000 }),
    ];

    const input = makeInput({
      cfdis_emitidas: emitidas,
      cfdis_recibidas: [],
      declaraciones: [makeDeclaracion({ ingresos_totales: 1000000 })],
    });

    const result = await runSatFacturacionEngine(input);

    expect(result.risk_flags.some((f) => f.code === 'high_client_concentration')).toBe(true);
  });

  it('includes benchmark comparisons', async () => {
    const emitidas = [makeCFDI({ total: 100000 })];
    const input = makeInput({
      cfdis_emitidas: emitidas,
      cfdis_recibidas: [],
      declaraciones: [makeDeclaracion({ ingresos_totales: 100000 })],
    });

    const result = await runSatFacturacionEngine(input);

    expect(result.benchmark_comparison.cancellation_rate).toBeDefined();
    expect(result.benchmark_comparison.pue_ratio).toBeDefined();
    expect(result.benchmark_comparison.dso).toBeDefined();
    expect(result.benchmark_comparison.dpo).toBeDefined();
  });

  it('score is between 0 and 100', async () => {
    const emitidas = [makeCFDI({ total: 50000 })];
    const input = makeInput({
      cfdis_emitidas: emitidas,
      cfdis_recibidas: [],
      declaraciones: [makeDeclaracion({ ingresos_totales: 50000 })],
    });

    const result = await runSatFacturacionEngine(input);

    expect(result.module_score).toBeGreaterThanOrEqual(0);
    expect(result.module_score).toBeLessThanOrEqual(100);
    expect(result.module_max_score).toBe(100);
  });
});
