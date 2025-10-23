import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Profile {
  id: string;
  name: string;
  monthly_goal: number;
  billing_cycle_day?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Hook to fetch current user's profile
 */
export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }

      if (!data) {
        throw new Error("Perfil não encontrado");
      }

      return data as Profile;
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to update user profile (name, default monthly goal, and billing cycle day)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      name, 
      monthlyGoal, 
      billingCycleDay 
    }: { 
      name: string; 
      monthlyGoal: number;
      billingCycleDay?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const updateData: {
        name: string;
        monthly_goal: number;
        billing_cycle_day?: number;
      } = {
        name,
        monthly_goal: monthlyGoal,
      };

      // Only update billing_cycle_day if provided
      if (billingCycleDay !== undefined) {
        updateData.billing_cycle_day = billingCycleDay;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Profile update error:", error);
      toast.error("Erro ao atualizar perfil. Tente novamente.");
    },
  });
}

/**
 * Hook to request email change
 * Note: User will need to confirm via email link
 */
export function useUpdateEmail() {
  return useMutation({
    mutationFn: async (newEmail: string) => {
      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        console.error("Error updating email:", error);
        throw error;
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success(
        "Solicitação enviada! Verifique seu e-mail para confirmar a alteração.",
        { duration: 5000 }
      );
    },
    onError: (error: Error) => {
      console.error("Email update error:", error);
      toast.error("Erro ao solicitar alteração de e-mail. Tente novamente.");
    },
  });
}

/**
 * Hook to get current user's email
 */
export function useUserEmail() {
  return useQuery({
    queryKey: ["userEmail"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.email || "";
    },
  });
}
