import { useProfile } from "./useProfile";
import { 
  getCurrentBillingCycle, 
  getBillingCycleRange, 
  getDateBillingCycle 
} from "@/lib/dateRange";

/**
 * Hook to manage billing cycle operations based on user's configured cycle day
 * 
 * @returns Object with cycle day and utility functions
 * 
 * @example
 * const { cycleDay, getCurrentCycle, getCycleRange } = useBillingCycle();
 * const currentCycle = getCurrentCycle(); // { start: '2025-01-05', end: '2025-02-05', label: '2025-01' }
 */
export function useBillingCycle() {
  const { data: profile } = useProfile();
  const cycleDay = profile?.billing_cycle_day || 1;
  
  return {
    /**
     * The configured billing cycle day (1-28)
     * Defaults to 1 if not configured
     */
    cycleDay,
    
    /**
     * Gets the current billing cycle based on today's date
     * @returns Object with start, end dates and YYYY-MM label
     */
    getCurrentCycle: () => getCurrentBillingCycle(cycleDay),
    
    /**
     * Gets the billing cycle range for a specific year/month
     * @param year - Year (e.g., 2025)
     * @param month - Month (1-12)
     * @returns Object with start and end dates
     */
    getCycleRange: (year: number, month: number) => 
      getBillingCycleRange(year, month, cycleDay),
    
    /**
     * Determines which billing cycle a given date belongs to
     * @param date - Date string (YYYY-MM-DD)
     * @returns Cycle label in YYYY-MM format
     */
    getDateCycle: (date: string) => getDateBillingCycle(date, cycleDay),
    
    /**
     * Checks if user has a custom billing cycle configured
     */
    hasCustomCycle: cycleDay > 1,
  };
}
