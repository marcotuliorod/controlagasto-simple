/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

const SW_VERSION = '1.0.1';
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

console.log(`[SW] 🚀 Versão ${SW_VERSION}`, {
  browser: isSafari ? 'Safari' : 'Other',
  platform: isIOS ? 'iOS' : 'Other',
  compatible: 'IIFE format'
});

// Ativar novo SW imediatamente e assumir controle
self.skipWaiting();
clientsClaim();

// Limpar caches antigos automaticamente
cleanupOutdatedCaches();

// Precache de arquivos gerados pelo Vite
precacheAndRoute(self.__WB_MANIFEST);

if (isSafari || isIOS) {
  console.log('[SW] 🍎 Safari/iOS detectado - usando estratégias otimizadas');
}

// Strategy: Network First para navegação (garante SPA routing)
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: `navigation-v${SW_VERSION}`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 horas
      }),
      {
        handlerDidError: async ({ error, request }) => {
          console.error('[SW] ❌ Navigation error:', error);
          // Retornar página offline ou cache
          const cache = await caches.open(`navigation-v${SW_VERSION}`);
          const cachedResponse = await cache.match('/');
          return cachedResponse || Response.error();
        }
      }
    ],
  })
);

// Strategy: Cache First para assets estáticos
registerRoute(
  ({ request }) => 
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image',
  new CacheFirst({
    cacheName: `assets-v${SW_VERSION}`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// Listen for push events
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let title = 'Alerta Financeiro';
  let options: NotificationOptions = {
    body: 'Você tem uma nova notificação',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: '/'
    }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      title = parsed.title || title;
      options = {
        body: parsed.body || options.body,
        icon: parsed.icon || options.icon,
        badge: parsed.badge || options.badge,
        data: {
          url: (parsed.data && parsed.data.url) || parsed.url || '/',
          ...(parsed.data || {}),
        },
        tag: parsed.tag || 'default',
        requireInteraction: parsed.requireInteraction || false,
      };
    } catch (err) {
      console.error('[Service Worker] Error parsing push data:', err);
    }
  }

  const promiseChain = self.registration.showNotification(title, options);

  event.waitUntil(promiseChain);
});

// Listen for notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received:', event);
  
  event.notification.close();

  const urlToOpen = new URL(
    event.notification.data?.url || '/', 
    self.location.origin
  ).href;

  const promiseChain = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
  .then((windowClients) => {
    // Check if there's already a window open with this URL
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i];
      if (client.url === urlToOpen && 'focus' in client) {
        return client.focus();
      }
    }
    
    // Check if there's any window open that we can navigate
    if (windowClients.length > 0) {
      const client = windowClients[0];
      if ('navigate' in client && 'focus' in client) {
        client.navigate(urlToOpen);
        return client.focus();
      }
    }
    
    // If no window is open, open a new one
    if (self.clients.openWindow) {
      return self.clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

// Global error handlers for robustness
self.addEventListener('error', (event) => {
  console.error('[SW] 💥 Unhandled error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] 💥 Unhandled rejection:', event.reason);
});

console.log('[Service Worker] ✅ Unified SW loaded - Safari compatible');
