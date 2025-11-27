import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { microcopy } from "@/lib/microcopy";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";

interface ErrorRecoveryProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorRecovery({
  title = "Erro",
  message = microcopy.errors.generic,
  onRetry,
  onDismiss,
  className,
}: ErrorRecoveryProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <Alert
      variant="destructive"
      className={cn(
        "mb-4",
        !prefersReducedMotion && "animate-shake",
        className
      )}
    >
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p className="text-sm">{message}</p>
        <div className="flex gap-2 mt-3">
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="bg-background"
            >
              {microcopy.actions.retry}
            </Button>
          )}
          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
            >
              {microcopy.actions.cancel}
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
