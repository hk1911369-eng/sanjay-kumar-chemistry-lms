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
- The latest CI run observed during this audit was still in progress. Do not report the latest branch head as green until its run completes successfully.

### Remaining work before release

1. Complete a catalog-level SECURITY DEFINER review against the actual isolated database: function identity and overloads, owner, security mode, fixed search path, EXECUTE ACLs, trigger bindings, and role/ownership checks.
2. Add executable PostgreSQL/Supabase integration tests using anonymous, inactive, Student A/B, assigned/unassigned Teacher/Staff, and Admin identities. Exercise table operations, RPC execution, and private Storage object operations.
3. Verify the complete migration history and resulting schema on a disposable test project before any production change.
4. Verify production service-role environment configuration, Supabase Auth MFA policy, private Storage behavior, signed-download handling, and retention/deletion behavior.
5. Complete browser/mobile, email delivery, payment end-to-end, XSS/CSRF, and independent penetration testing.

**Current assessment:** The branch has materially more implemented security functionality than the Version 8 / v9 historical audit describes. Source-level hardening is substantial, but CI is not a live database security test. The application must not be represented as fully security-tested or production-ready until the runtime authorization matrix and remaining release checks pass.
