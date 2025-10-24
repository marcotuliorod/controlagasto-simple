import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Insight {
  type: "positive" | "warning" | "tip";
  message: string;
}

export interface InsightsResponse {
  insights: Insight[];
  context?: any;
}

export const useInsights = () => {
  return useQuery({
    queryKey: ["insights"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<InsightsResponse>(
        "generate-insights",
        { body: {} }
      );

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus (expensive AI call)
    retry: 1,
  });
};
