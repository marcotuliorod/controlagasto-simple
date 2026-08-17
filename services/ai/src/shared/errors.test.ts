import { describe, it, expect } from "vitest";
import { AIError } from "./errors.ts";

describe("AIError.fromHttpStatus", () => {
  it("trata 429 como transitório e re-tentável", () => {
    const error = AIError.fromHttpStatus(429);
    expect(error.kind).toBe("rate_limited");
    expect(error.retryable).toBe(true);
    expect(error.httpStatus).toBe(429);
  });

  it("trata 5xx como transitório e re-tentável", () => {
    for (const status of [500, 502, 503]) {
      const error = AIError.fromHttpStatus(status);
      expect(error.kind).toBe("provider_error");
      expect(error.retryable).toBe(true);
    }
  });

  // Regressão: na primeira versão, 4xx caía em provider_error com
  // retryable=true, então uma chave inválida ou um modelo inexistente eram
  // re-tentados 3x sem chance nenhuma de sucesso. Descoberto testando contra
  // a API real, quando gemini-2.5-flash passou a devolver 404.
  it.each([400, 401, 403, 404])("trata %i como configuração errada, sem retry", (status) => {
    const error = AIError.fromHttpStatus(status);
    expect(error.kind).toBe("misconfigured");
    expect(error.retryable).toBe(false);
  });

  it("trata 402 como cota esgotada, sem retry", () => {
    const error = AIError.fromHttpStatus(402);
    expect(error.kind).toBe("quota_exceeded");
    expect(error.retryable).toBe(false);
  });
});

describe("mensagem pública", () => {
  it("nunca revela fornecedor, billing ou detalhe de configuração", () => {
    const detalhesVazados =
      /lovable|gemini|google|openai|anthropic|api[_ ]?key|settings|workspace|usage|cr[eé]dito/i;

    const kinds = [
      AIError.fromHttpStatus(429),
      AIError.fromHttpStatus(402, "Créditos esgotados. Adicione em Settings -> Workspace"),
      AIError.fromHttpStatus(404, "model gemini-2.5-flash no longer available"),
      AIError.fromHttpStatus(500, "GEMINI_API_KEY inválida"),
      new AIError("timeout"),
      new AIError("unsupported"),
      new AIError("invalid_response"),
    ];

    for (const error of kinds) {
      expect(error.publicMessage).not.toMatch(detalhesVazados);
    }
  });

  it("mantém o detalhe técnico só em message, para o log do servidor", () => {
    const error = AIError.fromHttpStatus(404, "model gemini-2.5-flash no longer available");
    expect(error.message).toContain("gemini-2.5-flash");
    expect(error.publicMessage).not.toContain("gemini");
  });
});
