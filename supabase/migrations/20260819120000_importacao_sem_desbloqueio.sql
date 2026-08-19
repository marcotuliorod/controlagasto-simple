-- Importação de extrato/fatura deixa de ser funcionalidade travada.
--
-- Com a saída do lançamento manual (/add-expense, FAB e drawer rápido), a
-- importação passou a ser o ÚNICO caminho de entrada de gastos no app. Mantê-la
-- atrás de "complete 2 artigos de Orçamento ou 70% no Quiz" deixaria todo
-- usuário novo sem forma alguma de registrar despesa — inclusive travando os
-- desbloqueios que exigem contagem de despesas (accounts, chat,
-- scheduled-exports, audit-logs), que ficariam inalcançáveis.
--
-- O código já trata 'import-transactions' como sempre liberado
-- (ALWAYS_UNLOCKED em src/hooks/useGamification.ts); esta migration remove a
-- linha correspondente para que as duas pontas contem a mesma história e a
-- tela de progresso não anuncie um requisito que não existe mais.
DELETE FROM public.unlock_requirements
WHERE menu_item_key = 'import-transactions';
