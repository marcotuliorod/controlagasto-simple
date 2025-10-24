import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import InstallPWA from './InstallPWA';
import { PWAInstallProvider } from '@/providers/PWAInstallProvider';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
  },
}));

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<PWAInstallProvider>{ui}</PWAInstallProvider>);
};

describe('InstallPWA', () => {
  beforeEach(() => {
    localStorage.clear();
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
        },
      },
    });

    // Mock document.querySelector for manifest
    vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === 'link[rel="manifest"]') {
        return { getAttribute: () => '/manifest.json' } as any;
      }
      return null;
    });
  });

  it('should not render anything when already installed', () => {
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

    const { container } = renderWithProvider(<InstallPWA />);
    expect(container.firstChild).toBeNull();
  });

  it('should show iOS instructions on iOS devices', async () => {
    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        userAgent: 'iPhone',
        serviceWorker: {
          ready: Promise.resolve({}),
        },
      },
    });

    renderWithProvider(<InstallPWA />);

    await waitFor(() => {
      expect(screen.getByText('Instalar App (iOS)')).toBeTruthy();
      expect(screen.getByText('Adicione à tela de início')).toBeTruthy();
    });
  });

  it('should dismiss iOS instructions when button is clicked', async () => {
    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        userAgent: 'iPhone',
        serviceWorker: {
          ready: Promise.resolve({}),
        },
      },
    });

    renderWithProvider(<InstallPWA />);

    await waitFor(() => {
      expect(screen.getByText('Instalar App (iOS)')).toBeTruthy();
    });

    const dismissButton = screen.getByRole('button', { name: /entendi/i });
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Instalar App (iOS)')).toBeNull();
    });

    expect(localStorage.getItem('pwa-install-dismissed')).toBeTruthy();
  });

  it('should show install card when canInstall is true', async () => {
    renderWithProvider(<InstallPWA />);

    // Simulate beforeinstallprompt event
    const mockPromptEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    };

    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt'), mockPromptEvent)
    );

    await waitFor(() => {
      expect(screen.getByText('Instalar App')).toBeTruthy();
      expect(screen.getByText('Use offline e acesse mais rápido')).toBeTruthy();
    });
  });

  it('should not show if dismissed recently', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 3); // 3 days ago
    localStorage.setItem('pwa-install-dismissed', recentDate.toISOString());

    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        userAgent: 'iPhone',
        serviceWorker: {
          ready: Promise.resolve({}),
        },
      },
    });

    const { container } = renderWithProvider(<InstallPWA />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should show again after 7 days of dismissal', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8); // 8 days ago
    localStorage.setItem('pwa-install-dismissed', oldDate.toISOString());

    Object.defineProperty(window, 'navigator', {
      writable: true,
      value: {
        userAgent: 'iPhone',
        serviceWorker: {
          ready: Promise.resolve({}),
        },
      },
    });

    renderWithProvider(<InstallPWA />);

    await waitFor(() => {
      expect(screen.getByText('Instalar App (iOS)')).toBeTruthy();
    });
  });
});
