# Security review — v9 historical notes and current audit addendum

The first section below preserves the original v9 review as a historical checkpoint. It is not a complete description of the current branch. The current source review is recorded in the addendum.

## Historical v9 checkpoint

### Implemented / reinforced at that checkpoint

- Public registration was Student-only; roles were not accepted from form fields or user metadata.
- Role escalation was blocked by a database trigger and Admin provisioning was a trusted SQL operation.
- Server actions checked the current authenticated user and role before sensitive operations.
- Payment claims were immutable to clients and remained pending until Admin review.
- Approval/rejection used Admin-only database functions; approval locked the payment row, rechecked course and fee conditions, updated payment and enrollment, and wrote an audit log in one database transaction.
- Duplicate transaction references were normalized and unique by provider/transaction ID.
- Teacher RLS was restricted to assigned courses.
- Student profile, payment, enrollment and progress access was owner-scoped.
- Service-role access was intended to remain server-only.
- Security headers included nosniff, referrer policy, frame denial, HSTS and a restrictive permissions policy.

### Historical outstanding risks

These were recorded at the v9 checkpoint and must not be assumed to describe the current source unchanged: RLS runtime tests, login/registration/payment rate limiting, private Storage, MFA, penetration testing, and email-provider verification.

---

## Current audit addendum — 11 November 2026

### Scope and evidence

- Reviewed the current `audit/jmt-master-prompt-follow-through` branch and PR #42 source.
- The branch contains 218 numbered SQL migration files at the time of this review.
- Reviewed current authentication and payment server actions, selected later migrations, test files, and the GitHub Actions quality workflow.
- The workflow runs `npm ci`, static guardrail tests, ESLint, TypeScript, Next.js production build, and `npm audit --omit=dev`. Its Supabase environment values are placeholders; it does not connect to PostgreSQL or execute RLS as separate user roles.
- The source tests inspected assert SQL/source patterns. They are useful regression checks but are not substitutes for database integration tests.

### Controls now present in source

- **Authentication throttling:** `sign_in`, `sign_up`, and `password_reset` call `enforceAuthRateLimit`. When `SUPABASE_SERVICE_ROLE_KEY` is configured, the server uses the database `consume_auth_rate_limit` RPC with hashed email and IP keys. The migration sequence supports all three actions: sign-in is limited to 10 per email and 30 per IP per 15 minutes; sign-up and password reset are each limited to 3 per email and 10 per IP per hour. If the service-role key is absent, this application-level database throttle is bypassed and Supabase Auth's own endpoint/IP limits remain the fallback. Confirm the production configuration and effective limits before relying on this as an abuse control.
- **Payment throttling:** `submitManualPayment` calls `consume_app_rate_limit('manual_payment')`. The inspected migration sets a limit of three events per user per 15-minute window and requires an active profile role.
- **Private practical evidence:** migrations create the non-public `lab-notebook-evidence` bucket with an 8 MiB limit and JPEG/PNG/WebP/PDF MIME allowlist. Evidence metadata and Storage object policies enforce owner/notebook path relationships, editable notebook status, paid active enrollment, file metadata checks, and a maximum of eight files per notebook. Assigned teaching staff and admins have scoped read access. The upload helper was moved into a non-exposed `private` schema in a later migration.
- **Other payment proof controls:** the payment action validates a 3 MiB image upload, checks file signatures, uses a user-scoped random object path, and removes an unreferenced upload if the submission insert fails.
- **Function search paths and execution:** a later migration dynamically pins search paths for public SECURITY DEFINER functions. Several later trigger-function migrations explicitly revoke client EXECUTE privileges. The full final function/ACL inventory remains incomplete.
- **Role and active-account guards:** later migrations fail closed for NULL roles in selected assessment, curriculum, practical assignment, and lesson-completion paths; other later policies require an active role for personal records, course content, course subjects, discussions, and storage.
- **Table-level privileges:** a later migration revokes TRUNCATE and TRIGGER from anon/authenticated on existing public tables and changes postgres-owned default privileges for future public tables. A separate migration revokes client access to the student-code sequence.

### Test database status — distinguish carefully

The lab evidence migration `20261110233000_add_private_lab_notebook_evidence.sql` contains a comment stating it was applied only to the isolated JMT Test project and that production remained untouched at that point. This is evidence for that migration's stated test-project application, not proof that every migration in the current branch has been applied successfully or that the live schema matches the branch. Verify the actual Supabase migration history and schema before any release.

### Outstanding verification and release risks

- No complete PostgreSQL role-matrix integration suite has been demonstrated. Test with separate anonymous, inactive/profile-less, active Student A and Student B, assigned and unassigned Teacher/Staff, and Admin identities. Exercise SELECT/INSERT/UPDATE/DELETE, RPC execution, and Storage upload/download/delete behavior against a disposable test project.
- Complete the SECURITY DEFINER inventory: final function definitions, owners, search_path, EXECUTE ACLs, trigger bindings, and any overloads. Confirm intended PUBLIC/anon/authenticated/service_role access.
- Confirm actual production environment configuration for `SUPABASE_SERVICE_ROLE_KEY`; without it, the application-level auth rate-limit RPC is not used.
- Admin MFA is not demonstrated as enforced by application policy. Configure and verify MFA requirements in Supabase Auth and test privileged flows.
- Confirm private bucket configuration, signed-download behavior, retention/deletion policy, and object ownership in the test project. Do not infer privacy from bucket name alone.
- Full XSS/CSRF review, browser/mobile testing, email delivery verification, payment end-to-end testing, and independent penetration testing remain outstanding.
- Confirm migration ordering and actual applied migration history in a disposable test project before deployment. Do not reset or modify production as part of this audit.

**Current conclusion:** The branch contains materially more security controls than the historical v9 notes describe, including rate-limiting code and private lab evidence storage. However, green source/CI checks do not prove runtime PostgreSQL authorization. This project must not be represented as fully security-tested or production-ready until the database role matrix, final function/ACL inventory, configuration checks, and remaining release tests are completed.


## Live JMT Test catalog check — 11 November 2026

Read-only Supabase catalog inspection was performed against the project named **JMT Test** (not production). No schema or data changes were made.

- All ordinary tables in the `public` schema were observed with RLS enabled.
- `app_rate_limit_events` and `auth_rate_limit_events` have RLS enabled and no policies; their table grants are limited to `postgres` and `service_role`, with no `anon` or `authenticated` table grants. This is a deliberate service-only posture if the application continues to access them only through privileged server-side paths.
- Anonymous table SELECT grants are limited to `academy_settings`, `courses`, and `notices`.
- Catalog scan found 59 public SECURITY DEFINER functions; all have explicit function-level search_path settings. One function, `get_public_course_teachers(uuid)`, is executable by anon. Its definition returns active teaching staff IDs and full names only for published, non-archived courses, and the branch migration explicitly grants public execution for public course pages. This is an intentional public disclosure surface, not a blanket authorization for profile access.
- 23 SECURITY DEFINER functions are executable by authenticated users; these require per-function authorization checks and should not be blanket-revoked merely to silence the generic advisor.
- Supabase Auth leaked-password protection is disabled on JMT Test and remains a configuration hardening item.

The JMT Test migration ledger has 244 rows versus 218 SQL files in the current branch. After stripping numeric prefixes of any length from both ledger labels and source filenames, 192 distinct normalized names appear on both sides, 22 source labels have no direct ledger-name match, and 10 normalized ledger labels have no direct source-name match. The ledger contains 37 duplicated-name groups; the source contains four duplicated-name groups. The latest ledger row and latest source file share the normalized name `require_active_role_for_course_subject_reads` but have different version identifiers (`20261110181004` versus `20261110274000`). These are name-level comparisons only: they do not prove SQL equivalence, migration ordering, or which changes were applied. A further check found 49 source files with numeric prefixes later than the maximum database ledger version; 48 have a normalized name somewhere in the ledger, while `add_ideal_gas_law_virtual_lab` does not. A live constraint inspection confirmed that the JMT Test schema lacks the `gas-laws` value added by that source migration. The unmatched and duplicated groups must be traced through Git history, exact SQL, and resulting schema before any further migration push; do not attempt automatic repair from counts alone.

A targeted schema-effect check also confirmed that `profiles.is_active` exists (the effect of a historical ledger-only label), while the JMT Test `virtual_lab_catalog_simulation_type_check` constraint does not include `gas-laws`. The current branch migration `20261110260000_add_ideal_gas_law_virtual_lab.sql` adds that value, so this particular source migration effect is not yet present in JMT Test. This is direct evidence of branch/database drift, not authorization to apply it without the full migration rehearsal.

These catalog findings do not establish runtime RLS behavior. A role/JWT test matrix and Storage upload/download tests remain outstanding. Full details are in `AUDIT_REPORT.md`.


### Follow-up migration-effect trace — virtual-lab catalog (read-only, 11 November 2026)

A targeted comparison was made between the branch SQL, the ordered JMT Test migration ledger, and the live public.virtual_lab_catalog contents.

- JMT Test contains 17 catalogue rows across 17 simulation types. The live virtual_lab_catalog_simulation_type_check allows those 17 types; it does not allow gas-laws.
- The double-pendulum catalogue row is present (lab_key = physics-double-pendulum, simulation_type = pendulum). The ledger contains a historical entry named add_double_pendulum_virtual_lab_template at version 20261109161755, while the current branch contains 20261110150000_add_double_pendulum_simulation.sql. The exact current source version 20261110150000 is absent from the JMT Test ledger. Thus the feature effect is present, but the current file's version/name does not match the historical ledger entry; this is not proof that the SQL contents are equivalent.
- The current branch file 20261110150000_add_double_pendulum_simulation.sql drops the existing simulation-type check and recreates it with only seven values (physics, chemistry, biology, maths, ict, quadratic, pendulum). The live catalogue already contains rows with types outside that list, including projectile, microscope, wave-interference, equilibrium, cell-division, electrochemical-cell, photosynthesis, spring-oscillator, and dihybrid. If this exact source migration is treated as pending and executed against the current JMT Test state, adding its narrower check would fail validation against existing rows. Do not replay or mark it applied automatically; reconcile the version history and SQL provenance first.
- The branch's 20261110260000_add_ideal_gas_law_virtual_lab.sql expands the check to include gas-laws, but it does not insert an ideal-gas catalogue row. Its SQL only changes the allowed type constraint; any actual lab template/content row would need a separate, verified source migration or application workflow.

This demonstrates why matching names or observing a feature row is insufficient to establish migration equivalence. The JMT Test database was queried read-only. No migration was applied, repaired, or marked as applied.


### Authenticated SECURITY DEFINER function review — follow-up (read-only, 11 November 2026)

The live JMT Test catalog was queried for public SECURITY DEFINER functions executable by authenticated users. The result contained 23 functions. All 23 are owned by postgres, have an explicit function-level search_path of pg_catalog, public, pg_temp, and are not executable by anon. The separately documented get_public_course_teachers(uuid) function remains the one anon-executable public SECURITY DEFINER RPC. The 23-function review covered the current definitions and grants for payment approval/rejection, role and staff-scope helpers, assigned-student reads, payment instructions/calendar, course/account administration, teacher revision assignment, exam-war-room operations, application rate limiting, practice analytics/questions/answers, lesson completion, simulation completion, discussion pinning, and quiz submission. No blanket grant-removal recommendation is made; the functions enforce different roles and object scopes.

**Potential progress-integrity inconsistency — record_lesson_completion:** the live function requires an authenticated active student, a published lesson belonging to the supplied course, and an active paid enrollment. It does not check that the parent course remains unarchived. The live lesson SELECT policy does require courses.archived_at IS NULL for students. The live set_course_archived(uuid,boolean) function archives and unpublishes a course but does not deactivate existing enrollments. Consequently, after a course is archived, a student whose enrollment remains active and paid may be unable to read the lesson through the Data API yet still be able to call the authenticated SECURITY DEFINER completion RPC with known course/lesson IDs. This could create completion/progress events for content unavailable under the read policy. The function does not return lesson content; the concern is authorization consistency and learning-record integrity. The JMT Test project currently has zero archived courses, so this state was not exercised with a JWT. Review whether archive should block completion; if so, align the RPC guard with the course-content read policy and add a role-matrix regression test before any migration is proposed.

**Scope and limits:** catalog/definition review only. No impersonation, JWT test, table mutation, function execution, migration, or schema change was performed. The other reviewed functions showed expected checks in their current definitions, including admin-only payment review and account/course administration, assignment-scoped teacher/staff operations, student-owned revision cancellation/completion, active-paid-enrollment gates for practice/quiz/simulation operations, and server-side scoring for quiz/practice submissions. This is not a substitute for runtime role-matrix tests.


### Assignment deadline enforcement review — JMT Test (read-only, 11 November 2026)

**Finding: assignment due_at is presentation-only at the currently inspected enforcement points.** The live public.assignments table has a nullable due_at timestamp. The application submitAssignment action in app/actions/academic.ts (current branch) validates the assignment ID, answer/attachment shape and length, checks whether the student's existing submission is already graded, then inserts or updates assignment_submissions. It does not load the assignment's due_at or compare it with database time. The live RLS policy "students submit own assignments" checks student role/ownership, ungraded metadata, a submitted_at upper bound of now()+30 seconds, content length/attachment bounds, published assignment, and active paid enrollment; it does not compare now() or submitted_at to assignments.due_at. The live "students update own ungraded submissions" policy has the same omission. The RLS policy contains an upper-bound predicate for submitted_at, but the later hardening migration grants authenticated users neither INSERT nor UPDATE privilege on the submitted_at column. A live has_column_privilege check confirmed both privileges are false. Therefore, ordinary authenticated clients cannot backdate or future-date submitted_at directly. This column-level protection is positive; it does not close the due_at gap because neither the server action nor the database policy compares database time with the assignment deadline.

**Impact / classification:** If due_at is intended to be a hard submission cutoff, a student with otherwise valid access can submit or revise work after the displayed deadline, including through direct authenticated Data API calls. This is an assessment-deadline integrity / functional authorization gap, not a cross-user data disclosure. If late submissions are intentionally allowed, the behavior should be made explicit in product requirements and the UI rather than implying that due_at closes submissions.

**Recommended remediation (not applied):** Define late-submission policy first (hard cutoff, grace period, or accepted-but-flagged late). For a hard cutoff, enforce `due_at IS NULL OR now() <= due_at` using database time in both INSERT and UPDATE row policies or a trusted database trigger/RPC; do not rely on client `submitted_at`. Add tests for before, exactly at, and after deadline; late updates to existing ungraded submissions; null deadlines; timezone boundaries; and direct REST calls. Consider storing a server-generated received timestamp separately from any client timestamp. No SQL, app code, or database changes were made during this review.


**Regression-test coverage:** the current tests/assessment-submission-time.test.mjs checks the 30-second future bound and written-exam start/end windows, but does not assert assignment due_at enforcement. tests/assignment-submission-write-guard.test.mjs correctly asserts that authenticated users cannot write submitted_at, but likewise does not assert a due_at cutoff. These are source-text tests, not live role/JWT tests.


### Manual-payment duplicate-period approval review — JMT Test (read-only, 11 November 2026)

**Finding: duplicate claims for one student/course/billing period are not prevented by a period-level database constraint or approval guard.** The live manual_payment_submissions constraints include a unique `(provider, transaction_id)` key and billing-period day-one check, but no uniqueness across `(student_id, course_id, billing_period)` for pending/approved claims. The current submitManualPayment server action in app/actions/payments.ts does not query for an existing pending/approved claim for the same billing period before inserting. The live validate_manual_payment_submission() trigger locks the student's enrollment for monthly claims and checks that the current month is not already paid (`paid_through`), but it does not check for another pending payment claim for that same month. For initial claims, it checks for an accepted application and unpaid admission, but does not lock the application/enrollment state or check another pending initial claim.

The live approve_manual_payment_submission(uuid,text) RPC locks the individual payment row and the course row. For monthly claims it locks the enrollment row and extends paid_through with `greatest(existing, period_end)`. It does not reject approval when `paid_through` already covers the submitted billing_period. The BEFORE UPDATE guard_manual_payment_approval trigger checks that the billing period is not in the future and validates course delivery mode and fee snapshots, but it likewise does not reject a period already paid. Thus, two pending claims with distinct provider transaction IDs for the same student/course/period can both pass submission validation; after the first is approved, the second can also be approved and recorded as a second successful payment while granting no additional paid-through period. The initial-payment branch can similarly process two pending claims if two distinct transaction IDs are submitted before the first approval; the later approval upserts the enrollment again. This is a duplicate-payment approval / financial reconciliation integrity risk, not evidence that students can self-approve or bypass admin review.

**Observed JMT Test data:** a privacy-preserving aggregate query found zero groups with multiple pending claims for the same student/course/billing period at inspection time. The finding is about an unguarded possible state, not an observed duplicate incident.

**Existing controls retained:** transaction ID is normalized to uppercase/trimmed and unique per provider; admin approval is required; approval and enrollment update plus audit log are transactional; each approval locks its own payment row; monthly submission checks active admitted enrollment and current-period paid_through; payment proof path and MIME/size/ownership are validated; student activity is rate-limited to three payment submissions per 15 minutes.

**Recommended remediation (not applied):** make the payment-period decision atomic at approval. Lock the relevant enrollment row (and a stable per-student/course key for initial claims where an enrollment may not yet exist), then reject a monthly claim if `paid_through` already covers `billing_period` or another approved claim already settled it. Ensure initial admission approval is idempotent and cannot be approved twice for the same admission/billing period. Consider a partial unique index for active (`pending_review` or `approved`) claims on the intended business key, after checking and resolving historical duplicates and confirming whether legacy and new payment kinds share the same uniqueness rule. At submission, provide a friendly duplicate-pending error, but do not rely on the UI/action check for integrity. Add concurrency tests where two distinct transaction IDs are submitted and approved in parallel, plus repeat-approval, rejected-resubmission, legacy compatibility, and period-boundary cases. No database, application, or migration changes were made.


### Payment-proof Storage boundary and migration-history follow-up — JMT Test (read-only, 11 November 2026)

**Storage confidentiality controls:** the live `payment-proofs` bucket is private, capped at 3 MiB per object, and allowlists JPEG/PNG/WebP. Live Storage policies permit student uploads only into the caller's UUID folder; student reads are restricted to that same folder and student role; student deletes are limited to their own objects that are not referenced by a payment row; admins can read the bucket. No teacher/staff read policy exists for payment proofs. The live `validate_manual_payment_proof_path()` trigger function is SECURITY DEFINER with fixed `search_path=pg_catalog, public, pg_temp`, no direct client execute grant, and verifies path ownership, actual object owner, MIME metadata, and size. These controls provide a strong database-side check that a submitted claim references a real private proof owned by that student.

**Remaining resource-abuse surface (needs product decision):** the Storage INSERT policy itself checks bucket, UUID folder, and student role, but does not enforce a per-student object-count or aggregate-byte quota and does not require an associated pending payment row (which cannot exist before upload). A student with a valid account can therefore upload multiple unreferenced objects directly to Storage, bypassing the application action's three-submissions-per-15-minutes limit. The application removes an uploaded object when its subsequent database insert fails, but that cleanup does not cover arbitrary direct Storage API uploads or abandoned browser sessions. The bucket's per-object 3 MiB limit does not cap aggregate storage per user. At inspection time the live bucket contained zero objects, so no abuse or orphaned-proof incident was observed. Treat this as a resource-governance / storage-cost risk, not a confidentiality bypass. Recommended options: implement a safe per-user upload quota or upload-intent flow with server-side rate limiting and short-lived intent records; consider periodic orphan cleanup with a conservative age threshold and a strict check that no payment row references the object. Do not delete objects merely because they are old; retain evidence required for financial audit and disputes.

**Migration ledger reconciliation:** the live migration ledger contains both `0041_enforce_payment_proof_ownership` and `0041_align_course_guards_and_application_notifications`, while the current branch has the former proof-ownership file but no same-named source file for the latter. The ledger also records both `0042_verify_payment_proof_ownership` and `0042_students_read_own_payment_proofs`; both corresponding source files exist, despite sharing the same numeric prefix. The later `0044_complete_payment_proof_ownership` is also present in source and ledger. This illustrates why numeric prefixes alone are not a unique migration identity. The live function definition matches the strict final proof check (owner, MIME, size) from the later hardening sequence. The unmatched `0041_align_course_guards_and_application_notifications` ledger label still needs Git-history/content reconciliation before classifying it as removed, renamed, or consolidated. No ledger repair or migration replay is recommended from name matching alone.

No Storage objects were found in the bucket at inspection time. No object was uploaded, downloaded, modified, or deleted. No migrations or database changes were made.


### Reconciliation of historical 0041 course/application migration — JMT Test (read-only, 11 November 2026)

**Git-history recovery:** the missing migration was recovered from commit `00720384886e9c6f468c515f86a1788f82cbea42` (PR #21, 8 November 2026). The live ledger records it as version `20261108092457`, name `0041_align_course_guards_and_application_notifications`. Its original SQL has three effects: (1) drops the legacy `enforce_supported_course_catalogue` trigger and `enforce_supported_chemistry_courses()` function that restricted courses to hard-coded slugs/fixed BDT 700 pricing; (2) installs the private SECURITY DEFINER application-status notification trigger; and (3) installs SECURITY DEFINER `public.rls_auto_enable()` plus the `ensure_rls` DDL event trigger.

**Live JMT Test verification:** the legacy course guard trigger/function are absent. The `jmt_private.notify_course_application_status()` function and `course_application_status_notification` trigger exist; the function has an empty fixed search_path and client execute privileges were revoked in the source migration. The `ensure_rls` event trigger is enabled and targets `public.rls_auto_enable()`, whose fixed search_path is `pg_catalog`. All 56 of 56 current public tables have RLS enabled. The current application table has the expected partial unique index on `(student_id, course_id, delivery_mode)` while status is submitted/reviewing/accepted; live inspection found zero duplicate open-application groups. Student insert policy constrains identity, initial status, review metadata, and published/open/non-archived course plus delivery mode. Admin management is role-scoped through `current_role()`.

**Source-tree replayability remains unresolved:** the exact historical `0041_align_course_guards_and_application_notifications.sql` file is absent from the current audit branch. The branch does retain `0018_course_application_notifications.sql`, which reproduces the notification trigger, but `0005_auth_roles_and_course_guardrails.sql` still creates the legacy fixed-price course guard. I have not yet established an equivalent current-branch source migration that removes that guard or recreates the automatic-RLS event trigger. Therefore the live database's correct current state must not be mistaken for proof that a fresh database built only from the current branch migration directory will reach the same state. This is a migration-source/reproducibility issue, not evidence that the live JMT Test database currently has the legacy restriction. Do not replay migrations or repair the ledger until the full ordered source history is reconciled.

**Application review traceability observation:** `reviewCourseApplication()` writes the new status and overwrites `reviewed_by`/`reviewed_at`; the live application table has only the status-notification trigger, not a status-history trigger. The action does not write an audit-log event. This preserves the latest reviewer metadata but not a durable sequence of prior decisions. Consider an append-only application-status audit event (actor, prior/new status, timestamp, optional reason) if operational or dispute traceability is required. This is an auditability improvement, not a demonstrated authorization bypass.

**Automatic-RLS trigger caveat:** `rls_auto_enable()` catches all exceptions around the ALTER TABLE and only emits a log message. A future table-creation event could therefore complete even if RLS enablement fails. Current inventory is clean (56/56), but the event trigger is defense-in-depth rather than an absolute fail-closed guarantee. Prefer allowing the DDL transaction to fail when RLS cannot be enabled, or add a separate verification gate for newly created public tables.

No database changes, migrations, object operations, workflow reruns, merges, or deployments were performed.


**Cross-workflow concurrency check:** the live `guard_manual_payment_approval()` trigger does re-check that an initial payment still has an `accepted` application at approval time; a sequentially rejected application therefore cannot pass this guard. However, the trigger uses an unlocked `EXISTS` read of `course_applications`, while `reviewCourseApplication()` updates the application status without a shared lock protocol. Two concurrent admin transactions can theoretically interleave: payment approval observes `accepted`, while another transaction changes the application to `rejected`; both may commit, leaving an approved payment/enrollment alongside a rejected application. Treat this as a low-frequency workflow consistency race, not a demonstrated incident. Recommended hardening is to lock the matching application row during initial-payment approval and ensure the status-review path serializes on that same row; add a two-session concurrency test. Existing static tests assert the accepted-application predicate but do not exercise this race.


### Follow-up correction: 0041 source file is present on current audit branch (11 November 2026)

This section supersedes the earlier statement that `0041_align_course_guards_and_application_notifications.sql` was absent from the current branch. A fresh recursive tree and exact file fetch at branch head `ca42af4db8200a867ffe70d61a27531d7c79300f` confirm that `supabase/migrations/0041_align_course_guards_and_application_notifications.sql` is present. Its contents match the recovered historical migration's three principal effects: remove the legacy fixed-price course trigger/function, create the private application-status notification trigger, and install the `ensure_rls` event trigger. The live JMT Test ledger records the migration at version `20261108092457`; the live database contains the expected trigger/function effects. The prior missing-source/fresh-install warning should therefore not be treated as a current branch finding.

**Remaining issue in the migration itself:** `public.rls_auto_enable()` wraps the `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in `EXCEPTION WHEN OTHERS` and only emits a log message. If RLS enablement fails for a newly created public table, the DDL transaction may still succeed with that table unprotected by RLS. Current inventory remains clean: 56/56 public tables have RLS enabled, and the `ensure_rls` event trigger is enabled. Recommended improvement: fail the DDL transaction on an RLS-enable failure (or enforce an equivalent mandatory post-migration RLS verification gate), rather than swallowing the exception. No such failure was observed during this audit.

**Application write boundary confirmation:** live column grants for authenticated users permit INSERT only on application-submission fields and UPDATE only on `status`, `admin_note`, `reviewed_by`, `reviewed_at`, and `updated_at`; row-level admin policy remains the authority for review updates. The server action additionally checks an active admin profile. This is a constrained administrative write path, but it still has no append-only status-history record. Application review and initial-payment approval also lack a shared row-lock protocol, leaving the previously documented theoretical concurrency race. No duplicate open applications were observed at inspection time.

No database changes, migration replay, Storage operations, or runtime impersonation tests were performed.


**Archived-course application transition edge case:** `reviewCourseApplication()` validates the requested status and active-admin identity but does not re-read the parent course's `is_published`, `enrollment_open`, or `archived_at` before setting an application to `accepted`. The archive RPC closes enrollment and unpublishes the course, but does not transition pending applications. Consequently an administrator can accept an application for a course that has since been archived; the acceptance notification may tell the student to proceed, while payment submission and course access remain blocked by the closed/unpublished course. This is a workflow consistency issue, not an access-control bypass. At inspection time the live application/course join returned no rows, so no affected records were observed. Recommended: reject acceptance for archived/closed courses at the database transition boundary, or make archive atomically close pending applications with an explicit reason and notification. Also add a regression test for archive-versus-review ordering.


### Enrollment lifecycle: deactivation, reactivation, archive and restoration (JMT Test, read-only; 11 November 2026)

**Student deactivation/reactivation:** `set_student_account_active()` is an admin-only SECURITY DEFINER RPC with fixed empty search_path. It changes only `profiles.is_active` for a student and writes an audit event; it does not cancel or delete enrollments, alter payment status, or erase learning/attendance history. The live `current_role()` returns a role only when the authenticated profile is active, and current RLS policies use that helper for private student, teacher and admin operations. The old blanket restrictive policy named `active accounts only` is absent from all 56 tables because the migration ledger shows later `remove_broad_active_account_policies` changes; this is not, by itself, a bypass. A focused scan found five authenticated read policies without a direct `current_role()` predicate: academic subject catalogue, singleton academy settings, published concept prerequisites, lesson-concept links (whose parent lesson read is separately RLS-scoped), and published notices/staff. These appear to expose public/catalogue material rather than private student records. No JWT impersonation or runtime access test was performed, so catalog review cannot establish full session behavior.

**Reactivation semantics:** because deactivation preserves enrollments, reactivation restores the profile's role and therefore makes any still-valid active paid enrollment usable again. This is consistent with reversible account suspension, but the product should make clear that deactivation is not cancellation, refund, or permanent access revocation. Admins needing permanent course removal should use an explicit enrollment cancellation/refund workflow rather than account deactivation alone.

**Course archive/restore:** `set_course_archived(true)` sets `archived_at`, `is_published=false`, and `enrollment_open=false`, while retaining enrollments and financial/history rows. `set_course_archived(false)` only clears `archived_at`; it deliberately does not republish the course or reopen enrollment. This is a safe restoration posture requiring an administrator to consciously republish/reopen. Existing active enrollment rows remain stored, but student content policies also check the course is not archived. The archive RPC's update of the course row serializes with payment approval's course-row lock; approval additionally rejects an unpublished course, so an approval racing with archive should serialize and fail after archive commits.

**Live data limitations:** JMT Test currently has zero enrollment rows, zero inactive students with active enrollments, zero active enrollments attached to archived courses, and zero active enrollments whose paid-through date is null/expired. There are therefore no populated lifecycle records against which to validate restoration, reactivation, or payment-history transitions. The absence of records is not evidence that all lifecycle scenarios work.

**Payment approvals for inactive accounts:** the approval RPC checks the admin actor and course/payment conditions but does not reject a payment solely because the target student's profile is inactive. If an admin approves a pending payment while a student is deactivated, the financial record/enrollment may be updated, but the inactive student's `current_role()` remains NULL and private course access remains blocked until reactivation. This is an operational policy choice, not a direct access bypass; clarify whether finance staff should be allowed to reconcile payments for suspended accounts.

No database changes, migration replay, row updates, impersonation, Storage operations, or workflow reruns were performed.


### Role-change and administrative privilege lifecycle (JMT Test, source + live catalog; 11 November 2026)

**Positive controls:** public registration creates student profiles; user-supplied auth metadata does not select a privileged role. The profile table has an UPDATE policy requiring `current_role() = admin` for updates to other profiles, and a self-update policy whose WITH CHECK preserves the caller's current role. A `prevent_self_role_change` trigger blocks a user from changing their own role. The active-profile-aware `current_role()` returns NULL for inactive accounts. The application role-change action independently checks that the actor is an active admin and offers only `student`, `teacher`, or `staff`; the management page searches only profiles whose role is `student`. Authenticated clients have column-level UPDATE privilege on `profiles.role`, but RLS and triggers constrain its use. No non-admin role-change path was identified in the inspected action and catalog.

**Governance gap — database permits admin-role delegation beyond the UI:** the live `admins update any profile` RLS policy is row-wide and authenticated users have UPDATE privilege on the `role` column. The self-change trigger blocks only changes where `auth.uid() = OLD.id`; the identity-protection trigger allows role changes when `current_role() = admin`. Therefore an existing active admin using the direct authenticated Data API can set another profile's role to `admin`, even though the application action/UI intentionally offers only student/teacher/staff and the management search only returns student profiles. This is not an unauthenticated or non-admin privilege escalation; it is a mismatch between the intended application role choices and the database's broader admin delegation capability. No evidence of an actual role promotion incident was found. Recommended: encode the permitted target-role set in a database-owned admin RPC/trigger, explicitly decide whether admin-to-admin delegation is allowed, and test direct Data API attempts for admin, teacher, staff and student actors.

**Auditability gap:** the `updateAccountRole()` action performs a direct `profiles.role` update and does not write an `audit_logs` event. The live profiles triggers inspected are student-code assignment, self-role-change prevention, and student identity protection; none records role changes. A targeted audit-log action search returned no role/teacher/staff change events. Thus role transitions lack an append-only actor/old-role/new-role/time record, unlike student deactivation and course archive operations. Recommended: move role changes to an audited SECURITY DEFINER RPC or add a carefully scoped database audit trigger; capture actor, target, previous role, new role, timestamp and optional reason.

**Scope and limitations:** source inspection and catalog metadata only; no JWT impersonation or direct authenticated mutation was performed. No database changes were made. The result does not establish that the admin delegation capability has been used.



### Privileged RPC and staff-profile disclosure review (JMT Test, source + live catalog; 11 November 2026)

**SECURITY DEFINER inventory:** all inspected SECURITY DEFINER functions have explicit function-level search_path settings. Authenticated-executable privileged functions were reviewed for actor checks and caller-supplied target IDs. The inspected payment approval/rejection, account activation, course archive, revision assignment, lesson completion, simulation completion, quiz submission and practice-answer RPCs derive the actor from `auth.uid()` and apply role/ownership/assignment checks before mutation or disclosure. Admin-only payment-calendar lookup checks the caller's active admin role rather than trusting its supplied student ID. Teacher/staff revision assignment verifies assigned-course scope and active paid student enrollment. No anonymous execution of the inspected privileged mutation RPCs was found; the public teacher-list RPC is a narrow published-course name/ID disclosure.

**Staff profile access over-retains historical relationships — privacy/data-minimization finding:** the live `profiles` SELECT policy delegates teacher/staff access to `can_staff_access_student(id)`. That SECURITY DEFINER helper grants access when the target has *any* enrollment in a course assigned to the caller, without checking enrollment status, current paid-through date, target profile role, or target `is_active`. It also grants access while a payment is pending review for an assigned course. Authenticated users have SELECT privilege on every profile column, including phone, guardian name/phone, date of birth, gender, emergency contact and blood group. As a result, an assigned teacher/staff member can continue reading the full profile of a former, cancelled, expired, or deactivated student indefinitely while the historical enrollment row remains; a pending payment also confers the same broad profile read. This is not an unauthenticated access path and may partly reflect a deliberate historical-support requirement, but the current policy is broader than a current active teaching relationship and exposes more profile data than necessary. Recommended: define the intended support window explicitly; require active/current enrollment for ordinary teacher access (with a separately authorized, time-bounded historical-support path if needed); require target role student where appropriate; and expose only necessary profile columns through a scoped view or role-specific RPC. Test active, expired, cancelled, inactive-account and pending-payment cases using real teacher/staff JWTs.

**Other reviewed boundaries:** `get_assigned_student_enrollments(p_student_ids)` restricts results to courses assigned to the caller's teacher/staff identity; `get_student_payment_calendar(p_student_id)` is admin-only; `get_enabled_payment_instructions()` is active-student-only; `get_public_course_teachers()` returns only teacher/staff names and IDs for published, unarchived courses. The finance-entry insert policy independently requires active admin role and `recorded_by = auth.uid()`; its audit trigger records the insert. Attendance insert/update policies constrain teachers/staff to assigned courses and enrolled students, with the caller as marker for new/updated rows. The audit-log table has no authenticated write policy, so table-level grants alone do not permit direct writes under RLS.

**Limitations:** this was a read-only catalog/source review. No direct authenticated Data API calls, JWT impersonation, role simulation, row mutation, or Storage access tests were performed. The profile-access condition is therefore a policy-derived exposure path, not an observed data extraction or confirmed incident. No database changes were made.



### Storage authorization lifecycle follow-up (JMT Test, read-only catalog + source; 11 November 2026)

**Positive controls:** payment proofs, lab-notebook evidence, lesson materials and student avatars are private buckets. Public access is intentionally limited to course-media objects. Student payment-proof reads and uploads require the caller's active student role and own UUID folder. Notebook-evidence reads require a matching evidence/notebook database row and then owner, admin, or assigned teacher/staff scope; student uploads additionally require the private helper's notebook ownership, editable state, paid enrollment, published lab and subject/course eligibility. Student deletion is limited to own unreferenced evidence/proof objects. Inactive users fail the role helper used by these policies. Removing a teacher's course assignment removes the ordinary assignment-based object access path on subsequent requests.

**Historical relationship caveat extends into Storage:** the student-avatar SELECT policy grants assigned teacher/staff access when any enrollment joins the caller's course assignment; it does not require active/current paid enrollment or an active target profile. The notebook-evidence SELECT policy similarly permits assigned teacher/staff access based on course assignment and evidence/notebook linkage, without checking whether the student's account is active or whether the enrollment remains current. This is consistent with the full-profile helper finding: historical enrollment records can preserve teacher/staff visibility of former students' avatar images and submitted notebook evidence. Evidence access may be a deliberate grading/dispute-retention requirement, but should be an explicit historical-support policy with a documented scope and retention period. Avatar access should normally be limited to current authorized student relationships. This is a policy-derived access path, not an observed misuse.

**Signed URL consideration:** private-bucket authorization is evaluated when the Storage request or signed URL is issued. A previously issued signed URL is a bearer capability and can remain usable until its expiry even after role deactivation or assignment removal; immediate revocation of already issued URLs should not be assumed. Use short expiries for sensitive evidence and avoid persisting/shareable signed URLs in application data. No signed URL issuance path was identified in the reviewed server actions in this pass, and no URL replay test was performed.

**Live object inventory:** the inspected private buckets currently contain zero objects. Therefore no actual object disclosure or retained object-access incident was observed. The policy conclusions are based on live RLS expressions and source inspection; no authenticated upload/download, signed URL, or role-revocation runtime test was performed.

No Storage objects were uploaded, downloaded, deleted, or modified.



### Authentication and session lifecycle review (branch source + live JMT Test function catalog; 11 November 2026)

**Positive controls verified:** public registration does not accept a role field; the `auth.users` trigger `handle_new_user()` provisions profiles with role `student`, has fixed `search_path = pg_catalog, public, pg_temp`, and its live ACL grants execution only to the function owner (trigger invocation remains internal). The auth action normalizes email, enforces an eight-character minimum, and applies sign-in, sign-up and password-reset throttles when the server-only service-role key is configured. The live `consume_auth_rate_limit(text,text,text)` is SECURITY DEFINER with fixed search_path, grants EXECUTE only to `service_role`, validates action and 64-character hash keys, and serializes bucket checks with transaction advisory locks. Limits are 10 sign-ins per email / 15 minutes and 30 per IP / 15 minutes; sign-up and reset limits are 3 per email / hour and 10 per IP / hour. If the optional service-role key is absent, the app deliberately relies on Supabase Auth endpoint/IP limits instead of the database throttle.

**Recovery and redirect controls:** password-reset requests return the same user-facing response regardless of whether the account exists or the provider accepts the request. Reset completion requires an authenticated recovery session and calls Supabase `updateUser`. The confirmation route resolves `next` against the current request and accepts only same-origin destinations, preventing open redirects. The sign-out action invokes Supabase sign-out. The auth trigger is not directly callable by API roles.

**Session and inactive-account handling:** middleware refreshes the Supabase session and checks `profiles.is_active` for protected page prefixes. Profile lookup errors return HTTP 503 rather than allowing access; missing/inactive profiles redirect to the disabled-account page. The middleware is not the sole control: the audited RLS policies and active-role RPC guards also reject inactive actors. This defense-in-depth matters because middleware does not cover every public or API path.

**Configuration item carried forward:** the JMT Test project was previously observed with Supabase leaked-password protection disabled. This is a password-hardening configuration gap, not evidence of compromised credentials. Enable breached-password checks after confirming provider/plan support and testing registration, password reset and password-change flows.

**Limitations:** source and live function ACL/catalog were inspected read-only. No real login, password-reset email, OTP exchange, cookie refresh/replay, logout, disabled-session, brute-force, proxy-header spoofing, or breached-password test was executed. The app's database throttle depends on deployment environment configuration; this pass did not inspect production environment secrets or prove the service-role key is present. Supabase project metadata access did not expose Auth provider/password policy settings for independent live re-verification. Do not infer runtime behavior solely from source.


### API, upload and browser-security review (11 November 2026)

- Finance and student-register CSV export routes require an authenticated, active administrator and return private no-store responses. CSV output quotes cells and neutralizes formula-leading values, including whitespace-prefixed formulas.
- The health endpoint returns only basic application/database reachability. The retired payment-create endpoint returns HTTP 410.
- Lab-notebook evidence download validates its UUID, authenticates the caller, reads the evidence row through RLS, then issues a 60-second signed URL. It accepts no caller-supplied Storage path and uses no service-role key. Redirect headers include private no-store, no-referrer and nosniff.
- Lesson-resource signed URLs are minted only after the resource row is visible through RLS. Student visibility requires a published lesson and current active paid enrollment; assigned teacher/staff and admin access is role-scoped. Signed URLs expire after five minutes.
- Lesson materials are uploaded directly from the browser. Browser `File.type` checks and Storage's allowed-MIME metadata list are not binary-content validation. Unlike payment proofs and practical evidence, this upload path has no server-side signature/container inspection. This is a defense-in-depth risk for a compromised or malicious assigned staff account, not a demonstrated exploit; no unauthorized upload or active-content execution was observed. Recommend server-side validation or quarantine/scanning, safe response headers, sandboxed previews (PDF iframe currently has no sandbox), and storage quotas.
- Student-avatar and public course-cover uploads similarly rely on MIME allowlists/browser-declared type rather than server-side signatures; SVG is not allowlisted. Access remains constrained by owner/admin policies and the public cover bucket's admin write policy.
- Browser headers include CSP, HSTS, nosniff, Referrer-Policy, X-Frame-Options and Permissions-Policy. CSP currently permits `'unsafe-inline'` scripts and broadly allows `https:`/ `wss:` for frames/connections. Recommend a tested nonce-based CSP and exact origin allowlists. No exploitable XSS was demonstrated.
- Limitations: source inspection and read-only JMT Test Storage bucket/RLS inspection only. No HTTP/API impersonation, file upload, signed-URL replay, MIME-confusion, XSS, CSRF, CORS, proxy-origin or abuse tests were run. GitHub code-search results were incomplete and are not proof that no other unsafe rendering sinks exist. Production was not accessed.


## Server actions, CSRF defaults and secrets-handling review (11 November 2026)

**Scope:** reviewed all 20 files under `app/actions/`, `middleware.ts`, `lib/supabase/middleware.ts`, `lib/supabase/server.ts`, `lib/supabase-admin.ts`, `lib/auth-rate-limit.ts`, `next.config.ts`, `.env.example`, and the complete API route inventory on the audit branch.

**Authorization patterns:** privileged actions generally retrieve the authenticated user with Supabase `auth.getUser()`, read the caller's profile, and require `is_active = true` plus the relevant role. Course-specific teacher operations additionally check course assignment in the action or rely on caller-scoped database RLS/RPC checks. Student actions derive the student identity from the authenticated user rather than accepting a student identity as authority from submitted form data. Notification updates constrain the recipient to the authenticated user. These are source-level patterns; no forged server-action request or role impersonation was executed.

**CSRF/origin controls:** `next.config.ts` does not configure a custom `serverActions.allowedOrigins` list. Next.js Server Actions retain their framework-provided Origin-versus-Host validation by default; no source setting disabling that check was found. This is not evidence that every deployment proxy forwards Host/Origin safely. Verify the production reverse-proxy configuration and test legitimate and forged-origin requests in staging before changing this setting. Supabase cookie writes use the SSR library's cookie options; the locale preference cookie is intentionally non-HttpOnly, SameSite=Lax and Secure in production. No live cookie attributes or cross-site request tests were performed.

**Secrets and external integrations:** the privileged Supabase client is isolated in a `server-only` module and reads `SUPABASE_SERVICE_ROLE_KEY` only from the server environment. The reviewed helper using it is the optional authentication rate-limit path; ordinary server actions use the caller's session-bound anon/publishable client. The checked-in `.env.example` contains placeholders for public Supabase settings and no credential values. It explicitly describes manual payment collection and no online wallet gateway credentials. The API route inventory contains no payment-provider webhook handler. This is a bounded source review, not a complete secret-scanning result; no deployment environment values or GitHub secret settings were accessed.

**Action-level residuals:** role checks in the action layer are complemented by database RLS and guarded RPCs, which remain the security boundary for direct Data API requests. Several staff actions permit a broad staff role at the action layer and depend on database policy/RPC assignment checks for course-level scope; retain those database checks and include them in runtime tests. The student profile-update action accepts a date-of-birth string without an action-layer format/date-range check; database type constraints still apply, but a clear server-side validation would improve input hygiene. No cross-account write was demonstrated.

**Configuration hardening:** the CSP finding remains as recorded above: inline scripts are allowed and frame/connect sources accept broad HTTPS/WSS schemes. Use a tested nonce-based policy and explicit required origins. The Server Actions body-size limit is 10 MiB; review it against the largest supported upload and reverse-proxy limits. This pass found no new demonstrated exploit.

**Limitations:** no runtime HTTP requests, forged Origin/Host tests, proxy spoofing, CSRF attempts, browser-cookie inspection, role/JWT impersonation, secret-value inspection, dependency installation/audit, or third-party webhook verification was performed. GitHub code-search indexing returned no usable matches and is not treated as proof of absence. Production was not accessed.


## Dependency advisory cross-check (11 November 2026)

The committed `package-lock.json` resolves the root Next.js dependency to **15.5.29** (the `package.json` range remains `^15.2.4`). The Next.js maintainers' published advisories identify **15.5.29** as patched for the applicable November 3, 2026 15.x issues, including GHSA-7qx7-33qx-rqx2 (SVG rejection bypass), GHSA-f3mh-rxg3-f5g2 (Edge response cookie-header exposure), and GHSA-pc58-hwjq-p385 (self-hosted response framing issue). The official October 14 security update identifies 15.5.28 as the patched 15.x line for the critical image-optimization RCE and Server Actions DoS; the locked 15.5.29 is later than that floor.

Sources checked: Next.js maintainers' [security advisories](https://github.com/vercel/next.js/security/advisories), [SVG advisory](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2), [Edge cookie advisory](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2), [response-framing advisory](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385), and [October 14 security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026).

**Assessment:** no Next.js version finding for the committed lockfile at this review date. Keep `npm ci`/lockfile use in CI and deployment, monitor advisories, and refresh the lockfile deliberately. This is not a full dependency vulnerability scan; no package installation, `npm audit`, build, or runtime test was run.


## Practical-assessment cross-check and practice-attempt privacy verification (11 November 2026)

A suspected notebook-to-assignment association gap was investigated and **not confirmed**. The server action accepts an optional `assignment_id`, but the live database has a separate `BEFORE INSERT OR UPDATE` trigger, `guard_lab_notebook_assignment_link()`, which rejects a non-null assignment unless its ID, course ID and lab ID all match and the assignment is currently published. A second trigger makes the assignment association immutable on update. The assignment foreign key alone would not have enforced this mapping; the trigger does. The live `assignment_id` column is nullable, consistent with standalone notebooks. JMT Test currently contains zero notebook rows and zero practical-assignment rows, so there are no live records to exercise the rule.

The practical-assignment write trigger also independently checks that the lab is published and mapped to the course, and that any selected concept is published and belongs to the lab's subject. Non-admin creation/update is restricted to the authenticated assigned teacher, with the RLS policy also checking course assignment and teacher identity. Existing notebook work is protected from assignment reassignment, and task terms freeze once notebook work exists.

**Practice-attempt identity minimization verified live:** authenticated users have SELECT column privileges only for `question_id`, `selected_option`, `is_correct`, `awarded_marks`, and `answered_at`; `student_id` and other identifying columns are not granted. The assigned-staff row policy and staff analytics RPC further constrain staff access to assigned courses, with analytics suppressing question cohorts below five attempts over the 90-day window. This is a positive control verified from live catalog metadata and function definitions, not an end-to-end Data API test.

No application or database changes were made during this verification.


## Assessment submission versus archived-course access (11 November 2026)

**Finding — lifecycle consistency gap, not a demonstrated data-disclosure or privilege-escalation vulnerability.** The live student read policies for `assignments`, `quizzes`, `quiz_questions`, `written_exams`, and `written_exam_questions` require the parent course to be unarchived. However, the corresponding student submission/start gates are not consistently tied to that same parent-course state:

- `assignment_submissions` INSERT policy requires a published assignment and active paid enrollment but does not join/check `courses.archived_at`.
- `quiz_attempts` INSERT policy requires a published, in-window quiz and active paid enrollment but does not check the parent course archive state.
- `submit_quiz_attempt()` rechecks published quiz, active paid enrollment, quiz schedule and attempt duration, but does not check `courses.archived_at`.
- `written_exam_submissions` INSERT policy requires a published, in-window written exam and active paid enrollment but does not check the parent course archive state.

The archive RPC sets the course `archived_at`, `is_published=false`, and `enrollment_open=false`, but does not unpublish child assignments/quizzes/written exams or deactivate existing enrollments. As a result, a student retaining an active paid enrollment and a known assessment ID may be able to start/submit assessment records after the parent course is archived, even though the normal student SELECT path hides the archived course and its assessment content. For quizzes, a student with already obtained question content could submit a still-open attempt through the RPC after archive. This can create grading/progress records against content that is no longer available through the normal course UI.

**Recommended correction:** centralize a parent-course availability predicate and apply it to assignment submission INSERT/UPDATE, quiz-attempt INSERT and `submit_quiz_attempt()`, and written-exam submission INSERT. Decide explicitly whether already-started attempts may finish after archive; if so, use a recorded attempt-start eligibility/snapshot and bounded completion grace period rather than leaving all assessment submission paths open. Add tests for archived courses with retained active enrollments and stale assessment IDs.

**Live-state check:** JMT Test currently has zero archived courses, zero active enrollments in archived courses, and zero published assignments/quizzes/written exams in archived courses. The state is therefore not currently exercised. The finding is derived from live policy/function definitions and archive RPC source; no authenticated runtime request was made. Existing assignment due-date enforcement remains a separately documented concern.


## Assessment scoring and learning-progress integrity pass (11 November 2026)

### Positive controls verified
- `submit_quiz_attempt()` is a SECURITY DEFINER RPC with a fixed search_path. It requires the authenticated active student, validates answer JSON shape and question/option membership, locks the student's unsubmitted attempt row, rechecks quiz publication, active paid enrollment, schedule and attempt duration, then computes earned and possible marks from database question rows and protected answer keys. It does not accept a client-supplied score.
- A unique `(quiz_id, student_id)` constraint permits only one attempt per student per quiz. The submission RPC requires an unsubmitted attempt and locks it FOR UPDATE, preventing repeat submission of the same attempt.
- Quiz and written-exam answer keys have RLS read policies for admins and the creating assigned teacher/staff only; student SELECT is not granted by policy. Student-visible question rows are separate from answer-key rows.
- Published quiz/written-exam question content and answer keys are locked against ordinary teacher/staff changes by database triggers. Publishing actions check that each question has an answer key.
- Assignment and written-exam submission grading updates are course-assignment scoped; database triggers make submitted answer/ownership/timestamp fields immutable during grading and validate marks/score against the parent assessment maximum. Students cannot write grading fields.
- Lesson completion RPC writes `lesson_progress` and the unique lesson-completion event in one transaction. A partial unique index on `learning_events(student_id, lesson_id)` for lesson_completed prevents duplicate completion events; quiz attempts are unique per student/quiz; practical review events are unique per student/source.
- Mastery values and confidence are constrained to 0..1; evidence_count is nonnegative. Learning-event score_percent is constrained to 0..100. Revision tasks have bounded priority/status and a partial unique index preventing more than one pending task per student/concept.
- Quiz submission triggers derive learning events, concept mastery, mistake memory and revision tasks from the stored answer key and scored attempt. These are transactional trigger effects of the score update.

### Finding — direct lesson-progress writes can bypass event-driven side effects
The live `lesson_progress` student INSERT policy allows a student to insert their own completed row for a published lesson with an active paid enrollment and recent timestamps. The student UPDATE policy also allows an existing incomplete row to become completed. There is no live trigger on `lesson_progress` to create a corresponding `learning_events` row. The normal application path uses `record_lesson_completion()`, which writes both records atomically, but the underlying authenticated table policy also permits direct PostgREST writes.

Therefore a student can create/update their own completion state without generating the corresponding learning event. The dashboard's study-goal increments and lesson-completion spaced-revision scheduling are driven by learning-event triggers, so this direct path can leave completion progress true while goals/revision evidence remains absent. Conversely, the separate learning-event INSERT policy permits a lesson_completed event only after a matching completed lesson_progress row exists, but does not force both writes to be atomic.

**Recommended correction:** make the RPC the sole student write path for lesson completion (revoke direct student INSERT/UPDATE on `lesson_progress` and use a carefully scoped SECURITY DEFINER RPC), or add a database trigger that reliably emits the event on the first transition to completed. Ensure event uniqueness and avoid double-counting when the RPC is retained. Test direct PostgREST writes and concurrent completion requests.

### Finding — Exam War Room silently omits concepts already queued for revision
`create_exam_war_room_target()` orders published course concepts by weakest evidence-backed mastery and inserts `revision_tasks` with `source_type='exam_plan'` and `source_id=target_id`. The partial unique index `revision_tasks_one_pending_concept` prevents duplicate pending tasks for the same student/concept. When a concept already has a pending task from another source, the INSERT uses `ON CONFLICT ... DO NOTHING`; it neither associates the existing task with the new target nor records it in the target's plan. The RPC still sets `plan_generated_at` and returns success. The Exam War Room page then fetches tasks only by the new target's source_id and can show zero tasks / "No concepts are mapped" even though eligible concepts exist and were skipped due to the conflict.

This is a plan completeness / misleading status issue, not an access-control vulnerability. **Recommended correction:** either associate existing pending tasks with the plan in a normalized join table, generate plan-specific task instances, or return/report skipped-conflict counts and distinguish "no mapped concepts" from "all concepts already have pending tasks."

### Live-state and verification limitations
At inspection, JMT Test contained zero rows in `learning_events`, `quiz_attempts`, `learner_concept_mastery`, and `revision_tasks`. Thus no real progress/score histories were available to validate aggregate outcomes or detect historical duplicates. The positive controls and gaps above are based on live JMT Test policy/function/index/trigger definitions and checked application source; no authenticated student runtime or concurrent-request tests were performed. These findings are specific to JMT Test, not proof of production state.


### Finding — historical enrollment preserves teaching-staff visibility of learning records
The live SELECT policies for `learning_events`, `learner_concept_mastery`, and `revision_tasks` allow assigned teacher/staff access when the student has an enrollment row for the assigned course. Unlike some of the current-content and submission policies, these three policy predicates do not require enrollment status = active, a current paid-through date, or an active student profile. A teacher/staff member who is currently assigned to a course can therefore retain visibility into a former student's learning-event history, mastery scores/confidence, and revision queue for as long as the enrollment row remains.

This is policy-derived historical access, not evidence of unauthorized access by an unassigned user. It may be justified for grading, support, or dispute resolution, but the scope and retention period should be explicit because these are individual educational-performance records. **Recommended correction:** use a defined current-access predicate for routine teaching views and a separately authorized, time-bounded historical-support path; consider a minimized reporting view/RPC rather than broad historical row access. JMT Test had zero learning events/mastery/revision-task rows at inspection, so no record-level access was demonstrated.


## Assessment publication atomicity and first-attempt race (11 November 2026)

**Finding — an administrator can publish an assessment before its questions and answer keys are fully created.** The current `createQuiz()` action inserts the parent quiz with `published: role==='admin' && formData.get('published')==='on'`, then performs separate requests to insert quiz questions and then answer keys. `createWrittenExam()` follows the same parent-first pattern and may insert a published parent before inserting question rows and answer keys. These are separate database transactions, not one atomic operation.

The live `enforce_assessment_content_draft_integrity()` trigger intentionally bypasses all content checks for an admin. Therefore, when an admin creates an immediately published quiz, the parent row becomes visible as published before its questions/keys exist, and the subsequent child inserts are still permitted. The live `quizzes scoped read` and `students create own quiz attempts` policies accept a published quiz for an active paid student. The `quiz_published_notification` trigger also fires on the initial INSERT. In this short interval, a student can potentially be notified, open the quiz, and start an attempt before its content is complete.

The live `submit_quiz_attempt()` function does not reject a zero-question quiz or a zero possible-mark total: its score query uses `COALESCE(sum(...),0)`, updates the attempt as submitted with score and total_marks both zero, and returns success. The one-attempt-per-student/quiz constraint then prevents the student from starting a replacement attempt after the questions arrive. This can permanently consume that student's attempt with a zero-mark result. If the student starts after question insertion but before answer-key insertion, the score query's inner join to answer keys can likewise omit not-yet-keyed questions; publication completeness is only checked by the separate later admin publication action, not by the create path before initial publication.

Written-exam creation has the analogous parent-first publication window; a student submission may be accepted after question insertion but before answer keys are inserted, although the exact consequence depends on grading flow. The strongest confirmed impact is the quiz zero-question/partial-key attempt race.

**Recommended correction:** never create a parent assessment as published. Insert parent, all questions, and all answer keys in a single SECURITY DEFINER transaction/RPC (or create as draft and call a separate completeness-checking publication action only after all children are committed). Independently harden `submit_quiz_attempt()` to reject zero questions, zero total marks, and any mismatch between quiz questions and answer-key rows; compute possible marks from the complete question set and verify every question has a key. Add concurrency tests that attempt to start/submit while assessment creation is in progress.

**Test-coverage gap:** `tests/assessment-publication-workflow.test.mjs` checks the separate publish actions for completeness, and `tests/assessment-publication-lock.test.mjs` checks post-publication content locks. Neither asserts that immediate publication is disabled during the multi-request create flow, that creation is atomic, or that `submit_quiz_attempt()` rejects zero/incomplete question sets. Existing quiz attempt tests do not exercise this race.

**Live-state and verification limits:** JMT Test has the publication-lock triggers and policies described above. No authenticated concurrency test was performed and no current exploit/affected student attempt was observed. This is a source-and-policy-derived race condition, not evidence of actual user impact.


## Quiz option payload validation gap (11 November 2026)

**Finding — quiz builders and the database validate the options container but not its elements.** In `createQuiz()`, the server action requires `options` to be an array with 2–6 entries, but does not require each entry to be a non-empty string. The live `quiz_questions_options_check` constraint likewise checks only that `options` is a JSON array with 2–6 elements. The question-bank builder validates four non-empty strings in its own action, but this does not protect the direct JSON quiz builder or database writes through other permitted paths.

The student quiz UI renders each option as a React child. A JSON option containing an object (for example, `{"label":"A"}`) can be stored and later passed as an object child, which React does not render as a valid child and can cause the quiz page to throw. Numeric, boolean, null, empty-string, or whitespace-only elements can also create malformed or blank choices. The answer-submission RPC validates that the selected numeric index is within the array length, but cannot repair malformed display data.

**Recommended correction:** validate every option as a trimmed, non-empty string with a sensible per-option length cap in the server action and a database CHECK/trigger that enforces the same shape for all write paths. Consider a uniqueness check after normalization to prevent indistinguishable duplicate choices. Add tests for objects, nested arrays, nulls, numbers, blank strings, oversized strings, and valid options; include a database-level test, not only action-source matching.

**Test-coverage gap:** the existing quiz submission integrity test checks numeric answer indices against `jsonb_array_length(options)`; the publication tests check question/key completeness. Neither checks each stored option's JSON type or text validity. The written-exam builder separately validates MCQ option strings, so this finding is specific to the quiz-question creation/database path.

**Verification limits:** this was confirmed from the branch action source, live JMT Test constraint definition, and student rendering source. No malformed question was inserted and no student-facing runtime failure was induced. The live JMT Test question rows were not available to demonstrate an affected record.


## Learning OS mastery summary uses only the lowest 12 concepts (11 November 2026)

**Reporting-integrity finding — “Average mastery” is not an all-concept average.** The student dashboard query in `app/student/page.tsx` orders `learner_concept_mastery` by `mastery_score` ascending and limits the result to 12 rows. `components/learning-os-dashboard.tsx` computes `averageMastery` from only those rows but labels it “Average mastery”; it also labels the returned row count “Topics tracked”. For students with more than 12 concept records, this is the mean and count of the lowest-scoring subset, not overall mastery and total tracked topics.

**Recommended correction:** use a database aggregate for total concept count and a clearly defined overall mastery measure, while retaining the lowest-12 query for targeted topic cards. Label the subset as weakest/lowest-mastery topics. Add a regression test with more than 12 concepts and distinct aggregate values.

**Verification limits:** source-code confirmed. The inspected JMT Test mastery table contained zero rows; no live student's displayed aggregate was observed. This is a reporting-accuracy issue, not an authorization or score-forgery finding.


## Revision completion permits early completion of future tasks (11 November 2026)

**Learning-integrity finding — no due-time check in the completion RPC.** The live `complete_revision_task(uuid)` function locks any pending task owned by the authenticated student and marks it completed without checking `scheduled_for`. The student dashboard exposes a completion action for all pending tasks, including future-dated tasks. Early completion increments the completed-task count used to choose the next spaced-repetition interval and creates the next task relative to the premature completion time.

**Recommended correction:** reject completion unless `scheduled_for <= now()` inside the database function, and distinguish future scheduled tasks from actionable due tasks in the UI. Add a database/RPC regression test for future and due tasks.

**Verification limits:** function definition and dashboard source confirmed; no live task was available to exercise the case. No runtime mutation or impersonated-user test was performed.


## Cross-source mastery weighting and revision-task conflict handling (11 November 2026)

**Learning-integrity finding — quiz and practical evidence are not weighted on a common unit.** The live quiz evidence trigger adds the number of tagged questions for a concept to evidence_count; the practical-review mastery trigger adds one per review event. Both calculate the running mastery score by weighting each new score by that count. Consequently, a multi-question quiz may outweigh a practical assessment several-fold, although each is one assessment event and a practical score may summarize multiple rubric criteria. No shared evidence-unit definition is encoded in the schema or the reviewed trigger logic.

**Impact:** mastery aggregates across assessment modalities may reflect question count more than comparable learning evidence. This is an analytics/learning-integrity concern, not an authorization bypass.

**Revision scheduling interaction:** the quiz, practical-review and lesson-completion triggers all use the partial unique index revision_tasks_one_pending_concept with ON CONFLICT DO NOTHING. The index prevents duplicate pending tasks, but a later weak quiz/practical result cannot update an already-pending task for that concept. If the existing task is scheduled farther in the future, its due date and priority remain unchanged; the newly indicated earlier/higher-priority review is silently dropped. The same conflict behavior also prevents later lesson evidence from reconciling an existing pending task.

**Recommended correction:** define a common mastery evidence unit and normalize or explicitly justify the relative weights across assessment types. On pending-task conflict, update the task to the earlier due time and higher priority where appropriate, and retain evidence provenance (for example, in a related evidence table or metadata/history) instead of silently ignoring the newer trigger. Add behavior-level regression tests for mixed quiz/practical weighting, repeated events, and low-scoring evidence arriving while a later-dated pending task already exists.

**Test-coverage gap:** the inspected quiz-evidence test checks for the trigger and mastery/revision writes but not numerical weighting; the Exam War Room and lesson-progress tests check selected source/migration patterns rather than interactions among quiz, practical, lesson and revision evidence. No behavior-level mixed-source regression test was identified in the inspected set.

**Verification limits:** confirmed from the live JMT Test function definitions, trigger bindings and partial unique indexes, and the branch quiz migration/test sources. The JMT Test learning_events, learner_concept_mastery, revision_tasks and quiz_attempts tables each contained zero rows at inspection. No learner data was created or changed; the impact is inferred from the verified database logic.


## Derived learning-event fan-out can trip the per-student rate limit during quiz submission (11 November 2026)

**Availability finding — a single assessment action can consume most of its own event-row rate limit.** The live learning_events BEFORE INSERT trigger applies a limit of 60 rows per student per minute. The quiz evidence AFTER UPDATE trigger writes one general exam_submitted event plus one event per distinct tagged concept. The quiz builder allows up to 50 questions, each independently tagged to a concept, so a single submission can generate up to 51 rows. If the student has already generated 10 or more recent learning_events rows, the next insertion can hit the threshold. The exception is raised inside the quiz_attempts update transaction, so the attempt's score/submitted_at update and all event/mastery side effects roll back together.

**Impact:** valid quiz submissions can fail due to ordinary recent learning activity, even though the student has not performed 60 separate actions. This is an availability and progress-integrity issue, not an authorization bypass.

**Recommended correction:** apply limits to logical actions (quiz submission RPCs) rather than each derived event row, or perform one parent-action budget check and exempt internal fan-out rows. Add an integration test for a maximum-size, many-concept quiz with prior events near the threshold, asserting atomic success/failure semantics and preserving abuse protection.

**Test-coverage gap:** the inspected tests assert the quiz evidence trigger and event rate-limit source separately, but do not exercise their combined trigger chain, event fan-out, or transaction rollback under the threshold.

**Verification limits:** live JMT Test function/trigger definitions and branch quiz builder confirm the mechanics and limits. No live quiz or learning-event data existed to reproduce an affected learner case; no data was modified.


## Practical-review event replay protection (positive control, 11 November 2026)

The practical-review event path has a coherent round-level deduplication control: `lab_notebook_review_history` enforces unique `(notebook_id, review_round)`, and `learning_events` enforces a partial unique `(student_id, source_id)` for `practical_reviewed`. The AFTER INSERT trigger uses `ON CONFLICT DO NOTHING`. Replaying the same history row therefore cannot create a second mastery event; a distinct review round remains distinct evidence. This does not remove the previously documented cross-modality weighting or pending-task reconciliation issues.

**Verification limits:** live JMT Test indexes and trigger definition confirmed; no populated review history was available for runtime testing.


## Administrator override bypasses published-quiz content immutability (11 November 2026)

**Positive control:** live `enforce_assessment_content_draft_integrity()` blocks teacher/staff edits to published quiz questions and answer keys and blocks staff deletion of published quizzes. The application publish action checks for 1–50 questions and a key for every question before publication.

**Residual admin-level integrity gap:** the trigger short-circuits for administrators before checking publication state or existing attempts. Admin policies permit updating/deleting published quizzes, questions and answer keys. No attempt-count guard or immutable version snapshot was found in the inspected logic. Post-submission edits to questions/answer keys can make stored scores, mastery and mistake-memory snapshots inconsistent with the current assessment definition. Deleting a quiz cascades to quiz_attempts and quiz questions/answer keys; derived learning events and mistake-memory rows have no corresponding FK to the deleted quiz/attempt in the inspected schema and may remain as orphaned learning history.

**Impact:** administrator-only governance and historical data-integrity risk, not an end-user authorization bypass. Accidental deletion can destroy attempt records; edits can undermine the reproducibility of prior grading.

**Recommended correction:** enforce immutability after first attempt for all roles; use versioned assessments and append-only correction/regrade audit events. Prefer soft deletion and preserve attempts/source lineage. If admin override is essential, require a separate audited procedure with reason and affected-attempt accounting.

**Verification limits:** live JMT Test trigger, policies and FK rules plus branch quiz action confirmed; no populated quiz/attempt rows were available for runtime validation. No data was changed.


## Written-exam grading is mutable and has no durable regrade history (11 November 2026)

`gradeWrittenExam()` allows an admin or assigned teacher/staff member to update a submission's score, feedback, grader and grading timestamp. Live RLS and database triggers validate role/scope, score bounds, grader identity and preserve the submitted answers and ownership. But the update guard does not require `OLD.score IS NULL`, and no append-only grade-history relation was found. An authorized subsequent grade action can overwrite the prior score/feedback/grader/time in place. A repeat notification is not a substitute for an immutable audit record.

**Impact:** assessment appeal/auditability gap, not unauthorized grading. **Correction:** append each grade/regrade with old/new values, actor, timestamp, reason and approval reference; require a reason after initial grading and test concurrent changes.

**Verification limits:** branch action plus live UPDATE policy, column grants and grade triggers inspected. No submissions existed for runtime testing.

## Written-exam content can also be overridden or deleted by administrators after publication (11 November 2026)

The published-content trigger protects written-exam headers, questions and answer keys from teacher/staff changes, but short-circuits for admins. Admin policies permit update/delete of these rows. Unlike the teacher/staff exam-delete policy, the admin delete policy does not require absence of submissions. The live FK from `written_exam_submissions.exam_id` cascades on exam deletion, so an administrator can delete the exam and its submission records. Editing model answers/rubrics after grading can also undermine reproducibility of marks.

**Correction:** immutable versioned exam content after publication/first attempt, soft deletion, and append-only audited correction/regrade records. **Verification limits:** live policies, trigger and FK rules confirmed; no written-exam records existed for runtime validation.


## Written exam may be visible and accept an attempt before answer-key creation finishes (11 November 2026)

The administrator path in `createWrittenExam()` can insert the parent exam with `published=true`, then inserts questions and answer keys in separate requests. The content-integrity trigger bypasses administrators. Student read policies allow a published exam and its questions to be read. The student submission policy verifies answer-object cardinality and question IDs, but does not require a matching answer-key row for each question. Thus, between question insertion and answer-key insertion, a student can submit and consume the unique one-attempt slot while the exam is not fully initialized. Cleanup after a later insert failure is a separate compensating request and is not atomic.

**Impact:** publication readiness and attempt fairness risk, not answer-key disclosure. **Correction:** always create unpublished; publish transactionally after DB-side validation of all questions, answer keys, types and marks; add a submission-time completeness guard. **Limits:** source and live policies/constraints inspected; no runtime race/data present; no changes made.


## Assessment total marks can diverge from the sum of question marks

The live schema constrains question marks to positive values and assessment header totals to non-negative/positive values, but does not enforce `header.total_marks = SUM(question.marks)`. Quiz and written-exam publication actions validate question/key completeness but do not reconcile this aggregate. Admin RLS permits updates to headers and questions, and the assessment-content trigger bypasses admin changes. A valid administrative edit can therefore leave the stored grading ceiling different from the marks available across the questions.

**Impact:** grading/score-normalization inconsistency, not student privilege escalation. **Correction:** transactional publication-time aggregate validation, atomic draft recalculation, and versioned corrections after publication. **Limits:** live constraints, policies and trigger inspected; JMT Test contains no quiz or written-exam rows, so no mismatch observed; no changes made.


## Quiz submission can finalize against an incomplete answer-key set

The live `submit_quiz_attempt` RPC validates submitted question IDs and option indexes, but computes both earned and possible marks using an inner join between quiz questions and answer keys. It does not require a non-empty question set or one key for every question, nor compare the computed possible marks with the quiz header total. During the published-before-keys creation window, or after an administrator leaves keys incomplete, the RPC can finalize the one allowed attempt using only keyed questions. With zero keys it can store a submitted attempt with score and total marks both zero; with partial keys it can calculate an inflated score from only those questions. The learning-evidence trigger skips the zero-total case.

**Positive controls:** active attempt row is locked `FOR UPDATE`, invalid question IDs/options are rejected, and a unique `(quiz_id, student_id)` constraint prevents duplicate attempt rows. **Impact:** scoring integrity and fairness, not answer-key disclosure or cross-student access. **Correction:** database-side submission readiness validation for non-empty questions, complete unique key coverage, valid key indexes, and mark-total reconciliation. **Limits:** live function, RLS and constraints inspected; no quiz/attempt rows in JMT Test; no data changed.


## Quiz expiry can strand the student's only attempt

`startQuiz()` creates a single attempt row with a server timestamp. If an attempt already exists, it reuses it; it does not reset an unsubmitted row. The submission RPC rejects an unsubmitted attempt after `started_at + duration_minutes + 1 minute`. The academic page does not fetch `started_at`, show a countdown, auto-submit, or provide a recovery/reset path. The still-unsubmitted row remains the unique `(quiz_id, student_id)` attempt, so after expiry the student cannot submit or start again; repeated submissions return the expiry error. Network loss or abandonment can therefore permanently consume the only attempt without a result.

**Impact:** availability/fairness, not unauthorized access. **Correction:** add explicit expiry state and a documented recovery policy (for example, atomic auto-submit, audited staff reset, or bounded resume), plus server-derived timer and idempotent retry tests. **Limits:** source action/page and live RPC/unique constraint inspected; no JMT Test attempt rows and no runtime session simulation; no data changed.


## Published student-practice content is mutable after learner attempts

Assigned teachers/staff and admins can update published `student_practice_questions` rows, including options and `correct_option`. The RLS policy checks course assignment/role but not publication state or prior attempts. The only live question trigger validates content/scope; it does not enforce immutability or versioning.

The analytics RPC aggregates historical selected-option indexes and correctness flags, while the teacher analytics page joins those aggregates to the current question row and current answer key/options. A post-attempt edit can therefore make historical accuracy and distractor signals disagree with the version learners answered. No immutable version reference is stored with attempts for analytics reconstruction.

**Impact:** assessment-history and analytics integrity, not learner privilege escalation. **Remediation:** freeze published question content after first attempt, or version question content and bind each attempt/aggregate to its immutable version; retain original key/options and use audited regrading for corrections. **Limits:** confirmed from branch action/page, live policy and trigger inventory; JMT Test has no practice questions or attempts, and no writes/runtime learner tests were performed.


## Practice mistake-memory repeat counter cannot be reached

The practice RPC enforces one attempt per student/question with a unique constraint and raises on duplicate submission before updating mistake memory. The mistake-memory upsert uses the same student/source-question identity and contains an `occurrence_count + 1` conflict handler, but a second answer to that question is rejected before that upsert. The successful-answer branch that resolves a prior mistake for the same question is also unreachable after the first attempt under this policy.

**Impact:** repeated-error tracking and wrong-then-correct recovery are not implemented as the code suggests; this is a learning correctness gap, not an access-control issue. **Remediation:** either support append-only multiple attempts and aggregate mistake memory across them, or retain one-attempt semantics and redesign the memory model/UI to avoid promising repeat counts and same-question recovery. Add tests for the chosen behavior. **Limits:** branch RPC and live unique constraint inspected; no practice data exists in JMT Test and no runtime session was performed.


## Practice question lifecycle controls are missing from staff UI

The staff practice page/action only create questions; there is no existing-question inventory or UI action to edit, unpublish, archive or delete. Yet authenticated assigned staff/admin have UPDATE grants and an RLS UPDATE policy that includes `is_published`, so direct Data API mutation remains possible outside the normal workflow.

**Impact:** content-governance and operational correction gap. This makes safe review/retirement awkward and compounds the historical-version integrity risk. **Remediation:** provide a scoped inventory and audited edit/unpublish/retire workflow; version content once attempts exist; restrict direct table writes if only server actions should be used. **Limits:** source page/action and live grants/policy inspected; JMT Test has no practice questions or attempts, and no writes were made.


## Practice analytics totals are totals of reportable cohorts only

The database RPC suppresses question cohorts with fewer than five responses. The page sums only returned aggregates but presents the result as “Student attempts” and overall accuracy for the last 90 days, without saying that low-volume cohorts are excluded. This is not a privacy bypass; it is a reporting-integrity caveat. Label the KPIs as reportable-cohort totals/accuracy, or design a separately privacy-reviewed grand total. Also distinguish RPC failure from a confirmed empty dataset rather than presenting the no-responses empty state after a failed query.

**Limits:** source page and live JMT Test RPC definition inspected; no practice questions or attempts exist in JMT Test, so no numeric output was available to validate.


## Written-exam and assignment grades do not feed adaptive learning evidence

The deployed JMT Test trigger inventory contains learning-evidence capture for quiz attempts and reviewed practical-review history, but no corresponding trigger for `written_exam_submissions` or `assignment_submissions`. The application grading actions in `app/actions/academic.ts` only update the grade/feedback/grader metadata and return; they do not emit learning events or update mastery. Written-exam questions and assignments also lack the concept-level mapping needed for reliable attribution in the reviewed creation workflow.

**Impact:** learner mastery and revision recommendations omit these assessment outcomes. This is a product/learning coverage gap, not a privilege escalation. Avoid presenting adaptive mastery as a complete summary of all graded academic work.

**Remediation:** define eligible assessment types, add explicit reviewed concept mappings where defensible, and create source-linked immutable learning evidence in the same transaction as grading. Preserve grade revisions and make event generation idempotent. Do not infer concept attribution from a course-level grade alone.

**Limits:** live JMT Test triggers/functions and branch grading actions/schema inspected. No written-exam or assignment submissions exist in the test project; no writes or runtime grading tests were performed.


## Student assignment results and feedback are not surfaced in the learner portal

The Academic Centre retrieves assignment submissions for the current course set, but only renders those rows in the staff-only marking queue. The student-facing assignment cards do not join the authenticated student's existing submission to the assignment and always show the submission form; they do not show whether work was received, when it was submitted, whether it is awaiting marking, or any saved marks/teacher feedback. The assignment action can update an existing ungraded submission and rejects an update once it is graded, but the learner has no corresponding result/feedback view in this page.

**Security interpretation:** no cross-student disclosure or student grade-write bypass was established. The query is subject to row-level policies, and the grading-field protections remain in place. This is an assessment-transparency and user-facing status gap that may cause learners to mistake an already-submitted assignment for an unsubmitted one or miss feedback. **Remediation:** add a student-scoped submission lookup and render explicit not-submitted, submitted/pending, and graded states with timestamp, marks and feedback; only expose resubmission while the submission is ungraded and policy permits it. Test the full lifecycle and verify that one student's submission never appears for another.

**Verification limits:** branch Academic Centre/action and live assignment submission policies/column grants inspected. JMT Test has no assignment submission rows; no live student-session test or database write was performed.


## Assessment staff queues are capped at 100 submissions without pagination

The Academic Centre queries assignment submissions with a hard limit of 100 rows and no explicit ordering, and written-exam submissions with a newest-first limit of 100. Staff marking views render only those returned rows and have no pagination or indication that more records exist. Database RLS continues to scope teacher/staff reads to assigned courses, so this is not an authorization leak; it is a completeness and operational risk. In larger cohorts, submissions outside the returned page may be missed during marking even though they remain in the database.

**Remediation:** implement stable cursor/offset pagination, assessment/course filters, and visible total/remaining counts; verify every submission remains reachable beyond the first 100. **Verification limits:** branch query/rendering and live scoped-read policies inspected. JMT Test has no assignment or written-exam submissions; no data was changed.


## Quiz result history loses assessment context outside the current quiz catalogue

The Academic Centre loads quiz attempts for the signed-in student but maps each result to a title only through the current quiz list, which is capped at 60 newest quizzes. The live student quiz-read policy further limits that list to published quizzes in currently active, paid, non-archived course enrolments. The results table still renders submitted attempts that are not represented in that catalogue, using the generic title “Test”. Thus, after the quiz ages out of the 60-row list or the learner's enrolment expires/course is archived, the learner may retain a score row but lose the assessment title/context. The attempts query is also unpaginated and unordered.

**Security interpretation:** the RLS restriction is protective and should not be weakened merely to recover titles; no cross-student access or score tampering was identified. This is a historical auditability and scalability issue. **Remediation:** preserve a non-sensitive assessment-title snapshot on the attempt or provide a dedicated student-owned historical metadata view that exposes no answer keys/question content; paginate in stable order. Test archived/expired enrolments and older-than-60 quiz history.

**Verification limits:** branch Academic Centre query/rendering and live quiz/attempt RLS policies inspected. JMT Test has no quiz attempts; no populated history test or data change was performed.


## Learning dashboard counts completed goals as current goals (11 November 2026)

The student dashboard query deliberately retrieves both `active` and `completed` study goals, but the headline KPI displays `goals.length` with the label “Current goals”. Completed goals therefore inflate the current-goal count and the metric is not a count of currently active goals. The query is also capped at eight rows, so the headline is a count of only the returned subset rather than a total across all goals.

**Impact:** misleading learner-facing progress summary; no access-control or underlying goal-data integrity issue. **Remediation:** calculate active and completed counts separately, label them accurately, and use a count query or pagination if the KPI is intended to represent all goals. **Verification limits:** branch student dashboard query and KPI rendering inspected. No learner goal rows were available for runtime comparison; no data was changed.


## Learning recommendation discovery is silently capped (11 November 2026)

The student dashboard builds evidence-backed lesson recommendations from a maximum of 300 published lesson candidates, with no explicit ordering or pagination. Due-review discovery separately caps concept-to-lesson mappings at 200 and then eligible published lessons at 100, also without pagination. These are hard result limits applied before recommendation ranking and display; in larger courses or concept graphs, qualifying lessons/reviews beyond the returned subsets can be omitted without a warning. The recommendation list can therefore be incomplete even when eligible mapped lessons exist.

**Impact:** incomplete learner guidance and potentially missed due reviews; no access-control bypass or evidence tampering identified. **Remediation:** query by the relevant concept IDs and eligible course IDs with stable ordering and pagination, or use a bounded server-side join/RPC that ranks all qualifying candidates before applying the final display limit. Expose truncation when a deliberate cap is retained. **Verification limits:** student dashboard query and ranking flow inspected at the current branch head. JMT Test has no populated learner evidence to reproduce a missed recommendation; no data was changed.


## Assignment resubmissions erase prior ungraded work without preserving a version history

The student action updates an existing ungraded `assignment_submissions` row in place, replacing `answer_text` and `attachment_url`. The live schema has only the current `assignment_submissions` table and no submission-revision/history table. Its update trigger protects ownership and grading fields but intentionally allows students to change the answer and attachment while ungraded; no trigger captures the old values. The original `submitted_at` is not changed by the application action, so it can appear to timestamp content that was actually edited later.

**Security interpretation:** the own-row RLS policy and narrow UPDATE column grants prevent students from changing another learner's submission or grading fields, and the trigger protects the grader/score. The issue is loss of assessment evidence: an earlier ungraded version cannot be reconstructed or compared after a resubmission. **Remediation:** append immutable revisions with server timestamps and actor identity, retain the current revision pointer, and snapshot the version presented for grading. At minimum, maintain a separate `last_edited_at` and distinguish initial submission time from last revision time. **Verification limits:** branch action, live UPDATE policy/column grants, trigger inventory and table inventory inspected; JMT Test has no assignment submissions and no data was changed.


## Written-exam submission timestamps are client-controlled and can be backdated

Authenticated users have INSERT privilege on `written_exam_submissions.submitted_at`. The live student INSERT policy rejects timestamps more than 30 seconds in the future but imposes no lower bound; its separate exam-window predicate checks the current database time, not the supplied timestamp. The INSERT trigger blocks student-supplied grade fields but does not replace or validate `submitted_at`. The normal server action uses the server clock, but a student can bypass that action and insert through the authenticated Data API.

**Impact:** an in-window submission can be recorded with an arbitrary earlier timestamp, undermining the reliability of submission chronology and any staff review or dispute process that relies on that field. This is not evidence of a way to submit after the exam closes: the RLS predicate independently requires current time to be within starts_at/ends_at. **Remediation:** enforce `submitted_at = now()` in a BEFORE INSERT trigger or remove the student-supplied column privilege and use a database default. **Verification limits:** live grants, RLS, trigger and action inspected; no populated submissions in JMT Test and no writes performed.


## Practice-question SECURITY DEFINER RPCs omit the course publication gate

The student course SELECT policy requires `courses.is_published = true`. The authenticated SECURITY DEFINER functions `get_student_practice_questions` and `submit_student_practice_answer` check `archived_at IS NULL`, but omit `courses.is_published`. They still enforce student role, question publication, active paid enrollment and course-subject membership; the answer RPC returns the correct option and explanation. As SECURITY DEFINER functions, they do not inherit the student's course-row visibility policy.

**Impact:** if a course is unpublished without being archived, an already-enrolled student can continue accessing its practice-question content and answer feedback through direct RPC calls, despite the course being hidden by the student course policy. This does not bypass enrollment or question-publication checks. **Remediation:** require `c.is_published IS TRUE` in both functions and review equivalent content RPCs; alternatively, document and consistently implement a policy that existing enrolled students retain access after unpublishing. **Limits:** live policies, function definitions and execute grants inspected; no student JWT invocation or database write was performed.


## Parent-course unpublishing is not enforced by multiple child-content RLS policies and learning RPCs

The student-facing SELECT policies on `lessons`, `chapters`, `lesson_resources`, `assignments`, `quizzes`, `quiz_questions`, `written_exams` and `virtual_lab_catalog` require published child content, active paid enrollment and a non-archived parent course, but omit `courses.is_published`. In contrast, the student course SELECT policy requires the course itself to be published. The SECURITY DEFINER functions `record_lesson_completion` and `record_simulation_completion` also omit the parent publication check (the practice-question RPC gap is recorded separately).

**Impact:** unpublishing a course without archiving it hides the course row but does not consistently revoke direct access to its published child content for existing active-paid learners; some completion RPCs can also record learning activity. Enrollment and child-publication checks remain in place, and archived courses are blocked by these predicates. **Remediation:** decide whether unpublishing suspends enrolled-student access. If yes, join and require `courses.is_published IS TRUE` in each child-content policy and relevant SECURITY DEFINER function. If not, align course visibility and documentation with continued child access. Add policy-matrix tests covering published, unpublished/unarchived and archived parent courses. **Limits:** live RLS and function definitions inspected; no authenticated learner JWT calls or writes performed; test project contains no lesson progress or corresponding learning-event rows.


## Quiz submission and lesson-completion RPCs omit the parent course archival check

The live SECURITY DEFINER function `submit_quiz_attempt` validates student role, an existing unsubmitted attempt, quiz publication, active paid enrollment, schedule and time limit, but its quiz lookup does not join the parent course or check `archived_at`. A learner with an attempt started before course archival can still submit it if the quiz remains published and enrollment remains active. The SECURITY DEFINER function `record_lesson_completion` checks that the lesson is published and the student has active paid enrollment, but does not join the course or check archival; it can record completion for a lesson in an archived course. By contrast, `record_simulation_completion` explicitly checks that the course is not archived.

**Impact:** archival does not consistently revoke already-started quiz submission or lesson-completion recording, so post-archive assessment/learning records can still be created even though ordinary child-content RLS policies block archived-course access. The separate omission of the parent `is_published` gate is addressed in the parent-course publication finding. **Remediation:** join the course and require `archived_at IS NULL` in both functions; apply the agreed publication rule and test archive-between-start-and-submit plus archived lesson completion. **Limits:** live function definitions and RLS policies inspected; no JWT calls or writes; no relevant learner test data.


## Direct quiz-attempt, lesson-progress and written-exam INSERT policies omit parent-course state checks

The live student INSERT policy on `quiz_attempts` validates student identity, empty/unsubmitted attempt state, quiz publication and schedule, and active paid enrollment, but does not join `courses` or require the parent course to be published or non-archived. The student INSERT policy on `lesson_progress` permits a completed row for a published lesson with active paid enrollment and bounded timestamps, but likewise omits both parent-course state checks. The student INSERT policy on `written_exam_submissions` checks exam publication, schedule and active paid enrollment, but omits the parent course's publication and archival state too.

These are direct authenticated Data API INSERT paths, distinct from the SECURITY DEFINER RPC gaps. Consequently, unpublishing or archiving a course does not consistently block creation of new quiz attempts, lesson-progress completion rows, or written-exam submissions when the child record and enrollment still pass the policy. A learner can insert lesson progress directly without calling `record_lesson_completion`; downstream learning-event generation for this direct path has not been established and should not be assumed.

**Impact:** parent-course suspension/archival controls are bypassed at three child-table INSERT policy boundaries. This does not remove the active-paid-enrollment requirement or permit writing another student's row. **Remediation:** consistently join the child record to `courses` and enforce the agreed `is_published` and `archived_at` policy in each INSERT predicate. If direct lesson-progress writes are unnecessary, revoke that path and route completion through the guarded RPC. Add RLS tests for published, unpublished/unarchived and archived courses. **Limits:** live JMT Test policy expressions inspected; no authenticated JWT calls or writes were performed.


## Private Storage read policies do not fully enforce course and enrollment state

The live `storage.objects` SELECT policy for private `lesson-materials` maps object paths to a lesson and allows student reads when the lesson is published and the student has active paid enrollment through the current Bangladesh billing period. It does not check the parent course's `is_published` or `archived_at` fields. A published lesson's private materials can therefore remain directly readable after its parent course is unpublished or archived. Assigned teachers/staff and admins have separate branches; the teacher/staff branch is assignment-scoped rather than enrollment-state-scoped.

The private `lab-notebook-evidence` SELECT policy permits the notebook owner, admins, and teachers/staff assigned to the notebook's course. The staff branch checks course assignment but does not require the student's enrollment to remain active/paid or the student's profile to remain active. Assignment alone can therefore preserve staff access to private evidence after enrollment expiry/deactivation, unless historical access is an intentional policy. The notebook owner's own access is distinct and should be preserved according to the intended student-record retention policy.

**Impact:** private lesson-material access is not aligned with parent-course unpublishing/archival, and staff evidence access persists beyond active enrollment state. No public exposure or cross-course access was identified in the inspected predicates. **Remediation:** add the agreed parent-course state checks to student lesson-material reads. Decide and document whether staff retain historical notebook-evidence access; if not, require active profile/enrollment state while providing a separately authorized audit/retention path. Test direct object reads and signed URL issuance after unpublishing, archival, payment expiry, profile deactivation and assignment removal. **Limits:** live JMT Test Storage policies and the notebook-evidence upload helper were inspected; no object reads, uploads, signed URL requests, JWT impersonation or mutations were performed. These findings apply to JMT Test only.


## Virtual-lab notebook and evidence creation omit parent-course publication state

The live student INSERT policy on `lab_notebook_entries` requires own student ID, draft/ungraded state, a published virtual-lab catalogue item, matching course-subject mapping, active paid enrollment and a non-archived course, but does not require `courses.is_published IS TRUE`. The student INSERT policy on `lab_notebook_evidence` has the same omission. The Storage INSERT policy for the private `lab-notebook-evidence` bucket delegates to `private.can_upload_lab_notebook_evidence`, which verifies notebook ownership, editable notebook status, active paid enrollment and `courses.archived_at IS NULL`, but does not check parent-course publication either.

**Impact:** when a course is unpublished but not archived, an otherwise eligible enrolled learner may still create a virtual-lab notebook and upload evidence even though the course is hidden from the student course catalogue. Own-record and active-paid-enrollment restrictions remain; this is not a cross-student upload bypass. **Remediation:** decide whether unpublishing suspends new virtual-lab activity. If so, add the parent `is_published` predicate consistently to notebook/evidence INSERT policies and the Storage upload helper; test unpublished/unarchived and archived course states. **Limits:** live JMT Test policies and helper definition inspected; no JWT calls, uploads or writes were performed.


## Staff profile SELECT scope does not expire with enrollment or student deactivation

The `profiles` SELECT policy delegates teacher/staff access to SECURITY DEFINER `can_staff_access_student(id)`. The helper checks that the requesting staff account is active (via `current_role()`) and that the staff member is assigned to a course containing an enrollment row for the student. However, the enrollment branch does not check enrollment status, admission-fee payment, current billing-period `paid_through`, course publication/archive state, or the student's `profiles.is_active`. A second branch permits access for a pending manual-payment submission in an assigned course.

Because the policy grants row-level access to the entire profile, not a restricted set of columns, assigned staff can read phone and guardian phone, date of birth, gender, location, emergency contact, blood group and other profile fields even after a student's enrollment expires/is deactivated or the student profile is deactivated, while the historical enrollment row and course assignment remain. The pending-payment path may be required for admissions review, but should be scoped separately.

**Remediation:** separate current-teaching access from pending-payment review; require active student profile and current active paid enrollment for teaching access, and use a minimal directory view/RPC or column grants for routine staff needs. Preserve a separately authorized historical/audit route if policy requires it. **Limits:** live JMT Test `can_staff_access_student` definition, `profiles` RLS policy and columns inspected; no authenticated reads or writes were performed.


The private `student-avatars` Storage SELECT policy has the same issue: its teacher/staff branch requires a course assignment and a matching enrollment/profile row, but does not require current active paid enrollment or an active student profile. Assigned staff can therefore continue reading private avatar objects for students whose enrollment is historical or whose profile is deactivated. Student-owner and admin access are separate branches. No avatar objects were fetched.


## Signed-URL authorization paths reviewed

Lesson resources are signed by `getLessonResourceUrl` using the authenticated server Supabase client: it authenticates with `auth.getUser()`, selects the resource row under normal `lesson_resources` RLS, checks `downloadable` for download mode, and signs the database-derived storage path for 300 seconds. The action accepts a resource ID, not a caller-supplied path, and does not use the service-role key. Lab-notebook evidence downloads similarly authenticate, select the metadata row through `lab_notebook_evidence` RLS, derive the storage path from that row, and issue a 60-second signed URL. The API redirect sets private/no-store, no-referrer and nosniff headers; malformed IDs and inaccessible rows do not disclose object paths.

**Residual limitation:** a signed URL is a bearer credential and remains usable until expiry even if access is revoked immediately after issuance. The short 5-minute lesson-resource and 60-second evidence lifetimes limit this window. Do not log signed URLs; test access revocation at issuance and expiry. Code review only; no URLs were generated and no private objects were read.


## Attendance and student-follow-up policies use enrollment existence, not current eligibility

Live JMT Test teacher/staff RLS predicates for `student_attendance` and `student_followups` require a matching course assignment and an enrollment row for the student/course, but do not check active enrollment status, admission-fee payment, current billing-period `paid_through`, or active student profile. Staff can read these records while the historical enrollment row and assignment remain. Attendance INSERT/UPDATE policies also allow new attendance writes for that historical pair; follow-up INSERT allows new follow-up records, and UPDATE permits the creator to edit them while assignment/enrollment rows remain. The related server actions authenticate an active staff account and validate assignment for some workflows, but do not add current paid-enrollment validation; RLS is the final student-scope gate.

**Impact:** after a student's course access ends, assigned staff may continue accessing and creating/editing attendance and follow-up records. Follow-up details can include illness, discipline, guardian-contact and academic information. **Remediation:** require active student profile and current active paid enrollment for new management writes (with any explicit attendance grace period documented); separate read-only historical access and audit it. Student access remains limited to follow-ups explicitly marked visible_to_student. **Limits:** live JMT Test RLS and corresponding server actions inspected; no authenticated data access or writes performed.


## Inactive staff can be assigned to courses

The admin Course Studio candidate query and save-action validation filter teacher/staff role but omit `profiles.is_active`. The live JMT Test `validate_course_assignment_teacher()` trigger likewise accepts any profile with teacher/staff role, including inactive profiles. The restrictive active-account policy and `current_role()` prevent an inactive assignee from using the assignment while deactivated, so this is not a direct inactive-account access bypass. However, the assignment remains dormant and can automatically restore course access if the profile is reactivated later; the admin UI also presents inactive users as assignable.

**Remediation:** require active profiles in the UI, server action, and database trigger/RPC. Define whether deactivation should revoke existing assignments or whether reactivation must explicitly reapprove them. **Limits:** source code and live JMT Test trigger inspected; no data modified.


### Role demotion also leaves course assignments dormant

The admin `updateAccountRole()` action allows role changes among student, teacher and staff but only updates the profile role. It does not delete or suspend `course_assignments`. The database assignment-validation trigger is attached to assignment INSERT/UPDATE, not profile role changes. Staff-only access is denied while the profile is demoted to student because `current_role()` changes, but promotion back to teacher/staff can restore access through the stale assignment rows. **Remediation:** transactionally revoke assignments on staff demotion or require explicit reapproval on promotion.


### Missing staff suspension/reactivation control

The student-management page's activation form calls `set_student_account_active`, whose database implementation deliberately updates only profiles with role `student`. The admin dashboard lists teachers/staff for course assignment but has no staff active-status control, and the live public function inventory contains no staff equivalent. Role demotion to student is the only visible admin control that can remove staff privileges; it does not change `is_active` or revoke course assignments. This creates an avoidable operational gap and compounds the dormant-assignment risk: later role promotion may restore old course access. **Remediation:** implement an admin-only, audited staff suspend/reactivate workflow with explicit course-assignment revocation or reapproval.


### Correction — payment duplicate-period finding superseded by live unique indexes (11 November 2026)

A subsequent read-only inspection of the current JMT Test catalog found that the earlier “Manual-payment duplicate-period approval review” conclusion above is stale and must not be treated as a current finding. The live `manual_payment_submissions` table has two valid and ready partial unique indexes:

- `manual_payment_one_initial_per_course`: unique on `(student_id, course_id)` while `payment_kind = 'initial'` and status is `pending_review` or `approved`.
- `manual_payment_one_monthly_per_period`: unique on `(student_id, course_id, billing_period)` while `payment_kind = 'monthly'` and status is `pending_review` or `approved`.

Both indexes were confirmed with `indisvalid = true` and `indisready = true`. Therefore, distinct provider transaction IDs cannot create concurrent pending/approved duplicate initial claims for the same student/course or monthly claims for the same student/course/billing period in this live database. The application insert path maps unique-constraint errors to a duplicate-payment response. The earlier recommendation to add these period-level partial unique indexes is already satisfied in JMT Test; the duplicate-period finding is withdrawn for the inspected live schema.

This correction is limited to the current JMT Test schema. It does not establish that production has the same indexes, nor does it prove that the branch migration ledger/source history is fully reconciled. Verify both index definitions and validity in the intended release target before relying on this control. No data, schema, application code, or migration state was changed during this correction.


## Admin profile policy permits direct admin-role provisioning outside the UI

The live JMT Test `profiles` table grants authenticated users column-level UPDATE on `role`, while withholding UPDATE on `is_active`. The `admins update any profile` RLS policy permits an active admin to update any profile row. The `protect_student_identity_fields()` trigger explicitly exempts callers whose `current_role()` is admin, and `prevent_self_role_change()` blocks only a user changing their own role. Consequently, an authenticated admin can use the direct Supabase Data API to change another profile's role to `admin`, even though the current `updateAccountRole()` server action accepts only `student`, `teacher` or `staff` and the visible UI does not offer admin promotion.

**Impact / interpretation:** this is not a non-admin self-escalation and does not bypass the requirement that the actor already be an active admin. It is a mismatch between the visible trusted-provisioning boundary and the database authorization surface: any active admin session can provision additional admin accounts outside the audited application workflow, without a dedicated provisioning RPC or explicit admin-promotion audit event. If admin-to-admin delegation is intended, the database path should be explicit and audited; if trusted out-of-band provisioning is intended, direct authenticated UPDATE of `profiles.role` should not permit the admin value.

**Recommended remediation (not applied):** revoke authenticated column UPDATE on `profiles.role` and route all role changes through a narrowly scoped audited admin RPC that allowlists only student/teacher/staff; keep admin provisioning service-role/operations-only, or implement a separately confirmed, MFA-gated, audited admin-invitation flow. Add a direct Data API regression test asserting that an admin cannot assign `admin` unless the approved provisioning path is used.

**Evidence and limits:** live JMT Test column privileges, profile UPDATE RLS policies, and all non-internal profile triggers/functions were inspected. Source `updateAccountRole()` excludes admin from its accepted role values. No profile was updated, no role was changed, and no JWT impersonation or live API mutation was performed. Confirm the same grants, policies and trigger definitions in production before treating this as a production finding.


### Role-change auditability check (11 November 2026)

A follow-up inspection found a separate auditability weakness in the same role-management path. The live `profiles` table has no role-change audit trigger. Its three non-internal triggers handle student-code assignment, self-role-change blocking and protection of student identity fields; none records the old role, new role, actor or reason. The `audit_logs` table exists and is readable by admins, but the inspected profile trigger set does not write to it. The current `updateAccountRole()` server action updates `profiles.role` directly and does not insert a corresponding audit event. Thus admin-initiated role changes—including the direct Data API admin promotion described above—do not receive automatic, database-enforced role-change history from this path.

This is an auditability/control weakness, not proof that all role changes are untraceable in every external system. Auth-provider logs or other operational records may exist, but they were not verified here. Recommended remediation: write an immutable role-change event in the same transaction as the role update, capturing actor, target, old/new role, timestamp and a validated reason; deny direct table updates that bypass that audited path. No role was changed and no audit row was inserted during this review.


### Role provisioning documentation and audit-log cross-check (11 November 2026)

Cross-checking `ADMIN_PROVISIONING.md` confirms the documented intended process is owner-operated SQL provisioning after normal registration and email confirmation; public registration is explicitly student-only. However, the live `profiles.role` column still grants `UPDATE` to `authenticated`, and the admin-wide profile UPDATE policy plus admin-exempt identity trigger permits an already-active admin to assign `admin` through the authenticated Data API. The application action limits role choices to student/teacher/staff, but that limit is not enforced at the database boundary. The self-role-change trigger blocks changing one's own role, not assigning another account.

The account deactivation RPC provides a useful contrast: `set_student_account_active` is SECURITY DEFINER, restricts changes to student profiles, and inserts an audit-log row in the same transaction. No equivalent audited RPC/trigger exists for role changes. This confirms that the absence of role-change audit events is specific to the role path, rather than absence of an audit-log mechanism altogether. The `audit_logs` table grants authenticated table privileges, but its only inspected RLS policy is admin SELECT; no authenticated INSERT/UPDATE/DELETE policy was present, so those grants alone do not establish an authenticated audit-log write path. No records or permissions were modified.


### Course-assignment change history is not retained (11 November 2026)

The live `course_assignments` table stores the current assignment, `assigned_by` and `created_at`, but has no audit trigger. The admin `replace_course_assignments` RPC validates that requested profiles have teacher/staff roles, deletes assignments omitted from the new list, and inserts new assignments. It does not write an audit event for additions, removals or replacements. The admin Course Studio calls this RPC whenever a course is saved. As a result, once an assignment is removed, its prior actor/time and the fact that the staff member previously had access are not retained in this table or by a course-assignment trigger. This weakens investigation of access changes, especially alongside the separately documented stale-assignment/reactivation lifecycle issue.

Recommended remediation: append immutable assignment-granted/revoked events in the same transaction as replacement, recording course, staff account, actor, timestamp and reason; preserve current assignment rows as the effective-access source. No assignment was changed and no audit event was written during this review.


### Course-assignment attribution fields are client-writable by administrators (11 November 2026)

A further check of column-level grants found that `authenticated` has INSERT and UPDATE privileges on every `course_assignments` column, including `assigned_by` and `created_at`. The admin-wide RLS policy permits administrators to manage these rows, and the only assignment trigger validates that the target profile has teacher/staff role; it does not bind `assigned_by` to `auth.uid()`, enforce server time for `created_at`, or prevent later edits to either attribution field. The normal `replace_course_assignments` RPC sets `assigned_by=auth.uid()`, but an administrator using the authenticated Data API can bypass that convention and supply or rewrite attribution metadata. This is an audit-integrity weakness (not a privilege escalation beyond an already-authorized admin).

Recommended remediation: remove direct client INSERT/UPDATE on attribution fields and make assignment writes go through the audited RPC; enforce actor and timestamp in a database trigger or transactional event table, and make attribution immutable. No assignment rows were read beyond schema/policy metadata or modified in this review.


### Course-application review attribution is mutable and has no durable review history (11 November 2026)

The live `course_applications` table has an admin-wide UPDATE policy and authenticated UPDATE grants on `status`, `admin_note`, `reviewed_by`, `reviewed_at`, and `updated_at`. The application review action writes the current admin and client-generated timestamps, but there is no database trigger or append-only application-review event table enforcing the actor/time or preserving prior decisions. The only application trigger emits a student notification when status changes; it is not an audit record and does not retain the prior reviewer, decision, or reason as an immutable history. An already-authorized administrator using the Data API can therefore rewrite review attribution fields or replace the current decision without a trustworthy decision history. This is an accountability/audit-integrity gap, not a non-admin access bypass.

Recommended remediation: move review transitions into a narrow admin RPC that derives actor and timestamp from the database session, validates allowed transitions, and inserts an immutable application-review event (old/new status, actor, server timestamp, reason) in the same transaction. Keep notification delivery separate from the authoritative history. No application rows were read or changed in this review.


### Manual-payment receiving-number changes have no durable audit history (11 November 2026)

The live `private_payment_settings` table grants authenticated administrators INSERT and UPDATE privileges for `provider`, `receiving_number`, `is_enabled`, and `updated_at`; its RLS policy restricts management to the admin role. The application action checks that the caller is an active admin, then updates the receiving number, enabled flag, and a client-supplied timestamp directly. The table has no non-internal audit trigger, and no corresponding immutable change-history mechanism was found. The student-facing SECURITY DEFINER function exposes only enabled providers and receiving numbers to authenticated students, so the configuration is intentionally private from other roles. However, a compromised or misused administrator account could change the wallet destination or disable a payment channel without a reliable record of the previous value, actor, or server timestamp. This is an administrative accountability/control weakness, not an authorization bypass.

Recommended remediation: route configuration changes through a narrow admin RPC, derive actor and timestamp server-side, and append an immutable audit event containing provider, previous/new receiving number (appropriately access-controlled), previous/new enabled state, actor, timestamp, and change reason. Consider a second-person confirmation for destination-number changes. No payment settings were read for their values or modified in this review.


### Finance export can double-count manually re-entered approved wallet payments (11 November 2026)

The finance CSV export combines approved `manual_payment_submissions` (as `verified_wallet_income`) with all `finance_entries` in the selected entry-date month. No database trigger or reconciliation key links an approved payment to a finance entry, and `finance_entries.reference` has no uniqueness constraint. The server action blocks `cash_income` entries using bKash/Nagad/Rocket, but that restriction is application-only: the live table's authenticated admin INSERT grant and RLS policy do not impose the same cross-field rule. Thus an administrator can directly insert a wallet-method cash-income entry for a transaction already represented in approved payments; both rows will be included in the CSV, potentially overstating income. This is a reconciliation/control risk rather than a non-admin access bypass.

Recommended remediation: make approved payment submissions the sole source of verified wallet income, or require a unique immutable source-payment reference and exclude linked entries from the export. Enforce allowed entry-type/payment-method combinations in a database constraint or trigger. Reconcile by transaction ID/payment ID before producing totals. No financial rows or exports were accessed or modified in this review.

### Student-register export labels submission time as latest payment date (11 November 2026)

The `get_student_register_export()` function chooses the latest approved payment by `manual_payment_submissions.created_at` and returns that same submission timestamp as `latest_payment_date`. The CSV labels it “Latest payment date”, although `created_at` is when the student submitted the claim; the actual approval timestamp is `reviewed_at`. A claim submitted earlier but approved later can therefore be reported with misleading recency. Recommended remediation: return both submission and approval timestamps with explicit labels, and choose “latest approved payment” using `reviewed_at` (with a deterministic tie-breaker). No student rows were queried or exported in this review.


### Course publication is committed before its dependent catalogue and staff setup (11 November 2026)

The admin `saveAcademyCourse()` action writes the course row, including `is_published`, before it upserts the subject catalogue, writes `course_subjects`, removes stale subject links, and calls `replace_course_assignments`. These are separate database requests rather than one transaction. The live anonymous course SELECT policy makes a published, non-archived course visible immediately, and the course-subject mapping is a separate relation. If a later request fails (or another user reads between requests), a newly published course can be visible with missing/incomplete subject mappings or staff assignments; an update can expose a partially applied configuration. The action redirects with an error but does not roll back the earlier course write. No course rows were modified during this review.

Recommended remediation: save course metadata, subject links, stale-link cleanup, and assignment replacement through one database transaction/RPC; publish only as the final step after all required relations validate. For edits to already-published courses, stage changes or keep the previous published configuration until the transaction commits.


### Course-application review allows arbitrary status reversals (11 November 2026)

The administrator review action accepts any of `submitted`, `reviewing`, `accepted`, or `rejected` for every existing application, without checking the current status or enforcing an allowed transition. The live table's admin RLS policy permits all operations, the status constraint validates only membership in the four-value set, and the only status trigger sends notifications; no database transition guard is present. An accepted application can therefore be changed back to submitted/reviewing or rejected, and a rejected application can be accepted, including through direct authenticated admin Data API updates. This can create contradictory application/payment eligibility and confusing student notifications; it is an administrator workflow-integrity issue, not an authorization bypass.

Recommended remediation: define and enforce an explicit transition graph in a transactional RPC/trigger (for example, submitted → reviewing → accepted/rejected, with a separately audited reopen path); prevent silent reversals after acceptance/rejection, require a reason and preserve immutable before/after events. No application records were read or changed during this review.
