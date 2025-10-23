import { Bot, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isAssistant = role === 'assistant';

  return (
    <div className={`flex gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className={isAssistant ? 'bg-primary' : 'bg-muted'}>
          {isAssistant ? <Bot className="h-4 w-4 text-primary-foreground" /> : <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col gap-1 max-w-[80%] ${isAssistant ? 'items-start' : 'items-end'}`}>
        <div
          className={`rounded-2xl px-4 py-2 ${
            isAssistant
              ? 'bg-muted text-foreground'
              : 'bg-primary text-primary-foreground'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}