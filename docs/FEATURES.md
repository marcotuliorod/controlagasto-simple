# 🎯 Funcionalidades do Sistema

Documentação completa de todas as funcionalidades disponíveis em produção.

---

## 📋 Índice

1. [Gestão de Despesas](#1-gestão-de-despesas)
2. [Despesas Recorrentes](#2-despesas-recorrentes)
3. [Contas Financeiras](#3-contas-financeiras)
4. [Metas e Orçamento](#4-metas-e-orçamento)
5. [Relatórios e Exportação](#5-relatórios-e-exportação)
6. [Exportações Agendadas](#6-exportações-agendadas)
7. [Notificações Push](#7-notificações-push)
8. [Educação Financeira](#8-educação-financeira)
9. [Quiz Financeiro](#9-quiz-financeiro)
10. [Simuladores Financeiros](#10-simuladores-financeiros)
11. [Saúde Financeira](#11-saúde-financeira)
12. [Assistente de Chat IA](#12-assistente-de-chat-ia)
13. [Insights Personalizados](#13-insights-personalizados)
14. [Busca Global](#14-busca-global)
15. [Logs de Auditoria](#15-logs-de-auditoria)
16. [Configurações](#16-configurações)
17. [Gamificação Progressiva](#17-gamificação-progressiva)
18. [Importação de Extratos Bancários](#18-importação-de-extratos-bancários)
19. [Onboarding Guiado](#19-onboarding-guiado)

> Seções 17-19 foram adicionadas em 16/08/2026 para cobrir funcionalidades entregues após a
> versão inicial deste documento — ver `docs/PRD.md` (Epics 13-15) para o histórico completo.

---

## 1. Gestão de Despesas

### 1.1 Adicionar Despesa Manual
**Rota:** `/add-expense`

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| Valor | number | ✅ | Valor da despesa |
| Data | date | ✅ | Data da despesa (padrão: hoje) |
| Categoria | select | ❌ | Categoria da despesa |
| Conta | select | ❌ | Conta de origem |
| Comerciante | text | ❌ | Nome do estabelecimento |
| Método de Pagamento | select | ❌ | Dinheiro, Débito, Crédito, PIX |
| Tags | multi-select | ❌ | Tags personalizadas |
| Notas | textarea | ❌ | Observações adicionais |

**Funcionalidades:**
- Sugestão automática de categoria baseada no comerciante
- Quick picker de categorias frequentes
- Campo de valor com formatação monetária (R$)

### 1.2 OCR de Recibos
**Edge Function:** `process-receipt`

Permite fotografar ou fazer upload de recibos para extração automática de:
- Valor total
- Data da compra
- Nome do comerciante
- CNPJ (quando disponível)
- Itens (quando disponível)

**Fluxo:**
1. Usuário captura/seleciona imagem
2. Imagem é enviada como base64
3. IA processa e extrai dados
4. Formulário é preenchido automaticamente
5. Imagem é armazenada no bucket `receipts`

### 1.3 Listar Despesas
**Rota:** `/expenses`

- Lista virtualizada para performance (milhares de itens)
- Ordenação por data (mais recentes primeiro)
- Cores e ícones por categoria
- Exibição de tags e notas
- Swipe para ações rápidas (mobile)

### 1.4 Editar Despesa
**Rota:** `/expenses/:id/edit`

- Todos os campos editáveis
- Histórico mantido em audit logs
- Confirmação antes de salvar

### 1.5 Excluir Despesa
- Confirmação via dialog
- Ação registrada em audit logs
- Suporte a undo (desfazer)

---

## 2. Despesas Recorrentes

**Rota:** `/recurring-expenses`

### 2.1 Criar Despesa Recorrente

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Valor | number | Valor fixo |
| Comerciante | text | Nome (ex: "Netflix") |
| Frequência | select | Diária, Semanal, Mensal, Anual |
| Data Início | date | Primeira ocorrência |
| Data Fim | date | Opcional - quando parar |
| Categoria | select | Categoria padrão |
| Conta | select | Conta de débito |

### 2.2 Processamento Automático
**Edge Function:** `process-recurring-expenses`
**Trigger:** Cron job diário

- Verifica despesas com `next_occurrence <= hoje`
- Cria despesa automática na tabela `expenses`
- Atualiza `next_occurrence` baseado na frequência
- Desativa se `end_date` foi atingida
- Gera notificação para o usuário

### 2.3 Gerenciamento
- Ativar/Desativar sem excluir
- Editar valores e frequência
- Visualizar histórico de execuções

---

## 3. Contas Financeiras

**Rota:** `/accounts`

### 3.1 Tipos de Conta
| Tipo | Ícone | Descrição |
|------|-------|-----------|
| `wallet` | 💵 | Dinheiro em espécie |
| `checking` | 🏦 | Conta corrente |
| `savings` | 🐷 | Poupança |
| `credit` | 💳 | Cartão de crédito |
| `investment` | 📈 | Investimentos |

### 3.2 Campos da Conta
- Nome personalizado
- Tipo
- Saldo inicial
- Cor (para identificação visual)
- Ícone
- Últimos 4 dígitos (opcional)
- Status ativo/inativo

### 3.3 Dashboard da Conta
**Rota:** `/accounts/:accountId`

- Saldo atual calculado (inicial + entradas - saídas)
- Gráfico de gastos mensais
- Lista de transações recentes
- Comparativo com mês anterior

### 3.4 Contas Padrão
Ao criar conta, usuário recebe automaticamente:
- 💵 Dinheiro
- 🏦 Conta Corrente

---

## 4. Metas e Orçamento

### 4.1 Meta Mensal Global
**Localização:** Dashboard principal

- Definir limite total de gastos do mês
- Barra de progresso visual
- Cores: verde (<80%), amarelo (80-99%), vermelho (≥100%)
- Propagação automática para meses futuros

### 4.2 Metas por Categoria
**Componente:** `CategoryGoalsManager`

- Definir limite por categoria específica
- Útil para controlar gastos em alimentação, lazer, etc.
- Alertas independentes por categoria

### 4.3 Ciclo de Faturamento
**Configuração:** Settings > Perfil

- Dia do mês que inicia o ciclo (1-28)
- Útil para alinhar com fechamento do cartão
- Afeta cálculos de período em todo o app

### 4.4 Alertas de Meta
**Edge Function:** `notify-goal-threshold`

| Threshold | Notificação |
|-----------|-------------|
| 80% | ⚠️ Alerta amarelo |
| 100% | 🔴 Alerta vermelho |
| Economia | 🎉 Parabéns (se gastou menos) |

---

## 5. Relatórios e Exportação

**Rota:** `/reports`

### 5.1 Visualizações

| Tipo | Descrição |
|------|-----------|
| Gráfico de Barras | Gastos por categoria |
| Gráfico de Pizza | Distribuição percentual |
| Tabela Detalhada | Lista de todas as despesas |
| Comparativo | Mês atual vs anterior |

### 5.2 Filtros
- Período personalizado (data início/fim)
- Por categoria
- Por conta
- Por método de pagamento

### 5.3 Formatos de Exportação

| Formato | Edge Function | Descrição |
|---------|---------------|-----------|
| CSV | `export-data` | Planilha simples |
| JSON | `export-data` | Dados estruturados |
| XLSX | Cliente | Excel com formatação |
| PDF | `export-pdf` | Relatório visual |

### 5.4 Conteúdo do PDF
- Cabeçalho com período e usuário
- Resumo (total, quantidade, média)
- Breakdown por categoria
- Lista detalhada de despesas

---

## 6. Exportações Agendadas

**Rota:** `/scheduled-exports`

### 6.1 Configuração

| Campo | Opções |
|-------|--------|
| Nome | Texto livre |
| Formato | CSV, JSON, PDF |
| Frequência | Diária, Semanal, Mensal |
| Filtros | Período, categorias |

### 6.2 Processamento
**Edge Function:** `process-scheduled-exports`
**Trigger:** Cron job (verificação periódica)

- Verifica exports com `next_run_at <= agora`
- Gera arquivo no formato especificado
- Cria notificação com resultado
- Atualiza `last_run_at` e `next_run_at`

### 6.3 Gerenciamento
- Ativar/Desativar agendamentos
- Editar configuração
- Visualizar histórico de execuções

---

## 7. Notificações Push

### 7.1 Tipos de Notificação

| Tipo | Trigger | Descrição |
|------|---------|-----------|
| `GOAL_80` | 80% da meta | Alerta de aproximação |
| `GOAL_100` | 100% da meta | Limite atingido |
| `GOAL_ECONOMY` | Fim do mês | Economia alcançada |
| `category_variation` | ±20% vs mês anterior | Variação significativa |
| `recurring_expense` | Despesa criada | Recorrente processada |
| `scheduled_export` | Export pronto | Relatório gerado |

### 7.2 Configuração de Preferências
**Rota:** `/notification-settings`

| Preferência | Padrão | Descrição |
|-------------|--------|-----------|
| Alerta de orçamento | 80% | Threshold de alerta |
| Padrões de gasto | ✅ | Alertas de variação |
| Lembrete de despesas | 3 dias | Dias sem registrar |
| Revisão mensal | ✅ | Resumo do mês |
| Insights proativos | ✅ | Dicas automáticas |

### 7.3 Push Web Nativo
- Utiliza Web Push API
- Chaves VAPID geradas automaticamente
- Funciona mesmo com app fechado
- Suporte a Android, iOS, Desktop

---

## 8. Educação Financeira

**Rota:** `/education`

### 8.1 Categorias de Conteúdo
- Orçamento Pessoal
- Investimentos
- Dívidas e Crédito
- Planejamento
- Economia Doméstica

### 8.2 Tipos de Conteúdo
| Tipo | Descrição |
|------|-----------|
| `article` | Artigo texto |
| `video` | Vídeo educativo |
| `tip` | Dica rápida |
| `guide` | Guia completo |

### 8.3 Níveis
- 🟢 Iniciante
- 🟡 Intermediário
- 🔴 Avançado

### 8.4 Progresso do Usuário
- Tracking de conteúdos visualizados
- Marcação de "completado"
- Barra de progresso por categoria

---

## 9. Quiz Financeiro

**Rota:** `/quiz`

### 9.1 Estrutura das Perguntas
- Múltipla escolha (4 opções)
- Categorias variadas
- Níveis de dificuldade
- Explicação após resposta

### 9.2 Pontuação
| Dificuldade | Pontos |
|-------------|--------|
| Fácil | 5 |
| Médio | 10 |
| Difícil | 15 |

### 9.3 Tracking
- Respostas salvas por usuário
- Histórico de acertos/erros
- Contribui para Score de Saúde Financeira

---

## 10. Simuladores Financeiros

**Rota:** `/simulator`

### 10.1 Calculadora de Juros Compostos
**Componente:** `CompoundInterestCalculator`

| Input | Descrição |
|-------|-----------|
| Capital inicial | Valor investido |
| Aporte mensal | Contribuição periódica |
| Taxa de juros | % ao mês ou ano |
| Período | Meses ou anos |

**Output:** Montante final, juros acumulados, gráfico de evolução

### 10.2 Calculadora de Financiamento
**Componente:** `FinancingCalculator`

| Input | Descrição |
|-------|-----------|
| Valor do bem | Preço total |
| Entrada | Valor inicial |
| Taxa de juros | % ao mês |
| Parcelas | Quantidade |

**Output:** Valor da parcela, total pago, juros totais

### 10.3 Projeção de Investimentos
**Componente:** `InvestmentProjection`

- Simula crescimento ao longo do tempo
- Compara diferentes cenários
- Visualização gráfica

---

## 11. Saúde Financeira

**Rota:** `/financial-health`

### 11.1 Score (0-100 pontos)

| Componente | Peso | Critério |
|------------|------|----------|
| Aderência ao Orçamento | 40 | Gastar dentro da meta |
| Performance no Quiz | 20 | Acertos nas questões |
| Consistência | 20 | Registrar despesas regularmente |
| Economia | 20 | Gastar abaixo da meta |

### 11.2 Classificação
| Score | Nível | Cor |
|-------|-------|-----|
| 80-100 | Excelente | 🟢 |
| 60-79 | Bom | 🟡 |
| 40-59 | Regular | 🟠 |
| 0-39 | Precisa Melhorar | 🔴 |

### 11.3 Histórico
- Gráfico de evolução (12 meses)
- Comparativo mês a mês
- Breakdown por componente

---

## 12. Assistente de Chat IA

**Rota:** `/chat`
**Edge Function:** `chat-assistant`

### 12.1 Capacidades
- Responder dúvidas sobre finanças pessoais
- Analisar padrões de gastos do usuário
- Sugerir economias baseadas nos dados
- Explicar conceitos financeiros
- Dar dicas personalizadas

### 12.2 Contexto Disponível para IA
- Perfil do usuário (nome, meta)
- Despesas recentes (últimos 30 dias)
- Metas mensais configuradas
- Score de saúde financeira
- Gastos por categoria

### 12.3 Rate Limiting
- 10 mensagens por minuto por usuário
- Validação de conteúdo

### 12.4 Histórico
- Conversas salvas
- Múltiplas conversas
- Sugestões de perguntas frequentes

---

## 13. Insights Personalizados

**Edge Function:** `generate-insights`
**Componente:** `InsightsCard`

### 13.1 Tipos de Insight

| Tipo | Ícone | Exemplo |
|------|-------|---------|
| `positive` | 🎉 | "Você economizou 15% este mês!" |
| `warning` | ⚠️ | "Gastos com delivery aumentaram 30%" |
| `tip` | 💡 | "Considere revisar assinaturas" |
| `info` | ℹ️ | "Sua categoria mais cara é Alimentação" |

### 13.2 Dados Analisados
- Comparativo mês atual vs anterior
- Progresso das metas
- Categorias com maior gasto
- Tendências de consumo

### 13.3 Geração
- Sob demanda (botão "Gerar Insights")
- Processamento via IA
- Cache para evitar chamadas excessivas

---

## 14. Busca Global

**Atalho:** `Ctrl+K` ou `Cmd+K`
**Componente:** `GlobalSearch`

### 14.1 Pesquisáveis
- Despesas (por comerciante, notas)
- Categorias
- Contas
- Páginas do app

### 14.2 Ações Rápidas
- Adicionar despesa
- Ver relatórios
- Configurações
- Navegação rápida

### 14.3 Interface
- Command palette (estilo VS Code)
- Resultados em tempo real
- Navegação por teclado

---

## 15. Logs de Auditoria

**Rota:** `/audit-logs`

### 15.1 Ações Registradas

| Ação | Descrição |
|------|-----------|
| `CREATE` | Novo registro criado |
| `UPDATE` | Registro modificado |
| `DELETE` | Registro excluído |

### 15.2 Entidades Auditadas
- `expense` - Despesas
- `account` - Contas
- `category` - Categorias
- `goal` - Metas

### 15.3 Dados Armazenados
- Timestamp
- Usuário
- Ação realizada
- Dados antes da alteração
- Dados depois da alteração

### 15.4 Filtros
- Por entidade
- Por ação
- Por período

---

## 16. Configurações

**Rota:** `/settings`

### 16.1 Perfil
- Nome do usuário
- Email (somente leitura)
- Meta mensal padrão
- Dia do ciclo de faturamento

### 16.2 Aparência
- Tema claro/escuro (alternância manual)
- Alternância **automática** por horário do dia (6h-18h claro, 18h-6h escuro) quando não há
  preferência manual salva — ver [19.3 Tema Automático por Horário](#193-tema-automático-por-horário)
- Ao escolher manualmente, a preferência é salva no perfil (`profiles.theme_preference`) e passa
  a vencer sempre o cálculo automático, inclusive em outro dispositivo

### 16.3 Notificações
- Link para configurações detalhadas
- Status de push notifications

### 16.4 Dados
- Exportar todos os dados
- Excluir conta (com confirmação)

### 16.5 PWA
- Status de instalação
- Botão para instalar

---

## 17. Gamificação Progressiva

**Componentes:** `src/components/gamification/`
**Hooks:** `src/hooks/useGamification.ts`

Sistema opcional (opt-in) que revela seções do app gradualmente conforme o usuário se engaja com
conteúdo educativo, quiz e registro de despesas — pensado para não sobrecarregar um usuário
iniciante (persona João) com todas as funcionalidades logo no primeiro acesso.

### 17.1 Requisitos de Desbloqueio

**Tabela:** `unlock_requirements`

Cada item de menu pode ter um ou mais critérios configurados:

| Critério | Campo | Descrição |
|----------|-------|-----------|
| Conteúdo educativo | `required_educational_category` + `required_educational_count` | Nº de conteúdos completados numa categoria |
| Quiz | `required_quiz_category` + `required_quiz_score` | % de acerto mínima numa categoria de quiz |
| Dias ativos | `required_days_active` | Dias de uso do app |
| Despesas registradas | `required_expense_count` | Quantidade de despesas lançadas |
| Nível | `unlock_level` | Ordem de desbloqueio entre os itens |

O progresso do usuário em relação a cada critério é calculado via `useUnlockProgress`, que roda
as 6 consultas envolvidas (progresso educativo, conteúdo educativo, respostas de quiz, perguntas
de quiz, contagem de despesas, datas de despesas) em paralelo (`Promise.all`) em vez de
sequencialmente.

### 17.2 Itens Bloqueados

**Componente:** `LockedMenuTooltip.tsx`

- Item de menu ainda bloqueado exibe tooltip explicando o requisito pendente
- Indicador visual de progresso rumo ao desbloqueio (`UnlockProgressIndicator.tsx`)
- Desbloqueio registrado em `user_unlocks` (com `unlock_method` e `unlock_details`)

### 17.3 Conquistas (Achievements)

**Tabelas:** `achievements`, `user_achievements`
**Componentes:** `AchievementBadge.tsx`, `AchievementsCard.tsx`

- Catálogo de conquistas com raridade (`rarity`) e condição de desbloqueio própria
  (`unlock_condition`)
- Conquistas obtidas ficam registradas por usuário com data (`earned_at`)
- Celebração visual ao desbloquear (`triggerCelebration`)

### 17.4 Ativar/Desativar

**Componente:** `OnboardingWelcomeModal.tsx`

- Modal de boas-vindas na primeira vez que a gamificação aparece para o usuário
- Toggle para ativar/desativar a qualquer momento (`useToggleGamification`)
- Opção de pular sem ativar (`useSkipGamification`)
- **Importante:** o sinal de conclusão deste modal (`profiles.onboarding_completed`) é
  independente do wizard de configuração inicial (seção 19) — são dois fluxos de "onboarding"
  diferentes que coexistem no código sem se sobrepor.

---

## 18. Importação de Extratos Bancários

**Rota:** `/import-transactions`
**Edge Function:** `process-import-file`
**Tabelas:** `import_sessions`, `import_mappings`

Permite importar um extrato bancário inteiro (CSV ou PDF) em vez de digitar cada despesa
manualmente — pensado para o usuário com múltiplas transações por período (persona Carlos).

### 18.1 Fluxo de Importação

1. Usuário faz upload do arquivo (CSV ou PDF de extrato)
2. `process-import-file` processa o arquivo via IA (Lovable AI Gateway)
3. O padrão/formato do banco é detectado automaticamente (`src/lib/bankPatterns.ts`)
4. Transações extraídas são apresentadas para revisão antes de confirmar
5. Duplicatas já existentes na base do usuário são sinalizadas
6. Transferências internas entre contas próprias são detectadas (`is_transfer`,
   `transfer_pair_id`) e não contam como gasto real

### 18.2 Sessões e Mapeamentos

- `import_sessions`: rastreia cada importação (arquivo, status, quantidade de transações)
- `import_mappings`: guarda mapeamentos de coluna/formato já usados, para acelerar importações
  futuras do mesmo banco

### 18.3 Segurança

- Validação de entrada reforçada na edge function (hardening de segurança recente)
- Arquivo processado sob autenticação do usuário (mesmo padrão de JWT das demais edge functions)

---

## 19. Onboarding Guiado

**Rota:** `/onboarding`
**Componentes:** `src/pages/Onboarding.tsx`, `src/components/FirstVisitTip.tsx`
**Hooks:** `src/hooks/useAutoTheme.ts`

### 19.1 Wizard de Configuração Inicial (3 passos)

Substitui o antigo formulário único de configuração por um wizard guiado, com barra de
progresso:

| Passo | Conteúdo |
|-------|----------|
| 1 | Meta mensal |
| 2 | Dia do ciclo de faturamento (presets 1/5/10/15 + customizado) |
| 3 | Cadastro da primeira conta (nome, tipo, ícone, cor, saldo inicial) |

- O passo 3 reaproveita os mesmos campos do formulário de contas (`AccountFormFields`, extraído
  de `AccountForm.tsx`) — o mesmo componente que abre no modal de "Nova Conta" da seção Contas
- Ao concluir, cria a conta real via a mutation `createAccount` (a mesma usada em `/accounts`)
- O gate de rota que decide "usuário precisa do wizard?" continua baseado na existência de uma
  linha em `monthly_goals` para o mês atual — sem novo flag de "onboarding completo"

### 19.2 Tooltips de Primeira Visita

**Componente:** `FirstVisitTip.tsx`

- Tooltip ancorado (Radix Tooltip controlado) no card principal de Dashboard, Relatórios e Contas
- Abre automaticamente na primeira visita à seção
- Botão "Entendi" fecha e grava a dispensa em `localStorage` (`tip-seen-${id}`)
- Não reaparece depois de dispensado

### 19.3 Tema Automático por Horário

**Hook:** `useAutoTheme.ts`
**Migration:** `profiles.theme_preference`

| Horário local | Tema aplicado |
|----------------|---------------|
| 6h–18h | Claro |
| 18h–6h | Escuro |

- Recalculado quando a aba volta ao foco (`visibilitychange`), sem polling contínuo
- Se o usuário já tiver uma preferência manual salva (`profiles.theme_preference`), ela sempre
  vence o cálculo automático
- A preferência manual é definida ao clicar no `ThemeToggle` (sidebar) e persiste no perfil —
  portanto vale em qualquer dispositivo/sessão, não só no navegador atual

---

## 🔗 Links Relacionados

- [Modelo de Dados](./DATABASE.md)
- [Edge Functions](./API.md)
- [Segurança](./SECURITY.md)
- [Rotas](./ROUTES.md)
- [PRD](./PRD.md) - Product Requirements Document, com o histórico completo de épicos e decisões
