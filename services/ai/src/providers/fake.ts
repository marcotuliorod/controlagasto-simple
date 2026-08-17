/**
 * Provider de teste. Permite testar todo o domínio sem rede e sem chave de API
 * — o que era impossível quando o fetch estava embutido em cada edge function.
 */
import type {
  Capability,
  CompletionRequest,
  CompletionResult,
  LLMProvider,
} from "./types.ts";

export interface FakeProviderOptions {
  /** Resposta fixa, ou função que decide a partir do request recebido. */
  respondWith: string | ((request: CompletionRequest) => string);
  supports?: Capability[];
  /** Erro a lançar em vez de responder — para testar o tratamento de falha. */
  throws?: Error;
}

export interface FakeProvider extends LLMProvider {
  /** Todos os requests recebidos, para asserção sobre o que foi enviado ao modelo. */
  readonly calls: CompletionRequest[];
}

export function createFakeProvider(options: FakeProviderOptions): FakeProvider {
  const calls: CompletionRequest[] = [];
  const supported = options.supports ?? (["vision", "document", "structuredOutput"] as Capability[]);

  return {
    name: "fake",
    calls,
    supports: (capability) => supported.includes(capability),
    async complete(request): Promise<CompletionResult> {
      calls.push(request);
      if (options.throws) throw options.throws;

      const text =
        typeof options.respondWith === "function"
          ? options.respondWith(request)
          : options.respondWith;

      const result: CompletionResult = { text };
      if (request.schema) {
        result.parsed = JSON.parse(text);
      }
      return result;
    },
  };
}
