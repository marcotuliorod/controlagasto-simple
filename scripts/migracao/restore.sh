#!/usr/bin/env bash
#
# Restaura os DADOS de um dump gerado por dump.sh numa instância de destino.
#
# Uso:
#   scripts/migracao/restore.sh ./backup "postgresql://postgres:SENHA@HOST:5432/postgres"
#
# PRÉ-REQUISITO: o destino já deve ter o schema aplicado via
# `supabase db push`. O schema vem das migrations, não do dump — assim o
# destino é exatamente o que o repositório descreve, e não depende da
# fidelidade do pg_dump para DDL.
set -euo pipefail

IN_DIR="${1:?informe o diretório do dump}"
DB_URL="${2:?informe a connection string de destino}"
FORCE="${3:-}"

[ -f "$IN_DIR/03-dados.sql" ] || { echo "faltando: $IN_DIR/03-dados.sql" >&2; exit 1; }

echo "==> Conferindo o destino"
tabelas=$(psql "$DB_URL" -tAqc "select count(*) from pg_tables where schemaname='public'")
if [ "${tabelas:-0}" -lt 20 ]; then
  echo "ERRO: destino tem apenas ${tabelas:-0} tabelas em public." >&2
  echo "Aplique o schema antes: npx supabase db push --db-url <destino>" >&2
  exit 1
fi

# Destino com usuários é quase sempre engano (apontou para o lugar errado, ou
# está repetindo um restore). Sobrescrever calado seria pior que abortar.
usuarios=$(psql "$DB_URL" -tAqc "select count(*) from auth.users")
if [ "${usuarios:-0}" -gt 0 ] && [ "$FORCE" != "--force" ]; then
  echo "ERRO: o destino já tem $usuarios usuário(s)." >&2
  echo "Esperado um destino vazio. Se for intencional, repita com --force." >&2
  exit 1
fi
echo "    ok ($tabelas tabelas, $usuarios usuários)"

# As migrations semeiam dados de referência, então essas tabelas já vêm
# preenchidas no destino e colidiriam com as linhas do dump (foi o que
# aconteceu com storage.buckets: "duplicate key ... (id)=(receipts)").
#
# Limpar e repovoar a partir da origem, em vez de excluir do dump: `categories`
# tem user_id, e as semeadas são globais (user_id IS NULL) enquanto as demais
# pertencem ao usuário. Excluir a tabela inteira perderia as que ele criou.
LIMPAR_ANTES="
DELETE FROM public.achievements;
DELETE FROM public.categories;
DELETE FROM public.educational_content;
DELETE FROM public.quiz_questions;
DELETE FROM public.unlock_requirements;
DELETE FROM storage.buckets;
"

# session_replication_role = replica desliga triggers e checagem de FK durante
# a carga. Sem isso, inserir em auth.users dispara handle_new_user, que cria
# profile e contas padrão — e aí o restore de public.profiles colide com as
# linhas que o próprio trigger acabou de criar, deixando o usuário com contas
# duplicadas.
#
# Tudo numa transação só: ou entra inteiro, ou não entra nada.
echo "==> Restaurando dados"
{
  echo "BEGIN;"
  echo "SET session_replication_role = replica;"
  echo "$LIMPAR_ANTES"
  cat "$IN_DIR/03-dados.sql"
  echo "SET session_replication_role = DEFAULT;"
  echo "COMMIT;"
} | psql "$DB_URL" -v ON_ERROR_STOP=1 -q

echo
echo "==> Restore concluído."
echo "    Próximo: scripts/migracao/verificar.sh <origem> <destino>"
echo "    Os arquivos do storage ainda precisam ser copiados à parte —"
echo "    o dump traz só o metadado de storage.objects."
