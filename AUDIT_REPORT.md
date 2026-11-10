# Version 8 source audit

## Inspected

- ZIP directory tree and all 57 archive entries.
- `package.json`, TypeScript/Next configuration and environment example.
- Supabase SSR server/middleware clients and authentication actions.
- Student, Teacher, Admin, public and portal pages.
- Payment server actions, health and deprecated checkout routes.
- All six supplied SQL migrations, existing RLS policies and role/payment functions.
- README, provisioning, hosting and payment handover notes.

## Findings

| Area | Version 8 state | v9 increment |
|---|---|---|
| Framework | Next.js 15 / React 19 / TypeScript / Supabase SSR | Preserved; no framework upgrades |
| Dependency lock | No lockfile supplied | Still no lockfile; npm registry unreachable during this run |
| Authentication | Student signup, login, confirmation and role routing present | Added password recovery/update flow |
| Payment | Manual submission and Admin RPC review present | Added confirmation UI, sender phone field, stronger approval checks; still requires live DB verification |
| Role/RLS | Several role protections present, but broad staff policies remained | Added teacher assignment scope and removed broad teacher visibility for enrollments/payment events |
| Courses | Three fixed courses/৳700 guardrails present | Added Admin publication control; old unsupported rows remain unpublished and are not deleted |
| Learning | Minimal lesson table; no complete learning experience | Added chapters, lesson content, assignment scope and progress foundation |
| Teacher tools | Placeholder workspace | Added chapter/lesson creation and lesson editing |
| Student tools | Payment dashboard | Added profile editing, course access, lessons, progress and announcements |
| Localization | Language foundation absent/incomplete | Added locale cookie and public homepage switch; full bilingual coverage still incomplete |
| Public pages | Basic landing page only | Added catalogue, details, About, Contact, Privacy, Terms and FAQ |
| Tests | No automated test suite | Added 5 static guardrail tests; integration/browser tests remain outstanding |
| Deployment | Not configured/live | Netlify candidate and instructions prepared; no credentials/account access |

## Critical caveats

- The original archive's own progress notes stated that migrations had not been applied to a live database and no real production build/typecheck had been run.
- The v9 migration must be reviewed and applied to a test Supabase project before production.
- The source archive contained a historical receiving number in its old configuration/migration; the v9 copy removes that literal and leaves wallet settings blank/disabled.
- The application is not production-certified or live. Build, RLS integration, account, payment and browser tests remain blocked by missing dependencies, credentials and provider access.


## Version 9.1 review corrections (7 November 2026)

- Fixed the email confirmation callback's `next` redirect validation. It now resolves the destination and accepts only same-origin URLs, blocking backslash-normalized external redirects.
- Fixed the learning page query to include `chapter_id`, which the page uses to display chapter labels.
- Added regression guardrail tests for both corrections.
- Re-ran `npm test`: **7 passed**.

## Remaining release blockers

- No dependency lockfile is included.
- Dependency installation could not complete because the npm registry was unreachable/timed out in this environment; therefore the real TypeScript check and Next.js production build remain unverified.
- No Supabase test project was available, so migrations, RLS policies and role isolation have not been executed or integration-tested.
- No browser/mobile, email delivery, payment end-to-end or live deployment tests have been completed.


---

## Current branch audit addendum — 11 November 2026

This addendum supersedes the Version 8 / 9.1 status statements where they conflict with the current branch. The earlier sections are retained as historical checkpoints, not as a description of the complete current implementation.

### Current source scope

- The audit branch contains 218 numbered SQL migrations at the time of this addendum.
- The current branch includes a substantially expanded Learning OS, practice-question engine, database-driven virtual-lab catalogue, practical notebook assessment, private lab evidence storage, review history, adaptive-learning evidence, and additional privilege hardening.
- The earlier statement that only six supplied migrations were inspected is historical and does not describe this audit's source review.
- The earlier statement that rate limiting is not implemented is stale: authentication, discussion, payment, and student-activity rate-limit mechanisms are present in source. Their live behavior and production configuration still require verification.

### Security review progress

- Current source includes database-backed authentication throttling for sign-in, sign-up, and password reset. The RPC uses hashed email and IP buckets and is executable only by `service_role`. Application-level throttling is conditional on `SUPABASE_SERVICE_ROLE_KEY` being configured; verify that production configuration before relying on it.
- Current source includes server-side payment/discussion throttles and database triggers for student activity writes.
- Private lab evidence storage is implemented in migrations: the bucket is private, file types and size are constrained, object paths are owner/notebook-scoped, and notebook evidence inserts are checked against the notebook, enrollment, object metadata, and file-count limit. The migration comment states that this migration was applied to the isolated JMT Test project and that production remained untouched at that point.
- Multiple later SECURITY DEFINER functions use explicit fixed search paths, often `pg_catalog, public, pg_temp` or an empty search path with schema-qualified object references. Trigger functions reviewed in the later lab/practical migrations generally revoke client EXECUTE privileges. A complete catalog-level inventory of final function definitions, owners, ACLs, overloads, and trigger bindings remains outstanding.
- A NULL-unsafe role guard in an earlier staff-practice analytics function is corrected by later migrations using `COALESCE(current_role()::text, '') NOT IN (...)`; the later small-cohort migration retains that fail-closed check and suppresses question aggregates with fewer than five attempts.
- The discussion pin RPC's earlier NULL-unsafe role guard is replaced by a later fail-closed definition.
- A later migration revokes client TRUNCATE and TRIGGER privileges on public tables and changes postgres-owned default privileges for future public tables; another revokes client privileges on the student-code sequence.

### CI and database verification boundaries

- GitHub Actions quality checks use placeholder Supabase URL/key values. They run source-level guardrail tests, lint, typecheck, build, and a production dependency audit; they do not connect to PostgreSQL or execute policies under distinct database roles.
- Source tests that assert migration text are useful regression checks but do not prove runtime RLS, grants, trigger execution, Storage authorization, or SECURITY DEFINER behavior.
- The lab evidence migration's comment is evidence of its stated application to an isolated test project only. It is not proof that all 218 migrations are applied, that the test database matches the current branch, or that production schema is synchronized.
- The latest checked CI run for branch head `a1085ca334ff7a5d7423383ee50ede79af5e2fd4` completed successfully: guardrail tests, ESLint, TypeScript, production build, and production dependency audit all passed. This is source/CI evidence only; it does not execute PostgreSQL authorization policies.

### Remaining work before release

1. Complete a catalog-level SECURITY DEFINER review against the actual isolated database: function identity and overloads, owner, security mode, fixed search path, EXECUTE ACLs, trigger bindings, and role/ownership checks.
2. Add executable PostgreSQL/Supabase integration tests using anonymous, inactive, Student A/B, assigned/unassigned Teacher/Staff, and Admin identities. Exercise table operations, RPC execution, and private Storage object operations.
3. Verify the complete migration history and resulting schema on a disposable test project before any production change.
4. Verify production service-role environment configuration, Supabase Auth MFA policy, private Storage behavior, signed-download handling, and retention/deletion behavior.
5. Complete browser/mobile, email delivery, payment end-to-end, XSS/CSRF, and independent penetration testing.

**Current assessment:** The branch has materially more implemented security functionality than the Version 8 / v9 historical audit describes. Source-level hardening is substantial, but CI is not a live database security test. The application must not be represented as fully security-tested or production-ready until the runtime authorization matrix and remaining release checks pass.


### Runtime test readiness inventory

The repository currently has a `supabase/` directory containing SQL migrations and a database update script, but no visible `supabase/config.toml`, local PostgreSQL test service, pgTAP suite, or dedicated database integration-test workflow. The existing `tests/*.test.mjs` suite runs with Node's test runner and inspects source/migration text. Therefore, a runtime role matrix cannot currently be run reproducibly from this repository's checked-in test setup.

Recommended isolated-test matrix (must never target production):

| Identity / state | Expected access to verify |
|---|---|
| Anonymous (no JWT) | Public published catalogue only; no private records, RPCs, or private Storage objects |
| Authenticated but no active profile | Denied personal records, course content, discussions, and protected storage |
| Student A, active and paid | Own records and enrolled course only; permitted inserts through scoped workflows |
| Student B, active and paid | Must not read or mutate Student A records or evidence |
| Student, unpaid / expired / archived course | No paid course content, practice questions, or simulation completion |
| Teacher assigned to Course A | Course A data only; draft-authoring and grading scope only where intended |
| Teacher unassigned to Course A | No Course A private data, writes, analytics, or grading |
| Staff assigned / unassigned | Same assignment boundary unless a specific staff-wide permission is explicitly intended |
| Admin | Explicit admin operations only; audit log attribution and immutable history preserved |

For each identity, test table SELECT/INSERT/UPDATE/DELETE, direct RPC execution (including denied RPCs), and Storage upload/download/delete. Include NULL/missing role, inactive profile, wrong owner, wrong course, expired payment, archived course, malformed object path, invalid MIME/extension, oversized file, duplicate submission, and concurrent upload/approval cases. Capture SQLSTATE and resulting row/object state, not just HTTP status.

**Implementation gate:** First provision a disposable Supabase project or local Supabase stack, record its migration history, apply the branch migrations there, and add a reproducible CI job with separate test identities. Only then can these expected outcomes be reported as tested rather than proposed.


### Read-only live JMT Test catalog inspection — 11 November 2026

A read-only inspection was performed against the connected Supabase project named **JMT Test**. No DDL, DML, migration application, user impersonation, or Storage mutation was performed.

**Observed database state**
- The database reports 244 migration-history rows; the repository branch contains 218 migration SQL files.
- The ledger has 244 unique version identifiers but only 203 distinct migration names. There are 37 duplicated-name groups, containing 78 rows in total (41 extra occurrences beyond one row per name). Examples include three entries each for `fix_discussion_parent_policy_recursion`, `require_active_role_for_course_content_reads`, `require_active_role_for_personal_record_reads`, and `revoke_client_truncate_and_trigger`; several older numbered migrations also appear under multiple versions.
- The latest database row is version `20261110181004` named `require_active_role_for_course_subject_reads`, while the branch file with that name is `20261110274000_require_active_role_for_course_subject_reads.sql`. The database's last recorded version is therefore not the same as the branch file's version identifier.
- These counts and repeated names are a migration-history integrity warning, not proof that 26 migrations are missing. Possible explanations include migration renumbering, replays, manual ledger repair, branch rebasing, or multiple historical versions of equivalent SQL. The full ordered ledger must be mapped to exact source file contents and schema effects before any future migration push. Do not infer equivalence from names alone or automatically delete/insert ledger rows.
- All inspected ordinary tables in `public` have RLS enabled.
- The only public-schema tables observed with RLS enabled but no policies are `app_rate_limit_events` and `auth_rate_limit_events`. Their table grants are limited to the database owner and `service_role`; neither `anon` nor `authenticated` has table grants. This is consistent with a deliberate service-only, deny-by-default design.
- Anonymous table SELECT grants are present only for `academy_settings`, `courses`, and `notices`; row policies still govern visibility.
- Storage bucket catalogue: `jmt-course-media` is public (5 MiB, JPEG/PNG/WebP); `lab-notebook-evidence` is private (8 MiB, JPEG/PNG/WebP/PDF); `lesson-materials` is private (100 MiB, allowlisted course media/document/audio types); `payment-proofs` is private (3 MiB, JPEG/PNG/WebP); `student-avatars` is private (3 MiB, JPEG/PNG/WebP). Storage policy definitions were inspected at catalog level; end-to-end object access was not exercised.

**SECURITY DEFINER catalog results**
- 59 functions in the `public` schema are marked `SECURITY DEFINER`.
- All 59 have an explicit function-level `search_path` setting.
- One is executable by `anon`: `public.get_public_course_teachers(uuid)`. Its current definition returns only active teacher/staff IDs and full names for a specified published, non-archived course. The branch migration `20261110115928_filter_inactive_public_course_teachers.sql` explicitly grants execution to `anon` and `authenticated` for public course pages. This appears intentional and narrowly scoped; it remains a public data disclosure by design and should be documented as such.
- 23 SECURITY DEFINER functions are executable by `authenticated`. This is not by itself a finding of vulnerability; each exposed RPC must retain its own authorization and object-scope checks. No other SECURITY DEFINER function was found executable by `anon` in this catalog query.
- The security advisor's generic authenticated-function warnings therefore need function-by-function interpretation rather than blanket revocation.

**Advisor findings**
- Leaked-password protection is disabled in this JMT Test project's Auth configuration. Enable it in the Auth password security settings after confirming expected signup/reset behavior.
- The two policy-free rate-limit tables above produce an informational RLS advisor notice; their observed grants indicate service-role-only access.
- The anonymous `get_public_course_teachers` RPC produces a warning because it is a public SECURITY DEFINER function. The source explicitly intends public course-page access; retain only if public teacher names are intended to be disclosed.

**Limits of this inspection**
- These are catalog/metadata observations, not a role-matrix test. No student, teacher, staff, admin, or anonymous JWT session was used to exercise table, RPC, or Storage operations.
- The connected project is named JMT Test. These findings must not be generalized to production.
- Do not automatically repair migration history or change function grants based only on advisor output. First reconcile the applied migration ledger and intended public course-page behavior.


**Public-row-policy spot check:** the catalog query for policies assigned to `anon`/`public` or using unconditional `true` predicates returned only:
- Public academy contact profile read, constrained to the singleton settings row.
- Anonymous published, non-archived course reads.
- Anonymous published notice reads.
- Authenticated read of the academic subject catalogue with an unconditional row predicate.

No anonymous/public write policy or unconditional anonymous row predicate was returned by this targeted query. This is a metadata spot check, not a complete semantic review of every policy expression.


### Migration ledger reconciliation — detailed comparison (read-only)

A second comparison was performed using the full ordered JMT Test migration ledger and the current branch's migration filenames. For this comparison, numeric prefixes of any length were stripped from both the ledger name and source filename, then the remaining labels were compared. This is a **name-level normalization only**; it does not prove SQL equivalence or version identity.

| Measure | Result |
|---|---:|
| JMT Test ledger rows | 244 |
| Current branch migration files | 218 |
| Distinct raw names in JMT Test ledger | 203 |
| Distinct normalized ledger names | 202 |
| Distinct normalized names in branch | 214 |
| Distinct normalized names present on both sides | 192 |
| Normalized ledger names occurring more than once | 37 |
| Source names occurring more than once | 4 |
| Normalized ledger names absent from branch filenames | 10 |
| Normalized branch names absent from ledger | 22 |

The 22 branch-only normalized names include the 20 original foundation migrations from `initial` through `academy_public_profile`, plus `add_double_pendulum_simulation` and `add_ideal_gas_law_virtual_lab`. The ledger contains a consolidated foundation label, `jmt_academy_remaining_0009_0020`, rather than one-to-one labels for those early source files. The ledger's 10 normalized-only labels include `profile_active_flag`, intermediate payment/assessment hardening labels, `revoke_direct_quiz_attempt_updates`, `add_double_pendulum_virtual_lab_template`, `fix_practical_assignment_publication_timestamp_integrity`, and the two photosynthesis labels. Some may be superseded, renamed, consolidated, or retained as historical entries; their SQL effects must be traced before classifying them.

The ledger has 244 unique version identifiers, but version identifiers do not line up with current source filenames in many cases. Repeated ledger names also remain significant: a repeated name can represent distinct historical versions, replay/repair activity, or renumbering, and cannot safely be collapsed based on its label.

A separate ordering check found that 49 source files have numeric filename prefixes later than the maximum JMT Test ledger version (`20261110181004`). Of those 49, 48 have a normalized migration-name match somewhere in the ledger, while only `add_ideal_gas_law_virtual_lab` has no matching ledger label. This strongly suggests that many source migration files were renamed or re-versioned after their database ledger entries were created; the prefix comparison alone cannot establish the exact SQL applied. The missing gas-law label is corroborated by the live constraint check above, which shows that the `gas-laws` value is absent from JMT Test.

**Interpretation:** the normalized name comparison narrows the unmatched groups to 22 source labels and 10 ledger labels, but this is still not a migration equivalence test. It is not proof that 22 migrations are unapplied or that 10 database changes are obsolete. The database's latest ledger version for `require_active_role_for_course_subject_reads` is `20261110181004`, while the current source file is prefixed `20261110274000`; the name matches after normalization, but the version identifiers differ. Do not assume they are interchangeable without inspecting Git history, exact SQL content, ordering, and resulting schema.

**Required safe resolution before a future migration push:**
1. Export and preserve the full ordered migration ledger from JMT Test.
2. Compare the Git history and exact SQL contents for every source-only and ledger-only name, including duplicate names and version changes.
3. Inspect current schema objects and function/policy definitions to establish the effective state, not merely the history labels.
4. Rehearse the proposed migration plan against a disposable clone or fresh isolated project.
5. Only after explicit review, decide whether to retain, repair, or baseline migration history. Do not delete ledger rows, rewrite migration versions, or run `migration repair` based on this report alone.

**Targeted schema-effect cross-check — read-only:** a follow-up catalog query checked two migration effects against JMT Test:
- The `public.profiles.is_active` column exists, showing that the effect represented by the ledger-only historical label `profile_active_flag` is present in the current schema despite the source/ledger naming mismatch.
- The current `virtual_lab_catalog_simulation_type_check` constraint does **not** include `gas-laws`, and no `gas-laws` simulation type is present in the catalogue. The current branch migration `20261110260000_add_ideal_gas_law_virtual_lab.sql` explicitly adds `gas-laws` to that constraint. Its intended schema effect is therefore not present in the inspected JMT Test database. This is a concrete example of the branch and test database being out of sync; it is not a reason to push the migration blindly.

This reconciliation was read-only. No migrations were applied, repaired, or removed.


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

**API authorization controls verified in source and live JMT Test policies:**
- Finance and student-register CSV export routes require an authenticated profile with `role = admin` and `is_active = true`; exports are marked `private, no-store`.
- The health route exposes only application/database reachability and a timestamp, with no credentials or detailed database errors.
- The retired payment-create endpoint returns HTTP 410 and does not simulate or create a checkout.
- Lab-notebook evidence download validates the UUID, authenticates the caller, obtains the evidence row through its RLS policy, and only then creates a 60-second signed URL. It does not accept a caller-supplied Storage path or use a service-role key. The redirect sets private no-store, no-referrer and nosniff headers.
- Lesson-resource URL generation obtains the resource row through caller-scoped RLS before minting a five-minute signed URL. Live RLS limits student reads to published lessons in active, paid, current enrollments; teacher/staff reads require course assignment; administrators are allowed.
- CSV cells are quoted and formula-leading values (including leading whitespace/control whitespace) are prefixed to prevent spreadsheet formula execution. Existing tests cover these cases.
- The retired/disabled API surface and the two CSV endpoints were source-inspected; no live HTTP/API request or impersonated-role test was run.

**Upload validation gap — lesson materials (defense-in-depth, not a demonstrated exploit):** the lesson-material uploader is a browser-side component. It checks `File.type` and file size in the browser, then uploads directly to private Storage. The live bucket also enforces an allowlist of MIME metadata and a 100 MiB object cap. However, unlike the payment-proof and lab-notebook evidence flows, the lesson-material path has no server-side binary-signature/content validation. A caller able to upload as an assigned teacher/staff account can supply content whose bytes do not match the declared allowed MIME type. No successful active-content execution or cross-user access was demonstrated; upload authorization remains restricted by Storage RLS. Recommendation: validate file signatures/container structure server-side or quarantine and scan uploads, set safe response content headers, and sandbox document previews (the PDF preview currently uses an iframe without a sandbox attribute). Consider a per-course/per-uploader quota for storage-cost governance.

**Browser security headers:** `next.config.ts` sets CSP, HSTS, nosniff, Referrer-Policy, X-Frame-Options and Permissions-Policy; `poweredByHeader` is disabled. The CSP is a useful baseline, but `script-src 'self' 'unsafe-inline'` weakens CSP's ability to contain injected inline script, and `frame-src https:` / `connect-src https: wss:` are broad origin allowlists. Recommendation: plan a nonce-based CSP compatible with Next.js, replace broad schemes with the exact required service origins, and roll out with report-only telemetry before enforcement changes. This is a hardening recommendation, not evidence of an exploitable XSS or data exfiltration path.

**Additional upload notes:** student avatars and course cover media also rely on MIME allowlists and browser-supplied file type rather than server-side signature verification. SVG is not in the accepted MIME lists. These paths are role/owner restricted and the buckets are configured with size caps; no malicious upload was attempted. Payment-proof and practical-evidence actions do perform binary signature checks before upload.

**Limitations:** review was source-based plus read-only inspection of live Storage bucket settings and RLS policies in the isolated JMT Test project. No object was uploaded, downloaded or modified; no signed URL replay, MIME-confusion, iframe sandbox, XSS, CSRF, CORS, proxy-origin or rate-limit abuse test was performed. The public GitHub code-search response was incomplete and is not treated as proof that no other unsafe rendering sinks exist. No production configuration or production data was accessed.


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


## Written-exam grading interface omits the question and marking guide (11 November 2026)

**Functional finding — the staff marking queue displays answer values without the corresponding question text or model answer.** The written-exam builder stores MCQ correct-option indexes and short/long-answer model answers in `written_exam_answer_keys`. However, `app/academic/page.tsx` loads written-exam submissions with answers, score and feedback, and renders `Object.entries(s.answers)` as question-ID/answer pairs. It does not load `written_exam_questions` for the staff marking queue or load `written_exam_answer_keys`; those question rows are fetched only when a student opens a specific exam. The marking card therefore lacks the question prompt and the model answer/marking guide, and MCQ answer IDs are not translated into readable question/option context.

This makes accurate marking unnecessarily difficult and increases the chance of inconsistent manual scoring, especially for long exams with many questions. The builder explicitly labels model answers as staff-only, so this appears to be intended grading context that is not surfaced in the marking workflow.

**Recommended correction:** load question text, type, options and marks for the exams represented in the staff queue, and load answer-key/model-answer data only for authorized assigned staff/admin. Render each student's response alongside its question and marking guide. Keep student-facing queries isolated from answer-key data and retain RLS as the enforcement boundary. Add a page-level test confirming that staff see the question/marking guide while students cannot read answer keys.

**Verification limits:** confirmed from the branch page and builder source. No written-exam rows existed in the inspected JMT Test environment, so this is a code-path/UI finding rather than an observed marking incident.


## Learning OS mastery summary is biased by a 12-row limit (11 November 2026)

**Functional/reporting finding — the dashboard labels a partial sample as overall mastery.** In `app/student/page.tsx`, the `learner_concept_mastery` query orders records by `mastery_score` ascending and applies `.limit(12)`. In `components/learning-os-dashboard.tsx`, `averageMastery` is then calculated as the arithmetic mean of the returned `mastery` array, and the dashboard labels it “Average mastery”. Therefore, when a student has more than 12 concept records, the displayed figure is the average of only the 12 lowest-scoring returned concepts, not the student's overall average. “Topics tracked” likewise reports only the number returned (maximum 12), not the total number of tracked concepts.

**Impact:** the summary can systematically understate overall mastery and misrepresent the number of topics with evidence. The low-score subset is useful for weakness triage, but should not be presented as a whole-student aggregate.

**Recommended correction:** calculate total tracked concepts and overall mastery through a database aggregate/RPC (choose and document whether the average is concept-weighted or evidence-weighted). Keep the 12 lowest-scoring rows for the topic cards and weak-topic recommendations, and label that subset explicitly, e.g. “Lowest mastery topics”. Add tests with more than 12 concepts and a distribution where the lowest-12 mean differs materially from the all-concept mean.

**Verification limits:** confirmed from the branch student page query and dashboard calculation. The inspected JMT Test learning mastery table had zero rows, so no populated student dashboard was available to observe the numerical distortion.


## Future revision tasks can be completed before their scheduled time (11 November 2026)

**Learning-integrity finding — the completion RPC does not enforce the scheduled date.** The live `public.complete_revision_task(uuid)` function selects a task for the authenticated student where `status = 'pending'`, locks it, and immediately changes it to `completed`. It does not require `scheduled_for <= now()`. The student dashboard renders a completion form for every pending revision task, including tasks whose scheduled time is in the future. A student can therefore complete a future task early; the RPC counts it among completed tasks and schedules the next spaced-repetition interval from the early completion.

**Impact:** review cadence and completion statistics can be advanced ahead of the intended schedule. This is a learning-integrity issue, not a cross-user authorization bypass.

**Recommended correction:** add a database-side `scheduled_for <= now()` check to `complete_revision_task`; present future tasks as scheduled without an active completion control. Add a test proving future tasks are rejected and due tasks can be completed. Keep the RPC check authoritative.

**Verification limits:** confirmed against the live JMT Test function definition and branch dashboard source. The inspected revision-task table had no usable learner activity to demonstrate an actual early completion; no task was modified.


## Learning evidence weighting and revision-task reconciliation (11 November 2026)

**Learning-integrity finding — mastery evidence from quizzes and practical reviews uses different implicit units.** The live capture_quiz_learning_evidence() function adds the number of tagged questions for a concept to evidence_count, while capture_practical_learning_mastery() adds exactly one for each practical-review event. Both then combine the existing mastery score and the new score using evidence_count as the weight. As a result, a quiz submission with (for example) eight questions tagged to a concept can carry eight times the weight of one practical review, even though both are single assessment events and the practical score may itself summarize several rubric dimensions. The database stores the resulting aggregate but does not record a common, documented unit for these weights.

**Impact:** cross-modality mastery can be dominated by the number of quiz questions rather than a consistent measure of learning evidence. This is a learning-analytics methodology risk, not score forgery or an access-control defect.

**Related revision scheduling gap:** quiz, practical-review and lesson-completion paths all insert a pending task for a student/concept using ON CONFLICT DO NOTHING against the unique partial index revision_tasks_one_pending_concept. This correctly prevents duplicate pending tasks, but it also leaves an existing task unchanged. For example, if a concept already has a pending review scheduled several days ahead, a new low-scoring quiz or practical review attempts to create a higher-priority review for the next day but is silently discarded by the conflict handler. The existing task's scheduled_for, priority and source metadata are not reconciled with the newer evidence. This is separate from the previously documented Exam War Room omission: here, the evidence triggers themselves can fail to bring an already-pending review forward.

**Recommended correction:** define and document a consistent mastery evidence unit (e.g. one weighted assessment submission, or a justified normalized weight based on marks/rubric) and apply it across quiz and practical-review evidence. For revision conflicts, reconcile the existing pending task—at minimum retain the earlier due time and higher priority—and preserve the triggering evidence/provenance rather than silently discarding it. Add behavior-level tests for mixed quiz/practical evidence, repeated evidence for one concept, and a weak result arriving while a later-dated pending task already exists.

**Test-coverage gap:** tests/learning-os-quiz-evidence.test.mjs checks that quiz evidence writes mastery and revision rows, and tests/exam-war-room.test.mjs checks selected plan/task migration properties; these are source-text assertions. They do not assert cross-modality mastery weights, or that an existing pending task is rescheduled/escalated after newer weak evidence. The practical-review trigger and its one-event deduplication are present in the live database, but no behavior-level regression test for the combined quiz/practical/revision interaction was identified in the inspected test set.

**Verification limits:** confirmed from live JMT Test function definitions, trigger bindings and indexes, plus the branch quiz migration and inspected test files. JMT Test currently has zero learning_events, learner_concept_mastery, revision_tasks and quiz_attempts rows, so no populated learner record was available to measure the weighting or task-suppression effect. No data was inserted or modified.


## Learning-event rate limit can reject a legitimate multi-concept quiz submission (11 November 2026)

**Availability/integrity finding — the per-minute limit counts derived event rows rather than learner actions.** The live BEFORE INSERT trigger on public.learning_events calls enforce_student_activity_rate_limit(), which permits at most 60 learning_events rows per student in a rolling minute. A quiz submission's AFTER UPDATE trigger capture_quiz_learning_evidence() inserts one general exam_submitted event and then one additional exam_submitted event for each distinct tagged concept in that quiz. The branch quiz builder accepts up to 50 questions, each with an optional concept_id; therefore a single valid quiz can emit as many as 51 learning-event rows in one transaction. The rate limiter counts the rows inserted earlier in that same transaction. If the student already has enough recent learning events, the trigger raises 'Student activity rate limit exceeded'; because this runs inside the quiz-attempt update transaction, the entire quiz submission—including its submitted_at and score update—rolls back.

**Impact:** a student who has recently generated ordinary lesson/practice events or submitted another multi-concept quiz can be prevented from submitting an otherwise valid quiz. The threshold can be reached by one high-coverage quiz plus prior activity, or by multiple quizzes in a short interval. This is an availability/learning-progress issue, not a score-forgery or cross-user access issue.

**Recommended correction:** rate-limit logical student actions (e.g. quiz submissions or RPC calls) rather than each derived analytics row. Alternatively, reserve/check the event budget once per parent assessment and exempt its internally generated concept rows from the per-row limiter while retaining an appropriate abuse limit on the submission action. Add an integration test with a 50-question/50-concept quiz and prior events near the threshold; assert that a valid attempt is not partially or unexpectedly rejected and that abuse controls remain effective.

**Test-coverage gap:** the inspected learning-event integrity test checks the 60-per-minute function's source text only indirectly/not at all; the quiz evidence test checks that the trigger writes events but does not model event fan-out against the rate limiter or verify transaction rollback. No integration test for the combined trigger chain was identified.

**Verification limits:** the 60-row limit and advisory-lock/count implementation were confirmed from the live JMT Test trigger/function definition; the one-plus-per-concept event fan-out and 50-question cap were confirmed from the live quiz evidence function and branch quiz builder. No quiz was submitted and no data was changed. JMT Test has zero learning_events and quiz_attempts at inspection, so no live learner impact was observed.


## Practical-review event deduplication is correctly scoped to review rounds (11 November 2026)

**Positive control confirmed:** practical-review history has a unique `(notebook_id, review_round)` index, and its AFTER INSERT trigger creates a `practical_reviewed` learning event only for a reviewed decision with a non-null score. The learning-events table has a matching partial unique index on `(student_id, source_id)` for `practical_reviewed` events, and the trigger uses `ON CONFLICT DO NOTHING`. This prevents replaying the same review-history row from incrementing mastery twice while still allowing a genuinely new review round to count as new evidence. This does not resolve the separate inconsistent cross-modality evidence weights or pending-task conflict handling documented above.

**Verification limits:** confirmed from live JMT Test trigger definitions and indexes. No review-history rows existed to exercise the path; no data was changed.


## Published quiz content is locked for staff, but administrator edits/deletion can rewrite or erase assessment history (11 November 2026)

**Positive control:** the live `enforce_assessment_content_draft_integrity()` trigger blocks teacher/staff changes to published quiz questions and answer keys, and blocks staff deletion of published quizzes. The `publishQuiz()` action also checks that an unpublished quiz has 1–50 questions and at least one answer key for each question before setting `published=true`.

**Residual governance/data-integrity gap:** the database trigger explicitly returns early for `current_role()='admin'`, before checking publication state or whether attempts exist. Admin RLS policies permit update/delete of published quizzes and update/delete of quiz questions and answer keys. No attempt-count guard or immutable assessment-version snapshot is present in the reviewed logic. An administrator can therefore change a published question or correct answer after students have submitted; stored scores, concept mastery and mistake-memory snapshots are not recomputed, so the historical record can become inconsistent with the current assessment definition. Deleting a quiz is more destructive: the live foreign keys cascade from quizzes to quiz_attempts and from questions to answer keys, so the quiz and its attempt records can be erased. Learning events and mistake-memory rows use source UUIDs without corresponding quiz/attempt foreign keys in the inspected schema, so derived learning history may remain without its originating attempt/assessment.

**Impact:** this requires an administrator-level action; it is not a student or teacher privilege escalation. It creates an auditability and historical assessment integrity risk, particularly for accidental edits/deletions or post-result correction workflows.

**Recommended correction:** make published assessment versions immutable for all roles once any attempt exists. Use a controlled correction workflow that creates a new version or records an append-only correction/regrade event with actor, reason, old/new content and affected attempts. Prefer soft deletion/archive; retain attempts and source relationships. If emergency admin override is required, require an explicit audited operation rather than silently bypassing the lock.

**Verification limits:** confirmed from live JMT Test trigger definition, RLS policies and FK delete rules, plus branch `publishQuiz()` and quiz-creation actions. No quiz or attempt data was present to test the destructive path; no data was changed. The risk is derived from schema/action permissions, not an observed deletion.


## Written-exam regrading overwrites the prior grade without an append-only history (11 November 2026)

The written-exam grading action accepts a submission ID, score and feedback, verifies that the caller is an admin or assigned teaching staff member, and updates the existing submission's `score`, `teacher_feedback`, `graded_by` and `graded_at`. The live UPDATE policy and database guards correctly constrain the grader identity, score range, feedback length and immutable submitted answers/ownership. However, neither the action nor the database guard requires the submission to be ungraded, and the schema inspected has no grade-revision/history table or append-only grade event. A later authorized grade action can therefore replace a previous score and feedback in place; the previous mark, feedback, grader and timestamp are lost. The notification trigger may send another grade notification, but that is not a durable record of the previous decision.

**Impact:** this is an auditability and assessment-governance gap, not an unauthorized grading path. It weakens the ability to resolve student appeals, explain mark changes or distinguish an initial grade from a correction. A valid regrade may be operationally necessary, but it should not erase the earlier decision.

**Recommended correction:** record every grade/regrade as an append-only row containing submission ID, old/new score and feedback, actor, timestamp, reason and optionally approval reference; expose the latest approved grade as the current result. Require a reason for changes after first grading and test concurrent grade updates for lost-update behavior.

**Verification limits:** confirmed from branch `gradeWrittenExam()`, live written-submission UPDATE policy, column grants, and `guard_written_exam_submission_update()` / grade-validation triggers. No written-exam submissions existed for runtime regrade testing; no data was changed.

## Written-exam content has the same administrator override and deletion-history exposure as quizzes (11 November 2026)

The live content-integrity trigger covers `written_exams`, `written_exam_questions` and `written_exam_answer_keys`, but returns immediately for administrators. Admin RLS policies allow updating/deleting published written-exam headers, questions and answer keys. The teacher/staff delete policy prevents deleting an exam with submissions, but the administrator policy does not include that guard. The foreign key from `written_exam_submissions.exam_id` to `written_exams.id` is configured to cascade, so administrator deletion of a written exam can erase its submissions and attached question/key history. Post-publication model-answer or rubric edits can also make prior manually awarded scores impossible to reproduce from the current content.

**Impact and correction:** administrator-only governance/data-integrity risk. Apply the same version immutability, soft-delete and audited correction/regrade workflow recommended for quizzes; preserve written submissions and their exact exam/question/rubric version.

**Verification limits:** live trigger, policies and foreign-key delete rule inspected; no written-exam data was present for runtime validation. No data was changed.


## Written-exam creation can expose a published exam before answer keys are ready (11 November 2026)

`createWrittenExam()` allows an administrator to set `published=true` on the initial `written_exams` INSERT, then inserts the question batch and answer-key batch in separate Supabase requests. The database content-lock trigger bypasses admins. During the interval after the question insert commits but before answer keys commit, student SELECT policies can expose the published exam/questions. The student submission INSERT policy checks that the submitted JSON object has one string per exam question and that each key maps to a question, but it does not require a corresponding `written_exam_answer_keys` row for every question. Therefore a student can submit during this partially initialized interval and consume the unique `(exam_id, student_id)` attempt slot before the answer key batch completes. If answer-key insertion subsequently fails, the action attempts to delete the exam; if that cleanup also fails, an incomplete published exam and early submission can remain. The action's cleanup is a compensating request, not one atomic transaction.

**Impact:** publication readiness and one-attempt fairness/integrity risk. It does not expose answer keys to students, and no such race was reproduced in live data.

**Recommended correction:** create all assessment content unpublished, then publish in a single DB-controlled operation that verifies question count, per-question key completeness/type and total marks under appropriate locking. Better, make assessment creation a single transactional RPC. The database submission guard should independently reject attempts unless the exam is published and complete, including a key row for every question. Do not rely on the admin UI's multi-request sequencing.

**Verification limits:** branch `createWrittenExam()` and `publishWrittenExam()`, live student SELECT/INSERT policies, admin-bypass content trigger, submission table unique constraint and answer-key relation inspected. No written exams/submissions were available for runtime race testing; no data was changed.


## Assessment header totals are not reconciled to question marks (11 November 2026)

The quiz and written-exam creation actions calculate `total_marks` from question marks at creation time. However, the live database constraints only require each question mark to be positive and each header total to be non-negative (quiz) or positive (written exam). There is no aggregate constraint/trigger tying a quiz or written-exam `total_marks` to `SUM(question.marks)`. The publish actions validate question counts and answer-key presence/completeness, but do not recompute or compare the sum of question marks with the stored header total. Administrator RLS policies permit updates to assessment headers and question rows; the content-integrity trigger explicitly bypasses admins. A permitted administrator-side change can therefore leave the published assessment's displayed/grade ceiling total inconsistent with the marks actually assigned to its questions.

**Impact:** score normalization and grading consistency risk. If the header total is below the sum of question marks, a valid question-by-question score may exceed the grading ceiling; if above, students may be graded against marks that cannot be earned. This is a database integrity gap, not a student privilege escalation.

**Recommended correction:** enforce total reconciliation in a transactional publish function and prevent post-publication changes except through versioned correction/regrade workflow. If draft question marks remain editable, recalculate the header total in the same transaction. Add tests for lower/higher header totals, concurrent edits, and published content changes.

**Verification limits:** live CHECK/FK/unique constraints, RLS policies, admin content-trigger bypass, branch create/publish actions inspected. JMT Test currently has zero quiz headers/questions and zero written-exam headers/questions, so no inconsistent row was observed. No database changes were made.


## Quiz submission RPC does not require complete answer-key coverage (11 November 2026)

The live `submit_quiz_attempt(p_quiz_id, p_answers)` SECURITY DEFINER function validates that each supplied answer key identifies a question in the quiz and each option index is in range. It then calculates both `earned` and `possible` by joining `quiz_questions` to `quiz_answer_keys`. It does not independently assert that the quiz has at least one question, that every question has an answer-key row, or that the joined key count equals the quiz question count. Consequently, if a published quiz is visible during the multi-request creation window before answer-key insertion completes (or an administrator leaves key coverage incomplete), the RPC can finalize the student's locked attempt using only the subset of questions with keys. If no keys exist, `possible` is zero and the attempt is still updated with `submitted_at`, `score=0`, and `total_marks=0`; the evidence trigger then returns without recording quiz evidence. If only some keys exist, the denominator and score cover only those keyed questions, potentially overstating performance. The RPC also does not compare its calculated `possible` with the quiz header `total_marks`.

**Positive controls:** the function locks the student's active attempt row `FOR UPDATE`; it rejects unknown question IDs and invalid option indexes; the unique `(quiz_id, student_id)` constraint prevents duplicate attempt rows. These controls mitigate concurrent duplicate submission, but not incomplete assessment scoring.

**Impact:** assessment scoring integrity and attempt fairness; not answer-key disclosure or cross-student access. **Recommended correction:** before updating the attempt, lock/validate the quiz content and assert question count is nonzero, every question has exactly one key, key count equals question count, all key indexes are valid options, and question-mark sum matches the intended header total. Keep publication and submission readiness checks database-enforced. Add tests for zero keys, one missing key, partial keys, concurrent publication/submission and retry after failed submission.

**Verification limits:** live function definition, quiz attempt RLS, answer-key/question constraints and content-integrity trigger inspected. JMT Test contains no quiz or attempt rows; no live submission was performed and no data was changed.


## Expired quiz attempts remain permanently active and cannot be recovered (11 November 2026)

The student `startQuiz()` action creates one `quiz_attempts` row with `started_at=now()` and empty answers. If a row already exists, it redirects to the same attempt; it does not reset or recover an unsubmitted attempt. The submission RPC accepts only rows with `submitted_at IS NULL` and rejects submissions once `now()` exceeds `started_at + duration_minutes + 1 minute`. The academic page does not select `started_at`, render a remaining-time indicator, or provide an expiry/recovery action; it continues rendering the quiz form for an unsubmitted attempt. Thus, if a student starts and abandons a quiz, loses connectivity until after the time limit, or has a submission rejected after expiry, every later submission is rejected as `Time expired`, while the unique `(quiz_id, student_id)` row prevents starting a fresh attempt. The UI's `attempt_exists` path likewise directs the student back to the existing row. A transient RPC failure before expiry can be retried, but after expiry there is no student or staff recovery path in the reviewed flow.

**Impact:** availability and assessment fairness; a student can lose the sole attempt without a recorded result. **Recommended correction:** explicitly model attempt states and expiry; decide and implement a policy such as atomic auto-submit of saved answers at expiry, a controlled staff reset with audit trail, or a bounded resume/grace workflow. Show the server-derived deadline/countdown, and ensure idempotent retries do not consume or strand attempts. Test abandonment, network loss before/after deadline, duplicate submissions, and staff recovery. **Verification limits:** branch action/page and live RPC/unique constraint inspected; JMT Test has no quiz attempts; no user-session simulation or data changes performed.


## Published practice-question edits can rewrite historical analytics

The student-practice authoring action permits assigned teachers/staff and admins to update existing question rows, including question text, options, correct-option index, marks and explanation. The live RLS UPDATE policy scopes the editor to admins or staff assigned to the question's course, but does not distinguish draft from published questions or check whether attempts already exist. The only live BEFORE INSERT/UPDATE trigger on `student_practice_questions` validates option shape, course/subject/concept scope and updates the timestamp; it does not freeze content after publication or first response.

The staff analytics RPC aggregates historical `selected_option` and `is_correct` values from attempts in the preceding 90 days. The analytics page then loads the current question row, including current `correct_option` and current option text, and identifies the most-selected wrong option by comparing historical selected indexes against that current key. Editing the key/options after attempts therefore makes the report's historical accuracy and distractor interpretation inconsistent with the question version students actually answered. The attempt row itself is unchanged, and the mistake-memory snapshot does preserve some original content for incorrect concept-linked responses, but the analytics report has no version join.

**Impact:** assessment history and teacher analytics integrity; this is not a student privilege escalation. **Recommended correction:** make published questions immutable after the first attempt, or introduce versioned question records and bind each attempt to the exact version; preserve old option text and correct key for historical analytics. Corrections should create a new version and optionally an audited regrade workflow. **Verification limits:** branch action, page, migrations, live RLS policy and triggers inspected. JMT Test has zero practice questions and zero attempts, so no historical mismatch was reproduced; no database writes were performed.


## Practice mistake-memory repeat counter is unreachable under one-attempt policy

The practice submission RPC inserts a single attempt per student/question and raises a duplicate-answer error when the unique `(student_id, question_id)` constraint conflicts. The same RPC writes `learner_mistake_memory` for an incorrect answer with a conflict target of `(student_id, source_type, source_question_id)`; its conflict handler increments `occurrence_count`, refreshes the response snapshot and clears `resolved_at`. However, a second answer to that same question cannot reach this upsert: the attempt insert detects the unique conflict first and raises an exception, rolling back the transaction. The success branch that resolves an existing practice mistake for the same question is similarly unreachable after an earlier attempt, because the question is no longer answerable.

**Impact:** the practice engine does not actually count repeated mistakes or allow a later correct response to resolve the same question's prior mistake. Each practice question can contribute at most one mistake record per student; the counter's intended repeated-answer semantics are incompatible with the one-attempt model. This is a learning-feature correctness gap, not an access-control vulnerability. **Recommended correction:** choose and document the intended learning model. If retrying is desired, preserve immutable attempt history and aggregate mistake memory by student/concept/question across attempts, rather than enforcing a single attempt. If one attempt is intentional, remove misleading repeat-counter logic and provide a separate retry/version mechanism or aggregate related question mistakes by concept. Add tests proving the chosen behavior, including wrong-then-correct recovery. **Verification limits:** branch RPC, schema unique constraint and mistake-memory upsert inspected; JMT Test has zero practice questions/attempts and no runtime student simulation was performed.


## Practice authoring has no normal question lifecycle workspace

The staff practice page and server action implement question creation only. The page renders a new-question form and success/error states; it does not query or display existing questions and exposes no edit, unpublish, archive or delete action. The server action inserts a new row only. At the same time, authenticated staff/admin retain table UPDATE grants and an RLS UPDATE policy for assigned courses/admin, including the `is_published` column, so direct authenticated Data API updates are possible even though the normal UI has no guided workflow.

**Impact:** operational governance and correction risk. Staff cannot readily inspect/manage the library or safely correct a just-published item through the provided workspace; the direct-table path bypasses a purpose-built review/version workflow. This compounds the separate finding that published question edits can rewrite historical analytics. **Recommended correction:** add a staff-scoped question inventory with draft/published state, edit and unpublish controls, publication confirmation/review, and immutable versioning once attempts exist; make destructive retirement soft-delete/archive and preserve learner history. If direct table mutation is not intended as a supported interface, narrow grants and route changes through audited server actions/RPCs. **Verification limits:** branch page/action and live grants/RLS inspected; no questions or attempts exist in JMT Test, and no write was performed.


## Practice analytics headline totals exclude suppressed cohorts

The analytics RPC deliberately returns only question cohorts with at least five responses in the rolling 90-day window. The page then computes `totalAttempts` and overall accuracy exclusively by summing those returned question aggregates, but labels the KPI simply “Student attempts” and “Responses in the last 90 days.” Therefore attempts on questions below the five-response threshold are omitted from both totals and accuracy, while the UI does not disclose that the headline is limited to reportable cohorts. This is privacy-preserving behavior, but the displayed metric can be mistaken for the complete platform/course total.

**Impact:** reporting accuracy and decision quality, not an authorization bypass. **Recommendation:** label the KPI “Responses in reportable question cohorts (90 days)” and qualify overall accuracy the same way, or return a separately privacy-reviewed grand total that does not expose suppressed question-level cohorts. If the RPC fails, avoid showing the empty-state sentence “No student responses yet” as though zero were confirmed; distinguish unavailable data from a genuine zero. **Verification limits:** page and deployed JMT Test function definition inspected; no practice rows exist in JMT Test, so no numerical output could be validated.
