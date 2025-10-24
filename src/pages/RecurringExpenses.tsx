import { useState } from "react";
import { useRecurringExpenses } from "@/hooks/useRecurringExpenses";
import { useAccounts } from "@/hooks/useAccounts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Repeat, Calendar, Trash2, Edit, Pause, Play } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RecurringExpenses() {
  const { recurring, isLoading, createRecurring, updateRecurring, deleteRecurring } = useRecurringExpenses();
  const { accounts } = useAccounts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextOccurrence = new Date(startDate);
    
    const data = {
      merchant,
      amount: parseFloat(amount),
      category_id: categoryId || null,
      account_id: accountId || null,
      frequency,
      start_date: startDate,
      end_date: endDate || null,
      next_occurrence: nextOccurrence.toISOString().split("T")[0],
      payment_method: paymentMethod || null,
      notes: notes || null,
      is_active: true,
    };

    if (editingId) {
      await updateRecurring.mutateAsync({ id: editingId, ...data });
    } else {
      await createRecurring.mutateAsync(data);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setMerchant("");
    setAmount("");
    setCategoryId("");
    setAccountId("");
    setFrequency("monthly");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setPaymentMethod("");
    setNotes("");
    setEditingId(null);
  };

  const handleEdit = (rec: any) => {
    setEditingId(rec.id);
    setMerchant(rec.merchant);
    setAmount(rec.amount.toString());
    setCategoryId(rec.category_id || "");
    setAccountId(rec.account_id || "");
    setFrequency(rec.frequency);
    setStartDate(rec.start_date);
    setEndDate(rec.end_date || "");
    setPaymentMethod(rec.payment_method || "");
    setNotes(rec.notes || "");
    setIsDialogOpen(true);
  };

  const toggleActive = (id: string, isActive: boolean) => {
    updateRecurring.mutate({ id, is_active: !isActive });
  };

  const frequencyLabels = {
    daily: "Diária",
    weekly: "Semanal",
    monthly: "Mensal",
    yearly: "Anual",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Despesas Recorrentes</h1>
            <p className="text-muted-foreground">Gerencie despesas que se repetem periodicamente</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Recorrência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar" : "Nova"} Despesa Recorrente</DialogTitle>
                <DialogDescription>
                  Configure uma despesa que se repete automaticamente
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="merchant">Estabelecimento *</Label>
                  <Input
                    id="merchant"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="Ex: Netflix"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account">Conta</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.filter(a => a.is_active).map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.icon} {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequência *</Label>
                  <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diária</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data Início *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data Fim (opcional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment">Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Débito">Débito</SelectItem>
                      <SelectItem value="Crédito">Crédito</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione observações..."
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingId ? "Salvar Alterações" : "Criar Recorrência"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Carregando despesas recorrentes...</p>
          </Card>
        ) : recurring && recurring.length > 0 ? (
          <div className="grid gap-4">
            {recurring.map((rec: any) => (
              <Card key={rec.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{rec.merchant}</h3>
                      <Badge variant={rec.is_active ? "default" : "secondary"}>
                        {rec.is_active ? "Ativo" : "Pausado"}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">R$ {rec.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Repeat className="w-4 h-4" />
                        <span>{frequencyLabels[rec.frequency as keyof typeof frequencyLabels]}</span>
                      </div>
                      {rec.categories && (
                        <div className="flex items-center gap-1">
                          <span>{rec.categories.icon}</span>
                          <span>{rec.categories.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <span>Próxima ocorrência:</span>{" "}
                        <span className="font-medium text-foreground">
                          {format(new Date(rec.next_occurrence), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </p>
                      {rec.end_date && (
                        <p>
                          <span>Encerra em:</span>{" "}
                          <span className="font-medium">
                            {format(new Date(rec.end_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(rec.id, rec.is_active)}
                    >
                      {rec.is_active ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(rec)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Confirma exclusão desta recorrência?")) {
                          deleteRecurring.mutate(rec.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Repeat className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Nenhuma despesa recorrente</h3>
            <p className="text-muted-foreground mb-4">
              Configure despesas que se repetem automaticamente (assinaturas, contas fixas, etc.)
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Recorrência
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
