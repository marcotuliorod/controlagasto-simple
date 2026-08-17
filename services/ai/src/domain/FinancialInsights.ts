/**
 * Geração de insights sobre os gastos do mês.
 *
 * Mantém o fallback determinístico que o código antigo já tinha: se o modelo
 * falhar ou devolver algo inaproveitável, o usuário ainda recebe um insight
 * calculado localmente, em vez de um erro. Isso importa porque a tela chama
 * isto no carregamento — falhar em silêncio é melhor que quebrar a página.
 */
import type { LLMProvider } from "../providers/types.ts";
import { AIError } from "../shared/errors.ts";
import { withRetry, withTimeout } from "../shared/resilience.ts";
import {
  buildInsightsUserPrompt,
  INSIGHTS_SCHEMA,
  INSIGHTS_SYSTEM_PROMPT,
  type InsightsContext,
} from "../prompts/insights.ts";
import { parseText } from "./normalize.ts";

export type InsightType = "positive" | "warning" | "tip" | "info";

export interface Insight {
  type: InsightType;
  message: string;
}

export interface InsightsResult {
  insights: Insight[];
  /** true quando veio do cálculo local, não do modelo. */
  fallback: boolean;
}

export interface FinancialInsights {
  generate(context: InsightsContext, signal?: AbortSignal): Promise<InsightsResult>;
}

const INSIGHTS_TIMEOUT_MS = 45_000;
const VALID_TYPES: InsightType[] = ["positive", "warning", "tip", "info"];
const MAX_INSIGHTS = 4;

export function createFinancialInsights(provider: LLMProvider): FinancialInsights {
  return {
    async generate(context, signal): Promise<InsightsResult> {
      try {
        const result = await withRetry(
          () =>
            withTimeout(
              INSIGHTS_TIMEOUT_MS,
              (timeoutSignal) =>
                provider.complete({
                  system: INSIGHTS_SYSTEM_PROMPT,
                  messages: [
                    {
                      role: "user",
                      parts: [{ type: "text", text: buildInsightsUserPrompt(context) }],
                    },
                  ],
                  schema: provider.supports("structuredOutput")
                    ? (INSIGHTS_SCHEMA as unknown as Record<string, unknown>)
                    : undefined,
                  signal: timeoutSignal,
                }),
              signal,
            ),
          { signal },
        );

        const insights = normalizeInsights(result.parsed ?? safeParse(result.text));
        // Modelo respondeu, mas sem nada aproveitável.
        if (insights.length === 0) return { insights: localInsights(context), fallback: true };

        return { insights, fallback: false };
      } catch (error) {
        // Erro de configuração precisa ser visível ao operador, não mascarado
        // por um fallback silencioso que faria o problema passar despercebido.
        if (error instanceof AIError && error.kind === "misconfigured") throw error;
        return { insights: localInsights(context), fallback: true };
      }
    },
  };
}

function safeParse(text: string): unknown {
  const match = /\{[\s\S]*\}/.exec(text);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function normalizeInsights(raw: unknown): Insight[] {
  const source = (raw ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(source["insights"]) ? source["insights"] : [];

  return rows
    .map((row): Insight | null => {
      const entry = (row ?? {}) as Record<string, unknown>;
      const message = parseText(entry["message"]);
      if (!message) return null;
      const rawType = parseText(entry["type"]);
      const type = VALID_TYPES.includes(rawType as InsightType)
        ? (rawType as InsightType)
        : "info";
      return { type, message };
    })
    .filter((insight): insight is Insight => insight !== null)
    .slice(0, MAX_INSIGHTS);
}

/** Insights calculados sem IA — mesma ideia do fallback do código antigo. */
function localInsights(context: InsightsContext): Insight[] {
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const insights: Insight[] = [
    { type: "info", message: `📊 Você gastou ${brl(context.currentTotal)} em ${context.currentMonth}.` },
  ];

  if (context.monthlyGoal > 0) {
    insights.push(
      context.goalProgress >= 100
        ? { type: "warning", message: `⚠️ Você ultrapassou a meta de ${brl(context.monthlyGoal)}.` }
        : { type: "positive", message: `✅ Você usou ${context.goalProgress}% da meta do mês.` },
    );
  }

  if (context.previousTotal > 0 && context.monthVariation !== 0) {
    insights.push(
      context.monthVariation > 0
        ? { type: "warning", message: `⚠️ Seus gastos subiram ${context.monthVariation}% em relação ao mês anterior.` }
        : { type: "positive", message: `✅ Seus gastos caíram ${Math.abs(context.monthVariation)}% em relação ao mês anterior.` },
    );
  }

  return insights.slice(0, MAX_INSIGHTS);
}
