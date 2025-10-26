import { NavLink } from "react-router-dom";
import { Home, Receipt, Heart, User, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Início" },
  { path: "/expenses", icon: Receipt, label: "Despesas" },
  { path: "/financial-health", icon: Heart, label: "Saúde" },
  { path: "/account/profile", icon: User, label: "Perfil" },
];

export default function BottomNav() {
  const { toggleSidebar } = useSidebar();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-card border-t z-40 md:hidden safe-area-inset-bottom"
      aria-label="Navegação principal"
    >
      <div className="flex justify-around items-center h-16 max-w-screen-sm mx-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`
            }
            aria-label={item.label}
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-xs">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        
        {/* Botão Menu que abre a sidebar */}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs">Menu</span>
        </button>
      </div>
    </nav>
  );
}
