# JMT Migration Branch-Integrity Check — 2026-11-11

## Result

**Status: unresolved — do not treat the practice-history protection migration as part of PR #42.**

The following checks were performed against `audit/jmt-master-prompt-follow-through`:

- `docs/JMT_DATABASE_RECONCILIATION_RUNBOOK.md` exists and was readable.
- `docs/JMT_CRITICAL_JOURNEY_E2E_TEST_PLAN.md` exists and was readable.
- `supabase/migrations/20261111160000_preserve_deleted_practice_history.sql` returned GitHub Contents API `404 Not Found` on the PR branch.

The migration content was separately inspected in commit `c6c4deae1d6ce152be866dd175ddedb4dd559e6d`. It adds a trigger that rejects deletion of a practice question with student attempt history and rejects edits to selected question-content fields when attempts exist.

The subsequent commit `141d49343d80452c0871cec77fbc02367346e847` deletes that migration from the default branch, with the message: “Revert unintended default-branch migration file; keep work on PR branch”.

**Important limitation:** this check establishes that the expected path is absent from the PR branch at the time of inspection. It does not establish whether an equivalent migration exists under a different filename or whether the database already has an equivalent trigger.

## Required follow-up

1. Search the entire PR branch migration directory for `prevent_practice_question_history_rewrite` and equivalent trigger/function definitions.
2. Inspect the PR diff and migration ledger to determine whether the migration is included under another path.
3. If absent and still required, restore it only on the PR branch with a unique timestamp and verify the schema/table/column names against the branch's actual migrations.
4. Add database tests for:
   - deleting a question with no attempts (allowed if policy intends);
   - deleting a question with attempts (rejected);
   - editing question content with attempts (rejected);
   - editing non-content metadata with attempts (explicitly decide and test);
   - archiving/unpublishing a question with attempts (allowed);
   - preserving historical answer snapshots and scoring after question versioning.
5. Run migration tests against a disposable local/staging database and verify the exact PR-head CI run.

## Safety

No database was changed. No migration was restored. No production query or destructive test was run. Do not apply this migration to production until the branch/schema review and staging tests pass.
