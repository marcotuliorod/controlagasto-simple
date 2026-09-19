import { Bot, User } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/*
 * O modelo responde em markdown (negrito, itálico, listas). react-markdown não
 * usa dangerouslySetInnerHTML: HTML cru no texto é escapado, e `javascript:` em
 * link é filtrado por padrão. Não adicionar `rehype-raw` — reabre essa porta.
 * Só o assistente passa por aqui; o que o usuário digita fica como texto.
 */
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
      {children}
    </a>
  ),
  code: ({ children }) => <code className="rounded bg-background/60 px-1 py-0.5 text-xs">{children}</code>,
};

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
          {isAssistant ? (
            <div className="text-sm break-words">
              <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
          )}
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
