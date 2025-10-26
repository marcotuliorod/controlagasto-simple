import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import BottomNav from "@/components/BottomNav";
import FABAddExpense from "@/components/FABAddExpense";
import { GlobalSearch } from "@/components/GlobalSearch";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      {/* Skip to main content link for keyboard navigation (a11y) */}
      <a href="#main-content" className="skip-to-main">
        Pular para o conteúdo principal
      </a>
      
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-secondary/20">
        {/* Desktop Sidebar - Semantic HTML */}
        <aside className="hidden md:block" aria-label="Menu lateral de navegação">
          <AppSidebar />
        </aside>

        {/* Main Content - Semantic HTML with ID for skip link */}
        <main id="main-content" className="flex-1 pb-16 md:pb-0 overflow-x-hidden" role="main">
          {/* Mobile trigger */}
          <header className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card/95 backdrop-blur px-4">
            <SidebarTrigger aria-label="Abrir menu de navegação" />
            <h1 className="text-sm font-semibold">Entenda Gastos</h1>
          </header>

          {/* Page content */}
          <div className="min-h-[calc(100vh-3.5rem)] md:min-h-screen">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />

        {/* Floating Action Button */}
        <FABAddExpense />
        
        {/* Global Search (Cmd+K) */}
        <GlobalSearch />
      </div>
    </SidebarProvider>
  );
}
