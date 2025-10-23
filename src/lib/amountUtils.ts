/**
 * Utility functions for handling expense amounts
 * @module amountUtils
 */

/**
 * Safely sums an array of amounts, handling strings, numbers, and null values
 * @param amounts - Array of amounts (can be strings, numbers, or null)
 * @returns Total sum as a number
 * @example
 * sumAmounts([10, "5.5", null, 0]) // returns 15.5
 */
export function sumAmounts(amounts: Array<string | number | null | undefined>): number {
  return amounts.reduce((sum, val) => sum + Number(val || 0), 0);
}

/**
 * Formats a number as currency (BRL)
 * @param amount - Amount to format
 * @returns Formatted currency string
 * @example
 * formatCurrency(1234.56) // returns "R$ 1.234,56"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}
