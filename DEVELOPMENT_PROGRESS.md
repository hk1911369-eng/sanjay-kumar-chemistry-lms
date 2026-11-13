# Development progress — Learning OS expansion

## Product direction

JMT Academy is a multi-subject Learning Operating System. Chemistry is a subject, not the product boundary. The shared subject model is designed for science, mathematics, languages, business, humanities, ICT and future curricula.

## Implemented foundation

- Added a universal subject catalogue and course-subject mapping.
- Existing course subjects are backfilled additively; course creation/edit now synchronizes the selected subjects into the catalogue.
- Added hierarchical learning concepts, prerequisite relationships and lesson-to-concept links.
- Added learning activity events with database rules preventing student-submitted assessment scores.
- Added learner profile, concept mastery, mistake memory, revision task and study goal records.
- Added student Learning OS dashboard with weekly goals, revision queue, tracked-topic count and evidence-based mastery indicators.
- Lesson completion now records a learning event.
- Staff access to learner mastery is restricted to concepts in the staff member's assigned course subjects; the global academic profile is visible only to the student and administrators.
- Added indexes for the new Learning OS foreign-key relationships.
- Added a complete subject-agnostic roadmap covering adaptive learning, AI tutoring, prediction, social learning, virtual labs, parent access, offline-first delivery and SaaS tenancy.

## Verification — historical snapshot; recheck before release

- Supabase migrations for the foundation, event integrity, subject-scoped staff visibility and foreign-key indexes have been applied.
- All Learning OS tables have RLS enabled and anonymous table access revoked.
- Guardrail tests and ESLint pass on the latest tested code increment; TypeScript and production build also pass.
- Production dependency audit reports zero high-severity production vulnerabilities.
- The latest dashboard changes are committed to GitHub; deployment is gated on the verified mainline CI result.

## Important limitations — not yet complete

- No concepts or course-subject rows exist until administrators create/update courses and map concepts. The production database currently has no courses, so mastery and revision dashboards correctly show empty states.
- Mastery calculations, spaced-repetition scheduling, mistake classification and recommendation ranking still need trusted processing logic.
- AI tutor, AI question generation, validated exam predictions, social network, virtual labs, parent dashboard, voice tutor, full offline sync and multi-tenant SaaS rollout remain future implementation phases.
- HSC/admission predictions must wait for sufficient historical outcomes and calibration; no unsupported admission probabilities or guaranteed results will be shown.
- Tenant isolation must be implemented across every table, storage path, background job and query before exposing white-label institute workspaces.
- Supabase Auth leaked-password protection remains a dashboard-only setting; it has not been enabled through the available project controls.


## Verification status clarification — 11 November 2026

The verification bullets above record an earlier development checkpoint. They must not be read as proof of the current live database state or as a complete verification of the current 218-migration branch.

- The latest previously verified successful CI run was for commit `a1085ca334ff7a5d7423383ee50ede79af5e2fd4` (guardrail tests, ESLint, TypeScript, production build, production dependency audit). The latest audit check found no workflow run for the then-current PR head. The current head must not be described as CI-green until a workflow run completes successfully.
- The current repository does not contain a visible Supabase local configuration, pgTAP suite, or PostgreSQL integration-test workflow. The CI checks source and application build behavior, not live RLS policies under distinct database roles.
- Statements above about migrations being applied, all Learning OS tables having RLS, and production having no courses describe the state reported at the earlier checkpoint. Reconfirm against the actual Supabase project's migration history and schema before relying on them.
- Do not infer that the full current migration set has been applied to either test or production from the source tree. The private lab evidence migration specifically comments that it was applied to the isolated JMT Test project and not production at that time.
- Production deployment remains gated on database-history reconciliation, runtime role/Storage tests, and the remaining release checks documented in `AUDIT_REPORT.md`.


## Security remediation checkpoint — 13 November 2026

- Added a guarded assignment-grading RPC and routed the server action through it; source regression test added.
- Added approval-time revalidation for monthly-payment enrollment status, admission-paid state, and delivery-mode consistency; source regression test added.
- These migrations are pushed to the audit branch but have not been applied to JMT Test or production.
- Latest verified CI at commit 'c3e6c8859d428381b503716de65a7bbec9e925c5' passed the test, lint, TypeScript, build, and production dependency-audit steps. Recheck CI on the next branch head before release decisions.
- Outstanding: reconcile migration history before applying any migration, add PostgreSQL role-level integration tests, resolve the legacy NULL-mode initial-payment policy using a verified grandfathering rule, and complete the remaining live Auth/Storage/RLS checks.


## Latest audit continuation — 13 November 2026

- Rechecked PR #42 against its exact current head, `c5252ad5ff4334ce8a909a4cb3ad6d1483e2cb23`.
- CI run `43435615640` completed successfully on that exact SHA: guardrail tests, ESLint, TypeScript, production build and production dependency audit all passed.
- Combined commit-status endpoint still reports `pending` with zero status entries; the successful GitHub Actions check-run is the verified CI result.
- Reconciled the thirteen 13-November security migrations against live JMT Test catalog state. Several are genuinely absent; others are already represented in schema despite ledger gaps. See `AUDIT_REPORT.md` for the object-by-object reconciliation.
- No Supabase migration was applied. No Auth, Storage, production, payment, enrollment or profile data was changed.
- PR #42 remains open and draft. The next safe phase is migration-history reconciliation plus authenticated PostgreSQL integration tests in the isolated test project, only after explicit authorization to mutate that test database.

## Latest verification extension — 13 November 2026

- Confirmed CI run `43436664528` passed on exact PR head `291791250f4eb9ff2a868ba19ea740b83cfaf3a5`; check-run conclusion is success. The combined commit-status API still has zero entries and reports pending, so only the Actions check-run is described as passed.
- Additional live checks: all inspected exposed public tables have RLS enabled; no UPDATE policy lacks WITH CHECK; the practical analytics view is security-invoker and underlying RLS scopes staff to assigned courses; no inspected SECURITY DEFINER function is PUBLIC-executable; public schema CREATE is unavailable to anon/authenticated/service_role.
- No database or Auth settings changed. The Auth leaked-password-protection advisor finding remains open because no read-only Auth settings action is exposed.


## Latest exact-head verification — 13 November 2026

- Pushed combined source/test commit `0a68792cc8de1518c2dc90e2ccd3aced2f781385` to `audit/jmt-master-prompt-follow-through`.
- CI run `43439956582` passed on that exact SHA: guardrail tests, ESLint, TypeScript, production build and production dependency audit. The audit reported zero production dependency vulnerabilities.
- The content-read migration now covers eleven tables, including student course metadata and course-subject metadata; the student role branch is explicit in both.
- PR #42 remains open and draft. Its current review surface is 1,348 commits, 394 changed files, 34,407 additions and 682 deletions. This is a significant review/scope risk; green CI is not approval to merge.
- The combined commit-status endpoint reports pending with zero entries; the successful Actions check-run above is the verified CI result.
- No database migration, Auth setting, Storage object, production resource, PR merge or deployment was changed.
