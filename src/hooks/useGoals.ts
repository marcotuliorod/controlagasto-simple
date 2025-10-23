import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentMonth } from "@/lib/currencyUtils";

export interface MonthlyGoal {
  id: string;
  user_id: string;
  month: string;
  total_limit: number;
  created_at?: string;
}

/**
 * Hook to fetch current month's goal
 */
export function useCurrentMonthGoal() {
  const currentMonth = getCurrentMonth();

  return useQuery({
    queryKey: ["currentMonthGoal", currentMonth],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("monthly_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .maybeSingle();

      if (error) {
        console.error("Error fetching current month goal:", error);
        throw error;
      }

      return data as MonthlyGoal | null;
    },
  });
}

/**
 * Hook to upsert a single monthly goal
 */
export function useUpsertMonthlyGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ month, totalLimit }: { month: string; totalLimit: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("monthly_goals")
        .upsert(
          {
            user_id: user.id,
            month,
            total_limit: totalLimit,
          },
          {
            onConflict: "user_id,month",
          }
        )
        .select()
        .single();

      if (error) {
        console.error("Error upserting monthly goal:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentMonthGoal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error: Error) => {
      console.error("Monthly goal upsert error:", error);
      toast.error("Erro ao salvar meta do mês. Tente novamente.");
    },
  });
}

/**
 * Hook to upsert multiple monthly goals using RPC function
 * More efficient for batch operations
 */
export function useUpsertMultipleGoalsRPC() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ months, totalLimit }: { months: string[]; totalLimit: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { error } = await supabase.rpc("upsert_monthly_goals", {
        p_user_id: user.id,
        p_months: months,
        p_limit: totalLimit,
      });

      if (error) {
        console.error("Error upserting multiple goals:", error);
        throw error;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["currentMonthGoal"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success(
        `Metas propagadas com sucesso para ${variables.months.length} ${
          variables.months.length === 1 ? "mês" : "meses"
        }!`
      );
    },
    onError: (error: Error) => {
      console.error("Multiple goals upsert error:", error);
      toast.error("Erro ao propagar metas. Tente novamente.");
    },
  });
}
