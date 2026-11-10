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

**Finding: assignment due_at is presentation-only at the currently inspected enforcement points.** The live public.assignments table has a nullable due_at timestamp. The application submitAssignment action in app/actions/academic.ts (current branch) validates the assignment ID, answer/attachment shape and length, checks whether the student's existing submission is already graded, then inserts or updates assignment_submissions. It does not load the assignment's due_at or compare it with database time. The live RLS policy "students submit own assignments" checks student role/ownership, ungraded metadata, a submitted_at upper bound of now()+30 seconds, content length/attachment bounds, published assignment, and active paid enrollment; it does not compare now() or submitted_at to assignments.due_at. The live "students update own ungraded submissions" policy has the same omission. The policies permit a client-supplied submitted_at value up to 30 seconds in the future, with no lower bound, so submitted_at must not be treated as proof that a submission met a deadline.

**Impact / classification:** If due_at is intended to be a hard submission cutoff, a student with otherwise valid access can submit or revise work after the displayed deadline, including through direct authenticated Data API calls. This is an assessment-deadline integrity / functional authorization gap, not a cross-user data disclosure. If late submissions are intentionally allowed, the behavior should be made explicit in product requirements and the UI rather than implying that due_at closes submissions.

**Recommended remediation (not applied):** Define late-submission policy first (hard cutoff, grace period, or accepted-but-flagged late). For a hard cutoff, enforce `due_at IS NULL OR now() <= due_at` using database time in both INSERT and UPDATE row policies or a trusted database trigger/RPC; do not rely on client `submitted_at`. Add tests for before, exactly at, and after deadline; late updates to existing ungraded submissions; null deadlines; timezone boundaries; and direct REST calls. Consider storing a server-generated received timestamp separately from any client timestamp. No SQL, app code, or database changes were made during this review.
