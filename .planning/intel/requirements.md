# Requirements

Synthesized from classified PRD documents. One entry per user story / requirement extracted from acceptance-criteria blocks.

Source PRD: `docs/PRD.md` — "Product Requirements Document (PRD) - Entenda seus Gastos - Personal Finance Manager"

---

## REQ-add-expense-manual
- source: docs/PRD.md (US1.1)
- description: Como usuário, quero adicionar uma despesa manualmente, para manter registro de meus gastos.
- acceptance:
  - Campos obrigatórios: valor, data
  - Campos opcionais: categoria, conta, comerciante, método pagamento, tags, notas
  - Valor formatado em R$ (ponto milhar, vírgula decimal)
  - Data padrão: hoje
  - Sugestão automática de categoria baseada em histórico de comerciante
  - Quick picker com categorias mais usadas
  - Validação: valor > 0, data não futura
  - Feedback visual: loading state, sucesso, erro
  - Atalho: FAB (+) ou Cmd+N
- scope: Epic 1: Gestão de Despesas

## REQ-process-receipt-ocr
- source: docs/PRD.md (US1.2)
- description: Como usuário, quero fotografar/fazer upload de recibo, para preencher despesa automaticamente sem digitação.
- acceptance:
  - Aceita formatos: JPG, PNG, PDF
  - Tamanho máximo: 5MB
  - Extrai: valor total, data, comerciante, CNPJ, itens
  - Preenche formulário automaticamente
  - Permite edição antes de salvar
  - Armazena imagem em bucket privado
  - URL assinada com 60s de expiração
  - Feedback de processamento (spinner)
  - Error handling: OCR falhou, formato inválido, quota excedida
- scope: Epic 1: Gestão de Despesas

## REQ-edit-expense
- source: docs/PRD.md (US1.3)
- description: Como usuário, quero editar uma despesa já registrada, para corrigir erros ou adicionar informações.
- acceptance:
  - Todos os campos editáveis
  - Validações aplicadas
  - Alteração registrada em audit log
  - Confirmação antes de salvar
  - Cache invalidado (React Query)
  - Realtime update para outros dispositivos
- scope: Epic 1: Gestão de Despesas

## REQ-delete-expense
- source: docs/PRD.md (US1.4)
- description: Como usuário, quero excluir uma despesa, para remover registros incorretos.
- acceptance:
  - Dialog de confirmação
  - Ação de desfazer (undo) disponível por 5s
  - Exclusão registrada em audit log
  - Recibo no storage também excluído (opcional)
  - Cache invalidado
- scope: Epic 1: Gestão de Despesas

## REQ-configure-recurring-expense
- source: docs/PRD.md (US2.1)
- description: Como usuário, quero configurar despesas que se repetem, para não precisar registrá-las manualmente todo período.
- acceptance:
  - Campos: valor, comerciante, frequência, data início, data fim (opcional)
  - Frequências: diária, semanal, mensal, anual
  - Categoria e conta padrão
  - Próxima ocorrência calculada automaticamente
  - Status ativo/inativo
  - Validação: valor > 0, data início ≤ data fim
- scope: Epic 2: Despesas Recorrentes

## REQ-recurring-expense-automation
- source: docs/PRD.md (US2.2)
- description: Como sistema, quero processar despesas recorrentes automaticamente, para criar despesas sem intervenção do usuário.
- acceptance:
  - Cron job diário às 00:01 (pg_cron)
  - Verifica next_occurrence <= hoje
  - Cria despesa com source='recurring'
  - Atualiza next_occurrence baseado em frequência
  - Desativa se end_date atingida
  - Gera notificação informativa
  - Log de execução
- scope: Epic 2: Despesas Recorrentes

## REQ-manage-multiple-accounts
- source: docs/PRD.md (US3.1)
- description: Como usuário, quero criar e gerenciar múltiplas contas, para separar diferentes origens de dinheiro (carteira, banco, cartão).
- acceptance:
  - Tipos: carteira, conta corrente, poupança, crédito, investimento
  - Campos: nome, tipo, saldo inicial, cor, ícone, últimos 4 dígitos
  - Contas padrão criadas no signup (Dinheiro, Conta Corrente)
  - Saldo calculado: inicial + entradas - saídas
  - Ativar/desativar sem excluir
  - Filtrar despesas por conta
- scope: Epic 3: Contas Financeiras

## REQ-account-dashboard
- source: docs/PRD.md (US3.2)
- description: Como usuário, quero ver dashboard específico de cada conta, para analisar gastos por origem de dinheiro.
- acceptance:
  - Saldo atual
  - Total gasto no mês
  - Total gasto histórico
  - Gráfico mensal (últimos 12 meses)
  - Gráfico por categoria (mês atual)
  - Lista de últimas 10 despesas
  - Comparação com mês anterior
- scope: Epic 3: Contas Financeiras

## REQ-monthly-global-goal
- source: docs/PRD.md (US4.1)
- description: Como usuário, quero definir uma meta de gastos para o mês, para controlar meus gastos totais.
- acceptance:
  - Meta padrão aplicada a todos os meses futuros
  - Meta específica do mês atual (override)
  - Propagação: aplicar meta do mês para próximos N meses (1-12)
  - Barra de progresso visual
  - Cores: verde (<80%), amarelo (80-99%), vermelho (≥100%)
  - Percentual usado calculado em tempo real
- scope: Epic 4: Metas e Orçamento

## REQ-configure-billing-cycle
- source: docs/PRD.md (US4.2)
- description: Como usuário, quero configurar o dia de fechamento do meu cartão (1-28), para alinhar relatórios e metas com meu ciclo real.
- acceptance:
  - Dia configurável: 1 a 28
  - Padrão: 1 (início do mês)
  - Todos os cálculos respeitam ciclo (não mês calendário)
  - RPC get_billing_period(user_id, date) retorna start/end
  - UI mostra período atual claramente
  - Atualização reflete em toda aplicação
- scope: Epic 4: Metas e Orçamento

## REQ-category-goals
- source: docs/PRD.md (US4.3)
- description: Como usuário, quero definir limite de gastos por categoria, para controlar gastos específicos (ex: alimentação, lazer).
- acceptance:
  - Limite por categoria + mês
  - Barra de progresso individual
  - Alerta ao atingir threshold (80%, 100%)
  - Independente da meta global
- scope: Epic 4: Metas e Orçamento

## REQ-proactive-goal-alerts
- source: docs/PRD.md (US4.4)
- description: Como usuário, quero receber notificação quando atingir limite, para ajustar gastos antes de estourar orçamento.
- acceptance:
  - Push notification web nativo
  - Alerta aos 80% (amarelo)
  - Alerta aos 100% (vermelho)
  - Parabéns se economizou (fim do mês)
  - Edge function notify-goal-threshold
- scope: Epic 4: Metas e Orçamento

## REQ-generate-period-report
- source: docs/PRD.md (US5.1)
- description: Como usuário, quero gerar relatório de um período específico, para analisar meus gastos detalhadamente.
- acceptance:
  - Filtros: data início/fim, categorias, contas, método pagamento
  - Gráfico de barras (gastos por categoria)
  - Gráfico de pizza (distribuição %)
  - Tabela detalhada com todas despesas
  - Comparativo com período anterior
  - Respeita ciclo de faturamento
- scope: Epic 5: Relatórios e Exportação

## REQ-export-pdf-excel
- source: docs/PRD.md (US5.2)
- description: Como usuário, quero exportar relatórios em PDF ou Excel, para guardar ou compartilhar com contador/família.
- acceptance:
  - Formatos: CSV, JSON, XLSX, PDF
  - CSV/JSON: edge function export-data
  - XLSX: biblioteca client-side (xlsx.js)
  - PDF: edge function export-pdf com formatação visual
  - Conteúdo: cabeçalho, resumo, breakdown, lista detalhada
  - Download automático no navegador
- scope: Epic 5: Relatórios e Exportação

## REQ-scheduled-exports
- source: docs/PRD.md (US5.3)
- description: Como usuário profissional, quero agendar exportações automáticas, para receber relatórios mensais sem esforço manual.
- acceptance:
  - Campos: nome, formato, frequência (diária, semanal, mensal), filtros
  - Cron job a cada hora verifica next_run_at
  - Edge function process-scheduled-exports
  - Notificação quando export pronto
  - Histórico de execuções
  - Ativar/desativar sem excluir
- scope: Epic 5: Relatórios e Exportação

## REQ-notification-preferences
- source: docs/PRD.md (US6.1)
- description: Como usuário, quero configurar quais notificações receber, para não ser incomodado desnecessariamente.
- acceptance:
  - Threshold de alerta orçamento (padrão 80%)
  - Alertas de padrões de gasto (toggle)
  - Lembrete despesas (dias sem registrar, padrão 3)
  - Revisão mensal (toggle)
  - Insights proativos (toggle)
  - Persistência em notification_preferences
- scope: Epic 6: Notificações Push

## REQ-receive-push-notifications
- source: docs/PRD.md (US6.2)
- description: Como usuário, quero receber notificações push web, para ser alertado mesmo com app fechado.
- acceptance:
  - Web Push API nativa
  - VAPID keys geradas automaticamente
  - Subscription armazenada em push_subscriptions
  - Edge function send-push-notification
  - Funciona: Android, iOS (PWA instalado), Desktop
  - Tipos: goal alerts, recurring processed, export ready, insights
- scope: Epic 6: Notificações Push

## REQ-educational-content-access
- source: docs/PRD.md (US7.1)
- description: Como usuário iniciante, quero acessar artigos e vídeos sobre finanças, para aprender a gerenciar meu dinheiro.
- acceptance:
  - Categorias: Orçamento, Investimentos, Dívidas, Planejamento
  - Tipos: artigo, vídeo, dica, guia
  - Níveis: iniciante, intermediário, avançado
  - Tempo de leitura estimado
  - Marcar como completado
  - Progresso por categoria
- scope: Epic 7: Educação Financeira

## REQ-financial-quiz
- source: docs/PRD.md (US7.2)
- description: Como usuário, quero testar meu conhecimento com quiz, para aprender de forma gamificada.
- acceptance:
  - Múltipla escolha (4 opções)
  - Dificuldades: fácil (5pts), médio (10pts), difícil (15pts)
  - Explicação após resposta
  - Histórico de respostas
  - Pontuação contribui para Score de Saúde
- scope: Epic 7: Educação Financeira

## REQ-health-score-view
- source: docs/PRD.md (US8.1)
- description: Como usuário, quero ver meu score de saúde financeira (0-100), para entender minha performance geral.
- acceptance:
  - Componentes: Aderência Orçamento (40%), Quiz (20%), Consistência (20%), Economia (20%)
  - Classificação: Excelente (80-100), Bom (60-79), Regular (40-59), Precisa Melhorar (0-39)
  - Gráfico de evolução (12 meses)
  - Breakdown por componente
  - RPC calculate_financial_health_score(user_id, month)
- scope: Epic 8: Saúde Financeira

## REQ-chat-assistant
- source: docs/PRD.md (US9.1)
- description: Como usuário, quero fazer perguntas sobre minhas finanças, para receber orientação personalizada.
- acceptance:
  - Múltiplas conversas
  - Contexto: perfil, despesas 30d, metas, score
  - Edge function chat-assistant (OpenAI)
  - Rate limit: 10 msg/min
  - Histórico persistido
  - Sugestões de perguntas comuns
- scope: Epic 9: Assistente de Chat IA

## REQ-proactive-insights
- source: docs/PRD.md (US9.2)
- description: Como usuário, quero receber insights gerados por IA, para identificar padrões e oportunidades de economia.
- acceptance:
  - Tipos: positivo, warning, tip, info
  - Análises: comparativo mês anterior, progresso metas, categorias top, tendências
  - Geração sob demanda
  - Edge function generate-insights
  - Cache para evitar chamadas excessivas
- scope: Epic 9: Assistente de Chat IA

## REQ-global-search
- source: docs/PRD.md (US10.1)
- description: Como power user, quero buscar rapidamente por atalho, para navegar eficientemente.
- acceptance:
  - Atalho: Cmd+K (Mac) ou Ctrl+K (Windows/Linux)
  - Command palette estilo VS Code
  - Busca em: despesas, categorias, contas, páginas
  - Ações rápidas: Nova Despesa, Despesas Recorrentes, Exportações
  - Resultados em tempo real
  - Navegação por teclado (↑↓ Enter Esc)
- scope: Epic 10: Busca e Navegação

## REQ-advanced-filters
- source: docs/PRD.md (US11.1)
- description: Como usuário profissional, quero filtrar despesas com múltiplos critérios, para análises específicas.
- acceptance:
  - Múltiplas categorias (multi-select)
  - Tags específicas
  - Range de valor (min-max)
  - Métodos de pagamento
  - Período personalizado
  - Aplicação instantânea
- scope: Epic 11: Filtros Avançados

## REQ-saved-filters
- source: docs/PRD.md (US11.2)
- description: Como usuário, quero salvar combinações de filtros, para reutilizá-las rapidamente.
- acceptance:
  - Nome do filtro
  - Configuração em JSON
  - Marcar como favorito
  - Carregar com 1 clique
  - Editar/excluir filtros salvos
- scope: Epic 11: Filtros Avançados

## REQ-audit-logs-view
- source: docs/PRD.md (US12.1)
- description: Como usuário, quero ver histórico de alterações, para rastrear mudanças em meus dados.
- acceptance:
  - Ações: CREATE, UPDATE, DELETE
  - Entidades: expense, account, category, goal
  - Dados before/after
  - Timestamp e IP (opcional)
  - Filtros: entidade, ação, período
  - Usuário só visualiza (não modifica)
- scope: Epic 12: Auditoria e Segurança

## REQ-delete-account-data
- source: docs/PRD.md (US12.2)
- description: Como usuário, quero excluir minha conta completamente, para exercer meu direito de ser esquecido (LGPD).
- acceptance:
  - Dialog de confirmação dupla
  - Input manual "EXCLUIR PERMANENTEMENTE"
  - Edge function delete-account
  - Remove: profile, expenses, categories, accounts, todos os dados
  - Remove arquivos em storage (recibos)
  - Logout automático
  - Não permite undo
- scope: Epic 12: Auditoria e Segurança
</content>
