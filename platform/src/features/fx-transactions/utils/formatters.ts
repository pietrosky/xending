import { ToWords } from 'to-words';

const toWords = new ToWords({
  localeCode: 'es-MX',
  converterOptions: {
    currency: false,
  },
});

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

export function amountToWords(amount: number, currency: 'MXN' | 'USD', format: 'single' | 'fullName') {
  const [intPart, decPart] = amount.toFixed(2).split('.');

  const integer = Number(intPart);
  const cents = decPart;

  const words = toWords.convert(integer);

  const dictionary = {
    "USD": {
      "single": "dollar",
      "fullName": "Dolares Americanos"
    },
    "MXN": {
      "single": "pesos",
      "fullName": "Pesos Mexicanos"
    }
  }

  return `${words} ${cents}/100  ${dictionary[currency][format] ?? 'unidad de modena'}`;
  
}