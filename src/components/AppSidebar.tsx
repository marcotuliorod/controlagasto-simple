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
  FileUp,
  Lock,
  CheckCircle,
  LucideIcon,
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UnlockProgressIndicator } from "@/components/gamification/UnlockProgressIndicator";
import { LockedMenuTooltip } from "@/components/gamification/LockedMenuTooltip";
import { 
  useMenuItemUnlockStatus, 
  useGamificationEnabled 
} from "@/hooks/useGamification";
import { toast } from "sonner";

interface MenuItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
  key: string;
}

const mainItems: MenuItem[] = [
  { key: "dashboard", title: "Dashboard", url: "/dashboard", icon: Home },
  { key: "expenses", title: "Despesas", url: "/expenses", icon: Receipt },
  { key: "accounts", title: "Contas", url: "/accounts", icon: Wallet },
  { key: "reports", title: "Relatórios", url: "/reports", icon: TrendingUp },
  { key: "financial-health", title: "Saúde Financeira", url: "/financial-health", icon: Heart },
  { key: "simulator", title: "Simulador", url: "/simulator", icon: Calculator },
  { key: "chat", title: "Chat IA", url: "/chat", icon: MessageCircle },
  { key: "education", title: "Educação", url: "/education", icon: GraduationCap },
  { key: "quiz", title: "Quiz", url: "/quiz", icon: Brain },
];

const advancedItems: MenuItem[] = [
  { key: "import-transactions", title: "Importar Extrato", url: "/import-transactions", icon: FileUp },
  { key: "recurring-expenses", title: "Despesas Recorrentes", url: "/recurring-expenses", icon: Repeat },
  { key: "scheduled-exports", title: "Exportações Agendadas", url: "/scheduled-exports", icon: FileOutput },
  { key: "notification-settings", title: "Notificações", url: "/notification-settings", icon: Bell },
];

const accountItems: MenuItem[] = [
  { key: "account/profile", title: "Perfil & Metas", url: "/account/profile", icon: User },
  { key: "audit-logs", title: "Audit Logs", url: "/audit-logs", icon: Shield },
  { key: "settings", title: "Configurações", url: "/settings", icon: Settings },
];

function MenuItemWithLock({ item, isCollapsed }: { item: MenuItem; isCollapsed: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isUnlocked, requirement, progress } = useMenuItemUnlockStatus(item.key);
  const isActive = location.pathname === item.url;

  const getNavClassName = (active: boolean) =>
    active
      ? "bg-muted text-foreground font-medium"
      : "hover:bg-muted/50";

  const handleClick = (e: React.MouseEvent) => {
    if (!isUnlocked && requirement && progress) {
      e.preventDefault();
      toast.info("Funcionalidade Bloqueada", {
        description: requirement.unlock_message || "Complete os requisitos para desbloquear",
        action: {
          label: "Aprender",
          onClick: () => navigate("/education"),
        },
      });
    }
  };

  const content = (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink
          to={isUnlocked ? item.url : "#"}
          className={`${getNavClassName(isActive)} ${!isUnlocked ? "opacity-60" : ""}`}
          aria-current={isActive ? "page" : undefined}
          onClick={handleClick}
        >
          <item.icon className="h-4 w-4" />
          {!isCollapsed && (
            <span className="flex items-center gap-2 flex-1">
              {item.title}
              {item.badge && isUnlocked && (
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {item.badge}
                </Badge>
              )}
              {!isUnlocked && (
                <Lock className="h-3 w-3 ml-auto text-muted-foreground" />
              )}
              {isUnlocked && requirement && (
                <CheckCircle className="h-3 w-3 ml-auto text-primary" />
              )}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  if (!isUnlocked && requirement && progress) {
    return (
      <LockedMenuTooltip
        requirement={requirement}
        progress={progress}
        isCollapsed={isCollapsed}
      >
        {content}
      </LockedMenuTooltip>
    );
  }

  return content;
}

export function AppSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const { data: gamificationSettings } = useGamificationEnabled();

  const handleSignOut = async () => {
    /*
     * `scope: 'local'` encerra SÓ esta sessão. O padrão do Supabase é `global`,
     * que revoga todos os refresh tokens do usuário — sair no navegador do
     * trabalho deslogava o celular junto, sem aviso nenhum.
     *
     * Para derrubar todas as sessões de propósito (senha vazada, aparelho
     * perdido) o lugar é uma ação explícita de "sair de todos os dispositivos",
     * não o botão de sair do menu.
     */
    await supabase.auth.signOut({ scope: "local" });
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <Wallet className="h-5 w-5 text-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-medium">Entenda Gastos</span>
              <span className="text-xs text-muted-foreground">Finanças Pessoais</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Gamification Progress */}
        {!isCollapsed && gamificationSettings?.enabled && !gamificationSettings?.bypass && (
          <div className="px-3 pt-3">
            <UnlockProgressIndicator />
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <MenuItemWithLock 
                  key={item.key} 
                  item={item} 
                  isCollapsed={isCollapsed} 
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recursos Avançados</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {advancedItems.map((item) => (
                <MenuItemWithLock 
                  key={item.key} 
                  item={item} 
                  isCollapsed={isCollapsed} 
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <MenuItemWithLock 
                  key={item.key} 
                  item={item} 
                  isCollapsed={isCollapsed} 
                />
              ))}
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
