# Finanças Pessoais - Personal Finance Manager

A comprehensive personal finance management application built with React, TypeScript, and Supabase. Track expenses, set budgets, analyze spending patterns, and get AI-powered financial insights.

## 🚀 Features

### Core Functionality
- **Expense Tracking** - Add, edit, and delete expenses with multi-account support
- **Custom Billing Cycles** - Configure billing cycle day (1-28) for accurate budget tracking
- **Category Management** - Organize expenses with customizable categories
- **Multi-Account Support** - Track expenses across multiple wallets and accounts
- **OCR Receipt Processing** - Extract expense data from receipt images
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

### Backend (Lovable Cloud)
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

# Set up environment variables
# Create .env file with Supabase credentials
# (automatically configured in Lovable)

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
npm run test:all        # Run all tests
npm run quality         # Run all quality checks

# Code Quality
npm run lint            # Lint code
npm run typecheck       # TypeScript type checking
```

## 📖 Documentation

- [Billing Cycle Feature](docs/billing-cycle.md)
- [Testing Guide](docs/testing.md)
- [Architecture](docs/architecture.md)
- [PWA Setup](docs/pwa-setup.md)
- [Push Notifications](docs/push-notifications.md)
- [Realtime & WebSockets](docs/realtime-websockets.md)
- [Release Notes](docs/release-notes.md)

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

Coverage: >80% unit test coverage target

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

### Via Lovable
1. Open project in [Lovable](https://lovable.dev/projects/bd79470e-1098-4094-80c7-eb02c2d200bb)
2. Click Share → Publish
3. Done! ✅

### Custom Hosting
The project can be deployed to any static hosting provider:
- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront

See [Lovable docs](https://docs.lovable.dev/tips-tricks/custom-domain/) for custom domain setup.

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

- [Lovable Documentation](https://docs.lovable.dev/)
- [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)
- Project URL: https://lovable.dev/projects/bd79470e-1098-4094-80c7-eb02c2d200bb

## 🎯 Roadmap

- [ ] Multi-currency support
- [ ] Recurring expenses
- [ ] Budget forecasting
- [ ] Bank account integration
- [ ] Investment tracking
- [ ] Tax reporting
- [ ] Shared household budgets

## 📊 Performance

- Lighthouse Score: 90+ across all metrics
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- PWA-ready
- Offline support

## Project Info

**URL**: https://lovable.dev/projects/bd79470e-1098-4094-80c7-eb02c2d200bb

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/bd79470e-1098-4094-80c7-eb02c2d200bb) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui (including Sidebar component)
- Tailwind CSS
- Vitest (testing)
- Supabase (auth, database, storage, edge functions)
- React Router DOM (with NavLink for active states)

## Running Tests

This project includes unit tests to ensure code quality and prevent regressions:

```sh
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Security

This project implements the following security measures:

- **Row-Level Security (RLS)**: All database tables have RLS policies enabled
- **Function Security**: Database functions use `SECURITY DEFINER` with fixed `search_path = 'public'`
- **Password Protection**: (Requires manual activation) Enable "Check against leaked passwords" in Supabase Auth settings
- **Private Storage**: Receipt files are stored in a private bucket with signed URLs
- **JWT Verification**: All Edge Functions verify authentication tokens

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/bd79470e-1098-4094-80c7-eb02c2d200bb) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
