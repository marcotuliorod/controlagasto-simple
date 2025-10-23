/**
 * Utility functions for handling date ranges
 * @module dateRange
 */

/**
 * Gets the start and end dates for a specific month
 * Uses inclusive-exclusive range (start is included, end is excluded)
 * 
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @returns Object with start (YYYY-MM-DD) and end (YYYY-MM-DD of next month's first day)
 * @example
 * getMonthRange(2025, 1) // returns { start: '2025-01-01', end: '2025-02-01' }
 * getMonthRange(2024, 2) // returns { start: '2024-02-01', end: '2024-03-01' } (leap year)
 */
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

/**
 * Gets the current month range
 * @returns Object with start and end dates for current month
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  return getMonthRange(now.getFullYear(), now.getMonth() + 1);
}

/**
 * Formats a date range for display
 * @param start - Start date
 * @param end - End date (exclusive)
 * @returns Formatted date range string
 */
export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() - 1); // Make inclusive for display
  
  return `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`;
}
