import { describe, it, expect } from "vitest";
import { createFinancialInsights } from "./FinancialInsights.ts";
import { createFakeProvider } from "../providers/fake.ts";
import { AIError } from "../shared/errors.ts";
import type { InsightsContext } from "../prompts/insights.ts";

const context: InsightsContext = {
  currentMonth: "janeiro de 2024",
  currentTotal: 3500,
  previousTotal: 3000,
  monthVariation: 16.7,
  monthlyGoal: 4000,
  goalProgress: 87,
  totalExpenses: 42,
  topCategories: [{ name: "Alimentação", icon: "🍽️", total: 1200 }],
  categoryGoals: [{ category: "Lazer", spent: 300, limit: 500 }],
};

const validInsights = JSON.stringify({
  insights: [
    { type: "positive", message: "✅ Você está dentro da meta." },
    { type: "warning", message: "⚠️ Alimentação subiu." },
  ],
});

describe("FinancialInsights.generate", () => {
  it("devolve os insights do modelo", async () => {
    const provider = createFakeProvider({ respondWith: validInsights });
    const result = await createFinancialInsights(provider).generate(context);

    expect(result.fallback).toBe(false);
    expect(result.insights).toHaveLength(2);
    expect(result.insights[0]).toEqual({ type: "positive", message: "✅ Você está dentro da meta." });
  });

  it("envia apenas agregados — nunca comerciante ou nome", async () => {
    const provider = createFakeProvider({ respondWith: validInsights });
    await createFinancialInsights(provider).generate(context);

    const part = provider.calls[0]!.messages[0]!.parts[0]!;
    const prompt = part.type === "text" ? part.text : "";
    expect(prompt).toContain("Alimentação");
    expect(prompt).toContain("janeiro de 2024");
    // O contexto de insights não tem campo de nome nem de comerciante.
    expect(prompt).not.toMatch(/CPF|comerciante|merchant/i);
  });

  it("limita a 4 insights", async () => {
    const provider = createFakeProvider({
      respondWith: JSON.stringify({
        insights: Array.from({ length: 8 }, (_, i) => ({ type: "tip", message: `dica ${i}` })),
      }),
    });
    const result = await createFinancialInsights(provider).generate(context);

    expect(result.insights).toHaveLength(4);
  });

  it("normaliza tipo desconhecido para info", async () => {
    const provider = createFakeProvider({
      respondWith: JSON.stringify({ insights: [{ type: "urgente", message: "x" }] }),
    });
    const result = await createFinancialInsights(provider).generate(context);

    expect(result.insights[0]!.type).toBe("info");
  });

  // A tela chama isto no carregamento: falhar em silêncio é melhor que quebrar.
  it("cai no cálculo local quando o provedor falha", async () => {
    const provider = createFakeProvider({
      respondWith: "",
      throws: new AIError("provider_error", "500"),
    });
    const result = await createFinancialInsights(provider).generate(context);

    expect(result.fallback).toBe(true);
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.insights.some((i) => i.message.includes("3.500"))).toBe(true);
  });

  it("cai no cálculo local quando o modelo responde sem insights úteis", async () => {
    const provider = createFakeProvider({ respondWith: JSON.stringify({ insights: [] }) });
    const result = await createFinancialInsights(provider).generate(context);

    expect(result.fallback).toBe(true);
  });

  // Erro de configuração não pode ser mascarado: o operador precisa ver.
  it("propaga erro de configuração em vez de esconder no fallback", async () => {
    const provider = createFakeProvider({
      respondWith: "",
      throws: new AIError("misconfigured", "chave inválida"),
    });

    await expect(createFinancialInsights(provider).generate(context)).rejects.toMatchObject({
      kind: "misconfigured",
    });
  });

  it("avisa quando a meta foi ultrapassada, no fallback", async () => {
    const provider = createFakeProvider({
      respondWith: "",
      throws: new AIError("timeout", "demorou"),
    });
    const result = await createFinancialInsights(provider).generate({
      ...context,
      goalProgress: 120,
    });

    expect(result.insights.some((i) => i.type === "warning")).toBe(true);
  });
});
