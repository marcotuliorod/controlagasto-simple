/**
 * Timeout e retry em um lugar só.
 *
 * Antes: apenas process-import-file tinha timeout (AbortController de 120s);
 * as outras três podiam pendurar indefinidamente. Nenhuma tinha retry, então
 * um 429 transitório virava erro para o usuário.
 */
import { AIError } from "./errors.ts";

export interface RetryOptions {
  /** Total de tentativas, incluindo a primeira. */
  attempts?: number;
  /** Atraso base do backoff exponencial, em ms. */
  baseDelayMs?: number;
  signal?: AbortSignal;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new AIError("timeout", "abortado antes do retry"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new AIError("timeout", "abortado durante o backoff"));
      },
      { once: true },
    );
  });

/**
 * Executa `fn` com backoff exponencial, mas só re-tenta erros marcados como
 * retryable (429 / timeout / falha transitória do provedor). Um schema inválido
 * ou um PDF não suportado falha de primeira — re-tentar não mudaria nada.
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  { attempts = 3, baseDelayMs = 500, signal }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const retryable = error instanceof AIError && error.retryable;
      if (!retryable || attempt === attempts) break;
      await sleep(baseDelayMs * 2 ** (attempt - 1), signal);
    }
  }

  throw lastError;
}

/**
 * Aplica um deadline a uma operação que aceita AbortSignal, encadeando um
 * signal externo (ex: o request HTTP do cliente foi cancelado) quando houver.
 */
export async function withTimeout<T>(
  timeoutMs: number,
  fn: (signal: AbortSignal) => Promise<T>,
  externalSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const forwardAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", forwardAbort, { once: true });

  try {
    return await fn(controller.signal);
  } catch (error) {
    if (controller.signal.aborted && !externalSignal?.aborted) {
      throw new AIError("timeout", `excedeu ${timeoutMs}ms`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", forwardAbort);
  }
}
