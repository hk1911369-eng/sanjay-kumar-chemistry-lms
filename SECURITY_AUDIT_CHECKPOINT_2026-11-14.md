# Security audit checkpoint — 14 November 2026

## Exact source and CI state

- Repository: `hk1911369-eng/sanjay-kumar-chemistry-lms`
- Pull request: [#42](https://github.com/hk1911369-eng/sanjay-kumar-chemistry-lms/pull/42) — open, draft, not merged.
- Branch: `audit/jmt-master-prompt-follow-through`
- Exact verified head: `f1108345ced7dbc1a83fb1081a6d84dab5bc8993`
- GitHub Actions run [43510944146](https://github.com/hk1911369-eng/sanjay-kumar-chemistry-lms/actions/runs/43510944146) completed successfully on that exact SHA.
- The run passed guardrail tests, ESLint, TypeScript, production build, and production dependency audit.
- The combined commit-status endpoint reports `pending` with zero legacy status entries; the successful Actions check-run is the actual CI evidence.

## Consolidated source remediation on the branch

The branch contains thirteen 13-November migration files addressing parent-course publication/archive access, virtual-lab and notebook evidence access, active role/profile checks, active-student payment approval, quiz-attempt start/submission, lesson and simulation completion, exam-plan creation, profile-role audit, assignment grading, and monthly-payment approval-time enrollment revalidation.

The grading server action now calls the guarded `grade_assignment_submission` RPC rather than attempting a direct write blocked by the live authenticated column grants. The monthly-payment approval guard rechecks the matching active enrollment and admission-paid state at approval time.

### Migration replay-safety correction

The live JMT Test catalog already contains the effects of migration `20261111200000_add_assignment_submission_version_history.sql`, including its named RLS policy, although the migration version is absent from the live ledger. The original source migration attempted to create that policy without first dropping it, so replay could fail with a duplicate-policy error.

Commit `f1108345` adds `DROP POLICY IF EXISTS` immediately before recreating the same policy and adds `tests/migration-replay-safety.test.mjs` to guard the replay order and idempotent table/index/function/trigger declarations. The policy predicate and history trigger behavior are otherwise preserved. This is a source-level correction only; it has not been run against JMT Test.

## JMT Test database boundary and remaining work

- The live migration ledger still ends at `20261111133701`; it contains 255 entries. Source migrations after that point have mixed state: some effects are already present without matching ledger entries, while several branch protections are absent.
- Do not bulk-replay the newer migrations. Reconcile each migration's schema effects and version history individually, with a rollback plan, before applying anything.
- Confirmed live gaps still include parent-course publication gates for quiz start/submission, lesson/simulation evidence and exam plans; active-student payment approval; role-change audit; assignment grading RPC; and monthly approval-time enrollment revalidation.
- The NULL-delivery-mode legacy initial-payment compatibility path remains unresolved. Do not change it until a reliable historical-cohort marker is identified.
- Supabase Auth leaked-password protection is reported disabled by the security advisor. The connected tools do not expose a read-only Auth configuration endpoint or a safe in-chat setting change.
- PostgreSQL role-matrix tests (anonymous, inactive user, Student A/B, assigned/unassigned teacher/staff, admin) and Storage upload/download authorization tests remain outstanding. Source tests and CI do not prove runtime RLS behavior.

## Change boundary

No SQL migration was applied. No JMT Test database data/schema, Auth setting, Storage object, production resource, PR merge, or deployment was changed. The audit branch is pushed and CI-green, but the security remediation is **not complete or release-approved** until migration history is reconciled, authorized test-database migrations are applied and verified, runtime role/Storage tests pass, and the remaining Auth/payment questions are resolved.
