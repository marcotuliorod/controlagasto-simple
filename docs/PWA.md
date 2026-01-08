# 📱 Progressive Web App (PWA)

Documentação da implementação PWA e Push Notifications.

---

## 📋 Visão Geral

O Rinesk é uma Progressive Web App completa, oferecendo:
- ✅ Instalação nativa em dispositivos
- ✅ Funcionamento offline
- ✅ Push notifications
- ✅ Ícones e splash screens
- ✅ Manifest configurado

---

## 🚀 Instalação

### Android (Chrome)
1. Acessar o site
2. Menu (⋮) > "Adicionar à tela inicial"
3. Confirmar instalação

### iOS (Safari)
1. Acessar o site
2. Compartilhar (↑) > "Adicionar à Tela de Início"
3. Confirmar instalação

### Desktop (Chrome/Edge)
1. Acessar o site
2. Ícone de instalação na barra de endereços
3. Confirmar instalação

---

## 📄 Manifest

### Configuração (vite.config.ts)

```typescript
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
  manifest: {
    name: 'Rinesk - Gestão Financeira',
    short_name: 'Rinesk',
    description: 'Aplicativo de gestão financeira pessoal',
    theme_color: '#10b981',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }
})
```

---

## 🔧 Service Worker

### Estratégias de Cache (Workbox)

```typescript
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 ano
        }
      }
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'gstatic-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dias
        }
      }
    }
  ]
}
```

### Atualização Automática
- `registerType: 'autoUpdate'` atualiza SW automaticamente
- Usuário não precisa interagir

---

## 🔔 Push Notifications

### Arquitetura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cliente   │────▶│   Supabase  │────▶│  Push API   │
│  (Browser)  │◀────│   (Edge)    │◀────│  (Browser)  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │
      │  1. Subscribe      │  2. Store
      │  (VAPID key)       │  subscription
      │                    │
      ▼                    ▼
┌─────────────┐     ┌─────────────┐
│ ServiceWorker│     │  Database   │
│  (sw.js)    │     │ push_subs   │
└─────────────┘     └─────────────┘
```

### Fluxo de Subscription

1. **Obter chave VAPID**
   ```typescript
   const { publicKey } = await invoke('get-vapid-public-key');
   ```

2. **Registrar no browser**
   ```typescript
   const subscription = await registration.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: urlBase64ToUint8Array(publicKey)
   });
   ```

3. **Salvar no banco**
   ```typescript
   await supabase.from('push_subscriptions').insert({
     user_id: userId,
     endpoint: subscription.endpoint,
     p256dh: keys.p256dh,
     auth: keys.auth
   });
   ```

### Envio de Notificação

**Edge Function: send-push-notification**

```typescript
// 1. Buscar VAPID keys
const { public_key, private_key } = await getVapidKeys();

// 2. Buscar subscriptions do usuário
const subscriptions = await getSubscriptions(userId);

// 3. Para cada subscription
for (const sub of subscriptions) {
  const response = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': generateVapidAuth(private_key),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body, data })
  });
  
  // Remove subscriptions inválidas
  if (response.status === 404 || response.status === 410) {
    await removeSubscription(sub.id);
  }
}
```

### Service Worker Handler

**public/sw.js**

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Rinesk', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.data,
      tag: data.tag || 'default'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

---

## 🎨 Assets PWA

### Ícones

| Arquivo | Tamanho | Uso |
|---------|---------|-----|
| `/icon-192.png` | 192x192 | Android, notificações |
| `/icon-512.png` | 512x512 | Splash screen |
| `/favicon.ico` | 32x32 | Tab do browser |

### Splash Screens

| Arquivo | Tamanho | Dispositivo |
|---------|---------|-------------|
| `/splash-640x1136.png` | 640x1136 | iPhone SE |

---

## 🧩 Componentes

### InstallPWA

Botão de instalação do PWA.

```typescript
// src/components/InstallPWA.tsx
const { isInstallable, install } = usePWAInstall();

if (!isInstallable) return null;

return (
  <Button onClick={install}>
    Instalar App
  </Button>
);
```

### PushOnboarding

Onboarding para ativar notificações.

```typescript
// src/components/PushOnboarding.tsx
const { subscribe, isSubscribed } = usePushNotifications();

if (isSubscribed) return null;

return (
  <Card>
    <p>Ative as notificações para receber alertas</p>
    <Button onClick={subscribe}>Ativar</Button>
  </Card>
);
```

---

## 🪝 Hooks

### usePWAInstall

```typescript
const {
  isInstallable,  // boolean - pode instalar?
  isInstalled,    // boolean - já instalado?
  install,        // () => void - instalar
} = usePWAInstall();
```

### usePushNotifications

```typescript
const {
  isSupported,    // boolean - browser suporta?
  isSubscribed,   // boolean - já inscrito?
  isLoading,      // boolean - carregando?
  subscribe,      // () => Promise<void>
  unsubscribe,    // () => Promise<void>
} = usePushNotifications();
```

---

## ⚙️ Configuração

### index.html

```html
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#10b981">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <link rel="manifest" href="/manifest.webmanifest">
</head>
```

---

## 🧪 Testes

### Testes Unitários

```typescript
// src/components/InstallPWA.test.tsx
describe('InstallPWA', () => {
  it('should show install button when installable', () => {
    mockPWAContext({ isInstallable: true });
    render(<InstallPWA />);
    expect(screen.getByText('Instalar')).toBeInTheDocument();
  });
  
  it('should hide when already installed', () => {
    mockPWAContext({ isInstalled: true });
    render(<InstallPWA />);
    expect(screen.queryByText('Instalar')).not.toBeInTheDocument();
  });
});
```

---

## 📊 Lighthouse

### Scores Alvo

| Métrica | Score |
|---------|-------|
| Performance | > 90 |
| Accessibility | > 90 |
| Best Practices | > 90 |
| SEO | > 90 |
| PWA | ✅ |

### Configuração (lighthouserc.js)

```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      url: ['http://localhost:4173/'],
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
  },
};
```

---

## 🔗 Links Relacionados

- [Funcionalidades](./FEATURES.md)
- [Notificações Push](./push-notifications.md)
- [Segurança](./SECURITY.md)
