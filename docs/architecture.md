# Architecture Documentation

## Technology Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Component library
- **React Query** - Server state management
- **React Router** - Client-side routing

### Backend (Supabase)
- **Supabase** - Backend as a service
  - PostgreSQL database
  - Authentication
  - Row Level Security (RLS)
  - Edge Functions
  - Storage
  - Realtime subscriptions

## Project Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Shadcn components
│   │   ├── chat/           # Chat assistant components
│   │   └── simulators/     # Financial simulators
│   ├── pages/              # Route pages
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── integrations/       # External integrations
│   │   └── supabase/       # Supabase client and types
│   ├── providers/          # Context providers
│   ├── routes/             # Route guards
│   └── schemas/            # Zod validation schemas
├── supabase/
│   ├── functions/          # Edge Functions
│   └── config.toml         # Supabase configuration
├── e2e/                    # E2E tests
├── docs/                   # Documentation
└── public/                 # Static assets
```

## Key Features

### 1. Billing Cycle Management
- Custom cycle day configuration (1-28)
- All reports and budgets respect user's billing cycle
- See `docs/billing-cycle.md` for details

### 2. Expense Tracking
- Entrada exclusiva por importação de extrato/fatura (sem lançamento manual)
- Edição e exclusão do que foi importado
- Multi-account support
- Category-based organization

### 3. Financial Insights
- AI-powered insights generation
- Budget vs actual analysis
- Spending patterns detection
- Health score calculation

### 4. Reports & Analytics
- Monthly and custom date ranges
- Category breakdown
- Trend analysis
- Export to PDF/Excel

### 5. Chat Assistant
- AI-powered financial advice
- Contextual suggestions
- Expense queries

### 6. Educational Content
- Financial literacy articles
- Interactive quizzes
- Financial simulators

## Data Flow

### Expense Creation
1. User envia extrato/fatura em `ImportTransactions`
2. `process-import-file` parseia e devolve as transações para revisão
3. User confere, ajusta categorias e confirma
4. Mutation sent to Supabase via React Query
5. RLS policies validate user access
6. Database triggers create audit logs
7. Edge function checks category goals
8. Push notification sent if threshold exceeded
9. Realtime subscription updates other clients

### Report Generation
1. User selects date range or billing cycle
2. `useQuery` fetches expenses for period
3. Client-side aggregation and calculations
4. Data visualization with `recharts`
5. Optional PDF export via `html2pdf.js`

## Database Schema

### Core Tables
- `profiles` - User profiles and settings
- `expenses` - Expense records
- `categories` - Expense categories
- `accounts` - Financial accounts (wallet, bank, etc.)
- `monthly_goals` - Budget goals per cycle
- `category_goals` - Per-category spending limits
- `audit_logs` - Change history

### Auth Integration
- RLS policies enforce user isolation
- `auth.uid()` used in policies
- Profile auto-created on signup via trigger

## State Management

### Server State (React Query)
- Caching with stale-time optimization
- Optimistic updates for better UX
- Background refetching
- Query invalidation on mutations

### Local State
- React hooks for component state
- Context for theme and PWA install
- No global state management needed

## Performance Optimizations

### Code Splitting
- Lazy loading of routes
- Dynamic imports for heavy components
- Suspense boundaries

### Query Optimization
- Minimal field selection in Supabase queries
- Pagination for large lists
- Indexed database queries
- Debounced search inputs

### Caching Strategy
- React Query cache (5 min stale time for static data)
- Supabase realtime for live updates
- Service worker for offline support

## Security

### Authentication
- Email/password authentication
- Auto-confirm in development
- Secure password requirements

### Authorization
- Row Level Security (RLS) on all tables
- User can only access own data
- Service role key only in Edge Functions

### Data Protection
- HTTPS enforced
- Secrets in environment variables
- CORS properly configured
- Input validation on client and server

## Testing Strategy

### Unit Tests (Vitest)
- Utility functions
- Hooks
- Component logic
- >80% coverage goal

### E2E Tests (Playwright)
- Critical user journeys
- Cross-browser testing
- Mobile viewport testing

### CI/CD
- Automated testing on PR
- Lighthouse CI for performance
- Type checking
- Linting

See `docs/testing.md` for detailed testing guide.

## Deployment

### Build Process
```bash
npm run build
```
- Vite builds optimized production bundle
- TypeScript type checking
- Asset optimization
- Service worker generation

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- Gerenciado via Supabase CLI (migrations, functions, secrets)

## Future Considerations

### Scalability
- Current architecture supports thousands of users
- Database indices optimize query performance
- Edge Functions auto-scale with traffic
- CDN for static assets

### Extensibility
- Modular component structure
- Clear separation of concerns
- Typed interfaces
- Documentation for new features
