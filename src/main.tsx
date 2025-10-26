import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Register service worker with enhanced debugging
console.log('[PWA] 🚀 Iniciando registro do Service Worker...');

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
    console.log('[PWA] ✅ Service Worker registrado com sucesso');
    console.log('[PWA] 📍 URL:', swUrl);
    if (registration) {
      console.log('[PWA] 📦 Escopo:', registration.scope);
      console.log('[PWA] 🔄 Estado:', registration.active?.state);
      console.log('[PWA] 📊 Registro completo:', registration);
    }
  },
  onRegisterError(error) {
    console.error('[PWA] ❌ Erro ao registrar Service Worker:', error);
    console.error('[PWA] 📋 Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
  },
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
