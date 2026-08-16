import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAutoTheme } from './useAutoTheme';

const mockUseProfile = vi.fn();
vi.mock('./useProfile', () => ({
  useProfile: () => mockUseProfile(),
}));

const mockSetTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: mockSetTheme }),
}));

describe('useAutoTheme', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing while the profile has not loaded yet', () => {
    mockUseProfile.mockReturnValue({ data: undefined });
    renderHook(() => useAutoTheme());
    expect(mockSetTheme).not.toHaveBeenCalled();
  });

  it('respects a manual override on the profile, regardless of time of day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 9, 0, 0)); // 9am -> would compute "light"
    mockUseProfile.mockReturnValue({
      data: { id: '1', name: 'X', monthly_goal: 0, theme_preference: 'dark' },
    });
    renderHook(() => useAutoTheme());
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('computes light theme during the day when there is no override', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 12, 0, 0)); // noon
    mockUseProfile.mockReturnValue({
      data: { id: '1', name: 'X', monthly_goal: 0, theme_preference: null },
    });
    renderHook(() => useAutoTheme());
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('computes dark theme at night when there is no override', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 22, 0, 0)); // 10pm
    mockUseProfile.mockReturnValue({
      data: { id: '1', name: 'X', monthly_goal: 0, theme_preference: null },
    });
    renderHook(() => useAutoTheme());
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});
