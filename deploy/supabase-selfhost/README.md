# Runbook: self-host completo do Supabase na VPS (Fase C)

**Status: esqueleto, não executado.** Diferente de `deploy/ai-service/`, aqui
não existe ainda um `docker-compose.yml` de produção pronto — nenhum lugar
do repositório tinha um antes deste plano, e construí-lo do zero exige testar
contra Docker rodando de verdade (ambiente local não tinha o daemon Docker
ativo no momento em que este runbook foi escrito). Este arquivo documenta o
caminho e os pré-requisitos; a Fase C só avança de fato com acesso real à
VPS e a um Docker funcionando.

## Por que isso é maior risco que mover o `services/ai`

Envolve dado real de usuário (banco de produção) e uma janela de
indisponibilidade combinada. **Não execute o corte (etapa 4 abaixo) sem
confirmação explícita no momento** — mesmo com esta fase aprovada no plano
geral, o corte em si é uma ação destrutiva/difícil de reverter que pede um
"vamos agora" separado.

## O que já existe e pode ser reaproveitado
- `scripts/migracao/dump.sh` — exporta roles/schema/dados da origem via
  `pg_dump` contra a connection string **direta** (não o pooler).
- `scripts/migracao/restore.sh` — restaura os dados no destino (exige que o
  destino já tenha o schema aplicado via `supabase db push`; valida
  `pg_tables` >= 20 antes de prosseguir).
- `scripts/migracao/verificar.sh` — compara origem x destino: contagem de
  linhas por tabela, preservação de hash de senha, status de RLS, objetos de
  storage. É o gate objetivo de "migração completa".
- `docs/MIGRACAO-SUPABASE.md` — runbook de dados já ensaiado contra stack
  local (dump → restore → verificação, incluindo login com senha original).

## O que falta construir (esta fase)

1. **`docker-compose.yml` de produção**, a partir do compose oficial do
   repositório `supabase/supabase` (diretório `docker/`) — traz Postgres,
   GoTrue, PostgREST, Storage, Realtime, Kong, Studio. Adaptar para:
   - Extensões exigidas: `pg_cron`, `pg_net`, `supabase_vault`.
   - `major_version` do Postgres batendo com `supabase/config.toml` do repo
     (conferir o valor atual antes de escolher a imagem).
   - Bucket privado `receipts` recriado no Storage (ainda purgado por
     `delete-account`, mesmo sem novo OCR escrevendo nele).
   - Roteamento no Kong para as edge functions e os secrets
     `CRON_SECRET`/`AI_SERVICE_URL` das cron functions
     (`notify-goal-threshold`, `process-recurring-expenses`,
     `process-scheduled-exports`).
   - TLS: mesmo padrão de `deploy/ai-service/` — Caddy/reverse proxy na
     frente do Kong, com certificado automático.

2. **Aplicar schema no destino via migrations** (não via dump de schema):
   ```bash
   npx supabase db push --db-url "postgresql://postgres:SENHA@DESTINO:5432/postgres"
   ```
   Isso já inclui `20260816140000_grants_schema_publico.sql` — sem ele, o
   banco sobe correto e o app quebra com 403 em toda query (dependência
   oculta de plataforma, encontrada na Fase 5 do desacoplamento do Lovable).

3. **Ensaiar a migração de dados num destino de teste** com
   `dump.sh` → `restore.sh` → `verificar.sh` antes de tocar produção.

4. **Janela de manutenção e corte real** (gate de confirmação explícita):
   - Pausar cron jobs na origem: `select cron.unschedule('process-recurring-expenses-daily');` e o de `process-scheduled-exports-hourly`.
   - `dump.sh` → `restore.sh` → `verificar.sh` contra a VPS de verdade.
   - Trocar `VITE_SUPABASE_URL` (Vercel), `SUPABASE_URL`/`AI_SERVICE_URL`
     (edge functions e `services/ai`) para os endereços da VPS.
   - Reagendar os cron jobs no destino.
   - Verificação pós-corte: login, RLS isolando dois usuários de teste,
     import de extrato, relatório por ciclo de fatura.

5. **Rollback**: manter o projeto Supabase gerenciado intacto (não
   desprovisionar) até o self-host rodar estável por um período.

## Pré-requisitos que faltam para avançar
- Acesso real à VPS (ou disposição de rodar os comandos você mesmo a partir
  de um runbook, como em `deploy/ai-service/README.md`).
- Connection string **direta** (não pooler) do projeto Supabase de origem.
- Confirmação de que o Postgres do destino vai bater com
  `major_version` de `supabase/config.toml`.
- Janela de manutenção combinada com os usuários (há indisponibilidade).
