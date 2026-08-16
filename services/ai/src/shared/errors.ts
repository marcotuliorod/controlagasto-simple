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
  | "provider_error";

const PUBLIC_MESSAGES: Record<AIErrorKind, string> = {
  rate_limited: "Muitas solicitações em sequência. Tente novamente em alguns segundos.",
  quota_exceeded: "O serviço de IA está temporariamente indisponível. Tente mais tarde.",
  timeout: "O processamento demorou mais que o esperado. Tente novamente.",
  invalid_response: "Não foi possível interpretar a resposta do serviço de IA.",
  unsupported: "Este tipo de arquivo não é suportado no momento.",
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

  /** Mapeia um status HTTP do provedor para a taxonomia interna. */
  static fromHttpStatus(status: number, detail?: string): AIError {
    if (status === 429) return new AIError("rate_limited", detail);
    if (status === 402 || status === 403) return new AIError("quota_exceeded", detail);
    return new AIError("provider_error", detail ?? `HTTP ${status}`);
  }

  /** Status HTTP que o serviço devolve ao cliente para este erro. */
  get httpStatus(): number {
    switch (this.kind) {
      case "rate_limited":
        return 429;
      case "quota_exceeded":
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
