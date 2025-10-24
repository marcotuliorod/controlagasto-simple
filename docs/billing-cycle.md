# Billing Cycle Feature

## Overview
The billing cycle feature allows users to configure a custom billing cycle day (1-28) instead of using the default calendar month. This is useful for users whose credit card billing cycles or monthly budgets start on a different day.

## User Configuration

### Onboarding
During onboarding, users can set their preferred billing cycle day (1-28). This setting is stored in the `profiles` table under the `billing_cycle_day` column.

### Settings
Users can change their billing cycle day at any time in the Settings page under "Configurações de Conta".

## Technical Implementation

### Database
- **Table**: `profiles`
- **Column**: `billing_cycle_day` (integer, default: 1)
- No migration needed as the column already exists

### Hook: `useBillingCycle`
Location: `src/hooks/useBillingCycle.ts`

Provides utilities to work with billing cycles:

```typescript
const { 
  cycleDay,           // Current configured day (1-28)
  getCurrentCycle,    // Get current cycle dates
  getCycleRange,      // Get specific cycle dates
  getDateCycle,       // Determine which cycle a date belongs to
  hasCustomCycle      // Boolean if custom cycle is set
} = useBillingCycle();
```

### Utility Functions
Location: `src/lib/dateRange.ts`

- `getCurrentBillingCycle(cycleDay)` - Returns current cycle start, end, and label
- `getBillingCycleRange(year, month, cycleDay)` - Returns cycle range for specific month
- `getDateBillingCycle(date, cycleDay)` - Determines which cycle a date belongs to

## Features Using Billing Cycle

### Reports Page
- **"Ciclo Atual" button**: Quick filter for current billing cycle
- Shows cycle range in tooltip (e.g., "05/01/2025 - 05/02/2025")

### Add Expense
- Toast notification shows which billing cycle the expense belongs to
- Example: "Despesa adicionada ao ciclo 2025-01 (05/01 - 05/02)"

### Edit Expense
- Visual indicator shows billing cycle of the expense being edited
- Displays cycle label and date range

### Category Goals
- All goals and progress calculations use billing cycle instead of calendar month
- Goal limits are set per billing cycle

### Dashboard & Reports
- All expense aggregations respect billing cycle
- Budget comparisons use cycle-based data

## Date Format
- **Cycle Label**: `YYYY-MM` format (e.g., "2025-01")
- **Date Range**: ISO format `YYYY-MM-DD`
- **Display**: Localized format `DD/MM/YYYY`

## Examples

### Cycle Day = 5
- **January Cycle**: 2025-01-05 to 2025-02-05 (label: "2025-01")
- **February Cycle**: 2025-02-05 to 2025-03-05 (label: "2025-02")

### Cycle Day = 15
- **January Cycle**: 2025-01-15 to 2025-02-15 (label: "2025-01")
- **February Cycle**: 2025-02-15 to 2025-03-15 (label: "2025-02")

## Testing
E2E tests cover:
- Billing cycle configuration in onboarding
- Reports filtering by cycle
- Expense assignment to correct cycle
- Category goals per cycle

See `e2e/reports-cycle.spec.ts` for comprehensive test scenarios.
