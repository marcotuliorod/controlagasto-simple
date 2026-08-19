import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";
import RequireOnboarding from "./routes/RequireOnboarding";
import InstallPWA from "./components/InstallPWA";
import { PWAInstallProvider } from "./providers/PWAInstallProvider";
import { ScreenReaderAnnouncer } from "./components/ScreenReaderAnnouncer";
import { useAutoTheme } from "./hooks/useAutoTheme";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));
const ExpensesVirtualized = lazy(() => import("./pages/ExpensesVirtualized"));
const EditExpense = lazy(() => import("./pages/EditExpense"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const AccountProfile = lazy(() => import("./pages/AccountProfile"));
const Education = lazy(() => import("./pages/Education"));
const Quiz = lazy(() => import("./pages/Quiz"));
const FinancialHealth = lazy(() => import("./pages/FinancialHealth"));
const Simulator = lazy(() => import("./pages/Simulator"));
const ChatAssistant = lazy(() => import("./pages/ChatAssistant"));
const Settings = lazy(() => import("./pages/Settings"));
const Accounts = lazy(() => import("./pages/Accounts"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const ScheduledExports = lazy(() => import("./pages/ScheduledExports"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const RecurringExpenses = lazy(() => import("./pages/RecurringExpenses"));
const AccountDashboard = lazy(() => import("./pages/AccountDashboard"));
const ImportTransactions = lazy(() => import("./pages/ImportTransactions"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Layout wrapper
const AppLayout = lazy(() => import("./components/AppLayout"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

// Aplica o tema automático por horário (ou o override salvo no perfil).
// Componente próprio para poder usar hooks que dependem do ThemeProvider e
// do QueryClientProvider, montados acima de App no retorno do JSX.
const AutoThemeSync = () => {
  useAutoTheme();
  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <PWAInstallProvider>
            <BrowserRouter>
              <Toaster />
              <Sonner />
              <InstallPWA />
              <ScreenReaderAnnouncer />
              <AutoThemeSync />
              <Suspense fallback={<LoadingFallback />}>
              <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              
              {/* Onboarding route */}
              <Route element={<RequireOnboarding />}>
                <Route path="/onboarding" element={<Onboarding />} />
              </Route>
              
              {/* Authenticated routes with layout */}
              <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
              {/* Lançamento manual saiu: gastos entram só por extrato/fatura.
                  A rota continua existindo para não quebrar link antigo nem
                  shell de PWA já instalado, redirecionando para a importação. */}
              <Route path="/add-expense" element={<Navigate to="/import-transactions" replace />} />
              <Route path="/expenses" element={<AppLayout><ExpensesVirtualized /></AppLayout>} />
              <Route path="/expenses/:id/edit" element={<AppLayout><EditExpense /></AppLayout>} />
              <Route path="/reports" element={<AppLayout><Reports /></AppLayout>} />
              <Route path="/education" element={<AppLayout><Education /></AppLayout>} />
              <Route path="/quiz" element={<AppLayout><Quiz /></AppLayout>} />
              <Route path="/financial-health" element={<AppLayout><FinancialHealth /></AppLayout>} />
              <Route path="/simulator" element={<AppLayout><Simulator /></AppLayout>} />
              <Route path="/chat" element={<AppLayout><ChatAssistant /></AppLayout>} />
              <Route path="/accounts" element={<AppLayout><Accounts /></AppLayout>} />
              <Route path="/accounts/:accountId" element={<AppLayout><AccountDashboard /></AppLayout>} />
              <Route path="/audit-logs" element={<AppLayout><AuditLogs /></AppLayout>} />
              <Route path="/settings" element={<AppLayout><Settings /></AppLayout>} />
              <Route path="/scheduled-exports" element={<AppLayout><ScheduledExports /></AppLayout>} />
              <Route path="/notification-settings" element={<AppLayout><NotificationSettings /></AppLayout>} />
              <Route path="/recurring-expenses" element={<AppLayout><RecurringExpenses /></AppLayout>} />
              <Route path="/import-transactions" element={<AppLayout><ImportTransactions /></AppLayout>} />
              <Route path="/account/profile" element={<AppLayout><AccountProfile /></AppLayout>} />
              <Route path="/account/delete" element={<AppLayout><DeleteAccount /></AppLayout>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </PWAInstallProvider>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
  );
};

export default App;
