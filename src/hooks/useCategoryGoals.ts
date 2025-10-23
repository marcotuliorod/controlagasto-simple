import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentMonth } from "@/lib/currencyUtils";

export interface CategoryGoal {
  id: string;
  user_id: string;
  category_id: string;
  month: string;
  limit_amount: number;
  category?: {
    name: string;
    icon: string;
    color: string;
  };
}

/**
 * Buscar metas de categorias do mês atual
 */
export function useCurrentMonthCategoryGoals() {
  const currentMonth = getCurrentMonth();

  return useQuery({
    queryKey: ["categoryGoals", currentMonth],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("category_goals")
        .select("*, category:categories(name, icon, color)")
        .eq("user_id", user.id)
        .eq("month", currentMonth);

      if (error) throw error;
      return data as CategoryGoal[];
    },
  });
}

/**
 * Upsert de meta de categoria
 */
export function useUpsertCategoryGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      month,
      limitAmount,
    }: {
      categoryId: string;
      month: string;
      limitAmount: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("category_goals")
        .upsert(
          {
            user_id: user.id,
            category_id: categoryId,
            month,
            limit_amount: limitAmount,
          },
          { onConflict: "user_id,category_id,month" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryGoals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Meta da categoria salva!");
    },
    onError: () => {
      toast.error("Erro ao salvar meta da categoria");
    },
  });
}

/**
 * Deletar meta de categoria
 */
export function useDeleteCategoryGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from("category_goals")
        .delete()
        .eq("id", goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categoryGoals"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Meta removida!");
    },
  });
}
