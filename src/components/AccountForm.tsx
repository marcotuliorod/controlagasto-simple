import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Account } from "@/hooks/useAccounts";

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (account: Partial<Account>) => void;
  account?: Account | null;
}

const accountTypes = [
  { value: "wallet", label: "Carteira" },
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Poupança" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "debit_card", label: "Cartão de Débito" },
  { value: "investment", label: "Investimento" },
];

const accountIcons = ["💵", "🏦", "💳", "💰", "📊", "🪙", "💸", "🏧"];
const accountColors = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", 
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
];

export const AccountForm = ({ open, onClose, onSubmit, account }: AccountFormProps) => {
  const [formData, setFormData] = useState({
    name: account?.name || "",
    type: account?.type || "checking",
    last4: account?.last4 || "",
    initial_balance: account?.initial_balance || 0,
    icon: account?.icon || "💳",
    color: account?.color || "#3b82f6",
    is_active: account?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: account?.id,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account ? "Editar Conta" : "Nova Conta"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome da Conta</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Conta Corrente"
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as Account["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(formData.type === "credit_card" || formData.type === "debit_card") && (
            <div>
              <Label htmlFor="last4">Últimos 4 dígitos (opcional)</Label>
              <Input
                id="last4"
                value={formData.last4}
                onChange={(e) => setFormData({ ...formData, last4: e.target.value })}
                placeholder="1234"
                maxLength={4}
              />
            </div>
          )}

          <div>
            <Label htmlFor="initial_balance">Saldo Inicial</Label>
            <Input
              id="initial_balance"
              type="number"
              step="0.01"
              value={formData.initial_balance}
              onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div>
            <Label>Ícone</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              {accountIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`text-2xl p-2 rounded border-2 transition-colors ${
                    formData.icon === icon ? "border-primary" : "border-transparent hover:border-muted"
                  }`}
                  onClick={() => setFormData({ ...formData, icon })}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap mt-2">
              {accountColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    formData.color === color ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, color })}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Conta Ativa</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {account ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
