import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface ContextualInsightProps {
  type: "warning" | "info" | "success";
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}

export function ContextualInsight({
  type,
  title,
  message,
  action,
  onAction,
  className,
}: ContextualInsightProps) {
  const prefersReducedMotion = useReducedMotion();

  const icons = {
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle2,
  };

  const colors = {
    warning: "border-warning/50 bg-warning/5",
    info: "border-info/50 bg-info/5",
    success: "border-success/50 bg-success/5",
  };

  const iconColors = {
    warning: "text-warning",
    info: "text-info",
    success: "text-success",
  };

  const Icon = icons[type];

  return (
    <Card
      className={cn(
        "p-4 border-l-4",
        colors[type],
        !prefersReducedMotion && "animate-slide-up",
        className
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", iconColors[type])} />
        <div className="flex-1 space-y-1">
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground">{message}</p>
          {action && onAction && (
            <Button
              variant="link"
              size="sm"
              onClick={onAction}
              className="p-0 h-auto text-xs"
            >
              {action} →
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
