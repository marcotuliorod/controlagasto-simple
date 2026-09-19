import { describe, it, expect, vi, beforeEach } from "vitest";
import { messageFromInvokeError } from "./functionErrors";

const messages = { fallback: "FALLBACK", timeout: "TIMEOUT" };

function sdkError(status: number, body: string) {
  return Object.assign(new Error("Edge Function returned a non-2xx status code"), {
    name: "FunctionsHttpError",
    context: new Response(body, { status }),
  });
}

describe("messageFromInvokeError", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("devolve a mensagem que a função escreveu no corpo", async () => {
    const error = sdkError(429, JSON.stringify({ error: "Muitas solicitações em sequência." }));
    expect(await messageFromInvokeError(error, messages)).toBe("Muitas solicitações em sequência.");
  });

  it("não consome o corpo: dá para ler duas vezes", async () => {
    const error = sdkError(503, JSON.stringify({ error: "IA sobrecarregada" }));
    await messageFromInvokeError(error, messages);
    expect(await messageFromInvokeError(error, messages)).toBe("IA sobrecarregada");
  });

  it("corpo que não é JSON cai no genérico, nunca na mensagem em inglês do SDK", async () => {
    const message = await messageFromInvokeError(sdkError(502, "<html>Bad Gateway</html>"), messages);
    expect(message).toBe("FALLBACK");
    expect(message).not.toMatch(/non-2xx/);
  });

  it("JSON sem `error` cai no genérico", async () => {
    expect(await messageFromInvokeError(sdkError(500, JSON.stringify({ ok: false })), messages)).toBe("FALLBACK");
  });

  it("504/408 sem corpo aproveitável usam a mensagem de timeout", async () => {
    expect(await messageFromInvokeError(sdkError(504, ""), messages)).toBe("TIMEOUT");
    expect(await messageFromInvokeError(sdkError(408, ""), messages)).toBe("TIMEOUT");
  });

  it("sem `timeout` configurado, 504 usa o genérico", async () => {
    expect(await messageFromInvokeError(sdkError(504, ""), { fallback: "FALLBACK" })).toBe("FALLBACK");
  });

  it("erro sem resposta HTTP (rede) cai no genérico", async () => {
    expect(await messageFromInvokeError(new Error("Failed to fetch"), messages)).toBe("FALLBACK");
    expect(await messageFromInvokeError(undefined, messages)).toBe("FALLBACK");
  });
});
