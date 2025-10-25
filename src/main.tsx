import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Register service worker with Safari compatibility
console.log('[PWA] 🚀 Iniciando registro do Service Worker...');

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
      console.log('[PWA] ✅ Service Worker registrado');
    },
    onRegisterError(error) {
      console.warn('[PWA] ⚠️ Service Worker não registrado:', error.message);
      console.log('[PWA] 📱 App continuará funcionando normalmente');
    },
  });
} catch (error) {
  console.warn('[PWA] ⚠️ PWA não disponível neste navegador');
  console.log('[PWA] 📱 App funcionando normalmente sem PWA');
}

createRoot(document.getElementById("root")!).render(<App />);
