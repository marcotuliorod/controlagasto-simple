// Custom Service Worker for Push Notifications
// Safari-compatible version with robust error handling

console.log('[Service Worker] 🚀 SW file loaded - Safari compatible version');

// Ativar novo SW imediatamente
try {
  self.skipWaiting();
  self.clients.claim();
  console.log('[Service Worker] ✅ skipWaiting() and claim() called');
} catch (error) {
  console.error('[Service Worker] ❌ Error during initialization:', error);
}

const CACHE_NAME = 'entenda-gastos-v1';
const urlsToCache = [
  '/',
  '/index.html',
];

// Instalação - cachear recursos básicos
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 📥 Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 📦 Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[Service Worker] ❌ Install error:', error);
        // Don't fail silently - continue anyway
        return self.skipWaiting();
      })
  );
});

// Ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 🔄 Activate event');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 🗑️ Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network First strategy with error handling
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response para cachear
        try {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          }).catch(() => {
            // Silently fail cache writes - não trava o app
          });
        } catch (error) {
          // Clone pode falhar, mas response original ainda funciona
          console.warn('[Service Worker] ⚠️ Failed to cache:', error);
        }
        return response;
      })
      .catch((error) => {
        // Se network falhar, tentar cache
        console.log('[Service Worker] 📡 Network failed, trying cache');
        return caches.match(event.request).then((cached) => {
          if (cached) {
            return cached;
          }
          // Se não tem cache, retornar erro genérico
          return new Response('Offline - recurso não disponível', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Listen for push events
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let notificationData = {
    title: 'Alerta Financeiro',
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
      notificationData = {
        title: parsed.title || notificationData.title,
        body: parsed.body || notificationData.body,
        icon: parsed.icon || notificationData.icon,
        badge: parsed.badge || notificationData.badge,
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

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationData
  );

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

  const promiseChain = clients.matchAll({
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
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  });

  event.waitUntil(promiseChain);
});

console.log('[Service Worker] ✅ Custom SW loaded - Safari compatible');
