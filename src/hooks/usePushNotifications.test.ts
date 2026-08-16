import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePushNotifications } from './usePushNotifications';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('usePushNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service worker and push manager
    Object.defineProperty(global.navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe: vi.fn(),
          },
        }),
      },
      writable: true,
    });
  });

  it('should initialize with isSupported=true when browser supports push', () => {
    const { result } = renderHook(() => usePushNotifications());
    
    // Initial state should be supported
    expect(result.current.isSupported).toBe(true);
  });

  it('should set isSupported=false when PushManager is not available', () => {
    const windowRecord = window as unknown as Record<string, unknown>;
    const originalPushManager = windowRecord.PushManager;
    delete windowRecord.PushManager;

    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isSupported).toBe(false);

    windowRecord.PushManager = originalPushManager;
  });

  it('should have subscribe and unsubscribe functions', () => {
    const { result } = renderHook(() => usePushNotifications());

    expect(typeof result.current.subscribe).toBe('function');
    expect(typeof result.current.unsubscribe).toBe('function');
  });
});
