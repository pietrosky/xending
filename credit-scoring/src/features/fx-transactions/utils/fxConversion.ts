import type { FXCurrency } from '../types/transaction.types';

export type OperationTab = 'buy' | 'sell';

/**
 * Invierte un tipo de cambio: 1 / rate.
 * Precondición: rate > 0
 */
export function invertRate(rate: number): number {
  return Math.round((1 / rate) * 10000) / 10000;
}

/**
 * Calcula el monto a pagar: amount × rate, redondeado a 2 decimales.
 */
export function computePaysAmount(amount: number, rate: number): number {
  return Math.round(amount * rate * 100) / 100;
}

/**
 * Transforma los rates según la pestaña activa para envío al backend.
 * - 'buy': retorna rates sin modificar
 * - 'sell': retorna 1/baseRate, 1/markupRate
 */
export function transformRatesForSubmit(
  tab: OperationTab,
  baseRate: number,
  markupRate: number,
): { base_rate: number; markup_rate: number } {
  if (tab === 'buy') {
    return {
      base_rate: baseRate,
      markup_rate: markupRate,
    };
  }

  return {
    base_rate: invertRate(baseRate),
    markup_rate: invertRate(markupRate),
  };
}

/**
 * Deriva la pestaña activa a partir de buys_currency de una transacción existente.
 * 'USD' → 'buy', 'MXN' → 'sell'
 */
export function deriveTabFromCurrency(buysCurrency: FXCurrency): OperationTab {
  return buysCurrency === 'USD' ? 'buy' : 'sell';
}

/**
 * Retorna las currencies correspondientes a una pestaña.
 * 'buy' → { buysCurrency: 'USD', paysCurrency: 'MXN' }
 * 'sell' → { buysCurrency: 'MXN', paysCurrency: 'USD' }
 */
export function getCurrenciesForTab(tab: OperationTab): {
  buysCurrency: FXCurrency;
  paysCurrency: FXCurrency;
} {
  if (tab === 'buy') {
    return { buysCurrency: 'USD', paysCurrency: 'MXN' };
  }
  return { buysCurrency: 'MXN', paysCurrency: 'USD' };
}
