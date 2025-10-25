/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

console.log('[Service Worker] 🚀 SW unified version - Safari compatible');

// Ativar novo SW imediatamente
self.skipWaiting();
clientsClaim();

// Limpar caches antigos
cleanupOutdatedCaches();

// Precache de arquivos gerados pelo build
precacheAndRoute(self.__WB_MANIFEST);

// Estratégia Network First para navegação (SPA fallback)
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [
    /^\/api\//,
    /^\/rest\//,
    /^\/auth\//,
    /^\/storage\//,
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|json|woff|woff2)$/,
  ],
});
registerRoute(navigationRoute);

// Network First para index.html (evita servir versão antiga do cache)
registerRoute(
  ({ request }) => request.mode === 'navigate' || request.destination === 'document',
  new NetworkFirst({
    cacheName: 'navigation-cache',
    plugins: [],
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

console.log('[Service Worker] ✅ Unified SW loaded - Safari compatible');
