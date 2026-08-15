import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { PWAInstallProvider, usePWAInstall } from './PWAInstallProvider';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PWAInstallProvider', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Mock navigator
    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        userAgent: 'Chrome',
        serviceWorker: {
          ready: Promise.resolve({}),
          getRegistration: vi.fn().mockResolvedValue(null),
        },
      },
    });

    // Mock document.querySelector for manifest
    vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === 'link[rel="manifest"]') {
        return { getAttribute: () => '/manifest.json', href: '/manifest.json' } as any;
      }
      return null;
    });
  });

  it('should provide initial state', () => {
    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    expect(result.current.canInstall).toBe(false);
    expect(result.current.isIOS).toBe(false);
    expect(result.current.isStandalone).toBe(false);
    expect(result.current.isInstalled).toBe(false);
  });

  it('should detect iOS', () => {
    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        userAgent: 'iPhone',
        serviceWorker: {
          ready: Promise.resolve({}),
          getRegistration: vi.fn().mockResolvedValue(null),
        },
      },
    });

    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    expect(result.current.isIOS).toBe(true);
  });

  it('should detect standalone mode', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    expect(result.current.isStandalone).toBe(true);
    expect(result.current.isInstalled).toBe(true);
  });

  it('should capture beforeinstallprompt event', async () => {
    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    const mockPromptEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    };

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockPromptEvent)
      );
    });

    await waitFor(() => {
      expect(result.current.canInstall).toBe(true);
    });
  });

  it('should handle install request with accepted outcome', async () => {
    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    const mockPromptEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    };

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockPromptEvent)
      );
    });

    await waitFor(() => {
      expect(result.current.canInstall).toBe(true);
    });

    let outcome: string = '';
    await act(async () => {
      outcome = await result.current.requestInstall();
    });

    expect(outcome).toBe('accepted');
    expect(mockPromptEvent.prompt).toHaveBeenCalled();
    
    await waitFor(() => {
      expect(result.current.isInstalled).toBe(true);
      expect(result.current.canInstall).toBe(false);
    });
  });

  it('should handle install request with dismissed outcome', async () => {
    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    const mockPromptEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
    };

    act(() => {
      window.dispatchEvent(
        Object.assign(new Event('beforeinstallprompt'), mockPromptEvent)
      );
    });

    await waitFor(() => {
      expect(result.current.canInstall).toBe(true);
    });

    let outcome: string = '';
    await act(async () => {
      outcome = await result.current.requestInstall();
    });

    expect(outcome).toBe('dismissed');
    expect(result.current.canInstall).toBe(false);
  });

  it('should return unavailable when no prompt available', async () => {
    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    let outcome: string = '';
    await act(async () => {
      outcome = await result.current.requestInstall();
    });

    expect(outcome).toBe('unavailable');
  });

  it('should handle appinstalled event', async () => {
    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    await waitFor(() => {
      // The 'appinstalled' handler only flips isInstalled; isStandalone
      // reflects the matchMedia('(display-mode: standalone)') check, which
      // only changes on the next page load once the app actually runs
      // standalone — it is not expected to flip within the same session.
      expect(result.current.isInstalled).toBe(true);
    });
  });

  it('should reset dismiss state', () => {
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());

    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    act(() => {
      result.current.resetDismiss();
    });

    expect(localStorage.getItem('pwa-install-dismissed')).toBeNull();
  });

  it('should provide diagnostics', async () => {
    const { result } = renderHook(() => usePWAInstall(), {
      wrapper: PWAInstallProvider,
    });

    await waitFor(() => {
      expect(result.current.diagnostics.swReady).toBe(true);
      expect(result.current.diagnostics.manifestDetected).toBe(true);
    });
  });
});
