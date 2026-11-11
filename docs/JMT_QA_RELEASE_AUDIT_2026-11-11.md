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
