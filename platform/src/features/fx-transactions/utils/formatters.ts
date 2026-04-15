/**
 * Formatea un número como moneda con prefijo, separadores de miles y 2 decimales.
 *
 * @example
 * formatCurrency(1234.5, 'USD')  // "USD 1,234.50"
 * formatCurrency(50000, 'MXN')   // "MXN 50,000.00"
 */
export function formatCurrency(amount: number, currency: 'USD' | 'MXN'): string {
  const formatted = amount
    .toFixed(2)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${currency} ${formatted}`;
}
