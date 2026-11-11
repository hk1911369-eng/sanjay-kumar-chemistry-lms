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
