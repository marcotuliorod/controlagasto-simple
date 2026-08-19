# 🪝 Custom Hooks

Documentação de todos os hooks customizados disponíveis.

---

## 📋 Índice

| Categoria | Hooks |
|-----------|-------|
| Dados do Usuário | useProfile, useAccounts, useBillingCycle |
| Despesas | useExpensesRealtime, useRecurringExpenses |
| Metas | useGoals, useCategoryGoals |
| Insights | useInsights, useContextualInsight |
| Notificações | useNotifications, usePushNotifications |
| Educação | useEducationalContent, useQuiz |
| Outros | useChatAssistant, useFinancialHealthScore, useAuditLogs |
| Utilitários | useSavedFilters, useScheduledExports, useUndoableAction |
| UI | useMobile, useReducedMotion |

---

## 👤 Dados do Usuário

### useProfile

Gerencia o perfil do usuário.

```typescript
const {
  profile,           // Profile | null
  isLoading,         // boolean
  updateProfile,     // (data: Partial<Profile>) => Promise<void>
} = useProfile();
```

**Campos do Profile:**
- `id`: UUID
- `name`: string
- `monthly_goal`: number
- `billing_cycle_day`: number (1-28)

---

### useAccounts

Gerencia contas financeiras.

```typescript
const {
  accounts,          // Account[]
  isLoading,         // boolean
  createAccount,     // (data: CreateAccount) => Promise<void>
  updateAccount,     // (id: string, data: Partial<Account>) => Promise<void>
  deleteAccount,     // (id: string) => Promise<void>
} = useAccounts();
```

**Campos do Account:**
- `id`, `user_id`, `name`, `type`
- `initial_balance`, `icon`, `color`
- `last4`, `is_active`

---

### useBillingCycle

Calcula períodos baseados no ciclo de faturamento.

```typescript
const {
  startDate,         // Date
  endDate,           // Date
  cycleDay,          // number
  isLoading,         // boolean
  getCurrentPeriod,  // () => { start: Date, end: Date }
  getMonthPeriod,    // (date: Date) => { start: Date, end: Date }
} = useBillingCycle();
```

---

## 💰 Despesas

### useExpensesRealtime

Lista despesas com suporte a realtime.

```typescript
const {
  expenses,          // Expense[]
  isLoading,         // boolean
  createExpense,     // (data: CreateExpense) => Promise<void>
  updateExpense,     // (id: string, data: Partial<Expense>) => Promise<void>
  deleteExpense,     // (id: string) => Promise<void>
} = useExpensesRealtime({
  startDate,         // Date (opcional)
  endDate,           // Date (opcional)
  categoryId,        // string (opcional)
  accountId,         // string (opcional)
});
```

**Realtime:** Atualiza automaticamente via Supabase Realtime.

---

### useRecurringExpenses

Gerencia despesas recorrentes.

```typescript
const {
  recurringExpenses, // RecurringExpense[]
  isLoading,         // boolean
  createRecurring,   // (data: CreateRecurring) => Promise<void>
  updateRecurring,   // (id: string, data: Partial<Recurring>) => Promise<void>
  deleteRecurring,   // (id: string) => Promise<void>
  toggleActive,      // (id: string, active: boolean) => Promise<void>
} = useRecurringExpenses();
```

---

## 🎯 Metas

### useGoals

Gerencia metas mensais globais.

```typescript
const {
  currentGoal,       // MonthlyGoal | null
  goals,             // MonthlyGoal[]
  isLoading,         // boolean
  setGoal,           // (month: string, limit: number) => Promise<void>
  propagateGoal,     // (limit: number, months: string[]) => Promise<void>
} = useGoals();
```

---

### useCategoryGoals

Gerencia metas por categoria.

```typescript
const {
  categoryGoals,     // CategoryGoal[]
  isLoading,         // boolean
  setCategoryGoal,   // (categoryId: string, month: string, limit: number) => Promise<void>
  deleteCategoryGoal,// (id: string) => Promise<void>
  getGoalByCategory, // (categoryId: string, month: string) => CategoryGoal | null
} = useCategoryGoals();
```

---

## 💡 Insights

### useInsights

Gera insights personalizados via IA.

```typescript
const {
  insights,          // Insight[]
  isLoading,         // boolean
  isGenerating,      // boolean
  generateInsights,  // () => Promise<void>
  context,           // InsightContext
} = useInsights();
```

**Tipos de Insight:**
- `positive`: Conquistas
- `warning`: Alertas
- `tip`: Dicas
- `info`: Informações

---

### useContextualInsight

Insight contextual baseado na página atual.

```typescript
const {
  insight,           // string | null
  isLoading,         // boolean
} = useContextualInsight(context: 'dashboard' | 'expenses' | 'reports');
```

---

## 🔔 Notificações

### useNotifications

Gerencia notificações do sistema.

```typescript
const {
  notifications,     // Notification[]
  unreadCount,       // number
  isLoading,         // boolean
  markAsRead,        // (id: string) => Promise<void>
  markAllAsRead,     // () => Promise<void>
  deleteNotification,// (id: string) => Promise<void>
} = useNotifications();
```

---

### usePushNotifications

Gerencia Push Notifications.

```typescript
const {
  isSupported,       // boolean
  isSubscribed,      // boolean
  isLoading,         // boolean
  subscription,      // PushSubscription | null
  subscribe,         // () => Promise<void>
  unsubscribe,       // () => Promise<void>
} = usePushNotifications();
```

---

## 📚 Educação

### useEducationalContent

Acessa conteúdo educativo.

```typescript
const {
  content,           // EducationalContent[]
  progress,          // UserProgress[]
  isLoading,         // boolean
  markComplete,      // (contentId: string) => Promise<void>
  getByCategory,     // (category: string) => EducationalContent[]
  getByLevel,        // (level: string) => EducationalContent[]
} = useEducationalContent();
```

---

### useQuiz

Gerencia quiz financeiro.

```typescript
const {
  questions,         // QuizQuestion[]
  responses,         // QuizResponse[]
  isLoading,         // boolean
  submitAnswer,      // (questionId: string, answer: string) => Promise<boolean>
  getNextQuestion,   // () => QuizQuestion | null
  stats,             // { correct: number, total: number, points: number }
} = useQuiz();
```

---

## 🤖 Outros

### useChatAssistant

Interface com o chat IA.

```typescript
const {
  conversations,     // Conversation[]
  currentConversation, // Conversation | null
  messages,          // Message[]
  isLoading,         // boolean
  isSending,         // boolean
  sendMessage,       // (message: string) => Promise<void>
  createConversation,// () => Promise<string>
  loadConversation,  // (id: string) => Promise<void>
} = useChatAssistant();
```

---

### useFinancialHealthScore

Calcula score de saúde financeira.

```typescript
const {
  currentScore,      // FinancialHealthScore | null
  history,           // FinancialHealthScore[]
  isLoading,         // boolean
  calculateScore,    // (month: string) => Promise<number>
} = useFinancialHealthScore();
```

**Componentes do Score:**
- `budget_adherence_score` (0-40)
- `quiz_performance_score` (0-20)
- `consistency_score` (0-20)
- `savings_score` (0-20)

---

### useAuditLogs

Acessa logs de auditoria.

```typescript
const {
  logs,              // AuditLog[]
  isLoading,         // boolean
  filters,           // AuditFilters
  setFilters,        // (filters: AuditFilters) => void
} = useAuditLogs();
```

**Filtros:**
- `entity`: expense | account | category | goal
- `action`: CREATE | UPDATE | DELETE
- `startDate`, `endDate`

---

## 🔧 Utilitários

### useSavedFilters

Gerencia filtros salvos.

```typescript
const {
  savedFilters,      // SavedFilter[]
  isLoading,         // boolean
  saveFilter,        // (name: string, filters: any) => Promise<void>
  deleteFilter,      // (id: string) => Promise<void>
  toggleFavorite,    // (id: string) => Promise<void>
} = useSavedFilters();
```

---

### useScheduledExports

Gerencia exportações agendadas.

```typescript
const {
  scheduledExports,  // ScheduledExport[]
  isLoading,         // boolean
  createExport,      // (data: CreateExport) => Promise<void>
  updateExport,      // (id: string, data: Partial<Export>) => Promise<void>
  deleteExport,      // (id: string) => Promise<void>
  toggleActive,      // (id: string, active: boolean) => Promise<void>
} = useScheduledExports();
```

---

### useUndoableAction

Suporte a desfazer ações.

```typescript
const {
  execute,           // (action: () => Promise<void>, undo: () => Promise<void>) => void
  canUndo,           // boolean
  undo,              // () => Promise<void>
} = useUndoableAction();
```

**Uso:**
```typescript
execute(
  () => deleteExpense(id),
  () => restoreExpense(expense)
);
```

---

## 📱 UI

### useMobile

Detecta dispositivo mobile.

```typescript
const isMobile = useMobile();
// true se largura < 768px
```

---

### useReducedMotion

Respeita preferência de movimento reduzido.

```typescript
const prefersReducedMotion = useReducedMotion();
// true se usuário prefere menos animações
```

---

## 🔗 Links Relacionados

- [Funcionalidades](./FEATURES.md)
- [Rotas](./ROUTES.md)
- [Modelo de Dados](./DATABASE.md)
