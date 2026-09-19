import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { cn } from "@/lib/utils";

/*
 * Renderizador único de markdown do app (chat, artigos de Educação, insights).
 *
 * Segurança: react-markdown não usa dangerouslySetInnerHTML — HTML cru no texto
 * é escapado e `javascript:` em link é filtrado por padrão. Não adicionar
 * `rehype-raw`: reabre essa porta (o modelo e o banco são fontes de texto que
 * não controlamos por completo). Cobertura em Markdown.test.tsx e
 * chat/MessageBubble.test.tsx.
 *
 * Sem `remark-gfm` de propósito (bundle): tabela, riscado e lista de tarefas
 * não são interpretados. O prompt do assistente pede para não usá-los.
 *
 * O plugin @tailwindcss/typography NÃO está registrado no tailwind.config.ts;
 * por isso classes `prose` não fazem nada. O mapa abaixo usa tokens do tema e
 * vale nos dois visuais e no claro/escuro.
 */

type Variant = "article" | "compact";

/** Elementos aceitos no modo `inline` (texto curto): o resto vira texto puro. */
const INLINE_ELEMENTS = ["p", "strong", "em", "code"];

function componentsFor(variant: Variant, inline: boolean): Components {
  const article = variant === "article";

  // No modo inline o pai costuma ser um <p>; <p> dentro de <p> é HTML inválido.
  const p: Components["p"] = inline
    ? ({ children }) => <span className="block [&:not(:last-child)]:mb-1">{children}</span>
    : ({ children }) => (
        <p className={cn("last:mb-0", article ? "mb-4 leading-relaxed" : "mb-2")}>{children}</p>
      );

  const h = (Tag: "h1" | "h2" | "h3" | "h4", sizeArticle: string, sizeCompact: string) =>
    ({ children }: { children?: ReactNode }) => (
      <Tag
        className={cn(
          "font-semibold tracking-tight first:mt-0",
          article ? cn(sizeArticle, "mb-3 mt-6") : cn(sizeCompact, "mb-1 mt-3"),
        )}
      >
        {children}
      </Tag>
    );

  return {
    p,
    h1: h("h1", "text-2xl", "text-base"),
    h2: h("h2", "text-xl", "text-base"),
    h3: h("h3", "text-lg", "text-sm"),
    h4: h("h4", "text-base", "text-sm"),
    ul: ({ children }) => (
      <ul className={cn("list-disc pl-5 last:mb-0", article ? "mb-4 space-y-1.5 pl-6" : "mb-2 space-y-1")}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className={cn("list-decimal pl-5 last:mb-0", article ? "mb-4 space-y-1.5 pl-6" : "mb-2 space-y-1")}>
        {children}
      </ol>
    ),
    li: ({ children }) => <li>{children}</li>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    a: ({ children, href }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
        {children}
      </a>
    ),
    code: ({ children }) => <code className="rounded bg-background/60 px-1 py-0.5 text-xs">{children}</code>,
    pre: ({ children }) => (
      <pre
        className={cn(
          "overflow-x-auto rounded-md bg-background/60 p-3 text-xs last:mb-0 [&_code]:bg-transparent [&_code]:p-0",
          article ? "mb-4" : "mb-2",
        )}
      >
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          "border-l-2 border-border pl-3 text-muted-foreground last:mb-0",
          article ? "mb-4" : "mb-2",
        )}
      >
        {children}
      </blockquote>
    ),
    hr: () => <hr className={cn("border-border", article ? "my-6" : "my-3")} />,
  };
}

interface MarkdownProps {
  content: string;
  /** `article`: leitura (títulos maiores, mais respiro). `compact`: bolha de chat. */
  variant?: Variant;
  /** Texto curto (insight): só parágrafo, negrito, itálico e código; o resto vira texto. */
  inline?: boolean;
  className?: string;
}

export function Markdown({ content, variant = "compact", inline = false, className }: MarkdownProps) {
  return (
    <div className={cn("break-words", className)}>
      <ReactMarkdown
        components={componentsFor(variant, inline)}
        {...(inline ? { allowedElements: INLINE_ELEMENTS, unwrapDisallowed: true } : {})}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
