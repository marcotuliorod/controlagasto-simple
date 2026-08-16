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
- **Latência ainda é o ponto fraco:** ~19s numa resposta de chat, mesmo com o
  raciocínio desligado — ou seja, não era o raciocínio que causava a lentidão.
  Para OCR de cupom (usuário esperando após fotografar) isso é ruim. Precisa
  pesar na comparação de provedores; modelos `-lite` ou OCR dedicado tendem a
  ser melhores no caminho de extração.
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
