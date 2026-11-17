#!/bin/sh
set -eu

# =============================================================================
# Anchor Docker Entrypoint
# =============================================================================
# Initializes environment, starts embedded Postgres (if enabled), runs
# database migrations, then runs supervisord for process management. On stop,
# shuts down supervisord first and Postgres last.
# =============================================================================

# -----------------------------------------------------------------------------
# Shutdown
# -----------------------------------------------------------------------------
POSTGRES_PID=""
SUPERVISOR_PID=""

stop_services() {
  trap '' TERM INT
  echo "[anchor] Stopping services..."
  if [ -n "$SUPERVISOR_PID" ]; then
    kill -TERM "$SUPERVISOR_PID" 2>/dev/null || true
    wait "$SUPERVISOR_PID" || true
  fi
  if [ -n "$POSTGRES_PID" ]; then
    # SIGINT is Postgres' fast shutdown
    kill -INT "$POSTGRES_PID" 2>/dev/null || true
    wait "$POSTGRES_PID" || true
  fi
}

trap stop_services EXIT
trap 'exit 0' TERM INT

# -----------------------------------------------------------------------------
# Environment defaults
# -----------------------------------------------------------------------------
. /app/anchor-env.sh

# Generate JWT_SECRET if not provided (persisted in /data for consistency)
JWT_SECRET_FILE="/data/.jwt_secret"
if [ -z "${JWT_SECRET:-}" ]; then
  if [ -f "$JWT_SECRET_FILE" ]; then
    JWT_SECRET=$(cat "$JWT_SECRET_FILE")
  else
    JWT_SECRET=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
    mkdir -p /data
    echo "$JWT_SECRET" > "$JWT_SECRET_FILE"
    chmod 600 "$JWT_SECRET_FILE"
    echo "[anchor] Generated new JWT_SECRET"
  fi
fi

# Export for supervisord
export DATABASE_URL JWT_SECRET
export OIDC_ENABLED="${OIDC_ENABLED:-}"
export OIDC_PROVIDER_NAME="${OIDC_PROVIDER_NAME:-}"
export OIDC_ISSUER_URL="${OIDC_ISSUER_URL:-}"
export OIDC_CLIENT_ID="${OIDC_CLIENT_ID:-}"
export OIDC_CLIENT_SECRET="${OIDC_CLIENT_SECRET:-}"
export OIDC_MOBILE_CLIENT_ID="${OIDC_MOBILE_CLIENT_ID:-}"
export DISABLE_INTERNAL_AUTH="${DISABLE_INTERNAL_AUTH:-}"
export APP_URL="${APP_URL:-}"

if [ "$USE_EMBEDDED_POSTGRES" = "1" ]; then
  echo "[anchor] Using embedded Postgres"
else
  echo "[anchor] Using external Postgres: ${PG_HOST}:${PG_PORT}"
fi

# -----------------------------------------------------------------------------
# Start embedded Postgres (if no PG_HOST provided)
# -----------------------------------------------------------------------------
if [ "$USE_EMBEDDED_POSTGRES" = "1" ]; then
  echo "[anchor] Starting embedded Postgres..."
  
  # A newer Postgres can't open an older one's files. Say so plainly,
  # rather than leaving Postgres to fail on them (they're left untouched).
  if [ -f "$PGDATA/PG_VERSION" ] && [ "$(cat "$PGDATA/PG_VERSION")" != "${PG_MAJOR}" ]; then
    echo "[anchor] ERROR: the database in $PGDATA is from Postgres $(cat "$PGDATA/PG_VERSION"), this image has Postgres ${PG_MAJOR}"
    echo "[anchor] Go back to the previous image, make a backup, then restore it on this one"
    exit 1
  fi

  # Ensure data directory permissions
  mkdir -p "$PGDATA" /run/postgresql
  chown -R postgres:postgres "$PGDATA" /run/postgresql
  chmod 700 "$PGDATA"
  chmod 3775 /run/postgresql

  # A new database, set up as the postgres image's entrypoint did before:
  # PG_USER as the superuser with PG_PASSWORD, password logins from other
  # hosts, and the PG_DATABASE database.
  if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "[anchor] Creating the database..."
    pwfile=$(mktemp)
    printf '%s\n' "$PG_PASSWORD" > "$pwfile"
    chown postgres "$pwfile"
    su-exec postgres initdb --username="$PG_USER" --pwfile="$pwfile" >/dev/null
    rm -f "$pwfile"
    printf '\nhost all all all scram-sha-256\n' >> "$PGDATA/pg_hba.conf"
    su-exec postgres pg_ctl -D "$PGDATA" -o "-c listen_addresses='' -p ${PG_PORT}" -w start >/dev/null
    su-exec postgres psql -v ON_ERROR_STOP=1 -q --no-psqlrc -p "${PG_PORT}" \
      --username "$PG_USER" --dbname postgres --set db="$PG_DATABASE" <<'EOSQL'
SELECT 'CREATE DATABASE ' || quote_ident(:'db')
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db') \gexec
EOSQL
    su-exec postgres pg_ctl -D "$PGDATA" -m fast -w stop >/dev/null
  fi

  su-exec postgres postgres \
    -c listen_addresses=127.0.0.1 \
    -p "${PG_PORT}" &
  POSTGRES_PID=$!

  echo "[anchor] Waiting for Postgres..."
  for i in $(seq 1 60); do
    pg_isready -h 127.0.0.1 -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DATABASE}" >/dev/null 2>&1 && break
    sleep 1
  done

  if ! pg_isready -h 127.0.0.1 -p "${PG_PORT}" -U "${PG_USER}" -d "${PG_DATABASE}" >/dev/null 2>&1; then
    echo "[anchor] ERROR: Postgres did not become ready"
    exit 1
  fi
  echo "[anchor] Postgres ready"
fi

# -----------------------------------------------------------------------------
# Run database migrations
# -----------------------------------------------------------------------------
cd /app/server

# Before a release changes the database, dump it to /data/backups, so a
# migration that goes wrong can't take notes with it. The last 3 are kept.
# A fresh database (no migrations table yet) has nothing to save.
BACKUP_DIR=/data/backups
pending_migrations() {
  applied=$(psql "$DATABASE_URL" -Atq -c "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL" 2>/dev/null) || return 1
  for dir in prisma/migrations/*/; do
    printf '%s
' "$applied" | grep -qx "$(basename "$dir")" || return 0
  done
  return 1
}
if pending_migrations; then
  dump="$BACKUP_DIR/before-migration-$(date -u +%Y%m%dT%H%M%SZ).dump"
  echo "[anchor] Saving the database to $dump before migrating..."
  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"
  if ! pg_dump --format=custom --no-owner --no-privileges --file="$dump.partial" "$DATABASE_URL"; then
    rm -f "$dump.partial"
    echo "[anchor] ERROR: could not save the database, so it wasn't migrated"
    exit 1
  fi
  mv "$dump.partial" "$dump"
  ls -1 "$BACKUP_DIR"/before-migration-*.dump | sort -r | tail -n +4 | xargs -r rm -f
fi

echo "[anchor] Running migrations..."
./node_modules/.bin/prisma migrate deploy

# -----------------------------------------------------------------------------
# Start supervisord (runs the server: API and web app)
# -----------------------------------------------------------------------------
# This shell stays PID 1, so that on `docker stop` (and so on every
# `docker compose up --force-recreate`) it stops the server first, then
# shuts Postgres down cleanly (stop_services above). Were supervisord PID 1,
# Postgres, which it doesn't manage, would be killed when it exited.
echo "[anchor] Starting services..."
/usr/bin/supervisord -c /etc/supervisord.conf &
SUPERVISOR_PID=$!
wait "$SUPERVISOR_PID"
