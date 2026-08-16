import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBillingCycle } from './useBillingCycle';

const mockUseProfile = vi.fn();
vi.mock('./useProfile', () => ({
  useProfile: () => mockUseProfile(),
}));

// The underlying date math (getCurrentBillingCycle/getBillingCycleRange/
// getDateBillingCycle in src/lib/dateRange.ts) already has full coverage —
// these tests focus on what useBillingCycle itself is responsible for:
// reading cycleDay off the profile and threading it through correctly.
describe('useBillingCycle', () => {
  it('defaults cycleDay to 1 when the profile has no billing_cycle_day', () => {
    mockUseProfile.mockReturnValue({ data: { id: '1', name: 'X', monthly_goal: 0 } });
    const { result } = renderHook(() => useBillingCycle());
    expect(result.current.cycleDay).toBe(1);
    expect(result.current.hasCustomCycle).toBe(false);
  });

  it('defaults cycleDay to 1 while the profile is still loading', () => {
    mockUseProfile.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useBillingCycle());
    expect(result.current.cycleDay).toBe(1);
  });

  it('uses the configured billing_cycle_day from the profile', () => {
    mockUseProfile.mockReturnValue({
      data: { id: '1', name: 'X', monthly_goal: 0, billing_cycle_day: 15 },
    });
    const { result } = renderHook(() => useBillingCycle());
    expect(result.current.cycleDay).toBe(15);
    expect(result.current.hasCustomCycle).toBe(true);
  });

  it('threads the configured cycleDay through getDateCycle', () => {
    mockUseProfile.mockReturnValue({ data: { billing_cycle_day: 5 } });
    const { result } = renderHook(() => useBillingCycle());

    // On the cycle day itself, belongs to the current-month cycle.
    expect(result.current.getDateCycle('2025-01-05')).toBe('2025-01');
    // Before the cycle day, belongs to the previous cycle.
    expect(result.current.getDateCycle('2025-01-04')).toBe('2024-12');
  });

  it('threads the configured cycleDay through getCycleRange', () => {
    mockUseProfile.mockReturnValue({ data: { billing_cycle_day: 5 } });
    const { result } = renderHook(() => useBillingCycle());

    expect(result.current.getCycleRange(2025, 1)).toEqual({
      start: '2025-01-05',
      end: '2025-02-05',
    });
  });

  it('threads the configured cycleDay through getCurrentCycle', () => {
    mockUseProfile.mockReturnValue({ data: { billing_cycle_day: 1 } });
    const { result } = renderHook(() => useBillingCycle());

    const current = result.current.getCurrentCycle();
    expect(current.label).toMatch(/^\d{4}-\d{2}$/);
    expect(current.start).toBeDefined();
    expect(current.end).toBeDefined();
  });
});
