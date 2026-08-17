# 🔐 Segurança

Documentação das políticas de segurança implementadas.

---

## 📋 Visão Geral

| Área | Status | Descrição |
|------|--------|-----------|
| Row Level Security | ✅ | Todas as 21 tabelas protegidas |
| Autenticação | ✅ | Email/senha via Supabase Auth |
| Edge Functions | ✅ | JWT ou CRON_SECRET |
| Storage | ✅ | Bucket privado com RLS |
| CORS | ✅ | Configurado em todas as functions |

---

## 🛡️ Row Level Security (RLS)

### Princípio
Todas as tabelas utilizam `auth.uid() = user_id` para garantir que usuários só acessem seus próprios dados.

### Políticas por Tabela

#### Tabelas de Usuário (CRUD completo)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | ✅ | ✅ | ✅ | ❌ |
| expenses | ✅ | ✅ | ✅ | ✅ |
| accounts | ✅ | ✅ | ✅ | ✅ |
| categories | ✅ * | ✅ | ✅ | ✅ |
| monthly_goals | ✅ | ✅ | ✅ | ❌ |
| category_goals | ✅ | ✅ | ✅ | ✅ |
| recurring_expenses | ✅ | ✅ | ✅ | ✅ |
| notification_preferences | ✅ | ✅ | ✅ | ✅ |
| push_subscriptions | ✅ | ✅ | ✅ | ✅ |
| scheduled_exports | ✅ | ✅ | ✅ | ✅ |
| saved_filters | ✅ | ✅ | ✅ | ✅ |
| chat_conversations | ✅ | ✅ | ✅ | ✅ |
| chat_messages | ✅ | ✅ | ❌ | ✅ |
| user_content_progress | ✅ | ✅ | ✅ | ✅ |
| quiz_responses | ✅ | ✅ | ✅ | ❌ |
| financial_health_scores | ✅ | ✅ | ✅ | ❌ |

\* Categories: SELECT inclui categorias padrão (`is_default = true`)

#### Tabelas Somente Leitura (Sistema)
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| educational_content | ✅ (público) | ❌ | ❌ | ❌ |
| quiz_questions | ✅ (público) | ❌ | ❌ | ❌ |

#### Tabelas Restritas
| Tabela | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| notifications | ✅ | ❌ * | ✅ | ✅ |
| audit_logs | ✅ | ❌ * | ❌ | ❌ |
| vapid_keys | ❌ | ❌ | ❌ | ❌ |

\* Inserção via SECURITY DEFINER functions

---

## 🔑 Autenticação

### Método
- Email e senha via Supabase Auth
- Auto-confirmação de email habilitada
- JWT tokens para sessões

### Fluxo de Signup
1. Usuário envia email/senha
2. Supabase cria registro em `auth.users`
3. Trigger `handle_new_user()` cria perfil
4. Trigger `create_default_accounts()` cria contas padrão
5. JWT retornado ao cliente

### Fluxo de Login
1. Usuário envia email/senha
2. Supabase valida credenciais
3. JWT retornado ao cliente
4. Cliente armazena em memória (não localStorage)

### Proteção de Rotas
```typescript
// RequireOnboarding.tsx
const { data: session } = await supabase.auth.getSession();
if (!session) redirect('/auth');
```

---

## 🔒 Edge Functions

### Com JWT (verify_jwt = true)
| Function | Validação Adicional |
|----------|---------------------|
| process-receipt | - |
| export-data | - |
| export-pdf | - |
| delete-account | Confirmação "EXCLUIR" |
| generate-insights | - |
| check-category-variations | - |
| send-push-notification | - |
| chat-assistant | Rate limit 10/min |

### Com CRON_SECRET
| Function | Header |
|----------|--------|
| notify-goal-threshold | X-Cron-Secret |
| process-scheduled-exports | X-Cron-Secret |
| process-recurring-expenses | X-Cron-Secret |

**Validação:**
```typescript
const cronSecret = Deno.env.get("CRON_SECRET");
const requestSecret = req.headers.get("X-Cron-Secret");
if (requestSecret !== cronSecret) {
  return new Response("Unauthorized", { status: 401 });
}
```

### Públicas
| Function | Motivo |
|----------|--------|
| get-vapid-public-key | Necessário para push subscription |

---

## 📦 Storage

### Bucket: receipts
- **Público:** Não
- **RLS:** Habilitado

### Políticas
```sql
-- Usuários podem ver seus próprios recibos
CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Usuários podem fazer upload de seus recibos
CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Estrutura de Pastas
```
receipts/
└── {user_id}/
    ├── receipt-1.jpg
    ├── receipt-2.jpg
    └── ...
```

---

## 🔧 Functions SECURITY DEFINER

### Funções com SECURITY DEFINER
Executam com privilégios do criador, não do usuário.

| Função | Motivo |
|--------|--------|
| `create_audit_log` | Inserir em audit_logs |
| `audit_expenses` | Trigger de auditoria |
| `audit_accounts` | Trigger de auditoria |
| `audit_categories` | Trigger de auditoria |
| `audit_category_goals` | Trigger de auditoria |
| `handle_new_user` | Criar perfil no signup |
| `create_default_accounts` | Criar contas padrão |
| `calculate_financial_health_score` | Cálculo complexo |
| `get_billing_period` | Cálculo de período |
| `sum_expenses_in_month` | Soma de despesas |
| `upsert_monthly_goals` | Upsert de metas |

### Proteção de search_path
```sql
CREATE FUNCTION my_function()
RETURNS void
SECURITY DEFINER
SET search_path = public  -- Previne SQL injection
AS $$ ... $$
```

---

## 🛡️ Proteções Adicionais

### CORS
Todas as Edge Functions incluem:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Rate Limiting
- Chat assistant: 10 mensagens/minuto
- Implementado via consulta ao banco

### Validação de Input
- Zod schemas em formulários críticos
- Validação de tipos no banco (NOT NULL, CHECK)
- Sanitização em Edge Functions

### Secrets
| Secret | Exposição |
|--------|-----------|
| SUPABASE_URL | ✅ Cliente (VITE_) |
| SUPABASE_PUBLISHABLE_KEY | ✅ Cliente (VITE_) |
| SUPABASE_SERVICE_ROLE_KEY | ❌ Apenas servidor |
| AI_SERVICE_URL | ❌ Apenas servidor |
| CRON_SECRET | ❌ Apenas servidor |

---

## ⚠️ Considerações Conhecidas

### XSS em PDF Export (Baixo Risco)
- HTML gerado com dados do usuário
- Mitigação: dados são do próprio usuário (self-XSS)
- Recomendação: implementar HTML encoding

### Validação de Tamanho de Arquivo
- Recibos sem limite explícito de tamanho
- Mitigação: o serviço de IA aplica timeout, retry e rate limit próprios
- Recomendação: adicionar validação de 5MB

---

## 📊 Checklist de Segurança

- [x] RLS em todas as tabelas
- [x] JWT em Edge Functions sensíveis
- [x] CRON_SECRET em jobs agendados
- [x] Storage privado
- [x] SECURITY DEFINER com search_path fixo
- [x] Secrets não expostos no cliente
- [x] CORS configurado
- [x] Rate limiting no chat
- [x] Validação de input em formulários
- [ ] HTML encoding em exports (pendente)
- [ ] Limite de tamanho em uploads (pendente)

---

## 🔗 Links Relacionados

- [Edge Functions](./API.md)
- [Modelo de Dados](./DATABASE.md)
- [Funcionalidades](./FEATURES.md)
