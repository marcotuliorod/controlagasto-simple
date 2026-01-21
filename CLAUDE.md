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
npx supabase gen types typescript --project-id mnznxdewqjyhvrctllgh > src/integrations/supabase/types.ts
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
- `<FABAddExpense>` (floating action button)
- `<GlobalSearch>` (Cmd+K command palette)

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

**Stack:** React Hook Form + Zod validation

**Pattern:**
1. Define schema in `src/schemas/*.ts`
2. Use `@hookform/resolvers/zod` for validation
3. Handle currency formatting with `src/lib/currencyUtils.ts`

Example:
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseSchema } from "@/schemas/expenseSchema";

const form = useForm({
  resolver: zodResolver(expenseSchema),
  defaultValues: { amount: "", merchant: "" }
});

const onSubmit = form.handleSubmit(async (values) => {
  // values are type-safe and validated
});
```

**Currency Formatting:**
- Always use `parseAmount(string)` from `currencyUtils.ts` to convert display -> database
- Use `formatCurrency(number)` for database -> display
- Format: R$ 1.234,56 (Brazilian Real with dot thousands, comma decimal)

#### 4. Edge Functions

**Location:** `supabase/functions/*/index.ts`

**Available Functions:**
- `process-receipt` - OCR via Lovable AI API (extracts amount, merchant, date, items)
- `chat-assistant` - AI financial advice using OpenAI
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
const { data, error } = await supabase.functions.invoke("process-receipt", {
  body: { imageUrl: receiptUrl }
});
```

**Auth Pattern in Edge Functions:**
```typescript
const authHeader = req.headers.get('Authorization');
const token = authHeader?.replace('Bearer ', '');
const { data: { user } } = await supabaseClient.auth.getUser(token);
```

#### 5. Testing Patterns

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

**E2E Test Suites (9 total):**
1. Authentication flow (`auth.spec.ts`)
2. Expense CRUD (`expenses.spec.ts`)
3. OCR receipt processing (`ocr-basic.spec.ts`)
4. Reports with billing cycle (`reports-cycle.spec.ts`)
5. PDF/CSV/XLSX export (`export-pdf.spec.ts`, `export-excel.spec.ts`)
6. AI insights (`insights.spec.ts`)
7. Scheduled exports (`scheduled-exports.spec.ts`)
8. Recurring expenses (`recurring-expenses.spec.ts`)
9. Tags & notes (`tags.spec.ts`)

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
VITE_SUPABASE_PROJECT_ID=mnznxdewqjyhvrctllgh
VITE_SUPABASE_URL=https://mnznxdewqjyhvrctllgh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon_key>
```

**Note:** These are auto-configured in Lovable. For local development, copy from Supabase dashboard.

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
3. Deploy via Lovable or Supabase CLI
4. Add to list above for documentation

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
- Receipts stored in private Supabase storage bucket
- Use signed URLs with 60s expiration via `getSignedReceiptUrl()`

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
