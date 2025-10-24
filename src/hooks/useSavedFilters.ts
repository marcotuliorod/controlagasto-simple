import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SavedFilter {
  id: string;
  user_id: string;
  name: string;
  filters: any;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export const useSavedFilters = () => {
  const queryClient = useQueryClient();

  const { data: filters, isLoading } = useQuery({
    queryKey: ["saved-filters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_filters")
        .select("*")
        .order("is_favorite", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as SavedFilter[];
    },
  });

  const saveFilter = useMutation({
    mutationFn: async (filterData: Omit<SavedFilter, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("saved_filters").insert({
        ...filterData,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      toast.success("Filtro salvo com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao salvar filtro");
    },
  });

  const updateFilter = useMutation({
    mutationFn: async ({ id, ...data }: Partial<SavedFilter> & { id: string }) => {
      const { error } = await supabase
        .from("saved_filters")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      toast.success("Filtro atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar filtro");
    },
  });

  const deleteFilter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("saved_filters")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-filters"] });
      toast.success("Filtro removido!");
    },
    onError: () => {
      toast.error("Erro ao remover filtro");
    },
  });

  return {
    filters,
    isLoading,
    saveFilter,
    updateFilter,
    deleteFilter,
  };
};
