# 📱 Push Notifications - Guia Completo

## 📋 Visão Geral

O sistema de notificações push do "Entenda seus Gastos" permite enviar alertas inteligentes aos usuários sobre suas metas financeiras, insights e lembretes importantes.

## 🎯 Tipos de Notificações

### 1. **Alertas de Meta (GOAL_80)**
- **Trigger**: Quando o usuário atinge 80% ou mais do limite mensal
- **Exemplo**: "⚠️ Alerta de Meta - Você atingiu 85% do seu limite mensal (R$ 850,00 de R$ 1.000,00)"
- **Requer interação**: Sim

### 2. **Meta Atingida (GOAL_100)**
- **Trigger**: Quando o usuário atinge 100% ou ultrapassa o limite mensal
- **Exemplo**: "🎯 Meta Atingida! - Você atingiu 100% do seu limite mensal! Total gasto: R$ 1.000,00 de R$ 1.000,00"
- **Requer interação**: Sim

### 3. **Economia (GOAL_ECONOMY)**
- **Trigger**: Final do mês, quando o usuário economizou 20% ou mais do orçamento
- **Exemplo**: "💰 Parabéns! - Você economizou 30% do seu orçamento este mês! Continue assim!"
- **Requer interação**: Não

### 4. **Notificação de Teste**
- **Trigger**: Manual, via botão nas configurações
- **Exemplo**: "🎉 Notificação de Teste - Suas notificações estão funcionando perfeitamente!"
- **Requer interação**: Não

## 🏗️ Arquitetura

### Frontend

#### 1. **usePushNotifications Hook** (`src/hooks/usePushNotifications.ts`)
```typescript
const { 
  isSupported,       // Browser suporta push?
  isSubscribed,      // Usuário está inscrito?
  subscribe,         // Ativar notificações
  unsubscribe,       // Desativar notificações
  sendTestNotification // Enviar teste
} = usePushNotifications();
```

**Fluxo de Subscrição:**
1. Verifica suporte do browser (`serviceWorker` + `PushManager`)
2. Busca chave VAPID pública do backend
3. Solicita permissão do usuário (`Notification.requestPermission()`)
4. Registra subscrição no Service Worker
5. Salva endpoint na tabela `push_subscriptions`

#### 2. **PushOnboarding Component** (`src/components/PushOnboarding.tsx`)
- Modal de boas-vindas que aparece uma vez
- Explica benefícios das notificações:
  - Alertas de meta
  - Insights financeiros
  - Lembretes
- Armazena `push-onboarding-seen` no localStorage após visualização

#### 3. **Settings Page** (`src/pages/Settings.tsx`)
- Switch para ativar/desativar notificações
- Lista de tipos de notificações
- Botão "Enviar Notificação de Teste"
- Diagnóstico de Service Worker (dev mode)

### Backend

#### 1. **Service Worker** (`public/sw.js`)
```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    data: { url: data.url }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Navigate to URL
  clients.openWindow(event.notification.data.url);
});
```

**Responsabilidades:**
- Escutar eventos `push`
- Exibir notificação visual
- Lidar com cliques (abrir app no URL especificado)

#### 2. **Edge Function: get-vapid-public-key**
```typescript
// Retorna a chave VAPID pública para o frontend
return { publicKey: Deno.env.get("VAPID_PUBLIC_KEY") }
```

#### 3. **Edge Function: send-push-notification**
```typescript
// Busca subscrições do usuário
// Envia notificação via Web Push Protocol
// Remove subscrições inválidas
return { sent: X, removed: Y }
```

#### 4. **Edge Function: notify-goal-threshold** (Agendado)
```typescript
// Roda periodicamente (ex: diariamente)
// Verifica metas de todos os usuários
// Envia notificações para quem atingiu thresholds
```

**Lógica de Notificação:**
```typescript
if (ratio >= 1.0) {
  // 100% ou mais → GOAL_100
} else if (ratio >= 0.8) {
  // 80-99% → GOAL_80
} else if (savedPercentage >= 20) {
  // Economizou 20%+ → GOAL_ECONOMY
}
```

### Banco de Dados

#### Tabela: `push_subscriptions`
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,    -- Chave pública para criptografia
  auth TEXT NOT NULL,       -- Token de autenticação
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
```

#### Tabela: `notifications`
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  type TEXT NOT NULL,       -- 'GOAL_80', 'GOAL_100', 'GOAL_ECONOMY'
  ref_month TEXT NOT NULL,  -- 'YYYY-MM'
  payload JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, type, ref_month)  -- Previne duplicatas
);
```

## 🔧 Configuração

### 1. Gerar Chaves VAPID

```bash
npx web-push generate-vapid-keys
```

Resultado:
```
Public Key: BPx...
Private Key: abc...
```

### 2. Configurar Secrets no Supabase

Via Lovable:
- `VAPID_PUBLIC_KEY`: Chave pública
- `VAPID_PRIVATE_KEY`: Chave privada
- `VAPID_SUBJECT`: `mailto:seu-email@exemplo.com`

### 3. Habilitar Service Worker

Já configurado via `vite-plugin-pwa` em `vite.config.ts`:
```typescript
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'public',
  filename: 'sw.js',
  // ...
})
```

## 🧪 Testes

### Manual

1. **Ativar Notificações:**
   - Abrir `/settings`
   - Clicar no switch "Notificações Push"
   - Permitir notificações no browser

2. **Enviar Teste:**
   - Clicar em "Enviar Notificação de Teste"
   - Verificar notificação aparece

3. **Testar Alertas de Meta:**
   ```typescript
   // Via console do browser (dev)
   await supabase.functions.invoke('notify-goal-threshold');
   ```

### Unitários

#### Hook: `usePushNotifications.test.ts`
- Verifica detecção de suporte
- Testa subscrição/desinscrição
- Mock de Service Worker

#### Componente: `PushOnboarding.test.tsx`
- Onboarding aparece uma vez
- Botões acionam callbacks corretos
- LocalStorage persiste estado

## 🚨 Troubleshooting

### Notificação não chega

1. **Verificar Permissão:**
   ```javascript
   console.log(Notification.permission); // Deve ser 'granted'
   ```

2. **Verificar Service Worker:**
   ```javascript
   navigator.serviceWorker.getRegistration().then(reg => {
     console.log('SW Active:', !!reg?.active);
   });
   ```

3. **Verificar Subscrição:**
   ```javascript
   const sub = await registration.pushManager.getSubscription();
   console.log('Subscribed:', !!sub);
   ```

4. **Verificar Endpoint:**
   - Abrir DevTools > Application > Service Workers
   - Verificar se há erros

### Notificação duplicada

- Edge function `notify-goal-threshold` tem constraint UNIQUE em `notifications`
- Se aparecer duplicata, verificar índice único

### Push não funciona offline

- Push notifications funcionam mesmo offline (são entregues ao SW)
- Verificar se SW está registrado corretamente

## 📊 Métricas

### Queries Úteis

**Taxa de Opt-in:**
```sql
SELECT 
  COUNT(DISTINCT user_id) as subscribed_users,
  (SELECT COUNT(*) FROM auth.users) as total_users,
  ROUND(100.0 * COUNT(DISTINCT user_id) / (SELECT COUNT(*) FROM auth.users), 2) as opt_in_rate
FROM push_subscriptions;
```

**Notificações Enviadas (Último Mês):**
```sql
SELECT 
  type,
  COUNT(*) as count
FROM notifications
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY count DESC;
```

**Taxa de Abertura:**
```sql
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN read THEN 1 ELSE 0 END) as opened,
  ROUND(100.0 * SUM(CASE WHEN read THEN 1 ELSE 0 END) / COUNT(*), 2) as open_rate
FROM notifications
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY type;
```

## 🔄 Próximas Melhorias

### Sprint 1.2 - ✅ CONCLUÍDO
- [x] Onboarding de notificações com modal
- [x] Notificações contextuais (80%, 100%, economia)
- [x] Botão de teste melhorado

### Backlog
- [ ] Lembretes diários (ex: "Registre seus gastos de hoje")
- [ ] Notificações de insights (ex: "Você gastou 30% mais em 'Alimentação' este mês")
- [ ] Personalização de horários (ex: receber alertas apenas às 18h)
- [ ] Rich notifications com ações (ex: "Ver Detalhes" / "Dispensar")
- [ ] Agendamento de relatórios semanais
- [ ] A/B testing de mensagens

## 📚 Referências

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [VAPID Keys](https://blog.mozilla.org/services/2016/08/23/sending-vapid-identified-webpush-notifications-via-mozillas-push-service/)
