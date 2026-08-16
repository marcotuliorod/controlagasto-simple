import { describe, it, expect } from "vitest";
import { parseAmount, parseDate, parseText } from "./normalize.ts";

describe("parseAmount", () => {
  it("lê o formato brasileiro com milhar e decimal", () => {
    expect(parseAmount("R$ 1.234,56")).toBe(1234.56);
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("0,99")).toBe(0.99);
  });

  it("lê o formato americano", () => {
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("$1234.56")).toBe(1234.56);
  });

  it("aceita número puro", () => {
    expect(parseAmount(1234.56)).toBe(1234.56);
    expect(parseAmount("1234")).toBe(1234);
  });

  it("devolve null para entrada sem valor", () => {
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("sem valor")).toBeNull();
    expect(parseAmount(Number.NaN)).toBeNull();
  });
});

describe("parseDate", () => {
  it("mantém ISO", () => {
    expect(parseDate("2024-01-15")).toBe("2024-01-15");
    expect(parseDate("2024-01-15T10:30:00Z")).toBe("2024-01-15");
  });

  it("converte o formato brasileiro", () => {
    expect(parseDate("15/01/2024")).toBe("2024-01-15");
    expect(parseDate("5/1/2024")).toBe("2024-01-05");
    expect(parseDate("15-01-2024")).toBe("2024-01-15");
  });

  it("assume 20xx em ano de dois dígitos", () => {
    expect(parseDate("15/01/24")).toBe("2024-01-15");
  });

  it("rejeita data inexistente", () => {
    expect(parseDate("31/02/2024")).toBeNull();
    expect(parseDate("2024-02-31")).toBeNull();
    expect(parseDate("15/13/2024")).toBeNull();
  });

  it("devolve null para entrada inválida", () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate("ontem")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("parseText", () => {
  it("normaliza espaços em branco", () => {
    expect(parseText("  Supermercado  ")).toBe("Supermercado");
  });

  it("trata marcadores de ausência como null", () => {
    expect(parseText("null")).toBeNull();
    expect(parseText("N/A")).toBeNull();
    expect(parseText("não informado")).toBeNull();
    expect(parseText("-")).toBeNull();
    expect(parseText("   ")).toBeNull();
  });
});
