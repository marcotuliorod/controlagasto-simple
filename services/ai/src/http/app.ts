/**
 * Rotas HTTP do serviço de IA.
 *
 * Separado de server.ts para poder ser testado sem abrir socket.
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import type { Config } from "../config.ts";
import { AIError } from "../shared/errors.ts";
import { authenticate, UnauthorizedError } from "./auth.ts";
import { createDocumentExtraction } from "../domain/DocumentExtraction.ts";
import { createTransactionClassification } from "../domain/TransactionClassification.ts";
import { createFinancialInsights } from "../domain/FinancialInsights.ts";
import { createFinancialAssistant } from "../domain/FinancialAssistant.ts";

/** 10MB em base64 ≈ 7.5MB de arquivo — acima do limite de 5MB do app. */
const MAX_BASE64_LENGTH = 10 * 1024 * 1024;
/** Extrato em texto puro: generoso, mas evita prompt sem limite. */
const MAX_TEXT_LENGTH = 500_000;

const receiptSchema = z.object({
  mimeType: z.string().min(1),
  data: z.string().min(1).max(MAX_BASE64_LENGTH),
});

/** Aceita o PDF ou o texto já extraído localmente (caminho da Fase 4). */
const statementSchema = z.union([
  z.object({
    mimeType: z.string().min(1),
    data: z.string().min(1).max(MAX_BASE64_LENGTH),
  }),
  z.object({ text: z.string().min(1).max(MAX_TEXT_LENGTH) }),
]);

const insightsSchema = z.object({
  currentMonth: z.string().min(1),
  currentTotal: z.number(),
  previousTotal: z.number(),
  monthVariation: z.number(),
  monthlyGoal: z.number(),
  goalProgress: z.number(),
  totalExpenses: z.number(),
  topCategories: z
    .array(z.object({ name: z.string(), icon: z.string().optional(), total: z.number() }))
    .default([]),
  categoryGoals: z
    .array(z.object({ category: z.string(), spent: z.number(), limit: z.number() }))
    .default([]),
});

const chatSchema = z.object({
  question: z.string().min(1),
  userName: z.string().optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
  context: z.object({
    totalSpent: z.number(),
    monthlyGoal: z.number(),
    percentageUsed: z.number(),
    topCategories: z
      .array(z.object({ name: z.string(), amount: z.number(), percentage: z.number() }))
      .default([]),
    healthScore: z
      .object({
        score: z.number(),
        budgetAdherence: z.number(),
        quizPerformance: z.number(),
        consistency: z.number(),
        savings: z.number(),
      })
      .optional(),
    recentExpenses: z
      .array(
        z.object({
          merchant: z.string().nullable(),
          amount: z.number(),
          category: z.string().nullable(),
        }),
      )
      .default([]),
  }),
});

/** Aceita tanto base64 puro quanto data URL, que é o formato que o app envia hoje. */
function stripDataUrlPrefix(data: string): string {
  const match = /^data:[^;]+;base64,(.*)$/s.exec(data);
  return match?.[1] ?? data;
}

export function createApp(config: Config) {
  const app = new Hono();
  const documentExtraction = createDocumentExtraction(config.provider);
  const transactions = createTransactionClassification(config.provider);
  const insights = createFinancialInsights(config.provider);
  const assistant = createFinancialAssistant(config.provider);

  app.use(
    "*",
    cors({
      origin: config.allowedOrigins,
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "OPTIONS"],
    }),
  );

  // Sem auth: usado por health check de orquestrador. Não expõe nada sensível.
  app.get("/health", (c) => c.json({ status: "ok", provider: config.provider.name }));

  app.post("/v1/receipt", async (c) => {
    // Autentica ANTES de ler o corpo e antes de qualquer chamada paga.
    const user = await authenticate(c.req.header("Authorization"), config.jwtKeys);

    const parsed = receiptSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Requisição inválida." }, 400);
    }

    const receipt = await documentExtraction.extractReceipt(
      { mimeType: parsed.data.mimeType, data: stripDataUrlPrefix(parsed.data.data) },
      // Se o cliente desistir, o provedor é abortado junto.
      c.req.raw.signal,
    );

    console.info(
      JSON.stringify({ event: "receipt_extracted", userId: user.id, provider: config.provider.name }),
    );

    return c.json(receipt);
  });

  app.post("/v1/statement", async (c) => {
    const user = await authenticate(c.req.header("Authorization"), config.jwtKeys);

    const parsed = statementSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Requisição inválida." }, 400);

    const result =
      "text" in parsed.data
        ? await transactions.fromText(parsed.data.text, c.req.raw.signal)
        : await transactions.fromDocument(
            { mimeType: parsed.data.mimeType, data: stripDataUrlPrefix(parsed.data.data) },
            c.req.raw.signal,
          );

    console.info(
      JSON.stringify({
        event: "statement_extracted",
        userId: user.id,
        mode: "text" in parsed.data ? "text" : "document",
        extracted: result.transactions.length,
        discarded: result.discarded,
        // Registro de auditoria LGPD: o que foi removido antes de sair daqui.
        redacted: result.redacted,
      }),
    );

    return c.json(result);
  });

  app.post("/v1/insights", async (c) => {
    const user = await authenticate(c.req.header("Authorization"), config.jwtKeys);

    const parsed = insightsSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Requisição inválida." }, 400);

    const result = await insights.generate(parsed.data, c.req.raw.signal);

    console.info(
      JSON.stringify({ event: "insights_generated", userId: user.id, fallback: result.fallback }),
    );

    return c.json(result);
  });

  app.post("/v1/chat", async (c) => {
    const user = await authenticate(c.req.header("Authorization"), config.jwtKeys);

    const parsed = chatSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "Requisição inválida." }, 400);

    const reply = await assistant.ask({
      question: parsed.data.question,
      context: parsed.data.context,
      ...(parsed.data.history && { history: parsed.data.history }),
      ...(parsed.data.userName && { userName: parsed.data.userName }),
      signal: c.req.raw.signal,
    });

    console.info(JSON.stringify({ event: "chat_replied", userId: user.id }));

    return c.json(reply);
  });

  app.onError((error, c) => {
    if (error instanceof UnauthorizedError) {
      // Detalhe fica no log; o cliente recebe só "não autorizado".
      console.warn(JSON.stringify({ event: "unauthorized", detail: error.message }));
      return c.json({ error: "Não autorizado." }, 401);
    }

    if (error instanceof AIError) {
      console.error(
        JSON.stringify({ event: "ai_error", kind: error.kind, detail: error.message }),
      );
      // publicMessage nunca cita fornecedor nem billing.
      return c.json({ error: error.publicMessage }, error.httpStatus as 429 | 502 | 503 | 504 | 415);
    }

    console.error(JSON.stringify({ event: "unhandled_error", detail: String(error) }));
    return c.json({ error: "Erro interno." }, 500);
  });

  return app;
}
