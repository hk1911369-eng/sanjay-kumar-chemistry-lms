#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

: "\${JMT_RESTORE_DATABASE_URL:?Set JMT_RESTORE_DATABASE_URL in your shell or secret manager}"
: "\${JMT_RESTORE_FILE:?Set JMT_RESTORE_FILE to an existing custom-format dump}"
: "\${JMT_RESTORE_TARGET:?Set JMT_RESTORE_TARGET=test}"
: "\${JMT_RESTORE_CONFIRMATION:?Type RESTORE JMT TEST DATABASE to continue}"

if [[ "$JMT_RESTORE_TARGET" != "test" ]]; then
  echo "This script is test-only and refuses production restores." >&2
  exit 2
fi

if [[ "$JMT_RESTORE_CONFIRMATION" != "RESTORE JMT TEST DATABASE" ]]; then
  echo "Restore confirmation did not match." >&2
  exit 2
fi

if [[ -n "\${JMT_PRODUCTION_DB_HOST:-}" && "$JMT_RESTORE_DATABASE_URL" == *"$JMT_PRODUCTION_DB_HOST"* ]]; then
  echo "Refusing: restore URL matches the configured production database host." >&2
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
