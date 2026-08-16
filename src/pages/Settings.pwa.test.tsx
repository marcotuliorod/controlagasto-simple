import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import '@testing-library/jest-dom/vitest';
import Settings from './Settings';
import { PWAInstallProvider } from '@/providers/PWAInstallProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks and dependencies
vi.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    isSupported: true,
    isSubscribed: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: '123' } } }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { sent: 1, removed: 0 } }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <PWAInstallProvider>{ui}</PWAInstallProvider>
    </QueryClientProvider>
  );
};

describe('Settings - PWA Installation', () => {
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
          getRegistration: vi.fn().mockResolvedValue(null),
        },
      },
    });

    // Mock document.querySelector for manifest
    vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === 'link[rel="manifest"]') {
        return { getAttribute: () => '/manifest.json' } as unknown as Element;
      }
      return null;
    });
  });

  it('should show "App já está instalado" when in standalone mode', () => {
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

    renderWithProviders(<Settings />);

    expect(screen.getByText('✓ App já está instalado')).toBeTruthy();
  });

  it('should show "Instalar Agora" button when canInstall is true', async () => {
    renderWithProviders(<Settings />);

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
      expect(screen.getByText('Instalar Agora')).toBeTruthy();
    });
  });

  it('should call requestInstall when "Instalar Agora" is clicked', async () => {
    renderWithProviders(<Settings />);

    const mockPromptEvent = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    };

    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt'), mockPromptEvent)
    );

    await waitFor(() => {
      expect(screen.getByText('Instalar Agora')).toBeTruthy();
    });

    const installButton = screen.getByText('Instalar Agora');
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(mockPromptEvent.prompt).toHaveBeenCalled();
    });
  });

  it('should show iOS instructions when on iOS', () => {
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

    renderWithProviders(<Settings />);

    expect(screen.getByText('Para instalar no iOS:')).toBeTruthy();
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeTruthy();
  });

  it('should show unavailable message when install not available', async () => {
    renderWithProviders(<Settings />);

    await waitFor(() => {
      expect(screen.getByText(/Instalação ainda não disponível/)).toBeTruthy();
    });
  });

  it('should show diagnostics in dev mode', async () => {
    // Mock dev environment
    vi.stubEnv('DEV', true);

    renderWithProviders(<Settings />);

    await waitFor(() => {
      expect(screen.getByText(/Debug Info/)).toBeTruthy();
    });
  });
});
