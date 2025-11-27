import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  illustration,
}: EmptyStateProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Card className={cn("p-8 md:p-12", !prefersReducedMotion && "animate-fade-in")}>
      <div className="flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
        {illustration || (
          <div className={cn(
            "rounded-full bg-gradient-to-br from-muted to-muted/50 p-6",
            !prefersReducedMotion && "animate-scale-in"
          )}>
            <Icon className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {actionLabel && onAction && (
          <Button 
            onClick={onAction} 
            className={cn("mt-4", !prefersReducedMotion && "hover:scale-105 transition-transform")}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </Card>
  );
}
