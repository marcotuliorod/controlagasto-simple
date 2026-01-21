# Lovable Prompt: Brazilian Bank Statement Import Feature

## Feature Request

Add ability to import Brazilian bank statements (PDF and CSV formats) to automatically create expenses from bank transactions, with intelligent filtering to exclude non-expense items (investments, transfers between accounts, tax repasses) and proper debit/credit handling.

---

## Context - Real Brazilian Bank Statement Analysis

Based on analysis of actual Banco do Brasil (BB) statement PDF, we identified the following structure:

### PDF Statement Format (Banco do Brasil)
```
Extrato conta corrente
Cliente - Conta atual
Agência: 3793-1
Conta corrente: 12034-0 SEED PARANA - FEB
Período do extrato: 11/2018

Lançamentos
Dt. movimento  Dt. balancete  Histórico                        Documento      Valor R$         Saldo
06/11/2018                    RECEBIMENTO DE ICMS              350            3.372.304,31 C
06/11/2018                    BB CP Admin Diferenciado         71             3.372.304,31 D   0,00 C
07/11/2018                    Pagamentos Diversos              870.518        24.315,98 D
28/11/2018                    + Transferência enviada          553.793...     11.687.943,59 D
                              28/11 3793 70000-2 GEPR CONTA REC
30/11/2018                    Apl.BB Fundos Exclusivos         1.201.191      23.848.458,59 D
```

### Key Observations from Real Data:

1. **Transaction Types Found:**
   - `RECEBIMENTO DE ICMS` - Tax income (should be IGNORED for personal finance)
   - `FPE/FPM` - Government transfers (should be IGNORED)
   - `Pagamentos Diversos` - Various payments (SHOULD BE IMPORTED as expenses)
   - `+ Transferência enviada` - Sent transfers (needs smart detection: expense or internal transfer?)
   - `+ Transferência recebida` - Received transfers (should be income, not expense)
   - `Apl.BB Fundos Exclusivos` - Investment application (should be IGNORED)
   - `Resg.BB Fundos Exclusivos` - Investment redemption (should be IGNORED)
   - `BB CP Admin Diferenciado` - Bank fees/services (SHOULD BE IMPORTED as expense)
   - `Saque sem cartão` - ATM withdrawal (SHOULD BE IMPORTED as expense)
   - `Deb.Distribuição Estadual` - Government distributions (should be IGNORED)
   - `ITCMD`, `IPVA`, `ITR` - Taxes (context-dependent: personal = expense, government account = ignore)
   - `Repasse` - Government repasses (should be IGNORED for personal accounts)

2. **Amount Format:**
   - Uses Brazilian format: `3.372.304,31` (dot for thousands, comma for decimals)
   - Suffix indicates type: `C` = Credit (incoming), `D` = Debit (outgoing)
   - Balance shown after each transaction

3. **Multi-line Descriptions:**
   - Some transactions span multiple lines (e.g., transfers show origin/destination details below)
   - Example: `+ Transferência enviada` followed by `28/11 3793 70000-2 GEPR CONTA REC`

4. **Date Handling:**
   - `Dt. movimento` = Transaction date (actual date)
   - `Dt. balancete` = Balance sheet date (often empty)
   - Format: DD/MM/YYYY

---

## Enhanced User Stories

### US1: Upload Bank Statement PDF with Smart Parsing
**As a** user,
**I want to** upload my Banco do Brasil PDF statement,
**So that** the system intelligently extracts only relevant expense transactions.

**Acceptance Criteria:**
- [ ] Accept PDF files up to 10MB
- [ ] Parse multi-page PDFs
- [ ] Extract transaction table from PDF text
- [ ] Handle multi-line transaction descriptions
- [ ] Parse Brazilian number format (1.234,56)
- [ ] Identify transaction type by C/D suffix
- [ ] Extract: date, description, document, amount, balance
- [ ] Handle continuation lines (transfer details, etc.)

### US2: Intelligent Transaction Filtering
**As a** user,
**I want the** system to automatically filter out non-expense transactions,
**So that** I only import actual expenses without manual cleanup.

**Acceptance Criteria:**
- [ ] **Auto-EXCLUDE** these transaction types:
  - Investment applications/redemptions (Apl/Resg Fundos)
  - Government repasses (FPE, FPM, ICMS for government accounts)
  - Tax income for government entities (IPVA, ITCMD, ITR)
  - Incoming transfers marked with `+ Transferência recebida` (these are income)
  - Balance adjustments (`S A L D O`)
  - Internal account transfers (when both accounts belong to same user)

- [ ] **Auto-INCLUDE** these as expenses:
  - `Pagamentos Diversos` (various payments)
  - `Saque sem cartão` (ATM withdrawals)
  - Bank fees (BB CP Admin, DOC, TED fees)
  - Outgoing transfers to third parties (`+ Transferência enviada` to external accounts)
  - Debit card purchases
  - Credit card payments
  - Utility bills (when identifiable)

- [ ] **Mark as REVIEW** (user decides):
  - Transfers between user's own accounts
  - Large round-number transactions (may be savings transfers)
  - Transactions without clear merchant name

### US3: Debit vs Credit Handling
**As a** user,
**I want the** system to correctly interpret C (credit) and D (debit) indicators,
**So that** only debits (outgoing money) are imported as expenses.

**Acceptance Criteria:**
- [ ] Parse `C` suffix as Credit (money IN) → generally NOT an expense
- [ ] Parse `D` suffix as Debit (money OUT) → candidate for expense
- [ ] Exception: incoming transfers (C) should never be expenses
- [ ] Exception: salary deposits (C) should never be expenses
- [ ] Allow user to override auto-classification
- [ ] Show clear indicator: "💸 Expense" vs "💰 Income" vs "🔄 Transfer"

### US4: Handle Multi-Bank PDF Formats
**As a** user,
**I want to** upload statements from different Brazilian banks,
**So that** I can import from my multiple accounts.

**Acceptance Criteria:**
- [ ] Support Banco do Brasil format (as analyzed)
- [ ] Support Itaú format (different table structure)
- [ ] Support Bradesco format
- [ ] Support Nubank format (simpler CSV-like)
- [ ] Support Caixa Econômica Federal format
- [ ] Auto-detect bank based on PDF header/logo
- [ ] Show detected bank: "Detected: Banco do Brasil"
- [ ] Allow manual bank selection if auto-detection fails

### US5: Smart Merchant Name Extraction
**As a** user,
**I want the** system to extract clean merchant names from descriptions,
**So that** I get proper categorization suggestions.

**Acceptance Criteria:**
- [ ] Extract merchant from `Histórico` column
- [ ] Clean up prefixes: remove `+ Transferência`, `Pagamentos Diversos`, etc.
- [ ] Extract merchant from transfer details (second line)
- [ ] Examples:
  - Input: `+ Transferência enviada 28/11 3793 UBER *TRIP`
  - Output merchant: `UBER`
  - Input: `Pagamentos Diversos IFOOD *DELIVERY`
  - Output merchant: `IFOOD`
- [ ] Remove document numbers, dates, account numbers from merchant name
- [ ] Normalize: `UBER *TRIP` → `Uber Trip`

### US6: Duplicate Detection with Balance Matching
**As a** user,
**I want the** system to detect duplicates using date, amount, AND merchant,
**So that** I don't re-import the same statement twice.

**Acceptance Criteria:**
- [ ] Check existing expenses: same date (±1 day), amount, merchant
- [ ] Hash statement period to prevent exact file re-upload
- [ ] Store hash: `MD5(account_number + period + file_content)`
- [ ] Show warning: "This statement (11/2018 for account 12034-0) was already imported on [date]"
- [ ] Allow force re-import with confirmation
- [ ] Mark potential duplicates but let user decide

---

## Technical Implementation - Enhanced

### Database Schema Updates

#### New Table: `import_sessions`
```sql
CREATE TABLE import_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'csv'
  bank_name TEXT, -- 'banco_do_brasil', 'itau', 'bradesco', 'nubank', 'caixa'
  account_number TEXT, -- Extracted from statement
  statement_period TEXT, -- '11/2018'
  file_hash TEXT UNIQUE, -- Prevent duplicate imports
  status TEXT NOT NULL, -- 'processing', 'completed', 'failed'
  total_transactions INTEGER,
  imported_transactions INTEGER,
  excluded_transactions INTEGER, -- Auto-filtered
  review_transactions INTEGER, -- Needs user review
  skipped_duplicates INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_import_sessions_user_hash ON import_sessions(user_id, file_hash);
```

#### Update `expenses` Table
```sql
ALTER TABLE expenses
  ADD COLUMN import_session_id UUID REFERENCES import_sessions(id),
  ADD COLUMN transaction_type TEXT, -- 'debit', 'credit', 'transfer'
  ADD COLUMN original_description TEXT, -- Full bank description
  ADD COLUMN document_number TEXT, -- Document/reference from statement
  ADD COLUMN running_balance NUMERIC; -- Balance after transaction (from statement)
```

### New Edge Function: `process-bank-statement-pdf`

**Path:** `supabase/functions/process-bank-statement-pdf/index.ts`

**Libraries:**
- `pdf-parse` - Extract text from PDF
- `@anthropic-ai/sdk` - Use Claude to parse complex tables

**Algorithm:**

```typescript
async function processBankStatement(pdfBuffer: Buffer, userId: string) {
  // 1. Extract text from PDF
  const pdfText = await pdfParse(pdfBuffer);

  // 2. Detect bank
  const bank = detectBank(pdfText.text);
  // Look for: "BANCO DO BRASIL", "ITAÚ", "BRADESCO", etc.

  // 3. Extract account info
  const accountInfo = extractAccountInfo(pdfText.text, bank);
  // Agência: 3793-1, Conta: 12034-0, Período: 11/2018

  // 4. Check if already imported
  const fileHash = md5(accountInfo.account + accountInfo.period + pdfText.text);
  const existing = await checkDuplicateImport(userId, fileHash);
  if (existing) {
    throw new Error(`Statement already imported on ${existing.created_at}`);
  }

  // 5. Use Claude AI to parse transaction table
  const prompt = `
    Parse this Brazilian bank statement transaction table.
    Extract each transaction with: date, description, document, amount, type (C/D).
    Handle multi-line descriptions.
    Return as JSON array.

    Text:
    ${pdfText.text}
  `;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  const transactions = JSON.parse(response.content[0].text);

  // 6. Process each transaction
  const processed = transactions.map(t => ({
    date: parseDate(t.date), // DD/MM/YYYY → YYYY-MM-DD
    merchant: extractMerchant(t.description),
    amount: parseAmount(t.amount), // 1.234,56 → 1234.56
    transactionType: t.type === 'D' ? 'debit' : 'credit',
    originalDescription: t.description,
    documentNumber: t.document,

    // Smart classification
    classification: classifyTransaction(t),
    // Returns: 'expense' | 'income' | 'transfer' | 'investment' | 'ignore'

    suggestedCategory: await suggestCategory(extractMerchant(t.description), userId),
    isDuplicate: await checkDuplicate(userId, parseDate(t.date), parseAmount(t.amount))
  }));

  // 7. Auto-filter
  const expenses = processed.filter(t =>
    t.classification === 'expense' && !t.isDuplicate
  );
  const excluded = processed.filter(t =>
    t.classification === 'ignore' || t.classification === 'investment'
  );
  const needsReview = processed.filter(t =>
    t.classification === 'transfer' && !t.isDuplicate
  );

  return {
    bank,
    accountInfo,
    fileHash,
    allTransactions: processed,
    expenses,
    excluded,
    needsReview,
    stats: {
      total: processed.length,
      expenses: expenses.length,
      excluded: excluded.length,
      needsReview: needsReview.length,
      duplicates: processed.filter(t => t.isDuplicate).length
    }
  };
}

function classifyTransaction(transaction: any): string {
  const desc = transaction.description.toLowerCase();

  // Investment operations
  if (desc.includes('apl.bb fundos') || desc.includes('resg.bb fundos')) {
    return 'investment';
  }

  // Government operations (for government accounts)
  if (desc.includes('repasse') || desc.includes('fpe/fpm') ||
      desc.includes('deb.distribuição estadual')) {
    return 'ignore';
  }

  // Income
  if (transaction.type === 'C' &&
      (desc.includes('recebimento') || desc.includes('transferência recebida'))) {
    return 'income';
  }

  // Definite expenses
  if (desc.includes('pagamentos diversos') ||
      desc.includes('saque sem cartão') ||
      desc.includes('bb cp admin')) {
    return 'expense';
  }

  // Transfers (needs review)
  if (desc.includes('transferência enviada')) {
    return 'transfer'; // User must decide if expense or internal
  }

  // Default: if debit, probably expense
  if (transaction.type === 'D') {
    return 'expense';
  }

  return 'ignore';
}

function extractMerchant(description: string): string {
  // Remove common prefixes
  let clean = description
    .replace(/\+ Transferência enviada/i, '')
    .replace(/Pagamentos Diversos/i, '')
    .replace(/\d{2}\/\d{2}\s+\d{4}\s+/g, '') // Remove dates
    .replace(/\d{3}\.\d{3}\.\d{3}\.\d{3}\.\d{3}/g, '') // Remove account numbers
    .trim();

  // Extract merchant from transfer details (often on next line)
  // Example: "28/11 3793 70000-2 GEPR CONTA REC" → "GEPR"
  const match = clean.match(/\d{4}\s+([A-Z\s]+)/);
  if (match) {
    return match[1].trim();
  }

  // Normalize
  return clean
    .split('\n')[0] // Take first line only
    .substring(0, 50) // Limit length
    .trim();
}
```

### Frontend Components - Enhanced

#### New Page: `/import-statement`

**UI Flow:**

**Step 1: Upload & Detection**
```tsx
<FileUploadZone>
  <p>Upload your bank statement (PDF)</p>
  <p className="text-sm text-muted">We support: Banco do Brasil, Itaú, Bradesco, Nubank, Caixa</p>
</FileUploadZone>

// After upload, show:
<Alert>
  ✅ Detected: Banco do Brasil
  📄 Account: 3793-1 / 12034-0
  📅 Period: November 2018
  📊 45 transactions found
</Alert>
```

**Step 2: Smart Preview with Filters**
```tsx
<Tabs>
  <TabsList>
    <TabsTrigger value="expenses">
      💸 Expenses (12)
      <Badge>Will Import</Badge>
    </TabsTrigger>
    <TabsTrigger value="excluded">
      🚫 Excluded (28)
      <Badge>Auto-filtered</Badge>
    </TabsTrigger>
    <TabsTrigger value="review">
      ⚠️ Needs Review (3)
      <Badge>Your Decision</Badge>
    </TabsTrigger>
    <TabsTrigger value="duplicates">
      ♻️ Duplicates (2)
      <Badge>Already Imported</Badge>
    </TabsTrigger>
  </TabsList>

  <TabsContent value="expenses">
    <ImportPreviewTable
      transactions={expenses}
      editable={true}
      showCategoryDropdown={true}
    />
  </TabsContent>

  <TabsContent value="excluded">
    <ImportPreviewTable
      transactions={excluded}
      editable={false}
      showReason={true}
    />
    // Shows: "Investment operation (auto-excluded)"
    // Shows: "Income transaction (not an expense)"
  </TabsContent>
</Tabs>
```

**Step 3: Review Ambiguous Transactions**
```tsx
<Card>
  <CardHeader>
    <CardTitle>⚠️ These transactions need your decision</CardTitle>
  </CardHeader>
  <CardContent>
    {needsReview.map(t => (
      <div key={t.id} className="border p-4 mb-2">
        <div className="flex justify-between">
          <div>
            <p className="font-medium">{t.merchant}</p>
            <p className="text-sm text-muted">{t.originalDescription}</p>
            <p className="text-sm">R$ {formatCurrency(t.amount)}</p>
          </div>
          <RadioGroup>
            <RadioGroupItem value="expense" label="💸 It's an expense" />
            <RadioGroupItem value="transfer" label="🔄 Internal transfer (skip)" />
            <RadioGroupItem value="exclude" label="🚫 Not an expense" />
          </RadioGroup>
        </div>
      </div>
    ))}
  </CardContent>
</Card>
```

**Step 4: Confirm Import**
```tsx
<ImportSummary>
  <h3>Ready to import</h3>
  <dl>
    <dt>✅ Expenses to import:</dt>
    <dd>12 transactions</dd>

    <dt>💰 Total amount:</dt>
    <dd>R$ 3.456,78</dd>

    <dt>🚫 Auto-excluded:</dt>
    <dd>28 (investments, government transfers, income)</dd>

    <dt>♻️ Duplicates skipped:</dt>
    <dd>2</dd>
  </dl>

  <Button onClick={handleImport}>
    Import 12 Expenses
  </Button>
</ImportSummary>
```

---

## Brazilian Bank Format Support

### Banco do Brasil (PDF)
**Pattern:**
```
Dt. movimento  Histórico                        Documento      Valor R$         Saldo
06/11/2018     RECEBIMENTO DE ICMS              350            3.372.304,31 C
```

**Parsing Strategy:**
- Split by newlines
- Regex: `(\d{2}/\d{2}/\d{4})\s+(.+?)\s+(\d+(?:\.\d+)*)\s+([\d.,]+)\s+([CD])`
- Handle multi-line descriptions

### Itaú (PDF)
**Pattern:**
```
Data       Lançamento                           Valor (R$)    Saldo
10/11      PGTO CONTA ENERGIA                   -150,00       2.500,00
```

**Parsing Strategy:**
- Negative amounts = debits
- Positive amounts = credits

### Nubank (CSV)
**Pattern:**
```csv
date,category,title,amount
2018-11-10,transaction,Uber Trip,-25.50
```

**Parsing Strategy:**
- Standard CSV parsing
- Negative = expense, Positive = income

---

## Example Transactions Classification

| Description | Type | Classification | Reason |
|-------------|------|----------------|--------|
| `Pagamentos Diversos UBER *TRIP` | D | ✅ Expense | Payment |
| `Saque sem cartão` | D | ✅ Expense | ATM withdrawal |
| `BB CP Admin Diferenciado` | D | ✅ Expense | Bank fee |
| `+ Transferência enviada RESTAURANTE X` | D | ⚠️ Review | Could be expense or internal |
| `Apl.BB Fundos Exclusivos` | D | 🚫 Exclude | Investment |
| `Resg.BB Fundos Exclusivos` | C | 🚫 Exclude | Investment |
| `RECEBIMENTO DE ICMS` | C | 🚫 Exclude | Government income |
| `FPE/FPM` | C | 🚫 Exclude | Government transfer |
| `+ Transferência recebida` | C | 🚫 Exclude | Income |
| `Repasse` | C | 🚫 Exclude | Government repasse |
| `SALARIO` | C | 🚫 Exclude | Salary |

---

## Testing with Real Data

### Test PDF Files
Create fixtures with real-world patterns:
- `fixtures/bb-statement-government.pdf` - Government account (exclude repasses)
- `fixtures/bb-statement-personal.pdf` - Personal account (include most debits)
- `fixtures/itau-statement.pdf` - Different bank format
- `fixtures/nubank-statement.csv` - CSV format

### E2E Test Cases
```typescript
test('should correctly filter government account transactions', async ({ page }) => {
  await page.goto('/import-statement');
  await page.setInputFiles('input[type=file]', 'fixtures/bb-statement-government.pdf');

  // Should auto-exclude repasses
  await expect(page.getByText('28 auto-excluded')).toBeVisible();
  await expect(page.getByText('Repasse')).toBeInViewport(); // In excluded tab

  // Should include actual expenses
  await expect(page.getByText('12 expenses')).toBeVisible();
  await expect(page.getByText('Pagamentos Diversos')).toBeInViewport(); // In expenses tab
});

test('should handle multi-line transfer descriptions', async ({ page }) => {
  // Transfer with merchant on second line should extract merchant correctly
  await page.goto('/import-statement');
  await page.setInputFiles('input[type=file]', 'fixtures/bb-transfer-multiline.pdf');

  const merchantCell = page.locator('table tbody tr:first-child td:nth-child(2)');
  await expect(merchantCell).toContainText('UBER'); // Not "Transferência enviada"
});
```

---

## Success Metrics

**Adoption:**
- 60% of users try import feature in first 2 weeks
- 80% of users who try it, use it monthly

**Accuracy:**
- Auto-classification accuracy: >90%
- False positive rate (wrong exclusions): <5%
- Merchant extraction accuracy: >85%

**Efficiency:**
- Average import: 30 transactions in <10 seconds
- User review time: <2 minutes per statement
- Duplicate detection accuracy: >98%

---

## Future Enhancements (Not in MVP)

- [ ] Support for credit card invoices (different format)
- [ ] Support for OFX format
- [ ] Support for QIF format
- [ ] Excel (XLSX) import
- [ ] Automatic monthly imports (connect to bank API via Open Banking)
- [ ] Machine learning for better merchant extraction
- [ ] Auto-categorization learning from user corrections
- [ ] Split transactions (one bank entry → multiple expense categories)
- [ ] Reconciliation view (match imported with manually added)

---

**Priority:** CRITICAL (Top user pain point)
**Estimated Effort:** 5-7 days
**Target Release:** v9.1.0

**Implementation Order:**
1. Day 1-2: PDF parsing with Claude AI + Brazilian number format handling
2. Day 3: Smart transaction classification logic
3. Day 4: Frontend UI (upload, preview, filter tabs)
4. Day 5: Review flow for ambiguous transactions
5. Day 6: Duplicate detection + import execution
6. Day 7: Testing with real bank PDFs + polish

---

**End of Enhanced Prompt**

Please implement this feature with special attention to Brazilian bank statement formats and intelligent transaction filtering to provide a seamless import experience.
