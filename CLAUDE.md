# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
npm run dev              # Start dev server (http://localhost:8080)
npm run build           # Production build with type checking
npm run build:dev       # Development build (for testing)
npm run preview         # Preview production build locally
npm run lint            # Run ESLint
```

### Testing
```bash
# Unit Tests (Vitest)
npm test                # Run tests in watch mode
npm run test -- --run   # Run tests once (CI mode)
npm run test:ui         # Open Vitest UI

# E2E Tests (Playwright)
npm run test:e2e        # Run all E2E tests (headless)
npm run test:e2e:headed # Run with browser visible
npm run test:e2e:ui     # Open Playwright UI
npm run test:e2e:debug  # Debug mode

# Run specific E2E test file
npx playwright test e2e/auth.spec.ts
```

### Bundle Analysis
```bash
ANALYZE=true npm run build  # Generate bundle size report at dist/stats.html
```

### Supabase CLI (if needed locally)
```bash
# Install: npm i supabase --save-dev
npx supabase start        # Start local Supabase
npx supabase db reset     # Reset local database
# Local (stack do `supabase start`):
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
# Remoto: use o ref do SEU projeto, não deixe fixo aqui.
npx supabase gen types typescript --project-id <project-ref> > src/integrations/supabase/types.ts
```

## Architecture Overview

### Application Entry & Structure

**Entry Point:** `src/main.tsx` registers the PWA service worker and mounts the React app.

**Provider Hierarchy in `src/App.tsx`:**
```
QueryClientProvider (5min stale time, no window focus refetch)
  └─ ThemeProvider (dark mode via next-themes)
      └─ TooltipProvider
          └─ PWAInstallProvider
              └─ BrowserRouter
                  └─ Routes (lazy loaded)
```

**Route Guards:**
- Public routes: `/`, `/auth`, `/privacy`, `/terms`
- Onboarding: `/onboarding` (requires initial setup)
- Authenticated routes: All others (wrapped in `<AppLayout>`)

**Layout:** All authenticated pages use `<AppLayout>` which provides:
- `<AppSidebar>` (desktop navigation)
- `<BottomNav>` (mobile navigation)
- `<GlobalSearch>` (Cmd+K command palette)

**Não existe lançamento manual de despesa.** Gastos entram exclusivamente pela
importação de extrato/fatura (`/import-transactions`). A rota `/add-expense`
sobrevive só como redirect para lá, por causa de link antigo e shell de PWA já
instalado. Ao criar tela ou CTA de "adicionar gasto", aponte para a importação —
o formulário manual, o FAB, o drawer rápido e o OCR de cupom foram removidos.

### Critical Architectural Patterns

#### 1. Billing Cycle System
**Unlike typical calendar month apps, this uses configurable billing cycles (1-28 day of month).**

- Users configure `billing_cycle_day` in their profile (default: 1)
- Hook: `useBillingCycle()` provides `getCurrentCycle()`, `getDateCycle(date)`, `getCycleRange(months)`
- All reports, budgets, and goals respect billing cycles via `get_billing_period()` RPC function
- Database function: `get_billing_period(user_id, reference_date)` returns `{start_date, end_date}`
- **When querying expenses by period, ALWAYS use billing cycle dates, not calendar months**

Example:
```typescript
const { getCurrentCycle } = useBillingCycle();
const { start, end } = getCurrentCycle();

// Correct: Query by billing cycle
supabase.from("expenses")
  .gte("date", start)
  .lt("date", end);

// Wrong: Don't use calendar months
// .gte("date", startOfMonth(new Date()))
```

#### 2. Supabase Integration Patterns

**Client Setup:** `src/integrations/supabase/client.ts`
- Auto-refresh tokens enabled
- Persistent sessions via localStorage
- Types imported from auto-generated `types.ts`

**Query Pattern (React Query):**
```typescript
// Read data
const { data } = useQuery({
  queryKey: ["expenses", filters],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("id, amount, date, categories(name)")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data;
  }
});

// Write data (mutation)
const mutation = useMutation({
  mutationFn: async (expense) => {
    const { error } = await supabase.from("expenses").insert(expense);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    toast({ title: "Expense added" });
  }
});
```

**Real-time Subscriptions:**
Use the `useExpensesRealtime()` hook for live updates:
```typescript
useExpensesRealtime({
  channelName: "dashboard-expenses",
  onUpdate: () => refetch(),
  enabled: true
});
```

**Important:** Always use `mounted` ref pattern to prevent WebSocket errors on unmount.

#### 3. Form Handling

**Stack:** React Hook Form + Zod validation — onde existe schema. Nem todo
formulário do app segue isso: `RecurringExpenses.tsx` e `EditExpense.tsx` usam
`useState` + `required` nativo do HTML. Ao mexer num deles, confira antes o que
o arquivo realmente usa.

**Pattern:**
1. Define schema in `src/schemas/*.ts`
2. Use `@hookform/resolvers/zod` for validation
3. Handle currency formatting with `src/lib/currencyUtils.ts`

Exemplo real, de `src/pages/AccountProfile.tsx` (único consumidor de Zod hoje):
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileFormSchema, type ProfileFormData } from "@/schemas/profileSchema";

const profileForm = useForm<ProfileFormData>({
  resolver: zodResolver(profileFormSchema),
  defaultValues: { name: "" },
});

const onSubmit = profileForm.handleSubmit(async (values) => {
  // values are type-safe and validated
});
```

**Currency Formatting:**
- Always use `parseCurrencyBR(string)` from `currencyUtils.ts` to convert display -> database
- Use `formatCurrencyBR(number)` for database -> display
- Format: R$ 1.234,56 (Brazilian Real with dot thousands, comma decimal)

#### 4. Edge Functions

**Location:** `supabase/functions/*/index.ts`

**Available Functions:**
- `chat-assistant` - AI financial advice (conversa + persistência em `chat_messages`)
- `process-import-file` - Bank statement import (CSV/OFX determinístico; PDF em camadas)
- `generate-insights` - AI-powered spending analysis
- `delete-account` - Full user data purge
- `send-push-notification` - Web push delivery
- `get-vapid-public-key` - VAPID key for push subscriptions
- `notify-goal-threshold` - Budget alerts when spending exceeds goals
- `process-recurring-expenses` - Auto-generate recurring transactions
- `process-scheduled-exports` - Execute scheduled data exports
- `export-data` - Generate Excel exports
- `export-pdf` - Generate PDF reports
- `check-category-variations` - Smart categorization suggestions
- `generate-insights` - AI-powered spending analysis

**Calling Edge Functions:**
```typescript
const { data, error } = await supabase.functions.invoke("process-import-file", {
  body: { fileContent, fileName }
});
```

**Auth Pattern in Edge Functions:**
```typescript
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Não autorizado' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabaseClient.auth.getUser(token);
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Token inválido' }), {
    status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```
**Do this before any paid/expensive work** (AI API calls, etc.). O bug histórico que motivou a regra: `process-receipt` só checava se o header era não-vazio e nunca olhava `error`/`!user`, deixando chamador sem autenticação queimar crédito de OCR. Aquela função não existe mais, mas a regra vale para toda function que chame IA — hoje `process-import-file`, `chat-assistant` e `generate-insights`.

**Cron-triggered functions** (`notify-goal-threshold`, `process-recurring-expenses`, `process-scheduled-exports`) use a different, correct pattern instead — no end user to authenticate, so they compare an `X-Cron-Secret` header against `Deno.env.get('CRON_SECRET')`.

#### 5. AI Service (`services/ai`)

Camada de IA **provider-agnostic**, num serviço Node/TS separado. Nenhum código
do app fala com fornecedor de IA diretamente.

```
services/ai/src/
  domain/      # capacidades; conhecem só a interface LLMProvider
  providers/   # adapters concretos — toda diferença entre fornecedores mora aqui
  prompts/     # prompts versionados
  shared/      # timeout, retry, taxonomia de erro, redação de PII
  config.ts    # ÚNICO lugar que escolhe o adapter (AI_PROVIDER)
```

Regra: nada em `domain/` importa de `providers/` além de `providers/types.ts`.

**Ao mexer em IA:**
- Adicionar fornecedor = novo arquivo em `providers/` + caso em `config.ts`.
  Não toque em `domain/`.
- Prompts ficam em `prompts/`, não embutidos no código de transporte.
- Erro de fornecedor vira `AIError`; só `publicMessage` pode chegar ao usuário
  (nunca cite fornecedor, cota ou billing).
- Teste com `providers/fake.ts` — o domínio inteiro roda sem rede e sem chave.
- **Prefira determinístico.** O import de extrato lê o PDF localmente e só
  chama IA se a regra não reconhecer o layout
  (`supabase/functions/_shared/statementParser.ts`).

Edge functions chamam o serviço via `supabase/functions/_shared/aiService.ts`,
repassando o JWT do usuário. Requer o secret `AI_SERVICE_URL`.

Ver `services/ai/README.md` e `docs/LGPD-IA.md`.

#### 6. Testing Patterns

**Unit Tests:** Place tests next to source files with `.test.ts` suffix
- Test utilities: `src/lib/*.test.ts`
- Test hooks: `src/hooks/*.test.ts`
- Use `describe`, `it`/`test`, `expect` from Vitest
- Mock Supabase with `vi.mock()`

**E2E Tests:** Place in `/e2e/*.spec.ts`
- Use Page Object Model pattern
- Shared utilities in `e2e/fixtures/test-data.ts`
- Always call `waitForPageLoad(page)` after navigation
- Use `page.getByRole()` for accessibility-first selectors
- Timeout: 15s for navigation assertions

**E2E Test Suites:**
1. Authentication flow (`auth.spec.ts`)
2. Expense list & edit (`expense-crud.spec.ts`) — criação saiu com o lançamento manual
3. Reports with billing cycle (`reports-cycle.spec.ts`)
4. PDF/CSV/XLSX export (`export-pdf.spec.ts`)
5. AI insights (`insights.spec.ts`)
6. Scheduled exports (`scheduled-exports.spec.ts`)
7. Recurring expenses (`recurring-expenses.spec.ts`)

Fora da lista: `auth.setup.ts` não é suíte, é o projeto `setup` do
`playwright.config.ts` — cria a conta e grava o `storageState` que todas as
outras usam. Todo projeto de browser depende dele.

**Lacuna conhecida:** a importação de extrato/fatura é a única porta de entrada
de gasto e **não tem spec**. Ao mexer em `ImportTransactions.tsx`,
`useImportTransactions.ts` ou `components/import/*`, não conte com rede de
proteção E2E.

### Data Model Key Points

**Multi-Account Support:**
- Users can have multiple `accounts` (Wallet, Bank, Credit Card, etc.)
- Expenses are linked to accounts via `account_id`
- Account dashboard available at `/accounts/:accountId`

**Transfer Detection:**
- Expenses with `is_transfer=true` are internal transfers between accounts
- Don't count towards spending analysis or budget calculations
- Paired transfers have `transfer_pair_id` linking them

**Recurring Expenses:**
- Defined in `recurring_expenses` table with frequency (daily, weekly, monthly, yearly)
- Auto-generated by `process-recurring-expenses` edge function (cron job)
- Created as regular expenses with `recurring_expense_id` linking back

**Audit Logs:**
- All changes tracked in `audit_logs` table
- Automatic via database triggers
- Fields: `table_name`, `record_id`, `action`, `old_data`, `new_data`

**Category Goals:**
- Monthly budget limits per category
- Stored in `category_goals` with `month` and `limit`
- Checked via edge function on expense creation
- Push notification sent when threshold exceeded

**Financial Health Score:**
- Calculated monthly via `calculate_financial_health_score()` RPC
- Components: budget_adherence, savings_rate, expense_consistency
- Stored in `financial_health_scores` table

### Environment Variables

**Required `.env` variables:**
```bash
# As duas únicas lidas por src/ (import.meta.env).
VITE_SUPABASE_URL=<url do projeto ou http://127.0.0.1:54321 em local>
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable/anon key>
```

Não fixe o ref de um projeto específico aqui: o app deve funcionar apontando
para qualquer instância (self-host, local, gerenciado).

**Note:** `npx supabase start` imprime esses valores para desenvolvimento local
(ver `.env.example`). `src/integrations/supabase/client.ts` falha no boot com
mensagem explícita se alguma faltar.

**Edge Functions** usam secrets próprios (`supabase secrets set`), não o `.env`
do frontend: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` e `AI_SERVICE_URL`
(endereço do serviço em `services/ai`).

### Path Aliases

Import paths use `@/` alias:
```typescript
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/currencyUtils";
import { useGoals } from "@/hooks/useGoals";
```

Configured in `tsconfig.json` and `vite.config.ts`.

### PWA & Offline Support

**Service Worker:** `public/sw.js`
- Uses Workbox for caching strategies
- 5MB max cache size
- Includes offline fallback page
- Auto-update prompts configured in `main.tsx`

**Install Detection:**
- Hook: `usePWAInstall()` from `src/providers/PWAInstallProvider.tsx`
- Shows install prompt via `<InstallPWA>` component

**Push Notifications:**
- VAPID keys stored in `vapid_keys` table
- Subscriptions in `push_subscriptions` table
- Hook: `usePushNotifications()` manages subscription lifecycle
- Test utility: `testPushNotification()` for debugging

### Performance Considerations

**Virtualization:**
- Large expense lists use `@tanstack/react-virtual` in `ExpensesVirtualized.tsx`
- Renders only visible rows for 1000+ items

**Code Splitting:**
- All pages lazy loaded via `React.lazy()`
- Suspense boundaries with loading states

**Query Optimization:**
- Select only needed fields: `.select("id, amount, date")`
- Use indexes (check `supabase/migrations/` for index definitions)
- Paginate with `.range(start, end)` for large datasets

**Bundle Size:**
- Target: <350KB gzipped
- Current: ~320KB gzipped
- Monitor with `ANALYZE=true npm run build`

### Common Development Tasks

#### Adding a New Page
1. Create page in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx` routes array
3. Add navigation link in `src/components/AppSidebar.tsx` and `src/components/BottomNav.tsx`
4. Create E2E test in `e2e/new-page.spec.ts`

#### Adding a New Database Table
1. Create migration: Write SQL in `supabase/migrations/YYYYMMDDHHMMSS_table_name.sql`
2. Define RLS policies in migration
3. Update types: Run `npx supabase gen types typescript` or modify `src/integrations/supabase/types.ts`
4. Create hooks in `src/hooks/useTableName.ts` for CRUD operations

#### Adding an Edge Function
1. Create function directory: `supabase/functions/function-name/`
2. Write handler in `index.ts` with CORS + auth verification
3. Deploy via Supabase CLI (`npx supabase functions deploy <nome>`)
4. Declare `verify_jwt` em `supabase/config.toml`
5. Add to list above for documentation

**Chamadas de IA** não vão direto a fornecedor nenhum: use
`../_shared/aiService.ts`, que fala com o serviço em `services/ai`. Ver
"AI Service" abaixo.

#### Debugging Real-time Issues
- Check console for `[Realtime]` logs from `realtimeLogger.ts`
- Verify channel cleanup in component unmount
- Ensure unique channel names per component instance
- Use 100ms cleanup delay to prevent WebSocket errors

#### Working with Billing Cycles
- Always use `useBillingCycle()` hook for date ranges
- Test with different `billing_cycle_day` values (1-28)
- Verify reports show correct cycle boundaries
- Check database function `get_billing_period()` for edge cases

### Security Notes

**Row Level Security (RLS):**
- All tables have RLS policies enabled
- Policies check `auth.uid() = user_id`
- Never disable RLS in production
- Test with different users to verify isolation

**Sensitive Data:**
- Never commit `.env` to git (already in `.gitignore`)
- O bucket privado `receipts` continua existindo e ainda é purgado por
  `delete-account`, mas nada mais escreve nele: guarda só cupons de antes da
  remoção do OCR. `getSignedReceiptUrl()` saiu junto — para expor um arquivo
  privado novo, gere signed URL curta no ponto de uso

**Input Validation:**
- Client-side: Zod schemas
- Server-side: PostgreSQL constraints + triggers
- Edge functions: Additional validation layer

### TypeScript Configuration

**Important:** This project uses **non-strict TypeScript** for flexibility:
- `noImplicitAny: false`
- `strictNullChecks: false`
- `skipLibCheck: true`

Type safety is enforced at runtime via Zod schemas instead of compile-time strict checks.

### Troubleshooting

**WebSocket is closed errors:**
- Caused by unmounted components with active subscriptions
- Fix: Use `mounted` ref pattern (see `useExpensesRealtime()`)
- Always call `channel.unsubscribe()` in cleanup with 100ms delay

**Currency parsing errors:**
- Brazilian format: R$ 1.234,56 (dot=thousands, comma=decimal)
- Always use `parseAmount()` before saving to database
- Database stores as numeric, not strings

**Billing cycle confusion:**
- Cycle day is 1-28 (not 1-31) to avoid month-end issues
- Cycles span across calendar months (e.g., day 25 to next month day 24)
- Use `get_billing_period()` RPC for server-side calculations

**E2E test flakiness:**
- Increase timeouts for navigation: `{ timeout: 15000 }`
- Always wait for page load with `waitForPageLoad(page)`
- Use `waitForSelector()` for dynamic content

**Build failures:**
- Run `npm run lint` first to catch ESLint errors
- Check for TypeScript errors with `tsc --noEmit`
- Clear build cache: `rm -rf dist node_modules/.vite`

### Related Documentation

For deeper dives into specific features, see:
- [Billing Cycle Feature](docs/billing-cycle.md)
- [Testing Guide](docs/testing.md)
- [PWA Setup](docs/pwa-setup.md)
- [Push Notifications](docs/push-notifications.md)
- [Architecture](docs/architecture.md)
- [Sprint 7 Features](docs/sprint-7-features.md) - Latest advanced features
- [Task Criticality Policy](docs/WORKFLOW.md) - how to scope effort/review by task risk
- [Project State](docs/STATE.md) / [Decision Context](docs/CONTEXT.md) - update at the end of a session
