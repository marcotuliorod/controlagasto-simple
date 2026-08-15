# Synthesis Summary

Entry point for `gsd-roadmapper`. Read this file first, then the per-type intel files below.

## Doc Counts by Type

- PRD: 1 (`docs/PRD.md`, confidence=high, manifest_override=true)
- ADR: 0
- SPEC: 0
- DOC: 0
- UNKNOWN: 0

Total classifications consumed: 1

## Decisions (`decisions.md`)

- Locked decisions: 0
- Proposed decisions: 0
- No ADR-classified documents were in this ingest set.

## Requirements (`requirements.md`)

- Requirements extracted: 26 (one per user story with acceptance criteria in `docs/PRD.md`)
- IDs: REQ-add-expense-manual, REQ-process-receipt-ocr, REQ-edit-expense, REQ-delete-expense, REQ-configure-recurring-expense, REQ-recurring-expense-automation, REQ-manage-multiple-accounts, REQ-account-dashboard, REQ-monthly-global-goal, REQ-configure-billing-cycle, REQ-category-goals, REQ-proactive-goal-alerts, REQ-generate-period-report, REQ-export-pdf-excel, REQ-scheduled-exports, REQ-notification-preferences, REQ-receive-push-notifications, REQ-educational-content-access, REQ-financial-quiz, REQ-health-score-view, REQ-chat-assistant, REQ-proactive-insights, REQ-global-search, REQ-advanced-filters, REQ-saved-filters, REQ-audit-logs-view, REQ-delete-account-data
- Covers Epics 1-12 (Gestão de Despesas, Despesas Recorrentes, Contas Financeiras, Metas e Orçamento, Relatórios e Exportação, Notificações Push, Educação Financeira, Saúde Financeira, Assistente de Chat IA, Busca e Navegação, Filtros Avançados, Auditoria e Segurança)
- Out of scope for this file (present in source but not requirement/acceptance-criteria structured): Design/UX principles, technical architecture/stack, metrics/KPIs, testing strategy, and the versioned roadmap (v8.1.0 / v9.0.0 / v10.0.0 / Backlog) sections of `docs/PRD.md` — these lack the Como/Quero/Para + Critérios de Aceite structure and were not forced into REQ entries. `gsd-roadmapper` may want to read `docs/PRD.md` directly for that material.

## Constraints (`constraints.md`)

- Constraints extracted: 0
- No SPEC-classified documents were in this ingest set.

## Context (`context.md`)

- Topics: 0
- No DOC-classified documents were in this ingest set.
- Note: `docs/PRD.md` cross-references 12 other files in `docs/` (DATABASE.md, SECURITY.md, ../CLAUDE.md, architecture.md, API.md, testing.md, HOOKS.md, ROUTES.md, FEATURES.md, sprint-7-features.md, release-notes.md, finalization-plan.md) that exist on disk but had no corresponding classification JSON in CLASSIFICATIONS_DIR — not ingested this pass.

## Conflicts

- Blockers: 0
- Competing variants: 0
- Auto-resolved: 0
- Cycle detection: not applicable (single-node cross_ref graph)
- Full report: `.planning/INGEST-CONFLICTS.md`

## Per-Type Intel Files

- `.planning/intel/decisions.md`
- `.planning/intel/requirements.md`
- `.planning/intel/constraints.md`
- `.planning/intel/context.md`
</content>
