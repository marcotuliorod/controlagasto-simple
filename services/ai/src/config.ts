/**
 * Configuração por ambiente e escolha do adapter.
 *
 * Este é o ÚNICO lugar do serviço que decide qual fornecedor será usado.
 * Trocar de provedor é mudar AI_PROVIDER — nenhum arquivo de domain/ muda.
 */
import { createGeminiProvider } from "./providers/gemini.ts";
import type { LLMProvider } from "./providers/types.ts";
import { createKeyResolver, jwksUrlFor, type KeyResolver } from "./http/auth.ts";

export interface Config {
  port: number;
  /**
   * Resolve a chave de verificação do JWT do usuário. Monta-se uma vez, no
   * boot: cobre tanto o JWKS assimétrico do Supabase hospedado quanto o
   * segredo HS256 do stack local.
   */
  jwtKeys: KeyResolver;
  /** Origens permitidas no CORS. */
  allowedOrigins: string[];
  provider: LLMProvider;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. ` +
        `Veja services/ai/README.md para a lista completa.`,
    );
  }
  return value;
}

function buildProvider(): LLMProvider {
  const kind = process.env["AI_PROVIDER"] ?? "gemini";

  switch (kind) {
    case "gemini":
      return createGeminiProvider({
        apiKey: required("GEMINI_API_KEY"),
        ...(process.env["AI_MODEL"] && { model: process.env["AI_MODEL"] }),
      });
    default:
      // Falha no boot, não na primeira requisição do usuário.
      throw new Error(`AI_PROVIDER desconhecido: "${kind}". Suportados: gemini.`);
  }
}

/**
 * Monta a verificação de JWT a partir do ambiente.
 *
 * Nenhuma das duas variáveis é obrigatória isoladamente, mas pelo menos uma
 * precisa existir — sem chave nenhuma o serviço não conseguiria autenticar
 * ninguém, e isso tem que estourar no boot, não na primeira requisição.
 */
function buildJwtKeys(): KeyResolver {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const jwtSecret = process.env["SUPABASE_JWT_SECRET"];

  if (!supabaseUrl && !jwtSecret) {
    throw new Error(
      "Configure SUPABASE_URL (tokens assimétricos, o padrão do Supabase " +
        "hospedado) ou SUPABASE_JWT_SECRET (HS256). " +
        "Veja services/ai/README.md para a lista completa.",
    );
  }

  return createKeyResolver({
    ...(jwtSecret && { jwtSecret }),
    ...(supabaseUrl && { jwksUrl: jwksUrlFor(supabaseUrl) }),
  });
}

export function loadConfig(): Config {
  return {
    port: Number(process.env["PORT"] ?? 8787),
    jwtKeys: buildJwtKeys(),
    allowedOrigins: (process.env["ALLOWED_ORIGINS"] ?? "http://localhost:8080")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    provider: buildProvider(),
  };
}
