import { useState, useEffect, useRef } from "react";
import { Bot, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "@/components/chat/MessageBubble";
import SuggestedQuestions from "@/components/chat/SuggestedQuestions";
import ChatInput from "@/components/chat/ChatInput";
import { useConversations, useMessages, useSendMessage } from "@/hooks/useChatAssistant";

export default function ChatAssistant() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useConversations();
  const { data: messages = [] } = useMessages(currentConversationId);
  const sendMessage = useSendMessage();

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    try {
      const result = await sendMessage.mutateAsync({
        message: content,
        conversationId: currentConversationId || undefined,
      });
      
      if (!currentConversationId) {
        setCurrentConversationId(result.conversationId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 h-[calc(100vh-4rem)]">
      <div className="flex flex-col h-full gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Assistente Financeiro</h1>
              <p className="text-sm text-muted-foreground">
                Seu consultor pessoal de finanças
              </p>
            </div>
          </div>
          {hasMessages && (
            <Button onClick={handleNewConversation} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova conversa
            </Button>
          )}
        </div>

        {/* Messages Area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {!hasMessages ? (
              <div className="h-full flex flex-col items-center justify-center gap-8">
                <div className="text-center space-y-2">
                  <Bot className="h-16 w-16 mx-auto text-primary" />
                  <h2 className="text-xl font-semibold">Olá! Como posso ajudar?</h2>
                  <p className="text-muted-foreground">
                    Faça perguntas sobre suas finanças ou escolha uma sugestão abaixo
                  </p>
                </div>
                <div className="w-full max-w-md">
                  <SuggestedQuestions onQuestionClick={handleSendMessage} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages
                  .filter((msg) => msg.role !== 'system')
                  .map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      role={msg.role as 'user' | 'assistant'}
                      content={msg.content}
                      timestamp={msg.created_at}
                    />
                  ))}
                {sendMessage.isPending && (
                  <div className="flex gap-3">
                    <div className="p-2 bg-primary rounded-full h-8 w-8 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Pensando...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <ChatInput
              onSend={handleSendMessage}
              disabled={sendMessage.isPending}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}