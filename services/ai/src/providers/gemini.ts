/**
 * Adapter Google Gemini (API nativa, não o shim OpenAI-compatible).
 *
 * Escolhido como primeiro adapter porque `google/gemini-2.5-flash` já era o
 * modelo que rodava por baixo do gateway antigo — assim a migração prova
 * paridade de plataforma sem misturar com mudança de qualidade do modelo.
 *
 * A API nativa resolve os dois pontos frágeis do código anterior:
 *  - PDF entra como `inline_data` com mime_type próprio, em vez de ser
 *    disfarçado de `image_url` (hack específico do gateway antigo).
 *  - JSON sai via `responseSchema`, dispensando o parsing defensivo em três
 *    níveis que existia em process-import-file.
 */
import type {
  Capability,
  CompletionRequest,
  CompletionResult,
  LLMProvider,
  Part,
} from "./types.ts";
import { AIError } from "../shared/errors.ts";

const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  endpoint?: string;
}

interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  promptFeedback?: { blockReason?: string };
}

function toGeminiPart(part: Part): GeminiPart {
  switch (part.type) {
    case "text":
      return { text: part.text };
    // Imagem e documento usam a mesma forma no Gemini, mas continuam separados
    // no contrato porque outros provedores os tratam de maneira diferente.
    case "image":
    case "document":
      return { inline_data: { mime_type: part.mimeType, data: part.data } };
  }
}

export function createGeminiProvider(config: GeminiConfig): LLMProvider {
  const model = config.model ?? DEFAULT_MODEL;
  const endpoint = config.endpoint ?? DEFAULT_ENDPOINT;

  return {
    name: `gemini:${model}`,

    supports(capability: Capability): boolean {
      // O Gemini cobre as três; adapters mais limitados devolvem false e o
      // domínio decide o fallback.
      return (["vision", "document", "structuredOutput"] satisfies Capability[]).includes(
        capability,
      );
    },

    async complete(request: CompletionRequest): Promise<CompletionResult> {
      const body: Record<string, unknown> = {
        contents: request.messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: message.parts.map(toGeminiPart),
        })),
      };

      if (request.system) {
        body["systemInstruction"] = { parts: [{ text: request.system }] };
      }

      const generationConfig: Record<string, unknown> = {};
      if (request.temperature !== undefined) generationConfig["temperature"] = request.temperature;
      if (request.maxOutputTokens !== undefined) {
        generationConfig["maxOutputTokens"] = request.maxOutputTokens;
      }
      if (request.schema) {
        generationConfig["responseMimeType"] = "application/json";
        generationConfig["responseSchema"] = request.schema;
      }
      if (Object.keys(generationConfig).length > 0) {
        body["generationConfig"] = generationConfig;
      }

      let response: Response;
      try {
        response = await fetch(`${endpoint}/models/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Header em vez de ?key= para a chave não cair em log de acesso.
            "x-goog-api-key": config.apiKey,
          },
          body: JSON.stringify(body),
          signal: request.signal,
        });
      } catch (error) {
        if (request.signal?.aborted) throw new AIError("timeout", "request abortado", { cause: error });
        throw new AIError("provider_error", "falha de rede ao chamar o provedor", { cause: error });
      }

      if (!response.ok) {
        // O corpo do erro fica só no log do servidor; nunca vai ao cliente.
        const detail = await response.text().catch(() => "");
        throw AIError.fromHttpStatus(response.status, detail.slice(0, 500));
      }

      const data = (await response.json()) as GeminiResponse;

      if (data.promptFeedback?.blockReason) {
        throw new AIError(
          "invalid_response",
          `bloqueado pelo filtro do provedor: ${data.promptFeedback.blockReason}`,
        );
      }

      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

      if (!text) {
        throw new AIError("invalid_response", "resposta sem conteúdo textual");
      }

      // Truncamento explícito. Antes isso era silencioso e virava JSON
      // quebrado, tratado com um contador de chaves no parsing.
      if (candidate?.finishReason === "MAX_TOKENS") {
        throw new AIError("invalid_response", "resposta truncada por maxOutputTokens");
      }

      const result: CompletionResult = {
        text,
        usage: {
          ...(data.usageMetadata?.promptTokenCount !== undefined && {
            inputTokens: data.usageMetadata.promptTokenCount,
          }),
          ...(data.usageMetadata?.candidatesTokenCount !== undefined && {
            outputTokens: data.usageMetadata.candidatesTokenCount,
          }),
        },
      };

      if (request.schema) {
        try {
          result.parsed = JSON.parse(text);
        } catch (error) {
          throw new AIError("invalid_response", "JSON inválido apesar do responseSchema", {
            cause: error,
          });
        }
      }

      return result;
    },
  };
}
