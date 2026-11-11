# JMT Migration Branch-Integrity Check — corrected 11 November 2026

## Corrected result

**Status: migration is present on PR #42 under a different timestamp; database execution remains unverified.**

The earlier check looked only for `20261111160000_preserve_deleted_practice_history.sql` and concluded that the expected path was absent. A full PR changed-file inventory subsequently revealed the equivalent implementation at:

- `supabase/migrations/20261111170100_preserve_deleted_practice_history.sql`
- `tests/practice-question-delete-history.test.mjs`

Both files were fetched and inspected on `audit/jmt-master-prompt-follow-through`.

## What the migration does

The migration defines `public.prevent_practice_question_history_rewrite()` as a SECURITY DEFINER trigger function with an empty search_path. It:

1. Rejects deletion of a practice question if any `student_practice_attempts` row references it.
2. Rejects edits to course/subject/concept/chapter/topic/difficulty/question/options/correct-option/explanation/marks if attempts already reference the question.
3. Allows non-content metadata updates because those fields are not in the compared row.
4. Revokes direct execution from PUBLIC, anon and authenticated.
5. Installs a BEFORE UPDATE OR DELETE row trigger on `student_practice_questions`.

The test file verifies migration source patterns, trigger attachment and deletion guard text. **It is a static source test, not an executed PostgreSQL integration test.** It does not prove trigger behavior, cascade behavior, role grants, or migration success against a real schema.

## Remaining verification

1. Run the migration in a disposable database with the exact branch schema.
2. Verify delete with zero attempts succeeds (subject to other constraints) and delete with attempts fails.
3. Verify content edits with attempts fail; non-content metadata edits behave as intended.
4. Verify archive/unpublish remains possible with attempt history.
5. Verify historical attempts retain correct scoring and display semantics after any supported question-version workflow.
6. Verify SECURITY DEFINER owner, execute grants, trigger behavior under authenticated writes, and rollback.
7. Add SQL integration tests rather than relying only on regex/source assertions.

## Historical context and superseded conclusion

Commit `c6c4deae1d6ce152be866dd175ddedb4dd559e6d` introduced the function and trigger. Commit `141d49343d80452c0871cec77fbc02367346e847` reverted an unintended default-branch copy. The PR branch contains the equivalent implementation at the later filename above.

The earlier version of this document stated that the migration was unresolved and should not be treated as part of PR #42. **That conclusion is superseded by this corrected inventory.** The migration is present in the PR branch; only runtime/database verification remains open.

## Safety

No database was changed. No migration was applied. No production query or destructive test was run. Do not apply this migration to production until the full migration-ledger, schema, staging-test and rollout review is complete.
