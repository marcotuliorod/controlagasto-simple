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
| `SUPABASE_JWT_SECRET` | sim | — | Segredo HS256 do GoTrue, para validar o token do usuário |
| `GEMINI_API_KEY` | sim (com `AI_PROVIDER=gemini`) | — | Chave do provedor. **Nunca** vai ao browser |
| `AI_PROVIDER` | não | `gemini` | Adapter a usar |
| `AI_MODEL` | não | `gemini-3.5-flash` | Sobrescreve o modelo |
| `PORT` | não | `8787` | Porta HTTP |
| `ALLOWED_ORIGINS` | não | `http://localhost:8080` | Origens de CORS, separadas por vírgula |

O serviço falha no boot se faltar variável obrigatória — e não na primeira
requisição do usuário.

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

## Rotas

| Rota | Auth | Descrição |
|---|---|---|
| `GET /health` | não | Health check para orquestrador |
| `POST /v1/receipt` | Bearer JWT | Extrai dados de cupom fiscal (imagem ou PDF) |

`POST /v1/receipt` recebe `{ mimeType, data }`, onde `data` é base64 puro ou
data URL. A autenticação é validada **antes** de qualquer chamada paga.

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
- **Latência observada:** ~19s numa chamada trivial com `gemini-3.5-flash` (é um
  modelo com raciocínio; a resposta traz `thoughtSignature`). Isso é bem mais
  que o esperado para OCR de cupom e precisa entrar na comparação de provedores.
  Modelos `-lite` ou um serviço de OCR dedicado tendem a ser melhores para o
  caminho de extração.
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

Implementado: extração de cupom fiscal (`DocumentExtraction`), adapter Gemini,
resiliência, redação de PII, HTTP + auth.

Pendente: `TransactionClassification` (extrato), `FinancialInsights`,
`FinancialAssistant`, e a migração dos call sites do frontend (Fase 3).
