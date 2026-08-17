/**
 * Verificação do JWT emitido pelo GoTrue (Supabase Auth).
 *
 * Substitui o que `supabase.functions.invoke` fazia implicitamente. A regra
 * seguida é a mesma que o CLAUDE.md documenta para as edge functions: validar
 * ANTES de qualquer trabalho caro — foi exatamente o que faltava em
 * process-receipt, que chamava a API paga de OCR antes de checar o token.
 *
 * São DUAS famílias de assinatura, não uma:
 *
 *   ES256/RS256  chave assimétrica, resolvida pelo `kid` contra o JWKS do
 *                projeto. É o que o Supabase hospedado emite hoje.
 *   HS256        segredo compartilhado. É o que `supabase start` ainda emite,
 *                e o que projetos antigos usam até migrarem.
 *
 * Aceitar só HS256 passa em todo teste offline e falha contra o projeto real —
 * foi assim que isto foi descoberto, com 401 num token legítimo.
 */
import { jwtVerify, createRemoteJWKSet } from "jose";
import type { JWTVerifyGetKey } from "jose";

/** Algoritmos aceitos. Nunca inclua "none". */
const ALGORITHMS = ["ES256", "RS256", "HS256"] as const;

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
 * Resolve a chave de verificação a partir do cabeçalho do token.
 *
 * Assinatura compatível com o `getKey` do jose, então serve direto ao
 * `jwtVerify` sem adaptador.
 */
export type KeyResolver = JWTVerifyGetKey;

export interface KeyResolverOptions {
  /** Segredo HS256 do GoTrue. Opcional se `jwksUrl` for informado. */
  jwtSecret?: string | undefined;
  /** JWKS do projeto. Opcional se `jwtSecret` for informado. */
  jwksUrl?: string | undefined;
  /**
   * Substitui o JWKS remoto. Existe para o teste montar um conjunto de chaves
   * local e exercitar o caminho assimétrico sem rede — a mesma propriedade que
   * `providers/fake.ts` dá ao domínio.
   */
  jwks?: KeyResolver | undefined;
}

/**
 * Monta o resolvedor uma vez, no boot. O JWKS remoto do jose já faz cache e
 * refetch quando aparece um `kid` desconhecido, então rotação de chave no
 * Supabase não exige redeploy deste serviço.
 */
export function createKeyResolver(options: KeyResolverOptions): KeyResolver {
  const { jwtSecret, jwksUrl } = options;

  if (!jwtSecret && !jwksUrl && !options.jwks) {
    throw new Error(
      "Verificação de JWT sem chave: informe SUPABASE_URL (assimétrico) " +
        "ou SUPABASE_JWT_SECRET (HS256).",
    );
  }

  const jwks = options.jwks ?? (jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : undefined);
  const secret = jwtSecret ? new TextEncoder().encode(jwtSecret) : undefined;

  return async (protectedHeader, token) => {
    if (protectedHeader.alg === "HS256") {
      if (!secret) {
        throw new UnauthorizedError(
          "token HS256 recebido, mas SUPABASE_JWT_SECRET não está configurado",
        );
      }
      return secret;
    }

    if (!jwks) {
      throw new UnauthorizedError(
        `token ${protectedHeader.alg} recebido, mas SUPABASE_URL não está configurado`,
      );
    }
    return jwks(protectedHeader, token);
  };
}

/** Deriva o JWKS a partir da URL do projeto Supabase. */
export function jwksUrlFor(supabaseUrl: string): string {
  return new URL("/auth/v1/.well-known/jwks.json", supabaseUrl).toString();
}

/**
 * Extrai e valida o Bearer token. Lança UnauthorizedError em qualquer falha —
 * o chamador converte em 401 com mensagem genérica, sem revelar o motivo.
 */
export async function authenticate(
  authorizationHeader: string | undefined,
  resolveKey: KeyResolver,
): Promise<AuthenticatedUser> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("header Authorization ausente ou malformado");
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token) throw new UnauthorizedError("token vazio");

  let payload: Record<string, unknown>;
  try {
    // jwtVerify já rejeita token expirado, assinatura inválida e alg divergente.
    const verified = await jwtVerify(token, resolveKey, { algorithms: [...ALGORITHMS] });
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
