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
import { Hono } from "hono";
import { loadConfig } from "./config.ts";
import { createApp } from "./http/app.ts";

/**
 * A anotação de tipo declara o contrato deste módulo, e o import de `hono`
 * precisa ser de valor (não `import type`): a detecção de framework da Vercel
 * recusa o entrypoint se ele não importar o pacote, com
 * "No entrypoint found which imports hono". Só o `createApp` não basta,
 * porque quem instancia o Hono de fato é `http/app.ts`.
 */
const app: Hono = createApp(loadConfig());

export default app;
