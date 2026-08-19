# Decision Context

Log of non-obvious decisions and the reasoning behind them — the "why," not the "what" (git history already has the what). Add an entry whenever a decision is made that isn't self-evident from reading the code.

## Format
```
### YYYY-MM-DD — Short title
**Decision:** what was decided
**Why:** the constraint or reasoning that drove it
**Alternatives considered:** (optional)
```

---

### 2026-08-19 — A remoção do lançamento manual não estava em produção
**Decisão:** tratar a entrega (merge do PR #11) como o trabalho, não reescrever a remoção.
**Por quê:** o commit `e3288cc` que remove `AddExpense.tsx`, `QuickAddExpense.tsx` e
`FABAddExpense.tsx` existe desde 19/08 10:45, mas vive **só** na branch
`fix/e2e-quarentena` — `git branch -a --contains e3288cc` retorna essa e mais nenhuma.
`origin/main` ainda tem os três arquivos, e a Vercel publica `main`. Foi por isso que o
drawer "Adicionar Despesa" continuava aparecendo no app publicado depois de a remoção
estar "pronta". O `dist/` local, buildado às 10:44, também não continha a remoção.
**Lição:** "está removido no código" e "está removido no produto" são estados diferentes.
Ao investigar por que uma funcionalidade removida ainda aparece, checar `--contains`
antes de reabrir o código.

### 2026-08-19 — Entrada de gasto sem trava no banco
**Decisão:** a exclusividade da importação como porta de entrada fica na aplicação; nada
de policy RLS exigindo `source = 'import'` em `expenses`.
**Por quê:** decisão do dono do produto. A policy de INSERT segue exigindo só
`auth.uid() = user_id`.
**Consequência aceita:** sem trava no banco, qualquer cliente com uma sessão válida
consegue inserir em `expenses` — inclusive um bundle antigo que ainda tenha o formulário.
Isso motivou a decisão seguinte (`autoUpdate` no service worker), que fecha a janela do
lado do cliente em vez do lado do banco.
**Alternativas consideradas:** RLS por `source` — recusada; a garantia fica na aplicação.

### 2026-08-19 — PWA passa a atualizar sozinho
**Decisão:** `registerType: 'prompt'` → `'autoUpdate'` em `vite.config.ts`, e o
`onNeedRefresh` com `confirm()` sai de `src/main.tsx`.
**Por quê:** era a única forma de fechar a brecha deixada pela decisão acima sem recorrer
à trava por RLS, que foi recusada. Com `'prompt'`, quem tinha o PWA instalado seguia com o
bundle antigo — que ainda tem o drawer de lançamento manual — até aceitar um `confirm()`,
e esse shell velho continuava inserindo despesa à mão. `public/sw.js` já chamava
`skipWaiting()` e `clientsClaim()` (linhas 12-13), que é exatamente o que o `autoUpdate`
exige na estratégia `injectManifest`, então o service worker não precisou mudar. No modo
`autoUpdate` o vite-plugin-pwa **não** chama `onNeedRefresh`: ele escuta `activated` e dá
`window.location.reload()` — conferido no bundle gerado, não só na documentação.
**Consequência aceita:** a página recarrega sem avisar quando sai versão nova. O único
fluxo longo o bastante para incomodar é o assistente de importação, cujo passo de prévia
se perde. Aceitável na frequência de deploy atual.
**Alternativas consideradas:** manter o prompt e esperar o usuário aceitar; trava por RLS.

### 2026-08-19 — Importação fora do sistema de desbloqueio não depende da migration
**Decisão:** manter `import-transactions` em `ALWAYS_UNLOCKED` (`useGamification.ts:108-117`)
**além** da migration que apaga a linha de `unlock_requirements`.
**Por quê:** era o maior risco do merge — com o lançamento manual fora, um usuário novo que
não conseguisse chegar na importação ficaria sem **nenhuma** forma de registrar gasto, e
travaria em cascata os desbloqueios que dependem de contagem de despesas (`accounts`,
`chat`, `scheduled-exports`, `audit-logs`). Verificado que `useUnlockProgress` faz
short-circuit em `useGamification.ts:290` e retorna `isUnlocked: true` **antes** de
consultar o banco: o acesso não depende de a migration ter rodado. A migration
`20260819120000_importacao_sem_desbloqueio.sql` só alinha a tela de progresso.

### 2026-08-19 — Escopo do que fica depois da remoção
**Decisão:** despesas recorrentes, edição inline na prévia da importação e editar/excluir
despesa já importada **continuam**.
**Por quê:** todos os três inserem ou alteram `expenses` sem passar por um extrato, mas
nenhum é "digitar gasto do zero": recorrente é uma regra automatizada, a edição na prévia
corrige parsing errado (recusar isso tornaria a importação pior que digitar), e editar
despesa importada é correção de dado que já veio do extrato. A restrição é sobre a
**criação avulsa**, não sobre toda escrita em `expenses`.

