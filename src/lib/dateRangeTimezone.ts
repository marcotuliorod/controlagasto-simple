/**
 * Timezone-aware date range utilities
 * Uses date-fns-tz for proper timezone handling
 * @module dateRangeTimezone
 */

import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converts a date string to the user's timezone
 * @param dateString - ISO date string
 * @param timezone - Target timezone (default: America/Sao_Paulo)
 * @returns Date object in the specified timezone
 */
export function toUserTimezone(dateString: string, timezone: string = BRAZIL_TIMEZONE): Date {
  const date = new Date(dateString);
  return toZonedTime(date, timezone);
}

/**
 * Converts a local date to UTC for storage
 * @param date - Local date
 * @param timezone - Source timezone (default: America/Sao_Paulo)
 * @returns UTC date
 */
export function toUTC(date: Date, timezone: string = BRAZIL_TIMEZONE): Date {
  return fromZonedTime(date, timezone);
}

/**
 * Gets the current date in the user's timezone
 * @param timezone - User timezone (default: America/Sao_Paulo)
 * @returns Current date in user's timezone
 */
export function getCurrentDateInTimezone(timezone: string = BRAZIL_TIMEZONE): Date {
  return toZonedTime(new Date(), timezone);
}

/**
 * Formats a date string considering timezone
 * @param dateString - ISO date string
 * @param formatStr - Format string (date-fns format)
 * @param timezone - Target timezone
 * @returns Formatted date string
 */
export function formatInTimezone(
  dateString: string,
  formatStr: string = 'yyyy-MM-dd',
  timezone: string = BRAZIL_TIMEZONE
): string {
  const zonedDate = toUserTimezone(dateString, timezone);
  return format(zonedDate, formatStr);
}

/**
 * Determines which billing cycle a date belongs to, considering timezone
 * @param dateString - ISO date string
 * @param cycleDay - Day of month when cycle starts (1-28)
 * @param timezone - User timezone
 * @returns Cycle label in YYYY-MM format
 * @example
 * // User in UTC-3, expense at 23:00 local = 02:00 UTC next day
 * // Should belong to correct billing cycle based on LOCAL time
 * getDateBillingCycleWithTimezone('2025-01-31T23:00:00-03:00', 1) // '2025-01'
 */
export function getDateBillingCycleWithTimezone(
  dateString: string,
  cycleDay: number = 1,
  timezone: string = BRAZIL_TIMEZONE
): string {
  // Convert to user's timezone to get the correct local day
  const localDate = toUserTimezone(dateString, timezone);
  const day = localDate.getDate();
  
  let year = localDate.getFullYear();
  let month = localDate.getMonth() + 1; // 1-12
  
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

/**
 * Gets billing cycle range with timezone awareness
 * @param year - Year
 * @param month - Month (1-12)
 * @param cycleDay - Day of month when cycle starts
 * @param timezone - User timezone
 * @returns Object with start and end dates in ISO format
 */
export function getBillingCycleRangeWithTimezone(
  year: number,
  month: number,
  cycleDay: number = 1,
  timezone: string = BRAZIL_TIMEZONE
): { start: string; end: string } {
  // Create dates in the user's timezone
  const startDate = new Date(year, month - 1, cycleDay);
  const endDate = new Date(year, month, cycleDay);
  
  // Convert to UTC for storage/queries
  const startUTC = toUTC(startDate, timezone);
  const endUTC = toUTC(endDate, timezone);
  
  return {
    start: startUTC.toISOString().slice(0, 10),
    end: endUTC.toISOString().slice(0, 10),
  };
}
