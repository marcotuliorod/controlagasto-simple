import { NavLink } from "react-router-dom";
import { Home, Receipt, Heart, User } from "lucide-react";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Início" },
  { path: "/expenses", icon: Receipt, label: "Despesas" },
  { path: "/financial-health", icon: Heart, label: "Saúde" },
  { path: "/account/profile", icon: User, label: "Perfil" },
];

export default function BottomNav() {
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
              `flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
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
      </div>
    </nav>
  );
}
