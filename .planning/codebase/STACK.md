# Technology Stack

**Analysis Date:** 2026-09-17

## Languages

**Primary:**
- TypeScript 5.8 - Frontend (`src/`), edge functions (`supabase/functions/*/index.ts`, Deno), and AI service (`services/ai/src/`)

**Secondary:**
- SQL - Database schema, RLS policies, RPC functions (`supabase/migrations/*.sql`)
- JavaScript - Service worker config (`public/sw.js`)

## Runtime

**Frontend:**
- Browser (Vite dev server on port 8080, `vite.config.ts`)
- React 18.3 (`react`, `react-dom` — mid-migration target per `docs/STATE.md`, currently pinned at 18.x)

**AI Service (`services/ai/`):**
- Node 24 (native TypeScript execution via type stripping — no build step; see `services/ai/Dockerfile`)
- Deployed as a Docker container, not compiled to JS before running

**Edge Functions:**
- Deno (Supabase Edge Functions runtime), each function is `supabase/functions/<name>/index.ts`

**Package Manager:**
- npm, with `package-lock.json` present at repo root and `services/ai/package-lock.json` for the AI service
- Root project name in `package.json`: `entenda-seus-gastos`

## Frameworks

**Core (frontend):**
- React 18.3.1 with `react-router-dom` 6.30.1 (routing, lazy-loaded pages)
- Vite 5.4.19 (build tool) with `@vitejs/plugin-react-swc` for fast refresh
- Tailwind CSS 3.4.17 + `tailwindcss-animate`, shadcn/radix-ui component primitives (`@radix-ui/react-*`)
- `@tanstack/react-query` 5.83.0 for server state (5min stale time, no window-focus refetch — see `src/App.tsx`)
- `@tanstack/react-virtual` 3.13.12 for virtualized expense lists
- `next-themes` 0.3.0 for dark mode
- `vite-plugin-pwa` 1.1.0 + Workbox packages (`workbox-core`, `workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-expiration`, `workbox-cacheable-response`) 7.3.0 for PWA/service worker

**AI Service (`services/ai/`):**
- Hono 4.6.14 (HTTP framework, `@hono/node-server` 1.13.7)
- `jose` 5.9.6 for JWT verification (validates Supabase user JWTs forwarded from edge functions)
- `zod` 3.25.76 for request validation (shared version with frontend)

**Testing:**
- Vitest 4.0.1 (unit tests, both root project and `services/ai`) with `@vitest/ui`
- `@testing-library/react` 16.3.0, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/user-event` for component/hook tests
- `jsdom` 27.0.1 as the DOM environment for Vitest
- `@playwright/test` 1.57.0 for E2E tests (`e2e/*.spec.ts`)

**Build/Dev:**
- ESLint 9.32.0 (flat config) with `typescript-eslint` 8.38.0, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`
- `rollup-plugin-visualizer` 6.0.5 for bundle analysis (`ANALYZE=true npm run build` → `dist/stats.html`)
- Supabase CLI 2.114.0 (devDependency, used for local stack, migrations, type generation)
- PostCSS 8.5.6 + Autoprefixer 10.4.21

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.76.1 - Sole client for auth, database (PostgREST), storage, realtime, and edge function invocation
- `react-hook-form` 7.61.1 + `@hookform/resolvers` 3.10.0 + `zod` 3.25.76 - Form validation, used where a schema exists (`src/schemas/*.ts`); some forms (`RecurringExpenses.tsx`, `EditExpense.tsx`) instead use plain `useState` + native `required` and do not go through this stack
- `xlsx` 0.18.5 - Excel export generation (flagged as pending/mid-migration per `docs/STATE.md` — verify before adding new usages)
- `date-fns` 3.6.0 + `date-fns-tz` 3.2.0 - Date math for billing-cycle calculations

**Infrastructure:**
- `sonner` 1.7.4 - Toast notifications
- `recharts` 2.15.4 - Charts (reports, financial health score visualizations)
- `cmdk` 1.1.1 - Command palette (`GlobalSearch`, Cmd+K)
- `canvas-confetti` 1.9.4 - Celebratory UI effects
- `embla-carousel-react` 8.6.0 - Carousels
- `input-otp` 1.4.2 - OTP input fields

## Configuration

**Environment (frontend):**
- Only two `import.meta.env` variables are read by `src/`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (see `.env.example`)
- `src/integrations/supabase/client.ts` throws an explicit startup error if either is missing — no silent fallback
- Not tied to a specific Supabase project ref; must work against any instance (local, self-hosted, managed)

**Environment (AI service):**
- Required secrets checked at boot (container fails to start if missing): `SUPABASE_JWT_SECRET`, `GEMINI_API_KEY`
- Configured via `services/ai/src/config.ts` (single place that selects the LLM provider adapter, `AI_PROVIDER`)

**Environment (edge functions):**
- Own secrets via `supabase secrets set`, not the frontend `.env`: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `AI_SERVICE_URL`

**Build:**
- `vite.config.ts` - Vite build config, dev server port 8080, path alias `@/` → `src/`
- `tsconfig.json` - Non-strict TypeScript (`noImplicitAny: false`, `strictNullChecks: false`, `skipLibCheck: true`); type safety enforced at runtime via Zod instead
- `tailwind.config.ts` - Tailwind theme config
- `supabase/config.toml` - Local Supabase stack config (Postgres major version 17, matching the remote project), plus `verify_jwt` per edge function

## Platform Requirements

**Development:**
- Node.js (version not pinned via `.nvmrc`; `services/ai` targets Node 24 specifically for native TS execution)
- `npx supabase start` for local Supabase stack (Postgres 17, Studio on 54323, API on 54321)
- Playwright browsers installed for E2E (`npx playwright install` implied by `@playwright/test`)

**Production:**
- Frontend: deployed on Vercel as a static SPA (`vercel.json` — SPA rewrite to `index.html`, no-cache header for `sw.js`)
- AI service: deployed on Vercel as a separate project using container-based runtime (`services/ai/vercel.json` — `"runtime": "container"`), built from `services/ai/Dockerfile` (Node 24 Alpine, non-root `node` user, healthcheck on `/health`, port 8787)
- Backend: Supabase (Postgres 17, Auth, Storage, Realtime, Edge Functions/Deno) — self-hostable, not fixed to one managed project ref

---

*Stack analysis: 2026-09-17*
