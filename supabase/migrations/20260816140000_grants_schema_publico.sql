-- Torna o schema autossuficiente: concede explicitamente os privilégios de
-- tabela que a plataforma hospedada vinha fornecendo por fora das migrations.
--
-- Descoberto ao subir o stack local pela primeira vez (Fase 5): com as 29
-- migrations aplicadas, `has_table_privilege('authenticated', 'public.profiles',
-- 'SELECT')` era FALSE em todas as 27 tabelas, e o PostgREST devolvia
-- 42501 "permission denied for table" mesmo com um JWT válido. Nenhuma
-- migration continha GRANT de tabela nem ALTER DEFAULT PRIVILEGES — o projeto
-- dependia do bootstrap da plataforma para isso.
--
-- Sem este arquivo, qualquer ambiente novo (self-host, CI, máquina de outro
-- dev) sobe com o banco correto e o app inteiro quebrando em 403.
--
-- SEGURANÇA: conceder a `anon` e `authenticated` só é aceitável porque TODAS
-- as tabelas têm RLS habilitado — verificado no mesmo stack: 0 tabelas sem
-- RLS. Quem restringe as linhas é a policy (`auth.uid() = user_id`), não o
-- GRANT. Se algum dia uma tabela for criada sem RLS, ela ficará legível por
-- qualquer um: manter RLS é pré-requisito deste arquivo.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Vale também para o que for criado depois, para não repetir o problema.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
