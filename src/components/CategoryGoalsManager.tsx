import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Target, Check, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentMonthCategoryGoals, useUpsertCategoryGoal, useDeleteCategoryGoal } from "@/hooks/useCategoryGoals";
import { formatCurrencyBR, parseCurrencyBR, getCurrentMonth } from "@/lib/currencyUtils";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function CategoryGoalsManager() {
  const currentMonth = getCurrentMonth();
  const { data: categoryGoals = [], isLoading: goalsLoading } = useCurrentMonthCategoryGoals();
  const upsertGoal = useUpsertCategoryGoal();
  const deleteGoal = useDeleteCategoryGoal();

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [limitInput, setLimitInput] = useState("");

  // Fetch all categories
  const { data: allCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, icon, color")
        .or(`user_id.eq.${user.id},is_default.eq.true`)
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
  });

  // Filter categories that don't have goals yet
  const availableCategories = allCategories.filter(
    cat => !categoryGoals.some(goal => goal.category_id === cat.id)
  );

  const handleSave = async () => {
    if (!selectedCategoryId) {
      toast.error("Selecione uma categoria");
      return;
    }

    const limitAmount = parseCurrencyBR(limitInput);
    if (limitAmount <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }

    await upsertGoal.mutateAsync({
      categoryId: selectedCategoryId,
      month: currentMonth,
      limitAmount,
    });

    setShowAddForm(false);
    setSelectedCategoryId("");
    setLimitInput("");
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setSelectedCategoryId("");
    setLimitInput("");
  };

  if (goalsLoading || categoriesLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-12 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Metas por Categoria
        </CardTitle>
        <CardDescription>
          Configure limites individuais para cada categoria de gasto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categoryGoals.length === 0 && !showAddForm ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma meta de categoria configurada
            </p>
          ) : (
            <div className="space-y-2">
              {categoryGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{goal.category?.icon}</span>
                    <div>
                      <p className="font-medium">{goal.category?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Limite: {formatCurrencyBR(goal.limit_amount)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteGoal.mutate(goal.id)}
                    disabled={deleteGoal.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {showAddForm && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma categoria</option>
                  {availableCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="limit">Limite (R$)</Label>
                <Input
                  id="limit"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  placeholder="1.234,56"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={upsertGoal.isPending}
                  className="flex-1"
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {!showAddForm && availableCategories.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Meta de Categoria
            </Button>
          )}

          {availableCategories.length === 0 && !showAddForm && categoryGoals.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Todas as categorias já possuem metas configuradas
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
