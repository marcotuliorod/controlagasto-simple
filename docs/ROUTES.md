# 🛣️ Rotas da Aplicação

Documentação de todas as rotas disponíveis.

---

## 📋 Visão Geral

| Tipo | Quantidade |
|------|------------|
| Públicas | 4 |
| Autenticadas | 18 |
| **Total** | 22 |

---

## 🌐 Rotas Públicas

Acessíveis sem autenticação.

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/` | `Index` | Landing page |
| `/auth` | `Auth` | Login e cadastro |
| `/privacy` | `Privacy` | Política de privacidade |
| `/terms` | `Terms` | Termos de uso |

### Detalhes

#### `/` - Landing Page
- Apresentação do aplicativo
- Botão para login/cadastro
- Redireciona para `/dashboard` se autenticado

#### `/auth` - Autenticação
- Tabs: Login / Cadastro
- Campos: Email, Senha, Nome (cadastro)
- Redireciona para `/onboarding` após cadastro
- Redireciona para `/dashboard` após login

---

## 🔐 Rotas Autenticadas

Requerem login. Protegidas por `RequireOnboarding`.

### Dashboard e Principal

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/dashboard` | `Dashboard` | Painel principal |
| `/onboarding` | `Onboarding` | Configuração inicial |

#### `/dashboard`
- Saudação personalizada
- Resumo de gastos do período
- Barra de progresso da meta
- Últimas despesas
- Insights contextuais
- Notificações
- Acesso rápido às principais funções

#### `/onboarding`
- Nome do usuário
- Meta mensal inicial
- Dia do ciclo de faturamento
- Exibido apenas na primeira visita

---

### Despesas

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/add-expense` | `AddExpense` | Nova despesa |
| `/expenses` | `ExpensesVirtualized` | Lista de despesas |
| `/expenses/:id/edit` | `EditExpense` | Editar despesa |
| `/recurring-expenses` | `RecurringExpenses` | Despesas recorrentes |

#### `/add-expense`
- Formulário completo de despesa
- Suporte a OCR de recibos
- Sugestão automática de categoria
- Quick picker de categorias

#### `/expenses`
- Lista virtualizada (performance)
- Filtros avançados
- Busca por texto
- Ordenação

#### `/expenses/:id/edit`
- Formulário preenchido
- Todos os campos editáveis
- Botão de exclusão

#### `/recurring-expenses`
- Lista de recorrentes
- Toggle ativo/inativo
- Próxima ocorrência
- Criar/Editar/Excluir

---

### Contas

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/accounts` | `Accounts` | Lista de contas |
| `/accounts/:accountId` | `AccountDashboard` | Dashboard da conta |

#### `/accounts`
- Cards de contas
- Saldo calculado
- Criar nova conta
- Editar/Desativar

#### `/accounts/:accountId`
- Saldo e histórico
- Gráfico de gastos
- Transações recentes
- Comparativo mensal

---

### Relatórios e Exportação

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/reports` | `Reports` | Relatórios e gráficos |
| `/scheduled-exports` | `ScheduledExports` | Exportações agendadas |

#### `/reports`
- Seletor de período
- Gráfico de barras por categoria
- Gráfico de pizza (distribuição)
- Tabela detalhada
- Exportar: CSV, JSON, XLSX, PDF

#### `/scheduled-exports`
- Lista de agendamentos
- Criar novo agendamento
- Frequência: diária, semanal, mensal
- Ativar/Desativar

---

### Educação e Quiz

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/education` | `Education` | Conteúdo educativo |
| `/quiz` | `Quiz` | Quiz financeiro |

#### `/education`
- Tabs por categoria
- Cards de conteúdo
- Filtro por nível
- Progresso do usuário

#### `/quiz`
- Pergunta atual
- Opções de resposta
- Feedback imediato
- Pontuação acumulada

---

### Saúde Financeira e Simuladores

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/financial-health` | `FinancialHealth` | Score de saúde |
| `/simulator` | `Simulator` | Calculadoras |

#### `/financial-health`
- Score atual (0-100)
- Breakdown por componente
- Gráfico de evolução
- Dicas de melhoria

#### `/simulator`
- Tabs: Juros Compostos, Financiamento, Investimentos
- Inputs numéricos
- Resultados em tempo real
- Gráficos de projeção

---

### Comunicação

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/chat` | `ChatAssistant` | Chat com IA |

#### `/chat`
- Lista de conversas
- Chat em tempo real
- Sugestões de perguntas
- Histórico preservado

---

### Configurações

| Rota | Componente | Descrição |
|------|------------|-----------|
| `/settings` | `Settings` | Configurações gerais |
| `/notification-settings` | `NotificationSettings` | Preferências de notificação |
| `/audit-logs` | `AuditLogs` | Logs de auditoria |
| `/account/profile` | `AccountProfile` | Perfil do usuário |
| `/account/delete` | `DeleteAccount` | Excluir conta |

#### `/settings`
- Perfil básico
- Tema claro/escuro
- Links para outras configs
- Instalar PWA
- Logout

#### `/notification-settings`
- Threshold de alerta (%)
- Alertas de variação
- Lembrete de registro
- Revisão mensal
- Insights proativos

#### `/audit-logs`
- Lista de ações
- Filtro por entidade
- Filtro por ação
- Período

#### `/account/profile`
- Editar nome
- Editar meta
- Editar ciclo

#### `/account/delete`
- Confirmação por texto
- Aviso de exclusão permanente

---

## 🧩 Componentes de Rota

### RequireOnboarding

Wrapper que verifica:
1. Usuário está autenticado?
2. Usuário completou onboarding?

```typescript
<Route element={<RequireOnboarding />}>
  <Route path="/dashboard" element={<Dashboard />} />
  // ... outras rotas protegidas
</Route>
```

### AppLayout

Layout padrão com:
- Header com menu
- Sidebar (desktop)
- Bottom navigation (mobile)
- Área de conteúdo

---

## 🔄 Navegação

### Desktop
- Sidebar fixa à esquerda
- Breadcrumbs no topo
- Links diretos

### Mobile
- Bottom navigation (5 itens principais)
- Menu hamburger para outras opções
- Gestos de swipe

### Atalhos
| Atalho | Ação |
|--------|------|
| `Ctrl+K` / `Cmd+K` | Busca global |
| `Ctrl+N` | Nova despesa |

---

## 📊 Estrutura de Rotas

```typescript
<Routes>
  {/* Públicas */}
  <Route path="/" element={<Index />} />
  <Route path="/auth" element={<Auth />} />
  <Route path="/privacy" element={<Privacy />} />
  <Route path="/terms" element={<Terms />} />

  {/* Autenticadas */}
  <Route element={<RequireOnboarding />}>
    <Route element={<AppLayout />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/add-expense" element={<AddExpense />} />
      <Route path="/expenses" element={<ExpensesVirtualized />} />
      <Route path="/expenses/:id/edit" element={<EditExpense />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/education" element={<Education />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/financial-health" element={<FinancialHealth />} />
      <Route path="/simulator" element={<Simulator />} />
      <Route path="/chat" element={<ChatAssistant />} />
      <Route path="/accounts" element={<Accounts />} />
      <Route path="/accounts/:accountId" element={<AccountDashboard />} />
      <Route path="/audit-logs" element={<AuditLogs />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/scheduled-exports" element={<ScheduledExports />} />
      <Route path="/notification-settings" element={<NotificationSettings />} />
      <Route path="/recurring-expenses" element={<RecurringExpenses />} />
      <Route path="/account/profile" element={<AccountProfile />} />
      <Route path="/account/delete" element={<DeleteAccount />} />
    </Route>
    <Route path="/onboarding" element={<Onboarding />} />
  </Route>

  {/* 404 */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## 🔗 Links Relacionados

- [Funcionalidades](./FEATURES.md)
- [Custom Hooks](./HOOKS.md)
- [Segurança](./SECURITY.md)
