# Database safety scripts

These scripts are for controlled local/test database workflows. They do not run automatically.

## Backup

Run with a PostgreSQL client installation:

```bash
JMT_BACKUP_TARGET=test \
JMT_BACKUP_DATABASE_URL="$TEST_DATABASE_URL" \
bash scripts/backup-db.sh
```

A production backup additionally requires `JMT_BACKUP_PRODUCTION_APPROVED=1`. Keep dump files outside Git and protect them as sensitive data.

## Restore

Restore is test-only. It requires the exact confirmation string:

```bash
JMT_RESTORE_TARGET=test \
JMT_RESTORE_CONFIRMATION="RESTORE JMT TEST DATABASE" \
JMT_RESTORE_DATABASE_URL="$TEST_DATABASE_URL" \
JMT_RESTORE_FILE="./backups/test-YYYYMMDDTHHMMSSZ.dump" \
bash scripts/restore-db.sh
```

The restore uses `pg_restore --clean` and replaces objects in the target database. It refuses a target matching `JMT_PRODUCTION_DB_HOST`. Never point it at production. Never commit database URLs, passwords, service-role keys or backup files.
