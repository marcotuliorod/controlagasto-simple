import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ScheduledExport {
  id: string;
  user_id: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  format: "csv" | "xlsx" | "pdf";
  filters: any;
  next_run_at: string;
  last_run_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useScheduledExports = () => {
  const queryClient = useQueryClient();

  const { data: exports, isLoading } = useQuery({
    queryKey: ["scheduled-exports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scheduled_exports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ScheduledExport[];
    },
  });

  const createExport = useMutation({
    mutationFn: async (exportData: Omit<ScheduledExport, "id" | "user_id" | "created_at" | "updated_at" | "last_run_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("scheduled_exports").insert({
        ...exportData,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      toast.success("Exportação agendada criada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar exportação agendada");
    },
  });

  const updateExport = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ScheduledExport> & { id: string }) => {
      const { error } = await supabase
        .from("scheduled_exports")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      toast.success("Exportação agendada atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar exportação");
    },
  });

  const deleteExport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_exports")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-exports"] });
      toast.success("Exportação agendada removida!");
    },
    onError: () => {
      toast.error("Erro ao remover exportação");
    },
  });

  return {
    exports,
    isLoading,
    createExport,
    updateExport,
    deleteExport,
  };
};
