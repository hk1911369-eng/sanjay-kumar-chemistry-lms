#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${JMT_BACKUP_DATABASE_URL:?Set JMT_BACKUP_DATABASE_URL in your shell or secret manager}"
: "${JMT_BACKUP_TARGET:?Set JMT_BACKUP_TARGET to test or production}"

case "$JMT_BACKUP_TARGET" in
  test)
    : "${JMT_TEST_DB_HOST:?Set the expected test database host}"
    if [[ "$JMT_BACKUP_DATABASE_URL" != *"$JMT_TEST_DB_HOST"* ]]; then
      echo "Refusing: backup URL does not match JMT_TEST_DB_HOST." >&2
      exit 2
    fi
    ;;
  production)
    : "${JMT_PRODUCTION_DB_HOST:?Set the expected production database host}"
    if [[ "$JMT_BACKUP_DATABASE_URL" != *"$JMT_PRODUCTION_DB_HOST"* ]]; then
      echo "Refusing: backup URL does not match JMT_PRODUCTION_DB_HOST." >&2
      exit 2
    fi
    if [[ "${JMT_BACKUP_PRODUCTION_APPROVED:-}" != "1" ]]; then
      echo "Production backup requires JMT_BACKUP_PRODUCTION_APPROVED=1." >&2
      exit 2
    fi
    ;;
  *)
    echo "JMT_BACKUP_TARGET must be test or production." >&2
    exit 2
    ;;
esac

command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump is required (install PostgreSQL client tools)." >&2; exit 127; }

backup_dir="${JMT_BACKUP_DIR:-./backups}"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
label="${JMT_BACKUP_LABEL:-$JMT_BACKUP_TARGET}"
if [[ ! "$label" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "JMT_BACKUP_LABEL may contain only letters, numbers, dot, underscore and hyphen." >&2
  exit 2
fi

output="$backup_dir/$label-$timestamp.dump"
pg_dump --format=custom --no-owner --no-acl --file="$output" "$JMT_BACKUP_DATABASE_URL"
chmod 600 "$output"
sha256sum "$output"
printf 'Backup created: %s\n' "$output"
