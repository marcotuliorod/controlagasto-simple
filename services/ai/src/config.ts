/**
 * Configuração por ambiente e escolha do adapter.
 *
 * Este é o ÚNICO lugar do serviço que decide qual fornecedor será usado.
 * Trocar de provedor é mudar AI_PROVIDER — nenhum arquivo de domain/ muda.
 */
import { createGeminiProvider } from "./providers/gemini.ts";
import type { LLMProvider } from "./providers/types.ts";

export interface Config {
  port: number;
  /** Segredo HS256 do GoTrue, usado para validar o JWT do usuário. */
  jwtSecret: string;
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

export function loadConfig(): Config {
  return {
    port: Number(process.env["PORT"] ?? 8787),
    jwtSecret: required("SUPABASE_JWT_SECRET"),
    allowedOrigins: (process.env["ALLOWED_ORIGINS"] ?? "http://localhost:8080")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    provider: buildProvider(),
  };
}
