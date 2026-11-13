# Database safety scripts

These scripts are for controlled local/test database workflows. They do not run automatically.

## Backup

Run with PostgreSQL client tools and an explicit expected host:

```bash
JMT_BACKUP_TARGET=test \
JMT_TEST_DB_HOST="your-test-db-host" \
JMT_BACKUP_DATABASE_URL="$TEST_DATABASE_URL" \
bash scripts/backup-db.sh
```

A production backup additionally requires the exact production host and `JMT_BACKUP_PRODUCTION_APPROVED=1`. Keep dump files outside Git and protect them as sensitive data.

## Restore

Restore is test-only. It requires both the expected test host and the expected production host, plus the exact confirmation string:

```bash
JMT_RESTORE_TARGET=test \
JMT_TEST_DB_HOST="your-test-db-host" \
JMT_PRODUCTION_DB_HOST="your-production-db-host" \
JMT_RESTORE_CONFIRMATION="RESTORE JMT TEST DATABASE" \
JMT_RESTORE_DATABASE_URL="$TEST_DATABASE_URL" \
JMT_RESTORE_FILE="./backups/test-YYYYMMDDTHHMMSSZ.dump" \
bash scripts/restore-db.sh
```

The restore uses `pg_restore --clean` and replaces objects in the target database. It first refuses a URL matching the configured production host, then requires an exact match to the configured test host. Both host variables are mandatory so the second guard cannot silently be skipped. Never point it at production. Never commit database URLs, passwords, service-role keys or backup files.
