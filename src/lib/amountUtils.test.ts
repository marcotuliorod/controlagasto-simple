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
  it('should format positive amounts', () => {
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('should format decimal values', () => {
    expect(formatCurrency(10.5)).toBe('R$ 10,50');
  });
});
