import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nova versão disponível! Recarregar para atualizar?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('✅ App pronto para funcionar offline');
  },
  onRegisteredSW(swUrl, registration) {
    console.log('✅ Service Worker registrado:', swUrl);
    if (registration) {
      console.log('📦 Escopo:', registration.scope);
    }
  },
  onRegisterError(error) {
    console.error('❌ Erro ao registrar Service Worker:', error);
  },
});

createRoot(document.getElementById("root")!).render(<App />);
