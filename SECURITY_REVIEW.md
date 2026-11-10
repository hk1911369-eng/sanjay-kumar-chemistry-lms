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
