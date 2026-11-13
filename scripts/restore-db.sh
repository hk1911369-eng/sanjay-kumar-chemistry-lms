#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "${JMT_RESTORE_DATABASE_URL:?Set JMT_RESTORE_DATABASE_URL in your shell or secret manager}"
: "${JMT_RESTORE_FILE:?Set JMT_RESTORE_FILE to an existing custom-format dump}"
: "${JMT_RESTORE_TARGET:?Set JMT_RESTORE_TARGET=test}"
: "${JMT_RESTORE_CONFIRMATION:?Type RESTORE JMT TEST DATABASE to continue}"
: "${JMT_TEST_DB_HOST:?Set the expected test database host}"
: "${JMT_PRODUCTION_DB_HOST:?Set the expected production database host for a second safety check}"

database_url_host() {
  node -e 'const u = new URL(process.argv[1]); if (!["postgres:", "postgresql:"].includes(u.protocol)) process.exit(2); process.stdout.write(u.hostname.toLowerCase())' "$1"
}

if [[ "$JMT_RESTORE_TARGET" != "test" ]]; then
  echo "This script is test-only and refuses production restores." >&2
  exit 2
fi

if [[ "$JMT_RESTORE_CONFIRMATION" != "RESTORE JMT TEST DATABASE" ]]; then
  echo "Restore confirmation did not match." >&2
  exit 2
fi

restore_host="$(database_url_host "$JMT_RESTORE_DATABASE_URL")"
if [[ "$restore_host" == "${JMT_PRODUCTION_DB_HOST,,}" ]]; then
  echo "Refusing: restore URL matches the configured production database host." >&2
  exit 2
fi

if [[ "$restore_host" != "${JMT_TEST_DB_HOST,,}" ]]; then
  echo "Refusing: restore URL does not match JMT_TEST_DB_HOST." >&2
  exit 2
fi

if [[ ! -f "$JMT_RESTORE_FILE" ]]; then
  echo "Backup file not found: $JMT_RESTORE_FILE" >&2
  exit 2
fi

command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore is required (install PostgreSQL client tools)." >&2; exit 127; }

echo "Restoring into the explicitly selected TEST database. Existing objects in that database will be replaced."
pg_restore --clean --if-exists --no-owner --no-acl --exit-on-error \
  --dbname="$JMT_RESTORE_DATABASE_URL" "$JMT_RESTORE_FILE"
echo "Test database restore completed."
