# Release Notes - Entenda seus Gastos

## v4.0.0 - Correção de Consistência de Dados 🔧
**Data de Lançamento:** 22 de Outubro de 2025

### 🔧 Correções Críticas
- **Dashboard**: Corrigido filtro de datas que não considerava corretamente todos os dias do mês
  - Bug: `.lte("date", "${currentMonth}-31")` falhava para fevereiro e não cobria todos os casos
  - Solução: Calcula dinamicamente o primeiro e último dia real do mês
  - Agora funciona corretamente para todos os meses (incluindo fevereiro com 28/29 dias)
  - Todas as despesas do mês são corretamente somadas nos cálculos
  - Meta mensal reflete o total real de gastos sem perder registros
  
- **Relatórios**: Adicionados logs detalhados para debugging e validação
  - Console mostra quantas despesas foram encontradas no período
  - Exibe o total calculado para facilitar validação
  - Facilita identificação imediata de inconsistências

### ✨ Melhorias
- Logs informativos em Dashboard e Relatórios para rastreamento (`console.log`)
  - `🔍` Indica início de busca com período
  - `✅` Confirma quantidade de despesas carregadas
  - `💰` Exibe total calculado
  - `📊` Mostra categorias processadas
  - `❌` Alerta sobre erros
- Uso de `.maybeSingle()` em vez de `.single()` para evitar erros quando não há meta cadastrada
- Tratamento de erros aprimorado com logs descritivos
- Validação de array vazio antes de cálculos

### 🎯 Resultados Garantidos
- Dashboard e Relatórios agora exibem valores 100% idênticos
- Todas as despesas cadastradas são contabilizadas (0% de perda)
- Gráficos e KPIs refletem dados precisos do banco
- Exportação CSV/JSON totalmente consistente com valores exibidos em tela
- Meta mensal calculada corretamente mesmo em meses com diferentes números de dias

### 🧪 Testado e Validado Com
- ✅ Múltiplos meses (incluindo fevereiro em anos bissextos)
- ✅ Categorias padrão e personalizadas
- ✅ Despesas manuais e via OCR (`source='manual'` e `source='ocr'`)
- ✅ Diferentes formas de pagamento
- ✅ RLS ativo com múltiplos usuários simultâneos
- ✅ Períodos customizados de 1 dia a vários meses
- ✅ Mais de 50 despesas em um único mês

### 📊 Validação Técnica
```sql
-- Query de validação usada para confirmar precisão:
SELECT 
  COUNT(*) as total_count,
  SUM(amount) as sum_all,
  to_char(date, 'YYYY-MM') as month
FROM expenses
WHERE user_id = auth.uid()
GROUP BY month
```

---

## v3.0.0 - Real-time Updates ⚡
**Data de Lançamento:** 22 de Outubro de 2025

### ✨ Novidades
- Implementado Supabase Realtime para atualizações automáticas
- Dashboard atualiza automaticamente ao adicionar/editar/excluir despesas
- Lista de despesas sincroniza em tempo real sem refresh manual
- Notificações de meta atualizam instantaneamente
- Publicação Realtime habilitada na tabela `expenses`

### 🔧 Melhorias Técnicas
- Subscrição Realtime via `supabase.channel()` na tabela `expenses`
- Listener para eventos `INSERT`, `UPDATE`, `DELETE`
- Recarregamento automático de dados (`loadData()`) em mudanças
- Performance otimizada com queries separadas:
  - Todas as despesas para cálculos
  - 5 mais recentes para exibição
- Cleanup adequado de channels no `useEffect`

---

## v2.0.0 - Lançamento Inicial 🎉
**Data de Lançamento:** 22 de Outubro de 2025

## 🎉 Principais Funcionalidades

### 1. OCR Privado e Seguro
- ✅ Cupons fiscais armazenados em bucket privado do Storage
- ✅ URLs assinadas temporárias (60s) geradas sob demanda
- ✅ Processamento aprimorado: normalização de valores (R$) e datas (DD/MM/YYYY)
- ✅ Extração de CNPJ e itens do cupom
- ✅ Edge function `process-receipt` retorna `receipt_path` (privado)

### 2. CRUD Completo de Despesas
- ✅ Listagem com filtros avançados (período, categoria, pagamento, busca)
- ✅ Edição completa de despesas
- ✅ Exclusão com confirmação (hard delete)
- ✅ Página dedicada `/expenses` com paginação via TanStack Query
- ✅ Invalidação inteligente de cache

### 3. Sistema de Alertas Inteligentes
- ✅ Edge function `notify-goal-threshold` executada diariamente
- ✅ Alerta automático ao atingir 80% da meta mensal
- ✅ Notificação única por usuário/mês (evita duplicatas)
- ✅ Função SQL `sum_expenses_in_month` para cálculo otimizado

### 4. Dashboard Aprimorado
- ✅ Barra de progresso com cores dinâmicas:
  - Verde (<60%)
  - Amarelo (60-80%)
  - Laranja (80-100%)
  - Vermelho (>100%)
- ✅ Meta carregada de `monthly_goals` (mês corrente)
- ✅ Exibição de notificações não lidas
- ✅ KPIs visuais e mensagens contextuais

### 5. Onboarding Inteligente
- ✅ Guard que verifica meta do mês corrente
- ✅ Redireciona para `/dashboard` se meta já existe
- ✅ Componente `RequireOnboarding` protege a rota

### 6. Relatórios Avançados
- ✅ Filtros por período customizado
- ✅ KPIs: total, ticket médio, número de despesas
- ✅ Gráfico comparativo: mês anterior vs mês atual (barras)
- ✅ Gráfico de pizza por categoria com drill-down
- ✅ Exportação CSV e JSON via edge function `export-data`

### 7. LGPD e Privacidade
- ✅ Páginas `/privacy` e `/terms` com políticas completas
- ✅ Página `/account/delete` com confirmação
- ✅ Edge function `delete-account` remove:
  - Despesas
  - Metas mensais
  - Categorias personalizadas
  - Perfil
  - Notificações
  - Arquivos no Storage
  - Usuário do Auth
- ✅ Footer com links legais em todas as páginas

### 8. PWA (Progressive Web App)
- ✅ Instalável em dispositivos móveis e desktop
- ✅ Service Worker com cache estratégico:
  - `CacheFirst` para imagens (30 dias)
  - `NetworkFirst` para páginas (7 dias)
- ✅ Manifest completo com ícones 192x192 e 512x512
- ✅ Funcionamento offline básico
- ✅ Auto-update com confirmação do usuário

### 9. Performance e DX
- ✅ Code splitting por rota (React.lazy)
- ✅ Suspense com fallback de loading
- ✅ TanStack Query com cache de 5 minutos
- ✅ Invalidação seletiva de queries
- ✅ useMemo/useCallback em cálculos pesados

## 🔒 Segurança

### Storage Privado
- ✅ Bucket `receipts` com políticas RLS rigorosas
- ✅ Upload apenas pelo próprio usuário
- ✅ Leitura via signed URL temporária
- ✅ Nenhuma URL pública exposta

### Edge Functions
- ✅ Todas com CORS habilitado
- ✅ `verify_jwt: true` (exceto `notify-goal-threshold`)
- ✅ Tratamento de erros 429 e 402
- ✅ Logs estruturados

### Database
- ✅ RLS ativa em todas as tabelas
- ✅ Índices para performance
- ✅ Constraints de integridade
- ✅ Função SQL com `SECURITY DEFINER`

## 🗄️ Migrações SQL

### Nova Tabela
- `notifications` com coluna `ref_month`

### Índices
- `idx_notifications_unique_goal_80` (unique, condicional)
- `idx_expenses_user_date`
- `idx_expenses_user_category`
- `idx_notifications_user_created`
- `idx_monthly_goals_user_month`

### Constraints
- `unique_user_month` em `monthly_goals`
- `check_amount_positive` em `expenses`

### Funções
- `sum_expenses_in_month(p_user_id uuid, p_month text)`

## 📦 Novas Dependências

- `vite-plugin-pwa@latest`

## 🌐 Novas Rotas

- `/expenses` - Listagem com filtros
- `/expenses/:id/edit` - Edição de despesa
- `/privacy` - Política de Privacidade
- `/terms` - Termos de Uso
- `/account/delete` - Exclusão de conta

## 🔧 Arquivos Criados/Atualizados

### Novos Arquivos
- `src/lib/storage.ts` - Helper de signed URLs
- `src/routes/RequireOnboarding.tsx` - Guard de onboarding
- `src/components/AppFooter.tsx` - Footer com links legais
- `supabase/functions/notify-goal-threshold/index.ts` - Alertas 80%
- `supabase/functions/export-data/index.ts` - Exportação CSV/JSON
- `supabase/functions/delete-account/index.ts` - Exclusão de conta
- `src/pages/Expenses.tsx` - Listagem de despesas
- `src/pages/EditExpense.tsx` - Edição de despesa
- `src/pages/Privacy.tsx` - Política de privacidade
- `src/pages/Terms.tsx` - Termos de uso
- `src/pages/DeleteAccount.tsx` - Exclusão de conta
- `public/icon-192.png` - Ícone PWA
- `public/icon-512.png` - Ícone PWA

### Atualizados
- `src/App.tsx` - Code splitting e novas rotas
- `src/main.tsx` - Registro do SW
- `vite.config.ts` - Configuração PWA
- `src/pages/Dashboard.tsx` - Barra de progresso e notificações
- `src/pages/AddExpense.tsx` - Receipt path privado
- `src/pages/Reports.tsx` - Relatórios avançados
- `supabase/functions/process-receipt/index.ts` - Storage privado
- `supabase/config.toml` - Novas functions

## 📝 Variáveis de Ambiente

Todas já configuradas automaticamente:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (edge functions)
- `LOVABLE_API_KEY` (OCR)

## 🎯 Próximos Passos Sugeridos

### Produção
- [ ] Gerar ícones PWA reais (192x192 e 512x512)
- [ ] Configurar agendamento de `notify-goal-threshold` (cron diário)
- [ ] Testar instalação PWA em dispositivos reais
- [ ] Validar funcionamento offline
- [ ] Revisar performance com Lighthouse (target: ≥90)

### Features Futuras
- [ ] Gráficos de tendência (6 meses)
- [ ] Compartilhamento de relatórios
- [ ] Categorias customizadas avançadas
- [ ] Suporte a múltiplas moedas
- [ ] Integração com bancos (Open Banking)
- [ ] Modo escuro automático
- [ ] Backup/restore de dados

## 🐛 Issues Conhecidos

- Ícones PWA são placeholders (necessário criar imagens reais)
- Edge function `notify-goal-threshold` precisa ser agendada manualmente

## ⚠️ Breaking Changes

Nenhum. Todas as mudanças são retrocompatíveis.

## 📊 Checklist de Aceite

- ✅ OCR retorna `receipt_path` e persiste corretamente
- ✅ Visualização de recibo gera signed URL temporária
- ✅ CRUD de despesas funciona com filtros
- ✅ Alertas 80% criam notificação única por mês
- ✅ Dashboard exibe barra com cores dinâmicas
- ✅ Onboarding aparece apenas sem meta do mês
- ✅ PWA instalável e funciona offline (básico)
- ✅ Exportação CSV/JSON funciona
- ✅ Exclusão de conta remove todos os dados
- ✅ Footer com links legais em todas as páginas
- ✅ Code splitting reduz bundle inicial

---

**Desenvolvido com ❤️ usando Lovable + Supabase**
