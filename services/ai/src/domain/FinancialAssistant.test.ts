import { describe, it, expect } from "vitest";
import { createFinancialAssistant, type ChatTurn } from "./FinancialAssistant.ts";
import { createFakeProvider } from "../providers/fake.ts";
import type { Part } from "../providers/types.ts";
import type { AssistantContext } from "../prompts/assistant.ts";

const context: AssistantContext = {
  totalSpent: 3500,
  monthlyGoal: 4000,
  percentageUsed: 87,
  topCategories: [{ name: "Alimentação", amount: 1200, percentage: 34 }],
  healthScore: {
    score: 72,
    budgetAdherence: 30,
    quizPerformance: 15,
    consistency: 15,
    savings: 12,
  },
  recentExpenses: [{ merchant: "Padaria Sol", amount: 25.9, category: "Alimentação" }],
};

const textOf = (part: Part) => (part.type === "text" ? part.text : "");

describe("FinancialAssistant.ask", () => {
  it("devolve a resposta do modelo", async () => {
    const provider = createFakeProvider({ respondWith: "Você está indo bem!" });
    const result = await createFinancialAssistant(provider).ask({
      question: "Como estão meus gastos?",
      context,
    });

    expect(result.message).toBe("Você está indo bem!");
  });

  it("inclui o contexto financeiro no system prompt", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    await createFinancialAssistant(provider).ask({ question: "e aí?", context });

    const system = provider.calls[0]!.system ?? "";
    expect(system).toContain("Alimentação");
    expect(system).toContain("72/100");
  });

  // O chat-assistant antigo interpolava profile.name direto no prompt.
  it("não envia o nome real do usuário no system prompt", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    await createFinancialAssistant(provider).ask({
      question: "como estou?",
      context,
      userName: "Maria Silva",
    });

    expect(provider.calls[0]!.system ?? "").not.toContain("Maria Silva");
  });

  it("remove o nome também da pergunta escrita pelo usuário", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    await createFinancialAssistant(provider).ask({
      question: "aqui é a Maria Silva, como estão meus gastos?",
      context,
      userName: "Maria Silva",
    });

    const enviado = textOf(provider.calls[0]!.messages.at(-1)!.parts[0]!);
    expect(enviado).not.toContain("Maria Silva");
    expect(enviado).toContain("[USUARIO]");
  });

  // O original salvava o histórico mas mandava só o turno atual.
  it("envia o histórico da conversa", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    await createFinancialAssistant(provider).ask({
      question: "e no mês passado?",
      context,
      history: [
        { role: "user", content: "quanto gastei esse mês?" },
        { role: "assistant", content: "R$ 3.500,00" },
      ],
    });

    const messages = provider.calls[0]!.messages;
    expect(messages).toHaveLength(3);
    expect(messages[0]!.role).toBe("user");
    expect(messages[1]!.role).toBe("assistant");
    expect(textOf(messages[1]!.parts[0]!)).toBe("R$ 3.500,00");
    expect(textOf(messages[2]!.parts[0]!)).toBe("e no mês passado?");
  });

  it("limita o histórico aos turnos mais recentes", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    const history: ChatTurn[] = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `turno ${i}`,
    }));

    await createFinancialAssistant(provider).ask({ question: "e agora?", context, history });

    // 10 turnos de histórico + a pergunta atual.
    expect(provider.calls[0]!.messages).toHaveLength(11);
    expect(textOf(provider.calls[0]!.messages[0]!.parts[0]!)).toBe("turno 20");
  });

  it("rejeita pergunta vazia sem chamar o provedor", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    await expect(
      createFinancialAssistant(provider).ask({ question: "   ", context }),
    ).rejects.toMatchObject({ kind: "unsupported" });
    expect(provider.calls).toHaveLength(0);
  });

  it("rejeita pergunta longa demais sem chamar o provedor", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    await expect(
      createFinancialAssistant(provider).ask({ question: "a".repeat(4001), context }),
    ).rejects.toMatchObject({ kind: "unsupported" });
    expect(provider.calls).toHaveLength(0);
  });

  it("trata resposta vazia do modelo como erro", async () => {
    const provider = createFakeProvider({ respondWith: "   " });
    await expect(
      createFinancialAssistant(provider).ask({ question: "oi", context }),
    ).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it("funciona sem score de saúde", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    const { healthScore: _omitido, ...semScore } = context;
    await createFinancialAssistant(provider).ask({ question: "oi", context: semScore });

    expect(provider.calls[0]!.system ?? "").not.toContain("SCORE DE SAÚDE");
  });
});

describe("orçamento de tokens", () => {
  // Regressão: com maxOutputTokens=800 (valor herdado do código antigo) e
  // raciocínio ligado, o modelo gastava ~631 tokens pensando e truncava a
  // resposta. Verificado contra a API real.
  it("desliga o raciocínio para não competir com o orçamento da resposta", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    await createFinancialAssistant(provider).ask({ question: "oi", context });

    expect(provider.calls[0]!.reasoning).toBe("disabled");
    expect(provider.calls[0]!.maxOutputTokens).toBeGreaterThan(800);
  });
});
