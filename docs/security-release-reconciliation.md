# Security audit and production release reconciliation

Snapshot: 10 November 2026  
Pull request: #42 — `audit/jmt-master-prompt-follow-through`  
Scope: read-only production comparison and changes validated/applied only on JMT Test

## Environment boundaries

- JMT Test is the newer validation project. Security migrations described as applied below were applied only there.
- The legacy production Supabase project and the production Render service were not modified.
- PR #42 remains draft and unmerged. The live Render service remains on `main`, deployed at `189be0eaca0f34a677bf4685d11df4fd11ec54a0`.
- Render currently has only the production web service; pull-request previews are disabled and no separate staging service exists.
- Do not merge or deploy this PR until a staging environment has passed schema, security, and application smoke tests.

## Verified JMT Test state

- 57/57 public tables have RLS enabled.
- `anon` and `authenticated` have no `TRUNCATE` or `TRIGGER` privileges on existing public tables.
- The default-privilege change is scoped to the actual migration owner, `postgres`. The connected migration role cannot change `supabase_admin` defaults.
- All 23 authenticated-callable `SECURITY DEFINER` functions inspected have pinned search paths and active-role checks, except the intentionally public teacher-directory function.
- The only anon-callable public `SECURITY DEFINER` function is `get_public_course_teachers`; it returns only teacher/staff IDs and names for active teachers assigned to published, non-archived courses.
- The two RLS-enabled rate-limit event tables have no policies and no client table privileges; they are internal-only.
- Active-profile protections now cover discussion reads/writes, reactions, notification inbox operations, owner-scoped storage operations, personal-record reads, course-content reads, and course-subject membership reads.
- Student quiz and written-exam question reads are gated by publication, schedule window, active paid enrollment, active student role, and non-archived course.
- The discussion reply-parent RLS recursion was removed using a private boolean-only helper.
- JMT Test currently has three profiles and three courses, but no enrollments, lessons, assignments, quizzes, written exams, or discussion records. Consequently, it is not a representative populated student end-to-end environment.

## Production snapshot — read only

- 49/49 public tables have RLS enabled.
- Authenticated clients still have `TRUNCATE` and `TRIGGER` privileges on 33 of the 49 public tables. Anonymous clients have neither privilege.
- All 49 current public tables are owned by `postgres`; default privileges for both `postgres` and `supabase_admin` still grant `TRUNCATE` and `TRIGGER` to client roles.
- All 43 production `SECURITY DEFINER` functions inspected have pinned search paths. The public teacher-directory function is the only anon-callable one; its output is limited to active teacher/staff IDs and names for published, non-archived courses.
- The advisor still reports leaked-password protection disabled.
- The existing production storage buckets are public course media and private lesson materials, payment proofs, and student avatars. The newer notebook/evidence bucket and notebook tables are absent.
- `academy_settings` and `finance_entries` exist, and the current notice policies are present and consistent.
- Production has three profiles but currently has no courses, enrollments, course applications, manual payment submissions, payment orders, finance entries, assignment/written-exam submissions, quiz attempts, lesson discussions, or notifications.

### Production schema gaps

Production is missing these eight tables present in JMT Test:

- `assignment_submission_versions`
- `lab_notebook_entries`
- `lab_notebook_evidence`
- `lab_notebook_review_history`
- `lab_practical_assignments`
- `student_practice_attempts`
- `student_practice_questions`
- `virtual_lab_catalog`

It is also missing 22 public functions present in JMT Test, including the student practice question/answer RPCs, lesson-completion RPC, lab notebook and practical-assessment guards, teacher practice analytics, curriculum integrity guards, and discussion pinning RPC.

### Production policy gaps

The production policies are older than the hardened JMT Test policies:

- Student content-read branches rely on enrollment state without consistently requiring the active student role.
- Discussion, reaction, notification, payment, and personal-record owner paths do not consistently require an active profile.
- Student avatar owner upload/update/delete and removal of unsubmitted payment proofs lack the active-role condition.
- Quiz and written-exam question reads do not enforce their scheduled start/end windows.
- Broad teacher `ALL` policies still allow assigned teachers/staff to manage lessons and chapters, and manage assignments, quizzes, and written exams. The newer test migrations narrow teacher authoring/publication paths.

The PR contains the corresponding migrations and regression tests; none of these production policies have been changed.

## Migration-history reconciliation warning

The migration ledgers are not a clean one-to-one baseline:

| Environment | Entries | Distinct names | Repeated-name entries |
|---|---:|---:|---:|
| Production | 105 | 98 | 7 |
| JMT Test | 255 | 213 | 42 |

Migration names and versions differ between environments. Do not bulk-replay the JMT Test migration history against production, and do not delete migration-history rows to make counts match. Build a reviewed schema/migration reconciliation plan first. The timestamped migration files in the PR are checked for unique 14-digit versions.

## Remaining manual / infrastructure gates

1. Enable Supabase Auth leaked-password protection in the project dashboard; no available connected action can change this Auth setting.
2. Resolve the `supabase_admin` default-privilege limitation. Current tables are owned by `postgres`; the PR hardens defaults for `postgres`, but cannot alter `supabase_admin` defaults from the current migration role.
3. Provision or designate a staging environment without incurring unapproved cost. The current Render account has no staging service and PR previews are disabled.
4. Reconcile the production schema and migration ledger against the PR branch in staging.
5. Run security, role-matrix, storage, payment, curriculum, assessment-window, and virtual-lab smoke tests in staging before merge/deploy.
6. Capture and verify a recoverable production backup before any production schema change.

## Release decision

**Not ready for production merge/deploy.** The production privilege exposure, policy drift, missing tables/functions, and absent staging validation must be resolved first. No production changes or data changes were made during this audit pass.


## Live read-only re-verification — 11 November 2026

This section supersedes the older migration/table counts above where they differ. Both connected Supabase projects were queried read-only on 11 November 2026. No schema, data, Auth, Storage, or project settings were changed.

### Current schema and privilege counts

| Check | Primary / production project | JMT Test |
|---|---:|---:|
| Public base tables | 49 | 57 |
| Tables with RLS enabled | 49 | 57 |
| Tables with authenticated TRUNCATE | 33 | 0 |
| Tables with authenticated TRIGGER | 33 | 0 |
| Tables with anon TRUNCATE or TRIGGER | 0 | 0 |
| Tables owned by postgres | 49 | 57 |

The two internal rate-limit tables (`app_rate_limit_events` and `auth_rate_limit_events`) have RLS enabled and no SELECT/INSERT/UPDATE/DELETE table privileges for either `anon` or `authenticated` in either project. Their no-policy advisor notices are therefore consistent with the intended server-only design.

### Current test-only tables

The eight tables present in JMT Test but absent from the primary project are:

- `assignment_submission_versions`
- `lab_notebook_entries`
- `lab_notebook_evidence`
- `lab_notebook_review_history`
- `lab_practical_assignments`
- `student_practice_attempts`
- `student_practice_questions`
- `virtual_lab_catalog`

The `written_exam_drafts` table is absent from both projects. The branch contains `supabase/migrations/20261111110000_add_written_exam_autosave_recovery.sql`, but version `20261111110000` is not recorded in the JMT Test migration ledger, and the draft table plus its load/save RPCs are absent from the live test schema. Reconcile migration order/history before applying it; do not blindly replay or repair migration history.

### Migration ledger comparison

| Environment | Ledger entries | Distinct migration names | Repeated-name entries |
|---|---:|---:|---:|
| Primary / production | 105 | 98 | 7 |
| JMT Test | 255 | 213 | 42 |

For a name-only inventory comparison, normalizing numeric prefixes and underscores yielded 94 common names, 119 names present only in JMT Test, and 4 names present only in the primary ledger. This is an inventory heuristic, not proof that same-named migrations have identical SQL or effects. The ledgers use different version identifiers and are not a safe basis for blind replay.

### Current data-fixture sufficiency

Read-only row counts confirm:

| Fixture | Primary / production | JMT Test |
|---|---:|---:|
| Profiles | 3 | 3 |
| Courses | 0 | 3 |
| Enrollments | 0 | 0 |
| Lessons | 0 | 0 |
| Assignments | 0 | 0 |
| Quizzes | 0 | 0 |
| Written exams | 0 | 0 |
| Discussions | 0 | 0 |
| Notifications | 0 | 0 |

JMT Test remains unsuitable for meaningful student/teacher/admin end-to-end acceptance testing: it has no enrollments or representative lesson/assessment/discussion fixtures. The primary project is also not populated for these journeys.

### Current Supabase advisor results

| Advisor | Primary / production | JMT Test |
|---|---:|---:|
| Security findings | 22 (2 INFO, 20 WARN) | 27 (2 INFO, 25 WARN) |
| Performance findings | 91 (64 INFO, 27 WARN) | 120 (98 INFO, 22 WARN) |

Security WARN composition in the primary project: one anon-callable `SECURITY DEFINER` function, 18 authenticated-callable `SECURITY DEFINER` functions, and leaked-password protection disabled. JMT Test reports one anon-callable function, 23 authenticated-callable functions, and the same Auth setting warning. The rate-limit tables account for the two INFO notices in both projects.

All callable `SECURITY DEFINER` functions reported in these two projects have the pinned `pg_catalog, public, pg_temp` search path. Source review confirmed explicit identity/role/ownership checks for the primary project's authenticated-callable functions and the five additional test-only functions. These advisor notices must not be treated as 41 proven vulnerabilities: they identify executable privileged functions for which the body and intended API contract must be assessed.

The public `get_public_course_teachers` function is a deliberate public directory endpoint and returns teacher IDs and names for assigned teachers on published, non-archived courses. The primary version does not filter `profiles.is_active`; the JMT Test version does. This is a P2 privacy/data-freshness discrepancy to resolve before promoting the test schema.

### Confirmed function-behavior drift

- Primary `complete_revision_task` checks the student's own pending task and active enrollment. JMT Test additionally requires a due task, a published/non-archived course, a published concept, current paid access, and concept-linked practice/assessment evidence for spaced-repetition completion.
- Primary `record_simulation_completion` uses a fixed subject-name mapping. JMT Test resolves the published lab and subject through `virtual_lab_catalog` and `academic_subjects`, then verifies course-subject membership and paid access.
- Primary `can_staff_access_student` permits assigned staff to see payment-submission-linked student access without restricting that branch to pending submissions. JMT Test narrows the payment branch to `pending_review`.
- Primary `get_public_course_teachers` omits the active-profile condition; JMT Test includes it.

These differences reinforce that JMT Test is not simply a copy of production. The current PR contains migration history and code that require a deliberate, reviewed promotion plan.

### Default privileges

The live default-ACL inspection confirms:
- Primary `postgres` defaults still grant `TRUNCATE` and `TRIGGER` on future public tables to `anon` and `authenticated`, in addition to the observed 33 existing tables with those privileges.
- JMT Test `postgres` defaults no longer grant those two privileges, and none of its existing tables grant them to client roles.
- The `supabase_admin` default ACL still includes `TRUNCATE` and `TRIGGER` for `anon` and `authenticated` in both projects. The current migration role has not resolved this owner-specific default-privilege case.

### Release implications

1. Treat the primary project's authenticated `TRUNCATE`/`TRIGGER` grants and default ACLs as a high-priority security hardening blocker. The audit confirms excessive database privileges; it did not demonstrate an arbitrary SQL execution path through the public Data API.
2. Do not promote JMT Test schema to primary by replaying its 255-entry ledger. Produce a migration-by-migration semantic reconciliation and a verified backup/rollback plan.
3. Seed synthetic, role-separated student/teacher/admin data in an isolated staging environment, including paid/unpaid enrollments, lessons, quizzes, written exams, practical assignments, and evidence uploads.
4. Resolve the missing written-exam draft migration and its ledger ordering in the test environment before claiming autosave/recovery is database-verified.
5. Review the public teacher-directory active-profile discrepancy and the Auth leaked-password protection setting.
6. Re-run advisor checks after reviewed fixes and run real role-matrix, Storage, payment, assessment, and browser E2E journeys in staging.

**Status remains NOT READY for production merge/deploy.** This re-verification was read-only. No production or test database was modified.
