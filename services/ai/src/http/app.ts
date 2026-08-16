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

/** 10MB em base64 ≈ 7.5MB de arquivo — acima do limite de 5MB do app. */
const MAX_BASE64_LENGTH = 10 * 1024 * 1024;

const receiptSchema = z.object({
  mimeType: z.string().min(1),
  data: z.string().min(1).max(MAX_BASE64_LENGTH),
});

/** Aceita tanto base64 puro quanto data URL, que é o formato que o app envia hoje. */
function stripDataUrlPrefix(data: string): string {
  const match = /^data:[^;]+;base64,(.*)$/s.exec(data);
  return match?.[1] ?? data;
}

export function createApp(config: Config) {
  const app = new Hono();
  const documentExtraction = createDocumentExtraction(config.provider);

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
    const user = await authenticate(c.req.header("Authorization"), config.jwtSecret);

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
