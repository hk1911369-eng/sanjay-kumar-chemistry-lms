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

- 56/56 public tables have RLS enabled.
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

Production is missing these seven tables present in JMT Test:

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
| JMT Test | 244 | 203 | 41 |

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
