/**
 * Cliente do serviço de IA (services/ai).
 *
 * Substitui as chamadas diretas a ai.gateway.lovable.dev que estavam
 * duplicadas em 4 edge functions. Cada uma repetia o mesmo fetch, com
 * tratamento de erro e parsing diferentes entre si.
 *
 * As edge functions continuam donas de banco, storage e persistência — o
 * serviço de IA cuida só da parte de modelo. O JWT do usuário é repassado
 * adiante, então o serviço autentica o usuário real, e não um token de
 * serviço: a cadeia de autenticação não se perde no caminho.
 */

export class AIServiceError extends Error {
  readonly status: number;
  /** Mensagem já pronta para o usuário final, vinda do serviço. */
  readonly publicMessage: string;

  constructor(status: number, publicMessage: string, detail?: string) {
    super(detail ?? publicMessage);
    this.name = "AIServiceError";
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

function baseUrl(): string {
  const url = Deno.env.get("AI_SERVICE_URL");
  if (!url) {
    // Falha explícita: melhor um erro claro que uma chamada silenciosa a lugar nenhum.
    throw new AIServiceError(
      503,
      "O serviço de IA está indisponível no momento.",
      "AI_SERVICE_URL não configurada",
    );
  }
  return url.replace(/\/+$/, "");
}

/**
 * Extrai o Bearer token do header. As edge functions já validaram o JWT
 * antes de chegar aqui; isto só o repassa.
 */
export function bearerToken(authHeader: string | null): string {
  return (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
}

export async function callAIService<T>(
  path: string,
  body: unknown,
  userToken: string,
  timeoutMs = 130_000,
): Promise<T> {
  // FORA do try de propósito. Aqui dentro, o AIServiceError(503,
  // "AI_SERVICE_URL não configurada") era capturado pelo catch abaixo e
  // reembalado como 502 "falha de rede" — o diagnóstico exato se perdia
  // justamente no caso mais comum de configuração incompleta. Observado em
  // produção: generate-insights respondia 502 "falha de rede" quando na
  // verdade a variável nem existia.
  const url = `${baseUrl()}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AIServiceError(504, "O processamento demorou mais que o esperado. Tente novamente.");
    }
    throw new AIServiceError(
      502,
      "Não foi possível alcançar o serviço de IA.",
      `falha de rede: ${String(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    // Ler como texto, não como JSON: quando o serviço quebra de verdade, o
    // corpo vem em HTML ou vazio, e `response.json()` engolia o único
    // diagnóstico disponível. Em produção isso deixou um 500 do serviço
    // indistinguível de qualquer outra falha.
    const raw = await response.text().catch(() => "");
    console.error(
      `Serviço de IA respondeu ${response.status} em ${path}: ${raw.slice(0, 500) || "(corpo vazio)"}`,
    );

    // O serviço já devolve mensagem pública neutra em `error`.
    let publicMessage: string | null = null;
    try {
      publicMessage = (JSON.parse(raw) as { error?: string })?.error ?? null;
    } catch {
      // Corpo não-JSON: sem mensagem pública, usa a genérica abaixo.
    }

    // Sem "tente novamente": um 5xx do serviço não se resolve repetindo, e a
    // mensagem antiga mandava o usuário insistir num caminho que não ia abrir.
    throw new AIServiceError(
      response.status,
      publicMessage?.trim() || "O serviço de IA respondeu com erro.",
    );
  }

  return (await response.json()) as T;
}
