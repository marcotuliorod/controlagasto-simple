import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { AccountWithBalance } from "@/hooks/useAccounts";

interface AccountCardProps {
  account: AccountWithBalance;
  onEdit: (account: AccountWithBalance) => void;
  onDelete: (id: string) => void;
}

const accountTypeLabels: Record<string, string> = {
  wallet: "Carteira",
  checking: "Conta Corrente",
  savings: "Poupança",
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  investment: "Investimento",
};

export const AccountCard = ({ account, onEdit, onDelete }: AccountCardProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div
            className="text-3xl flex-shrink-0"
            style={{ color: account.color }}
          >
            {account.icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{account.name}</h3>
            <p className="text-sm text-muted-foreground">
              {accountTypeLabels[account.type]}
              {account.last4 && ` •••• ${account.last4}`}
            </p>
            
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo inicial:</span>
                <span>{formatCurrency(account.initial_balance)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Saldo atual:</span>
                <span className={account.current_balance < 0 ? "text-destructive" : "text-primary"}>
                  {formatCurrency(account.current_balance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 ml-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(account)}
            className="h-8 w-8"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(account.id)}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!account.is_active && (
        <div className="mt-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">Conta inativa</span>
        </div>
      )}
    </Card>
  );
};
