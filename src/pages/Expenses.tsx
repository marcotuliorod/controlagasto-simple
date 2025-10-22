import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Expenses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", searchQuery, selectedCategory, selectedPayment, dateFrom, dateTo],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      let query = supabase
        .from("expenses")
        .select("*, categories(*)")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (selectedCategory && selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      if (selectedPayment && selectedPayment !== "all") {
        query = query.eq("payment_method", selectedPayment);
      }

      if (dateFrom) {
        query = query.gte("date", dateFrom);
      }

      if (dateTo) {
        query = query.lte("date", dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (searchQuery) {
        return data.filter((expense) =>
          expense.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.notes?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return data;
    },
  });

  // Subscrever a mudanças em tempo real na tabela expenses
  useEffect(() => {
    const channel = supabase
      .channel('expenses-page-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'expenses'
        },
        (payload) => {
          console.log('Expense changed in list:', payload);
          // Invalidar queries para recarregar dados
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success("Despesa excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setDeleteId(null);
    } catch (error: any) {
      toast.error("Erro ao excluir despesa");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Minhas Despesas</h1>
        </div>

        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPayment} onValueChange={setSelectedPayment}>
              <SelectTrigger>
                <SelectValue placeholder="Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                <SelectItem value="Débito">Débito</SelectItem>
                <SelectItem value="Crédito">Crédito</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="De"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Até"
            />
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </Card>
        ) : expenses.length === 0 ? (
          <Card className="p-6">
            <p className="text-center text-muted-foreground">
              Nenhuma despesa encontrada
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <Card
                key={expense.id}
                className="p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {expense.categories?.icon || "💰"}
                      </span>
                      <div>
                        <p className="font-semibold">
                          {expense.merchant || "Sem descrição"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {expense.categories?.name} •{" "}
                          {format(new Date(expense.date), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                          {expense.payment_method && ` • ${expense.payment_method}`}
                        </p>
                        {expense.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {expense.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <p className="text-xl font-bold text-primary">
                      R$ {Number(expense.amount).toFixed(2)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/expenses/${expense.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(expense.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta despesa? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
