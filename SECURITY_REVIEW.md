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

The JMT Test migration ledger has 244 rows versus 218 SQL files in the current branch. After stripping numeric prefixes of any length from both ledger labels and source filenames, 192 distinct normalized names appear on both sides, 22 source labels have no direct ledger-name match, and 10 normalized ledger labels have no direct source-name match. The ledger contains 37 duplicated-name groups; the source contains four duplicated-name groups. The latest ledger row and latest source file share the normalized name `require_active_role_for_course_subject_reads` but have different version identifiers (`20261110181004` versus `20261110274000`). These are name-level comparisons only: they do not prove SQL equivalence, migration ordering, or which changes were applied. The unmatched and duplicated groups must be traced through Git history, exact SQL, and resulting schema before any further migration push; do not attempt automatic repair from counts alone.

A targeted schema-effect check also confirmed that `profiles.is_active` exists (the effect of a historical ledger-only label), while the JMT Test `virtual_lab_catalog_simulation_type_check` constraint does not include `gas-laws`. The current branch migration `20261110260000_add_ideal_gas_law_virtual_lab.sql` adds that value, so this particular source migration effect is not yet present in JMT Test. This is direct evidence of branch/database drift, not authorization to apply it without the full migration rehearsal.

These catalog findings do not establish runtime RLS behavior. A role/JWT test matrix and Storage upload/download tests remain outstanding. Full details are in `AUDIT_REPORT.md`.
