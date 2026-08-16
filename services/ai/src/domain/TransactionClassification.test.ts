import { describe, it, expect } from "vitest";
import { createTransactionClassification } from "./TransactionClassification.ts";
import { createFakeProvider } from "../providers/fake.ts";

const PDF = { mimeType: "application/pdf", data: "ZmFrZQ==" };

const twoTransactions = JSON.stringify({
  transactions: [
    { date: "2024-01-15", description: "SUPERMERCADO CARREFOUR", amount: 150.5, type: "debit", documentNumber: "123" },
    { date: "2024-01-16", description: "SALARIO", amount: 5000, type: "credit" },
  ],
});

describe("fromDocument", () => {
  it("extrai e normaliza as transações", async () => {
    const provider = createFakeProvider({ respondWith: twoTransactions });
    const result = await createTransactionClassification(provider).fromDocument(PDF);

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toEqual({
      date: "2024-01-15",
      description: "SUPERMERCADO CARREFOUR",
      amount: 150.5,
      type: "debit",
      documentNumber: "123",
    });
    expect(result.transactions[1]!.documentNumber).toBeNull();
    expect(result.discarded).toBe(0);
  });

  it("manda o PDF como documento, não como imagem", async () => {
    const provider = createFakeProvider({ respondWith: twoTransactions });
    await createTransactionClassification(provider).fromDocument(PDF);

    expect(provider.calls[0]!.messages[0]!.parts).toContainEqual({
      type: "document",
      mimeType: "application/pdf",
      data: "ZmFrZQ==",
    });
  });

  it("recusa arquivo que não seja PDF sem chamar o provedor", async () => {
    const provider = createFakeProvider({ respondWith: twoTransactions });
    await expect(
      createTransactionClassification(provider).fromDocument({
        mimeType: "text/csv",
        data: "eA==",
      }),
    ).rejects.toMatchObject({ kind: "unsupported" });
    expect(provider.calls).toHaveLength(0);
  });

  // Preferir perder uma linha a inserir despesa errada no extrato do usuário.
  it("descarta linhas inválidas e informa quantas", async () => {
    const provider = createFakeProvider({
      respondWith: JSON.stringify({
        transactions: [
          { date: "2024-01-15", description: "VALIDA", amount: 10, type: "debit" },
          { date: "data-ruim", description: "SEM DATA", amount: 10, type: "debit" },
          { date: "2024-01-15", description: "SEM VALOR", amount: 0, type: "debit" },
          { date: "2024-01-15", description: "", amount: 10, type: "debit" },
        ],
      }),
    });
    const result = await createTransactionClassification(provider).fromDocument(PDF);

    expect(result.transactions).toHaveLength(1);
    expect(result.discarded).toBe(3);
  });

  it("converte data brasileira e valor com vírgula", async () => {
    const provider = createFakeProvider({
      respondWith: JSON.stringify({
        transactions: [{ date: "15/01/2024", description: "X", amount: "1.234,56", type: "debit" }],
      }),
    });
    const result = await createTransactionClassification(provider).fromDocument(PDF);

    expect(result.transactions[0]).toMatchObject({ date: "2024-01-15", amount: 1234.56 });
  });

  it("usa debit como padrão quando o tipo é desconhecido", async () => {
    const provider = createFakeProvider({
      respondWith: JSON.stringify({
        transactions: [{ date: "2024-01-15", description: "X", amount: 10, type: "estorno" }],
      }),
    });
    const result = await createTransactionClassification(provider).fromDocument(PDF);

    expect(result.transactions[0]!.type).toBe("debit");
  });

  it("preserva o tipo investment, que tem tratamento próprio no app", async () => {
    const provider = createFakeProvider({
      respondWith: JSON.stringify({
        transactions: [{ date: "2024-01-15", description: "APLICACAO CDB", amount: 500, type: "investment" }],
      }),
    });
    const result = await createTransactionClassification(provider).fromDocument(PDF);

    expect(result.transactions[0]!.type).toBe("investment");
  });
});

describe("fromText (caminho da Fase 4)", () => {
  it("redige PII antes de enviar e relata o que removeu", async () => {
    const provider = createFakeProvider({ respondWith: twoTransactions });
    const texto = "Titular CPF 123.456.789-01\nAgência: 1234 Conta: 56789-0\n15/01/2024 MERCADO 150,50 D";

    const result = await createTransactionClassification(provider).fromText(texto);

    const enviado = provider.calls[0]!.messages[0]!.parts[0]!;
    expect(enviado.type).toBe("text");
    const conteudo = enviado.type === "text" ? enviado.text : "";
    expect(conteudo).not.toContain("123.456.789-01");
    expect(conteudo).toContain("[CPF]");
    // A transação em si precisa sobreviver à redação.
    expect(conteudo).toContain("MERCADO");
    expect(result.redacted.cpf).toBe(1);
  });

  it("não envia documento quando o caminho é texto", async () => {
    const provider = createFakeProvider({ respondWith: twoTransactions });
    await createTransactionClassification(provider).fromText("15/01/2024 MERCADO 150,50 D");

    expect(provider.calls[0]!.messages[0]!.parts.every((p) => p.type === "text")).toBe(true);
  });

  it("recusa texto vazio", async () => {
    const provider = createFakeProvider({ respondWith: twoTransactions });
    await expect(
      createTransactionClassification(provider).fromText("   "),
    ).rejects.toMatchObject({ kind: "unsupported" });
    expect(provider.calls).toHaveLength(0);
  });
});
