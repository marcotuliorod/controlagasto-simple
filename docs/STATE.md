# Project State

Living snapshot of where the project stands. Update at the end of any session that ships a change — this is what the next session (human or agent) reads first to avoid re-discovering context.

## Current focus
Desacoplamento da plataforma Lovable (objetivo 1.1), fases 0-6 concluídas no branch `chore/desacoplamento-lovable`. **Zero dependência de runtime do Lovable.** O que falta é operacional, não de código: subir o serviço de IA e apontar `AI_SERVICE_URL`, rotacionar as credenciais do `.env` que estavam versionadas, e escolher o provedor de IA definitivo.

Antes disso, `.planning/ROADMAP.md` Fases 1-4 (onboarding etc.) já estavam completas.

## Remoção do lançamento manual e do OCR (19/08/2026)

> **Status de entrega: em produção desde 19/08/2026.** PR #12 entrou na
> `fix/e2e-quarentena` e PR #11 entrou na `main` (merge `291f16d`); a Vercel
> publicou o deploy `dpl_43PzLHhCktbppCU1N5YRi8Na9zpx` (state `READY`).
> Conferido no bundle servido em `controlagasto-simple.vercel.app`
> (`/assets/index-DLlwynCV.js`): zero ocorrência de `AddExpense`, `QuickAdd`,
> `FABAdd`, `Adicionar Despesa` e `process-receipt`; `/add-expense` aparece só
> como `<Navigate to="/import-transactions" replace>`; e o `autoUpdate` está lá
> (`addEventListener("activated", … window.location.reload())`), com
> `onNeedRefresh` presente apenas na desestruturação interna do plugin, não
> passado pelo app.
>
> **Migration aplicada.** `20260819120000_importacao_sem_desbloqueio` está no
> topo de `supabase_migrations.schema_migrations` em produção e
> `unlock_requirements` tem 0 linhas para `import-transactions`. Conferida
> também a cadeia que dependia disso: `accounts` (5 despesas), `chat` (10),
> `scheduled-exports` (20) e `audit-logs` (30) voltaram a ser alcançáveis, que
> era o risco em cascata. `recurring-expenses` segue atrás de 60% no quiz, e
> está certo — não é porta de entrada de gasto, é regra sobre gasto existente.
>
> A verificação em aba anônima (sem FAB, `/add-expense` redirecionando,
> cadastro novo importando CSV, Cmd+K, recorrentes, PWA instalado recarregando)
> foi feita pelo dono do produto em 19/08/2026 e não acusou problema.

Decisão de produto: gasto entra **só** por importação de extrato/fatura. Saíram
`/add-expense` (446 linhas), o FAB, o drawer de adição rápida, o
`CategoryQuickPicker`, o hook `useCategorySuggestion` e todo o caminho de OCR de
cupom — `supabase/functions/process-receipt`, `services/ai/domain/DocumentExtraction.ts`,
`prompts/receipt.ts` e a rota `/v1/receipt` do serviço de IA.

- **A rota `/add-expense` não foi apagada, virou redirect** para
  `/import-transactions`. O app é PWA com service worker: shell já instalado e
  link antigo continuariam apontando para lá, e um 404 seria pior que um
  redirect de uma linha.
- **A importação teve de sair do sistema de desbloqueio.** Ela estava em nível 5
  (`unlock_requirements`), atrás de "2 artigos de Orçamento ou 70% no Quiz".
  Com o lançamento manual fora, isso deixaria todo usuário novo sem **nenhuma**
  forma de registrar despesa — e travaria em cascata os desbloqueios que exigem
  contagem de despesas (`accounts`, `chat`, `scheduled-exports`, `audit-logs`),
  que ficariam inalcançáveis. Migration `20260819120000_importacao_sem_desbloqueio.sql`
  remove a linha, e `import-transactions` entrou em `ALWAYS_UNLOCKED`.
- **Nada foi dropado do schema.** `expenses.receipt_url`, `expenses.source` e o
  bucket privado `receipts` continuam de pé: guardam dado histórico de quem já
  usou o OCR, e `delete-account` continua purgando o bucket. Limpeza de schema,
  se vier, é decisão separada e destrutiva.
- **A suíte de JWT do serviço de IA estava ancorada em `/v1/receipt`** — testava
  autenticação usando aquele endpoint como cobaia. Repontada para `/v1/statement`;
  os 74 testes de `services/ai` seguem passando.
- **E2E:** `ocr-basic.spec.ts` e `tags-notes.spec.ts` (8 testes, todos `fixme` e
  todos contra `/add-expense`) foram removidos; `expense-crud.spec.ts` perdeu
  criação e as duas validações de formulário, e ganhou um teste do redirect.
- **Efeito no bundle:** 99 → 95 chunks, precache 2377 KiB → 2330 KiB. O `vaul`
  saiu do `package.json` junto com `ui/drawer.tsx`, que só o drawer rápido usava.
  Ganho real, porém modesto — o peso do PWA está nas libs de gráfico, não aqui.

## Fim da quarentena E2E (19/08/2026)

Os últimos 23 testes em `test.fixme` foram tratados: **21 reativados, 2
removidos**. Zero marcadores de quarentena restam em `e2e/`. Rodando os dois
projetos do CI com `--workers=1`: **101 passed, 0 failed**.

- **Quase nada era problema de teste.** Três causas explicavam a maior parte:
  `selectOption()` usado num Select do Radix (que é botão + listbox em portal,
  não `<select>`); `window.confirm()` **dispensado** pelo Playwright quando não
  há listener, o que fazia toda exclusão silenciosamente não acontecer; e
  botões de ação sem nome acessível. Viraram os helpers `selectRadixOption` e
  `acceptNativeConfirm` em `e2e/fixtures/test-data.ts`.
- **Três bugs de produto saíram junto.** Datas de recorrência apareciam um dia
  antes (`new Date("YYYY-MM-DD")` em UTC-3); os `<Label htmlFor>` dos Selects
  apontavam para id nenhum; e o **tooltip do ciclo em Relatórios nunca abria
  para ninguém** — o gatilho era o ícone, e a classe base do `Button` traz
  `[&_svg]:pointer-events-none`. Era defeito de produto, não do teste.
- **Sumiu o padrão `if (await x.isVisible())`** que embrulhava as asserções:
  com seletor errado, o teste passava sem testar nada. Onde o estado é
  legitimamente ambíguo (o usuário de teste não tem despesas, porque o
  lançamento manual não existe mais), o teste declara isso via `.or()`.
- **`signOut()` do Supabase tem escopo `global` por padrão**
  (`AppSidebar.tsx:159`). O teste de logout usava o `storageState`
  compartilhado e revogava os refresh tokens do usuário único da suíte,
  derrubando 16 specs que rodavam em paralelo — cada um passando sozinho. O
  teste passa a criar conta própria. **A implicação de produto foi corrigida
  em seguida:** o botão de sair agora usa `scope: 'local'`, então sair no
  desktop não desloga mais o celular. Derrubar todas as sessões de propósito
  (senha vazada, aparelho perdido) exigiria uma ação explícita de "sair de
  todos os dispositivos", que não existe hoje.
- **Mobile Chrome passou a valer.** O CI roda
  `--project=chromium --project="Mobile Chrome"`, mas os dois compartilham
  `storageState` — logo, um usuário e um banco. Nome fixo fazia a segunda
  passagem reencontrar o registro da primeira; por isso os nomes criados nos
  testes passam por `uniqueLabel()`.
- **O CI ganhou um teste de fumaça do edge runtime.** Ele morre calado por OOM
  (`Exited 137`), e o sintoma vira teste de export vermelho em vez de erro de
  infra — custou horas de diagnóstico aqui. O passo falha o job com mensagem
  explícita se `get-vapid-public-key` responder 503.

## Desacoplamento do Lovable (fases 0-6)

- **O lock-in real eram 4 edge functions** chamando `ai.gateway.lovable.dev`. O resto (`lovable-tagger`, metas do `index.html`, `playwright-fixture.ts` órfão) era cosmético — o build de produção já estava limpo.
- **A camada de IA virou serviço próprio** (`services/ai`, Node/Hono), provider-agnostic: `domain/` só conhece a interface `LLMProvider`, e `config.ts` é o único lugar que escolhe o adapter. Testável sem rede e sem chave via `providers/fake.ts`.
- **Fase 3 desviou do plano aprovado, de propósito.** O plano dizia migrar os 4 call sites do frontend; medindo, as edge functions não são invólucros finos (chat-assistant faz 8 queries + 3 escritas, persiste conversa e faz rate limit; process-import-file tem 1068 linhas de parsing determinístico). Apontar o frontend direto perderia tudo isso. Em vez disso, as edge functions passaram a chamar o serviço — frontend intocado.
- **Fase 4 inverteu a ordem do import.** O PDF ia inteiro ao modelo e o `bankPatterns.ts` rodava depois, sobre a saída dele. Agora: texto extraído localmente (~70ms) → regra determinística → IA só se o layout não for reconhecido (com PII redigida) → PDF inteiro só se for escaneado.
- **Três defeitos só apareceram testando contra a API real**, nenhum seria pego pelo provider fake: (1) qualquer 4xx era marcado re-tentável, então chave inválida era retentada 3x; (2) `gemini-2.5-flash`, o modelo do gateway antigo, responde 404 "no longer available to new users" para chaves novas — o que derrubou minha justificativa de "provar paridade com o mesmo modelo"; (3) em modelos com raciocínio, os tokens de thinking saem do mesmo `maxOutputTokens` (631 pensando para 53 de resposta), e o limite de 800 herdado truncava o chat.
- **Fase 5 revelou uma dependência oculta de plataforma.** Subindo o stack local, `authenticated` não tinha SELECT em nenhuma das 27 tabelas: não há GRANT de tabela nem ALTER DEFAULT PRIVILEGES em migration alguma — a plataforma fornecia isso no bootstrap. Sem a migration nova, qualquer ambiente novo sobe com o banco correto e o app quebrando em 403.

## Performance hardening decisions (PERF-01/02/03)

- **Reports.tsx (PERF-01)**: the expense query stays unbounded on purpose — the KPI totals, monthly-comparison chart, and category breakdown all need the full result set for the selected date range to be correct; paginating the query would make those numbers wrong. The actual "unresponsive with 1,000+ expenses" problem was the render: the expense list at the bottom mounted one full DOM node per row with zero windowing. Virtualized it with `@tanstack/react-virtual` (`useVirtualizer` + fixed-height scroll container + absolute-positioned rows), reusing the exact pattern already established in `src/pages/ExpensesVirtualized.tsx` rather than inventing a new one.
- **useGamification.ts's `useUnlockProgress` (PERF-02)**: its 6 independent Supabase reads (education progress, educational content, quiz responses, quiz questions, expense count, expense dates) ran as sequential `await`s — one full round-trip waiting for the previous to finish. Wrapped them in `Promise.all` instead, so total latency is ~the slowest of the 6 rather than the sum of all 6. Did **not** write a new SQL RPC to consolidate them into one HTTP request (which is what "single batched query/RPC" in the roadmap literally asks for): that needs a migration authored and tested against the live schema, and this environment has no working Supabase DB access (CLI unauthenticated, MCP tool denied for this project — same constraint noted in Phase 2). `Promise.all` fixes the actual harm (a slow sequential waterfall) without shipping untested SQL.
- **Console logging (PERF-03)**: `src/lib/realtimeLogger.ts` was already correctly gated behind `import.meta.env.DEV` (`error` always logs, everything else doesn't) — the roadmap's own example ("realtime updates") turned out to be a non-issue. The real untreated hot paths were `src/providers/PWAInstallProvider.tsx` (23 `console.log` + 3 `console.warn`, fires on every single app load for every user — it's a top-level provider) and `src/main.tsx` (8 `console.log`, fires on every boot). Added `src/lib/logger.ts` (`devLog`/`devWarn`, same convention as `realtimeLogger.ts`) and applied it there plus the smaller remaining call sites (`Settings.tsx`'s diagnostic button was already unreachable in production — it's inside its own `{import.meta.env.DEV && ...}` block, so left untouched; `Reports.tsx`, `InstallPWA.tsx`, `usePushNotifications.ts` updated for consistency). Left every `console.error` alone — already the correct, existing convention (errors stay visible in production to debug real user issues). Verified with a real production build (`npm run build && npm run preview`) driven by Playwright: 0 console messages on load in production vs. 26+ PWA-prefixed logs in dev mode — the gate works both directions.

## Guided onboarding decisions (ONBD-01/02/03)

- **Wizard (ONBD-01)**: two different "onboarding" concepts already coexisted in the codebase — `RequireOnboarding.tsx`'s route gate (checks for a `monthly_goals` row in the current month) vs. `profiles.onboarding_completed` (owned entirely by the unrelated gamification welcome-modal flow, `OnboardingWelcomeModal.tsx`/`useCompleteOnboarding`). Deliberately kept them separate: the new 3-step wizard (`src/pages/Onboarding.tsx`) still creates the same `monthly_goals` row as the old single-screen form did, so `RequireOnboarding.tsx` needed zero changes. Step 3 (first account) is genuinely new — extracted `AccountFormFields` out of the Dialog-wrapped `AccountForm.tsx` so the same form fields work both standalone (wizard) and inside the existing modal (`Accounts.tsx`, confirmed as its only other consumer).
- **First-visit tooltips (ONBD-02)**: no tour/tutorial library was installed (no `react-joyride`/`driver.js`); built `FirstVisitTip.tsx` on the existing Radix `Tooltip` primitive instead, controlled via `open`/`onOpenChange` (same technique `LockedMenuTooltip.tsx` already demonstrated), forcing it open on first visit and persisting dismissal via a `localStorage` key (`tip-seen-${id}`) — same convention already used twice in this codebase (`PushOnboarding.tsx`'s `push-onboarding-seen`, `InstallPWA.tsx`'s `pwa-install-dismissed`). Applied once per section (Dashboard/Reports/Accounts), not a multi-step guided tour — the requirement asked for contextual tooltips, not a tour.
- **Auto theme (ONBD-03)**: added `profiles.theme_preference` (nullable, `CHECK IN ('light','dark')`) via a new additive migration — same "no live Supabase DB access in this environment" constraint noted in Phases 2-3 (CLI unauthenticated, MCP tool permission denied), but judged low-risk enough to include anyway (unlike Phase 3's RPC consolidation, which was complex enough to defer): a bare `ALTER TABLE ADD COLUMN` can't break existing rows or queries. `useAutoTheme.ts` computes light (6h-18h) vs. dark (18h-6h) from local time when no override is set, revalidating on `visibilitychange` rather than a polling interval; `ThemeToggle.tsx`'s manual click now also calls a new `useUpdateThemePreference` mutation so the override persists to the profile (and therefore across devices), always winning over the time-of-day calculation from then on.

## Dependency security decisions (SEC-01)

Ran `npm audit` fresh (7 findings, same set as before) and checked whether each is actually fixable without a breaking change, rather than re-running `npm audit fix` blind:

- **`vitest`/`@vitest/ui` (critical, dev-only)** — looked fixable within the declared `^4.0.1` range, but isn't: `vitest@4.1.x` (the patched line) requires `vite: ^6.0.0 || ^7.0.0 || ^8.0.0` as a peer dependency. We're on `vite@5.4.19`, so fixing this transitively requires the same major Vite bump as the next item. Deferred together.
- **`vite`/`esbuild` (moderate/high, dev-only)** — fix requires Vite 6+ (vulnerable range is `<=6.4.2`, our declared range tops out at `5.4.x`). Dev-server-only exposure (arbitrary site can hit the local dev server while `npm run dev` is running) — doesn't affect the production bundle. Deferred: a Vite major bump is a real migration project (config changes, plugin compat), not a hardening-pass fix.
- **`react-router-dom` (moderate, production dependency)** — 6.30.4 (installed) is the latest 6.x release; the fix is only in 7.18+ (major, breaking). Checked exploitability instead of blindly upgrading: one of the two CVEs is about SSR hydration, which doesn't apply (this is a client-only Vite SPA, no SSR). The other is an open-redirect via backslash in `<Link>`/`useNavigate` when the destination comes from attacker-controlled input — audited every `navigate()`/`<Link to={}>` in the codebase and found none take their destination from user input (URL params, form fields); they're all static routes or app-controlled database UUIDs (e.g. `navigate(\`/expenses/${expense.id}/edit\`)`). Not exploitable as currently used. Deferred the v7 upgrade; mitigated by design.
- **`xlsx` (high, production dependency, no upstream fix)** — checked actual usage instead of accepting the severity label at face value: `src/lib/exportUtils.ts` only calls the *write* path (`XLSX.utils.json_to_sheet`/`book_new`/`writeFile`) on the app's own expense data; grepped the whole repo and confirmed `XLSX.read`/`readFile` (the vulnerable *parse* path both CVEs require) is never called anywhere. The vulnerable code path isn't exercised by this app.

None of the 7 findings were silently ignored — each has a decision above. None are fixable without a breaking major-version bump this phase intentionally didn't take on.

## Edge function auth audit (SEC-02)

Read all 13 `supabase/functions/*/index.ts` end to end (not a grep-and-assume pass):
- 9 user-facing functions correctly verify the JWT (`supabase.auth.getUser(token)`, checking both `error` and `!user`) before doing anything sensitive.
- 3 cron-triggered functions (`notify-goal-threshold`, `process-recurring-expenses`, `process-scheduled-exports`) correctly use `X-Cron-Secret` compared against `Deno.env.get('CRON_SECRET')` instead of a JWT — there's no end user to authenticate for a scheduled job, so this is the right pattern, not a gap.
- `send-push-notification` correctly accepts either mode (cron secret or user JWT).
- **Found and fixed a real gap: `process-receipt`.** It only checked that the `Authorization` header was non-empty (`if (!authHeader) throw`) — any string satisfied that — and called the paid Lovable AI OCR endpoint *before* any real validation. A `getUser(token)` call existed further down but never checked `error`/`!user`, so an invalid token just silently skipped the receipt-image storage upload while still returning the AI-extracted data. Fixed: JWT is now verified (`error`/`!user` both checked) before the OCR call, matching the pattern every other function already used. Also fixed `CLAUDE.md`'s own documented "Auth Pattern in Edge Functions" snippet, which omitted the `error`/`!user` check — likely why this one function drifted.

## Recently shipped
- **O PWA instalado passou a se atualizar sozinho.** `registerType: 'prompt'`
  (`vite.config.ts`) virou `'autoUpdate'`. Com `'prompt'`, quem tinha o app
  instalado continuava com o bundle antigo — que ainda tem o drawer de
  lançamento manual — até aceitar um `confirm()`; e como não há trava no banco
  (decisão em `CONTEXT.md`), esse shell velho ainda conseguia inserir despesa
  à mão. `public/sw.js` já chamava `skipWaiting()` e `clientsClaim()` (linhas
  12-13), que é o que o `autoUpdate` exige na estratégia `injectManifest`, então
  não foi preciso tocar no service worker. O `onNeedRefresh` com `confirm()` saiu
  de `src/main.tsx`: no modo `autoUpdate` o vite-plugin-pwa nem chama esse
  callback — ele escuta `activated` e dá `window.location.reload()` sozinho
  (conferido no bundle gerado, não só na doc). Contrapartida aceita: a página
  recarrega sem avisar, e quem estiver no meio do assistente de importação perde
  o passo.
- **Três testes que passavam sem testar nada viraram testes de verdade.**
  Criar dado real (o spec da importação) expôs o que a ausência de dado
  escondia: `expense-crud` procurava linhas por `[class*="expense"]`, que não
  casa com nada na lista virtualizada (as linhas são `role="listitem"` dentro
  de `role="list"` "Lista de despesas"), e ainda embrulhava tudo em
  `if (isVisible)` — listar, editar e excluir nunca exercitaram nada; o teste
  de edição chegava a asserir a URL `/expenses/edit`, que não existe. Em
  `reports-cycle`, `#reports-total-card` também não casava com nada:
  "reports-total-card" é o `id` do `FirstVisitTip` (chave de localStorage), não
  um id de DOM — o teste vivia do ramo do estado vazio. Ambos corrigidos contra
  o DOM real, tolerando lista vazia porque a ordem alfabética pode rodar
  `expense-crud` antes de `import-transactions` num banco limpo.
- **Corrida no `signUpAndOnboard` que derrubava execuções inteiras.** O modal
  de boas-vindas da gamificação era dispensado com "Pular (Desbloquear Tudo)",
  mas `handleSkip` fecha o diálogo na hora e deixa o UPDATE de `profiles`
  correndo solto; salvar o `storageState` e fechar o contexto logo depois
  cancelava a requisição. Quando o UPDATE perdia a corrida, o modal reabria em
  toda página da execução seguinte e ~14 testes caíam em bloco com "element not
  found" — o diálogo tira o resto da árvore de acessibilidade do caminho. Pior:
  o `catch {}` do helper engolia a falha e o projeto `setup` passava verde.
  Agora o helper espera o toast de confirmação, que só sai depois do banco
  responder.
- **A importação ganhou spec E2E** (`e2e/import-transactions.spec.ts`,
  19/08/2026): CSV com dois débitos e um crédito → prévia (2 despesas, 1
  auto-excluído, 0 duplicados) → resumo → confirmação → a despesa aparece
  filtrada em `/expenses`; mais a recusa de formato não suportado. Verde nos
  dois projetos com `--workers=1`, rodado duas vezes seguidas para provar que
  a segunda passagem não tropeça na primeira. Três armadilhas viraram
  comentário no arquivo, porque cada uma quebrou o teste antes: o
  `checkDuplicates()` casa comerciante pelos **10 primeiros** caracteres (com
  o token de unicidade no fim do nome, a segunda passagem marcava tudo como
  duplicata e a aba Despesas ia a 0 — o token passou a ser prefixo);
  `extractMerchant()` apaga sequências de 5+ dígitos (o token é só de letras);
  e o aviso do gamification também é `role="alert"`, então a asserção do erro
  precisa filtrar por texto.
- **Resíduos da remoção do lançamento manual limpos** (branch
  `chore/limpeza-lancamento-manual`, sobre `fix/e2e-quarentena`): fixtures E2E
  órfãs (`TEST_EXPENSE`, `TEST_CATEGORIES`, `TEST_ACCOUNT`, `formatCurrency`);
  `GlobalSearch.tsx` navegava para `/edit-expense/:id`, rota que nunca existiu
  — clicar numa despesa no Cmd+K caía no NotFound, agora vai para
  `/expenses/:id/edit`; a landing (`Index.tsx`) ainda prometia "Manual ou por
  foto do cupom", duas capacidades que não existem; docs de estado atual
  sincronizadas (CLAUDE.md, PRD, testing, ROUTES, FEATURES, HOOKS, SECURITY,
  sprint-7); `src/pages/Expenses.tsx` (313 linhas, órfão desde a virtualização)
  removido. Uma migration duplicada pelo iCloud
  (`...desbloqueio 2.sql`, byte-a-byte idêntica) foi apagada — nome com espaço
  e timestamp repetido pode quebrar `supabase db push`; era gitignored, não
  gerou commit.
- **Logout deixou de derrubar as outras sessões do usuário** (`AppSidebar.tsx`): `signOut({ scope: 'local' })`. O `handleSignOut` idêntico em `Dashboard.tsx:202` é código morto — nada o chama — e ficou como estava. O de `DeleteAccount.tsx` segue global de propósito: a conta acabou de ser apagada.
- **Quarentena E2E encerrada** (branch `fix/e2e-quarentena`, PR #11). Ver seção acima. 101 testes verdes em chromium + Mobile Chrome com `--workers=1`, contra stack Supabase local com o edge runtime vivo.
- **Desacoplamento do Lovable, fases 0-6** (branch `chore/desacoplamento-lovable`). Ver seção acima. Verificado num stack Supabase local real: 30 migrations aplicam limpas, 27 tabelas, 0 sem RLS, triggers de signup funcionam, e o RLS isola de fato (com dois usuários, o intruso recebe 0 linhas ao pedir dados do outro). Isso também fechou dois itens que estavam em aberto aqui: a migration `theme_preference` da Fase 4 nunca testada contra banco real (agora testada, inclusive o CHECK rejeitando valor inválido) e o CI quebrado por `npm run typecheck` inexistente.
- **Phase 4 (ONBD-01/02/03) complete.** See "Guided onboarding decisions" above. `src/pages/Onboarding.tsx` rewritten as a 3-step wizard; `AccountFormFields` extracted from `AccountForm.tsx`; new `FirstVisitTip.tsx` wired into Dashboard/Reports/Accounts; new `profiles.theme_preference` migration + `useAutoTheme.ts` + `ThemeToggle.tsx`/`useProfile.ts` updates. 7 new tests (135/135 total passing, up from 128). Verified: lint 0 errors/17 pre-existing warnings, `tsc --noEmit` clean, production build clean, dev server boots with 0 console errors (Playwright smoke test). Full interactive wizard/theme-switch flows were **not** manually verified against a logged-in user — no live Supabase auth available in this environment (same constraint as the DB-access items below).
- **Phase 3 (PERF-01/02/03) complete.** See "Performance hardening decisions" above. `src/pages/Reports.tsx` (virtualized list), `src/hooks/useGamification.ts` (`Promise.all`), new `src/lib/logger.ts` + 5 call-site files updated for logging. No behavior change for end users — same data, same UI, just fewer DOM nodes / fewer round-trips / less console noise.
- **Phase 2 (SEC-01/02) complete.** See sections above for the dependency and auth-audit decisions. `supabase/functions/process-receipt/index.ts` fixed; `CLAUDE.md` auth-pattern doc corrected. No dependency version changes this phase (both "safe" fixes turned out to require the same deferred Vite major bump).
- **Phase 1 (QUAL-01/02/03) complete.** `npm run lint` errors: 97 → 0 (all 76 `@typescript-eslint/no-explicit-any` replaced with real types/`unknown`/narrow justified casts, not suppressed; plus 21 mechanical fixes — `no-useless-escape`, `prefer-const`, `no-empty-object-type`, `no-control-regex`, `no-require-imports`). Along the way found and fixed a real bug: `Reports.tsx`'s XLSX export always wrote an empty `notes` column because the query never selected it. New unit test coverage: `useBillingCycle.test.ts` (6 tests), `src/lib/bankPatterns.test.ts` (18 tests — this is where bank-format detection actually lives, not in the hook), `useImportTransactions.test.ts` (7 tests). Full suite: 128/128 passing across 16 files.
- Fixed billing-cycle timezone bug (`getDateBillingCycle`/`formatDateRange` in `src/lib/dateRange.ts` no longer parse `YYYY-MM-DD` strings through UTC — was misclassifying a date landing exactly on the cycle day into the previous cycle in negative-UTC-offset zones). Removed the orphaned, unused `src/lib/dateRangeTimezone.ts`.
- Fixed PDF export stripping all accented Portuguese characters (`supabase/functions/export-pdf/index.ts` `escapeText` was removing `\x7F-\xFF`, which is the WinAnsiEncoding range covering á/ç/ã/é/etc — now only strips true control chars).
- Wired up the test scripts (`test`, `test:ui`, `test:e2e*`) that `CLAUDE.md` already documented but `package.json` was missing; scoped Vitest to unit tests only (`e2e/**` and, later, `.claude/**`/`.agents/**`/`.planning/**` vendored-tooling test fixtures were being picked up and false-failing); added `src/test/setup.ts` for shared PWA/serviceWorker/matchMedia/PushManager mocks; fixed several pre-existing test-authoring bugs (Vitest mock hoisting, stale UI text assertions, missing `#root` in jsdom).
- Applied `npm audit fix` (27 → 7 vulnerabilities; remaining are dev-only tooling, `xlsx` with no upstream fix, and one `react-router` moderate issue needing a breaking major bump — not applied without confirmation).
- Installed `gsd-core` (project planning/phase-loop tooling) and the `caveman` skill (output compression) under `.claude/`/`.agents/`; ran onboarding (`/gsd-map-codebase` → `/gsd-ingest-docs` → `gsd-roadmapper`) producing `.planning/codebase/*`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`. `eslint.config.js` and `vite.config.ts` both needed a `.claude`/`.agents`/`.planning` exclude added afterward — the vendored tooling's own files/tests were otherwise getting swept into this project's lint and test runs (lint briefly went 97→537; a caveman test fixture briefly broke `npx vitest --run`).

## Known open items
- **`supabase db push --linked` não funciona neste projeto.** O CLI 2.114 tenta
  criar um papel temporário `cli_login_postgres` e o banco recusa (`permission
  denied to alter role` — a conta não tem CREATEROLE nem ADMIN sobre ele). O
  contorno é `--db-url` com a connection string do pooler, que conecta como
  `postgres` e não passa por esse mecanismo. O host é
  `aws-1-us-east-1.pooler.supabase.com` na porta 5432 (session mode); com
  `aws-0` o servidor responde `tenant/user not found`, e com 6543 (transaction
  mode) migration não roda. Registrado aqui porque custou três tentativas e
  vai custar de novo na próxima migration.
- **A branch `chore/limpeza-lancamento-manual` ainda existe no remoto** e já foi
  incorporada — pode ser apagada.
- **A importação de PDF continua sem cobertura E2E.** O smoke test novo
  (`import-transactions.spec.ts`) cobre só CSV, que é o caminho determinístico;
  PDF de layout desconhecido cai na IA e exigiria `AI_SERVICE_URL` no ar.
- **A edge function corrompe acento no arquivo importado.**
  `process-import-file/index.ts:781` faz `atob(fileContent)` e trata o
  resultado como texto, sem decodificar UTF-8: cada byte vira um code point.
  Reproduzido em Node — `"PADARIA SAO JOAO ACAI ção;-12,34"` volta como
  `"PADARIA SAO JOAO ACAI Ã§Ã£o;-12,34"`. Consequências reais em extrato
  brasileiro: comerciante gravado com mojibake e cabeçalho `Descrição` não
  reconhecido pelo `autoDetectMapping`, o que joga o usuário no mapeamento
  manual de colunas. **Não corrigido de propósito:** o mesmo `content`
  alimenta o `generateFileHash()` que guarda contra reimportação, então
  decodificar direito muda o hash de todo arquivo não-ASCII e precisa de
  decisão sobre os `import_sessions` já gravados. O spec usa dados sem acento
  e comenta o porquê.
- `xlsx`, `react-router-dom`, and `vite`/`vitest` all have documented-but-unfixed advisories (see "Dependency security decisions" above) — each blocked on a major-version bump intentionally deferred, not forgotten. Revisit if: `xlsx` ever needs to parse untrusted input, a `react-router` v7 migration gets scheduled for other reasons, or a Vite major-version upgrade gets scheduled for other reasons (that would fix `vite`/`esbuild`/`vitest`/`@vitest/ui` together).
- `useUnlockProgress`'s 6 reads are parallelized but still 6 separate HTTP round-trips, not 1 — a real single-RPC consolidation is still on the table if Supabase DB access (CLI login or MCP permission) ever becomes available in this environment to test a new migration against.
- 17 ESLint warnings remain (`react-hooks/exhaustive-deps`, `react-refresh/only-export-components`) — don't block `npm run lint`, left as-is.
- **Serviço de IA não está deployado.** As edge functions exigem o secret `AI_SERVICE_URL`; sem ele, as 4 funcionalidades de IA respondem 503 (erro explícito, mas é quebra real se o branch for publicado antes de subir o serviço). Reconfirmado em 19/08/2026 pelos logs do edge runtime local: o `generate-insights` sobe e falha exatamente nessa variável, e em nada mais.
- **Credenciais do `.env` que estava versionado seguem válidas** até serem rotacionadas no painel. O arquivo saiu do índice, mas continua no histórico do git.
- **Provedor de IA ainda não decidido.** O adapter atual é Gemini, e a justificativa original (paridade com o modelo do gateway) caiu quando `gemini-2.5-flash` passou a responder 404. **Correção:** este item afirmava latência de ~19s e a usava como argumento contra o Gemini. Aquela medição foi uma única chamada, provavelmente em cold start, e não se sustentou. Medido em 17/08/2026 contra o projeto real: chat 2,9-3,1s, OCR de cupom 4s, insights 7,6s. A latência **não** é motivo para trocar de provedor; poucas amostras ainda, vale remedir com uso real.
- **`.env.example` não pôde ser criado** — regra de permissão da sessão bloqueia escrita em `.env*`. As variáveis estão documentadas no README e no `services/ai/README.md`.
- **A regra determinística do extrato foi validada só em PDF sintético.** A taxa de acerto em extratos reais (BB, Itaú, Nubank) é desconhecida; por isso o fallback é conservador. Vale medir quantos caem no fallback quando houver arquivos reais.
- **`major_version = 15`** em `supabase/config.toml` foi escolha minha e pode não bater com a versão do Postgres em produção — conferir antes de usar o self-host para valer.
- `docs/STATE.md` (this file, hand-written) and `.planning/STATE.md`/`.planning/ROADMAP.md` (gsd-core-generated) now both exist and overlap in purpose — not yet consolidated into one source of truth for "what's left to do."
- The Phase 4 wizard/tooltip/theme flows were verified via lint/typecheck/tests/build and a no-login boot smoke test only — never click-tested end-to-end as a logged-in user (blocked on the same no-live-Supabase-auth constraint as the DB items above). Worth a manual pass once real credentials/DB access exist.

## Notes for next session
**Primeira coisa:** o PR do acento — `atob(fileContent)` em
`process-import-file/index.ts:781`. Ficou combinado para depois do merge, e o
merge está feito. A parte que exige decisão, não só código, é o
`generateFileHash()`: decodificar UTF-8 corretamente muda o hash de todo
arquivo não-ASCII, então extrato já importado volta a ser importável.

A entrega da remoção do lançamento manual está **fechada** — código publicado,
migration aplicada, verificação feita. Ver a seção "Remoção do lançamento
manual e do OCR".

A quarentena E2E acabou (seção acima); o que sobra do trabalho de teste é
ligar firefox/webkit/Mobile Safari no CI, que é custo de minuto de runner, não
dívida na suíte. As duas pendências que continuam bloqueando funcionalidade são
operacionais: subir o serviço de IA e apontar `AI_SERVICE_URL`, e rotacionar as
credenciais do `.env` que estava versionado.

All 4 phases of `.planning/ROADMAP.md` are complete — this milestone's planned work is done. Nothing is queued. Next session should ask the user what's next: pick up a `.planning/REQUIREMENTS.md` v2 item, start a new `gsd-core` milestone, do the manual end-to-end verification noted above once live Supabase access is available, or handle new ad hoc requests.
