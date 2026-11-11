# JMT QA & Release Audit — 11 November 2026

**Scope:** Pull request #42, `audit/jmt-master-prompt-follow-through`  
**Audited head:** `9408e07108a2a2ff42425ac856eb66cb9418d1de`  
**Audit mode:** Repository/CI evidence review. No production probing, deployment, merge, or database mutation.

## Executive decision

**NOT READY for production merge/deploy.**

This is a bounded evidence-based review, not a claim that every route or workflow has been tested. The current PR contains substantial security and application changes, but the documented production/test-environment divergence and absence of a representative staging environment remain release blockers.

## Current-head CI evidence

Workflow: [Quality checks](https://github.com/hk1911369-eng/sanjay-kumar-chemistry-lms/actions/runs/43064787730)

At the time of this snapshot:
- Dependency installation: passed.
- Guardrail tests (`npm test`): passed.
- ESLint: passed.
- TypeScript (`npm run typecheck`): passed.
- Production build (`npm run build`): in progress; no result claimed.
- Production dependency audit (`npm audit --omit=dev`): pending; no result claimed.

This run is associated with the audited head SHA above. Recheck the run before treating the build or dependency audit as passed.

## Repository observations

### Browser-test coverage

The root `package.json` defines:
- `npm test`: `node --test tests/*.test.mjs`
- `npm run lint`: `eslint .`
- `npm run typecheck`: `tsc --noEmit`
- `npm run build`: `next build`

No Playwright dependency, Playwright config, or dedicated browser E2E test path was found at this audited head. This is a coverage gap, not proof that every workflow is broken. Browser execution has not been performed in this audit.

### Scope and change risk

PR #42 touches a broad surface including student/teacher/admin routes, server actions, virtual-lab components, payment and assessment flows, Supabase migrations, CI workflows, and research/curriculum documentation. The route and server-action changes warrant journey-based regression rather than relying only on unit/guardrail tests.

## Critical journey inventory and required assertions

| Priority | Journey | Required observable assertions | Status |
|---|---|---|---|
| P0 | Authentication and role boundaries | Student/teacher/admin sessions; inactive profile denied; expired session handled; cross-role access denied | Not browser-tested |
| P0 | Paid course access | Pending/unpaid user cannot read protected lessons, quiz questions, or progress endpoints; approved enrollment can | Policy evidence exists in migration/test docs; full E2E unverified |
| P0 | Assessment integrity | Student cannot alter grading fields or submit outside allowed exam window; duplicate/retry behavior is safe | Targeted migrations exist; browser/API journey unverified |
| P0 | Payment approval | Student cannot approve own payment or change fee/approval metadata; authorized staff action audited | Policy changes documented; end-to-end unverified |
| P1 | Written exam save/recovery | Draft survives refresh, transient network failure and retry; final submission is immutable to student | Not browser-tested |
| P1 | Practice and revision | Attempt ownership, answer validation, score persistence and paid-access checks work end-to-end | Not browser-tested |
| P1 | Virtual lab evidence | Evidence upload is owner-bound, private where required, tamper-resistant and reviewable by assigned teacher | Not browser-tested |
| P1 | Teacher authoring/review | Teacher can only manage assigned courses; publication and grading state transitions are validated server-side | Not browser-tested |
| P2 | Responsive/accessibility | Keyboard navigation, labels, focus, contrast, Bengali text wrapping and mobile layouts | Not audited in browser |

## Confirmed release blockers from the existing reconciliation record

The repository's `docs/security-release-reconciliation.md` records the following environment-specific findings:
1. Production has authenticated-client `TRUNCATE` and `TRIGGER` privileges on 33 of 49 public tables.
2. Production is missing seven tables and 22 public functions present in JMT Test.
3. Production security policies are older than the hardened test policies in several student, discussion, payment, notification and assessment paths.
4. Supabase Auth leaked-password protection is disabled in production.
5. JMT Test has only three profiles and three courses and lacks enrollments, lessons, assignments, quizzes, written exams and discussion records; it is not representative for complete student E2E testing.
6. No separate staging service exists; PR previews are disabled.
7. Migration ledgers differ materially and must not be reconciled by blindly replaying test migrations or deleting history rows.

These are recorded findings from the prior environment comparison; they were not re-probed or modified during this audit.

## Recommended next sequence

1. Let the current-head CI run finish; preserve the exact SHA and all job conclusions.
2. Provision/designate a non-production staging environment without unapproved spend; seed synthetic users for each role and representative course/assessment data.
3. Add Playwright to the existing Node/Next test architecture only after inspecting the lockfile and choosing a compatible version. Keep credentials in CI secrets; never commit live credentials.
4. Implement a small smoke suite first: login/role denial, paid-vs-unpaid course access, assessment attempt/save/reload, payment approval authorization, and lab-evidence ownership.
5. Add API/data integrity tests for idempotency, retries, concurrent submissions, migration compatibility and storage access.
6. Run focused accessibility and responsive checks on student, teacher and admin critical routes.
7. Reconcile production schema/policies/privileges in staging, validate backups and restore procedure, then conduct a reviewed rollout/rollback rehearsal.

## Evidence limitations

- No browser was launched and no Playwright test was executed.
- No live production security scan was performed.
- No staging service or representative test dataset was available in this audit.
- No production data, schema, auth setting, deployment, or PR state was changed.
- A passing test suite on this head does not by itself certify release readiness.

## Verdict

**NOT READY for production merge/deploy.** Reconsider only after the production security/schema gaps are resolved through a reviewed staging reconciliation, representative critical journeys pass, and backup/restore plus rollback are demonstrated.


## Follow-up verification — 11 November 2026

After the initial report commit, the repository test directory was enumerated directly:
- **129** files matching the current Node test glob `tests/*.test.mjs` were present.
- The suite is broad and includes security/role guards, payment ownership and approval, assessment integrity, practice/revision, learning-event integrity, virtual-lab and lab-notebook logic, and written-exam validation/drafts.
- These are valuable automated tests; they should not be confused with browser-driven end-to-end tests. The package manifest still has no Playwright dependency or browser-test script, and no Playwright config was found at the audited branch.

The CI run associated with report commit `5b1e8687e11b5b791989429a391d9e2319b7250f` subsequently completed successfully:
- `npm ci`: passed.
- `npm test`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm audit --omit=dev`: passed.
- Workflow run: [43065189910](https://github.com/hk1911369-eng/sanjay-kumar-chemistry-lms/actions/runs/43065189910).

This successful run validates the exact report commit, not a later commit created by this follow-up edit. CI must be checked again for the resulting branch head.

### Browser tooling constraint

The BrowserAct skill is present in the available skill catalogue, but its CLI was not installed in this execution environment. The documented installation attempt failed because the environment could not resolve/download the required Python 3.12 runtime from GitHub. No browser was launched and no browser journey was executed. This is an environment limitation, not a test failure in the application.

### Updated interpretation

The correct conclusion is **strong automated Node-level regression coverage, but no verified browser E2E coverage yet**. The earlier wording “no browser-level coverage” refers specifically to the missing Playwright/browser harness, not absence of automated tests generally. The release verdict remains **NOT READY** because staging, production parity, and critical browser journeys remain unverified.


## CI completion follow-up — 11 November 2026

The previously in-progress run completed successfully on the audited report commit:

- Commit: `5b1e8687e11b5b791989429a391d9e2319b7250f`
- Run: [Quality checks #1114](https://github.com/hk1911369-eng/sanjay-kumar-chemistry-lms/actions/runs/43065189910)
- Guardrail tests: passed.
- ESLint: passed.
- TypeScript: passed.
- Production build: passed.
- Production dependency audit: passed.

This establishes that the repository's configured CI gates passed for that exact commit. It does **not** close the browser E2E, populated staging, production schema/security reconciliation, or manual operational release gates described above. The release verdict therefore remains **NOT READY for production merge/deploy**.


## PR change inventory follow-up

The PR file inventory was re-counted after the CI follow-up. Across 363 changed paths:
- 106 Node test files (`tests/*.test.mjs`) are included in the PR diff.
- 23 changed app page routes.
- 16 changed server-action files.
- 118 Supabase migration files.
- 3 GitHub Actions workflow files.
- 18 lab-related component files.
- 0 Playwright or dedicated E2E files/configuration in the PR diff.

These are changed-file counts, not a claim that every item is newly created or that every scenario has runtime coverage. The absence of Playwright/E2E files is consistent with the root `package.json`, which currently exposes only the Node test, lint, typecheck and build scripts. The 106 Node tests are valuable guardrails, but source-inspection assertions and model/unit tests do not replace real browser journeys against seeded data.


## Live Supabase parity and security recheck — 11 November 2026

Read-only checks were run against the connected non-test project (the primary project referred to as production in the existing reconciliation) and the separately named **JMT Test** project. No SQL writes, migrations, Auth changes, or data mutations were performed.

### Exact current schema inventory

| Inventory | Primary non-test project | JMT Test | Difference |
|---|---:|---:|---:|
| Public base tables | 49 | 57 | 8 missing in primary |
| Public functions | 53 | 78 | 25 missing in primary |
| Public RLS policies | 100 | 147 | 47 fewer in primary |
| Non-internal public triggers | 30 | 60 | 30 fewer in primary |
| Public-table constraints | 295 | 377 | 82 fewer in primary |
| Public indexes | 170 | 210 | 40 fewer in primary |
| Storage buckets | 4 | 5 | 1 fewer in primary |
| Migration ledger rows | 105 | 255 | 150 fewer in primary |
| Latest migration version | `20261108221907` | `20261111133701` | Test ledger is substantially ahead |

The eight public tables present in JMT Test but absent in the primary project are:
- `assignment_submission_versions`
- `lab_notebook_entries`
- `lab_notebook_evidence`
- `lab_notebook_review_history`
- `lab_practical_assignments`
- `student_practice_attempts`
- `student_practice_questions`
- `virtual_lab_catalog`

The 25 public function names present in JMT Test but absent in the primary project are:
- `capture_practical_learning_mastery`
- `enforce_assessment_content_draft_integrity`
- `enforce_lesson_concept_draft_integrity`
- `enforce_student_activity_rate_limit`
- `enforce_teacher_curriculum_draft_integrity`
- `get_staff_practice_analytics`
- `get_student_practice_questions`
- `guard_assessment_submission_edits`
- `guard_concept_parent_edge`
- `guard_lab_notebook_assignment_link`
- `guard_lab_notebook_entry_write`
- `guard_lab_notebook_evidence_insert`
- `guard_lab_practical_assignment_write`
- `guard_manual_payment_approval`
- `guard_notification_read_state`
- `guard_student_practice_question_scope`
- `prevent_practice_question_history_rewrite`
- `prevent_teacher_attendance_identity_change`
- `record_assignment_submission_version`
- `record_lab_notebook_review_history`
- `record_lesson_completion`
- `record_practical_review_as_learning_event`
- `schedule_revision_after_mastery_update`
- `set_lesson_discussion_pin`
- `submit_student_practice_answer`

These are live metadata counts and name differences, not a migration recommendation. They confirm that the current primary and test schemas are not at parity. Do not replay the test ledger blindly: versions and history differ, and some migrations may be non-idempotent or depend on prior state. Build a reviewed, ordered reconciliation plan with backups and explicit rollback/forward-fix steps.

### Security advisor findings

Both projects' live Supabase security advisors reported:
- One anonymous-executable `SECURITY DEFINER` function: `public.get_public_course_teachers(uuid)`.
- Multiple authenticated-executable `SECURITY DEFINER` RPCs (18 in the primary project, 23 in JMT Test).
- Leaked-password protection disabled.
- Two RLS-enabled, policy-free rate-limit event tables: `app_rate_limit_events` and `auth_rate_limit_events` (INFO finding).

The authenticated RPC warnings are not automatically vulnerabilities. I inspected the definitions of payment approval, student-account activation, quiz submission, practice-question delivery and practice-answer submission. The sampled functions check the active authenticated identity and expected role; payment approval checks for admin, and student learning functions check student role and paid active enrollment. `current_role()` returns a role only for an active profile. These source checks reduce concern but do not replace negative authorization tests with real role fixtures.

The anonymous teacher-listing RPC is intentionally public-facing, but a concrete primary/test mismatch exists:
- Primary project definition filters for published, non-archived courses and teacher/staff roles, but **does not filter `profiles.is_active`**.
- JMT Test definition additionally requires `p.is_active IS TRUE`.
- The PR contains migration `20261110115928_filter_inactive_public_course_teachers.sql` and a Node guard test for this rule.
- The primary project's migration ledger currently ends at `20261108221907`, so that migration is not recorded as applied there; JMT Test includes it.

**Finding (P1 privacy/parity):** before the primary project is treated as release-equivalent, apply and verify the reviewed active-teacher filter through the approved migration reconciliation. Until then, the public course-teacher RPC can return the names/IDs of inactive assigned teachers. This is narrower than a general profile-data leak; the inspected return shape contains only ID and full name.

**Finding (P1 security configuration):** leaked-password protection is disabled in both projects according to the live advisors. Enable it through a reviewed Auth configuration change before broad public onboarding, then verify the setting. No Auth setting was changed during this audit.

The rate-limit tables' RLS-enabled/no-policy state is consistent with a deny-by-default, server-only design if clients are not meant to query them directly. Verify table grants and intended access before changing policies; do not add broad client policies just to silence the INFO finding.

### Current-head CI

The latest PR head at the time of this check is `ac217af815df289d8a7c53e97ad4341b9c4e03fa`. Its Quality checks workflow run `43065916384` completed successfully:
- Dependency installation: passed.
- Guardrail tests: passed.
- ESLint: passed.
- TypeScript: passed.
- Production build: passed.
- Production dependency audit: passed.

This is the first verified CI result for the exact current documentation-updated PR head. It does not resolve the live schema gap, Auth configuration warning, or missing browser E2E.

### Browser tooling attempt

The Web App QA & Release Copilot skill and its `audit-release`, `map-critical-journeys`, `build-playwright-tests`, `audit-api-data`, `audit-security-privacy`, `review-dependencies-ci`, and `decide-release` workflows are now present in the available skill catalogue and were read for this review. The separate BrowserAct skill is also available. However, the BrowserAct CLI is absent; installation was attempted with the available `uv 0.10.0` and failed because the execution environment could not resolve/download the Python 3.12 runtime from GitHub. No browser session was started, and no browser journey is claimed as passed.

### Updated release decision

**NOT READY for production merge/deploy.** The exact current-head CI is green, but the live database comparison confirms eight missing tables, 25 missing functions, 47 fewer public policies, 30 fewer triggers, 82 fewer constraints, 40 fewer indexes and one fewer storage bucket in the primary project relative to JMT Test. The inactive-teacher public RPC mismatch and disabled leaked-password protection also remain open. Reconcile these deliberately in a controlled staging/release process; do not blindly replay migrations or change production/Auth settings as part of this audit.


## Latest PR-head verification and focused source review

**Latest PR head checked:** `ac217af815df289d8a7c53e97ad4341b9c4e03fa`  
**GitHub Actions:** [Quality checks #1117](https://github.com/hk1911369-eng/sanjay-kumar-chemistry-lms/actions/runs/43065916384) — completed successfully. All job steps reported success: checkout, Node setup, dependency install, guardrail tests, ESLint, TypeScript, production build and production dependency audit.

This run is associated with the current PR head observed during this review. It confirms the configured CI workflow passes; it does not establish live database or browser behavior.

### Focused source review — positive controls observed

The following controls were inspected in the PR source and corresponding tests:

- **Authentication/role lifecycle:** public registration does not accept a role; database provisioning assigns the student role; profile role and student identity fields are guarded; inactive profiles are rejected across privileged actions and workspaces.
- **Payment reconciliation:** reconciliation is restricted to active admins; CSV rows are bounded and validated; approval matching checks provider, transaction ID, amount and sender; duplicate/repeated-sender cases are flagged; bulk approval reuses the database approval RPC and the UI asks for confirmation.
- **Lab notebook evidence:** uploads are student-owner scoped, size-limited to 8 MiB, checked against binary signatures, stored under server-generated paths, and linked to notebook metadata. The database trigger checks path ownership, MIME/extension agreement, storage metadata and an eight-file limit. Download requires an authenticated RLS-visible metadata row and issues a 60-second signed URL with private/no-store and no-referrer headers.
- **Lesson completion:** a single database RPC validates student role, published lesson/course relationship and active paid enrollment before atomically recording progress and a learning event.
- **Written-exam drafts:** the draft table is not directly exposed for client CRUD; load/save RPCs enforce active paid access, course publication/archive state and exam schedule; answer keys are checked against exam question IDs; optimistic version checks prevent silent concurrent overwrites; final submission clears the draft.

### Evidence-quality limitation

The inspected tests include useful executable helper tests (for example, CSV parsing and MIME signature validation), but many security and database tests assert source/migration text patterns. They do **not** execute PostgreSQL RLS policies, triggers, RPCs, concurrent transactions, signed-URL authorization, or real user journeys. Those behaviors remain unverified until run against a disposable, representative Supabase staging environment and a real browser test harness.

### CSP hardening follow-up

The current `next.config.ts` applies a CSP with `script-src 'self' 'unsafe-inline'`, and broad scheme-wide `https:`/ `wss:` allowances for connections, frames, images and media. These allowances may be needed for current Next.js/Supabase integrations, so this review does not label them a demonstrated exploit. They do reduce origin-level restriction and inline-script protection. A nonce/hash-based script policy and explicit host allowlists should be evaluated in staging with hydration, auth redirects, storage uploads and virtual-lab embeds before tightening.

### Updated conclusion

The latest PR head has a green configured CI pipeline and the inspected source contains several meaningful server-side controls. The release verdict remains **NOT READY**: no browser E2E execution, no representative staging database test, and no fresh production schema/privilege reconciliation or restore/rollback rehearsal have been evidenced.
