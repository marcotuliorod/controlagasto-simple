import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';
import { devLog } from "./lib/logger";

// Register service worker with enhanced debugging
devLog('[PWA] 🚀 Iniciando registro do Service Worker...');

// Com registerType: 'autoUpdate' o service worker novo assume sozinho, entao
// nao ha onNeedRefresh para tratar nem retorno de registerSW a guardar.
registerSW({
  immediate: true,
  onOfflineReady() {
    devLog('[PWA] ✅ App pronto para funcionar offline');
  },
  onRegisteredSW(swUrl, registration) {
    devLog('[PWA] ✅ Service Worker registrado com sucesso');
    devLog('[PWA] 📍 URL:', swUrl);
    if (registration) {
      devLog('[PWA] 📦 Escopo:', registration.scope);
      devLog('[PWA] 🔄 Estado:', registration.active?.state);
      devLog('[PWA] 📊 Registro completo:', registration);
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
