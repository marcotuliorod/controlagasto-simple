# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Sprint 1: Ciclo de Faturamento Personalizado (v6.0.0)

#### UX do Ciclo de Faturamento
- **Reports: Botão "Ciclo Atual"**
  - Novo botão para aplicar automaticamente o range de datas do ciclo personalizado
  - Tooltip explicativo mostrando as datas do ciclo (ex: 05/01 - 04/02)
  - Desabilitado quando o usuário usa ciclo padrão (dia 1)
  - Toast informativo ao aplicar o ciclo

- **Add/Edit Expense: Feedback de Ciclo**
  - Toast após salvar despesa mostrando o ciclo de faturamento (ex: "Jan/2025 (05/01 - 04/02)")
  - Card visual na tela de edição indicando a qual ciclo a despesa pertence
  - Formato internacionalizado em pt-BR

- **Onboarding: Configuração do Dia de Recebimento**
  - Nova etapa perguntando "Quando você recebe seu salário?"
  - Botões rápidos para dias 1, 5, 10, 15
  - Opção "Outro dia" com input manual (1-28)
  - Exemplo visual do impacto nos ciclos
  - Salva `billing_cycle_day` no perfil do usuário

- **Metas por Categoria: Respeito ao Ciclo**
  - CategoryGoalsManager agora usa o ciclo de faturamento ao invés do mês calendário
  - Card informativo mostrando qual ciclo está sendo gerenciado
  - Hook `useCategoryGoals` atualizado para usar `getCurrentCycle()`

### Added - Sprint 2: E2E Tests com Playwright

#### Infraestrutura de Testes
- **Playwright Configuration**
  - Setup completo com suporte a Chrome, Firefox, Safari, Mobile
  - Reporters: HTML, JSON, List
  - Screenshots e vídeos on failure
  - Traces on retry
  
- **Test Fixtures & Utilities**
  - `e2e/fixtures/test-data.ts`: Dados de teste reutilizáveis
  - `e2e/auth.setup.ts`: Setup de autenticação compartilhado
  - Funções helper: `waitForPageLoad`, `generateTestEmail`, `formatCurrency`

#### Specs E2E (6 cenários críticos)
- **auth.spec.ts**: Fluxo completo de autenticação
  - Display correto da página de auth
  - Signup de novo usuário
  - Validação de formato de email
  - Login de usuário existente
  - Logout com sucesso

- **expense-crud.spec.ts**: Operações CRUD de despesas
  - Criar nova despesa
  - Exibir despesa na lista
  - Editar despesa existente
  - Deletar despesa com confirmação
  - Validação de campos obrigatórios
  - Validação de datas futuras

- **ocr-basic.spec.ts**: Processamento OCR de recibos
  - Exibição do botão de upload
  - Aceitação de arquivos de imagem
  - Estado de processamento durante OCR
  - Preenchimento automático dos campos
  - Tratamento de erros
  - Override manual de resultados

- **reports-cycle.spec.ts**: Relatórios com ciclo de faturamento
  - Exibição de filtros de data
  - Botão "Ciclo Atual" para usuários com ciclo custom
  - Aplicação de datas do ciclo nos filtros
  - Tooltip com informações do ciclo
  - Filtro por range de datas
  - Exibição de KPIs (Total, Média, Contagem)
  - Renderização de gráficos (Pizza e Barra)
  - Validação de constraints de data

- **export-pdf.spec.ts**: Exportação de relatórios
  - Exibição dos botões de export (PDF, CSV, XLSX, JSON)
  - Download de PDF com nome correto
  - Estado de loading durante geração
  - Export CSV, XLSX e JSON
  - Toast de sucesso após export
  - Tratamento de erros

- **insights.spec.ts**: Insights financeiros com IA
  - Exibição do card de insights no dashboard
  - Insights gerados por IA (Gemini 2.5 Flash)
  - Tipos de insight (✅ positivo, ⚠️ alerta, 💡 dica, 🎯 meta)
  - Timestamp da última geração
  - Insights baseados em dados reais
  - Estado vazio tratado
  - Navegação para detalhes
  - Múltiplos insights por card

### Added - Sprint 3: CI/CD & Quality

#### GitHub Actions Workflow
- **Lint & Type Check Job**
  - ESLint com zero erros
  - TypeScript strict mode
  - Executa em paralelo com outros jobs

- **Unit Tests Job**
  - Vitest com reporter verbose
  - Upload de coverage reports
  - Dependente de lint/typecheck

- **E2E Tests Job**
  - Playwright com Chromium
  - Upload de reports, screenshots e vídeos
  - Artifacts mantidos por 7-30 dias
  - Variáveis de ambiente do Supabase via secrets

- **Lighthouse CI Job**
  - Auditorias de Performance (≥90), Accessibility (≥95), Best Practices (≥90), SEO (≥90), PWA (≥80)
  - 3 execuções por URL para estabilidade
  - URLs testadas: Home, Auth, Dashboard, Add Expense, Reports
  - Upload de resultados JSON

- **Build Job**
  - Dependente de unit e E2E tests
  - Build de produção
  - Upload de artifacts (dist/)

#### Scripts NPM
- `npm run typecheck`: TypeScript validation
- `npm run test`: Vitest unit tests
- `npm run test:ui`: Vitest UI mode
- `npm run test:e2e`: Playwright E2E tests
- `npm run test:e2e:headed`: E2E com browser visível
- `npm run test:e2e:ui`: Playwright UI mode
- `npm run test:e2e:debug`: Debug mode
- `npm run test:all`: Unit + E2E
- `npm run quality`: Lint + Typecheck + Tests
- `npm run prebuild`: Typecheck antes do build

#### Lighthouse Configuration
- `lighthouserc.js`: Configuração de thresholds
- `scripts/lighthouse-ci.js`: Script automatizado de análise
- Preset desktop com throttling realista
- Assertions para todas as categorias

## [5.3.0] - 2025-01-XX

### Fixed
- PWA: Manifest 100/100, Service Worker com logs detalhados
- Push Notifications: UX melhorado com onboarding
- Realtime: WebSocket errors resolvidos com cleanup adequado

### Added
- Dashboard com ciclo de faturamento (Fase 1)
- Índices de performance no banco de dados (Fase 2)

## [5.2.0] - 2024-12-XX

### Added
- OCR de recibos com Lovable AI Vision
- Insights financeiros com Gemini 2.5 Flash
- Export de relatórios (CSV, JSON, PDF, XLSX)
- Chat assistente financeiro

## [5.1.0] - 2024-11-XX

### Added
- Sistema de metas por categoria
- Gráficos de comparação mensal
- Filtros avançados em relatórios

## [5.0.0] - 2024-10-XX

### Added
- Versão inicial do app
- Autenticação com Supabase
- CRUD de despesas
- Dashboard com totalizadores
- PWA configurado

---

## Versão Futura (v6.0.0) - Production Release

### Added - Sprint 4: Performance Optimizations
- **Code Splitting**
  - Lazy loading de todas as páginas com React.lazy()
  - Suspense boundaries com loading spinner
  - Import dinâmico do AppLayout
  
- **Query Optimizations**
  - React Query staleTime: 5 minutos para dados estáticos
  - Seleção mínima de campos nas queries Supabase
  - Memoização de cálculos pesados (useMemo)

### Added - Sprint 5: Documentation
- **Documentação Técnica**
  - `docs/billing-cycle.md`: Guia completo do feature de ciclo
  - `docs/testing.md`: Guia de testes unitários e E2E
  - `docs/architecture.md`: Arquitetura do projeto
  - README.md expandido com features completas
  
- **Developer Experience**
  - Scripts npm documentados
  - Estrutura de projeto explicada
  - Guias de deployment
  - Roadmap público

---

**Convenções de Changelog:**
- `Added`: Novas funcionalidades
- `Changed`: Mudanças em funcionalidades existentes
- `Deprecated`: Funcionalidades a serem removidas
- `Removed`: Funcionalidades removidas
- `Fixed`: Correções de bugs
- `Security`: Correções de vulnerabilidades
