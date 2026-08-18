# AI Service

Camada de IA do "Entenda seus Gastos", **independente de fornecedor e de plataforma**.

Substitui o `ai.gateway.lovable.dev`, que era chamado direto de dentro de 4 edge
functions. O objetivo não é só trocar de endpoint: é fazer com que trocar de
fornecedor no futuro não exija tocar em regra de negócio.

## Princípio

```
domain/          →  não conhece fornecedor nenhum, só a interface LLMProvider
providers/       →  adapters concretos; toda diferença entre fornecedores mora aqui
prompts/         →  prompts versionados, fora do código de transporte
shared/          →  timeout, retry, taxonomia de erro, redação de PII
http/            →  rotas Hono + verificação do JWT do GoTrue
config.ts        →  ÚNICO lugar que escolhe o adapter (via AI_PROVIDER)
```

Nenhum arquivo em `domain/` importa de `providers/` além de `providers/types.ts`.
É isso que mantém a troca de fornecedor barata.

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `SUPABASE_URL` | uma das duas | — | URL do projeto. Deriva o JWKS, para validar token **assimétrico** (ES256/RS256) |
| `SUPABASE_JWT_SECRET` | uma das duas | — | Segredo **HS256** do GoTrue. É o que o stack local emite |
| `GEMINI_API_KEY` | sim (com `AI_PROVIDER=gemini`) | — | Chave do provedor. **Nunca** vai ao browser |
| `AI_PROVIDER` | não | `gemini` | Adapter a usar |
| `AI_MODEL` | não | `gemini-3.5-flash` | Sobrescreve o modelo |
| `PORT` | não | `8787` | Porta HTTP |
| `ALLOWED_ORIGINS` | não | `http://localhost:8080` | Origens de CORS, separadas por vírgula |

O serviço falha no boot se faltar variável obrigatória — e não na primeira
requisição do usuário.

### Duas famílias de assinatura, não uma

**Contra o Supabase hospedado, `SUPABASE_JWT_SECRET` sozinho não autentica
ninguém.** O GoTrue de projeto gerenciado assina com chave assimétrica
(`alg: ES256`, com `kid`), resolvida contra
`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`. O `supabase start` local ainda
emite HS256.

Configurar as duas é o normal, e é o que atravessa a migração sem janela de
indisponibilidade: cada token é verificado pelo `alg` do próprio cabeçalho.

Como o JWKS é buscado por `kid` e recacheado quando aparece um desconhecido,
**rotacionar chave no Supabase não exige redeploy deste serviço** — ao
contrário do segredo HS256, que é cópia estática.

## Rodando

```bash
npm install
npm run dev        # tsx watch
npm test           # vitest (sem rede: usa o provider fake)
npm run typecheck  # tsc --noEmit (strict)
```

Os testes de domínio e de HTTP rodam **sem chave de API e sem rede**, usando
`providers/fake.ts` — impossível na arquitetura anterior, em que o `fetch`
estava embutido em cada função.

## Subindo o serviço

Contra projeto **hospedado**, o que autentica é o `SUPABASE_URL` — o JWKS dele
resolve a chave assimétrica pelo `kid` do token. Contra o stack **local**, é o
`SUPABASE_JWT_SECRET`, que precisa ser o mesmo que o GoTrue usa para assinar
(`npx supabase status` mostra o valor).

### Local

```bash
# 1. serviço de IA
cd services/ai
SUPABASE_JWT_SECRET="<jwt secret do supabase status>" \
GEMINI_API_KEY="<sua chave>" \
npm run dev

# 2. edge functions apontando para ele.
#    host.docker.internal porque as functions rodam em container e
#    "localhost" ali dentro seria o próprio container, não a sua máquina.
echo 'AI_SERVICE_URL=http://host.docker.internal:8787' > supabase/functions/.env
npx supabase functions serve --env-file supabase/functions/.env
```

### Container

```bash
docker build -t entenda-ai services/ai
docker run -p 8787:8787 \
  -e SUPABASE_URL="https://<ref>.supabase.co" \
  -e GEMINI_API_KEY="..." \
  -e ALLOWED_ORIGINS="https://seu-dominio" \
  entenda-ai
```

A imagem tem ~246MB e traz `HEALTHCHECK` em `/health`. Node 24 executa o
TypeScript nativamente, então não há etapa de build — o que roda é o mesmo
código que os testes exercitam.

### Produção

As Edge Functions do Supabase hospedado rodam na infraestrutura deles, então
**o serviço precisa estar acessível pela internet pública, com TLS**. Não
funciona apontar para `localhost` nem para rede privada.

```bash
npx supabase secrets set AI_SERVICE_URL=https://ai.seu-dominio.com
```

Sem esse secret, as 4 funcionalidades de IA respondem 503 com mensagem
explícita; o resto do app continua funcionando normalmente.

#### Vercel

É onde este serviço está publicado hoje, em **projeto próprio**, separado do
frontend. A separação é deliberada: aqui moram `GEMINI_API_KEY` e
`SUPABASE_JWT_SECRET`, que não devem dividir ambiente com um build que produz
bundle de browser.

Roda como **imagem de container**, não como função. `Dockerfile.vercel` é um
symlink para o `Dockerfile` — um arquivo só, porque duplicar lógica de build
entre plataformas é como as duas divergem em silêncio.

- `rootDirectory` = `services/ai` (o repositório é o mesmo do app)
- `"framework": null` no `vercel.json`, para desligar a detecção automática
- **Duas chaves, não uma.** `services` faz a imagem ser construída e publicada;
  o `rewrites` com `destination: { "service": "ai" }` é o que liga a URL
  pública a ela. Só com `services`, a imagem sobe no registry e mesmo assim
  toda rota responde 404 — o build avisa `no "functions" or "static"
  directory` e é fácil ler isso como falha de build, quando é falta de rota.
- O `HEALTHCHECK` do Dockerfile é ignorado aqui (`not supported for OCI image
  format`). Continua valendo para container/VPS.

**Por que container e não função**, já que a Vercel tem preset para Hono: o
código usa import com extensão explícita (`./config.ts`), que é o que o Node 24
exige para executar TypeScript nativamente. A Vercel transpila arquivo a
arquivo sem reescrever o especificador, então `index.js` sai procurando um
`config.ts` que não existe mais e a função morre com `ERR_MODULE_NOT_FOUND`.

As duas exigências são incompatíveis — medido, não deduzido:

| especificador | Node 24 nativo | função na Vercel |
|---|---|---|
| `./config.ts` | funciona | quebra |
| `./config.js` | não resolve | funcionaria |

Sair dessa exigiria ou uma etapa de bundle, ou trocar a convenção de import de
todo o pacote. O container dispensa as duas: dentro dele o Node 24 roda o
TypeScript como sempre rodou, e o artefato publicado é exatamente o que os
testes exercitam. **Cuidado ao "simplificar" isto para uma função** — o custo
não é de configuração, é de arquitetura.

`ALLOWED_ORIGINS` **não** precisa ser configurada aqui: quem chama este serviço
é a Edge Function do Supabase (Deno, servidor-a-servidor), não o browser — não
há header `Origin` em jogo. O CORS só importaria se o frontend chamasse direto.

Uma armadilha específica da plataforma: se a **Deployment Protection** estiver
ligada, a Edge Function recebe uma página HTML de SSO em vez de JSON, e o
sintoma vira um erro genérico difícil de rastrear. Precisa estar desligada.

## Rotas

| Rota | Auth | Descrição |
|---|---|---|
| `GET /health` | não | Health check para orquestrador |
| `POST /v1/receipt` | Bearer JWT | Extrai dados de cupom fiscal (imagem ou PDF) |
| `POST /v1/statement` | Bearer JWT | Extrai transações de extrato/fatura |
| `POST /v1/insights` | Bearer JWT | Gera insights sobre os gastos do mês |
| `POST /v1/chat` | Bearer JWT | Assistente financeiro conversacional |

Todas validam o JWT **antes** de qualquer chamada paga, com teste garantindo
que o provedor não é acionado sem token.

- `/v1/receipt` e `/v1/statement` recebem `{ mimeType, data }`, com `data` em
  base64 puro ou data URL.
- `/v1/statement` aceita também `{ text }` — texto já extraído localmente, que
  passa por redação de PII antes de sair. É o caminho que a Fase 4 tornará
  padrão.

## Decisões

- **Adapter inicial Gemini.** A justificativa original era usar exatamente
  `gemini-2.5-flash`, o modelo que rodava por baixo do gateway antigo, para
  provar paridade sem misturar troca de plataforma com mudança de qualidade.
  **Isso não é mais possível:** verificado contra a API real em 16/08/2026, esse
  modelo responde `404 "no longer available to new users"` para chaves novas —
  o acesso do gateway Lovable é grandfathered. O padrão passou a ser
  `gemini-3.5-flash`. Como o argumento de paridade caiu, a escolha do provedor
  fica em aberto pelo mérito (custo, latência, LGPD) — e é justamente para isso
  que a arquitetura é provider-agnostic.
- **Raciocínio compete com o orçamento da resposta.** Em modelos com "thinking"
  os tokens de raciocínio saem do mesmo `maxOutputTokens` e não aparecem na
  resposta. Medido: uma pergunta curta gastou **631 tokens pensando para 53 de
  resposta**; com o `maxOutputTokens: 800` herdado do código antigo, o chat
  truncava antes de responder. Por isso o contrato expõe `reasoning`, e o chat
  usa `"disabled"`. Sem esse campo, `maxOutputTokens` seria uma abstração furada.
- **Latência é aceitável.** Medido em 17/08/2026, contra o projeto Supabase real
  e com chave própria do Gemini:

  | caminho | latência |
  |---|---|
  | chat | 2,9s e 3,1s |
  | OCR de cupom (PDF) | 4s |
  | insights | 7,6s |

  **Correção de uma medição anterior.** Este documento afirmava "~19s numa
  resposta de chat" e concluía que a latência era o ponto fraco, recomendando
  testar variantes `-lite`. Aquela medição foi feita numa única chamada, muito
  provavelmente em cold start, e não se sustentou: a mesma operação leva ~3s.
  A recomendação de trocar de modelo por causa de latência **não procede** —
  4s para OCR de cupom é razoável para o usuário que acabou de fotografar.

  Ainda assim, são poucas amostras. Vale remedir com uso real antes de tratar
  qualquer destes números como garantia.
- **API nativa do Gemini, não o shim OpenAI-compatible.** Resolve os dois pontos
  frágeis do código anterior: PDF entra como `inline_data` com mime type próprio
  (antes ia disfarçado de `image_url`), e o JSON sai via `responseSchema`,
  dispensando o parsing defensivo em três níveis que existia em
  `process-import-file`.
- **`strict: true`** neste pacote, diferente do app principal — código novo e
  isolado não precisa herdar aquele débito.
- **Mensagem de erro pública é neutra por construção** (`AIError.publicMessage`).
  Antes, `process-receipt` exibia "Créditos Lovable AI esgotados. Adicione
  créditos em Settings -> Workspace -> Usage." para o usuário final.

## Estado

As 4 capacidades estão implementadas e expostas por HTTP:
`DocumentExtraction` (cupom), `TransactionClassification` (extrato),
`FinancialInsights` e `FinancialAssistant` (chat).

Validado contra a API real, não só contra o provider fake. No extrato, o
conhecimento de domínio do prompt original sobreviveu à migração: `APLICACAO
CDB DI` sai como `investment`, e `SALDO ANTERIOR`/`SALDO FINAL`/`REPASSE FPM`
são corretamente ignorados.

**Pendente:** migrar os 4 call sites do frontend (Fase 3) — o app continua
chamando as edge functions antigas. Enquanto isso não acontecer, este serviço
não está em uso e as chamadas ao gateway Lovable seguem ativas.
