# Sprint 6: Quality Assurance Plan

## 📋 Overview

**Duration:** 1-2 weeks  
**Priority:** 🔴 Critical  
**Focus Areas:** Bug Fixes, Accessibility (A11y), Performance Optimization

## 🎯 Sprint Goals

- ✅ Achieve 95%+ E2E test pass rate in CI
- ✅ Reach WCAG 2.1 AA compliance
- ✅ Improve Lighthouse scores to 90+ across all metrics
- ✅ Fix all critical and high-priority bugs
- ✅ Optimize bundle size and runtime performance

---

## 📊 Current Status

### Test Coverage
- Unit tests: ✅ Implemented (Vitest)
- E2E tests: ✅ Implemented (Playwright)
- CI/CD: ✅ GitHub Actions configured
- **Gap:** E2E tests need validation in CI environment

### Accessibility
- **Status:** Not audited
- **Target:** WCAG 2.1 AA compliance

### Performance
- **Status:** Basic optimizations done (lazy loading, React Query)
- **Target:** Lighthouse scores 90+

---

## 🔧 Part 1: Bug Fixes & Quality Assurance

### 1.1 E2E Test Validation in CI ⏱️ 2-3 days

**Objective:** Ensure all Playwright tests pass consistently in CI environment

#### Tasks:
- [ ] Run full E2E suite locally on all browsers (chromium, firefox, webkit)
- [ ] Analyze CI test failures from GitHub Actions
- [ ] Fix flaky tests (add proper waits, improve selectors)
- [ ] Update test data fixtures if needed
- [ ] Add retry logic for network-dependent tests
- [ ] Document test patterns in `docs/testing.md`

**Files to Review:**
```
e2e/auth.spec.ts
e2e/expense-crud.spec.ts
e2e/export-pdf.spec.ts
e2e/insights.spec.ts
e2e/reports-cycle.spec.ts
e2e/ocr-basic.spec.ts (needs implementation)
playwright.config.ts
.github/workflows/ci.yml
```

**Commands:**
```bash
npm run test:e2e          # Run locally
npm run test:e2e:headed   # Debug mode
npm run test:e2e:ui       # Playwright UI
```

**Acceptance Criteria:**
- ✅ All E2E tests pass on CI (chromium, firefox, webkit)
- ✅ Test execution time < 5 minutes
- ✅ No flaky tests (100% pass rate on 3 consecutive runs)

---

### 1.2 Billing Cycle Edge Cases ⏱️ 1-2 days

**Objective:** Handle all edge cases for custom billing cycles

#### Known Edge Cases:
1. **Months with different days (28/29/30/31)**
   - User sets cycle day = 31
   - February only has 28/29 days
   - What happens?

2. **Timezone handling**
   - User in UTC-3 creates expense at 23:00
   - Database stores in UTC (02:00 next day)
   - Which billing cycle does it belong to?

3. **Cycle transitions**
   - User changes cycle day from 1 to 15 mid-month
   - How to handle expenses already recorded?

#### Tasks:
- [ ] Write unit tests for edge cases in `src/lib/dateRange.test.ts`
- [ ] Update `getBillingCycleRange()` to handle months with < 31 days
- [ ] Ensure consistent timezone handling (use `date-fns` with timezone)
- [ ] Add migration guide for users changing cycle day
- [ ] Document behavior in `docs/billing-cycle.md`

**Files to Update:**
```typescript
src/lib/dateRange.ts
src/lib/dateRange.test.ts
src/hooks/useBillingCycle.ts
docs/billing-cycle.md
```

**Test Cases:**
```typescript
// Example edge case tests
describe('Billing Cycle Edge Cases', () => {
  it('should handle cycle day 31 in February', () => {
    const result = getBillingCycleRange(2025, 2, 31);
    // Should default to last day of February (28 or 29)
    expect(result.start).toBe('2025-02-28');
  });
  
  it('should handle timezone boundaries', () => {
    // User in UTC-3, expense at 23:00 local = 02:00 UTC next day
    const date = '2025-01-31T23:00:00-03:00';
    const cycle = getDateBillingCycle(date, 1);
    // Should belong to February cycle, not January
    expect(cycle).toBe('2025-02');
  });
});
```

**Acceptance Criteria:**
- ✅ All edge cases documented
- ✅ Unit tests cover edge cases (100% branch coverage)
- ✅ No user data corruption when changing cycle day

---

### 1.3 Account Deletion Flow ⏱️ 1 day

**Objective:** Ensure complete and safe account deletion

#### Current Implementation Review:
```
src/pages/DeleteAccount.tsx
supabase/functions/delete-account/index.ts
```

#### Tasks:
- [ ] Test deletion flow end-to-end
- [ ] Verify all user data is deleted:
  - ✅ Profiles
  - ✅ Expenses
  - ✅ Categories
  - ✅ Accounts
  - ✅ Goals
  - ✅ Notifications
  - ✅ Audit logs
  - ✅ Receipts (storage)
- [ ] Add confirmation email before deletion
- [ ] Implement soft delete with 30-day recovery period (optional)
- [ ] Test RLS policies don't leak deleted user data

**Database Changes (Optional - Soft Delete):**
```sql
-- Add deleted_at column to profiles
ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMPTZ;

-- Update RLS policies to exclude soft-deleted users
CREATE POLICY "Active users only"
  ON profiles FOR ALL
  USING (deleted_at IS NULL);
```

**Acceptance Criteria:**
- ✅ Complete data deletion verified
- ✅ No orphaned records in database
- ✅ Storage files deleted
- ✅ User can re-register with same email after deletion

---

### 1.4 Memory Leak Detection ⏱️ 1 day

**Objective:** Identify and fix memory leaks

#### Tools:
- Chrome DevTools > Memory Profiler
- React DevTools Profiler

#### Known Potential Leaks:
1. **Realtime subscriptions not cleaned up**
   - `src/hooks/useExpensesRealtime.ts`
   - Verify `useEffect` cleanup returns `channel.unsubscribe()`

2. **Event listeners not removed**
   - Service Worker listeners
   - Window resize listeners

3. **Unclosed timers/intervals**
   - Check for `setTimeout`/`setInterval` without cleanup

#### Tasks:
- [ ] Audit all `useEffect` hooks for cleanup functions
- [ ] Test for memory leaks using Chrome DevTools:
  1. Record heap snapshot
  2. Navigate through app
  3. Take another snapshot
  4. Compare (look for detached DOM nodes)
- [ ] Fix identified leaks
- [ ] Add ESLint rule for missing cleanup

**Files to Audit:**
```
src/hooks/useExpensesRealtime.ts
src/hooks/usePushNotifications.ts
src/providers/PWAInstallProvider.tsx
src/components/InstallPWA.tsx
```

**Acceptance Criteria:**
- ✅ No memory growth after 100 page navigations
- ✅ All subscriptions properly cleaned up
- ✅ No console warnings about memory leaks

---

## ♿ Part 2: Accessibility Audit (WCAG 2.1 AA)

### 2.1 Install Accessibility Tools ⏱️ 30 min

```bash
# Automated testing
npm install -D @axe-core/cli
npm install -D pa11y

# Add scripts to package.json
"a11y:axe": "axe http://localhost:4173 --exit",
"a11y:pa11y": "pa11y http://localhost:4173"
```

**Browser Extensions:**
- [axe DevTools](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
- [WAVE](https://chrome.google.com/webstore/detail/wave-evaluation-tool/jbbplnpkjmmeebjpijfedlgcdilocofh)

---

### 2.2 Keyboard Navigation ⏱️ 2 days

**Objective:** Ensure full keyboard accessibility

#### Test Checklist:
- [ ] Tab through all interactive elements (logical order)
- [ ] Test all buttons/links with `Enter` and `Space`
- [ ] Modal dialogs trap focus (can't tab outside)
- [ ] Dropdowns/menus accessible with arrow keys
- [ ] Forms can be completed without mouse
- [ ] Skip to main content link present

#### Common Issues to Fix:
1. **Missing focus indicators**
   ```css
   /* Add to index.css */
   *:focus-visible {
     outline: 2px solid hsl(var(--primary));
     outline-offset: 2px;
   }
   ```

2. **Keyboard traps**
   - Dialog components must trap focus
   - Use `@radix-ui` built-in focus management

3. **Tab order**
   - Avoid `tabindex > 0`
   - Use semantic HTML for natural order

#### Files to Update:
```
src/index.css (focus styles)
src/components/ui/dialog.tsx (focus trap)
src/components/AppSidebar.tsx (keyboard navigation)
src/pages/AddExpense.tsx (form navigation)
```

**Acceptance Criteria:**
- ✅ All interactive elements reachable by keyboard
- ✅ Visible focus indicators on all elements
- ✅ Logical tab order throughout app
- ✅ No keyboard traps

---

### 2.3 ARIA Labels & Semantic HTML ⏱️ 2 days

**Objective:** Improve screen reader experience

#### Tasks:
- [ ] Audit all icons for `aria-label`
- [ ] Add `aria-labelledby` to sections
- [ ] Ensure form inputs have associated labels
- [ ] Add `role` attributes where needed
- [ ] Test landmark regions (`<header>`, `<main>`, `<nav>`, `<footer>`)

#### Common Fixes:

**1. Icon-only buttons:**
```tsx
// ❌ Bad
<Button onClick={handleDelete}>
  <Trash2 />
</Button>

// ✅ Good
<Button onClick={handleDelete} aria-label="Deletar despesa">
  <Trash2 aria-hidden="true" />
</Button>
```

**2. Form labels:**
```tsx
// ❌ Bad
<Input placeholder="Nome" />

// ✅ Good
<Label htmlFor="name">Nome</Label>
<Input id="name" placeholder="Nome" />
```

**3. Landmark regions:**
```tsx
// ✅ Update AppLayout.tsx
<div className="flex min-h-screen">
  <aside aria-label="Menu lateral">
    <AppSidebar />
  </aside>
  <main id="main-content">
    {children}
  </main>
</div>
```

#### Files to Update:
```
src/components/AppLayout.tsx
src/components/FABAddExpense.tsx
src/components/BottomNav.tsx
src/pages/Dashboard.tsx
src/pages/Expenses.tsx
All icon-only buttons
```

**Acceptance Criteria:**
- ✅ All images have `alt` text
- ✅ All icon buttons have `aria-label`
- ✅ All form inputs have labels
- ✅ Page structure uses semantic HTML

---

### 2.4 Color Contrast ⏱️ 1 day

**Objective:** Ensure text is readable for users with visual impairments

**WCAG Requirements:**
- Normal text (< 18pt): 4.5:1 contrast ratio
- Large text (≥ 18pt): 3:1 contrast ratio

#### Tools:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Chrome DevTools > Inspect > Accessibility

#### Tasks:
- [ ] Audit all text colors against backgrounds
- [ ] Fix low-contrast combinations
- [ ] Test in dark mode as well
- [ ] Document color tokens in `index.css`

#### Common Issues:
```css
/* ❌ Low contrast */
.text-muted { color: hsl(0 0% 60%); } /* on white bg = 3.8:1 */

/* ✅ Fixed */
.text-muted { color: hsl(0 0% 45%); } /* on white bg = 7.2:1 */
```

**Files to Update:**
```
src/index.css
tailwind.config.ts
```

**Acceptance Criteria:**
- ✅ All text meets 4.5:1 contrast ratio
- ✅ Dark mode also meets contrast requirements
- ✅ No axe-core color contrast violations

---

### 2.5 Screen Reader Testing ⏱️ 1 day

**Objective:** Verify app is usable with screen readers

#### Tools:
- **macOS:** VoiceOver (`Cmd + F5`)
- **Windows:** NVDA (free) or JAWS
- **Linux:** Orca

#### Test Scenarios:
1. Navigate Dashboard with screen reader
2. Add expense using only screen reader
3. Edit expense
4. Generate report
5. Change settings

#### Common Issues:
- Unclear button/link text ("Click here" vs "Add new expense")
- Missing page titles
- Dynamic content not announced
- Loading states not communicated

#### Tasks:
- [ ] Test with VoiceOver/NVDA
- [ ] Add `aria-live` regions for dynamic content
- [ ] Ensure page title updates on route change
- [ ] Add loading announcements

**Example Fix:**
```tsx
// Add live region for notifications
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {isLoading && "Carregando despesas..."}
  {error && `Erro: ${error.message}`}
</div>
```

**Acceptance Criteria:**
- ✅ All pages navigable with screen reader
- ✅ All actions can be completed
- ✅ Dynamic updates announced
- ✅ No confusion or dead ends

---

## ⚡ Part 3: Performance Optimization

### 3.1 Bundle Analysis ⏱️ 1 day

**Objective:** Reduce bundle size to improve load time

#### Install Tool:
```bash
npm install -D vite-bundle-visualizer
```

**Update `vite.config.ts`:**
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

**Run Analysis:**
```bash
npm run build
# Opens bundle visualization in browser
```

#### Common Optimizations:
1. **Large dependencies:**
   - Check if `recharts` can be replaced with lighter alternative
   - Check if `html2pdf.js` can be lazy loaded
   - Check if `xlsx` is tree-shakeable

2. **Code splitting:**
   ```tsx
   // Lazy load heavy pages
   const ChatAssistant = lazy(() => import('@/pages/ChatAssistant'));
   const Reports = lazy(() => import('@/pages/Reports'));
   ```

3. **Unused code:**
   - Remove unused imports
   - Remove unused utility functions
   - Check for duplicate dependencies

#### Tasks:
- [ ] Analyze bundle with visualizer
- [ ] Identify largest chunks
- [ ] Lazy load heavy dependencies
- [ ] Remove unused code
- [ ] Re-run analysis and compare

**Target:**
- Initial bundle: < 300 KB (gzipped)
- Total bundle: < 1 MB (gzipped)

**Acceptance Criteria:**
- ✅ Bundle size reduced by 20%+
- ✅ No unused dependencies
- ✅ Heavy components lazy loaded

---

### 3.2 Virtual Scrolling for Long Lists ⏱️ 2 days

**Objective:** Improve performance when rendering 1000+ expenses

#### Current Issue:
`src/pages/Expenses.tsx` renders all expenses at once, causing:
- Slow initial render
- Janky scrolling
- High memory usage

#### Solution: Virtual Scrolling
Use `@tanstack/react-virtual` to only render visible items.

**Install:**
```bash
npm install @tanstack/react-virtual
```

**Implementation:**
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function ExpensesList({ expenses }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: expenses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Height of each expense item
    overscan: 5, // Render 5 extra items for smooth scrolling
  });
  
  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ExpenseCard expense={expenses[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Files to Update:**
```
src/pages/Expenses.tsx
src/pages/Dashboard.tsx (if list is long)
```

**Performance Gains:**
- Before: Render 1000 items = ~2000ms
- After: Render 20 visible items = ~50ms (40x faster!)

**Acceptance Criteria:**
- ✅ Smooth scrolling with 1000+ items
- ✅ No FPS drops
- ✅ Memory usage stable

---

### 3.3 Image Optimization ⏱️ 1 day

**Objective:** Reduce image file sizes and improve loading

#### Tasks:
- [ ] Convert images to WebP format
- [ ] Add lazy loading to images
- [ ] Implement responsive images (`srcset`)
- [ ] Optimize receipt images on upload

**Image Lazy Loading:**
```tsx
<img
  src={imageUrl}
  alt="Receipt"
  loading="lazy"
  decoding="async"
/>
```

**Receipt Upload Optimization:**
Update `supabase/functions/process-receipt/index.ts` to:
1. Resize images to max 1200px width
2. Convert to WebP
3. Compress quality to 85%

**Use library:** `sharp` (already available in Supabase Edge Functions)

```typescript
import sharp from 'sharp';

const optimizedImage = await sharp(imageBuffer)
  .resize(1200, null, { withoutEnlargement: true })
  .webp({ quality: 85 })
  .toBuffer();
```

**Acceptance Criteria:**
- ✅ All images lazy loaded
- ✅ Receipt images compressed
- ✅ Page load time improved by 30%+

---

### 3.4 Database Query Optimization ⏱️ 2 days

**Objective:** Reduce database query time

#### Tools:
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM expenses
WHERE user_id = '...'
  AND date >= '2025-01-01'
  AND date < '2025-02-01';
```

#### Tasks:
- [ ] Identify slow queries (> 100ms)
- [ ] Add missing indexes
- [ ] Optimize N+1 query problems
- [ ] Add query result caching

**Common Indexes to Add:**
```sql
-- Expenses by user and date (for billing cycle queries)
CREATE INDEX idx_expenses_user_date 
ON expenses (user_id, date DESC);

-- Category goals by user and month
CREATE INDEX idx_category_goals_user_month 
ON category_goals (user_id, month);

-- Audit logs by user and timestamp
CREATE INDEX idx_audit_logs_user_timestamp 
ON audit_logs (user_id, created_at DESC);
```

**N+1 Problem Example:**
```tsx
// ❌ Bad: Fetches categories one by one
expenses.map(exp => {
  const category = await supabase
    .from('categories')
    .select('*')
    .eq('id', exp.category_id)
    .single();
});

// ✅ Good: Fetch all at once with join
const { data } = await supabase
  .from('expenses')
  .select('*, category:categories(*)')
  .eq('user_id', userId);
```

**Acceptance Criteria:**
- ✅ All queries < 100ms
- ✅ Proper indexes in place
- ✅ No N+1 queries

---

### 3.5 Service Worker Caching Strategy ⏱️ 1 day

**Objective:** Improve offline experience and load time

**Current Service Worker:**
```
public/sw.js
```

#### Optimization Tasks:
- [ ] Cache static assets (CSS, JS, fonts)
- [ ] Cache API responses (stale-while-revalidate)
- [ ] Pre-cache critical pages
- [ ] Set proper cache expiration

**Example Strategy:**
```javascript
// Cache static assets (cache-first)
workbox.routing.registerRoute(
  /\.(?:js|css|woff2)$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache API responses (network-first with fallback)
workbox.routing.registerRoute(
  /\/rest\/v1\//,
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);
```

**Acceptance Criteria:**
- ✅ App loads offline (shows cached data)
- ✅ Static assets cached effectively
- ✅ API responses cached with short TTL

---

## 📈 Success Metrics

### Before Sprint 6:
- E2E Pass Rate: ~80% (some flaky tests)
- Lighthouse Performance: 75
- Lighthouse Accessibility: 82
- Bundle Size: ~500 KB
- Page Load Time: ~2.5s

### After Sprint 6 (Target):
- ✅ E2E Pass Rate: 100%
- ✅ Lighthouse Performance: 90+
- ✅ Lighthouse Accessibility: 95+
- ✅ Lighthouse SEO: 90+
- ✅ Bundle Size: < 350 KB
- ✅ Page Load Time: < 1.5s
- ✅ WCAG 2.1 AA Compliant

---

## 🗓️ Execution Timeline

### Week 1: Bug Fixes + Accessibility
**Days 1-2:** E2E Test Validation
- Fix all flaky tests
- Ensure CI passes consistently

**Days 3-4:** Billing Cycle Edge Cases + Account Deletion
- Fix edge cases
- Write comprehensive tests

**Day 5:** Memory Leak Detection
- Audit with Chrome DevTools
- Fix identified leaks

**Days 6-7:** Accessibility Audit
- Install tools
- Test keyboard navigation
- Add ARIA labels

### Week 2: Accessibility + Performance
**Days 1-2:** Complete Accessibility Fixes
- Fix color contrast
- Test with screen readers
- Final axe-core audit

**Days 3-4:** Performance Optimization Part 1
- Bundle analysis
- Virtual scrolling
- Image optimization

**Days 5-7:** Performance Optimization Part 2
- Database indexes
- Service Worker optimization
- Final Lighthouse audit

---

## ✅ Sprint 6 Checklist

### Bug Fixes
- [ ] All E2E tests pass on CI (3 consecutive runs)
- [ ] Billing cycle edge cases handled
- [ ] Account deletion tested end-to-end
- [ ] No memory leaks detected

### Accessibility
- [ ] axe-core reports 0 violations
- [ ] WAVE reports 0 errors
- [ ] Keyboard navigation fully functional
- [ ] All ARIA labels in place
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader testing completed

### Performance
- [ ] Bundle size < 350 KB (gzipped)
- [ ] Virtual scrolling implemented
- [ ] Images optimized (WebP, lazy load)
- [ ] Database indexes added
- [ ] Service Worker caching optimized
- [ ] Lighthouse Performance: 90+
- [ ] Lighthouse Accessibility: 95+
- [ ] Lighthouse Best Practices: 90+
- [ ] Lighthouse SEO: 90+

---

## 🚀 Ready for Sprint 7?

After completing Sprint 6, you'll have:
- ✅ Rock-solid stability (no bugs)
- ✅ World-class accessibility
- ✅ Lightning-fast performance

**Next:** Sprint 7 - Advanced Features (Scheduled Exports, Smart Notifications, etc.)

---

## 📚 Resources

### Accessibility
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Checklist](https://webaim.org/standards/wcag/checklist)
- [A11y Project](https://www.a11yproject.com/)

### Performance
- [web.dev Performance](https://web.dev/performance/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Bundle Optimization Guide](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

### Testing
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
