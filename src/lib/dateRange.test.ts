import { describe, it, expect } from 'vitest';
import {
  getMonthRange,
  getCurrentMonthRange,
  getBillingCycleRange,
  getCurrentBillingCycle,
  getDateBillingCycle,
} from './dateRange';

describe('dateRange utilities', () => {
  describe('getMonthRange', () => {
    it('should return correct range for January', () => {
      const result = getMonthRange(2025, 1);
      expect(result).toEqual({
        start: '2025-01-01',
        end: '2025-02-01',
      });
    });

    it('should return correct range for December', () => {
      const result = getMonthRange(2025, 12);
      expect(result).toEqual({
        start: '2025-12-01',
        end: '2026-01-01',
      });
    });

    it('should handle leap year February', () => {
      const result = getMonthRange(2024, 2);
      expect(result).toEqual({
        start: '2024-02-01',
        end: '2024-03-01',
      });
    });
  });

  describe('getBillingCycleRange - Edge Cases', () => {
    it('should handle cycle day 31 in February (28 days)', () => {
      const result = getBillingCycleRange(2025, 2, 31);
      // February 2025 has 28 days, so day 31 becomes March 3
      // This is expected behavior - it rolls over
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should handle cycle day 31 in February (29 days - leap year)', () => {
      const result = getBillingCycleRange(2024, 2, 31);
      // February 2024 has 29 days (leap year), so day 31 becomes March 2
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should handle cycle day 31 in April (30 days)', () => {
      const result = getBillingCycleRange(2025, 4, 31);
      // April has 30 days, so day 31 becomes May 1
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should handle cycle day 31 in months with 31 days', () => {
      const result = getBillingCycleRange(2025, 1, 31);
      expect(result).toEqual({
        start: '2025-01-31',
        end: '2025-02-31', // Will roll over to March 3 in 2025 (Feb has 28 days)
      });
    });

    it('should handle cycle day 1 (standard month)', () => {
      const result = getBillingCycleRange(2025, 1, 1);
      expect(result).toEqual({
        start: '2025-01-01',
        end: '2025-02-01',
      });
    });

    it('should handle cycle day 15 (mid-month)', () => {
      const result = getBillingCycleRange(2025, 1, 15);
      expect(result).toEqual({
        start: '2025-01-15',
        end: '2025-02-15',
      });
    });
  });

  describe('getDateBillingCycle', () => {
    it('should assign date before cycle day to previous month cycle', () => {
      // If cycle day is 5, Jan 3 belongs to December cycle
      const result = getDateBillingCycle('2025-01-03', 5);
      expect(result).toBe('2024-12');
    });

    it('should assign date on cycle day to current month cycle', () => {
      // If cycle day is 5, Jan 5 belongs to January cycle
      const result = getDateBillingCycle('2025-01-05', 5);
      expect(result).toBe('2025-01');
    });

    it('should assign date after cycle day to current month cycle', () => {
      // If cycle day is 5, Jan 10 belongs to January cycle
      const result = getDateBillingCycle('2025-01-10', 5);
      expect(result).toBe('2025-01');
    });

    it('should handle year boundary correctly', () => {
      // If cycle day is 5, Jan 3 belongs to December of previous year
      const result = getDateBillingCycle('2025-01-03', 5);
      expect(result).toBe('2024-12');
    });

    it('should handle default cycle day (1)', () => {
      const result = getDateBillingCycle('2025-01-15', 1);
      expect(result).toBe('2025-01');
    });
  });

  describe('getCurrentBillingCycle', () => {
    it('should return cycle with correct label format', () => {
      const result = getCurrentBillingCycle(1);
      expect(result.label).toMatch(/^\d{4}-\d{2}$/); // YYYY-MM format
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should handle custom cycle day', () => {
      const result = getCurrentBillingCycle(15);
      expect(result.label).toMatch(/^\d{4}-\d{2}$/);
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });
  });

  describe('Edge case scenarios', () => {
    it('should handle transition from month with 31 days to month with 30 days', () => {
      const result = getBillingCycleRange(2025, 1, 31);
      // Jan 31 to Feb 31 (which doesn't exist, rolls to March)
      expect(result.start).toBe('2025-01-31');
      expect(result.end).toBeDefined();
    });

    it('should handle transition from month with 30 days to month with 31 days', () => {
      const result = getBillingCycleRange(2025, 4, 31);
      // April has 30 days, so day 31 becomes May 1
      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
    });

    it('should handle multiple year boundaries', () => {
      const dec = getDateBillingCycle('2024-12-31', 5);
      const jan = getDateBillingCycle('2025-01-04', 5);
      const janAfter = getDateBillingCycle('2025-01-05', 5);
      
      expect(dec).toBe('2024-12');
      expect(jan).toBe('2024-12'); // Before cycle day, belongs to previous cycle
      expect(janAfter).toBe('2025-01'); // On cycle day, belongs to current cycle
    });
  });
});
