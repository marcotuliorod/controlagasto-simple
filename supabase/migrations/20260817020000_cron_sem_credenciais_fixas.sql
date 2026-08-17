-- Recria os 2 jobs de cron sem URL nem credencial fixas no SQL.
--
-- A migration original (20251024141943) tinha três problemas:
--
--  1. A URL apontava para o projeto Supabase provisionado pela plataforma,
--     literal no SQL. Migrar de projeto deixaria o cron chamando o antigo.
--  2. A chave anon estava commitada no repositório.
--  3. **Os jobs nunca funcionaram.** Eles mandam `Authorization: Bearer
--     <anon>`, mas process-recurring-expenses e process-scheduled-exports
--     exigem o header `X-Cron-Secret` e respondem 401 sem ele
--     (`if (!authHeader || authHeader !== cronSecret)`). Como `net.http_post`
--     dispara e ninguém confere a resposta, a falha era silenciosa: despesas
--     recorrentes não eram geradas e exportações agendadas não rodavam.
--
-- Configuração passa a vir do Vault (`supabase_vault`), que é o mecanismo do
-- Supabase para exatamente este caso: segredo usado por pg_cron/pg_net.
-- Guardar em parâmetro de banco (`ALTER DATABASE ... SET app.*`) não é
-- alternativa: exige superusuário, e o papel `postgres` do Supabase não é
-- superusuário nem no self-host nem no serviço gerenciado.
--
-- Configure uma vez por ambiente, com os mesmos valores dos secrets das edge
-- functions:
--
--   select vault.create_secret('https://<host>/functions/v1', 'functions_url');
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
--
-- Para atualizar depois, use vault.update_secret().

-- Remove os agendamentos antigos. cron.unschedule lança erro se o job não
-- existir, então checa antes: em banco novo (self-host, CI) eles não existem.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-recurring-expenses-daily') THEN
    PERFORM cron.unschedule('process-recurring-expenses-daily');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-exports-hourly') THEN
    PERFORM cron.unschedule('process-scheduled-exports-hourly');
  END IF;
END;
$$;

-- Um único ponto que monta a chamada, para os dois jobs não divergirem.
CREATE OR REPLACE FUNCTION public.invoke_edge_function(function_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text;
  secret   text;
BEGIN
  SELECT decrypted_secret INTO base_url
    FROM vault.decrypted_secrets WHERE name = 'functions_url';
  SELECT decrypted_secret INTO secret
    FROM vault.decrypted_secrets WHERE name = 'cron_secret';

  -- Falha alto e claro. O modo anterior de falhar era um 401 que ninguém via.
  IF coalesce(base_url, '') = '' THEN
    RAISE EXCEPTION 'segredo "functions_url" ausente no Vault; veja a migration 20260817020000';
  END IF;
  IF coalesce(secret, '') = '' THEN
    RAISE EXCEPTION 'segredo "cron_secret" ausente no Vault; veja a migration 20260817020000';
  END IF;

  RETURN net.http_post(
    url := rtrim(base_url, '/') || '/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- É este header que as functions verificam, e é o que faltava.
      'X-Cron-Secret', secret
    ),
    body := jsonb_build_object('time', now())
  );
END;
$$;

COMMENT ON FUNCTION public.invoke_edge_function IS
  'Chama uma edge function a partir do pg_cron, lendo URL e segredo do Vault em vez de valores fixos no SQL.';

-- SECURITY DEFINER dá acesso ao Vault; ninguém além do dono precisa executar.
REVOKE ALL ON FUNCTION public.invoke_edge_function(text) FROM PUBLIC, anon, authenticated;

-- Despesas recorrentes, diariamente às 00:01.
SELECT cron.schedule(
  'process-recurring-expenses-daily',
  '1 0 * * *',
  $$ SELECT public.invoke_edge_function('process-recurring-expenses'); $$
);

-- Exportações agendadas, de hora em hora.
SELECT cron.schedule(
  'process-scheduled-exports-hourly',
  '0 * * * *',
  $$ SELECT public.invoke_edge_function('process-scheduled-exports'); $$
);
