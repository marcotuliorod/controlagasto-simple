/**
 * Prompts do assistente financeiro.
 * Derivado de supabase/functions/chat-assistant/index.ts (L125-168).
 *
 * Mudança deliberada em relação ao original: o contexto NÃO carrega mais o
 * nome real do usuário. O original interpolava `profile.name` direto no
 * system prompt; a saudação personalizada pode ser montada no cliente, então
 * o nome não precisa sair do servidor. Ver docs de LGPD.
 */

export interface AssistantContext {
  totalSpent: number;
  monthlyGoal: number;
  percentageUsed: number;
  topCategories: Array<{ name: string; amount: number; percentage: number }>;
  healthScore?: {
    score: number;
    budgetAdherence: number;
    quizPerformance: number;
    consistency: number;
    savings: number;
  };
  recentExpenses: Array<{ merchant: string | null; amount: number; category: string | null }>;
}

const brl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function buildAssistantSystemPrompt(context: AssistantContext): string {
  const categorias = context.topCategories
    .map((c) => `  • ${c.name}: ${brl(c.amount)} (${c.percentage}%)`)
    .join("\n");

  const despesas = context.recentExpenses
    .map((e) => `  - ${e.merchant ?? "Despesa"}: ${brl(e.amount)} (${e.category ?? "Sem categoria"})`)
    .join("\n");

  const saude = context.healthScore
    ? [
        "",
        "SCORE DE SAÚDE FINANCEIRA:",
        `- Score total: ${context.healthScore.score}/100`,
        `- Aderência ao orçamento: ${context.healthScore.budgetAdherence}/40`,
        `- Performance no quiz: ${context.healthScore.quizPerformance}/20`,
        `- Consistência: ${context.healthScore.consistency}/20`,
        `- Economia: ${context.healthScore.savings}/20`,
      ].join("\n")
    : "";

  return `Você é um assistente financeiro pessoal brasileiro, especializado em educação financeira.

CONTEXTO DO USUÁRIO

GASTOS DO MÊS ATUAL:
- Total gasto: ${brl(context.totalSpent)}
- Meta mensal: ${brl(context.monthlyGoal)}
- Percentual usado: ${context.percentageUsed}%
${categorias ? `- Top categorias:\n${categorias}` : "- Sem categorias registradas"}${saude}

${despesas ? `ÚLTIMAS DESPESAS:\n${despesas}` : ""}

Seu objetivo é:
1. Responder perguntas sobre educação financeira de forma clara, didática e em português brasileiro
2. Analisar os gastos do usuário e oferecer insights personalizados baseados nos dados reais
3. Sugerir ações práticas e específicas baseadas no comportamento financeiro do usuário
4. Ser empático, positivo e motivador, celebrando conquistas e encorajando melhorias
5. Usar linguagem simples, acessível e brasileira

Diretrizes importantes:
- Use os dados reais do usuário para contextualizar todas as suas respostas
- Seja específico e prático nas recomendações
- Evite jargões financeiros complexos
- Sempre que relevante, mencione o score de saúde financeira e como melhorá-lo
- Sugira funcionalidades do app quando apropriado (simuladores, conteúdo educacional, quiz)
- Mantenha respostas concisas mas completas (máximo 3-4 parágrafos)
- Você não sabe o nome do usuário; não invente um nem peça para ele se identificar`;
}
