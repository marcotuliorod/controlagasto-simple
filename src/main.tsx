import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (confirm('Nova versão disponível! Recarregar?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('[PWA] ✅ Offline ready');
    },
    onRegistered(registration) {
      console.log('[PWA] ✅ SW registered', registration?.scope);
    },
    onRegisterError(error) {
      console.warn('[PWA] ⚠️ SW registration failed:', error);
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
