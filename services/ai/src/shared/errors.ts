/**
 * Taxonomia única de erros de IA.
 *
 * Antes: cada edge function tratava (ou não) 429/402 do seu jeito, e
 * process-receipt chegava a mostrar "Créditos Lovable AI esgotados. Adicione
 * créditos em Settings -> Workspace -> Usage." para o usuário final — o nome
 * do fornecedor vazando na UI. Aqui a mensagem pública é neutra por
 * construção: `publicMessage` é o único texto que pode chegar ao cliente.
 */

export type AIErrorKind =
  | "rate_limited"
  | "quota_exceeded"
  | "timeout"
  | "invalid_response"
  | "unsupported"
  /**
   * Serviço mal configurado: chave inválida, modelo inexistente ou sem
   * permissão. Re-tentar nunca resolve — precisa de intervenção de operador.
   * Existe como categoria própria porque na primeira versão isto caía em
   * provider_error e era re-tentado 3x à toa (descoberto ao testar contra a
   * API real, quando o modelo configurado devolveu 404 "no longer available").
   */
  | "misconfigured"
  | "provider_error";

const PUBLIC_MESSAGES: Record<AIErrorKind, string> = {
  rate_limited: "Muitas solicitações em sequência. Tente novamente em alguns segundos.",
  quota_exceeded: "O serviço de IA está temporariamente indisponível. Tente mais tarde.",
  timeout: "O processamento demorou mais que o esperado. Tente novamente.",
  invalid_response: "Não foi possível interpretar a resposta do serviço de IA.",
  unsupported: "Este tipo de arquivo não é suportado no momento.",
  // Não expõe que a culpa é de configuração — isso é problema do operador,
  // e o log do servidor carrega o detalhe.
  misconfigured: "O serviço de IA está indisponível no momento.",
  provider_error: "O serviço de IA falhou. Tente novamente.",
};

export class AIError extends Error {
  readonly kind: AIErrorKind;
  /** Texto seguro para exibir ao usuário — nunca cita fornecedor nem billing. */
  readonly publicMessage: string;
  /** true = tentar de novo pode resolver. */
  readonly retryable: boolean;

  constructor(
    kind: AIErrorKind,
    /** Detalhe técnico: só para log do servidor, nunca para o cliente. */
    detail?: string,
    options?: { cause?: unknown },
  ) {
    super(detail ?? kind, options);
    this.name = "AIError";
    this.kind = kind;
    this.publicMessage = PUBLIC_MESSAGES[kind];
    this.retryable = kind === "rate_limited" || kind === "timeout" || kind === "provider_error";
  }

  /**
   * Mapeia um status HTTP do provedor para a taxonomia interna.
   *
   * Regra: 4xx é culpa nossa (configuração ou requisição) e não deve ser
   * re-tentado; 5xx e 429 são transitórios do provedor e devem.
   */
  static fromHttpStatus(status: number, detail?: string): AIError {
    if (status === 429) return new AIError("rate_limited", detail);
    // 402 = sem crédito. Não é erro de configuração, mas re-tentar não resolve.
    if (status === 402) return new AIError("quota_exceeded", detail);
    // 400 requisição malformada, 401/403 chave inválida ou sem permissão,
    // 404 modelo inexistente/indisponível.
    if (status === 400 || status === 401 || status === 403 || status === 404) {
      return new AIError("misconfigured", detail ?? `HTTP ${status}`);
    }
    return new AIError("provider_error", detail ?? `HTTP ${status}`);
  }

  /** Status HTTP que o serviço devolve ao cliente para este erro. */
  get httpStatus(): number {
    switch (this.kind) {
      case "rate_limited":
        return 429;
      case "quota_exceeded":
      case "misconfigured":
        return 503;
      case "timeout":
        return 504;
      case "unsupported":
        return 415;
      case "invalid_response":
      case "provider_error":
        return 502;
    }
  }
}
