# Technology Stack

**Analysis Date:** 2026-08-15

## Languages

**Primary:**
- TypeScript - Full project (frontend & edge functions)
- HTML/CSS - Via Tailwind CSS framework

## Runtime

**Environment:**
- Node.js 20 (from `/.github/workflows/ci.yml:20`)
- Deno (for Supabase edge functions via `https://deno.land/std@0.168.0`)

**Package Manager:**
- npm 10+ (inferred from Node.js 20)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3.1 (`/package.json:68`) - UI library
- Vite 5.4.19 (`/package.json:108`) - Build tool and dev server
- React Router DOM 6.30.1 (`/package.json:73`) - Client-side routing
- Tailwind CSS 3.4.17 (`/package.json:105`) - Utility-first CSS framework
- Supabase 2.76.1 (`/package.json:49`) - Backend-as-a-Service

**UI Component System:**
- @radix-ui/* (`/package.json:22-48`) - Accessible component primitives (accordion, dialog, dropdown, etc.)
- shadcn/ui (via Radix UI) - Component library built on Radix
- Lucide React 0.462.0 (`/package.json:66`) - Icon library
- Sonner 1.7.4 (`/package.json:76`) - Toast notifications
- next-themes 0.3.0 (`/package.json:67`) - Dark mode theming

**Testing:**
- Vitest 4.0.1 (`/package.json:81`) - Unit testing framework
- @testing-library/react 16.3.0 (`/package.json:54`) - React testing utilities
- @playwright/test 1.57.0 (`/package.json:21`) - E2E testing framework

**Build/Dev Tools:**
- TypeScript 5.8.3 (`/package.json:106`) - Language compiler
- ESLint 9.32.0 (`/package.json:99`) - Code linting
- PostCSS 8.5.6 (`/package.json:104`) - CSS processing
- Autoprefixer 10.4.21 (`/package.json:98`) - CSS vendor prefixing
- Vite SWC Plugin 3.11.0 (`/package.json:97`) - Fast TypeScript/JSX transpilation
- rollup-plugin-visualizer 6.0.5 (`/package.json:75`) - Bundle size analysis

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.76.1 (`/package.json:49`) - Database client, auth, edge functions
- @tanstack/react-query 5.83.0 (`/package.json:50`) - Server state management & caching
- react-hook-form 7.61.1 (`/package.json:71`) - Form state and validation
- zod 3.25.76 (`/package.json:89`) - Runtime schema validation
- @hookform/resolvers 3.10.0 (`/package.json:20`) - Schema validation adapters for React Hook Form

**Data & Visualization:**
- recharts 2.15.4 (`/package.json:74`) - Composable chart library
- xlsx 0.18.5 (`/package.json:88`) - Excel file parsing and generation
- date-fns 3.6.0 (`/package.json:61`) - Date manipulation utilities
- date-fns-tz 3.2.0 (`/package.json:62`) - Timezone support for date-fns

**Infrastructure & PWA:**
- vite-plugin-pwa 1.1.0 (`/package.json:80`) - PWA manifest and service worker
- workbox-core 7.3.0 (`/package.json:83`) - Service worker tooling
- workbox-strategies 7.3.0 (`/package.json:87`) - Caching strategies
- workbox-routing 7.3.0 (`/package.json:86`) - Route matching
- workbox-precaching 7.3.0 (`/package.json:85`) - Static asset caching
- workbox-expiration 7.3.0 (`/package.json:84`) - Cache expiration
- workbox-cacheable-response 7.3.0 (`/package.json:82`) - Cache response matching

**UI & Interaction:**
- embla-carousel-react 8.6.0 (`/package.json:63`) - Carousel/slider component
- react-resizable-panels 2.1.9 (`/package.json:72`) - Resizable layout panels
- @tanstack/react-virtual 3.13.12 (`/package.json:51`) - Virtual scrolling for large lists
- cmdk 1.1.1 (`/package.json:60`) - Command palette component
- input-otp 1.4.2 (`/package.json:64`) - OTP input component
- vaul 0.9.9 (`/package.json:79`) - Drawer component
- canvas-confetti 1.9.4 (`/package.json:57`) - Confetti animation
- class-variance-authority 0.7.1 (`/package.json:58`) - Component variant system
- clsx 2.1.1 (`/package.json:59`) - Conditional className utility
- tailwind-merge 2.6.0 (`/package.json:77`) - Tailwind CSS class merging
- tailwindcss-animate 1.0.7 (`/package.json:78`) - Tailwind animation utilities
- react-day-picker 8.10.1 (`/package.json:69`) - Date picker component

**Testing Utilities:**
- jsdom 27.0.1 (`/package.json:65`) - DOM implementation for testing
- @testing-library/dom 10.4.1 (`/package.json:52`) - DOM testing utilities
- @testing-library/jest-dom 6.9.1 (`/package.json:53`) - Custom Jest matchers
- @testing-library/user-event 14.6.1 (`/package.json:55`) - User interaction simulation
- @vitest/ui 4.0.1 (`/package.json:56`) - Vitest UI dashboard

**Development Tools:**
- lovable-tagger 1.1.11 (`/package.json:103`) - Lovable component tagging
- @types/react 18.3.23 (`/package.json:95`) - React TypeScript definitions
- @types/react-dom 18.3.7 (`/package.json:96`) - React DOM TypeScript definitions
- @types/node 22.16.5 (`/package.json:94`) - Node.js TypeScript definitions
- typescript-eslint 8.38.0 (`/package.json:107`) - TypeScript ESLint support
- eslint-plugin-react-hooks 5.2.0 (`/package.json:100`) - React hooks linting
- eslint-plugin-react-refresh 0.4.20 (`/package.json:101`) - Fast refresh linting
- globals 15.15.0 (`/package.json:102`) - Global variable definitions

## Configuration Files

**Build & Module Config:**
- `vite.config.ts` - Vite build configuration with PWA plugin, SWC react plugin, bundle visualizer
- `tsconfig.json` - TypeScript compiler with non-strict mode (`noImplicitAny: false`, `strictNullChecks: false`)
- `postcss.config.js` - PostCSS with Tailwind & Autoprefixer

**Testing Config:**
- `vitest.config.ts` - Vitest configuration with jsdom environment (in `vite.config.ts`)
- `playwright.config.ts` - Playwright E2E tests for chromium, firefox, webkit, and mobile
- E2E test directory: `/e2e/` with baseURL `http://localhost:5173`

**Framework & Style Config:**
- `tailwind.config.ts` - Tailwind CSS configuration
- `eslint.config.js` - ESLint rules configuration
- `.env` - Environment variables (file present, not read)

**CI/CD:**
- `.github/workflows/ci.yml` - GitHub Actions: lint, typecheck, unit tests, E2E tests, Lighthouse CI, build

## Platform Requirements

**Development:**
- Node.js 20+
- npm 10+
- Git for version control
- Supabase CLI (optional, for local database development)

**Production:**
- Deployment target: Vercel or Supabase Hosting (inferred from tech stack)
- Browser support: Modern browsers with ES2020+ support
- PWA capable browser (iOS 11.3+ for PWA)
- Service worker support (95%+ browser coverage)

**Browser APIs Required:**
- IndexedDB (for caching)
- Service Workers (for offline support)
- Web Push API (for notifications)
- localStorage (for session persistence)

---

*Stack analysis: 2026-08-15*
