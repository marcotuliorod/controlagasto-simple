import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export const useConversations = () => {
  return useQuery({
    queryKey: ["chat-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as ChatConversation[];
    },
  });
};

export const useMessages = (conversationId: string | null) => {
  return useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId,
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      message, 
      conversationId 
    }: { 
      message: string; 
      conversationId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('chat-assistant', {
        body: { message, conversationId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ 
        queryKey: ["chat-messages", data.conversationId] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      toast({
        title: "Conversa excluída",
        description: "A conversa foi excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir conversa",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};