#!/usr/bin/env bash
#
# Compara origem e destino depois do restore. Roda ANTES do cutover.
#
# Uso:
#   scripts/migracao/verificar.sh "<url-origem>" "<url-destino>"
#
# Verifica o que realmente costuma quebrar numa migração de Supabase, e não só
# "o banco respondeu": contagem por tabela, hashes de senha preservados, RLS
# ainda ativo, e os objetos do storage.
set -euo pipefail

SRC="${1:?informe a connection string de origem}"
DST="${2:?informe a connection string de destino}"

q() { psql "$1" -tAqc "$2" 2>/dev/null || echo "ERRO"; }

falhas=0
comparar() {
  local rotulo="$1" sql="$2"
  local a b
  a=$(q "$SRC" "$sql"); b=$(q "$DST" "$sql")
  if [ "$a" = "$b" ]; then
    printf "  ok    %-38s %s\n" "$rotulo" "$a"
  else
    printf "  FALHA %-38s origem=%s destino=%s\n" "$rotulo" "$a" "$b"
    falhas=$((falhas + 1))
  fi
}

echo "== Contagens =="
comparar "usuários (auth.users)"      "select count(*) from auth.users"
comparar "perfis"                     "select count(*) from public.profiles"
comparar "despesas"                   "select count(*) from public.expenses"
comparar "contas"                     "select count(*) from public.accounts"
comparar "categorias"                 "select count(*) from public.categories"
comparar "metas mensais"              "select count(*) from public.monthly_goals"
comparar "objetos no storage"         "select count(*) from storage.objects"
comparar "tabelas em public"          "select count(*) from pg_tables where schemaname='public'"

echo
echo "== Integridade =="
# Senha preservada é o que evita obrigar todo mundo a redefinir.
comparar "usuários com senha"         "select count(*) from auth.users where encrypted_password is not null and encrypted_password <> ''"
# Soma de valores pega truncamento numérico que a contagem não pegaria.
comparar "soma das despesas"          "select coalesce(sum(amount),0)::text from public.expenses"

echo
echo "== Segurança no destino =="
sem_rls=$(q "$DST" "select count(*) from pg_tables t join pg_class c on c.relname=t.tablename where t.schemaname='public' and not c.relrowsecurity")
if [ "$sem_rls" = "0" ]; then
  printf "  ok    %-38s %s\n" "tabelas sem RLS" "0"
else
  printf "  FALHA %-38s %s tabela(s) expostas\n" "tabelas sem RLS" "$sem_rls"
  falhas=$((falhas + 1))
fi

pode_ler=$(q "$DST" "select has_table_privilege('authenticated','public.profiles','SELECT')")
if [ "$pode_ler" = "t" ]; then
  printf "  ok    %-38s %s\n" "authenticated tem SELECT" "sim"
else
  printf "  FALHA %-38s falta a migration de GRANTs\n" "authenticated tem SELECT"
  falhas=$((falhas + 1))
fi

echo
echo "== Cron (precisa do Vault configurado) =="
jobs=$(q "$DST" "select count(*) from cron.job")
segredos=$(q "$DST" "select count(*) from vault.decrypted_secrets where name in ('functions_url','cron_secret')")
printf "  jobs agendados: %s (esperado 2)\n" "$jobs"
printf "  segredos no Vault: %s (esperado 2)\n" "$segredos"
[ "$segredos" = "2" ] || echo "  aviso: sem os segredos os crons falham — veja a migration 20260817020000"

echo
if [ "$falhas" -eq 0 ]; then
  echo "RESULTADO: nenhuma divergência."
else
  echo "RESULTADO: $falhas divergência(s). NÃO faça o cutover."
  exit 1
fi
