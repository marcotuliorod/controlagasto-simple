import { describe, it, expect } from "vitest";
import { redact, pseudonymizeName } from "./redaction.ts";

describe("redact", () => {
  it("remove CPF nos dois formatos", () => {
    expect(redact("Titular CPF 123.456.789-01").text).toBe("Titular CPF [CPF]");
    expect(redact("CPF 12345678901 na nota").text).toBe("CPF [CPF] na nota");
  });

  it("remove agência e conta", () => {
    expect(redact("Agência: 1234 Conta: 56789-0").text).toContain("[CONTA]");
    expect(redact("Agência: 1234 Conta: 56789-0").text).not.toContain("56789");
  });

  it("remove número de cartão completo e mascarado", () => {
    expect(redact("Cartão 1234 5678 9012 3456").text).toBe("Cartão [CARTAO]");
    expect(redact("final ****1234").text).toBe("final [CARTAO]");
  });

  it("remove email e telefone", () => {
    expect(redact("contato joao@exemplo.com").text).toBe("contato [EMAIL]");
    expect(redact("tel (11) 91234-5678").text).toContain("[TELEFONE]");
  });

  it("NÃO remove CNPJ — identifica o estabelecimento, não o titular", () => {
    const cnpj = "12.345.678/0001-90";
    expect(redact(`Loja CNPJ ${cnpj}`).text).toContain(cnpj);
  });

  it("preserva as transações, que é o dado que interessa extrair", () => {
    const linha = "15/01/2024 SUPERMERCADO CARREFOUR 150,50 D";
    expect(redact(`CPF 123.456.789-01\n${linha}`).text).toContain(linha);
  });

  it("relata o que foi removido, para o log de auditoria", () => {
    const { removed } = redact("CPF 123.456.789-01 e CPF 987.654.321-00");
    expect(removed.cpf).toBe(2);
  });

  it("respeita a lista de tipos informada", () => {
    const texto = "CPF 123.456.789-01 email a@b.com";
    const { text } = redact(texto, ["cpf"]);
    expect(text).toContain("[CPF]");
    expect(text).toContain("a@b.com");
  });
});

describe("pseudonymizeName", () => {
  it("substitui o nome real, sem diferenciar maiúsculas", () => {
    expect(pseudonymizeName("Olá Maria Silva, seus gastos", "Maria Silva")).toBe(
      "Olá [USUARIO], seus gastos",
    );
    expect(pseudonymizeName("gasto de MARIA SILVA", "Maria Silva")).toBe("gasto de [USUARIO]");
  });

  it("ignora nome curto demais, que causaria substituição indevida", () => {
    expect(pseudonymizeName("Ana comprou algo", "Jo")).toBe("Ana comprou algo");
  });

  it("trata caracteres especiais do nome sem quebrar a regex", () => {
    expect(pseudonymizeName("cliente J. O'Brien (SP)", "J. O'Brien")).toBe("cliente [USUARIO] (SP)");
  });
});
