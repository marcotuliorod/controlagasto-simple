/**
 * Entrypoint para plataformas que hospedam o app como função (Vercel).
 *
 * Convive com `http/server.ts`, que abre socket e é o entrypoint de
 * container/VPS/Cloud Run. Os dois são casca fina sobre `createApp` — a
 * diferença entre "servidor que escuta porta" e "handler que a plataforma
 * invoca" fica confinada a estes dois arquivos, e nenhuma rota ou regra de
 * domínio sabe qual dos dois está em uso.
 *
 * `loadConfig()` roda na carga do módulo de propósito: faltando variável
 * obrigatória, a função nem chega a servir requisição.
 */
import { loadConfig } from "./config.ts";
import { createApp } from "./http/app.ts";

export default createApp(loadConfig());
