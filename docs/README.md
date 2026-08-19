# 📊 Rinesk - Documentação do Projeto

**Rinesk** é um aplicativo completo de gestão financeira pessoal, desenvolvido como Progressive Web App (PWA) com foco em educação financeira, controle de despesas e insights inteligentes.

---

## 🚀 Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **UI Components** | Shadcn/ui, Radix UI, Lucide Icons |
| **State Management** | TanStack Query (React Query), React Context |
| **Backend** | Supabase (Postgres, Auth, Storage, Edge Functions) |
| **Database** | PostgreSQL com RLS |
| **Auth** | Supabase Auth (email/password) |
| **Edge Functions** | Deno (Supabase Edge Functions) |
| **AI** | Camada própria provider-agnostic (`services/ai`) |
| **PWA** | Workbox, Service Worker, Push Notifications |

---

## 📁 Estrutura do Projeto

```
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── pages/          # Páginas da aplicação
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilitários e helpers
│   ├── integrations/   # Integrações (Supabase client)
│   ├── providers/      # Context providers
│   ├── routes/         # Componentes de roteamento
│   └── schemas/        # Schemas de validação (Zod)
├── supabase/
│   ├── functions/      # Edge Functions
│   └── config.toml     # Configuração do Supabase
├── docs/               # Documentação
├── e2e/                # Testes E2E (Playwright)
└── public/             # Assets estáticos e PWA
```

---

## 📚 Índice da Documentação

| Documento | Descrição |
|-----------|-----------|
| [FEATURES.md](./FEATURES.md) | Funcionalidades completas do sistema |
| [DATABASE.md](./DATABASE.md) | Modelo de dados e diagrama ER |
| [API.md](./API.md) | Edge Functions e endpoints |
| [SECURITY.md](./SECURITY.md) | Políticas de segurança e RLS |
| [PWA.md](./PWA.md) | Progressive Web App e Push Notifications |
| [HOOKS.md](./HOOKS.md) | Custom hooks disponíveis |
| [ROUTES.md](./ROUTES.md) | Rotas da aplicação |
| [CHANGELOG.md](./CHANGELOG.md) | Histórico de versões |

---

## 🎯 Principais Funcionalidades

1. **Gestão de Despesas** - Entrada exclusiva por importação de extrato/fatura
2. **Despesas Recorrentes** - Automação de gastos fixos
3. **Múltiplas Contas** - Carteira, conta corrente, cartões
4. **Metas e Orçamento** - Controle mensal e por categoria
5. **Relatórios** - Gráficos interativos e exportações
6. **Educação Financeira** - Conteúdo educativo e quiz
7. **Assistente IA** - Chat inteligente sobre finanças
8. **Notificações Push** - Alertas de metas e variações
9. **Saúde Financeira** - Score personalizado

---

## 🔐 Segurança

- Row Level Security (RLS) em todas as tabelas
- Autenticação JWT via Supabase Auth
- Edge Functions protegidas
- Storage privado com políticas por usuário

---

## 📱 PWA

O aplicativo é instalável em:
- Android (Chrome)
- iOS (Safari)
- Desktop (Chrome, Edge)

Suporta funcionamento offline e notificações push nativas.

---

## 🧪 Testes

- **Unit Tests**: Vitest
- **E2E Tests**: Playwright
- **CI/CD**: GitHub Actions

---

## 📄 Licença

Projeto privado - Todos os direitos reservados.
