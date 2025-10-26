import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  Receipt,
  TrendingUp,
  User,
  Settings,
  LogOut,
  Wallet,
  GraduationCap,
  Brain,
  Heart,
  Calculator,
  MessageCircle,
  Shield,
  Repeat,
  FileOutput,
  Bell,
  X,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";

  const mainItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Despesas", url: "/expenses", icon: Receipt },
    { title: "Contas", url: "/accounts", icon: Wallet, badge: "Novo" },
    { title: "Relatórios", url: "/reports", icon: TrendingUp },
    { title: "Saúde Financeira", url: "/financial-health", icon: Heart },
    { title: "Simulador", url: "/simulator", icon: Calculator },
    { title: "Chat IA", url: "/chat", icon: MessageCircle },
    { title: "Educação", url: "/education", icon: GraduationCap },
    { title: "Quiz", url: "/quiz", icon: Brain },
  ];

const advancedItems = [
  { title: "Despesas Recorrentes", url: "/recurring-expenses", icon: Repeat, badge: "Novo" },
  { title: "Exportações Agendadas", url: "/scheduled-exports", icon: FileOutput, badge: "Novo" },
  { title: "Notificações", url: "/notification-settings", icon: Bell, badge: "Novo" },
];

const accountItems = [
  { title: "Perfil & Metas", url: "/account/profile", icon: User },
  { title: "Audit Logs", url: "/audit-logs", icon: Shield },
  { title: "Configurações", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getNavClassName = (isActive: boolean) =>
    isActive
      ? "bg-primary/10 text-primary font-medium hover:bg-primary/15"
      : "hover:bg-muted/50";

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Entenda Gastos</span>
                <span className="text-xs text-muted-foreground">Finanças Pessoais</span>
              </div>
            )}
          </div>
          {/* Botão fechar visível apenas no mobile */}
          <SidebarTrigger className="md:hidden" asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              aria-label="Fechar menu"
              className="focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-5 w-5" />
            </Button>
          </SidebarTrigger>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={getNavClassName(isActive)}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && (
                          <span className="flex items-center gap-2">
                            {item.title}
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                {item.badge}
                              </Badge>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recursos Avançados</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {advancedItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={getNavClassName(isActive)}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && (
                          <span className="flex items-center gap-2">
                            {item.title}
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                {item.badge}
                              </Badge>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={getNavClassName(isActive)}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "default"}
            onClick={handleSignOut}
            className="w-full justify-start"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
