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
2. Production is missing eight tables present in JMT Test; the exact live schema comparison is recorded in the updated reconciliation document.
3. Production security policies are older than the hardened test policies in several student, discussion, payment, notification and assessment paths.
4. Supabase Auth leaked-password protection is disabled in production.
5. JMT Test has only three profiles and three courses and lacks enrollments, lessons, assignments, quizzes, written exams and discussion records; it is not representative for complete student E2E testing.
6. No separate staging service exists; PR previews are disabled.
7. Migration ledgers differ materially and must not be reconciled by blindly replaying test migrations or deleting history rows.

These findings have since been re-probed read-only on 11 November 2026. See the live verification section below and `docs/security-release-reconciliation.md` for exact current counts. No database settings or data were modified.

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


## Documentation commit status note

This audit update itself was committed as `152441de76526829d48c4d517ac8c7e2560a927f`. The PR head now points to that documentation-only commit. At the time of this check, GitHub returned no PR workflow run and no combined status checks for this new SHA. Therefore the green run #1117 above is evidence for its exact parent code head `ac217af815df289d8a7c53e97ad4341b9c4e03fa`, not a claimed CI pass for this later documentation commit. No application code changed in the documentation-only commit.


## Representative data and migration precondition recheck — 11 November 2026

Read-only row-count checks further clarify staging readiness:

| Data | Primary non-test project | JMT Test |
|---|---:|---:|
| Profiles | 3 | 3 |
| Courses | 0 | 3 |
| Academic subjects | 0 | 8 |
| Course-subject mappings | 0 | 24 |
| Enrollments | 0 | 0 |
| Lessons | 0 | 0 |
| Student practice questions | Table absent | 0 |
| Lab notebooks | Table absent | 0 |
| Lab practical assignments | Table absent | 0 |

No row contents or personal data were retrieved; only aggregate counts were queried. The test project has a synthetic course/subject scaffold, but it still cannot exercise paid student access, lesson completion, written/quiz attempts, practice grading, notebook submission or teacher review because the required enrollment/lesson/question/notebook records are absent. The primary non-test project has no courses or academic subjects at all.

### Migration seed precondition

The branch migration `20261110100000_database_driven_virtual_lab_catalog.sql` inserts virtual-lab catalogue rows using fixed subject UUIDs and foreign keys to `public.academic_subjects(id)`. JMT Test contains those predetermined subject IDs; the primary non-test project's `academic_subjects` table is empty. Applying that migration to the primary project without a prior, verified subject seed would fail at the catalogue insert's foreign-key constraint.

The earlier multi-subject foundation migration creates the subject table and derives subjects from existing course subject arrays; it does not create the eight fixed subject rows when there are no courses. Therefore the rollout needs an explicit, idempotent subject-catalogue seed/precondition and a verification query before the virtual-lab catalogue migration. Do not simply run the current migration sequence against the primary project.

**Finding (P1 migration safety):** the virtual-lab catalogue migration is not self-sufficient on an empty academic-subject dataset. Add a reviewed, idempotent seed/reconciliation step (or make the catalogue insert resolve subjects by stable slugs and tolerate absent subjects) and test it against an empty database before any production rollout.

### Current-head CI qualification

The last confirmed successful workflow run remains run `43065916384` on commit `ac217af815df289d8a7c53e97ad4341b9c4e03fa`. The current audit-document commit is newer; at the time of this write, GitHub reports no workflow run/status checks for that documentation-only commit. Do not describe the latest document commit itself as CI-green until a run is observed.


## Live database and schema verification — 11 November 2026

The two connected Supabase projects were re-queried read-only. This section supersedes the earlier historical counts in this report where they differ.

### Current project state

| Measure | Primary / production | JMT Test |
|---|---:|---:|
| Public base tables | 49 | 57 |
| Tables with RLS enabled | 49 | 57 |
| Tables granting authenticated TRUNCATE | 33 | 0 |
| Tables granting authenticated TRIGGER | 33 | 0 |
| Tables granting anon TRUNCATE or TRIGGER | 0 | 0 |
| Recorded migration entries | 105 | 255 |
| Distinct migration names | 98 | 213 |

The eight tables present in JMT Test but absent from primary are: `assignment_submission_versions`, `lab_notebook_entries`, `lab_notebook_evidence`, `lab_notebook_review_history`, `lab_practical_assignments`, `student_practice_attempts`, `student_practice_questions`, and `virtual_lab_catalog`.

The two rate-limit event tables have RLS enabled and no client SELECT/INSERT/UPDATE/DELETE privileges in either project. Their no-policy advisor notices are consistent with an internal-only design.

### Migration-history and feature rollout risks

After normalizing numeric prefixes and underscores in migration names, the ledger inventory has 94 common names, 119 names present only in JMT Test, and 4 names present only in primary. This is only a name-based comparison, not proof of semantic equivalence. Version identifiers differ. Do not replay the test ledger or delete migration history to force parity.

The branch contains `20261111110000_add_written_exam_autosave_recovery.sql`, but that version is not in the live JMT Test migration ledger. The `written_exam_drafts` table and its load/save RPCs are absent from both live schemas. The test ledger already contains later versions through `20261111133701`; migration sequencing and reconciliation must be reviewed before applying the missing earlier-version migration.

The virtual-lab catalogue migration `20261110100000_database_driven_virtual_lab_catalog.sql` seeds rows using fixed subject UUIDs. Live primary `academic_subjects` contains zero rows; JMT Test contains eight subjects. Applying that catalogue migration to primary without an explicit subject seed/precondition would fail its foreign-key inserts. The rollout needs an idempotent subject-catalogue seed/reconciliation step and a verified preflight query.

### Representative data check

| Data fixture | Primary / production | JMT Test |
|---|---:|---:|
| Profiles | 3 | 3 |
| Courses | 0 | 3 |
| Enrollments | 0 | 0 |
| Lessons | 0 | 0 |
| Assignments | 0 | 0 |
| Quizzes | 0 | 0 |
| Written exams | 0 | 0 |
| Discussions | 0 | 0 |
| Notifications | 0 | 0 |
| Academic subjects | 0 | 8 |

Neither project currently supports meaningful end-to-end role testing with real enrollment and assessment fixtures. JMT Test is structurally more complete, but not populated enough to test paid/unpaid student journeys, teacher grading, payment approval, or practical evidence review.

### Live advisor results

| Advisor | Primary / production | JMT Test |
|---|---:|---:|
| Security | 22 findings (2 INFO, 20 WARN) | 27 findings (2 INFO, 25 WARN) |
| Performance | 91 findings (64 INFO, 27 WARN) | 120 findings (98 INFO, 22 WARN) |

The security WARNs include one anon-callable `SECURITY DEFINER` directory function, 18 authenticated-callable functions in primary, 23 in JMT Test, and leaked-password protection disabled in both projects. The rate-limit tables account for the two INFO notices. Source review of all primary authenticated-callable functions and the five additional test-only functions found pinned search paths and explicit identity/role/ownership checks. These advisor warnings are not 41 proven vulnerabilities and should not be “fixed” by blanket revocation.

One public-directory discrepancy remains: primary `get_public_course_teachers` returns IDs and names for assigned teachers/staff on published, non-archived courses but does not filter `profiles.is_active`; JMT Test does. This is a P2 privacy/data-freshness discrepancy.

Additional function drift confirmed:
- JMT Test `complete_revision_task` enforces due time, active paid enrollment, published course/concept and verified concept-linked evidence for spaced-repetition completion; primary's version only checks an active enrollment and ownership of the pending task.
- JMT Test `record_simulation_completion` uses the published subject-linked virtual-lab catalogue; primary's version uses a fixed subject-name mapping.
- JMT Test `can_staff_access_student` limits its payment-submission visibility branch to pending submissions; primary does not apply that status filter.

Performance notices include unused indexes and multiple permissive policies. Do not drop indexes based on a fresh/low-traffic usage snapshot; review query plans and workload before changing them.

### Default-privilege check

The primary project's current `postgres` default ACL still grants `TRUNCATE` and `TRIGGER` on future public tables to client roles. JMT Test's `postgres` default ACL has those privileges removed. The `supabase_admin` default ACL still grants them to `anon` and `authenticated` in both projects. All existing JMT Test tables currently have no client TRUNCATE/TRIGGER privileges, but the owner-specific default remains a future-object risk.

### Current CI qualification

The latest successful workflow run verified before this live-audit documentation update is [Quality checks #1117](https://github.com/hk1911369-eng/sanjay-kumar-chemistry-lms/actions/runs/43065916384) on commit `ac217af815df289d8a7c53e97ad4341b9c4e03fa`. Its dependency installation, guardrail tests, ESLint, TypeScript, production build and production dependency audit all passed.

The current report/reconciliation documentation commit is newer and has no workflow run recorded yet. Do not describe the new documentation commit as CI-green until a run is observed. The successful run on `ac217af` does not substitute for browser E2E or database role-matrix testing.

### Updated release blockers

1. Remove authenticated `TRUNCATE`/`TRIGGER` privileges from the 33 primary tables and harden future-object defaults for the actual object-creation roles.
2. Produce a semantic migration reconciliation and reviewed backup/rollback plan; do not bulk-replay JMT Test history.
3. Add an idempotent academic-subject seed/preflight before virtual-lab catalogue insertion.
4. Reconcile the missing written-exam draft migration and its ordering before claiming autosave is live.
5. Resolve the public teacher-directory active-profile discrepancy and leaked-password protection setting.
6. Seed representative synthetic users, enrollments, lessons, assessments and practical assignments in isolated staging.
7. Run browser E2E, storage ownership, payment, assessment-window, role-boundary and accessibility checks against that populated staging environment.

**Release verdict remains NOT READY for production merge/deploy.** This live database verification was read-only; no project settings, schema, data, deployments, or PR state were changed.


## Critical journey plan and latest CI — 11 November 2026

A dedicated browser-journey specification has now been added:

- [JMT Critical Journey E2E Test Plan](JMT_CRITICAL_JOURNEY_E2E_TEST_PLAN.md)
- It defines synthetic student-paid/unpaid/expired/inactive fixtures, assigned/unassigned teachers, active/inactive admins, and Course A/Course B isolation.
- It specifies four P0 journeys: authentication/role boundaries, paid-course entitlement, payment submission/reconciliation/approval, and assessment integrity/written-exam recovery.
- It specifies P1 practical evidence, teacher authoring/review, practice/revision/analytics, and P2 accessibility/responsive checks.
- It explicitly marks itself **SPECIFICATION ONLY — NOT EXECUTED**. No journey is passed by virtue of being documented.

### Browser automation attempt

The BrowserAct skill is installed in the skill catalogue, but the CLI is not available. The environment has `uv 0.10.0`; the documented install command `uv tool install browser-act-cli --python 3.12` was attempted and failed after retries because the environment could not resolve/download the Python 3.12 runtime from GitHub (DNS resolution failure). No browser was launched and no Playwright/BrowserAct test was executed. This is an execution-environment limitation, not an application test failure.

### Latest verified CI

The latest PR head at this check is `f5c5ffd9615602ec4900f254cdc1b2080b7c9298`, which adds the critical journey plan. GitHub Actions run [Quality checks #1124](https://github.com/hk1911369-eng/sanjay-kumar-chemistry-lms/actions/runs/43067942576) completed successfully on that exact commit:

- Dependency installation: passed.
- Guardrail tests: passed.
- ESLint: passed.
- TypeScript: passed.
- Production build: passed.
- Production dependency audit: passed.

This validates the repository's configured CI gates for that commit. It does not validate the browser journeys, live Supabase role policies, Storage permissions, or migration promotion.

**Current PR state:** #42 remains open, draft and unmerged. **Release verdict:** NOT READY for production merge/deploy. No deployment or database mutation was performed.


## Latest PR-head and live Supabase recheck — 11 November 2026

### GitHub CI — exact current head

The PR head at this recheck is `df6e0a53fb513884d0e77c953a8e43fa8e5e5b7f`. GitHub Actions run [Quality checks #1125](https://github.com/hk1911369-eng/sanjay-kumar-chemistry-lms/actions/runs/43068490766) completed successfully on that exact SHA. All steps passed: dependency installation, guardrail tests, ESLint, TypeScript, production build and production dependency audit.

PR #42 remains open and draft. This confirms configured CI only; browser journeys remain unexecuted.

### Read-only live database recheck

Both connected Supabase projects were queried again without changing schema, data, settings or migration history.

| Measure | Primary project | JMT Test |
|---|---:|---:|
| Public base tables | 49 | 57 |
| Tables with RLS enabled | 49 | 57 |
| Existing tables granting authenticated TRUNCATE | 33 | 0 |
| Existing tables granting authenticated TRIGGER | 33 | 0 |
| Existing tables granting anon TRUNCATE or TRIGGER | 0 | 0 |
| Academic subjects | 0 | 8 |
| Courses | 0 | 3 |
| Course-subject mappings | 0 | 24 |
| Enrollments | 0 | 0 |
| Lessons | 0 | 0 |
| Quizzes / quiz questions / attempts | 0 / 0 / 0 | 0 / 0 / 0 |
| Written exams / submissions | 0 / 0 | 0 / 0 |
| Lab notebook entries / evidence / practical assignments | Tables absent | 0 / 0 / 0 |
| Student practice questions / attempts | Tables absent | 0 / 0 |

The written-exam draft table is absent from both live projects. The test project has more structural coverage, but neither project contains the fixtures required for meaningful paid-student, lesson, assessment, payment, lab or teacher-review end-to-end tests.

### Default privilege nuance — clarified

The current default ACL query shows that the `postgres` object owner in the primary project still grants both `TRUNCATE` and `TRIGGER` by default to `anon` and `authenticated`; the same grants are absent from the `postgres` defaults in JMT Test.

However, the `supabase_admin` object owner's default ACL still grants `TRUNCATE` and `TRIGGER` to `anon` and `authenticated` in **both** projects. This means the test project's zero current-table grants do not prove that every future object-creation path is hardened. The actual migration/object-creation roles must be confirmed, and default ACLs must be remediated and verified for every role that can create exposed public tables. Do not revoke platform-managed role privileges blindly.

### Current advisor recheck

- Primary project: 1 anon-callable SECURITY DEFINER function warning; 18 authenticated-callable SECURITY DEFINER function warnings; leaked-password protection disabled; two no-policy INFO notices for internal rate-limit tables.
- JMT Test: 1 anon-callable SECURITY DEFINER function warning; 23 authenticated-callable SECURITY DEFINER function warnings; leaked-password protection disabled; the same two rate-limit INFO notices.
- Performance advisor WARNs for multiple permissive policies: 27 in primary and 22 in JMT Test.

These advisor findings are not automatically confirmed vulnerabilities. The authenticated-callable functions require function-by-function review of grants, identity/role checks, search_path and intended API exposure. The two no-policy rate-limit tables are consistent with their intended internal-only design. Multiple permissive policies should be assessed for semantic overlap before any consolidation.

### Updated decision and next safe sequence

**Release remains NOT READY.** The highest-value next steps are:

1. Prepare a reviewed privilege-hardening migration covering existing primary tables and all actual object-creation roles; verify grants before and after in a disposable database.
2. Add an idempotent subject seed/preflight before the fixed-UUID virtual-lab catalogue migration.
3. Reconcile written-exam draft migration ordering against both live migration ledgers before applying anything.
4. Build synthetic fixtures in an isolated environment only after confirming its schema is representative.
5. Run real PostgreSQL role/RLS/RPC/Storage tests and browser journeys; do not substitute source-text tests.
6. Enable leaked-password protection through a reviewed Auth configuration change after confirming user impact and supported settings.

All checks in this section were read-only. No database mutation, project setting change, deployment, merge or PR state change was performed.
