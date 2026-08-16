import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useProfile } from "./useProfile";

/**
 * 6h-18h = claro, 18h-6h = escuro (mesmo horário usado em getContextualGreeting).
 */
function computeTimeOfDayTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

/**
 * Aplica o tema automaticamente por horário, a menos que o usuário tenha
 * um override manual salvo no perfil (theme_preference), que sempre vence.
 */
export function useAutoTheme() {
  const { setTheme } = useTheme();
  const { data: profile } = useProfile();

  useEffect(() => {
    if (!profile) return;

    const applyTheme = () => {
      if (profile.theme_preference) {
        setTheme(profile.theme_preference);
      } else {
        setTheme(computeTimeOfDayTheme());
      }
    };

    applyTheme();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        applyTheme();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [profile, setTheme]);
}
