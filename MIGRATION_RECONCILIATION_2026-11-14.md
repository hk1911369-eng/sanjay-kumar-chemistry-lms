# JMT Test migration reconciliation matrix — 14 November 2026

**Scope:** read-only inspection of the isolated JMT Test project (`cullxqklmbdiosibgois`) against the audit branch. No SQL changes, migration applications, ledger edits, Auth changes, or Storage object changes were performed.

## Why ledger replay is unsafe

The live migration ledger has 255 entries and its latest recorded version is `20261111133701`. The branch contains later migration files whose effects are mixed: some already exist in the live schema despite missing ledger versions; some are partially present but do not contain the new security condition; and others are absent. Migration version history must therefore be reconciled against actual schema/function/policy definitions, not treated as proof that a migration has or has not run.

## 13-November branch migration effects

| Migration | Live JMT Test observation | Reconciliation decision |
|---|---|---|
| `20261113130000` virtual-lab publication guard | Student catalogue policy lacks the parent-course publication gate; simulation completion function also lacks it | Effect absent; apply only after full migration review |
| `20261113140000` notebook/evidence publication guard | `private.can_upload_lab_notebook_evidence(text)` exists, but its live definition checks active paid enrollment and course archive state only; it does not require a published parent course or verify the published lab relationship in the new way. Notebook write/evidence policies also require comparison with branch definitions | Partial/stale effect; do not mark applied merely because helper exists |
| `20261113150000` active course teachers | `validate_course_assignment_teacher` trigger is already present in live DB; public teacher lookup was previously confirmed to filter active teachers/staff on published, unarchived courses | Effect already present despite missing ledger version; verify exact function body and reconcile version separately |
| `20261113160000` parent-course content read guard | The 11 restrictive parent-course read policies are absent | Effect absent |
| `20261113170000` active-profile role guard | Live `current_role()` already checks `profiles.is_active IS TRUE` | Effect already present despite missing ledger version; reconcile version separately |
| `20261113180000` active student payment approval | Approval trigger absent | Effect absent |
| `20261113190000` quiz submission parent-course guard | Submission trigger absent | Effect absent |
| `20261113200000` quiz attempt start parent-course guard | Live student INSERT policy lacks the parent course published/archive conditions | Effect absent |
| `20261113210000` lesson/simulation evidence guard | Live lesson completion and simulation completion functions lack the parent course published/archive checks | Effect absent |
| `20261113220000` exam-plan parent-course guard | Live exam-plan function checks archive state but not `courses.is_published IS TRUE` | Effect absent |
| `20261113230000` profile role-change audit | Role-change audit trigger absent | Effect absent |
| `20261113240000` assignment grading RPC | `grade_assignment_submission(uuid,numeric,text)` absent; live authenticated grading-column UPDATE grants are absent | Effect absent; source action now uses the RPC, so this migration is required before grading works again |
| `20261113250000` monthly payment approval recheck | Approval-time enrollment/admission-paid trigger absent | Effect absent |

## Earlier migration replay hazard

Migration `20261111200000_add_assignment_submission_version_history.sql` had already created its table, trigger, and named SELECT policy in the live schema, while its version was absent from the migration ledger. The original migration attempted an unconditional `CREATE POLICY`, which could fail on replay. The audit branch now drops that exact policy if it exists before recreating it; a regression test verifies this ordering. No live replay was attempted.

## Safe next sequence

1. Preserve the current read-only baseline and take a fresh schema/ledger snapshot before any mutation.
2. For each missing-ledger migration, compare every object/function/policy/trigger against the source migration. Mark it **already present**, **partially present**, or **absent**; never infer from version alone.
3. For effects already present, verify exact definitions and dependencies before any ledger-only reconciliation. Do not rerun migrations that may duplicate data or constraints.
4. For partial effects, determine whether the migration can be safely applied as written or needs a new corrective migration. Do not hand-edit the ledger as a substitute for schema reconciliation.
5. Apply only approved migrations to JMT Test in dependency order, with a backup/rollback plan and post-apply verification. Production remains explicitly out of scope.
6. Run database-backed role tests (anonymous, inactive profile, student owner/non-owner, assigned/unassigned teacher/staff, admin), plus Storage upload/download tests, before considering the security work complete.

## Current boundary

This file records observations and a safe plan only. JMT Test remains unchanged. The source branch and PR remain unmerged and undeployed. Auth leaked-password protection remains an outstanding dashboard/configuration item because the connected tools do not expose the required Auth setting.
