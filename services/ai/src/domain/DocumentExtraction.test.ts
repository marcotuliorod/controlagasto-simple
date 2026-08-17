import { describe, it, expect } from "vitest";
import { createDocumentExtraction } from "./DocumentExtraction.ts";
import { createFakeProvider } from "../providers/fake.ts";
import { AIError } from "../shared/errors.ts";

const IMAGE = { mimeType: "image/jpeg", data: "ZmFrZQ==" };

const validReceipt = JSON.stringify({
  amount: 1234.56,
  date: "2024-01-15",
  merchant: "Supermercado Teste",
  cnpj: "12.345.678/0001-90",
  items: [{ name: "Arroz", value: 25.9 }],
});

describe("DocumentExtraction.extractReceipt", () => {
  it("extrai e normaliza os campos do cupom", async () => {
    const provider = createFakeProvider({ respondWith: validReceipt });
    const result = await createDocumentExtraction(provider).extractReceipt(IMAGE);

    expect(result).toEqual({
      amount: 1234.56,
      date: "2024-01-15",
      merchant: "Supermercado Teste",
      cnpj: "12.345.678/0001-90",
      items: [{ name: "Arroz", value: 25.9 }],
    });
  });

  it("normaliza valor e data em formato brasileiro vindos do modelo", async () => {
    const provider = createFakeProvider({
      respondWith: JSON.stringify({
        amount: "R$ 1.234,56",
        date: "15/01/2024",
        merchant: "  Padaria  ",
        cnpj: "N/A",
        items: [],
      }),
    });
    const result = await createDocumentExtraction(provider).extractReceipt(IMAGE);

    expect(result.amount).toBe(1234.56);
    expect(result.date).toBe("2024-01-15");
    expect(result.merchant).toBe("Padaria");
    expect(result.cnpj).toBeNull();
  });

  it("envia a imagem como parte de imagem e pede schema quando suportado", async () => {
    const provider = createFakeProvider({ respondWith: validReceipt });
    await createDocumentExtraction(provider).extractReceipt(IMAGE);

    const request = provider.calls[0]!;
    expect(request.schema).toBeDefined();
    expect(request.messages[0]!.parts).toContainEqual({
      type: "image",
      mimeType: "image/jpeg",
      data: "ZmFrZQ==",
    });
  });

  it("manda PDF como documento, não como imagem", async () => {
    const provider = createFakeProvider({ respondWith: validReceipt });
    await createDocumentExtraction(provider).extractReceipt({
      mimeType: "application/pdf",
      data: "ZmFrZQ==",
    });

    expect(provider.calls[0]!.messages[0]!.parts).toContainEqual({
      type: "document",
      mimeType: "application/pdf",
      data: "ZmFrZQ==",
    });
  });

  it("descarta itens sem nome e limita a 3", async () => {
    const provider = createFakeProvider({
      respondWith: JSON.stringify({
        amount: 10,
        date: "2024-01-15",
        merchant: "X",
        cnpj: null,
        items: [
          { name: "A", value: 1 },
          { name: "", value: 2 },
          { name: "B", value: 3 },
          { name: "C", value: 4 },
          { name: "D", value: 5 },
        ],
      }),
    });
    const result = await createDocumentExtraction(provider).extractReceipt(IMAGE);

    expect(result.items.map((i) => i.name)).toEqual(["A", "B", "C"]);
  });

  it("rejeita mime type não suportado sem chamar o provedor", async () => {
    const provider = createFakeProvider({ respondWith: validReceipt });
    const extraction = createDocumentExtraction(provider);

    await expect(
      extraction.extractReceipt({ mimeType: "text/csv", data: "eA==" }),
    ).rejects.toMatchObject({ kind: "unsupported" });
    expect(provider.calls).toHaveLength(0);
  });

  it("falha quando o provedor não suporta a capacidade necessária", async () => {
    const provider = createFakeProvider({ respondWith: validReceipt, supports: [] });
    await expect(
      createDocumentExtraction(provider).extractReceipt(IMAGE),
    ).rejects.toMatchObject({ kind: "unsupported" });
  });

  it("lê JSON entre cercas markdown quando não há structured output", async () => {
    const provider = createFakeProvider({
      respondWith: "```json\n" + validReceipt + "\n```",
      supports: ["vision"],
    });
    const result = await createDocumentExtraction(provider).extractReceipt(IMAGE);

    expect(result.amount).toBe(1234.56);
    expect(provider.calls[0]!.schema).toBeUndefined();
  });

  it("não re-tenta erro que não é transitório", async () => {
    const provider = createFakeProvider({
      respondWith: "",
      throws: new AIError("invalid_response", "erro fatal"),
    });

    await expect(createDocumentExtraction(provider).extractReceipt(IMAGE)).rejects.toMatchObject({
      kind: "invalid_response",
    });
    expect(provider.calls).toHaveLength(1);
  });

  it("re-tenta erro transitório", async () => {
    const provider = createFakeProvider({
      respondWith: "",
      throws: new AIError("rate_limited", "429"),
    });

    await expect(createDocumentExtraction(provider).extractReceipt(IMAGE)).rejects.toMatchObject({
      kind: "rate_limited",
    });
    expect(provider.calls).toHaveLength(3);
  });
});
