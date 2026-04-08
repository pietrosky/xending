import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatters';

describe('formatCurrency', () => {
  it('formats USD with thousands separator and 2 decimals', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('USD 1,234.50');
  });

  it('formats MXN with thousands separator and 2 decimals', () => {
    expect(formatCurrency(50000, 'MXN')).toBe('MXN 50,000.00');
  });

  it('formats small amounts without thousands separator', () => {
    expect(formatCurrency(5.5, 'USD')).toBe('USD 5.50');
  });

  it('formats zero correctly', () => {
    expect(formatCurrency(0, 'MXN')).toBe('MXN 0.00');
  });

  it('formats large amounts with multiple thousands separators', () => {
    expect(formatCurrency(1234567.89, 'USD')).toBe('USD 1,234,567.89');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(99.999, 'MXN')).toBe('MXN 100.00');
  });
});
