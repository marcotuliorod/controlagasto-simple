# Entenda Gastos - Personal Finance Manager

A comprehensive personal finance management application built with React, TypeScript, and Supabase. Track expenses, set budgets, analyze spending patterns, and get AI-powered financial insights.

![Version](https://img.shields.io/badge/version-8.0.0-blue.svg)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)
![Coverage](https://img.shields.io/badge/coverage-72%25-green.svg)
![Lighthouse](https://img.shields.io/badge/lighthouse-92-brightgreen.svg)

## 🚀 Features

### 🆕 Sprint 7 - Advanced Features (NEW!)
- **🔍 Global Search (Cmd+K)** - Universal search across expenses, categories, and accounts
- **🎯 Advanced Filters** - Multi-category, tags, amount range, payment methods with save/load
- **📊 Account Dashboard** - Detailed analytics and insights for each account
- **⏰ Automated Cron Jobs** - Scheduled processing for recurring expenses and exports
- **✅ Comprehensive E2E Tests** - 9 test suites covering all critical flows

### Core Functionality
- **Expense Tracking** - Add, edit, and delete expenses with multi-account support
- **Custom Billing Cycles** - Configure billing cycle day (1-28) for accurate budget tracking
- **Category Management** - Organize expenses with customizable categories
- **Multi-Account Support** - Track expenses across multiple wallets and accounts
- **Statement Import** - Extract expenses from bank statements and card bills (CSV/OFX/PDF)
- **Audit Logs** - Complete history of all data changes

### Reports & Analytics
- **Dashboard** - Overview of spending, budget status, and trends
- **Detailed Reports** - Monthly and custom date range reports
- **Category Analysis** - Spending breakdown by category
- **Billing Cycle Reports** - Track expenses by billing cycle
- **Export Options** - PDF and Excel export

### AI-Powered Features
- **Financial Insights** - AI-generated spending analysis and recommendations
- **Chat Assistant** - Ask questions about your finances
- **Smart Categorization** - Automatic expense categorization

### Financial Tools
- **Budget Goals** - Set monthly and category-specific spending limits
- **Health Score** - Financial health tracking and scoring
- **Simulators** - Investment, financing, and compound interest calculators
- **Educational Content** - Financial literacy articles and quizzes

### Technical Features
- **PWA Support** - Install as native app on mobile/desktop
- **Push Notifications** - Budget alerts and reminders
- **Offline Support** - Works without internet connection
- **Realtime Updates** - Live data synchronization
- **Dark Mode** - Eye-friendly dark theme
- **Responsive Design** - Works on all devices

## 🛠 Technology Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + Shadcn/ui
- React Query (data fetching)
- React Router (routing)
- Recharts (data visualization)

### Backend (Supabase)
- Supabase (PostgreSQL)
- Edge Functions (serverless)
- Authentication
- Storage
- Realtime subscriptions

## 📦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (for backend)

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.
# Para desenvolvimento local, `npx supabase start` imprime os dois valores.

# Start development server
npm run dev
```

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm run test            # Run unit tests
npm run test:e2e        # Run E2E tests
# Code Quality
npm run lint            # Lint code
npm run typecheck       # TypeScript type checking
```

## 📖 Documentation

- [Sprint 7 Features](docs/sprint-7-features.md) - **NEW!** Latest advanced features
- [Billing Cycle Feature](docs/billing-cycle.md)
- [Testing Guide](docs/testing.md)
- [Architecture](docs/architecture.md)
- [PWA Setup](docs/pwa-setup.md)
- [Push Notifications](docs/push-notifications.md)
- [Realtime & WebSockets](docs/realtime-websockets.md)
- [Release Notes](docs/release-notes.md)
- [Finalization Plan](docs/finalization-plan.md)

## 🧪 Testing

### Unit Tests (Vitest)
```bash
npm run test              # Watch mode
npm run test -- --run     # Run once
npm run test:ui           # Open UI
```

### E2E Tests (Playwright)
```bash
npm run test:e2e          # Headless
npm run test:e2e:headed   # With browser
npm run test:e2e:ui       # Open UI
npm run test:e2e:debug    # Debug mode
```

Coverage: >70% unit test coverage (currently 72%)

**E2E Test Suites (9 total):**
1. Authentication flow
2. Expense CRUD operations
3. Statement/bill import
4. Reports with billing cycle
5. PDF/CSV/XLSX export
6. AI insights generation
7. Scheduled exports (Sprint 7)
8. Recurring expenses (Sprint 7)
9. Tags & notes (Sprint 7)

## 🏗 Project Structure

```
├── src/
│   ├── components/       # Reusable components
│   │   ├── ui/          # Shadcn components
│   │   ├── chat/        # Chat assistant
│   │   └── simulators/  # Financial calculators
│   ├── pages/           # Route pages
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities
│   ├── integrations/    # Supabase integration
│   └── schemas/         # Validation schemas
├── supabase/
│   ├── functions/       # Edge Functions
│   └── config.toml      # Configuration
├── e2e/                 # E2E tests
├── docs/                # Documentation
└── public/              # Static assets
```

## 🚀 Deployment

### Frontend

O app é uma SPA estática (Vite). Basta servir `dist/` em qualquer host, com
rewrite de todas as rotas para `index.html`:

```bash
npm run build     # gera dist/
```

Funciona em Vercel, Netlify, Cloudflare Pages, S3+CloudFront ou nginx próprio.

### Backend

- **Supabase**: `npx supabase db push` aplica as migrations; `npx supabase
  functions deploy` publica as edge functions. Para self-host, `supabase start`
  sobe o stack completo localmente (ver `supabase/config.toml`).
- **Serviço de IA** (`services/ai`): container Node. Precisa estar acessível
  pelas edge functions, que o alcançam via o secret `AI_SERVICE_URL`.

Sem `AI_SERVICE_URL` configurado, as funcionalidades de IA respondem 503 — o
resto do app segue funcionando.

## 🔒 Security

- Row Level Security (RLS) on all tables
- User data isolation
- Secure authentication
- Environment variable protection
- CORS configuration
- Input validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and quality checks
5. Submit a pull request

## 📝 License

This project is private and proprietary.

## 🆘 Support

- [CLAUDE.md](CLAUDE.md) — guia técnico do projeto
- [docs/architecture.md](docs/architecture.md) — arquitetura
- [Documentação do Supabase](https://supabase.com/docs)

## 🎯 Roadmap

### ✅ Sprint 7 - Advanced Features (COMPLETED)
- [x] Global Search (Cmd+K)
- [x] Advanced Filters with save/load
- [x] Account Dashboard
- [x] Automated cron jobs
- [x] Comprehensive E2E tests

### 🚧 Sprint 8 - Polish & Production Prep (In Progress)
- [ ] UI/UX polish
- [ ] Bug fixes
- [ ] Security audit
- [ ] Performance tuning
- [ ] User documentation

### 📅 Future Features
- [ ] Multi-currency support
- [ ] Bank account integration
- [ ] Investment tracking
- [ ] Tax reporting
- [ ] Shared household budgets

## 📊 Performance

- **Lighthouse Performance**: 92 ✅ (target: 90+)
- **Lighthouse Accessibility**: 97 ✅ (target: 95+)
- **Lighthouse Best Practices**: 93 ✅ (target: 90+)
- **Lighthouse SEO**: 91 ✅ (target: 90+)
- **Lighthouse PWA**: 85 ✅ (target: 80+)
- **First Contentful Paint**: <1.5s
- **Time to Interactive**: <3s
- **Bundle Size**: 320KB gzipped ✅ (target: <350KB)
- **Test Coverage**: 72% ✅ (target: 70%+)
- **PWA-ready** with offline support
