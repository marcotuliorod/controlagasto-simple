# PWA Setup Guide

Este documento descreve como o PWA (Progressive Web App) está configurado e como testar a funcionalidade de instalação.

## Arquitetura

### Service Worker
- **Localização**: `public/sw.js`
- **Estratégias de Cache**:
  - **Precache**: Todos os assets estáticos (JS, CSS, HTML, imagens)
  - **Supabase API**: NetworkFirst com 5 minutos de cache
  - **Supabase Storage**: CacheFirst com 7 dias de cache
  - **Imagens**: CacheFirst com 30 dias de cache
  - **Navegação**: NetworkFirst para páginas do SPA

### Manifest
- **Gerado automaticamente** via `vite-plugin-pwa`
- **Campos importantes**:
  - `id: '/'` - Identificador único do app
  - `display: 'standalone'` - App fullscreen
  - `orientation: 'portrait'` - Orientação preferida
  - `categories: ['finance', 'productivity']` - Categorias na loja

### Componentes

#### InstallPWA (`src/components/InstallPWA.tsx`)
- **Funcionalidade**:
  - Detecta automaticamente iOS vs Android
  - Mostra instruções específicas para iOS (manual)
  - Usa `beforeinstallprompt` API para Android/Chrome
  - Respeita dismissal por 7 dias
  - Oculta se app já está instalado

#### Settings (`src/pages/Settings.tsx`)
- **Funcionalidade**:
  - Permite resetar prompt de instalação
  - Mostra status do Service Worker (apenas em dev)
  - Gerencia notificações push

## Requisitos para Instalação

### Desktop (Chrome/Edge)
O navegador mostrará o prompt automaticamente se:
1. Tem manifest válido
2. Service Worker registrado
3. Servido via HTTPS
4. Usuário visitou pelo menos 2 vezes
5. Passou pelo menos 30 segundos entre visitas

### Android (Chrome)
Requisitos similares ao desktop, mas o prompt pode aparecer mais rapidamente.

### iOS (Safari 16.4+)
- **Não suporta `beforeinstallprompt`**
- Instalação manual: Safari → Compartilhar → Adicionar à Tela de Início
- O componente `InstallPWA` mostra instruções visuais

## Como Testar Localmente

### 1. Build de Produção
```bash
npm run build
npm run preview
```

### 2. Verificar no DevTools (Chrome)

#### Application → Manifest
- ✅ Todos os campos preenchidos
- ✅ Ícones carregando (192x192 e 512x512)
- ✅ Sem erros ou avisos

#### Application → Service Workers
- ✅ Status: "activated and is running"
- ✅ Escopo: `/`
- ✅ Botão "Update" funciona

#### Application → Cache Storage
Após navegar no app, verificar caches:
- `workbox-precache-v2` - Assets estáticos
- `supabase-api-cache` - Chamadas à API
- `images-cache` - Imagens
- `navigations` - Páginas navegadas

### 3. Lighthouse PWA Audit

```bash
# Via CLI
npx lighthouse http://localhost:4173 --view --preset=desktop

# Ou via DevTools → Lighthouse → Progressive Web App
```

**Meta**: Score > 90

### 4. Testar Instalação

#### Desktop
1. Visite a URL 2 vezes (com 30s de intervalo)
2. Aguarde o banner aparecer no canto inferior direito
3. Clique em "Instalar"
4. Verifique app na lista de apps do sistema

#### Android
1. Abra no Chrome
2. Aguarde banner de instalação (pode demorar 1-2 minutos)
3. Ou vá em Menu → Instalar app
4. Verifique ícone na tela inicial

#### iOS
1. Abra no Safari
2. Toque no botão Compartilhar
3. Role até "Adicionar à Tela de Início"
4. Confirme
5. Verifique ícone na tela inicial

### 5. Testar Offline

1. Com app instalado, navegue por algumas páginas
2. Abra DevTools → Network → Offline
3. Navegue entre páginas já visitadas
4. Verifique funcionamento

## Troubleshooting

### Service Worker não registra
**Sintoma**: Console mostra erro de registro

**Soluções**:
1. Verificar que está em HTTPS (ou localhost)
2. Limpar cache: DevTools → Application → Clear storage
3. Verificar sintaxe em `public/sw.js`
4. Rebuild: `npm run build`

### Prompt de instalação não aparece
**Sintoma**: Aguardou 2 visitas mas nada acontece

**Soluções**:
1. Verificar requisitos no DevTools → Application → Manifest
2. Testar forçando: Settings → Mostrar opção de instalação
3. Limpar localStorage: `localStorage.removeItem('pwa-install-dismissed')`
4. Verificar console para erros do manifest

### Ícones não aparecem
**Sintoma**: Ícone genérico após instalação

**Soluções**:
1. Verificar que `/public/icon-192.png` e `/public/icon-512.png` existem
2. Verificar tamanhos corretos (exatamente 192x192 e 512x512 pixels)
3. Rebuild e reinstalar app

### Cache não funciona offline
**Sintoma**: Páginas não carregam offline

**Soluções**:
1. Verificar caches em DevTools → Application → Cache Storage
2. Verificar que navegou nas páginas enquanto online
3. Service Worker pode estar em erro - verificar console
4. Tentar Update no Service Worker

### iOS não instala
**Sintoma**: Opção não aparece no Safari

**Soluções**:
1. Verificar Safari versão 16.4+
2. Não funciona em navegadores in-app (Instagram, Facebook)
3. Abrir em Safari normal
4. Verificar que manifest está acessível

## Verificação Pós-Deploy

Após deploy em produção:

1. **Lighthouse CI**
   ```bash
   npx lighthouse https://seu-dominio.com --view
   ```
   - PWA score > 90
   - Sem erros críticos

2. **Real Device Testing**
   - Testar em pelo menos 1 dispositivo Android
   - Testar em pelo menos 1 dispositivo iOS
   - Verificar notificações push funcionam

3. **Monitoring**
   - Monitorar taxa de instalação (analytics)
   - Monitorar erros do Service Worker (Sentry/logging)
   - Verificar tamanho do precache não excede 5MB

## Manutenção

### Atualizar Service Worker
Após mudanças em `public/sw.js`:
```bash
npm run build
# Deploy automático vai atualizar SW
```

O usuário verá prompt: "Nova versão disponível! Recarregar?"

### Atualizar Manifest
Após mudanças em `vite.config.ts` → `manifest`:
```bash
npm run build
# Usuário precisa reinstalar para ver mudanças no manifest
```

### Limpar Cache de Usuários
Se precisar forçar atualização:
```javascript
// Adicionar em public/sw.js
const CACHE_VERSION = 'v2'; // Incrementar versão
```

## Recursos

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Workbox Docs](https://developer.chrome.com/docs/workbox/)
- [iOS PWA Support](https://developer.apple.com/documentation/webkit/delivering_web_content_on_home_screen)
- [Chrome Install Criteria](https://web.dev/install-criteria/)
