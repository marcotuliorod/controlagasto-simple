import { describe, it, expect } from 'vitest';
import { sumAmounts, formatCurrency } from './amountUtils';

describe('sumAmounts', () => {
  it('should sum numeric values', () => {
    expect(sumAmounts([10, 20, 30])).toBe(60);
  });

  it('should handle string amounts', () => {
    expect(sumAmounts(["10.50", "5.25"])).toBe(15.75);
  });

  it('should ignore null/undefined', () => {
    expect(sumAmounts([10, null, 5, undefined])).toBe(15);
  });

  it('should handle mixed types', () => {
    expect(sumAmounts([10, "5.5", null, 0])).toBe(15.5);
  });

  it('should return 0 for empty array', () => {
    expect(sumAmounts([])).toBe(0);
  });

  it('should handle all null/undefined', () => {
    expect(sumAmounts([null, undefined, null])).toBe(0);
  });

  it('should handle decimal strings correctly', () => {
    expect(sumAmounts(["10.99", "20.01", "5.00"])).toBe(36);
  });
});

describe('formatCurrency', () => {
  // Intl.NumberFormat('pt-BR', ...) inserts a non-breaking space (U+00A0)
  // between "R$" and the amount depending on the ICU data bundled with the
  // Node/browser runtime. Normalize to a regular space so the assertion
  // checks the visible characters, not which whitespace variant ICU chose.
  const normalizeSpaces = (s: string) => s.replace(/\s/g, ' ');

  it('should format positive amounts', () => {
    expect(normalizeSpaces(formatCurrency(1234.56))).toBe('R$ 1.234,56');
  });

  it('should format zero', () => {
    expect(normalizeSpaces(formatCurrency(0))).toBe('R$ 0,00');
  });

  it('should format decimal values', () => {
    expect(normalizeSpaces(formatCurrency(10.5))).toBe('R$ 10,50');
  });
});
