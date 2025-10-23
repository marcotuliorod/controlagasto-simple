/**
 * Utility functions for currency handling (Brazilian Real - BRL)
 * @module currencyUtils
 */

/**
 * Parses a Brazilian currency string to a number
 * Accepts formats like "1.234,56", "1234,56", "1234.56"
 * @param value - The currency string to parse
 * @returns The parsed number
 * @example
 * parseCurrencyBR("1.234,56") // returns 1234.56
 * parseCurrencyBR("1234,56") // returns 1234.56
 * parseCurrencyBR("1234.56") // returns 1234.56
 */
export function parseCurrencyBR(value: string): number {
  if (!value) return 0;
  
  // Remove any whitespace
  let cleaned = value.trim();
  
  // Remove currency symbol if present
  cleaned = cleaned.replace(/R\$\s?/g, '');
  
  // Check if it's already in US format (has . as decimal separator and no ,)
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  
  if (hasComma && hasDot) {
    // BR format: 1.234,56 -> remove . and replace , with .
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    // Only comma: 1234,56 -> replace , with .
    cleaned = cleaned.replace(',', '.');
  }
  // If only dot or neither, it's already in US format
  
  return Number(cleaned) || 0;
}

/**
 * Formats a number as Brazilian currency string (without symbol)
 * @param value - The number to format
 * @returns The formatted currency string
 * @example
 * formatCurrencyBR(1234.56) // returns "1.234,56"
 */
export function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Generates an array of future month strings in YYYY-MM format
 * @param startMonth - Starting month in YYYY-MM format (default: current month)
 * @param count - Number of months to generate (default: 1)
 * @returns Array of month strings
 * @example
 * generateFutureMonths("2025-10", 3) // returns ["2025-11", "2025-12", "2026-01"]
 */
export function generateFutureMonths(startMonth?: string, count: number = 1): string[] {
  const months: string[] = [];
  
  // Parse start month or use current
  let date: Date;
  if (startMonth) {
    const [year, month] = startMonth.split('-').map(Number);
    date = new Date(year, month - 1, 1);
  } else {
    date = new Date();
  }
  
  // Start from next month
  date.setMonth(date.getMonth() + 1);
  
  for (let i = 0; i < count; i++) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    date.setMonth(date.getMonth() + 1);
  }
  
  return months;
}

/**
 * Gets the current month in YYYY-MM format
 * @returns Current month string
 * @example
 * getCurrentMonth() // returns "2025-10"
 */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
