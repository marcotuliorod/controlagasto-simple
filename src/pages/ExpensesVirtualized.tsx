import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
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
import { Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useExpensesRealtime } from "@/hooks/useExpensesRealtime";
import { AdvancedFilters, type FilterValues } from "@/components/AdvancedFilters";

export default function ExpensesVirtualized() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const parentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<FilterValues>({
    categories: [],
    tags: [],
    minAmount: "",
    maxAmount: "",
    paymentMethods: [],
  });

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
    queryKey: ["expenses", searchQuery, selectedCategory, selectedPayment, dateFrom, dateTo, advancedFilters],
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
      
      // Advanced filters
      if (advancedFilters.categories.length > 0) {
        query = query.in("category_id", advancedFilters.categories);
      }
      
      if (advancedFilters.tags.length > 0) {
        query = query.overlaps("tags", advancedFilters.tags);
      }
      
      if (advancedFilters.minAmount) {
        query = query.gte("amount", parseFloat(advancedFilters.minAmount));
      }
      
      if (advancedFilters.maxAmount) {
        query = query.lte("amount", parseFloat(advancedFilters.maxAmount));
      }
      
      if (advancedFilters.paymentMethods.length > 0) {
        query = query.in("payment_method", advancedFilters.paymentMethods);
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

  // ⚡ Virtual scrolling configuration
  const rowVirtualizer = useVirtualizer({
    count: expenses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96, // Height of each expense card (~96px)
    overscan: 5, // Render 5 extra items for smooth scrolling
  });

  // ✅ Hook centralizado para Realtime
  const invalidateExpenses = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }, [queryClient]);

  useExpensesRealtime({
    channelName: 'expenses-list-virtualized',
    onUpdate: invalidateExpenses,
  });

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
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Minhas Despesas</h1>

        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Filtros</h2>
            <AdvancedFilters 
              currentFilters={advancedFilters}
              onApply={setAdvancedFilters}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                aria-label="Buscar despesas"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger aria-label="Filtrar por categoria">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span aria-label={`Categoria ${cat.name}`}>
                      {cat.icon} {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPayment} onValueChange={setSelectedPayment}>
              <SelectTrigger aria-label="Filtrar por forma de pagamento">
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
              aria-label="Data inicial"
            />

            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Até"
              aria-label="Data final"
            />
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-6">
            <p className="text-center text-muted-foreground" role="status" aria-live="polite">
              Carregando despesas...
            </p>
          </Card>
        ) : expenses.length === 0 ? (
          <Card className="p-6">
            <p className="text-center text-muted-foreground" role="status" aria-live="polite">
              Nenhuma despesa encontrada
            </p>
          </Card>
        ) : (
          <div
            ref={parentRef}
            className="h-[600px] overflow-auto rounded-lg"
            role="list"
            aria-label="Lista de despesas"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const expense = expenses[virtualRow.index];
                return (
                  <Card
                    key={expense.id}
                    className="p-4 hover:shadow-lg transition-shadow absolute top-0 left-0 w-full"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    role="listitem"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl" role="img" aria-label={expense.categories?.name || "Categoria"}>
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
                            aria-label={`Editar despesa ${expense.merchant || 'sem descrição'}`}
                            title="Editar despesa"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(expense.id)}
                            aria-label={`Excluir despesa ${expense.merchant || 'sem descrição'}`}
                            title="Excluir despesa"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance info for debugging */}
        {expenses.length > 100 && (
          <Card className="p-4 bg-muted">
            <p className="text-sm text-muted-foreground">
              ⚡ Virtual scrolling ativo: renderizando apenas{" "}
              {rowVirtualizer.getVirtualItems().length} de {expenses.length} despesas
            </p>
          </Card>
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
