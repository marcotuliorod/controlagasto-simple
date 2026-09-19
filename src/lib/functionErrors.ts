interface InvokeErrorMessages {
  /** Usada quando o corpo não traz mensagem (HTML de gateway, rede, etc.). */
  fallback: string;
  /** Usada em 504/408 sem corpo aproveitável. */
  timeout?: string;
  /** Só para o log de diagnóstico. */
  source?: string;
}

/**
 * Extrai a mensagem que a edge function escreveu no corpo da resposta.
 *
 * `supabase.functions.invoke` devolve `data: null` em qualquer status não-2xx,
 * então o `error` em português do corpo nunca era lido e o usuário via
 * "Edge Function returned a non-2xx status code". A resposta crua fica em
 * `error.context`; é de lá que a mensagem tem que sair.
 *
 * Nunca repassa `error.message`: é sempre a mensagem em inglês do SDK.
 */
export async function messageFromInvokeError(
  error: unknown,
  { fallback, timeout, source = "edge function" }: InvokeErrorMessages,
): Promise<string> {
  const context = (error as { context?: unknown })?.context;

  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === "string" && body.error.trim()) {
        return body.error;
      }
    } catch {
      // Corpo não-JSON (timeout de gateway, HTML de erro): cai no genérico.
    }

    if (timeout && (context.status === 504 || context.status === 408)) {
      return timeout;
    }
  }

  console.error(`Falha na chamada de ${source}:`, error);
  return fallback;
}
