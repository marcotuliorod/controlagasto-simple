import { useState, useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import { microcopy } from "@/lib/microcopy";

interface UndoableAction<T> {
  action: () => Promise<void>;
  undo: () => Promise<void>;
  data: T;
  message: string;
}

/**
 * Hook to handle undoable actions (like delete)
 * Shows a toast with undo button and executes after delay
 */
export function useUndoableAction<T>(timeoutMs: number = 5000) {
  const [pendingAction, setPendingAction] = useState<UndoableAction<T> | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const execute = useCallback(
    async (config: UndoableAction<T>) => {
      // Clear any pending action
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      setPendingAction(config);

      // Show toast with undo button using sonner
      sonnerToast(config.message, {
        description: `${microcopy.actions.undo} em ${timeoutMs / 1000}s`,
        action: {
          label: microcopy.actions.undo,
          onClick: async () => {
            await config.undo();
            setPendingAction(null);
            if (timeoutId) clearTimeout(timeoutId);
            sonnerToast.success("Ação desfeita", {
              description: "A operação foi revertida com sucesso.",
            });
          },
        },
      });

      // Execute action after timeout
      const id = setTimeout(async () => {
        try {
          await config.action();
          setPendingAction(null);
        } catch (error) {
          console.error("Error executing action:", error);
          sonnerToast.error("Erro", {
            description: microcopy.errors.generic,
          });
        }
      }, timeoutMs);

      setTimeoutId(id);
    },
    [timeoutId, timeoutMs]
  );

  const cancel = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setPendingAction(null);
  }, [timeoutId]);

  return {
    execute,
    cancel,
    pendingAction,
  };
}
