import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyBR } from "@/lib/currencyUtils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, X, ArrowRightLeft } from "lucide-react";
import type { ClassifiedTransaction } from "@/hooks/useImportTransactions";
import type { TransactionClassification } from "@/lib/bankPatterns";

interface TransferReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfers: ClassifiedTransaction[];
  onDecisions: (decisions: Array<{ originalRow: number; decision: 'expense' | 'ignore' }>) => void;
}

export function TransferReviewDialog({
  open,
  onOpenChange,
  transfers,
  onDecisions
}: TransferReviewDialogProps) {
  const [decisions, setDecisions] = useState<Record<number, 'expense' | 'ignore' | null>>({});

  const handleDecision = (originalRow: number, decision: 'expense' | 'ignore') => {
    setDecisions(prev => ({
      ...prev,
      [originalRow]: prev[originalRow] === decision ? null : decision
    }));
  };

  const handleSave = () => {
    const finalDecisions = Object.entries(decisions)
      .filter(([_, decision]) => decision !== null)
      .map(([row, decision]) => ({
        originalRow: parseInt(row),
        decision: decision as 'expense' | 'ignore'
      }));
    
    onDecisions(finalDecisions);
    onOpenChange(false);
  };

  const handleMarkAllAsExpense = () => {
    const allAsExpense: Record<number, 'expense'> = {};
    transfers.forEach(t => {
      if (t.originalRow !== undefined) {
        allAsExpense[t.originalRow] = 'expense';
      }
    });
    setDecisions(allAsExpense);
  };

  const handleMarkAllAsIgnore = () => {
    const allAsIgnore: Record<number, 'ignore'> = {};
    transfers.forEach(t => {
      if (t.originalRow !== undefined) {
        allAsIgnore[t.originalRow] = 'ignore';
      }
    });
    setDecisions(allAsIgnore);
  };

  const decidedCount = Object.values(decisions).filter(d => d !== null).length;
  const pendingCount = transfers.length - decidedCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Revisar Transferências
          </DialogTitle>
          <DialogDescription>
            Estas transferências podem ser despesas para terceiros ou movimentações internas entre suas contas.
            Decida o que fazer com cada uma:
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleMarkAllAsExpense}>
              <Check className="h-4 w-4 mr-1 text-green-500" />
              Todas são Despesas
            </Button>
            <Button variant="outline" size="sm" onClick={handleMarkAllAsIgnore}>
              <X className="h-4 w-4 mr-1 text-red-500" />
              Ignorar Todas
            </Button>
          </div>
          <Badge variant="outline">
            {decidedCount}/{transfers.length} decididas
          </Badge>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {transfers.map((tx) => {
              const originalRow = tx.originalRow || 0;
              const decision = decisions[originalRow];
              
              return (
                <div 
                  key={originalRow}
                  className={`p-4 rounded-lg border transition-colors ${
                    decision === 'expense' 
                      ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                      : decision === 'ignore'
                      ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                      : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tx.merchant}</p>
                        {decision && (
                          <Badge 
                            variant={decision === 'expense' ? 'default' : 'destructive'}
                            className={decision === 'expense' ? 'bg-green-500' : ''}
                          >
                            {decision === 'expense' ? 'Despesa' : 'Ignorar'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="text-muted-foreground">
                          {format(parseISO(tx.date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                        </span>
                        <span className="font-mono font-semibold">
                          {formatCurrencyBR(tx.amount)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={decision === 'expense' ? 'default' : 'outline'}
                        className={decision === 'expense' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                        onClick={() => handleDecision(originalRow, 'expense')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Despesa
                      </Button>
                      <Button
                        size="sm"
                        variant={decision === 'ignore' ? 'destructive' : 'outline'}
                        onClick={() => handleDecision(originalRow, 'ignore')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Ignorar
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {pendingCount > 0 
                ? `${pendingCount} transferência(s) ainda não decidida(s)`
                : 'Todas as transferências foram decididas!'
              }
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar Decisões
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
