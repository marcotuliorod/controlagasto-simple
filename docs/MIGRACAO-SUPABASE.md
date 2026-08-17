# Migração do Supabase para infraestrutura própria

Runbook para tirar o banco, o auth e o storage da Lovable Cloud.

O desacoplamento de **código** já está feito. Isto trata da **infraestrutura**:
enquanto os dados viverem no projeto provisionado pela plataforma, o produto
ainda depende dela.

> **Ensaiado, não teórico.** Os scripts em `scripts/migracao/` foram executados
> num stack Supabase local completo: dump, restore e verificação, incluindo
> login de um usuário migrado com a senha original. Os problemas listados em
> "Armadilhas" foram encontrados nesse ensaio, não previstos no papel.

## Antes de começar

- [ ] Connection string **direta** da origem (Project Settings > Database).
      O pooler não serve: não suporta tudo que o `pg_dump` precisa.
- [ ] Destino de pé, com os schemas `auth` e `storage` já criados pelos
      próprios serviços (basta o stack subir).
- [ ] `psql` instalado localmente.
- [ ] Janela de manutenção combinada — há indisponibilidade e todos os
      usuários caem.

## Passo a passo

### 1. Congelar a origem

Pare o que escreve: desabilite os cron jobs e avise os usuários. Migrar com
escrita acontecendo gera divergência entre dump e realidade.

```sql
-- na origem
select cron.unschedule('process-recurring-expenses-daily');
select cron.unschedule('process-scheduled-exports-hourly');
```

### 2. Exportar

```bash
scripts/migracao/dump.sh "postgresql://postgres:SENHA@HOST:5432/postgres" ./backup
```

Gera `01-roles.sql`, `02-schema.sql` (referência) e `03-dados.sql`.

Os arquivos contêm dados pessoais e hashes de senha: guarde cifrado e apague
depois.

### 3. Preparar o destino

O schema vem das **migrations**, não do dump — assim o destino é exatamente o
que o repositório descreve:

```bash
npx supabase db push --db-url "postgresql://postgres:SENHA@DESTINO:5432/postgres"
```

Isso já inclui `20260816140000_grants_schema_publico.sql`, que concede os
privilégios de tabela que a plataforma hospedada fornecia por fora das
migrations. Sem ele, o app sobe com o banco correto e 403 em toda query.

### 4. Restaurar

```bash
scripts/migracao/restore.sh ./backup "postgresql://postgres:SENHA@DESTINO:5432/postgres"
```

O script aborta se o destino já tiver usuários — sobrescrever calado seria pior
que falhar.

### 5. Copiar os arquivos do storage

O dump traz só o **metadado** (`storage.objects`). Os arquivos do bucket
`receipts` precisam ser copiados à parte, via API de Storage ou S3, conforme o
destino. Sem isso, os recibos aparecem na lista e dão 404 ao abrir.

### 6. Verificar antes do cutover

```bash
scripts/migracao/verificar.sh "<url-origem>" "<url-destino>"
```

Compara contagens, soma de valores (pega truncamento numérico), hashes de senha
preservados, RLS ativo e os GRANTs. Sai com código 1 se houver divergência.

### 7. Reconfigurar os segredos

```sql
-- no destino
select vault.create_secret('https://<host>/functions/v1', 'functions_url');
select vault.create_secret('<CRON_SECRET>', 'cron_secret');
```

E os secrets das edge functions:

```bash
npx supabase secrets set CRON_SECRET=... AI_SERVICE_URL=...
npx supabase functions deploy
```

### 8. Cutover

1. `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` novos
2. Rebuild e redeploy do frontend
3. Confirmar: login, listar despesas, abrir um recibo, gerar um insight

### 9. Depois

- [ ] Manter a origem intacta e **somente leitura** por um período de guarda
- [ ] Rotacionar as credenciais antigas (o `.env` versionado e a chave anon
      commitada na migration dos cron jobs continuam no histórico do git)
- [ ] Apagar os arquivos de dump

## Armadilhas encontradas no ensaio

Cada uma abortou uma tentativa real. Os scripts já as tratam — a lista existe
para quando algo sair diferente e for preciso entender o porquê.

**Um dump de dados, não vários.** `supabase db dump --data-only` **sem**
`--schema` já traz auth, public, storage e supabase_functions. Fazer um segundo
dump com `--schema auth,storage` duplica `auth.users` e o restore aborta com
`duplicate key users_pkey`. Um dump só também deixa o `pg_dump` ordenar por
dependência sozinho.

**Triggers precisam ficar desligados.** Inserir em `auth.users` dispara
`handle_new_user`, que cria perfil e contas padrão. Com o trigger ativo, o
restore de `public.profiles` colide com o que o trigger acabou de criar, e o
usuário herda contas duplicadas. `session_replication_role = replica` resolve.

**Tabelas semeadas por migration colidem.** `achievements`, `categories`,
`educational_content`, `quiz_questions`, `unlock_requirements` e
`storage.buckets` já vêm preenchidas no destino. O restore limpa e repovoa a
partir da origem — e não exclui do dump, porque `categories` tem `user_id`: as
semeadas são globais, mas as demais pertencem ao usuário e seriam perdidas.

**Tabelas internas não são migráveis.** `storage.buckets_vectors`,
`storage.migrations` e `auth.schema_migrations` são dos próprios serviços; o
papel `postgres` nem tem escrita nelas, e incluí-las aborta com
`permission denied`.

**Sessão não sobrevive, e tudo bem.** O JWT secret do destino é outro, então
todo mundo é deslogado. Por isso `auth.sessions`, `refresh_tokens` e o audit log
do GoTrue ficam fora do dump: migrá-los só adiciona risco. **A senha continua
funcionando** — `encrypted_password` vai junto, e isso foi verificado no ensaio
com um login real.

**`ALTER DATABASE ... SET app.*` não funciona.** Exige superusuário, e o papel
`postgres` do Supabase não é — nem no self-host nem no gerenciado. Por isso os
segredos do cron ficam no Vault.

## Sobre o destino

`supabase start` é stack de **desenvolvimento** e não serve para produção. Para
self-host de verdade, use o compose oficial do repositório `supabase/supabase`
(diretório `docker/`), que traz Postgres, GoTrue, PostgREST, Storage, Realtime,
Kong e Functions, com volumes persistentes.

O que este projeto exige do destino, além do padrão:

| Requisito | Por quê |
|---|---|
| `pg_cron` | os 2 jobs agendados |
| `pg_net` | `net.http_post`, usado pelos jobs |
| `supabase_vault` | segredos do cron (ver migration 20260817020000) |
| Bucket `receipts` privado | recibos; criado por migration |
| `CRON_SECRET` | autentica as 3 functions de cron |
| `AI_SERVICE_URL` | endereço do serviço em `services/ai` |

> Não montei nem testei um compose de produção — seria entregar infraestrutura
> que nunca rodei. O que está ensaiado é a migração de dados, que é a parte
> irreversível.

## Rollback

Até o passo 8, é só não trocar as variáveis: a origem segue intacta.

Depois do cutover, voltar significa reapontar `VITE_SUPABASE_URL` e
`VITE_SUPABASE_PUBLISHABLE_KEY` para a origem e reimplantar. **Escrita feita no
destino depois do cutover não volta sozinha** — por isso o período de guarda
com a origem em somente leitura, e por isso vale fazer o cutover numa janela
de baixo uso.
