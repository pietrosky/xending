/**
 * Engine de Pérdida Esperada (PE) — Expected Loss.
 *
 * Implementa la fórmula estándar CNBV para SOFOM ENR:
 *   PE = PD × EAD × LGD
 *
 * Donde:
 *   PD  = Probabilidad de Default (basada en días de atraso)
 *   EAD = Exposure at Default (saldo utilizado)
 *   LGD = Loss Given Default (40% por defecto, estándar CNBV)
 *
 * @see docs/SCORING_METHODOLOGY_EXCEL_REFERENCE.md — Sección 4
 */

import type {
  ExpectedLossInput,
  ExpectedLossResult,
  PortfolioExpectedLossResult,
} from '../types/scoring.types';

// ─── Constantes ──────────────────────────────────────────────────────

/** LGD estándar CNBV para SOFOM ENR (40%) */
export const DEFAULT_LGD = 0.40;

// ─── Tabla de PD por días de atraso ──────────────────────────────────

/**
 * Rangos de días de atraso → Probabilidad de Default.
 * Basado en la metodología del Excel y estándares CNBV.
 */
const PD_TABLE: Array<{ maxDays: number; pd: number; category: string }> = [
  { maxDays: 0,   pd: 0.02, category: 'Al corriente' },
  { maxDays: 30,  pd: 0.05, category: '1-30 días' },
  { maxDays: 60,  pd: 0.10, category: '31-60 días' },
  { maxDays: 90,  pd: 0.25, category: '61-90 días' },
  { maxDays: 120, pd: 0.50, category: '91-120 días' },
  { maxDays: 180, pd: 0.75, category: '121-180 días' },
  { maxDays: Infinity, pd: 1.00, category: '> 180 días' },
];

/**
 * Obtiene la PD y categoría para un número de días de atraso.
 */
export function getPdForDaysPastDue(daysPastDue: number): { pd: number; category: string } {
  for (const range of PD_TABLE) {
    if (daysPastDue <= range.maxDays) {
      return { pd: range.pd, category: range.category };
    }
  }
  // Fallback (no debería llegar aquí por el Infinity)
  return { pd: 1.0, category: '> 180 días' };
}

// ─── Cálculo individual ──────────────────────────────────────────────

/**
 * Calcula la Pérdida Esperada para un cliente individual.
 *
 * @param input - Datos del cliente (EAD, días de atraso, LGD opcional)
 * @returns Resultado con PE, PD, LGD y detalle
 *
 * @example
 * ```ts
 * const result = calculateExpectedLoss({
 *   clientId: 'C001',
 *   clientName: 'Empresa ABC',
 *   ead: 3_000_000,
 *   daysPastDue: 0,
 * });
 * // result.expectedLoss = 3,000,000 × 0.02 × 0.40 = 24,000
 * ```
 */
export function calculateExpectedLoss(input: ExpectedLossInput): ExpectedLossResult {
  const { pd, category } = getPdForDaysPastDue(input.daysPastDue);
  const lgd = input.lgd ?? DEFAULT_LGD;
  const expectedLoss = round2(input.ead * pd * lgd);
  const expectedLossPct = input.ead > 0 ? round2((expectedLoss / input.ead) * 100) : 0;

  return {
    clientId: input.clientId,
    clientName: input.clientName,
    ead: input.ead,
    pd,
    lgd,
    expectedLoss,
    expectedLossPct,
    daysPastDue: input.daysPastDue,
    pastDueCategory: category,
  };
}

// ─── Cálculo de portafolio ───────────────────────────────────────────

/**
 * Calcula la Pérdida Esperada agregada para un portafolio de clientes.
 *
 * @param clients - Array de inputs de clientes
 * @returns Resultado agregado con totales, distribución por categoría y detalle por cliente
 *
 * @example
 * ```ts
 * const portfolio = calculatePortfolioExpectedLoss([
 *   { clientId: 'C001', clientName: 'ABC', ead: 3_000_000, daysPastDue: 0 },
 *   { clientId: 'C002', clientName: 'DEF', ead: 1_500_000, daysPastDue: 45 },
 * ]);
 * // portfolio.totalExpectedLoss = 24,000 + 60,000 = 84,000
 * // portfolio.portfolioPePct = 84,000 / 4,500,000 = 1.87%
 * ```
 */
export function calculatePortfolioExpectedLoss(
  clients: ExpectedLossInput[],
): PortfolioExpectedLossResult {
  const results = clients.map(calculateExpectedLoss);

  const totalEad = results.reduce((sum, r) => sum + r.ead, 0);
  const totalExpectedLoss = round2(results.reduce((sum, r) => sum + r.expectedLoss, 0));
  const portfolioPePct = totalEad > 0 ? round2((totalExpectedLoss / totalEad) * 100) : 0;

  // Distribución por categoría de atraso
  const categoryMap = new Map<string, {
    clientCount: number;
    totalEad: number;
    totalPe: number;
    pdSum: number;
  }>();

  for (const r of results) {
    const existing = categoryMap.get(r.pastDueCategory);
    if (existing) {
      existing.clientCount += 1;
      existing.totalEad += r.ead;
      existing.totalPe += r.expectedLoss;
      existing.pdSum += r.pd;
    } else {
      categoryMap.set(r.pastDueCategory, {
        clientCount: 1,
        totalEad: r.ead,
        totalPe: r.expectedLoss,
        pdSum: r.pd,
      });
    }
  }

  const distributionByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    clientCount: data.clientCount,
    totalEad: round2(data.totalEad),
    totalPe: round2(data.totalPe),
    avgPd: round2(data.pdSum / data.clientCount),
  }));

  return {
    totalEad,
    totalExpectedLoss,
    portfolioPePct,
    clientCount: results.length,
    clients: results,
    distributionByCategory,
  };
}

// ─── Utilidades ──────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Retorna la tabla de PD completa (para mostrar en UI/reportes) */
export function getPdTable(): Array<{ maxDays: number; pd: number; category: string }> {
  return [...PD_TABLE];
}
