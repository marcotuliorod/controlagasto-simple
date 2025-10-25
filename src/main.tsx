import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Register service worker with Safari compatibility and enhanced error handling
console.log('[PWA] 🚀 Iniciando registro do Service Worker...');
console.log('[PWA] 📍 Environment:', {
  isDev: import.meta.env.DEV,
  mode: import.meta.env.MODE,
  browser: navigator.userAgent
});

// Global error handler
window.addEventListener('error', (event) => {
  console.error('[Global Error]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', {
    reason: event.reason,
    promise: event.promise
  });
});

try {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[PWA] 🔄 Nova versão disponível');
      if (confirm('Nova versão disponível! Recarregar para atualizar?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('[PWA] ✅ App pronto para funcionar offline');
    },
    onRegisteredSW(swUrl, registration) {
      console.log('[PWA] ✅ Service Worker registrado:', { swUrl, registration });
    },
    onRegisterError(error) {
      console.warn('[PWA] ⚠️ Service Worker não registrado:', error);
      console.log('[PWA] 📱 App continuará funcionando normalmente');
    },
  });
  console.log('[PWA] ✅ registerSW chamado com sucesso');
} catch (error) {
  console.warn('[PWA] ⚠️ PWA não disponível neste navegador:', error);
  console.log('[PWA] 📱 App funcionando normalmente sem PWA');
}

createRoot(document.getElementById("root")!).render(<App />);
