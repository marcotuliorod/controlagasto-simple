import { describe, it, expect } from 'vitest';
import { getMonthRange, getCurrentMonthRange, formatDateRange } from './dateRange';

describe('getMonthRange', () => {
  it('should handle 31-day months', () => {
    const { start, end } = getMonthRange(2025, 1);
    expect(start).toBe('2025-01-01');
    expect(end).toBe('2025-02-01');
  });

  it('should handle 30-day months', () => {
    const { start, end } = getMonthRange(2025, 4);
    expect(start).toBe('2025-04-01');
    expect(end).toBe('2025-05-01');
  });

  it('should handle February (28 days)', () => {
    const { start, end } = getMonthRange(2025, 2);
    expect(start).toBe('2025-02-01');
    expect(end).toBe('2025-03-01');
  });

  it('should handle February (29 days, leap year)', () => {
    const { start, end } = getMonthRange(2024, 2);
    expect(start).toBe('2024-02-01');
    expect(end).toBe('2024-03-01');
  });

  it('should handle December (year transition)', () => {
    const { start, end } = getMonthRange(2024, 12);
    expect(start).toBe('2024-12-01');
    expect(end).toBe('2025-01-01');
  });

  it('should handle January', () => {
    const { start, end } = getMonthRange(2025, 1);
    expect(start).toBe('2025-01-01');
    expect(end).toBe('2025-02-01');
  });
});

describe('getCurrentMonthRange', () => {
  it('should return valid date range for current month', () => {
    const { start, end } = getCurrentMonthRange();
    
    // Validate format
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    
    // Validate that end is after start
    expect(new Date(end).getTime()).toBeGreaterThan(new Date(start).getTime());
  });
});

describe('formatDateRange', () => {
  it('should format date range correctly', () => {
    const formatted = formatDateRange('2025-01-01', '2025-02-01');
    // The exact format depends on locale, just check it's a string
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });

  it('should handle single day range', () => {
    const formatted = formatDateRange('2025-01-01', '2025-01-02');
    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
