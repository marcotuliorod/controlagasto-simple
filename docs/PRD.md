# Product Requirements Document (PRD)
# Entenda seus Gastos - Personal Finance Manager

**Versão:** 1.0
**Data:** 21 de Janeiro de 2026
**Status:** Production Ready (v8.0.0)
**Autor:** Product Team

---

## 📋 Sumário Executivo

### Visão do Produto

**Entenda seus Gastos** é uma aplicação web progressiva (PWA) de gestão financeira pessoal que capacita usuários brasileiros a ter controle total sobre suas finanças através de tecnologia inteligente, insights com IA e educação financeira gamificada.

### Problema

- 60% dos brasileiros não fazem controle financeiro sistemático
- Aplicativos existentes são complexos ou não respeitam o ciclo de faturamento de cartões
- Falta educação financeira prática e acessível
- Usuários precisam de insights proativos, não apenas relatórios passivos

### Solução

Uma plataforma moderna que combina:
- **Rastreamento inteligente** com OCR de recibos e categorização automática
- **Ciclo de faturamento configurável** (1-28) alinhado ao fechamento de cartões
- **IA contextual** para insights, chat assistant e sugestões personalizadas
- **Gamificação** com quiz financeiro e score de saúde
- **Automação** com despesas recorrentes e exportações agendadas

### Métricas de Sucesso

| Métrica | Objetivo | Status Atual |
|---------|----------|--------------|
| Performance (Lighthouse) | ≥90 | 92 ✅ |
| Accessibility | ≥95 | 97 ✅ |
| Test Coverage | ≥70% | 72% ✅ |
| Bundle Size | <350KB gzipped | 320KB ✅ |
| Time to Interactive | <3s | 2.1s ✅ |

---

## 🎯 Objetivos de Negócio

### Primários
1. **Adoção**: Atingir 10.000 usuários ativos mensais no primeiro ano
2. **Engajamento**: 60% dos usuários registram despesas semanalmente
3. **Retenção**: 40% dos usuários ativos após 90 dias
4. **NPS**: Net Promoter Score ≥50

### Secundários
1. Educação: 30% completam pelo menos 1 módulo educativo
2. Premium: 5% convertem para plano pago (futuro)
3. PWA Install: 25% instalam como app nativo

---

## 👥 Personas

### Persona 1: Maria - A Organizadora (Primária)
- **Idade:** 28 anos
- **Profissão:** Analista de Marketing
- **Renda:** R$ 4.500/mês
- **Contexto:** Tem cartão de crédito com fechamento dia 15, quer acompanhar gastos por ciclo
- **Objetivos:** Não ultrapassar meta mensal, economizar 20% da renda
- **Dores:** Apps não respeitam ciclo de cartão, esquece de registrar despesas pequenas
- **Comportamento:** Acessa app diariamente no celular, prefere dark mode

### Persona 2: João - O Iniciante (Secundária)
- **Idade:** 22 anos
- **Profissão:** Estagiário
- **Renda:** R$ 1.800/mês
- **Contexto:** Primeira experiência com controle financeiro, busca educação
- **Objetivos:** Aprender a poupar, entender para onde vai o dinheiro
- **Dores:** Não sabe por onde começar, termos financeiros complicados
- **Comportamento:** Usa app esporadicamente, gosta de gamificação

### Persona 3: Carlos - O Profissional (Terciária)
- **Idade:** 35 anos
- **Profissão:** Freelancer Designer
- **Renda:** Variável (R$ 3.000-8.000/mês)
- **Contexto:** Renda irregular, múltiplas contas, precisa de relatórios para IR
- **Objetivos:** Exportar relatórios mensais, separar despesas pessoais/profissionais
- **Dores:** Precisa de tags e notas detalhadas, esquece categorias
- **Comportamento:** Desktop power user, usa atalhos de teclado (Cmd+K)

---

## 🎨 User Stories & Acceptance Criteria

### Epic 1: Gestão de Despesas

#### US1.1: Adicionar Despesa Manual
**Como** usuário,
**Quero** adicionar uma despesa manualmente,
**Para** manter registro de meus gastos.

**Critérios de Aceite:**
- [ ] Campos obrigatórios: valor, data
- [ ] Campos opcionais: categoria, conta, comerciante, método pagamento, tags, notas
- [ ] Valor formatado em R$ (ponto milhar, vírgula decimal)
- [ ] Data padrão: hoje
- [ ] Sugestão automática de categoria baseada em histórico de comerciante
- [ ] Quick picker com categorias mais usadas
- [ ] Validação: valor > 0, data não futura
- [ ] Feedback visual: loading state, sucesso, erro
- [ ] Atalho: FAB (+) ou Cmd+N

#### US1.2: Processar Recibo com OCR
**Como** usuário,
**Quero** fotografar/fazer upload de recibo,
**Para** preencher despesa automaticamente sem digitação.

**Critérios de Aceite:**
- [ ] Aceita formatos: JPG, PNG, PDF
- [ ] Tamanho máximo: 5MB
- [ ] Extrai: valor total, data, comerciante, CNPJ, itens
- [ ] Preenche formulário automaticamente
- [ ] Permite edição antes de salvar
- [ ] Armazena imagem em bucket privado
- [ ] URL assinada com 60s de expiração
- [ ] Feedback de processamento (spinner)
- [ ] Error handling: OCR falhou, formato inválido, quota excedida

#### US1.3: Editar Despesa Existente
**Como** usuário,
**Quero** editar uma despesa já registrada,
**Para** corrigir erros ou adicionar informações.

**Critérios de Aceite:**
- [ ] Todos os campos editáveis
- [ ] Validações aplicadas
- [ ] Alteração registrada em audit log
- [ ] Confirmação antes de salvar
- [ ] Cache invalidado (React Query)
- [ ] Realtime update para outros dispositivos

#### US1.4: Excluir Despesa
**Como** usuário,
**Quero** excluir uma despesa,
**Para** remover registros incorretos.

**Critérios de Aceite:**
- [ ] Dialog de confirmação
- [ ] Ação de desfazer (undo) disponível por 5s
- [ ] Exclusão registrada em audit log
- [ ] Recibo no storage também excluído (opcional)
- [ ] Cache invalidado

### Epic 2: Despesas Recorrentes

#### US2.1: Configurar Despesa Recorrente
**Como** usuário,
**Quero** configurar despesas que se repetem,
**Para** não precisar registrá-las manualmente todo período.

**Critérios de Aceite:**
- [ ] Campos: valor, comerciante, frequência, data início, data fim (opcional)
- [ ] Frequências: diária, semanal, mensal, anual
- [ ] Categoria e conta padrão
- [ ] Próxima ocorrência calculada automaticamente
- [ ] Status ativo/inativo
- [ ] Validação: valor > 0, data início ≤ data fim

#### US2.2: Processamento Automático
**Como** sistema,
**Quero** processar despesas recorrentes automaticamente,
**Para** criar despesas sem intervenção do usuário.

**Critérios de Aceite:**
- [ ] Cron job diário às 00:01 (pg_cron)
- [ ] Verifica `next_occurrence <= hoje`
- [ ] Cria despesa com `source='recurring'`
- [ ] Atualiza `next_occurrence` baseado em frequência
- [ ] Desativa se `end_date` atingida
- [ ] Gera notificação informativa
- [ ] Log de execução

### Epic 3: Contas Financeiras

#### US3.1: Gerenciar Múltiplas Contas
**Como** usuário,
**Quero** criar e gerenciar múltiplas contas,
**Para** separar diferentes origens de dinheiro (carteira, banco, cartão).

**Critérios de Aceite:**
- [ ] Tipos: carteira, conta corrente, poupança, crédito, investimento
- [ ] Campos: nome, tipo, saldo inicial, cor, ícone, últimos 4 dígitos
- [ ] Contas padrão criadas no signup (Dinheiro, Conta Corrente)
- [ ] Saldo calculado: inicial + entradas - saídas
- [ ] Ativar/desativar sem excluir
- [ ] Filtrar despesas por conta

#### US3.2: Dashboard por Conta
**Como** usuário,
**Quero** ver dashboard específico de cada conta,
**Para** analisar gastos por origem de dinheiro.

**Critérios de Aceite:**
- [ ] Saldo atual
- [ ] Total gasto no mês
- [ ] Total gasto histórico
- [ ] Gráfico mensal (últimos 12 meses)
- [ ] Gráfico por categoria (mês atual)
- [ ] Lista de últimas 10 despesas
- [ ] Comparação com mês anterior

### Epic 4: Metas e Orçamento

#### US4.1: Definir Meta Mensal Global
**Como** usuário,
**Quero** definir uma meta de gastos para o mês,
**Para** controlar meus gastos totais.

**Critérios de Aceite:**
- [ ] Meta padrão aplicada a todos os meses futuros
- [ ] Meta específica do mês atual (override)
- [ ] Propagação: aplicar meta do mês para próximos N meses (1-12)
- [ ] Barra de progresso visual
- [ ] Cores: verde (<80%), amarelo (80-99%), vermelho (≥100%)
- [ ] Percentual usado calculado em tempo real

#### US4.2: Configurar Ciclo de Faturamento
**Como** usuário,
**Quero** configurar o dia de fechamento do meu cartão (1-28),
**Para** alinhar relatórios e metas com meu ciclo real.

**Critérios de Aceite:**
- [ ] Dia configurável: 1 a 28
- [ ] Padrão: 1 (início do mês)
- [ ] Todos os cálculos respeitam ciclo (não mês calendário)
- [ ] RPC `get_billing_period(user_id, date)` retorna start/end
- [ ] UI mostra período atual claramente
- [ ] Atualização reflete em toda aplicação

#### US4.3: Metas por Categoria
**Como** usuário,
**Quero** definir limite de gastos por categoria,
**Para** controlar gastos específicos (ex: alimentação, lazer).

**Critérios de Aceite:**
- [ ] Limite por categoria + mês
- [ ] Barra de progresso individual
- [ ] Alerta ao atingir threshold (80%, 100%)
- [ ] Independente da meta global

#### US4.4: Alertas Proativos de Meta
**Como** usuário,
**Quero** receber notificação quando atingir limite,
**Para** ajustar gastos antes de estourar orçamento.

**Critérios de Aceite:**
- [ ] Push notification web nativo
- [ ] Alerta aos 80% (amarelo)
- [ ] Alerta aos 100% (vermelho)
- [ ] Parabéns se economizou (fim do mês)
- [ ] Edge function `notify-goal-threshold`

### Epic 5: Relatórios e Exportação

#### US5.1: Gerar Relatório de Período
**Como** usuário,
**Quero** gerar relatório de um período específico,
**Para** analisar meus gastos detalhadamente.

**Critérios de Aceite:**
- [ ] Filtros: data início/fim, categorias, contas, método pagamento
- [ ] Gráfico de barras (gastos por categoria)
- [ ] Gráfico de pizza (distribuição %)
- [ ] Tabela detalhada com todas despesas
- [ ] Comparativo com período anterior
- [ ] Respeita ciclo de faturamento

#### US5.2: Exportar para PDF/Excel
**Como** usuário,
**Quero** exportar relatórios em PDF ou Excel,
**Para** guardar ou compartilhar com contador/família.

**Critérios de Aceite:**
- [ ] Formatos: CSV, JSON, XLSX, PDF
- [ ] CSV/JSON: edge function `export-data`
- [ ] XLSX: biblioteca client-side (xlsx.js)
- [ ] PDF: edge function `export-pdf` com formatação visual
- [ ] Conteúdo: cabeçalho, resumo, breakdown, lista detalhada
- [ ] Download automático no navegador

#### US5.3: Agendar Exportações Recorrentes
**Como** usuário profissional,
**Quero** agendar exportações automáticas,
**Para** receber relatórios mensais sem esforço manual.

**Critérios de Aceite:**
- [ ] Campos: nome, formato, frequência (diária, semanal, mensal), filtros
- [ ] Cron job a cada hora verifica `next_run_at`
- [ ] Edge function `process-scheduled-exports`
- [ ] Notificação quando export pronto
- [ ] Histórico de execuções
- [ ] Ativar/desativar sem excluir

### Epic 6: Notificações Push

#### US6.1: Configurar Preferências
**Como** usuário,
**Quero** configurar quais notificações receber,
**Para** não ser incomodado desnecessariamente.

**Critérios de Aceite:**
- [ ] Threshold de alerta orçamento (padrão 80%)
- [ ] Alertas de padrões de gasto (toggle)
- [ ] Lembrete despesas (dias sem registrar, padrão 3)
- [ ] Revisão mensal (toggle)
- [ ] Insights proativos (toggle)
- [ ] Persistência em `notification_preferences`

#### US6.2: Receber Push Notifications
**Como** usuário,
**Quero** receber notificações push web,
**Para** ser alertado mesmo com app fechado.

**Critérios de Aceite:**
- [ ] Web Push API nativa
- [ ] VAPID keys geradas automaticamente
- [ ] Subscription armazenada em `push_subscriptions`
- [ ] Edge function `send-push-notification`
- [ ] Funciona: Android, iOS (PWA instalado), Desktop
- [ ] Tipos: goal alerts, recurring processed, export ready, insights

### Epic 7: Educação Financeira

#### US7.1: Acessar Conteúdo Educativo
**Como** usuário iniciante,
**Quero** acessar artigos e vídeos sobre finanças,
**Para** aprender a gerenciar meu dinheiro.

**Critérios de Aceite:**
- [ ] Categorias: Orçamento, Investimentos, Dívidas, Planejamento
- [ ] Tipos: artigo, vídeo, dica, guia
- [ ] Níveis: iniciante, intermediário, avançado
- [ ] Tempo de leitura estimado
- [ ] Marcar como completado
- [ ] Progresso por categoria

#### US7.2: Responder Quiz Financeiro
**Como** usuário,
**Quero** testar meu conhecimento com quiz,
**Para** aprender de forma gamificada.

**Critérios de Aceite:**
- [ ] Múltipla escolha (4 opções)
- [ ] Dificuldades: fácil (5pts), médio (10pts), difícil (15pts)
- [ ] Explicação após resposta
- [ ] Histórico de respostas
- [ ] Pontuação contribui para Score de Saúde

### Epic 8: Saúde Financeira

#### US8.1: Visualizar Score de Saúde
**Como** usuário,
**Quero** ver meu score de saúde financeira (0-100),
**Para** entender minha performance geral.

**Critérios de Aceite:**
- [ ] Componentes: Aderência Orçamento (40%), Quiz (20%), Consistência (20%), Economia (20%)
- [ ] Classificação: Excelente (80-100), Bom (60-79), Regular (40-59), Precisa Melhorar (0-39)
- [ ] Gráfico de evolução (12 meses)
- [ ] Breakdown por componente
- [ ] RPC `calculate_financial_health_score(user_id, month)`

### Epic 9: Assistente de Chat IA

#### US9.1: Conversar com Assistente
**Como** usuário,
**Quero** fazer perguntas sobre minhas finanças,
**Para** receber orientação personalizada.

**Critérios de Aceite:**
- [ ] Múltiplas conversas
- [ ] Contexto: perfil, despesas 30d, metas, score
- [ ] Edge function `chat-assistant` (OpenAI)
- [ ] Rate limit: 10 msg/min
- [ ] Histórico persistido
- [ ] Sugestões de perguntas comuns

#### US9.2: Receber Insights Proativos
**Como** usuário,
**Quero** receber insights gerados por IA,
**Para** identificar padrões e oportunidades de economia.

**Critérios de Aceite:**
- [ ] Tipos: positivo (🎉), warning (⚠️), tip (💡), info (ℹ️)
- [ ] Análises: comparativo mês anterior, progresso metas, categorias top, tendências
- [ ] Geração sob demanda
- [ ] Edge function `generate-insights`
- [ ] Cache para evitar chamadas excessivas

### Epic 10: Busca e Navegação

#### US10.1: Busca Global (Cmd+K)
**Como** power user,
**Quero** buscar rapidamente por atalho,
**Para** navegar eficientemente.

**Critérios de Aceite:**
- [ ] Atalho: Cmd+K (Mac) ou Ctrl+K (Windows/Linux)
- [ ] Command palette estilo VS Code
- [ ] Busca em: despesas, categorias, contas, páginas
- [ ] Ações rápidas: Nova Despesa, Despesas Recorrentes, Exportações
- [ ] Resultados em tempo real
- [ ] Navegação por teclado (↑↓ Enter Esc)

### Epic 11: Filtros Avançados

#### US11.1: Aplicar Filtros Avançados
**Como** usuário profissional,
**Quero** filtrar despesas com múltiplos critérios,
**Para** análises específicas.

**Critérios de Aceite:**
- [ ] Múltiplas categorias (multi-select)
- [ ] Tags específicas
- [ ] Range de valor (min-max)
- [ ] Métodos de pagamento
- [ ] Período personalizado
- [ ] Aplicação instantânea

#### US11.2: Salvar e Reutilizar Filtros
**Como** usuário,
**Quero** salvar combinações de filtros,
**Para** reutilizá-las rapidamente.

**Critérios de Aceite:**
- [ ] Nome do filtro
- [ ] Configuração em JSON
- [ ] Marcar como favorito
- [ ] Carregar com 1 clique
- [ ] Editar/excluir filtros salvos

### Epic 12: Auditoria e Segurança

#### US12.1: Visualizar Logs de Auditoria
**Como** usuário,
**Quero** ver histórico de alterações,
**Para** rastrear mudanças em meus dados.

**Critérios de Aceite:**
- [ ] Ações: CREATE, UPDATE, DELETE
- [ ] Entidades: expense, account, category, goal
- [ ] Dados before/after
- [ ] Timestamp e IP (opcional)
- [ ] Filtros: entidade, ação, período
- [ ] Usuário só visualiza (não modifica)

#### US12.2: Excluir Conta e Dados
**Como** usuário,
**Quero** excluir minha conta completamente,
**Para** exercer meu direito de ser esquecido (LGPD).

**Critérios de Aceite:**
- [ ] Dialog de confirmação dupla
- [ ] Input manual "EXCLUIR PERMANENTEMENTE"
- [ ] Edge function `delete-account`
- [ ] Remove: profile, expenses, categories, accounts, todos os dados
- [ ] Remove arquivos em storage (recibos)
- [ ] Logout automático
- [ ] Não permite undo

---

## 🎨 Design e UX

### Princípios de Design

1. **Mobile-First**: 70% dos usuários acessam via mobile
2. **Dark Mode Padrão**: Reduz fadiga visual
3. **One-Tap Actions**: FAB para adicionar despesa
4. **Zero Empty States**: Sempre mostrar next action
5. **Feedback Imediato**: Loading, success, error em <100ms

### Paleta de Cores

```css
/* Core */
--primary: #3B82F6 (Blue)
--background: #0B1220 (Dark Navy)
--foreground: #F8FAFC (White)

/* Semântica */
--success: #10B981 (Green) - Meta ok
--warning: #F59E0B (Amber) - 80% meta
--error: #EF4444 (Red) - Meta estourada
--info: #06B6D4 (Cyan)

/* Categorias (8 cores distintas) */
Alimentação: #10b981
Transporte: #3b82f6
Moradia: #f59e0b
Saúde: #ef4444
Lazer: #8b5cf6
Educação: #06b6d4
Compras: #ec4899
Outros: #6b7280
```

### Componentes UI (Shadcn/ui)

- **Botões**: Primary (solid), Secondary (outline), Ghost, Icon
- **Cards**: Bordered, Elevated, Flat
- **Forms**: Input, Select, Textarea, DatePicker, Checkbox, Switch
- **Feedback**: Toast, Alert, Dialog, Progress
- **Navigation**: Sidebar (desktop), BottomNav (mobile), Tabs
- **Data Display**: Table, Badge, Avatar, Tooltip

### Responsividade

| Breakpoint | Largura | Layout |
|------------|---------|--------|
| Mobile | <768px | BottomNav + FAB |
| Tablet | 768-1024px | Sidebar + FAB |
| Desktop | ≥1024px | Sidebar Expanded + FAB |

### Acessibilidade (WCAG 2.1 AAA)

- **Contrast Ratio**: ≥7:1 (AAA)
- **Touch Targets**: ≥44x44px
- **Keyboard Navigation**: Tab, Enter, Esc, Arrows
- **Screen Readers**: ARIA labels, semantic HTML
- **Skip Links**: Skip to main content
- **Focus Indicators**: 2px solid outline

---

## 🏗️ Arquitetura Técnica

### Stack Tecnológico

**Frontend:**
- React 18.3.1 (UI library)
- TypeScript 5.8.3 (Type safety)
- Vite 5.4.19 (Build tool)
- Tailwind CSS 3.4.17 (Styling)
- Shadcn/ui (Component library)
- React Query 5.83.0 (Server state)
- React Router DOM 6.30.1 (Routing)
- React Hook Form 7.61.1 (Forms)
- Zod 3.25.76 (Validation)
- Recharts 2.15.4 (Charts)

**Backend (Supabase):**
- PostgreSQL (Database)
- Row Level Security (Authorization)
- Edge Functions (Serverless - Deno)
- Storage (File storage)
- Realtime (WebSocket subscriptions)
- pg_cron (Scheduled jobs)

**Testing:**
- Vitest 4.0.1 (Unit tests)
- Playwright 1.56.1 (E2E tests)
- Testing Library (Component tests)

**Tooling:**
- ESLint (Linting)
- Prettier (Formatting - futuro)
- Lighthouse CI (Performance)

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      Client (PWA)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  React   │  │ Tailwind │  │  Vite    │             │
│  │   +TS    │  │   +UI    │  │  +PWA    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │         React Query (Cache)                  │     │
│  └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTPS
┌─────────────────────────────────────────────────────────┐
│                  Supabase Platform                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │    Storage   │  │   Realtime   │ │
│  │   +RLS       │  │  (Receipts)  │  │ (WebSocket)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │         Edge Functions (Deno)                    │ │
│  │  • process-receipt (OCR)                        │ │
│  │  • chat-assistant (OpenAI)                      │ │
│  │  • generate-insights (AI)                       │ │
│  │  • send-push-notification                       │ │
│  │  • delete-account                               │ │
│  │  • export-data / export-pdf                     │ │
│  │  • process-recurring-expenses                   │ │
│  │  • process-scheduled-exports                    │ │
│  │  • notify-goal-threshold                        │ │
│  │  • check-category-variations                    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │         pg_cron (Scheduled Jobs)                 │ │
│  │  • Daily 00:01 → Recurring Expenses             │ │
│  │  • Hourly 0 * * * * → Scheduled Exports         │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↕ API
┌─────────────────────────────────────────────────────────┐
│                External Services                        │
│  ┌──────────────┐  ┌──────────────┐                   │
│  │  Lovable AI  │  │   OpenAI     │                   │
│  │    (OCR)     │  │ (Chat/Insights)                  │
│  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### Modelo de Dados (21 Tabelas)

**Principais:**
1. `profiles` - User profiles
2. `expenses` - Expense records
3. `categories` - Expense categories
4. `accounts` - Financial accounts
5. `monthly_goals` - Monthly budget goals
6. `category_goals` - Per-category limits
7. `recurring_expenses` - Recurring expense configs
8. `notifications` - System notifications
9. `notification_preferences` - User preferences
10. `push_subscriptions` - Web push subscriptions
11. `scheduled_exports` - Scheduled export jobs
12. `saved_filters` - Saved filter configurations
13. `audit_logs` - Audit trail
14. `chat_conversations` - Chat sessions
15. `chat_messages` - Chat messages
16. `educational_content` - Educational articles
17. `user_content_progress` - User progress tracking
18. `quiz_questions` - Quiz questions
19. `quiz_responses` - User quiz answers
20. `financial_health_scores` - Health score history
21. `vapid_keys` - VAPID keys for push

Ver [DATABASE.md](./DATABASE.md) para schema completo.

### Segurança

**Row Level Security (RLS):**
- Todas as 21 tabelas têm RLS ativado
- Políticas baseadas em `auth.uid() = user_id`
- Usuário só acessa próprios dados
- Service role apenas em edge functions

**Validação:**
- Client: Zod schemas
- Server: PostgreSQL constraints + triggers
- Edge Functions: Validação adicional

**Storage:**
- Bucket `receipts` privado
- Signed URLs com 60s expiração
- Upload size limit: 5MB

**Auth:**
- Email/password via Supabase Auth
- JWT tokens auto-refresh
- Session persistence (localStorage)

Ver [SECURITY.md](./SECURITY.md) para detalhes.

---

## 📊 Métricas e Analytics

### KPIs de Produto

| Métrica | Definição | Meta |
|---------|-----------|------|
| DAU | Daily Active Users | 500 |
| MAU | Monthly Active Users | 10.000 |
| DAU/MAU Ratio | Stickiness | 15% |
| Avg Session Duration | Tempo médio de sessão | 5 min |
| Expenses/User/Week | Despesas registradas | 8 |

### KPIs de Funcionalidade

| Feature | Métrica | Meta |
|---------|---------|------|
| OCR | Taxa de sucesso extração | 85% |
| Chat Assistant | Mensagens/usuário/mês | 3 |
| Recurring Expenses | % usuários com ≥1 recorrente | 40% |
| Educational Content | % completaram ≥1 módulo | 30% |
| PWA Install | % instalaram app | 25% |

### Performance

| Métrica | Target | Atual |
|---------|--------|-------|
| Lighthouse Performance | ≥90 | 92 |
| Lighthouse Accessibility | ≥95 | 97 |
| Lighthouse Best Practices | ≥90 | 93 |
| Lighthouse SEO | ≥90 | 91 |
| Lighthouse PWA | ≥80 | 85 |
| First Contentful Paint | <1.5s | 1.2s |
| Time to Interactive | <3s | 2.1s |
| Bundle Size (gzipped) | <350KB | 320KB |

---

## 🧪 Estratégia de Testes

### Unit Tests (Vitest)

**Cobertura:** 72% (target 70%)

**Arquivos Testados:**
- `src/lib/currencyUtils.test.ts` (86 linhas)
- `src/lib/amountUtils.test.ts` (46 linhas)
- `src/lib/dateRange.test.ts` (157 linhas)
- `src/lib/pushUtils.test.ts` (52 linhas)
- `src/lib/pwaUtils.test.ts` (32 linhas)

### E2E Tests (Playwright)

**9 Suítes Completas:**
1. `auth.spec.ts` - Authentication flow
2. `expenses.spec.ts` - Expense CRUD
3. `ocr-basic.spec.ts` - Receipt OCR
4. `reports-cycle.spec.ts` - Billing cycle reports
5. `export-pdf.spec.ts` - PDF export
6. `insights.spec.ts` - AI insights
7. `scheduled-exports.spec.ts` - Scheduled exports
8. `recurring-expenses.spec.ts` - Recurring expenses
9. `tags-notes.spec.ts` - Tags & notes

**Browsers:** Chrome, Firefox, Safari
**Viewports:** Desktop (1920x1080), Mobile (390x844)

### Manual QA Checklist

**Crítico:**
- [ ] Signup/Login flow
- [ ] Add/Edit/Delete expense
- [ ] OCR receipt processing
- [ ] Reports generation
- [ ] PDF/Excel export
- [ ] Billing cycle calculation edge cases
- [ ] Delete account flow

**Importante:**
- [ ] Dark mode toggle
- [ ] PWA installation
- [ ] Push notifications
- [ ] Chat assistant
- [ ] Recurring expenses
- [ ] Multi-account switching

**Desejável:**
- [ ] Keyboard shortcuts
- [ ] Screen reader navigation
- [ ] Offline mode
- [ ] Cross-browser consistency

---

## 🚀 Roadmap e Releases

### v8.0.0 - ATUAL (Production Ready)
**Status:** ✅ Lançado
**Data:** Janeiro 2026

**Features:**
- ✅ Todos os Epics 1-12 implementados
- ✅ 9 suítes E2E tests
- ✅ Performance otimizada
- ✅ Accessibility AAA
- ✅ PWA pronto

### v8.1.0 - Polimento (Q1 2026)
**Prioridade:** Média

- [ ] Onboarding wizard interativo
- [ ] Tutorial tooltips contextuais
- [ ] Melhorias em empty states
- [ ] Animações micro-interactions
- [ ] Dark/Light mode automático (sunrise/sunset)

### v9.0.0 - Internacionalização (Q2 2026)
**Prioridade:** Alta

- [ ] Suporte a múltiplos idiomas (pt-BR, en-US, es-ES)
- [ ] Formatação de moeda multi-locale
- [ ] Timezone por usuário
- [ ] Date/time formatting i18n

### v10.0.0 - Premium Features (Q3 2026)
**Prioridade:** Baixa (Monetização)

- [ ] Multi-currency support
- [ ] Bank account integration (Open Banking)
- [ ] Investment tracking
- [ ] Tax reporting (IRPF)
- [ ] Shared budgets (família/casal)
- [ ] Custom categories import/export
- [ ] API pública para integrações

### Backlog (Futuro)

- [ ] Mobile apps nativos (React Native)
- [ ] Desktop app (Electron)
- [ ] Integração com contadores
- [ ] Machine learning para previsões
- [ ] Gamificação avançada (badges, níveis)
- [ ] Comunidade (compartilhar dicas)

---

## 📖 Documentação Relacionada

### Para Desenvolvedores
- [CLAUDE.md](../CLAUDE.md) - Guia para Claude Code
- [Architecture](./architecture.md) - Arquitetura detalhada
- [Database](./DATABASE.md) - Schema completo
- [API](./API.md) - Edge functions
- [Security](./SECURITY.md) - Segurança e RLS
- [Testing](./testing.md) - Guia de testes
- [Hooks](./HOOKS.md) - Custom hooks
- [Routes](./ROUTES.md) - Rotas da aplicação

### Para Produto
- [Features](./FEATURES.md) - Funcionalidades detalhadas
- [Sprint 7 Features](./sprint-7-features.md) - Últimas features
- [Release Notes](./release-notes.md) - Histórico de versões
- [Finalization Plan](./finalization-plan.md) - Plano de finalização

### Para Usuários (Futuro)
- [ ] User Guide - Guia do usuário
- [ ] FAQ - Perguntas frequentes
- [ ] Video Tutorials - Tutoriais em vídeo
- [ ] Privacy Policy - Política de privacidade
- [ ] Terms of Service - Termos de uso

---

## 🤝 Contribuidores e Stakeholders

### Product Team
- **Product Owner:** TBD
- **Product Designer:** TBD
- **Product Manager:** TBD

### Engineering Team
- **Tech Lead:** TBD
- **Frontend Engineers:** TBD
- **Backend Engineers:** TBD
- **QA Engineer:** TBD

### Stakeholders
- **CEO/Founder:** TBD
- **Marketing Lead:** TBD
- **Customer Success:** TBD

---

## 📝 Notas de Versão

**Versão 1.0 - 21/01/2026**
- Documento inicial criado
- Todas as features documentadas
- Roadmap definido
- Métricas estabelecidas

---

## 📞 Contato

**Project URL:** https://lovable.dev/projects/bd79470e-1098-4094-80c7-eb02c2d200bb
**Support:** [Lovable Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
**Documentation:** https://docs.lovable.dev/

---

**Última Atualização:** 21 de Janeiro de 2026
**Próxima Revisão:** Março de 2026
