# Product Requirements Document (PRD)
# Entenda seus Gastos - Personal Finance Manager

**Versão:** 2.0
**Data:** 16 de Agosto de 2026
**Status:** Production Ready (v8.2.0 — ver "Notas de Versão")
**Autor:** Product Team

> Esta é uma atualização da v1.0 (21/01/2026). Desde então o produto ganhou um sistema de
> gamificação progressiva, importação de extratos bancários via IA, um pacote de hardening de
> qualidade/segurança/performance, e a experiência de onboarding guiado que a v1.0 previa como
> item futuro (v8.1.0) — já entregue. Ver "Notas de Versão" no final para o changelog desta
> revisão.

---

## 📋 Sumário Executivo

### Visão do Produto

**Entenda seus Gastos** é uma aplicação web progressiva (PWA) de gestão financeira pessoal que capacita usuários brasileiros a ter controle total sobre suas finanças através de tecnologia inteligente, insights com IA e educação financeira gamificada.

### Problema

- 60% dos brasileiros não fazem controle financeiro sistemático
- Aplicativos existentes são complexos ou não respeitam o ciclo de faturamento de cartões
- Falta educação financeira prática e acessível
- Usuários precisam de insights proativos, não apenas relatórios passivos

### Solução

Uma plataforma moderna que combina:
- **Rastreamento inteligente** com OCR de recibos e categorização automática
- **Importação de extratos bancários** via IA (CSV/PDF), com detecção de duplicatas e transferências
- **Ciclo de faturamento configurável** (1-28) alinhado ao fechamento de cartões
- **IA contextual** para insights, chat assistant e sugestões personalizadas
- **Gamificação progressiva** com desbloqueio de funcionalidades, conquistas, quiz financeiro e score de saúde
- **Automação** com despesas recorrentes e exportações agendadas
- **Onboarding guiado**, tooltips contextuais de primeira visita e tema automático por horário

### Métricas de Sucesso

A tabela abaixo separa o que foi reverificado nesta revisão (16/08/2026) do que vem da v1.0 e não
foi remedido — evitar reafirmar números antigos como se fossem atuais.

| Métrica | Objetivo | Status verificado nesta revisão |
|---------|----------|----------------------------------|
| Lint (`npm run lint`) | 0 erros | ✅ 0 erros, 17 warnings (não bloqueantes) |
| Testes unitários (Vitest) | Cobertura das áreas de maior risco | ✅ 135/135 passando (18 arquivos) |
| Testes E2E (Playwright) | 9 suítes | ✅ 9 suítes mantidas (ver "Estratégia de Testes") |
| TypeScript (`tsc --noEmit`) | 0 erros | ✅ 0 erros |
| Build de produção | Sem falhas | ✅ Build limpo; Vite ainda avisa que 3 chunks (`Reports`, `generateCategoricalChart`, `index`) passam de 500KB minificados — não houve code-splitting adicional nesta revisão |
| Vulnerabilidades de dependência (`npm audit`) | 0 não mitigadas | ✅ 7 encontradas, todas com decisão documentada (ver "Segurança") — nenhuma corrigível sem bump de major version |

| Métrica (da v1.0, não remedida nesta revisão) | Objetivo | Último valor conhecido (21/01/2026) |
|---|---|---|
| Performance (Lighthouse) | ≥90 | 92 |
| Accessibility (Lighthouse) | ≥95 | 97 |
| Bundle Size (gzipped) | <350KB | 320KB |
| Time to Interactive | <3s | 2.1s |

---

## 🎯 Objetivos de Negócio

### Primários
1. **Adoção**: Atingir 10.000 usuários ativos mensais no primeiro ano
2. **Engajamento**: 60% dos usuários registram despesas semanalmente
3. **Retenção**: 40% dos usuários ativos após 90 dias
4. **NPS**: Net Promoter Score ≥50

### Secundários
1. Educação: 30% completam pelo menos 1 módulo educativo
2. Premium: 5% convertem para plano pago (futuro)
3. PWA Install: 25% instalam como app nativo

> Nenhuma dessas metas foi medida em produção até esta revisão — o produto ainda não tem
> analytics de negócio instrumentado. Permanecem como objetivos-alvo, não resultados.

---

## 👥 Personas

### Persona 1: Maria - A Organizadora (Primária)
- **Idade:** 28 anos
- **Profissão:** Analista de Marketing
- **Renda:** R$ 4.500/mês
- **Contexto:** Tem cartão de crédito com fechamento dia 15, quer acompanhar gastos por ciclo
- **Objetivos:** Não ultrapassar meta mensal, economizar 20% da renda
- **Dores:** Apps não respeitam ciclo de cartão, esquece de registrar despesas pequenas
- **Comportamento:** Acessa app diariamente no celular, prefere dark mode

### Persona 2: João - O Iniciante (Secundária)
- **Idade:** 22 anos
- **Profissão:** Estagiário
- **Renda:** R$ 1.800/mês
- **Contexto:** Primeira experiência com controle financeiro, busca educação
- **Objetivos:** Aprender a poupar, entender para onde vai o dinheiro
- **Dores:** Não sabe por onde começar, termos financeiros complicados
- **Comportamento:** Usa app esporadicamente, gosta de gamificação — é o principal beneficiário do
  sistema de desbloqueio progressivo e do onboarding guiado (ver Epics 13 e 15)

### Persona 3: Carlos - O Profissional (Terciária)
- **Idade:** 35 anos
- **Profissão:** Freelancer Designer
- **Renda:** Variável (R$ 3.000-8.000/mês)
- **Contexto:** Renda irregular, múltiplas contas, precisa de relatórios para IR
- **Objetivos:** Exportar relatórios mensais, separar despesas pessoais/profissionais
- **Dores:** Precisa de tags e notas detalhadas, esquece categorias; também precisa importar
  extratos do banco em vez de digitar cada lançamento manualmente
- **Comportamento:** Desktop power user, usa atalhos de teclado (Cmd+K)

---

## 🎨 User Stories & Acceptance Criteria

### Epic 1: Gestão de Despesas

#### US1.1: Adicionar Despesa Manual — ❌ REMOVIDA em 19/08/2026
**Status:** entregue e depois retirada do produto. Gasto entra exclusivamente
por importação de extrato/fatura (`/import-transactions`); `/add-expense`
sobrevive só como redirect. Os critérios abaixo ficam como registro do que
existiu — nenhum deles descreve o app atual.

**Como** usuário,
**Quero** adicionar uma despesa manualmente,
**Para** manter registro de meus gastos.

**Critérios de Aceite (histórico):**
- [x] Campos obrigatórios: valor, data
- [x] Campos opcionais: categoria, conta, comerciante, método pagamento, tags, notas
- [x] Valor formatado em R$ (ponto milhar, vírgula decimal)
- [x] Data padrão: hoje
- [x] Sugestão automática de categoria baseada em histórico de comerciante
- [x] Quick picker com categorias mais usadas
- [x] Validação: valor > 0, data não futura
- [x] Feedback visual: loading state, sucesso, erro
- [x] Atalho: FAB (+) ou Cmd+N

#### US1.2: Processar Recibo com OCR — ❌ REMOVIDA em 19/08/2026
**Status:** entregue e depois retirada. A edge function `process-receipt` e a
capacidade `DocumentExtraction` saíram; o bucket privado `receipts` continua
existindo só para guardar os cupons anteriores, e segue sendo purgado por
`delete-account`. Critérios abaixo são registro histórico.

**Como** usuário,
**Quero** fotografar/fazer upload de recibo,
**Para** preencher despesa automaticamente sem digitação.

**Critérios de Aceite (histórico):**
- [x] Aceita formatos: JPG, PNG, PDF
- [x] Tamanho máximo: 5MB
- [x] Extrai: valor total, data, comerciante, CNPJ, itens
- [x] Preenche formulário automaticamente
- [x] Permite edição antes de salvar
- [x] Armazena imagem em bucket privado
- [x] URL assinada com 60s de expiração
- [x] Feedback de processamento (spinner)
- [x] Error handling: OCR falhou, formato inválido, quota excedida
- [x] Autenticação do usuário verificada (JWT) antes de acionar o OCR pago — corrigido no
  hardening de segurança (ver Epic 16 / SEC-02)

#### US1.3: Editar Despesa Existente
**Como** usuário,
**Quero** editar uma despesa já registrada,
**Para** corrigir erros ou adicionar informações.

**Critérios de Aceite:**
- [x] Todos os campos editáveis
- [x] Validações aplicadas
- [x] Alteração registrada em audit log
- [x] Confirmação antes de salvar
- [x] Cache invalidado (React Query)
- [x] Realtime update para outros dispositivos

#### US1.4: Excluir Despesa
**Como** usuário,
**Quero** excluir uma despesa,
**Para** remover registros incorretos.

**Critérios de Aceite:**
- [x] Dialog de confirmação
- [x] Ação de desfazer (undo) disponível por 5s
- [x] Exclusão registrada em audit log
- [x] Recibo no storage também excluído (opcional)
- [x] Cache invalidado

### Epic 2: Despesas Recorrentes

#### US2.1: Configurar Despesa Recorrente
**Como** usuário,
**Quero** configurar despesas que se repetem,
**Para** não precisar registrá-las manualmente todo período.

**Critérios de Aceite:**
- [x] Campos: valor, comerciante, frequência, data início, data fim (opcional)
- [x] Frequências: diária, semanal, mensal, anual
- [x] Categoria e conta padrão
- [x] Próxima ocorrência calculada automaticamente
- [x] Status ativo/inativo
- [x] Validação: valor > 0, data início ≤ data fim

#### US2.2: Processamento Automático
**Como** sistema,
**Quero** processar despesas recorrentes automaticamente,
**Para** criar despesas sem intervenção do usuário.

**Critérios de Aceite:**
- [x] Cron job diário às 00:01 (pg_cron)
- [x] Verifica `next_occurrence <= hoje`
- [x] Cria despesa com `source='recurring'`
- [x] Atualiza `next_occurrence` baseado em frequência
- [x] Desativa se `end_date` atingida
- [x] Gera notificação informativa
- [x] Log de execução

### Epic 3: Contas Financeiras

#### US3.1: Gerenciar Múltiplas Contas
**Como** usuário,
**Quero** criar e gerenciar múltiplas contas,
**Para** separar diferentes origens de dinheiro (carteira, banco, cartão).

**Critérios de Aceite:**
- [x] Tipos: carteira, conta corrente, poupança, crédito, investimento
- [x] Campos: nome, tipo, saldo inicial, cor, ícone, últimos 4 dígitos
- [x] Contas padrão criadas no signup (Dinheiro, Conta Corrente)
- [x] Saldo calculado: inicial + entradas - saídas
- [x] Ativar/desativar sem excluir
- [x] Filtrar despesas por conta
- [x] Campos de conta reutilizáveis tanto no modal de edição quanto no passo 3 do wizard de
  onboarding (`AccountFormFields`, extraído em Epic 15)

#### US3.2: Dashboard por Conta
**Como** usuário,
**Quero** ver dashboard específico de cada conta,
**Para** analisar gastos por origem de dinheiro.

**Critérios de Aceite:**
- [x] Saldo atual
- [x] Total gasto no mês
- [x] Total gasto histórico
- [x] Gráfico mensal (últimos 12 meses)
- [x] Gráfico por categoria (mês atual)
- [x] Lista de últimas 10 despesas
- [x] Comparação com mês anterior

### Epic 4: Metas e Orçamento

#### US4.1: Definir Meta Mensal Global
**Como** usuário,
**Quero** definir uma meta de gastos para o mês,
**Para** controlar meus gastos totais.

**Critérios de Aceite:**
- [x] Meta padrão aplicada a todos os meses futuros
- [x] Meta específica do mês atual (override)
- [x] Propagação: aplicar meta do mês para próximos N meses (1-12)
- [x] Barra de progresso visual
- [x] Cores: verde (<80%), amarelo (80-99%), vermelho (≥100%)
- [x] Percentual usado calculado em tempo real

#### US4.2: Configurar Ciclo de Faturamento
**Como** usuário,
**Quero** configurar o dia de fechamento do meu cartão (1-28),
**Para** alinhar relatórios e metas com meu ciclo real.

**Critérios de Aceite:**
- [x] Dia configurável: 1 a 28
- [x] Padrão: 1 (início do mês)
- [x] Todos os cálculos respeitam ciclo (não mês calendário)
- [x] RPC `get_billing_period(user_id, date)` retorna start/end
- [x] UI mostra período atual claramente
- [x] Atualização reflete em toda aplicação
- [x] Coberto por testes unitários (`useBillingCycle.test.ts`, `dateRange.test.ts`) desde o
  hardening de qualidade (Epic 16 / QUAL-03)

#### US4.3: Metas por Categoria
**Como** usuário,
**Quero** definir limite de gastos por categoria,
**Para** controlar gastos específicos (ex: alimentação, lazer).

**Critérios de Aceite:**
- [x] Limite por categoria + mês
- [x] Barra de progresso individual
- [x] Alerta ao atingir threshold (80%, 100%)
- [x] Independente da meta global

#### US4.4: Alertas Proativos de Meta
**Como** usuário,
**Quero** receber notificação quando atingir limite,
**Para** ajustar gastos antes de estourar orçamento.

**Critérios de Aceite:**
- [x] Push notification web nativo
- [x] Alerta aos 80% (amarelo)
- [x] Alerta aos 100% (vermelho)
- [x] Parabéns se economizou (fim do mês)
- [x] Edge function `notify-goal-threshold` (autenticação via `X-Cron-Secret`, não JWT — não há
  usuário final na chamada; padrão auditado em Epic 16 / SEC-02)

### Epic 5: Relatórios e Exportação

#### US5.1: Gerar Relatório de Período
**Como** usuário,
**Quero** gerar relatório de um período específico,
**Para** analisar meus gastos detalhadamente.

**Critérios de Aceite:**
- [x] Filtros: data início/fim, categorias, contas, método pagamento
- [x] Gráfico de barras (gastos por categoria)
- [x] Gráfico de pizza (distribuição %)
- [x] Tabela detalhada com todas despesas, agora virtualizada (`@tanstack/react-virtual`) para
  se manter responsiva com 1.000+ despesas no período (Epic 16 / PERF-01)
- [x] Comparativo com período anterior
- [x] Respeita ciclo de faturamento

#### US5.2: Exportar para PDF/Excel
**Como** usuário,
**Quero** exportar relatórios em PDF ou Excel,
**Para** guardar ou compartilhar com contador/família.

**Critérios de Aceite:**
- [x] Formatos: CSV, JSON, XLSX, PDF
- [x] CSV/JSON: edge function `export-data`
- [x] XLSX: biblioteca client-side (xlsx.js) — usada apenas no caminho de escrita (nunca faz
  parse de arquivo enviado por usuário); vulnerabilidade conhecida da lib sem correção
  disponível, mitigada por design (ver "Segurança")
- [x] PDF: edge function `export-pdf` com formatação visual (inclui acentuação em português,
  bug de caracteres corrigido)
- [x] Conteúdo: cabeçalho, resumo, breakdown, lista detalhada
- [x] Download automático no navegador

#### US5.3: Agendar Exportações Recorrentes
**Como** usuário profissional,
**Quero** agendar exportações automáticas,
**Para** receber relatórios mensais sem esforço manual.

**Critérios de Aceite:**
- [x] Campos: nome, formato, frequência (diária, semanal, mensal), filtros
- [x] Cron job a cada hora verifica `next_run_at`
- [x] Edge function `process-scheduled-exports`
- [x] Notificação quando export pronto
- [x] Histórico de execuções
- [x] Ativar/desativar sem excluir

### Epic 6: Notificações Push

#### US6.1: Configurar Preferências
**Como** usuário,
**Quero** configurar quais notificações receber,
**Para** não ser incomodado desnecessariamente.

**Critérios de Aceite:**
- [x] Threshold de alerta orçamento (padrão 80%)
- [x] Alertas de padrões de gasto (toggle)
- [x] Lembrete despesas (dias sem registrar, padrão 3)
- [x] Revisão mensal (toggle)
- [x] Insights proativos (toggle)
- [x] Persistência em `notification_preferences`

#### US6.2: Receber Push Notifications
**Como** usuário,
**Quero** receber notificações push web,
**Para** ser alertado mesmo com app fechado.

**Critérios de Aceite:**
- [x] Web Push API nativa
- [x] VAPID keys geradas automaticamente
- [x] Subscription armazenada em `push_subscriptions`
- [x] Edge function `send-push-notification`
- [x] Funciona: Android, iOS (PWA instalado), Desktop
- [x] Tipos: goal alerts, recurring processed, export ready, insights
- [x] Chave pública VAPID (`get-vapid-public-key`) exige autenticação — gap corrigido nesta
  fase de hardening (era acessível sem login)

### Epic 7: Educação Financeira

#### US7.1: Acessar Conteúdo Educativo
**Como** usuário iniciante,
**Quero** acessar artigos e vídeos sobre finanças,
**Para** aprender a gerenciar meu dinheiro.

**Critérios de Aceite:**
- [x] Categorias: Orçamento, Investimentos, Dívidas, Planejamento
- [x] Tipos: artigo, vídeo, dica, guia
- [x] Níveis: iniciante, intermediário, avançado
- [x] Tempo de leitura estimado
- [x] Marcar como completado
- [x] Progresso por categoria
- [x] Conteúdo expandido nesta janela de tempo (mais artigos/guias adicionados)

#### US7.2: Responder Quiz Financeiro
**Como** usuário,
**Quero** testar meu conhecimento com quiz,
**Para** aprender de forma gamificada.

**Critérios de Aceite:**
- [x] Múltipla escolha (4 opções)
- [x] Dificuldades: fácil (5pts), médio (10pts), difícil (15pts)
- [x] Explicação após resposta
- [x] Histórico de respostas
- [x] Pontuação contribui para Score de Saúde e para o progresso de gamificação (Epic 13)

### Epic 8: Saúde Financeira

#### US8.1: Visualizar Score de Saúde
**Como** usuário,
**Quero** ver meu score de saúde financeira (0-100),
**Para** entender minha performance geral.

**Critérios de Aceite:**
- [x] Componentes: Aderência Orçamento (40%), Quiz (20%), Consistência (20%), Economia (20%)
- [x] Classificação: Excelente (80-100), Bom (60-79), Regular (40-59), Precisa Melhorar (0-39)
- [x] Gráfico de evolução (12 meses)
- [x] Breakdown por componente
- [x] RPC `calculate_financial_health_score(user_id, month)`

### Epic 9: Assistente de Chat IA

#### US9.1: Conversar com Assistente
**Como** usuário,
**Quero** fazer perguntas sobre minhas finanças,
**Para** receber orientação personalizada.

**Critérios de Aceite:**
- [x] Múltiplas conversas
- [x] Contexto: perfil, despesas 30d, metas, score
- [x] Edge function `chat-assistant`, que delega ao serviço próprio em `services/ai`
- [x] Rate limit: 10 msg/min
- [x] Histórico persistido
- [x] Sugestões de perguntas comuns

#### US9.2: Receber Insights Proativos
**Como** usuário,
**Quero** receber insights gerados por IA,
**Para** identificar padrões e oportunidades de economia.

**Critérios de Aceite:**
- [x] Tipos: positivo (🎉), warning (⚠️), tip (💡), info (ℹ️)
- [x] Análises: comparativo mês anterior, progresso metas, categorias top, tendências
- [x] Geração sob demanda
- [x] Edge function `generate-insights`
- [x] Cache para evitar chamadas excessivas

### Epic 10: Busca e Navegação

#### US10.1: Busca Global (Cmd+K)
**Como** power user,
**Quero** buscar rapidamente por atalho,
**Para** navegar eficientemente.

**Critérios de Aceite:**
- [x] Atalho: Cmd+K (Mac) ou Ctrl+K (Windows/Linux)
- [x] Command palette estilo VS Code
- [x] Busca em: despesas, categorias, contas, páginas
- [x] Ações rápidas: Importar Extrato, Despesas Recorrentes, Exportações Agendadas
- [x] Resultados em tempo real
- [x] Navegação por teclado (↑↓ Enter Esc)

### Epic 11: Filtros Avançados

#### US11.1: Aplicar Filtros Avançados
**Como** usuário profissional,
**Quero** filtrar despesas com múltiplos critérios,
**Para** análises específicas.

**Critérios de Aceite:**
- [x] Múltiplas categorias (multi-select)
- [x] Tags específicas
- [x] Range de valor (min-max)
- [x] Métodos de pagamento
- [x] Período personalizado
- [x] Aplicação instantânea

#### US11.2: Salvar e Reutilizar Filtros
**Como** usuário,
**Quero** salvar combinações de filtros,
**Para** reutilizá-las rapidamente.

**Critérios de Aceite:**
- [x] Nome do filtro
- [x] Configuração em JSON
- [x] Marcar como favorito
- [x] Carregar com 1 clique
- [x] Editar/excluir filtros salvos

### Epic 12: Auditoria e Segurança

#### US12.1: Visualizar Logs de Auditoria
**Como** usuário,
**Quero** ver histórico de alterações,
**Para** rastrear mudanças em meus dados.

**Critérios de Aceite:**
- [x] Ações: CREATE, UPDATE, DELETE
- [x] Entidades: expense, account, category, goal
- [x] Dados before/after
- [x] Timestamp e IP (opcional)
- [x] Filtros: entidade, ação, período
- [x] Usuário só visualiza (não modifica)

#### US12.2: Excluir Conta e Dados
**Como** usuário,
**Quero** excluir minha conta completamente,
**Para** exercer meu direito de ser esquecido (LGPD).

**Critérios de Aceite:**
- [x] Dialog de confirmação dupla
- [x] Input manual "EXCLUIR PERMANENTEMENTE"
- [x] Edge function `delete-account`
- [x] Remove: profile, expenses, categories, accounts, todos os dados
- [x] Remove arquivos em storage (recibos)
- [x] Logout automático
- [x] Não permite undo

### Epic 13: Gamificação Progressiva *(novo desde a v1.0)*

#### US13.1: Desbloquear Funcionalidades Progressivamente
**Como** usuário iniciante (persona João),
**Quero** desbloquear seções do app conforme uso o sistema,
**Para** não ser sobrecarregado com todas as funcionalidades de uma vez.

**Critérios de Aceite:**
- [x] Requisitos de desbloqueio configuráveis por item de menu (`unlock_requirements`)
- [x] Progresso do usuário rastreado (`user_unlocks`)
- [x] Itens de menu bloqueados mostram tooltip explicando o requisito pendente
  (`LockedMenuTooltip.tsx`)
- [x] Indicador visual de progresso rumo ao próximo desbloqueio (`UnlockProgressIndicator.tsx`)
- [x] Cálculo de progresso batchado com `Promise.all` (6 consultas em paralelo em vez de
  sequenciais) para não degradar a performance percebida

#### US13.2: Conquistas (Achievements)
**Como** usuário,
**Quero** ganhar conquistas por marcos de uso,
**Para** ser reconhecido pelo meu progresso financeiro.

**Critérios de Aceite:**
- [x] Catálogo de conquistas (`achievements`)
- [x] Conquistas do usuário persistidas (`user_achievements`)
- [x] Badge visual por conquista (`AchievementBadge.tsx`)
- [x] Card de listagem de conquistas (`AchievementsCard.tsx`)

#### US13.3: Onboarding de Gamificação (opt-in)
**Como** usuário,
**Quero** poder ativar/desativar a gamificação,
**Para** usar o app do jeito que preferir.

**Critérios de Aceite:**
- [x] Modal de boas-vindas na primeira ativação (`OnboardingWelcomeModal.tsx`)
- [x] Toggle para ativar/desativar (`useToggleGamification`)
- [x] Opção de pular (`useSkipGamification`)
- [x] Sinal de conclusão (`profiles.onboarding_completed`) é **independente** do onboarding de
  setup inicial (Epic 15) — os dois sistemas coexistem sem se sobrepor

### Epic 14: Importação de Extratos Bancários *(novo desde a v1.0)*

#### US14.1: Importar Extrato via IA
**Como** usuário profissional (persona Carlos),
**Quero** importar meu extrato bancário (CSV ou PDF),
**Para** não precisar digitar cada lançamento manualmente.

**Critérios de Aceite:**
- [x] Aceita CSV e PDF de extrato
- [x] Extração via IA (edge function `process-import-file`, Lovable AI Gateway)
- [x] Detecção automática do padrão/formato do banco
- [x] Detecção de duplicatas antes de confirmar a importação
- [x] Detecção de transferências internas (`is_transfer`, `transfer_pair_id`) para não contar
  como gasto real
- [x] Sessão de importação rastreável (`import_sessions`) e mapeamentos reutilizáveis
  (`import_mappings`)
- [x] Validação de entrada reforçada na edge function (hardening de segurança recente)
- [x] Cobertura de testes para detecção de padrão bancário (`src/lib/bankPatterns.test.ts`)

### Epic 15: Onboarding Guiado *(novo desde a v1.0 — entregue nesta revisão)*

> Esta era a US "Onboarding wizard interativo" do roadmap v8.1.0 da v1.0 do PRD. Já foi
> implementada e é tratada aqui como shipped, não mais como item futuro.

#### US15.1: Wizard de Configuração Inicial
**Como** novo usuário,
**Quero** ser guiado por um wizard de 3 passos (meta → ciclo de faturamento → primeira conta),
**Para** começar a usar o app já com uma conta cadastrada, em vez de um formulário único e estático.

**Critérios de Aceite:**
- [x] Passo 1: meta mensal
- [x] Passo 2: dia do ciclo de faturamento (presets + customizado)
- [x] Passo 3: cadastro da primeira conta (reaproveita `AccountFormFields`, extraído do modal de
  contas existente)
- [x] Barra de progresso visual entre os passos
- [x] Ao concluir, cria a conta real via a mesma mutation usada em Contas (Epic 3)
- [x] Sinal de conclusão continua sendo a existência de uma linha em `monthly_goals` do mês —
  sem introduzir um novo flag, mantendo compatibilidade com o gate de rota existente

#### US15.2: Tooltips de Primeira Visita
**Como** novo usuário,
**Quero** ver uma dica contextual na primeira vez que visito Dashboard, Relatórios ou Contas,
**Para** entender a funcionalidade principal da tela sem precisar de um tutorial completo.

**Critérios de Aceite:**
- [x] Tooltip ancorado (Radix Tooltip controlado) no card principal de cada seção
- [x] Aparece automaticamente na primeira visita
- [x] Botão "Entendi" e persistência via `localStorage` (`tip-seen-${id}`)
- [x] Não reaparece após ser dispensado

#### US15.3: Tema Automático por Horário
**Como** usuário,
**Quero** que o app alterne entre claro e escuro conforme o horário do dia,
**Para** não precisar trocar manualmente, mas ainda poder fixar minha preferência se quiser.

**Critérios de Aceite:**
- [x] Claro entre 6h-18h, escuro entre 18h-6h (horário local do dispositivo)
- [x] Reavaliado quando a aba volta ao foco (`visibilitychange`), sem polling contínuo
- [x] Override manual (clique no toggle de tema) sempre vence o cálculo automático
- [x] Override persistido no perfil (`profiles.theme_preference`), não só no navegador —
  portanto vale entre dispositivos/sessões

### Epic 16: Qualidade, Segurança e Performance *(hardening interno — sem user-facing story própria)*

Não é uma funcionalidade voltada ao usuário final, mas é trabalho de produto relevante o
suficiente para registrar no PRD, pois determinou a sequência de releases entre a v1.0 e esta
revisão:

- **QUAL**: `npm run lint` foi de 97 erros para 0; ~76 usos de `as any` substituídos por tipos
  reais; testes unitários novos para `useBillingCycle` e `useImportTransactions`/
  `bankPatterns.ts`.
- **SEC**: as 7 vulnerabilidades do `npm audit` foram auditadas uma a uma (não corrigidas às
  cegas) — `xlsx` (só usa o caminho de escrita, nunca faz parse de entrada não confiável),
  `react-router-dom` (CVE de open-redirect auditado e não explorável no uso atual do app),
  `vite`/`esbuild`/`vitest` (dev-only, correção exige bump maior de Vite, adiado). Todas as 13
  edge functions foram auditadas quanto a validação de JWT; `process-receipt` tinha um gap real
  (chamava a API paga de OCR antes de validar o token) — corrigido.
- **PERF**: lista de despesas do Relatório virtualizada (`@tanstack/react-virtual`) para
  1.000+ despesas; `useUnlockProgress` da gamificação paralelizado (`Promise.all`); logging de
  console gated atrás de `import.meta.env.DEV` nos pontos que rodavam em todo carregamento do
  app.

Detalhes completos de cada decisão: `docs/STATE.md`.

---

## 🎨 Design e UX

### Princípios de Design

1. **Mobile-First**: 70% dos usuários acessam via mobile
2. **Dark Mode Padrão**: Reduz fadiga visual (agora com alternância automática por horário — Epic 15)
3. **Caminho curto**: importar extrato/fatura em poucos toques, sem digitar gasto por gasto
4. **Zero Empty States**: Sempre mostrar next action
5. **Feedback Imediato**: Loading, success, error em <100ms
6. **Progressividade**: funcionalidades avançadas se revelam conforme o uso (gamificação, Epic 13),
   em vez de expor tudo de uma vez a um usuário iniciante

### Paleta de Cores

```css
/* Core */
--primary: #3B82F6 (Blue)
--background: #0B1220 (Dark Navy)
--foreground: #F8FAFC (White)

/* Semântica */
--success: #10B981 (Green) - Meta ok
--warning: #F59E0B (Amber) - 80% meta
--error: #EF4444 (Red) - Meta estourada
--info: #06B6D4 (Cyan)

/* Categorias (8 cores distintas) */
Alimentação: #10b981
Transporte: #3b82f6
Moradia: #f59e0b
Saúde: #ef4444
Lazer: #8b5cf6
Educação: #06b6d4
Compras: #ec4899
Outros: #6b7280
```

### Componentes UI (Shadcn/ui)

- **Botões**: Primary (solid), Secondary (outline), Ghost, Icon
- **Cards**: Bordered, Elevated, Flat
- **Forms**: Input, Select, Textarea, DatePicker, Checkbox, Switch
- **Feedback**: Toast, Alert, Dialog, Progress, Tooltip (agora também controlado para dicas de
  primeira visita — `FirstVisitTip.tsx`)
- **Navigation**: Sidebar (desktop), BottomNav (mobile), Tabs
- **Data Display**: Table, Badge, Avatar, Tooltip

### Responsividade

| Breakpoint | Largura | Layout |
|------------|---------|--------|
| Mobile | <768px | BottomNav |
| Tablet | 768-1024px | Sidebar |
| Desktop | ≥1024px | Sidebar Expanded |

### Acessibilidade (WCAG 2.1 AAA)

- **Contrast Ratio**: ≥7:1 (AAA)
- **Touch Targets**: ≥44x44px
- **Keyboard Navigation**: Tab, Enter, Esc, Arrows
- **Screen Readers**: ARIA labels, semantic HTML
- **Skip Links**: Skip to main content
- **Focus Indicators**: 2px solid outline

> Os números de auditoria de acessibilidade (Lighthouse 97) são da v1.0 e não foram
> remedidos nesta revisão — ver "Métricas de Sucesso".

---

## 🏗️ Arquitetura Técnica

### Stack Tecnológico

**Frontend:**
- React 18.3.1 (UI library)
- TypeScript 5.8.3 (Type safety — modo non-strict intencional; segurança de tipo reforçada via
  Zod em runtime, não via `strictNullChecks`)
- Vite 5.4.19 (Build tool)
- Tailwind CSS 3.4.17 (Styling)
- Shadcn/ui (Component library)
- React Query 5.83.0 (Server state)
- React Router DOM 6.30.1 (Routing)
- React Hook Form 7.61.1 (Forms)
- Zod 3.25.76 (Validation)
- Recharts 2.15.4 (Charts)
- next-themes (tema dark/light/auto — base do Epic 15)

**Backend (Supabase):**
- PostgreSQL (Database)
- Row Level Security (Authorization)
- Edge Functions (Serverless - Deno)
- Storage (File storage)
- Realtime (WebSocket subscriptions)
- pg_cron (Scheduled jobs)

**Testing:**
- Vitest 4.0.1 (Unit tests) — 135 testes em 18 arquivos
- Playwright 1.57.0 (E2E tests) — 9 suítes
- Testing Library (Component tests)

**Tooling:**
- ESLint (Linting) — 0 erros, 17 warnings não bloqueantes
- Prettier (Formatting - futuro)
- Lighthouse CI (Performance)
- `gsd-core` + skill `caveman` (planejamento de fases e compressão de contexto, uso interno de
  desenvolvimento — não faz parte do produto entregue ao usuário)

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      Client (PWA)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  React   │  │ Tailwind │  │  Vite    │             │
│  │   +TS    │  │   +UI    │  │  +PWA    │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│                                                         │
│  ┌──────────────────────────────────────────────┐     │
│  │         React Query (Cache)                  │     │
│  └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTPS
┌─────────────────────────────────────────────────────────┐
│                  Supabase Platform                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │    Storage   │  │   Realtime   │ │
│  │   +RLS       │  │  (Receipts)  │  │ (WebSocket)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │         Edge Functions (Deno) — 12 total          │ │
│  │  • process-import-file (extrato bancário, IA)    │ │
│  │  • chat-assistant (IA)                           │ │
│  │  • generate-insights (IA)                        │ │
│  │  • send-push-notification                        │ │
│  │  • get-vapid-public-key (agora exige auth)       │ │
│  │  • delete-account                                │ │
│  │  • export-data / export-pdf                      │ │
│  │  • process-recurring-expenses                    │ │
│  │  • process-scheduled-exports                     │ │
│  │  • notify-goal-threshold                         │ │
│  │  • check-category-variations                     │ │
│  └──────────────────────────────────────────────────┘ │
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │         pg_cron (Scheduled Jobs)                 │ │
│  │  • Daily 00:01 → Recurring Expenses             │ │
│  │  • Hourly 0 * * * * → Scheduled Exports         │ │
│  └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↕ API
┌─────────────────────────────────────────────────────────┐
│                External Services                        │
│  ┌──────────────────────────────────────────────┐      │
│  │       Lovable AI Gateway                      │      │
│  │  (OCR de recibos, import de extrato, chat,    │      │
│  │   insights)                                   │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### Modelo de Dados (27 Tabelas)

**Já documentadas na v1.0 (21):**
1. `profiles` — agora inclui `theme_preference` (Epic 15 / ONBD-03)
2. `expenses`
3. `categories`
4. `accounts`
5. `monthly_goals`
6. `category_goals`
7. `recurring_expenses`
8. `notifications`
9. `notification_preferences`
10. `push_subscriptions`
11. `scheduled_exports`
12. `saved_filters`
13. `audit_logs`
14. `chat_conversations`
15. `chat_messages`
16. `educational_content`
17. `user_content_progress`
18. `quiz_questions`
19. `quiz_responses`
20. `financial_health_scores`
21. `vapid_keys`

**Novas desde a v1.0 (6):**
22. `unlock_requirements` — requisitos de desbloqueio de menu (Epic 13)
23. `user_unlocks` — progresso de desbloqueio por usuário (Epic 13)
24. `achievements` — catálogo de conquistas (Epic 13)
25. `user_achievements` — conquistas obtidas por usuário (Epic 13)
26. `import_sessions` — sessões de importação de extrato (Epic 14)
27. `import_mappings` — mapeamentos reutilizáveis de colunas/formato bancário (Epic 14)

Ver [DATABASE.md](./DATABASE.md) para schema completo (não atualizado nesta revisão — conferir
contra `supabase/migrations/` para o estado mais atual).

### Segurança

**Row Level Security (RLS):**
- Todas as 27 tabelas têm RLS ativado
- Políticas baseadas em `auth.uid() = user_id`
- Usuário só acessa próprios dados
- Service role apenas em edge functions

**Validação:**
- Client: Zod schemas
- Server: PostgreSQL constraints + triggers
- Edge Functions: todas as 13 auditadas — 9 exigem JWT de usuário, 3 exigem `X-Cron-Secret`
  (jobs agendados, sem usuário final), 1 (`send-push-notification`) aceita ambos

**Storage:**
- Bucket `receipts` privado
- Signed URLs com 60s expiração
- Upload size limit: 5MB

**Auth:**
- Email/password via Supabase Auth
- JWT tokens auto-refresh
- Session persistence (localStorage)

**Vulnerabilidades de dependência conhecidas (não corrigidas — decisão documentada):**
- `xlsx` (alta, sem correção upstream) — só usa o caminho de escrita no app, nunca faz parse
- `react-router-dom` (moderada) — CVE de open-redirect auditado; nenhum `navigate()`/`<Link>` do
  app usa destino vindo de input do usuário; correção exigiria bump para v7 (breaking)
- `vite`/`esbuild`/`vitest`/`@vitest/ui` (dev-only) — correção exige Vite 6+, adiado

Ver [SECURITY.md](./SECURITY.md) para detalhes (não atualizado nesta revisão) e `docs/STATE.md`
para a auditoria completa e atual.

---

## 📊 Métricas e Analytics

### KPIs de Produto

| Métrica | Definição | Meta |
|---------|-----------|------|
| DAU | Daily Active Users | 500 |
| MAU | Monthly Active Users | 10.000 |
| DAU/MAU Ratio | Stickiness | 15% |
| Avg Session Duration | Tempo médio de sessão | 5 min |
| Expenses/User/Week | Despesas registradas | 8 |

> Nenhum desses KPIs é medido hoje — o produto não tem analytics de uso instrumentado em
> produção. Permanecem como metas de referência.

### KPIs de Funcionalidade

| Feature | Métrica | Meta |
|---------|---------|------|
| OCR | Taxa de sucesso extração | 85% |
| Import de extrato | Taxa de sucesso extração/reconciliação | *(sem meta definida ainda)* |
| Chat Assistant | Mensagens/usuário/mês | 3 |
| Recurring Expenses | % usuários com ≥1 recorrente | 40% |
| Educational Content | % completaram ≥1 módulo | 30% |
| Gamificação | % usuários com gamificação ativa | *(sem meta definida ainda)* |
| PWA Install | % instalaram app | 25% |

### Performance

Os números abaixo são da v1.0 (21/01/2026) e **não foram remedidos** nesta revisão — use como
histórico, não como estado atual. Ver "Métricas de Sucesso" para o que foi reverificado agora.

| Métrica | Target | Último valor conhecido |
|---------|--------|-------|
| Lighthouse Performance | ≥90 | 92 |
| Lighthouse Accessibility | ≥95 | 97 |
| Lighthouse Best Practices | ≥90 | 93 |
| Lighthouse SEO | ≥90 | 91 |
| Lighthouse PWA | ≥80 | 85 |
| First Contentful Paint | <1.5s | 1.2s |
| Time to Interactive | <3s | 2.1s |
| Bundle Size (gzipped) | <350KB | 320KB — porém o build atual já avisa 3 chunks acima de 500KB minificados; recomenda-se reauditar |

---

## 🧪 Estratégia de Testes

### Unit Tests (Vitest)

**Estado verificado em 16/08/2026:** 135 testes passando em 18 arquivos (`npx vitest --run`).
Não há um número de cobertura percentual medido nesta revisão (a v1.0 citava 72%, não
reverificado).

**Arquivos de teste relevantes adicionados desde a v1.0:**
- `src/hooks/useBillingCycle.test.ts`
- `src/hooks/useImportTransactions.test.ts`
- `src/lib/bankPatterns.test.ts`
- `src/hooks/useAutoTheme.test.ts`
- `src/components/FirstVisitTip.test.tsx`
- `src/hooks/useExpensesRealtime.test.ts`
- `src/hooks/usePushNotifications.test.ts`
- `src/hooks/useMemoryLeak.test.ts`

### E2E Tests (Playwright)

**7 suítes + 1 setup** (estado real de `e2e/`):
- `auth.setup.ts` — projeto `setup`, gera o `storageState` que as suítes reusam (não é suíte)
1. `auth.spec.ts` — cadastro, login, logout
2. `expense-crud.spec.ts` — lista, edição e exclusão de despesa já importada
   (criação saiu junto com o lançamento manual; o spec guarda o redirect de `/add-expense`)
3. `reports-cycle.spec.ts` — relatórios por ciclo de faturamento
4. `export-pdf.spec.ts` — exportação PDF/CSV/XLSX
5. `insights.spec.ts` — insights de IA
6. `scheduled-exports.spec.ts` — exportações agendadas
7. `recurring-expenses.spec.ts` — despesas recorrentes

**Browsers:** Chrome, Firefox, Safari
**Viewports:** Desktop (1920x1080), Mobile (390x844)

> Nenhuma suíte E2E nova foi adicionada para Gamificação, Import de Extratos ou Onboarding
> Guiado — é um gap de cobertura conhecido, não um esquecimento silencioso (ver "Notas para
> Próxima Revisão" no final).

### Manual QA Checklist

**Crítico:**
- [ ] Signup/Login flow
- [ ] Import de extrato bancário (CSV/PDF) — **única** porta de entrada de gasto
- [ ] Editar/excluir despesa importada
- [ ] Reports generation
- [ ] PDF/Excel export
- [ ] Billing cycle calculation edge cases
- [ ] Delete account flow
- [ ] Wizard de onboarding completo (meta → ciclo → primeira conta) — **não testado
  manualmente end-to-end nesta revisão**, por falta de acesso a login real no ambiente de
  desenvolvimento atual

**Importante:**
- [ ] Dark mode toggle (manual e automático por horário)
- [ ] PWA installation
- [ ] Push notifications
- [ ] Chat assistant
- [ ] Recurring expenses
- [ ] Multi-account switching
- [ ] Gamificação: desbloqueio progressivo e conquistas
- [ ] Tooltips de primeira visita (aparecem uma vez, não reaparecem)

**Desejável:**
- [ ] Keyboard shortcuts
- [ ] Screen reader navigation
- [ ] Offline mode
- [ ] Cross-browser consistency

---

## 🚀 Roadmap e Releases

### v8.0.0 (21 Jan 2026)
**Status:** ✅ Lançado
- Todos os Epics 1-12 implementados (baseline da v1.0 deste PRD)

### v8.1.0 → v8.2.0 — Hardening + Onboarding Guiado (Ago 2026)
**Status:** ✅ Lançado (esta revisão do PRD documenta esse trabalho)

O roadmap da v1.0 previa "Onboarding wizard interativo", "Tutorial tooltips contextuais" e
"Dark/Light mode automático" para uma futura v8.1.0 — os três foram entregues (Epic 15). Junto
com isso, entre a v1.0 e agora também foram entregues, sem terem sido previstos no roadmap
original:
- Sistema de gamificação progressiva (Epic 13)
- Importação de extratos bancários via IA (Epic 14)
- Pacote de hardening de qualidade/segurança/performance (Epic 16): lint 97→0 erros, auditoria
  de segurança em todas as 13 edge functions (1 gap real corrigido), virtualização do relatório,
  paralelização de queries de gamificação, gate de logging de console

### v9.0.0 - Internacionalização (futuro, sem data)
**Prioridade:** Alta (ainda não iniciado)

- [ ] Suporte a múltiplos idiomas (pt-BR, en-US, es-ES)
- [ ] Formatação de moeda multi-locale
- [ ] Timezone por usuário
- [ ] Date/time formatting i18n

### v10.0.0 - Premium Features (futuro, sem data)
**Prioridade:** Baixa (Monetização — sem modelo de negócio validado ainda)

- [ ] Multi-currency support
- [ ] Bank account integration (Open Banking)
- [ ] Investment tracking
- [ ] Tax reporting (IRPF)
- [ ] Shared budgets (família/casal)
- [ ] Custom categories import/export
- [ ] API pública para integrações

### Backlog (Futuro)

- [ ] Mobile apps nativos (React Native)
- [ ] Desktop app (Electron)
- [ ] Integração com contadores
- [ ] Machine learning para previsões
- [ ] Gamificação avançada (badges de nível superior, streaks visíveis)
- [ ] Comunidade (compartilhar dicas)
- [ ] Testes E2E para Gamificação, Import de Extratos e Onboarding Guiado (gap identificado
  nesta revisão)
- [ ] Instrumentar analytics de produto — hoje nenhum KPI de negócio (DAU/MAU, retenção, NPS)
  é efetivamente medido

---

## 📖 Documentação Relacionada

### Para Desenvolvedores
- [CLAUDE.md](../CLAUDE.md) - Guia para Claude Code (atualizado continuamente — é a fonte mais
  confiável sobre o estado técnico atual)
- [Architecture](./architecture.md) - Arquitetura detalhada (não atualizado nesta revisão)
- [Database](./DATABASE.md) - Schema completo (não atualizado nesta revisão — ver seção "Modelo
  de Dados" acima para a lista de tabelas atual)
- [API](./API.md) - Edge functions (não atualizado nesta revisão)
- [Security](./SECURITY.md) - Segurança e RLS (não atualizado nesta revisão)
- [Testing](./testing.md) - Guia de testes
- [Hooks](./HOOKS.md) - Custom hooks (não atualizado nesta revisão)
- [Routes](./ROUTES.md) - Rotas da aplicação (não atualizado nesta revisão)
- [STATE.md](./STATE.md) - Snapshot vivo do estado do projeto, decisões técnicas recentes e
  itens em aberto — atualizado a cada sessão de trabalho, é o complemento operacional deste PRD

### Para Produto
- [Features](./FEATURES.md) - Funcionalidades detalhadas (não atualizado nesta revisão —
  não cobre Gamificação, Import de Extratos nem Onboarding Guiado ainda)
- [Sprint 7 Features](./sprint-7-features.md) - Features de um sprint anterior
- [Release Notes](./release-notes.md) - Histórico de versões (não atualizado nesta revisão)
- [Finalization Plan](./finalization-plan.md) - Plano de finalização

### Para Usuários (Futuro)
- [ ] User Guide - Guia do usuário
- [ ] FAQ - Perguntas frequentes
- [ ] Video Tutorials - Tutoriais em vídeo
- [ ] Privacy Policy - Política de privacidade
- [ ] Terms of Service - Termos de uso

---

## 🤝 Contribuidores e Stakeholders

### Product Team
- **Product Owner:** TBD
- **Product Designer:** TBD
- **Product Manager:** TBD

### Engineering Team
- **Tech Lead:** TBD
- **Frontend Engineers:** TBD
- **Backend Engineers:** TBD
- **QA Engineer:** TBD

### Stakeholders
- **CEO/Founder:** TBD

Nota: na prática, o projeto é mantido hoje por um desenvolvedor solo (marcotuliorod@gmail.com)
com apoio de Claude Code — a estrutura de squad acima é aspiracional, não o estado real da
equipe.

---

## 📝 Notas de Versão

**Versão 2.0 - 16/08/2026**
- Atualização completa refletindo o estado real do código em 16/08/2026, ~7 meses após a v1.0
- Adicionado Epic 13 (Gamificação Progressiva), Epic 14 (Importação de Extratos Bancários),
  Epic 15 (Onboarding Guiado — antes previsto como v8.1.0 futuro, agora shipped) e Epic 16
  (hardening de qualidade/segurança/performance)
- Modelo de dados atualizado de 21 para 27 tabelas
- Lista de edge functions atualizada de 10 para 13
- Métricas de sucesso separadas entre "reverificadas nesta revisão" e "da v1.0, não remedidas" —
  para não reafirmar números antigos (Lighthouse, bundle size, coverage %) como se fossem atuais
- Marcado como gap conhecido: ausência de testes E2E para as três features novas, e ausência de
  analytics de produto instrumentado

**Versão 1.0 - 21/01/2026**
- Documento inicial criado
- Todas as features documentadas (Epics 1-12)
- Roadmap definido
- Métricas estabelecidas

---

## 📞 Contato

**Project URL:** https://lovable.dev/projects/bd79470e-1098-4094-80c7-eb02c2d200bb
**Support:** [Lovable Discord](https://discord.com/channels/1119885301872070706/1280461670979993613)
**Documentation:** https://docs.lovable.dev/

---

**Última Atualização:** 16 de Agosto de 2026
**Próxima Revisão:** sugerido reavaliar quando a v9.0.0 (i18n) ou v10.0.0 (premium) entrarem em
planejamento, ou a cada ~3 meses de desenvolvimento ativo, o que vier primeiro
