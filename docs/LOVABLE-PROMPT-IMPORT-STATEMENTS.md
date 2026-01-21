# Lovable Prompt: Bank Statement & Credit Card Import Feature

## Feature Request

Add ability to import bank statements and credit card invoices (CSV/OFX/PDF formats) to automatically create expenses in bulk, with intelligent mapping, duplicate detection, and category suggestion.

---

## Context

Our expense tracking app currently requires manual entry or OCR of individual receipts. Users want to import their monthly bank statements and credit card invoices to bulk-create expenses automatically, saving time and ensuring completeness.

**Current State:**
- Users can add expenses manually (one by one)
- Users can use OCR for receipt images
- No bulk import capability exists

**Desired State:**
- Users can upload bank statement files (CSV, OFX, PDF)
- Users can upload credit card invoice files (CSV, PDF)
- System parses files and creates expenses automatically
- Smart category suggestion based on merchant/description
- Duplicate detection prevents re-importing same transactions
- User can review and edit before confirming import

---

## User Stories

### US1: Upload Bank Statement File
**As a** user,
**I want to** upload my bank statement file (CSV/OFX/PDF),
**So that** I can import all my transactions at once instead of entering them manually.

**Acceptance Criteria:**
- [ ] New page/modal for "Import Transactions"
- [ ] File upload accepts: CSV, OFX, PDF formats
- [ ] Max file size: 10MB
- [ ] Shows file name and size after selection
- [ ] Upload button disabled until valid file selected
- [ ] Error message for unsupported formats
- [ ] Loading state during file processing

### US2: Parse and Preview Transactions
**As a** user,
**I want to** see a preview of parsed transactions before importing,
**So that** I can verify the data is correct and make adjustments.

**Acceptance Criteria:**
- [ ] After upload, show table with parsed transactions
- [ ] Columns: Date, Description/Merchant, Amount, Suggested Category, Account
- [ ] Allow editing each field before import
- [ ] Show count: "X transactions found"
- [ ] Checkbox to select/deselect individual transactions
- [ ] "Select All" / "Deselect All" buttons
- [ ] Validation: date not future, amount > 0

### US3: Smart Category Suggestion
**As a** user,
**I want the** system to suggest categories based on merchant names,
**So that** I don't have to manually categorize every transaction.

**Acceptance Criteria:**
- [ ] Use existing `check-category-variations` edge function
- [ ] Match merchant/description against user's historical expenses
- [ ] If no match, use keyword-based suggestion (e.g., "Uber" → Transport)
- [ ] Show confidence indicator (High/Medium/Low)
- [ ] User can override suggestion with dropdown
- [ ] Learn from user corrections for future imports

### US4: Duplicate Detection
**As a** user,
**I want the** system to detect duplicate transactions,
**So that** I don't accidentally import the same expense twice.

**Acceptance Criteria:**
- [ ] Check existing expenses for same: date, amount, merchant (±1 day tolerance)
- [ ] Mark duplicates with warning icon and "Possible duplicate" label
- [ ] Auto-deselect duplicates by default
- [ ] User can manually select if it's not actually a duplicate
- [ ] Show reason: "Similar expense found: [date] - [merchant] - [amount]"

### US5: Map Statement Columns
**As a** user with custom CSV format,
**I want to** map my CSV columns to app fields,
**So that** the system correctly interprets my bank's specific format.

**Acceptance Criteria:**
- [ ] If CSV, show column mapping screen before preview
- [ ] Dropdowns for each CSV column → app field (Date, Description, Amount, etc.)
- [ ] Auto-detect common patterns (e.g., "Data" → Date, "Valor" → Amount)
- [ ] Save mapping per bank (e.g., "Banco do Brasil Format")
- [ ] Reuse saved mappings for future imports from same bank
- [ ] Support for debit/credit indicators (+ or -, separate columns)

### US6: Confirm and Import
**As a** user,
**I want to** review and confirm before final import,
**So that** I can ensure everything is correct.

**Acceptance Criteria:**
- [ ] Summary screen showing:
  - Total transactions selected: X
  - Total amount: R$ X.XXX,XX
  - Breakdown by category
  - Duplicates excluded: X
- [ ] "Import X Transactions" button
- [ ] Progress bar during import
- [ ] Success toast: "X transactions imported successfully"
- [ ] Navigate to Expenses page showing newly imported items
- [ ] Mark imported expenses with `source='import'` in database

---

## Technical Implementation

### Database Schema Changes

#### New Table: `import_sessions`
```sql
CREATE TABLE import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'csv', 'ofx', 'pdf'
  status TEXT NOT NULL, -- 'processing', 'completed', 'failed'
  total_transactions INTEGER,
  imported_transactions INTEGER,
  skipped_duplicates INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

#### New Table: `import_mappings`
```sql
CREATE TABLE import_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  bank_name TEXT NOT NULL,
  mapping JSONB NOT NULL, -- { "column1": "date", "column2": "amount", ... }
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, bank_name)
);
```

#### Update `expenses` Table
```sql
-- Add source type 'import'
-- Already has 'source' column, just ensure it accepts 'import' value
-- Add optional reference to import session
ALTER TABLE expenses ADD COLUMN import_session_id UUID REFERENCES import_sessions(id);
```

### New Edge Function: `process-import-file`

**Path:** `supabase/functions/process-import-file/index.ts`

**Functionality:**
1. Receive file upload (base64 or multipart)
2. Parse based on file type:
   - **CSV**: Use csv-parse library
   - **OFX**: Use ofx-parser library
   - **PDF**: Extract text with pdf-parse, regex to find transaction tables
3. Return array of parsed transactions:
```typescript
{
  date: string,
  description: string,
  amount: number,
  type: 'debit' | 'credit',
  balance?: number
}
```
4. For each transaction, call `check-category-variations` to suggest category
5. Query existing expenses to detect duplicates
6. Return:
```typescript
{
  transactions: Array<{
    date: string,
    merchant: string,
    amount: number,
    suggestedCategory: { id, name, confidence },
    isDuplicate: boolean,
    duplicateReason?: string
  }>,
  totalCount: number,
  duplicatesCount: number
}
```

### Frontend Components

#### New Page: `/import-transactions`

**Route:** `src/pages/ImportTransactions.tsx`

**UI Flow:**
1. **Step 1: Upload**
   - File input with drag-and-drop
   - Format selector: "Bank Statement" or "Credit Card Invoice"
   - Account selector (which account these transactions belong to)

2. **Step 2: Column Mapping** (CSV only)
   - Table preview (first 5 rows)
   - Dropdown mapping for each column
   - Save mapping checkbox with bank name input

3. **Step 3: Review & Edit**
   - Data table with parsed transactions
   - Inline editing for each field
   - Category dropdown per row
   - Duplicate warning badges
   - Select/deselect checkboxes

4. **Step 4: Confirm**
   - Summary card
   - Import button with progress

**Components to Create:**
- `FileUploadZone.tsx` - Drag-and-drop file input
- `ColumnMapper.tsx` - CSV column mapping interface
- `ImportPreviewTable.tsx` - Editable transaction preview
- `ImportSummary.tsx` - Summary before final import

### API Integration

**New Hook:** `src/hooks/useImportTransactions.ts`

```typescript
export function useImportTransactions() {
  const processFile = useMutation({
    mutationFn: async (file: File) => {
      const { data } = await supabase.functions.invoke('process-import-file', {
        body: { file: await fileToBase64(file) }
      });
      return data;
    }
  });

  const importTransactions = useMutation({
    mutationFn: async (transactions: ImportTransaction[]) => {
      const { error } = await supabase.from('expenses').insert(
        transactions.map(t => ({
          user_id: userId,
          date: t.date,
          merchant: t.merchant,
          amount: t.amount,
          category_id: t.categoryId,
          account_id: t.accountId,
          source: 'import',
          import_session_id: sessionId
        }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Transactions imported successfully');
    }
  });

  return { processFile, importTransactions };
}
```

### Navigation Updates

Add import option to:
1. **AppSidebar:** New menu item "Import Transactions"
2. **GlobalSearch:** Quick action "Import Statement"
3. **Expenses Page:** Button "Import from File" next to "Add Expense"

---

## File Format Support

### CSV Format
**Common Brazilian Banks:**
- Banco do Brasil
- Itaú
- Bradesco
- Santander
- Nubank
- Inter

**Expected Columns (flexible mapping):**
- Date (Data, Data Lançamento, Date)
- Description (Descrição, Histórico, Description)
- Amount (Valor, Quantia, Amount)
- Type (Tipo, Débito/Crédito) - optional
- Balance (Saldo, Balance) - optional

**Example CSV:**
```csv
Data,Descrição,Valor,Tipo
2026-01-15,UBER *TRIP,25.50,Débito
2026-01-16,IFOOD *DELIVERY,45.00,Débito
2026-01-17,SALARIO,5000.00,Crédito
```

### OFX Format
**Standard:** Open Financial Exchange (OFX 2.0)
- Parse `<STMTTRN>` blocks
- Extract: `<DTPOSTED>`, `<TRNAMT>`, `<NAME>`, `<MEMO>`

### PDF Format
**Challenge:** No standard format, requires regex patterns per bank
**Strategy:**
- Extract text with pdf-parse
- Use regex to find transaction tables
- Patterns for common banks (start with top 3: Nubank, Inter, Itaú)
- Allow users to copy-paste table text as fallback

---

## UX Considerations

### Error Handling
- **Invalid file format:** "This file format is not supported. Please use CSV, OFX, or PDF."
- **Parsing failed:** "We couldn't read this file. Please check the format or try exporting again from your bank."
- **No transactions found:** "No transactions were found in this file. Please verify the file content."
- **All duplicates:** "All transactions in this file appear to be duplicates. No new expenses to import."

### Empty States
- **No files uploaded yet:** Show example file formats and download sample CSV template

### Success States
- **Import completed:** Show confetti animation + summary card
- **Partial import:** "X of Y transactions imported (Z duplicates skipped)"

### Loading States
- **Processing file:** "Analyzing your file..." (with spinner)
- **Importing transactions:** Progress bar "Importing X of Y..."

---

## Testing Requirements

### Unit Tests
- [ ] CSV parser handles different formats
- [ ] OFX parser extracts correct fields
- [ ] Duplicate detection logic accuracy
- [ ] Category suggestion algorithm
- [ ] Amount parsing (handles negative, parentheses, currency symbols)

### E2E Tests
**New test:** `e2e/import-transactions.spec.ts`

```typescript
test('should import CSV bank statement', async ({ page }) => {
  await page.goto('/import-transactions');

  // Upload file
  await page.setInputFiles('input[type=file]', 'fixtures/sample-statement.csv');

  // Map columns (if needed)
  await page.selectOption('select[name=date-column]', 'Data');
  await page.selectOption('select[name=amount-column]', 'Valor');

  // Review transactions
  await expect(page.getByText('10 transactions found')).toBeVisible();

  // Deselect duplicates
  const duplicates = page.locator('[data-duplicate=true]');
  await expect(duplicates).toHaveCount(2);

  // Import
  await page.click('button:has-text("Import 8 Transactions")');

  // Verify success
  await expect(page.getByText('8 transactions imported successfully')).toBeVisible();
  await expect(page).toHaveURL(/\/expenses/);
});
```

### Manual Testing Checklist
- [ ] Upload CSV from Nubank
- [ ] Upload CSV from Banco do Brasil
- [ ] Upload OFX from Itaú
- [ ] Upload credit card PDF from Bradesco
- [ ] Import with all duplicates (should show warning)
- [ ] Import with mixed duplicates (should allow partial)
- [ ] Edit transaction before import
- [ ] Change category suggestion
- [ ] Save column mapping for reuse
- [ ] Import 100+ transactions (performance test)

---

## Accessibility

- [ ] File input keyboard accessible
- [ ] Drag-and-drop has keyboard alternative
- [ ] Table navigation with arrow keys
- [ ] Screen reader announces: "X transactions found, Y duplicates"
- [ ] ARIA labels on all interactive elements
- [ ] Focus indicators visible

---

## Performance

- **File Size Limit:** 10MB
- **Transaction Limit:** 1,000 per import (show warning if more)
- **Processing Time Target:** <5 seconds for CSV, <10 seconds for PDF
- **Batch Insert:** Use batch insert for expenses (not one-by-one)

---

## Future Enhancements (Not in MVP)

- [ ] Automatic bank integration (Open Banking API)
- [ ] Scheduled imports (auto-fetch monthly)
- [ ] Multi-file upload (import several months at once)
- [ ] Excel (XLSX) support
- [ ] QIF format support
- [ ] Import from email attachment (forward statement to special email)
- [ ] ML model training for better category suggestions
- [ ] Split transactions (one statement line → multiple expenses)
- [ ] Import rules (auto-tag Uber as Transport, auto-exclude certain merchants)

---

## Deliverables

### Backend
- [ ] Edge function: `process-import-file`
- [ ] Database migrations: `import_sessions`, `import_mappings` tables
- [ ] Update `expenses` table with `import_session_id`

### Frontend
- [ ] Page: `/import-transactions`
- [ ] Components: FileUploadZone, ColumnMapper, ImportPreviewTable, ImportSummary
- [ ] Hook: `useImportTransactions`
- [ ] Navigation updates: Sidebar, GlobalSearch, Expenses page

### Testing
- [ ] E2E test: `import-transactions.spec.ts`
- [ ] Sample files: `fixtures/sample-statement.csv`, `fixtures/sample-ofx.ofx`

### Documentation
- [ ] User guide: "How to Import Bank Statements"
- [ ] Developer docs: File format specifications
- [ ] Update FEATURES.md with new feature

---

## Priority & Timeline

**Priority:** HIGH (Top user request)
**Estimated Effort:** 3-5 days
**Target Release:** v9.0.0

**Breakdown:**
- Day 1: Edge function + CSV parser
- Day 2: Frontend UI (upload + preview)
- Day 3: Column mapping + duplicate detection
- Day 4: Category suggestion + polish
- Day 5: Testing + documentation

---

## Success Metrics

**Adoption:**
- 40% of active users try import feature in first month
- 60% of users who try it, use it again

**Efficiency:**
- Average 50 expenses imported per session
- 90% of imported transactions require no manual editing

**Quality:**
- Duplicate detection accuracy: >95%
- Category suggestion accuracy: >70%
- User satisfaction (NPS): >60

---

## Notes for Implementation

- Use existing `check-category-variations` edge function for suggestions
- Leverage `audit_logs` table to track import sessions
- Consider rate limiting: max 5 imports per hour per user
- Store original file hash to prevent exact re-imports
- Add import metadata to expenses for troubleshooting
- Support Brazilian date formats: DD/MM/YYYY and YYYY-MM-DD
- Handle amount formats: "1.234,56" and "1,234.56"

---

**End of Prompt**

Please implement this feature following the specifications above. Start with the backend edge function for CSV parsing, then move to the frontend UI. Ensure all acceptance criteria are met before considering the feature complete.
