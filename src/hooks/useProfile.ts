import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Profile {
  id: string;
  name: string;
  monthly_goal: number;
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
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }

      return data as Profile;
    },
  });
}

/**
 * Hook to update user profile (name and default monthly goal)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, monthlyGoal }: { name: string; monthlyGoal: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          name,
          monthly_goal: monthlyGoal,
        })
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
