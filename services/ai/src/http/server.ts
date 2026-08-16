/**
 * Entrypoint. Só liga a config às rotas e abre a porta — deployável em
 * qualquer runtime Node (container, VPS, Fly, Cloud Run), sem depender de
 * nenhuma plataforma específica.
 */
import { serve } from "@hono/node-server";
import { loadConfig } from "../config.ts";
import { createApp } from "./app.ts";

// loadConfig lança se faltar variável obrigatória: falha no boot, não na
// primeira requisição do usuário.
const config = loadConfig();

serve({ fetch: createApp(config).fetch, port: config.port }, (info) => {
  console.info(
    JSON.stringify({
      event: "server_started",
      port: info.port,
      provider: config.provider.name,
    }),
  );
});
