import { describe, it, expect } from 'vitest';
import { parseCurrencyBR, formatCurrencyBR, generateFutureMonths, getCurrentMonth } from './currencyUtils';

describe('currencyUtils', () => {
  describe('parseCurrencyBR', () => {
    it('should parse BR format with thousands separator', () => {
      expect(parseCurrencyBR('1.234,56')).toBe(1234.56);
      expect(parseCurrencyBR('12.345,67')).toBe(12345.67);
    });

    it('should parse BR format without thousands separator', () => {
      expect(parseCurrencyBR('1234,56')).toBe(1234.56);
      expect(parseCurrencyBR('123,45')).toBe(123.45);
    });

    it('should parse US format', () => {
      expect(parseCurrencyBR('1234.56')).toBe(1234.56);
      expect(parseCurrencyBR('12345.67')).toBe(12345.67);
    });

    it('should handle currency symbol', () => {
      expect(parseCurrencyBR('R$ 1.234,56')).toBe(1234.56);
      expect(parseCurrencyBR('R$1.234,56')).toBe(1234.56);
    });

    it('should handle empty and invalid values', () => {
      expect(parseCurrencyBR('')).toBe(0);
      expect(parseCurrencyBR('abc')).toBe(0);
    });

    it('should handle whitespace', () => {
      expect(parseCurrencyBR('  1.234,56  ')).toBe(1234.56);
    });
  });

  describe('formatCurrencyBR', () => {
    it('should format numbers to BR format', () => {
      expect(formatCurrencyBR(1234.56)).toBe('1.234,56');
      expect(formatCurrencyBR(12345.67)).toBe('12.345,67');
    });

    it('should handle decimal precision', () => {
      expect(formatCurrencyBR(1234.5)).toBe('1.234,50');
      expect(formatCurrencyBR(1234)).toBe('1.234,00');
    });

    it('should handle zero and negative values', () => {
      expect(formatCurrencyBR(0)).toBe('0,00');
      expect(formatCurrencyBR(-1234.56)).toBe('-1.234,56');
    });
  });

  describe('generateFutureMonths', () => {
    it('should generate correct future months', () => {
      const result = generateFutureMonths('2025-10', 3);
      expect(result).toEqual(['2025-11', '2025-12', '2026-01']);
    });

    it('should handle year transitions', () => {
      const result = generateFutureMonths('2025-11', 3);
      expect(result).toEqual(['2025-12', '2026-01', '2026-02']);
    });

    it('should handle single month', () => {
      const result = generateFutureMonths('2025-10', 1);
      expect(result).toEqual(['2025-11']);
    });

    it('should generate from current month when no start provided', () => {
      const result = generateFutureMonths(undefined, 2);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('getCurrentMonth', () => {
    it('should return current month in YYYY-MM format', () => {
      const result = getCurrentMonth();
      expect(result).toMatch(/^\d{4}-\d{2}$/);
      
      const now = new Date();
      const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(result).toBe(expected);
    });
  });
});
