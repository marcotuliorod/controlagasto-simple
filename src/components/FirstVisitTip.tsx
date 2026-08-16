import { ReactNode, useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface FirstVisitTipProps {
  /** Unique id for this tip — used as the localStorage dismissal key. */
  id: string;
  message: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * Wraps an element with a tooltip that's forced open the first time this
 * `id` is seen, and never shown again once dismissed (localStorage, same
 * convention as PushOnboarding.tsx's 'push-onboarding-seen' /
 * InstallPWA.tsx's 'pwa-install-dismissed').
 */
export function FirstVisitTip({ id, message, children, side = "bottom" }: FirstVisitTipProps) {
  const storageKey = `tip-seen-${id}`;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      setOpen(true);
    }
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(storageKey, "true");
    setOpen(false);
  };

  return (
    <Tooltip open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs space-y-2">
        <p>{message}</p>
        <Button size="sm" className="w-full h-7 text-xs" onClick={dismiss}>
          Entendi
        </Button>
      </TooltipContent>
    </Tooltip>
  );
}
