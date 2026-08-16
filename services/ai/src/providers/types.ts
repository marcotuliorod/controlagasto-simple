/**
 * Contrato único entre o domínio e qualquer fornecedor de IA.
 *
 * O domínio (src/domain) monta `Part`s e um schema de saída; cada adapter
 * decide como isso vira payload do seu provedor. Nenhum arquivo em domain/
 * pode importar deste diretório algo além destes tipos.
 */

export type Role = "user" | "assistant";

/** Texto puro. */
export interface TextPart {
  type: "text";
  text: string;
}

/** Imagem (ex: foto de cupom fiscal). `data` é base64 sem o prefixo data:. */
export interface ImagePart {
  type: "image";
  mimeType: string;
  data: string;
}

/**
 * Documento (ex: PDF de extrato bancário). Separado de ImagePart de propósito:
 * é exatamente aqui que os provedores divergem — o gateway antigo aceitava PDF
 * disfarçado de image_url, a Anthropic usa bloco `document`, a OpenAI usa a
 * Files API e o Gemini usa inline_data. Manter os dois casos distintos deixa
 * essa diferença dentro do adapter, e não vazando para o domínio.
 */
export interface DocumentPart {
  type: "document";
  mimeType: string;
  data: string;
}

export type Part = TextPart | ImagePart | DocumentPart;

export interface Message {
  role: Role;
  parts: Part[];
}

/** Capacidades que um adapter pode ou não oferecer. */
export type Capability = "vision" | "document" | "structuredOutput";

export interface CompletionRequest {
  /** Instrução de sistema. Adapters sem suporte nativo devem prefixar na 1ª mensagem. */
  system?: string;
  messages: Message[];
  /**
   * JSON Schema da resposta esperada. Quando presente, o adapter DEVE usar o
   * recurso nativo de structured output do provedor — é o que elimina o
   * parsing defensivo (strip de markdown, contagem de chaves) que existia nas
   * edge functions antigas.
   */
  schema?: Record<string, unknown>;
  maxOutputTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface CompletionResult {
  text: string;
  /** Preenchido quando `schema` foi informado e o provedor devolveu JSON válido. */
  parsed?: unknown;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}

export interface LLMProvider {
  /** Identificador para log/telemetria. Nunca deve chegar ao usuário final. */
  readonly name: string;
  supports(capability: Capability): boolean;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}
