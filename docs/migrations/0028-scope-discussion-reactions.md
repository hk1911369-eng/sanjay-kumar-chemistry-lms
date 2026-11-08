# Migration 0028 — course-scoped discussion reactions

## What it changes
- Replaces the broad reaction read policy with a course-membership check matching lesson discussion visibility.
- Allows reactions to be read or added only by admins, teachers/staff assigned to that course, or students with an active, paid-through enrollment in the published course.
- Keeps reaction deletion limited to the owner.
- Does not delete or rewrite existing reactions or discussions.

## Apply
Apply `supabase/migrations/0028_scope_discussion_reactions.sql` after migration 0027 and migration 0021 on the intended Supabase project.

## Rollback
Dropping these policies and restoring the previous policies would reopen cross-course reaction access. Do not roll back on production unless the exposure is understood and accepted.
