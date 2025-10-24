import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExpensesRealtime } from './useExpensesRealtime';
import * as supabaseClient from '@/integrations/supabase/client';

// Mock supabase
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  removeChannel: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock realtimeLogger
vi.mock('@/lib/realtimeLogger', () => ({
  realtimeLogger: {
    subscribe: vi.fn(),
    change: vi.fn(),
    unsubscribe: vi.fn(),
    error: vi.fn(),
    status: vi.fn(),
  },
}));

describe('useExpensesRealtime', () => {
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should subscribe to expenses channel on mount', () => {
    renderHook(() =>
      useExpensesRealtime({
        channelName: 'test-channel',
        onUpdate: mockOnUpdate,
      })
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith('test-channel');
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expenses',
      },
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should call onUpdate when expense changes', () => {
    renderHook(() =>
      useExpensesRealtime({
        channelName: 'test-channel',
        onUpdate: mockOnUpdate,
      })
    );

    // Simulate a change event
    const changeHandler = mockChannel.on.mock.calls[0][2];
    changeHandler({
      eventType: 'INSERT',
      new: { id: '123', amount: 100 },
    });

    expect(mockOnUpdate).toHaveBeenCalled();
  });

  it('should not call onUpdate after unmount', () => {
    const { unmount } = renderHook(() =>
      useExpensesRealtime({
        channelName: 'test-channel',
        onUpdate: mockOnUpdate,
      })
    );

    unmount();

    // Simulate a change event after unmount
    const changeHandler = mockChannel.on.mock.calls[0][2];
    changeHandler({
      eventType: 'UPDATE',
      new: { id: '123', amount: 200 },
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('should delay channel cleanup by 100ms', () => {
    const { unmount } = renderHook(() =>
      useExpensesRealtime({
        channelName: 'test-channel',
        onUpdate: mockOnUpdate,
      })
    );

    unmount();

    // Immediately after unmount, channel should NOT be removed yet
    expect(mockSupabase.removeChannel).not.toHaveBeenCalled();

    // Fast-forward time by 100ms
    vi.advanceTimersByTime(100);

    // Now channel should be removed
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('should not subscribe when enabled is false', () => {
    renderHook(() =>
      useExpensesRealtime({
        channelName: 'test-channel',
        onUpdate: mockOnUpdate,
        enabled: false,
      })
    );

    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it('should handle multiple subscriptions with different channel names', () => {
    const { unmount: unmount1 } = renderHook(() =>
      useExpensesRealtime({
        channelName: 'dashboard-expenses',
        onUpdate: vi.fn(),
      })
    );

    const { unmount: unmount2 } = renderHook(() =>
      useExpensesRealtime({
        channelName: 'expenses-list',
        onUpdate: vi.fn(),
      })
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith('dashboard-expenses');
    expect(mockSupabase.channel).toHaveBeenCalledWith('expenses-list');

    unmount1();
    unmount2();

    vi.advanceTimersByTime(100);

    expect(mockSupabase.removeChannel).toHaveBeenCalledTimes(2);
  });
});
