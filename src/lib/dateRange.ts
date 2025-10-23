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

/**
 * Calculates the range for a billing cycle based on a custom cycle day
 * @param year - Year (e.g., 2025)
 * @param month - Month (1-12)
 * @param cycleDay - Day of month when cycle starts (1-28, default 1)
 * @returns Object with start and end dates for the billing cycle
 * @example
 * getBillingCycleRange(2025, 1, 5) // returns { start: '2025-01-05', end: '2025-02-05' }
 */
export function getBillingCycleRange(
  year: number,
  month: number,
  cycleDay: number = 1
): { start: string; end: string } {
  // If cycleDay = 1, use standard month range
  if (cycleDay === 1) {
    return getMonthRange(year, month);
  }
  
  // Calculate cycle start date
  const startDate = new Date(year, month - 1, cycleDay);
  
  // Calculate cycle end date (same day next month)
  const endDate = new Date(year, month, cycleDay);
  
  return {
    start: startDate.toISOString().slice(0, 10),
    end: endDate.toISOString().slice(0, 10),
  };
}

/**
 * Gets the current billing cycle based on the configured cycle day
 * @param cycleDay - Day of month when cycle starts (1-28, default 1)
 * @returns Object with start, end dates and label (YYYY-MM) for current cycle
 * @example
 * getCurrentBillingCycle(5) // If today is Jan 3, returns cycle from Dec 5 to Jan 5
 * getCurrentBillingCycle(5) // If today is Jan 7, returns cycle from Jan 5 to Feb 5
 */
export function getCurrentBillingCycle(
  cycleDay: number = 1
): { start: string; end: string; label: string } {
  const now = new Date();
  const currentDay = now.getDate();
  
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-12
  
  // If we haven't reached the cycle day yet, current cycle started last month
  if (currentDay < cycleDay) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  
  const range = getBillingCycleRange(year, month, cycleDay);
  
  return {
    ...range,
    label: `${year}-${String(month).padStart(2, '0')}`, // YYYY-MM format
  };
}

/**
 * Determines which billing cycle a given date belongs to
 * @param date - Date string (YYYY-MM-DD)
 * @param cycleDay - Day of month when cycle starts (1-28, default 1)
 * @returns Cycle label in YYYY-MM format
 * @example
 * getDateBillingCycle('2025-01-03', 5) // returns '2024-12' (belongs to Dec 5 - Jan 5 cycle)
 * getDateBillingCycle('2025-01-07', 5) // returns '2025-01' (belongs to Jan 5 - Feb 5 cycle)
 */
export function getDateBillingCycle(
  date: string,
  cycleDay: number = 1
): string {
  const d = new Date(date);
  const day = d.getDate();
  
  let year = d.getFullYear();
  let month = d.getMonth() + 1; // 1-12
  
  // If date is before the cycle day, it belongs to previous month's cycle
  if (day < cycleDay) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  
  return `${year}-${String(month).padStart(2, '0')}`; // YYYY-MM format
}
