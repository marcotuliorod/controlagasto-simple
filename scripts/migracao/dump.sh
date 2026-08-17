#!/usr/bin/env bash
#
# Exporta um projeto Supabase para arquivos, como primeiro passo da migração
# para infraestrutura própria.
#
# Uso:
#   scripts/migracao/dump.sh "postgresql://postgres:SENHA@HOST:5432/postgres" ./backup
#
# A URL precisa estar percent-encoded se a senha tiver caracteres especiais.
# Pegue-a em Project Settings > Database > Connection string, no modo direto:
# o pooler não suporta tudo que o pg_dump precisa.
set -euo pipefail

DB_URL="${1:?informe a connection string de origem}"
OUT_DIR="${2:-./backup-supabase}"

mkdir -p "$OUT_DIR"
echo "==> Destino: $OUT_DIR"

# Roles primeiro: o restore precisa que existam antes de conceder privilégios.
echo "==> 1/3 roles"
npx supabase db dump --db-url "$DB_URL" --role-only -f "$OUT_DIR/01-roles.sql"

# Schema de public, como referência e plano B. O caminho normal é o destino
# receber o schema via `supabase db push`, para ser exatamente o que o
# repositório descreve.
echo "==> 2/3 schema (referência)"
npx supabase db dump --db-url "$DB_URL" -f "$OUT_DIR/02-schema.sql"

# UM único dump de dados, sem --schema.
#
# Não separe por schema: `--data-only` sem `--schema` já traz auth, public,
# storage e supabase_functions. Um segundo dump com `--schema auth,storage`
# duplicaria auth.users e o restore aborta com "duplicate key users_pkey".
# Além disso, um dump só deixa o pg_dump ordenar por dependência sozinho —
# auth.users antes de public.profiles, que tem FK para ele.
#
# As exclusões abaixo são de dois tipos:
#
#  - Internas do GoTrue e do Storage, gerenciadas pelos serviços do destino. O
#    papel `postgres` nem tem escrita nelas; incluí-las aborta o restore com
#    "permission denied for table buckets_vectors".
#  - Estado efêmero de sessão (sessions, refresh_tokens, desafios, audit log do
#    GoTrue). O JWT secret do destino é outro, então toda sessão cai de
#    qualquer forma — migrar isso só adiciona risco.
#
# O que importa preservar: auth.users com encrypted_password (sem ele todo
# mundo precisa redefinir a senha) e auth.identities.
echo "==> 3/3 dados"
npx supabase db dump --db-url "$DB_URL" --data-only --use-copy \
  -x auth.schema_migrations \
  -x auth.audit_log_entries \
  -x auth.sessions \
  -x auth.refresh_tokens \
  -x auth.flow_state \
  -x auth.one_time_tokens \
  -x auth.mfa_challenges \
  -x auth.mfa_amr_claims \
  -x auth.saml_relay_states \
  -x auth.oauth_authorizations \
  -x auth.oauth_client_states \
  -x auth.webauthn_challenges \
  -x auth.instances \
  -x storage.migrations \
  -x storage.buckets_vectors \
  -x storage.vector_indexes \
  -x storage.buckets_analytics \
  -x storage.iceberg_namespaces \
  -x storage.iceberg_tables \
  -f "$OUT_DIR/03-dados.sql"

echo
echo "==> Concluído:"
ls -lh "$OUT_DIR" | awk 'NR>1 {printf "    %-24s %s\n", $NF, $5}'
echo
echo "ATENÇÃO: estes arquivos contêm dados pessoais e hashes de senha."
echo "Guarde cifrado e apague depois da migração."
