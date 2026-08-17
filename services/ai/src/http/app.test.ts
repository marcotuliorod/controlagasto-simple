import { describe, it, expect } from "vitest";
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet } from "jose";
import { createApp } from "./app.ts";
import { createKeyResolver } from "./auth.ts";
import { createFakeProvider, type FakeProvider } from "../providers/fake.ts";
import { AIError } from "../shared/errors.ts";
import type { Config } from "../config.ts";

const JWT_SECRET = "segredo-de-teste-com-tamanho-suficiente-para-hs256";

const RECEIPT_JSON = JSON.stringify({
  amount: 99.9,
  date: "2024-03-01",
  merchant: "Mercado",
  cnpj: null,
  items: [],
});

async function makeToken(payload: Record<string, unknown> = {}, expiresIn = "1h") {
  return new SignJWT({ sub: "user-123", email: "a@b.com", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(JWT_SECRET));
}

function makeApp(provider: FakeProvider, jwtKeys?: Config["jwtKeys"]) {
  const config: Config = {
    port: 0,
    jwtKeys: jwtKeys ?? createKeyResolver({ jwtSecret: JWT_SECRET }),
    allowedOrigins: ["http://localhost:8080"],
    provider,
  };
  return createApp(config);
}

const receiptRequest = (token?: string, body?: unknown) =>
  new Request("http://localhost/v1/receipt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body ?? { mimeType: "image/jpeg", data: "ZmFrZQ==" }),
  });

describe("POST /v1/receipt", () => {
  it("extrai o cupom para um token válido", async () => {
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    const response = await makeApp(provider).fetch(receiptRequest(await makeToken()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      amount: 99.9,
      merchant: "Mercado",
    });
  });

  it("aceita data URL, que é o formato enviado pelo app hoje", async () => {
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    await makeApp(provider).fetch(
      receiptRequest(await makeToken(), {
        mimeType: "image/jpeg",
        data: "data:image/jpeg;base64,ZmFrZQ==",
      }),
    );

    const part = provider.calls[0]!.messages[0]!.parts.find((p) => p.type === "image");
    // O prefixo data: precisa ser removido antes de ir ao provedor.
    expect(part).toMatchObject({ data: "ZmFrZQ==" });
  });

  it("rejeita requisição sem token SEM chamar o provedor (chamada paga)", async () => {
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    const response = await makeApp(provider).fetch(receiptRequest());

    expect(response.status).toBe(401);
    expect(provider.calls).toHaveLength(0);
  });

  it("rejeita token com assinatura inválida", async () => {
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    const foreign = await new SignJWT({ sub: "user-123" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("outro-segredo-completamente-diferente"));

    const response = await makeApp(provider).fetch(receiptRequest(foreign));

    expect(response.status).toBe(401);
    expect(provider.calls).toHaveLength(0);
  });

  it("rejeita token expirado", async () => {
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    const expired = await makeToken({}, "-1h");
    const response = await makeApp(provider).fetch(receiptRequest(expired));

    expect(response.status).toBe(401);
    expect(provider.calls).toHaveLength(0);
  });

  it("rejeita corpo inválido com 400", async () => {
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    const response = await makeApp(provider).fetch(
      receiptRequest(await makeToken(), { mimeType: "" }),
    );

    expect(response.status).toBe(400);
    expect(provider.calls).toHaveLength(0);
  });

  it("traduz rate limit do provedor em 429 sem citar o fornecedor", async () => {
    const provider = createFakeProvider({
      respondWith: "",
      throws: new AIError("rate_limited", "429 do fornecedor X"),
    });
    const response = await makeApp(provider).fetch(receiptRequest(await makeToken()));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(429);
    expect(body.error).not.toMatch(/gemini|lovable|google|cr[eé]dito/i);
  });

  it("traduz cota esgotada em 503 sem instruções de billing", async () => {
    const provider = createFakeProvider({
      respondWith: "",
      throws: new AIError("quota_exceeded", "402"),
    });
    const response = await makeApp(provider).fetch(receiptRequest(await makeToken()));
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(body.error).not.toMatch(/settings|workspace|usage|cr[eé]dito/i);
  });
});

describe("GET /health", () => {
  it("responde sem exigir autenticação", async () => {
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    const response = await makeApp(provider).fetch(new Request("http://localhost/health"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });
});

const post = (path: string, body: unknown, token?: string) =>
  new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });

describe("POST /v1/statement", () => {
  const STATEMENT_JSON = JSON.stringify({
    transactions: [
      { date: "2024-01-15", description: "MERCADO", amount: 150.5, type: "debit" },
    ],
  });

  it("extrai transações de um PDF", async () => {
    const provider = createFakeProvider({ respondWith: STATEMENT_JSON });
    const response = await makeApp(provider).fetch(
      post("/v1/statement", { mimeType: "application/pdf", data: "ZmFrZQ==" }, await makeToken()),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ discarded: 0 });
  });

  it("aceita texto e redige PII antes de enviar", async () => {
    const provider = createFakeProvider({ respondWith: STATEMENT_JSON });
    await makeApp(provider).fetch(
      post("/v1/statement", { text: "CPF 123.456.789-01\n15/01/2024 MERCADO 150,50 D" }, await makeToken()),
    );

    const part = provider.calls[0]!.messages[0]!.parts[0]!;
    const enviado = part.type === "text" ? part.text : "";
    expect(enviado).not.toContain("123.456.789-01");
  });

  it("não aciona o provedor sem token", async () => {
    const provider = createFakeProvider({ respondWith: STATEMENT_JSON });
    const response = await makeApp(provider).fetch(
      post("/v1/statement", { mimeType: "application/pdf", data: "ZmFrZQ==" }),
    );

    expect(response.status).toBe(401);
    expect(provider.calls).toHaveLength(0);
  });
});

describe("POST /v1/insights", () => {
  const context = {
    currentMonth: "janeiro de 2024",
    currentTotal: 3500,
    previousTotal: 3000,
    monthVariation: 16.7,
    monthlyGoal: 4000,
    goalProgress: 87,
    totalExpenses: 42,
    topCategories: [{ name: "Alimentação", total: 1200 }],
    categoryGoals: [],
  };

  it("gera insights", async () => {
    const provider = createFakeProvider({
      respondWith: JSON.stringify({ insights: [{ type: "tip", message: "💡 dica" }] }),
    });
    const response = await makeApp(provider).fetch(
      post("/v1/insights", context, await makeToken()),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ fallback: false });
  });

  it("não aciona o provedor sem token", async () => {
    const provider = createFakeProvider({ respondWith: "{}" });
    const response = await makeApp(provider).fetch(post("/v1/insights", context));

    expect(response.status).toBe(401);
    expect(provider.calls).toHaveLength(0);
  });
});

describe("POST /v1/chat", () => {
  const body = {
    question: "Como estão meus gastos?",
    context: {
      totalSpent: 3500,
      monthlyGoal: 4000,
      percentageUsed: 87,
      topCategories: [],
      recentExpenses: [],
    },
  };

  it("responde a pergunta", async () => {
    const provider = createFakeProvider({ respondWith: "Você está dentro da meta." });
    const response = await makeApp(provider).fetch(post("/v1/chat", body, await makeToken()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ message: "Você está dentro da meta." });
  });

  it("não vaza o nome do usuário para o modelo", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    await makeApp(provider).fetch(
      post("/v1/chat", { ...body, userName: "Maria Silva" }, await makeToken()),
    );

    expect(provider.calls[0]!.system ?? "").not.toContain("Maria Silva");
  });

  it("não aciona o provedor sem token", async () => {
    const provider = createFakeProvider({ respondWith: "ok" });
    const response = await makeApp(provider).fetch(post("/v1/chat", body));

    expect(response.status).toBe(401);
    expect(provider.calls).toHaveLength(0);
  });
});

/**
 * O Supabase hospedado assina com chave assimétrica (ES256, resolvida pelo
 * `kid` contra o JWKS do projeto); só o stack local ainda emite HS256.
 *
 * Estes testes existem porque a suíte inteira passava com HS256 enquanto o
 * projeto real devolvia 401 em token legítimo: verificar só o algoritmo do
 * ambiente de teste é verificar o ambiente de teste.
 */
describe("verificação de JWT assimétrico", () => {
  async function makeEs256Setup() {
    const { publicKey, privateKey } = await generateKeyPair("ES256", { extractable: true });
    const jwk = await exportJWK(publicKey);
    const kid = "chave-de-teste";
    const jwks = createLocalJWKSet({ keys: [{ ...jwk, kid, alg: "ES256", use: "sig" }] });

    const sign = (payload: Record<string, unknown> = {}) =>
      new SignJWT({ sub: "user-es256", email: "a@b.com", ...payload })
        .setProtectedHeader({ alg: "ES256", kid })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(privateKey);

    return { jwks, sign };
  }

  it("aceita token ES256 resolvido pelo JWKS", async () => {
    const { jwks, sign } = await makeEs256Setup();
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    const app = makeApp(provider, createKeyResolver({ jwks }));

    const response = await app.fetch(receiptRequest(await sign()));

    expect(response.status).toBe(200);
  });

  it("aceita HS256 e ES256 ao mesmo tempo, para a migração do Supabase", async () => {
    const { jwks, sign } = await makeEs256Setup();
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    const app = makeApp(provider, createKeyResolver({ jwks, jwtSecret: JWT_SECRET }));

    const assimetrico = await app.fetch(receiptRequest(await sign()));
    const simetrico = await app.fetch(receiptRequest(await makeToken()));

    expect(assimetrico.status).toBe(200);
    expect(simetrico.status).toBe(200);
  });

  it("rejeita ES256 assinado por outra chave, sem acionar o provedor", async () => {
    const { jwks } = await makeEs256Setup();
    const intruso = await makeEs256Setup();
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    const app = makeApp(provider, createKeyResolver({ jwks }));

    const response = await app.fetch(receiptRequest(await intruso.sign()));

    expect(response.status).toBe(401);
    expect(provider.calls).toHaveLength(0);
  });

  it("rejeita token assimétrico quando só há segredo HS256 configurado", async () => {
    const { sign } = await makeEs256Setup();
    const provider = createFakeProvider({ respondWith: RECEIPT_JSON });
    const app = makeApp(provider, createKeyResolver({ jwtSecret: JWT_SECRET }));

    const response = await app.fetch(receiptRequest(await sign()));

    expect(response.status).toBe(401);
    expect(provider.calls).toHaveLength(0);
  });

  it("falha ao montar o resolvedor sem chave nenhuma", () => {
    expect(() => createKeyResolver({})).toThrow(/SUPABASE_URL|SUPABASE_JWT_SECRET/);
  });
});
