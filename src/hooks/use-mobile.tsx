import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function getIsMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Valor inicial calculado de forma síncrona (lazy initializer), não em
 * useEffect: esta é uma SPA sem SSR, `window` já existe no primeiro render,
 * e adiar o cálculo real deixava uma janela onde `isMobile` lia `false`
 * mesmo em viewport mobile — SidebarProvider (ui/sidebar.tsx) decide entre
 * abrir o Sheet mobile ou o painel desktop com base nesse valor, e um clique
 * no SidebarTrigger nessa janela alternava o estado errado (nunca abria o
 * menu mobile). Reproduzia de forma intermitente em CI mais lenta.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(getIsMobile);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(getIsMobile());
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
