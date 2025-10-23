import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EducationalContent {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  level: string;
  type: string;
  video_url: string | null;
  reading_time: number;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  content_id: string;
  completed: boolean;
  completed_at: string | null;
}

export const useEducationalContent = (
  categoryFilter?: string,
  levelFilter?: string,
  searchQuery?: string
) => {
  return useQuery({
    queryKey: ["educational-content", categoryFilter, levelFilter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("educational_content")
        .select("*")
        .order("created_at", { ascending: false });

      if (categoryFilter && categoryFilter !== "todas") {
        query = query.eq("category", categoryFilter);
      }

      if (levelFilter && levelFilter !== "todos") {
        query = query.eq("level", levelFilter);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EducationalContent[];
    },
  });
};

export const useUserProgress = () => {
  return useQuery({
    queryKey: ["user-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_content_progress")
        .select("*");

      if (error) throw error;
      return data as UserProgress[];
    },
  });
};

export const useMarkAsCompleted = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      completed,
    }: {
      contentId: string;
      completed: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("user_content_progress").upsert(
        {
          user_id: user.id,
          content_id: contentId,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: "user_id,content_id" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-progress"] });
    },
  });
};
