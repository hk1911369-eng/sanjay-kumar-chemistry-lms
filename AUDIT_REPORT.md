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

A second comparison was performed using the full ordered JMT Test migration ledger and the current branch's migration filenames. Matching was done by migration name (the filename without its numeric prefix and `.sql` extension), not by version number.

| Measure | Result |
|---|---:|
| JMT Test ledger rows | 244 |
| Current branch migration files | 218 |
| Distinct names in JMT Test ledger | 203 |
| Distinct names in branch | 214 |
| Names occurring more than once in JMT Test ledger | 37 |
| Names occurring more than once in branch | 4 |
| Distinct ledger names absent from branch filenames | 29 |
| Distinct branch filenames absent from ledger names | 40 |

The 29 ledger-only names include legacy numbered migrations (for example `0036_...` through `0049_...`), old/squashed foundation names, and intermediate hardening migrations. The 40 branch-only names include the current base migration set, renamed/reworked migrations, and later branch migrations whose names do not appear in the ledger under the same label. Some repeated ledger names are expected to represent separate historical applications/revisions; some branch filenames also intentionally retain multiple versions of a function-hardening migration.

**Interpretation:** this is a material name/version mapping discrepancy, but it is not proof that the database is missing exactly 40 SQL changes or that 29 database changes are obsolete. Filename-name matching cannot determine SQL equivalence, ordering, or whether an earlier migration's effects were later replaced. The database's latest ledger version for `require_active_role_for_course_subject_reads` is `20261110181004`, while the current source file is prefixed `20261110274000`; do not assume they are interchangeable without inspecting the exact migration history and resulting schema.

**Required safe resolution before a future migration push:**
1. Export and preserve the full ordered migration ledger from JMT Test.
2. Compare the Git history and exact SQL contents for every source-only and ledger-only name, including duplicate names and version changes.
3. Inspect current schema objects and function/policy definitions to establish the effective state, not merely the history labels.
4. Rehearse the proposed migration plan against a disposable clone or fresh isolated project.
5. Only after explicit review, decide whether to retain, repair, or baseline migration history. Do not delete ledger rows, rewrite migration versions, or run `migration repair` based on this report alone.

This reconciliation was read-only. No migrations were applied, repaired, or removed.
