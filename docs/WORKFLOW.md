# Task Criticality Policy

How Claude Code should approach a task in this repo, scaled to how much is at stake. Classify a task before starting it; default to Standard when ambiguous and escalate to Critical if money, auth, RLS, or shared infra comes up mid-task.

## Critical
Schema/RLS changes, auth flows, billing-cycle date logic, edge function auth handling, anything touching money calculations or account isolation between users.

- Discuss the approach explicitly before writing code — state the plan in chat, don't just start editing.
- No unsupervised subagent makes the final call; a subagent may research/propose, the user decides.
- Full manual verification after: check RLS policies, test with the billing-cycle edge cases (day 1 vs day 28, month boundaries).

## Standard
New CRUD features, UI components following existing design system, hooks, edge functions that don't touch auth/money directly, integration tests.

- Normal build → verify (lint, typecheck, relevant tests) → done.
- Fine to delegate research/exploration to the `Explore` or `general-purpose` agent when the task spans many files.

## Routine
Formatting, lint fixes, copy edits, dependency bumps, mechanical refactors, doc updates for already-written code.

- Just do it directly — no planning step, no subagent overhead.

## Session hygiene
- After any Standard/Critical change ships, update [`docs/STATE.md`](STATE.md) (what changed, what's open) and, if a non-obvious decision was made, [`docs/CONTEXT.md`](CONTEXT.md) (the why).
- These two files are the persistent memory between sessions — keep them current, not aspirational.
