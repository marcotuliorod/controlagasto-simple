/**
 * Verificação do JWT emitido pelo GoTrue (Supabase Auth).
 *
 * Substitui o que `supabase.functions.invoke` fazia implicitamente. A regra
 * seguida é a mesma que o CLAUDE.md documenta para as edge functions: validar
 * ANTES de qualquer trabalho caro — foi exatamente o que faltava em
 * process-receipt, que chamava a API paga de OCR antes de checar o token.
 */
import { jwtVerify } from "jose";

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

export class UnauthorizedError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "UnauthorizedError";
  }
}

/**
 * Extrai e valida o Bearer token. Lança UnauthorizedError em qualquer falha —
 * o chamador converte em 401 com mensagem genérica, sem revelar o motivo.
 */
export async function authenticate(
  authorizationHeader: string | undefined,
  jwtSecret: string,
): Promise<AuthenticatedUser> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("header Authorization ausente ou malformado");
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) throw new UnauthorizedError("token vazio");

  let payload: Record<string, unknown>;
  try {
    const secret = new TextEncoder().encode(jwtSecret);
    // jwtVerify já rejeita token expirado, assinatura inválida e alg divergente.
    const verified = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    payload = verified.payload as Record<string, unknown>;
  } catch (error) {
    throw new UnauthorizedError(`JWT inválido: ${(error as Error).message}`);
  }

  const sub = payload["sub"];
  if (typeof sub !== "string" || !sub) {
    throw new UnauthorizedError("claim 'sub' ausente no token");
  }

  const email = payload["email"];
  return { id: sub, ...(typeof email === "string" && { email }) };
}
