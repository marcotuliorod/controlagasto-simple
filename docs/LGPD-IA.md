# LGPD — dados pessoais na camada de IA

Mapeia **quais dados saem do servidor** em cada funcionalidade que usa IA, o que
já foi minimizado e o que continua em aberto.

Atualizado em 16/08/2026, após a saída do gateway da Lovable.

## Por que este documento existe

Trocar de fornecedor de IA não é só trocar um endpoint. O app é de finanças
pessoais: cupom fiscal, extrato bancário e histórico de gastos são dados
sensíveis. Este documento existe para que a pergunta "o que exatamente sai
daqui?" tenha uma resposta escrita, e não dependa de ler quatro edge functions.

## Fluxo de dados

```
App (PWA)
  → Edge Function (Supabase)      ← banco, storage, persistência
      → AI Service (services/ai)  ← redação de PII, prompts, escolha do adapter
          → Provedor de IA        ← processamento fora da nossa infra
```

O provedor é o único ponto fora da infraestrutura própria. Tudo que chega nele
passa antes pelo `AI Service`, que é onde a minimização acontece.

## O que sai por funcionalidade

| Funcionalidade | Dados enviados ao provedor | Sensibilidade |
|---|---|---|
| **Insights** (`/v1/insights`) | Só agregados: mês, totais, variação %, meta, contagem de transações, nomes de categoria e valores | **Baixa** — sem nome, sem comerciante, sem transação individual |
| **Cupom fiscal** (`/v1/receipt`) | A imagem inteira do cupom | **Média-alta** — pode conter CPF na nota, endereço da loja, itens comprados |
| **Chat** (`/v1/chat`) | Total gasto, meta, top categorias, sub-scores de saúde, 5 despesas recentes com comerciante e valor, histórico da conversa | **Média** |
| **Extrato — caminho determinístico** | **Nada.** O PDF é lido localmente | **Nenhuma** |
| **Extrato — fallback de texto** | Texto do extrato **com PII redigida** | **Média** |
| **Extrato — fallback de documento** | O PDF inteiro (só quando é escaneado) | **Alta** — titular, agência, conta, CPF, saldo, limite |

## O que já foi minimizado

**O nome real do usuário deixou de ser enviado.** O `chat-assistant` antigo
interpolava `profile.name` direto no system prompt. Hoje o prompt não inclui o
nome, e `pseudonymizeName` ainda limpa a pergunta caso o próprio usuário o
escreva. Verificado: o modelo responde "Olá!" em vez de "Olá, Maria".

**O extrato deixou de ir inteiro por padrão.** Antes, toda importação de PDF
mandava o arquivo completo ao modelo. Hoje o texto é extraído localmente
(~70ms) e, quando o layout é reconhecido, **nenhum dado sai do servidor**. Só
se a regra falhar o texto é enviado, e redigido antes.

**Redação de PII** (`services/ai/src/shared/redaction.ts`): remove CPF,
agência/conta, número de cartão, e-mail e telefone, substituindo por marcadores
estáveis (`[CPF]`, `[CONTA]`). O que foi removido é contabilizado e vai para o
log de auditoria.

**CNPJ não é redigido, de propósito.** Identifica o estabelecimento (pessoa
jurídica), não o titular, e é justamente um dos campos que a extração de cupom
precisa devolver. Redigi-lo quebraria a funcionalidade sem ganho de privacidade.

## Em aberto

- **Cupom fiscal ainda vai como imagem inteira.** Não há como extrair só o
  relevante sem antes ler a imagem — seria preciso OCR local (ex: Tesseract)
  para depois redigir. Não implementado.
- **PDF escaneado ainda vai inteiro.** Sem camada de texto, visão é o único
  caminho. Mitigação possível: avisar o usuário antes de enviar.
- **Retenção e treinamento no provedor não estão contratualmente definidos.**
  Depende do fornecedor e do plano escolhido — deve ser verificado no DPA antes
  de produção. A arquitetura é provider-agnostic justamente para que esse
  critério possa pesar na escolha.
- **Não há registro por titular do que foi enviado à IA.** Os logs registram o
  evento e o que foi redigido, mas não permitem responder "quais dados meus já
  foram processados por IA?" — relevante para direito de acesso.
- **Localização do processamento** não está fixada por configuração.

## Regras para quem for mexer

1. **Não envie o que não for necessário.** `generate-insights` é a referência:
   só agregados, e funciona bem.
2. **Não envie identificadores diretos** (nome, CPF, e-mail, conta) a menos que
   a funcionalidade seja impossível sem eles — e então documente aqui.
3. **Prefira determinístico.** Se dá para resolver com regra, resolva: é mais
   barato, mais rápido e não expõe dado nenhum.
4. **Redija antes de enviar texto livre.** Use `redact()`.
5. **Atualize a tabela acima** ao adicionar funcionalidade que use IA.

## Referências

- `services/ai/README.md` — arquitetura da camada de IA
- `services/ai/src/shared/redaction.ts` — implementação e testes da redação
- `supabase/functions/_shared/statementParser.ts` — caminho determinístico
- `docs/SECURITY.md` — RLS, storage e autenticação
