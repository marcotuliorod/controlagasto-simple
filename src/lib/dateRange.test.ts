import { describe, it, expect } from 'vitest';
import { 
  getMonthRange, 
  getCurrentMonthRange, 
  formatDateRange,
  getBillingCycleRange,
  getCurrentBillingCycle,
  getDateBillingCycle
} from './dateRange';

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

describe('getBillingCycleRange', () => {
  it('should work like getMonthRange when cycleDay is 1 (default)', () => {
    const standard = getMonthRange(2025, 1);
    const billing = getBillingCycleRange(2025, 1, 1);
    
    expect(billing.start).toBe(standard.start);
    expect(billing.end).toBe(standard.end);
  });

  it('should calculate correct range for cycleDay 5', () => {
    const { start, end } = getBillingCycleRange(2025, 1, 5);
    expect(start).toBe('2025-01-05');
    expect(end).toBe('2025-02-05');
  });

  it('should calculate correct range for cycleDay 15', () => {
    const { start, end } = getBillingCycleRange(2025, 6, 15);
    expect(start).toBe('2025-06-15');
    expect(end).toBe('2025-07-15');
  });

  it('should handle year transitions with custom cycleDay', () => {
    const { start, end } = getBillingCycleRange(2024, 12, 20);
    expect(start).toBe('2024-12-20');
    expect(end).toBe('2025-01-20');
  });

  it('should handle cycleDay 28 (maximum allowed)', () => {
    const { start, end } = getBillingCycleRange(2025, 2, 28);
    expect(start).toBe('2025-02-28');
    expect(end).toBe('2025-03-28');
  });
});

describe('getCurrentBillingCycle', () => {
  it('should return valid date range and label', () => {
    const { start, end, label } = getCurrentBillingCycle(1);
    
    // Validate formats
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(label).toMatch(/^\d{4}-\d{2}$/);
    
    // Validate that end is after start
    expect(new Date(end).getTime()).toBeGreaterThan(new Date(start).getTime());
  });

  // Note: Testing date-dependent functions would require more complex mocking
  // For now, we test the basic functionality with default cycleDay
  it('should work with cycleDay 1', () => {
    const { start, end, label } = getCurrentBillingCycle(1);
    
    // Should behave like standard month
    const standard = getCurrentMonthRange();
    expect(start).toBe(standard.start);
    expect(end).toBe(standard.end);
  });
});

describe('getDateBillingCycle', () => {
  it('should return correct cycle label for date after cycleDay', () => {
    const label = getDateBillingCycle('2025-01-10', 5);
    expect(label).toBe('2025-01'); // Jan 10 belongs to Jan 5 - Feb 5 cycle
  });

  it('should return previous month cycle for date before cycleDay', () => {
    const label = getDateBillingCycle('2025-01-03', 5);
    expect(label).toBe('2024-12'); // Jan 3 belongs to Dec 5 - Jan 5 cycle
  });

  it('should handle year transitions', () => {
    const label = getDateBillingCycle('2025-01-02', 10);
    expect(label).toBe('2024-12'); // Jan 2 belongs to Dec 10 - Jan 10 cycle
  });

  it('should work with default cycleDay (1)', () => {
    const label = getDateBillingCycle('2025-06-15', 1);
    expect(label).toBe('2025-06'); // Same as standard month
  });

  it('should handle edge case on cycleDay itself', () => {
    const label = getDateBillingCycle('2025-01-05', 5);
    expect(label).toBe('2025-01'); // Day 5 belongs to Jan 5 - Feb 5 cycle
  });
});
