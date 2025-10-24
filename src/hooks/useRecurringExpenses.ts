import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecurringExpense {
  id: string;
  user_id: string;
  merchant: string;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  payment_method: string | null;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date: string | null;
  next_occurrence: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useRecurringExpenses = () => {
  const queryClient = useQueryClient();

  const { data: recurring, isLoading } = useQuery({
    queryKey: ["recurring-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_expenses")
        .select("*")
        .order("next_occurrence", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createRecurring = useMutation({
    mutationFn: async (recurringData: Omit<RecurringExpense, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("recurring_expenses").insert({
        ...recurringData,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
      toast.success("Despesa recorrente criada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar despesa recorrente");
    },
  });

  const updateRecurring = useMutation({
    mutationFn: async ({ id, ...data }: Partial<RecurringExpense> & { id: string }) => {
      const { error } = await supabase
        .from("recurring_expenses")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
      toast.success("Despesa recorrente atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar despesa recorrente");
    },
  });

  const deleteRecurring = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-expenses"] });
      toast.success("Despesa recorrente removida!");
    },
    onError: () => {
      toast.error("Erro ao remover despesa recorrente");
    },
  });

  return {
    recurring,
    isLoading,
    createRecurring,
    updateRecurring,
    deleteRecurring,
  };
};
