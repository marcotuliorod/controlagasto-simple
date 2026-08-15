# Coding Conventions

**Analysis Date:** 2026-08-15

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (e.g., `CategoryGoalsManager.tsx`, `ContextualInsight.tsx`)
- Hooks: camelCase with `use` prefix and `.ts` extension (e.g., `useCategoryGoals.ts`, `useBillingCycle.ts`, `useReducedMotion.ts`)
- Utilities/Libraries: camelCase with descriptive names (e.g., `currencyUtils.ts`, `client.ts`)
- Schemas: camelCase ending with `Schema` (e.g., `profileSchema.ts`, `goalsFormSchema`)
- Edge functions: kebab-case directories (e.g., `check-category-variations/`, `chat-assistant/`)
- Test files: Same name as source with `.test.ts/tsx` suffix (e.g., `useMemoryLeak.test.ts`, `CategoryGoalsManager.test.tsx`)
- E2E test suites: kebab-case with `.spec.ts` suffix (e.g., `auth.spec.ts`, `recurring-expenses.spec.ts`)

**Functions:**
- Components: Export as named functions (e.g., `export default function CategoryGoalsManager()`, `export function ContextualInsight()`)
- Hooks: Always export as named exports prefixed with `use` (e.g., `export function useCurrentMonthCategoryGoals()`, `export function useUpsertCategoryGoal()`)
- Utility functions: camelCase describing action (e.g., `generateTestEmail()`, `formatCurrency()`, `waitForPageLoad()`)
- Private/internal functions: camelCase with no underscore prefix (style relies on file context, not naming)

**Variables:**
- State/Data: camelCase (e.g., `categoryGoals`, `limitInput`, `selectedCategoryId`)
- Constants (module-level): UPPER_SNAKE_CASE (e.g., `corsHeaders`, `TEST_USER`, `TEST_CATEGORIES`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleSave()`, `handleCancel()`, `onUpdate()`)
- Database fields: snake_case in Supabase (e.g., `category_id`, `user_id`, `limit_amount`, `billing_cycle_day`)
- React state: camelCase (e.g., `showAddForm`, `isLoading`, `isStandalone`)

**Types:**
- Interfaces: PascalCase (e.g., `CategoryGoal`, `ContextualInsightProps`)
- Type aliases: PascalCase (e.g., `ProfileFormData`)
- Inferred types from Zod: PascalCase with type suffix (e.g., `type GoalsFormData = z.infer<typeof goalsFormSchema>`)
- Generics: Single uppercase letter by convention (e.g., `<T>`)

## Code Style

**Formatting:**
- Prettier is not configured; formatting follows ESLint recommendations
- 2-space indentation (implicit, not configured in `.prettierrc`)
- Arrow functions preferred for simple callbacks
- Template literals for string interpolation
- Semicolons required (inferred from code review)

**Linting:**
- Tool: ESLint with TypeScript support (see `eslint.config.js`)
- Config file: `/eslint.config.js`
- Rules: `react-refresh/only-export-components` set to warn with `allowConstantExport: true`
- Disabled rules:
  - `@typescript-eslint/no-unused-vars` - turned off to allow flexibility during development
  - React Hooks recommended rules enabled (`reactHooks.configs.recommended.rules`)
- JavaScript version: ES2020 (ecmaVersion)

**TypeScript Configuration:**
- Mode: **Non-strict TypeScript** (flexibility prioritized over compile-time safety)
- Key settings in `/tsconfig.json`:
  - `noImplicitAny: false` - allows implicit `any`
  - `strictNullChecks: false` - allows unguarded null/undefined access
  - `noUnusedLocals: false` - unused locals permitted
  - `noUnusedParameters: false` - unused parameters permitted
  - `skipLibCheck: true` - skip type checking of declaration files
- Type safety enforced via **Zod schemas at runtime** instead of compile-time checks

## Import Organization

**Order:**
1. React/React Router imports (`import { useState, useEffect } from 'react'`)
2. Third-party UI libraries (e.g., `@radix-ui`, `lucide-react`)
3. React Query and state management (`@tanstack/react-query`, `@tanstack/react-virtual`)
4. Supabase and integrations (`@supabase/supabase-js`, integrations)
5. Custom hooks (`@/hooks/*`)
6. Custom utilities and libraries (`@/lib/*`)
7. Components and schemas (`@/components/*`, `@/schemas/*`)
8. Toast/notification libraries (`sonner`)
9. Date utilities (e.g., `date-fns`, `date-fns/locale`)

**Path Aliases:**
- `@/` resolves to `./src/` (configured in `tsconfig.json` and `vite.config.ts`)
- Used consistently throughout: `@/components`, `@/hooks`, `@/lib`, `@/integrations`, `@/schemas`, `@/providers`

**Examples from codebase:**
- `import { CategoryGoal } from "@/hooks/useCategoryGoals"`
- `import { formatCurrencyBR, parseCurrencyBR } from "@/lib/currencyUtils"`
- `import { supabase } from "@/integrations/supabase/client"`

## Error Handling

**Patterns:**
- Async/await with try-catch for errors (edge functions, API calls)
- Supabase errors checked via `error` destructuring (e.g., `const { data, error } = await supabase.from(...)`)
- Throw errors for React Query to catch in `queryFn`/`mutationFn` (e.g., `if (error) throw error`)
- User-facing errors via toast notifications (e.g., `toast.error("Selecione uma categoria")`)
- Input validation with Zod schemas before mutation attempts

**Edge Function Example** (from `chat-assistant/index.ts`):
```typescript
try {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('No authorization header');
  }
  
  const { message } = await req.json();
  if (!message || typeof message !== 'string') {
    throw new Error('Invalid message format');
  }
} catch (error) {
  console.error('Error:', error);
  return new Response(JSON.stringify({ error: error.message }), { 
    status: 400, 
    headers: corsHeaders 
  });
}
```

**React Component Example** (from `CategoryGoalsManager.tsx`):
```typescript
const handleSave = async () => {
  if (!selectedCategoryId) {
    toast.error("Selecione uma categoria");
    return;
  }

  const limitAmount = parseCurrencyBR(limitInput);
  if (limitAmount <= 0) {
    toast.error("Valor deve ser maior que zero");
    return;
  }

  await upsertGoal.mutateAsync({
    categoryId: selectedCategoryId,
    month: currentCycle.label,
    limitAmount,
  });
};
```

## Logging

**Framework:** `console` (no dedicated logging library)

**Patterns:**
- Development logging in edge functions: `console.error()`, `console.log()` for debugging
- E2E tests include emoji-prefixed console logs for clarity (e.g., `console.log('🔐 Setting up authentication...')`, `console.log('⚠️ Signup failed')`)
- No structured logging; messages are human-readable strings
- Used sparingly in production code; heavy logging in test setup and edge functions only

**Example** (from `auth.setup.ts`):
```typescript
console.log('🔐 Setting up authentication...');
// ... setup code ...
console.log('✅ Authentication setup complete');
```

## Comments

**When to Comment:**
- Function-level JSDoc comments for exported functions/hooks:
  ```typescript
  /**
   * Hook to fetch category goals for the current billing cycle
   */
  export function useCurrentMonthCategoryGoals() { ... }
  
  /**
   * Upsert de meta de categoria
   */
  export function useUpsertCategoryGoal() { ... }
  ```

- Inline comments for complex logic or non-obvious decisions
- Schema validation comments explaining business rules
- Test comments explaining what's being tested or workarounds

**Avoid:**
- Over-commenting obvious code
- Commented-out code blocks (delete instead)
- Redundant comments that restate the code

## Function Design

**Size:** Functions kept concise; complex operations broken into smaller utilities
- Hooks typically 30-50 lines (fetch + return query object)
- Components under 150 lines for readability
- Edge functions structured with setup → validation → business logic → response

**Parameters:**
- Hooks accept configuration objects (e.g., `{ channelName, onUpdate, enabled }`)
- Components receive typed Props interface (e.g., `ContextualInsightProps`)
- Utility functions accept minimal required arguments, optional params last
- Destructuring used extensively (e.g., `const { data, error }`)

**Return Values:**
- Hooks return React Query objects (e.g., `{ data, isLoading, error }`) or custom objects
- Components return JSX
- Utility functions return single values or typed objects
- Async functions return Promises; errors thrown for catch handlers

**Example** (from `useCategoryGoals.ts`):
```typescript
export function useCurrentMonthCategoryGoals() {
  const { getCurrentCycle } = useBillingCycle();
  const currentCycle = getCurrentCycle().label;
  
  return useQuery({
    queryKey: ["categoryGoals", currentCycle],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase
        .from("category_goals")
        .select(...)
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data as CategoryGoal[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

## Module Design

**Exports:**
- Prefer named exports for functions/types (allows tree-shaking)
- Interfaces and types exported alongside implementations
- Default exports used for components (e.g., `export default function CategoryGoalsManager()`)

**Barrel Files:**
- Not heavily used; imports are direct from source files
- Hooks from `src/hooks/` imported individually
- Components from `src/components/` imported individually
- No centralized `index.ts` re-exports observed

**Example structure:**
- `src/hooks/useCategoryGoals.ts` exports: `useCurrentMonthCategoryGoals`, `useUpsertCategoryGoal`, `useDeleteCategoryGoal`, interface `CategoryGoal`
- `src/schemas/profileSchema.ts` exports: `profileFormSchema`, `profileFormData` (type), `emailChangeSchema`, etc.

---

*Convention analysis: 2026-08-15*
