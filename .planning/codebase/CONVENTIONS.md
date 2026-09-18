# Coding Conventions

**Analysis Date:** 2026-09-17

## Naming Patterns

**Files:**
- React components/pages: PascalCase — `src/pages/RecurringExpenses.tsx`, `src/components/AppSidebar.tsx`
- Hooks: camelCase prefixed with `use` — `src/hooks/useBillingCycle.ts`, `src/hooks/useImportTransactions.ts`
- Utilities/libs: camelCase — `src/lib/currencyUtils.ts`, `src/lib/amountUtils.ts`
- Zod schemas: camelCase suffixed with `Schema` — `src/schemas/profileSchema.ts`
- shadcn/ui primitives under `src/components/ui/` keep the library's lowercase-kebab naming — `button.tsx`, `navigation-menu.tsx` (do not rename to PascalCase; these are vendored-style components)

**Functions:**
- camelCase throughout (`formatCurrencyBR`, `parseCurrencyBR`, `getCurrentCycle`)

**Variables:**
- camelCase; boolean state prefixed with `is`/`has` (`isDialogOpen`, `isSubmitting`)

**Types:**
- PascalCase for types/interfaces (`ProfileFormData`), matching Zod-inferred type names to their schema

## Code Style

**Formatting:**
- No Prettier config present in the repo (no `.prettierrc*`). Formatting is enforced only via ESLint + editor defaults — do not assume Prettier is running in CI.

**Linting:**
- ESLint via flat config `eslint.config.js` (typescript-eslint + `react-hooks` + `react-refresh` plugins)
- Current `npm run lint` state (verified 2026-09-17): **0 errors, 17 warnings**. All warnings, no blocking errors:
  - `react-refresh/only-export-components` on several `src/components/ui/*` files (badge, button, form, navigation-menu, sidebar, sonner, toggle) — these vendored files intentionally export constants/utilities alongside components; do not "fix" by splitting files unless asked.
  - `react-hooks/exhaustive-deps` on `src/pages/AccountProfile.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Index.tsx`, `src/pages/Reports.tsx`, `src/providers/PWAInstallProvider.tsx` — missing deps in `useEffect`/`useCallback` are pre-existing and tolerated; a new lint failure in one of these usually means a genuinely new issue.
- Lint is warning-only, not a hard CI gate for these existing issues — do not silently "fix" all 17 warnings in an unrelated PR; scope changes to what you're asked to touch.

## TypeScript Strictness (deliberate, not accidental)

**`tsconfig.json` compiler options:**
- `noImplicitAny: false`
- `strictNullChecks: false`
- `noUnusedParameters: false`
- `noUnusedLocals: false`
- `skipLibCheck: true`

This is an intentional project-wide choice, not tech debt to fix. Runtime validation is delegated to **Zod** instead of compile-time strictness — see `src/schemas/*.ts`. When writing new code:
- Don't add `strict: true` or per-file `// @ts-strict` opt-ins expecting them to be enforced project-wide — they won't be caught by CI type-checking the same way a strict project would.
- Validate external input (form data, API responses, edge function payloads) with Zod schemas or explicit runtime checks, not by relying on the type system to catch `null`/`undefined`.
- `npm run build` still runs full `tsc` type checking (not `--noEmit` skipped) — type errors do fail the build, just under the relaxed compiler options above.

## Import Organization

**Path Aliases:**
- `@/*` maps to `src/*` (configured in `tsconfig.json` and `vite.config.ts`)
- Always import via `@/` for anything under `src/` rather than relative `../../` chains, e.g. `import { formatCurrencyBR } from "@/lib/currencyUtils"`

**Order:** No enforced import-sorting plugin (no `eslint-plugin-import` order rule detected). Observed convention in existing files: external packages first, then `@/` aliased imports, then relative imports — but this is not lint-enforced, so don't assume violations will be caught.

## Error Handling

**Frontend (React Query mutations):**
```typescript
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
- Supabase calls always destructure `{ data, error }` and explicitly `throw error` rather than relying on implicit rejection.

**Edge Functions (`supabase/functions/*/index.ts`):**
- Auth failures return structured JSON with `{ error: string }` and correct HTTP status (401) plus `corsHeaders`.
- AI-calling functions (`process-import-file`, `chat-assistant`, `generate-insights`) must verify the JWT via `supabaseClient.auth.getUser(token)` **before** any paid AI work — see CLAUDE.md for the historical bug this rule prevents.
- Cron-triggered functions (`notify-goal-threshold`, `process-recurring-expenses`, `process-scheduled-exports`) use `X-Cron-Secret` header comparison against `Deno.env.get('CRON_SECRET')` instead of JWT auth — there is no end user to authenticate.

**AI Service (`services/ai/`):**
- Provider errors are normalized into `AIError`; only `AIError.publicMessage` may reach the end user (never surface provider name, quota, or billing details).

## Logging

**Framework:** No structured logging library detected; uses `console.*` plus a small custom logger for realtime debugging.

**Patterns:**
- Realtime subscription lifecycle logs prefixed `[Realtime]` from `src/lib/realtimeLogger.ts` — check these when debugging WebSocket issues.

## Form Handling — Known Inconsistency (do not "fix" silently)

The app does **not** use one form strategy consistently. Two coexisting patterns are both current and intentional to leave as-is unless a task specifically asks to migrate a form:

**Pattern A — React Hook Form + Zod (preferred for new forms with a schema):**
- `src/schemas/profileSchema.ts` is the only Zod schema currently in the repo; `src/pages/AccountProfile.tsx` is its only consumer.
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

**Pattern B — plain `useState` + native HTML `required` (no schema, no RHF):**
- `src/pages/RecurringExpenses.tsx` — a dozen+ `useState` fields (`merchant`, `amount`, `categoryId`, `frequency`, etc.) with `required` attributes directly on inputs (verified at lines 167, 180, 239).
- `src/pages/EditExpense.tsx` — same shape: individual `useState` per field (`amount`, `date`, `categoryId`, `merchant`, etc.) with `required` on inputs (verified at lines 186, 197).

**Guidance:** Before modifying a form, `grep` the file for `useForm`/`zodResolver` vs bare `useState` to know which pattern it follows — do not assume RHF+Zod project-wide, and do not migrate `RecurringExpenses.tsx` or `EditExpense.tsx` to RHF+Zod as a drive-by change; that's a deliberate, scoped migration decision, not a lint-fix.

## Comments

**When to Comment:**
- Comments in Portuguese are common and expected throughout the codebase (this is a Brazilian product; commit messages and in-code rationale are frequently written in Portuguese).
- Comments explaining *why* a workaround exists are valued — see the block comment in `e2e/import-transactions.spec.ts` explaining scope decisions, or the CLAUDE.md notes about historical bugs (`process-receipt`).

**JSDoc/TSDoc:**
- Sparse; used selectively for hooks/utilities with non-obvious behavior rather than on every export.

## Currency Formatting (domain-specific convention)

- Always convert display → database with `parseCurrencyBR(string)` from `src/lib/currencyUtils.ts`.
- Always convert database → display with `formatCurrencyBR(number)`.
- Format: R$ 1.234,56 (Brazilian Real, dot thousands separator, comma decimal separator). Never use `Number()`/`parseFloat` directly on user-entered currency strings.

## Module Design

**Exports:** Mix of named exports (hooks, utils) and default exports (page/route components).

**AI Service boundary (`services/ai/src/`):**
- `domain/` code must only import from `providers/types.ts`, never from concrete files under `providers/`. Adding a new AI provider means adding a file in `providers/` plus a case in `config.ts` — do not touch `domain/`.
- Prompts live in `prompts/`, never inlined in transport/handler code.

---

*Convention analysis: 2026-09-17*
