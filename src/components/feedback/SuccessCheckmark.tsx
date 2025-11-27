import { CheckCircle2 } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface SuccessCheckmarkProps {
  message?: string;
  className?: string;
}

export function SuccessCheckmark({ message, className }: SuccessCheckmarkProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={cn("flex items-center gap-2 text-success", className)}>
      <CheckCircle2 
        className={cn(
          "w-5 h-5",
          !prefersReducedMotion && "animate-scale-in"
        )} 
      />
      {message && (
        <span className={cn(
          "text-sm font-medium",
          !prefersReducedMotion && "animate-fade-in"
        )}>
          {message}
        </span>
      )}
    </div>
  );
}
