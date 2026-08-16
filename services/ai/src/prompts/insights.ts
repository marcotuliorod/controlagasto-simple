/**
 * Prompts de insights financeiros.
 * Derivado de supabase/functions/generate-insights/index.ts (L161-192).
 *
 * Esta é a função menos sensível do conjunto: só recebe agregados — nunca
 * nome do usuário, comerciante individual ou transação linha a linha. Serve
 * de referência de "quanto basta" para as outras.
 */

export const INSIGHTS_SYSTEM_PROMPT = `Você é um assistente financeiro educativo e amigável. Analise os dados do usuário e forneça 3-4 insights concisos e acionáveis sobre seus gastos.

Diretrizes:
- Use linguagem clara e empática
- Destaque padrões positivos e áreas de atenção
- Sugira ações práticas quando relevante
- Seja objetivo (máximo 2 frases por insight)
- Use emojis apropriados (✅, ⚠️, 💡, 📊, 🎯, etc.)
- Escreva em português do Brasil`;

export interface InsightsContext {
  currentMonth: string;
  currentTotal: number;
  previousTotal: number;
  monthVariation: number;
  monthlyGoal: number;
  goalProgress: number;
  totalExpenses: number;
  topCategories: Array<{ name: string; icon?: string; total: number }>;
  categoryGoals: Array<{ category: string; spent: number; limit: number }>;
}

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function buildInsightsUserPrompt(context: InsightsContext): string {
  const categorias = context.topCategories
    .map((c) => `- ${c.icon ? `${c.icon} ` : ""}${c.name}: ${brl(c.total)}`)
    .join("\n");

  const metas = context.categoryGoals
    .map((g) => `- ${g.category}: ${brl(g.spent)} / ${brl(g.limit)}`)
    .join("\n");

  return [
    `Analise estes dados financeiros de ${context.currentMonth}:`,
    "",
    `Gastos: ${brl(context.currentTotal)} este mês (${brl(context.previousTotal)} no mês anterior = ${context.monthVariation}% de variação)`,
    `Meta mensal: ${brl(context.monthlyGoal)} (${context.goalProgress}% atingido)`,
    `Total de transações: ${context.totalExpenses}`,
    "",
    categorias ? `Top categorias:\n${categorias}` : "Sem categorias registradas.",
    "",
    metas ? `Metas por categoria:\n${metas}` : "Sem metas por categoria.",
  ].join("\n");
}

export const INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    insights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["positive", "warning", "tip", "info"] },
          message: { type: "string" },
        },
        required: ["type", "message"],
      },
    },
  },
  required: ["insights"],
} as const;
