# 🔌 Edge Functions API

Documentação de todas as Edge Functions disponíveis.

---

## 📋 Visão Geral

| Function | Auth | Descrição |
|----------|------|-----------|
| `process-receipt` | JWT | OCR de recibos |
| `export-data` | JWT | Exportação CSV/JSON |
| `export-pdf` | JWT | Exportação PDF |
| `delete-account` | JWT | Exclusão de conta |
| `generate-insights` | JWT | Geração de insights IA |
| `check-category-variations` | JWT | Análise de variações |
| `send-push-notification` | JWT | Envio de push |
| `chat-assistant` | JWT | Chat com IA |
| `get-vapid-public-key` | Público | Chave VAPID |
| `notify-goal-threshold` | CRON_SECRET | Alertas de meta |
| `process-scheduled-exports` | CRON_SECRET | Exportações agendadas |
| `process-recurring-expenses` | CRON_SECRET | Despesas recorrentes |

---

## 🔐 Functions Autenticadas (JWT)

### 1. process-receipt

**Descrição:** Processa imagem de recibo via OCR usando IA.

**Endpoint:** `POST /functions/v1/process-receipt`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response Success (200):**
```json
{
  "success": true,
  "data": {
    "amount": 45.90,
    "date": "2024-01-15",
    "merchant": "Supermercado ABC",
    "cnpj": "12.345.678/0001-90",
    "items": [
      { "name": "Arroz 5kg", "price": 25.90 },
      { "name": "Feijão 1kg", "price": 10.00 }
    ]
  },
  "receiptUrl": "https://...storage.../receipts/user_id/uuid.jpg"
}
```

**Response Error (400/500):**
```json
{
  "error": "Não foi possível processar o recibo"
}
```

---

### 2. export-data

**Descrição:** Exporta despesas em formato CSV ou JSON.

**Endpoint:** `POST /functions/v1/export-data`

**Request Body:**
```json
{
  "period": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  }
}
```

**Response Success (200):**
```json
{
  "csv": "Data,Valor,Categoria,Comerciante\n2024-01-15,45.90,Alimentação,Supermercado...",
  "json": [...],
  "summary": {
    "total": 1500.00,
    "count": 25,
    "average": 60.00,
    "byCategory": {
      "Alimentação": 500.00,
      "Transporte": 300.00
    }
  }
}
```

---

### 3. export-pdf

**Descrição:** Gera relatório HTML para conversão em PDF.

**Endpoint:** `POST /functions/v1/export-pdf`

**Request Body:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "html": "<!DOCTYPE html>...",
  "summary": {
    "total": 1500.00,
    "count": 25,
    "average": 60.00
  }
}
```

---

### 4. delete-account

**Descrição:** Exclui completamente a conta do usuário e todos os dados.

**Endpoint:** `POST /functions/v1/delete-account`

**Request Body:**
```json
{
  "confirmation": "EXCLUIR"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Conta excluída com sucesso"
}
```

**Ações Realizadas:**
1. Exclui despesas
2. Exclui contas
3. Exclui categorias customizadas
4. Exclui metas
5. Exclui notificações
6. Exclui conversas do chat
7. Exclui progresso educacional
8. Exclui respostas do quiz
9. Exclui subscriptions push
10. Exclui perfil
11. Exclui usuário do auth.users

---

### 5. generate-insights

**Descrição:** Gera insights personalizados usando IA.

**Endpoint:** `POST /functions/v1/generate-insights`

**Request Body:** (nenhum, usa dados do usuário autenticado)

**Response Success (200):**
```json
{
  "success": true,
  "insights": [
    {
      "type": "positive",
      "title": "Economia Alcançada!",
      "description": "Você gastou 15% menos que no mês passado."
    },
    {
      "type": "warning",
      "title": "Atenção com Delivery",
      "description": "Seus gastos com delivery aumentaram 30%."
    },
    {
      "type": "tip",
      "title": "Dica de Economia",
      "description": "Considere preparar mais refeições em casa."
    }
  ],
  "context": {
    "currentMonthTotal": 1500.00,
    "lastMonthTotal": 1750.00,
    "goalProgress": 75,
    "topCategories": ["Alimentação", "Transporte"]
  }
}
```

---

### 6. check-category-variations

**Descrição:** Verifica variações significativas (±20%) entre meses.

**Endpoint:** `POST /functions/v1/check-category-variations`

**Response Success (200):**
```json
{
  "success": true,
  "alerts": [
    {
      "category": "Lazer",
      "previousAmount": 200.00,
      "currentAmount": 280.00,
      "variation": 40,
      "direction": "increase"
    }
  ]
}
```

---

### 7. send-push-notification

**Descrição:** Envia push notification para o usuário.

**Endpoint:** `POST /functions/v1/send-push-notification`

**Request Body:**
```json
{
  "userId": "uuid",
  "title": "Alerta de Meta",
  "body": "Você atingiu 80% da sua meta mensal",
  "data": {
    "type": "GOAL_80",
    "url": "/dashboard"
  }
}
```

**Response Success (200):**
```json
{
  "success": true,
  "sent": 2,
  "removed": 0
}
```

---

### 8. chat-assistant

**Descrição:** Chat conversacional com IA sobre finanças.

**Endpoint:** `POST /functions/v1/chat-assistant`

**Request Body:**
```json
{
  "message": "Como posso economizar mais?",
  "conversationId": "uuid" // opcional
}
```

**Response Success (200):**
```json
{
  "success": true,
  "response": "Olhando para seus gastos, notei que...",
  "conversationId": "uuid"
}
```

**Rate Limit:** 10 mensagens por minuto.

---

## 🌐 Functions Públicas

### 9. get-vapid-public-key

**Descrição:** Retorna chave pública VAPID para push notifications.

**Endpoint:** `GET /functions/v1/get-vapid-public-key`

**Auth:** Nenhuma (público)

**Response Success (200):**
```json
{
  "publicKey": "BLc4xRlBKly..."
}
```

**Comportamento:**
- Se chaves não existem, gera novo par
- Armazena na tabela `vapid_keys`
- Retorna apenas a chave pública

---

## ⏰ Functions de Cron (CRON_SECRET)

### 10. notify-goal-threshold

**Descrição:** Verifica metas e envia alertas de threshold.

**Endpoint:** `POST /functions/v1/notify-goal-threshold`

**Headers:**
```
X-Cron-Secret: <CRON_SECRET>
```

**Trigger:** Cron job (configurável)

**Ações:**
1. Busca todas as `monthly_goals` do mês atual
2. Para cada meta, calcula `sum_expenses_in_month`
3. Determina threshold (80%, 100%, economia)
4. Cria notificação na tabela `notifications`
5. Envia push via `send-push-notification`

**Response Success (200):**
```json
{
  "success": true,
  "processed": 15,
  "notified": 3
}
```

---

### 11. process-scheduled-exports

**Descrição:** Processa exportações agendadas.

**Endpoint:** `POST /functions/v1/process-scheduled-exports`

**Headers:**
```
X-Cron-Secret: <CRON_SECRET>
```

**Trigger:** Cron job (a cada hora)

**Ações:**
1. Busca `scheduled_exports` com `next_run_at <= now()` e `is_active = true`
2. Para cada export:
   - Invoca `export-pdf` ou `export-data`
   - Cria notificação de sucesso
   - Atualiza `last_run_at` e `next_run_at`

**Response Success (200):**
```json
{
  "success": true,
  "processed": 5
}
```

---

### 12. process-recurring-expenses

**Descrição:** Cria despesas a partir de recorrentes.

**Endpoint:** `POST /functions/v1/process-recurring-expenses`

**Headers:**
```
X-Cron-Secret: <CRON_SECRET>
```

**Trigger:** Cron job diário

**Ações:**
1. Busca `recurring_expenses` com `next_occurrence <= today` e `is_active = true`
2. Para cada recorrente:
   - Verifica se já existe despesa para essa data (evita duplicação)
   - Cria nova despesa com `source = 'recurring'`
   - Cria notificação
   - Calcula nova `next_occurrence` baseado em `frequency`
   - Desativa se `end_date` foi atingida

**Response Success (200):**
```json
{
  "success": true,
  "processed": 3,
  "created": 3,
  "skipped": 0,
  "deactivated": 1
}
```

---

## 🔧 Configuração

### supabase/config.toml

```toml
[functions.process-receipt]
verify_jwt = true

[functions.export-data]
verify_jwt = true

[functions.export-pdf]
verify_jwt = true

[functions.delete-account]
verify_jwt = true

[functions.generate-insights]
verify_jwt = true

[functions.check-category-variations]
verify_jwt = true

[functions.send-push-notification]
verify_jwt = true

[functions.chat-assistant]
verify_jwt = true

[functions.get-vapid-public-key]
verify_jwt = false

[functions.notify-goal-threshold]
verify_jwt = false

[functions.process-scheduled-exports]
verify_jwt = false

[functions.process-recurring-expenses]
verify_jwt = false
```

---

## 🔐 Secrets Necessários

| Secret | Descrição |
|--------|-----------|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_ANON_KEY` | Chave anônima |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço |
| `AI_SERVICE_URL` | Endereço do serviço de IA (`services/ai`) |
| `CRON_SECRET` | Secret para jobs |

---

## 📊 CORS

Todas as functions incluem headers CORS:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 🔗 Links Relacionados

- [Funcionalidades](./FEATURES.md)
- [Segurança](./SECURITY.md)
- [Modelo de Dados](./DATABASE.md)
