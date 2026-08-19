import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock virtual:pwa-register
vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn((options) => {
    // Simulate successful registration
    if (options?.onRegisteredSW) {
      options.onRegisteredSW('/sw.js', {
        scope: '/',
        active: {},
      });
    }
    return vi.fn();
  }),
}));

// Mock React DOM
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

// Mock App component
vi.mock('./App.tsx', () => ({
  default: () => null,
}));

describe('main.tsx - PWA Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // main.tsx has top-level side effects that only run once per module
    // instance — reset the module registry so each test gets a fresh import.
    vi.resetModules();

    // main.tsx expects index.html's #root div to already be in the DOM.
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('should register service worker on load', async () => {
    const { registerSW } = await import('virtual:pwa-register');
    
    // Import main to trigger registration
    await import('./main');

    expect(registerSW).toHaveBeenCalledWith(
      expect.objectContaining({
        immediate: true,
        onOfflineReady: expect.any(Function),
        onRegisteredSW: expect.any(Function),
        onRegisterError: expect.any(Function),
      })
    );
  });

  it('should not pass onNeedRefresh — autoUpdate never calls it', async () => {
    const { registerSW } = await import('virtual:pwa-register');

    await import('./main');

    /*
     * Com `registerType: 'autoUpdate'` (vite.config.ts) o vite-plugin-pwa não
     * chama `onNeedRefresh`: ele escuta 'activated' e recarrega a página
     * sozinho. Um callback aqui seria código morto que aparenta estar tratando
     * a atualização — foi o que existiu até 19/08/2026, um `confirm()` que
     * deixava o PWA instalado servindo o app antigo.
     */
    const opcoes = vi.mocked(registerSW).mock.calls[0][0];
    expect(opcoes).not.toHaveProperty('onNeedRefresh');
  });

  it('should handle service worker registration callbacks', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { registerSW } = await import('virtual:pwa-register');
    
    await import('./main');

    const registerCall = vi.mocked(registerSW).mock.calls[0][0];

    // Test onOfflineReady
    registerCall.onOfflineReady();
    expect(consoleLogSpy).toHaveBeenCalledWith('[PWA] ✅ App pronto para funcionar offline');

    // Test onRegisteredSW
    registerCall.onRegisteredSW('/sw.js', { scope: '/' });
    expect(consoleLogSpy).toHaveBeenCalledWith('[PWA] ✅ Service Worker registrado com sucesso');
    expect(consoleLogSpy).toHaveBeenCalledWith('[PWA] 📍 URL:', '/sw.js');

    // Test onRegisterError
    const testError = new Error('Test error');
    registerCall.onRegisterError(testError);
    expect(consoleErrorSpy).toHaveBeenCalledWith('[PWA] ❌ Erro ao registrar Service Worker:', testError);

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
