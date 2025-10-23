import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import BottomNav from "@/components/BottomNav";
import FABAddExpense from "@/components/FABAddExpense";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background to-secondary/20">
        {/* Desktop Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <main className="flex-1 pb-16 md:pb-0 overflow-x-hidden">
          {/* Mobile trigger */}
          <div className="md:hidden sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card/95 backdrop-blur px-4">
            <SidebarTrigger />
            <h1 className="text-sm font-semibold">Entenda Gastos</h1>
          </div>

          {/* Page content */}
          <div className="min-h-[calc(100vh-3.5rem)] md:min-h-screen">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />

        {/* Floating Action Button */}
        <FABAddExpense />
      </div>
    </SidebarProvider>
  );
}
