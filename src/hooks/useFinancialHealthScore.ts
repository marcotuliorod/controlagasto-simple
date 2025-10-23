import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface FinancialHealthScore {
  id: string;
  user_id: string;
  score: number;
  budget_adherence_score: number;
  quiz_performance_score: number;
  consistency_score: number;
  savings_score: number;
  month: string;
  created_at: string;
}

export interface ScoreBreakdown {
  total_score: number;
  budget_score: number;
  quiz_score: number;
  consistency_score: number;
  savings_score: number;
}

export const useFinancialHealthScore = (month?: string) => {
  const currentMonth = month || format(new Date(), "yyyy-MM");

  return useQuery({
    queryKey: ["financial-health-score", currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_health_scores")
        .select("*")
        .eq("month", currentMonth)
        .maybeSingle();

      if (error) throw error;
      return data as FinancialHealthScore | null;
    },
  });
};

export const useCalculateScore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (month: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Call the database function to calculate score
      const { data: breakdown, error: calcError } = await supabase
        .rpc("calculate_financial_health_score", {
          p_user_id: user.id,
          p_month: month,
        })
        .single();

      if (calcError) throw calcError;

      const scoreData = breakdown as ScoreBreakdown;

      // Upsert the score
      const { error: upsertError } = await supabase
        .from("financial_health_scores")
        .upsert({
          user_id: user.id,
          month: month,
          score: scoreData.total_score,
          budget_adherence_score: scoreData.budget_score,
          quiz_performance_score: scoreData.quiz_score,
          consistency_score: scoreData.consistency_score,
          savings_score: scoreData.savings_score,
        }, {
          onConflict: "user_id,month"
        });

      if (upsertError) throw upsertError;

      return scoreData;
    },
    onSuccess: (_, month) => {
      queryClient.invalidateQueries({ queryKey: ["financial-health-score", month] });
    },
  });
};

export const useScoreHistory = () => {
  return useQuery({
    queryKey: ["financial-health-score-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_health_scores")
        .select("*")
        .order("month", { ascending: false })
        .limit(12);

      if (error) throw error;
      return data as FinancialHealthScore[];
    },
  });
};

export const getScoreLevel = (score: number): {
  level: string;
  color: string;
  emoji: string;
  message: string;
} => {
  if (score >= 90) {
    return {
      level: "Excelente",
      color: "text-green-500",
      emoji: "🏆",
      message: "Sua saúde financeira está excepcional!",
    };
  } else if (score >= 75) {
    return {
      level: "Muito Bom",
      color: "text-blue-500",
      emoji: "⭐",
      message: "Você está indo muito bem!",
    };
  } else if (score >= 60) {
    return {
      level: "Bom",
      color: "text-yellow-500",
      emoji: "👍",
      message: "Bom trabalho, continue assim!",
    };
  } else if (score >= 40) {
    return {
      level: "Regular",
      color: "text-orange-500",
      emoji: "⚠️",
      message: "Há espaço para melhorias.",
    };
  } else {
    return {
      level: "Precisa Melhorar",
      color: "text-red-500",
      emoji: "📉",
      message: "Vamos trabalhar juntos para melhorar!",
    };
  }
};
