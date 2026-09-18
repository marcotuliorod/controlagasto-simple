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

/**
 * Acima do teto de 130s que a edge function usa pra chamar o `ai-service`
 * (`_shared/aiService.ts`) — evita abortar uma chamada que ainda ia terminar
 * bem. Sem isso, `functions.invoke` não tem prazo próprio: se a resposta
 * nunca chegar (conexão caiu em silêncio, instabilidade do provedor de IA
 * além do que o retry do `ai-service` recupera), a mutation fica pendurada
 * indefinidamente — a tela mostra "Pensando..." pra sempre, sem erro nem
 * jeito de tentar de novo.
 */
const CHAT_TIMEOUT_MS = 150_000;

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
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

      try {
        const { data, error } = await supabase.functions.invoke('chat-assistant', {
          body: { message, conversationId },
          signal: controller.signal,
        });

        if (error) {
          if (controller.signal.aborted) {
            throw new Error('A resposta demorou demais. Tente novamente em instantes.');
          }
          throw error;
        }
        return data;
      } finally {
        clearTimeout(timer);
      }
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