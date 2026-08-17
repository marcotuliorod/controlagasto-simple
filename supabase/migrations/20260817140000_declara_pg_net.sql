-- Declara pg_net, do qual os cron jobs dependem desde sempre sem nunca terem
-- dito.
--
-- A migration 20251024141943 fez `CREATE EXTENSION pg_cron` mas nunca a
-- correspondente para pg_net, embora chame `net.http_post`. Funcionava porque
-- a plataforma hospedada já vinha com a extensão habilitada.
--
-- Descoberto ao aplicar as migrations num projeto Supabase novo: tudo aplica
-- limpo, e então `invoke_edge_function` falha com
-- `schema "net" does not exist`. Mesma classe de problema dos GRANTs de tabela
-- (migration 20260816140000): o ambiente fornecia por fora o que as migrations
-- deveriam declarar.
--
-- `WITH SCHEMA extensions` acompanha o que a 20251024141943 fez para o pg_cron.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
