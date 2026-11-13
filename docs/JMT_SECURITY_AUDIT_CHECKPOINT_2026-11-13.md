# JMT security audit checkpoint — 13 November 2026

## Scope and safety

This checkpoint records source changes and read-only database findings from the 13 November security-hardening continuation.

- Repository: `hk1911369-eng/sanjay-kumar-chemistry-lms`
- Branch: `audit/jmt-master-prompt-follow-through`
- Pull request: [#42](https://github.com/hk1911369-eng/sanjay-kumar-chemistry-lms/pull/42), still open and draft
- Primary Supabase project: `jpoxrxjixkcgjqvyyznw`
- Test Supabase project: `cullxqklmbdiosibgois`

No migration was persistently applied to either database. Every SQL validation of the new policies/functions was run inside an explicit transaction and rolled back. No records, users, storage objects, production settings, deployments, or PR merge state were changed.

## Source changes on PR #42

### 1. Active teacher assignment validation

Migration: `supabase/migrations/20261113150000_require_active_course_teachers.sql`

- Course assignment trigger now requires the target profile to have role `teacher` or `staff` and `is_active IS TRUE`.
- Public course-teacher directory returns only active teacher/staff profiles assigned to published, non-archived courses.
- Existing course-assignment rows are not rewritten or deleted.

Regression tests: `tests/active-course-teachers.test.mjs` (3 tests).

The live Primary trigger did not check `profiles.is_active`. The Primary public teacher directory also lacked the active-profile predicate, while JMT Test already had it. The migration aligns both behaviors and closes the future-assignment gap.

### 2. Published parent-course read guard

Migration: `supabase/migrations/20261113160000_require_published_parent_course_for_content_reads.sql`

Adds restrictive SELECT policies for:
- assignments
- chapters
- lessons
- lesson_resources
- live_classes
- quizzes
- quiz_questions
- written_exams
- written_exam_questions
- course_subjects

For student-facing content, the parent course must be published and non-archived. Existing permissive policies continue to enforce paid enrollment, publication/schedule conditions on individual learning items, and assigned-staff scope. Active admins and teaching staff continue through the restrictive guard while remaining constrained by the existing permissive policies. Published course-subject metadata remains publicly readable as intended.

Regression tests: `tests/published-parent-course-content.test.mjs` (4 tests).

The Primary and JMT Test course-content policies previously relied on student enrollment and item-level publication without consistently requiring the parent course itself to remain published. The restrictive policy prevents an old paid enrollment from preserving student access after course unpublishing or archival.

## Validation

### CI

- Commit `47acaa0c60d1e790cad06ffa6f363330a60ebad9`, workflow run 1233: **passed** — guardrail tests, ESLint, TypeScript, production build, dependency audit.
- Commit `0813cedd02abf37ff0a97631e6f43d4682c998db`, workflow run 1234: **passed** — guardrail tests, ESLint, TypeScript, production build, dependency audit.

### Database syntax validation

- The active-teacher function definitions were installed inside a transaction on JMT Test, inspected, and rolled back.
- The ten restrictive policies were installed inside transactions on both Primary and JMT Test; PostgreSQL accepted all policy definitions.
- Follow-up catalog queries confirmed zero persisted policies named `published parent course read guard` in either project.
- These were DDL syntax/definition checks, not role-impersonation tests. No student, teacher, staff, or admin JWT was used to exercise actual row visibility.

## Payment approval parity finding

The Primary database has no `guard_manual_payment_approval` trigger on `manual_payment_submissions`. JMT Test has the trigger, which checks future billing periods, delivery-mode availability, current configured fee snapshots, accepted application requirements for mode-aware initial payments, and active matching enrollment for monthly payments.

The source migration `20261109150000_guard_payment_approval_period_and_fees.sql` is present on PR #42. The Primary migration ledger does not record versions `20261109100641`, `20261109100830`, or `20261109150000`; JMT Test records all three. This is a material production/test schema-parity blocker. Do not apply the migration directly or repair ledger rows ad hoc. Reconcile the complete migration history and plan a reviewed test/staging promotion first.

## Remaining release gates

1. Reconcile Primary and JMT Test migration ledgers against exact source SQL before any migration promotion.
2. Resolve the existing authenticated `TRUNCATE`/`TRIGGER` grants and default-ACL exposure in Primary.
3. Complete payment lifecycle review, including account deactivation between payment submission and approval and the legacy NULL delivery-mode compatibility path.
4. Complete the SECURITY DEFINER function/trigger/ACL inventory and test with separate role identities.
5. Seed representative synthetic accounts and data in an isolated staging environment; current test fixtures are too sparse for full role-matrix acceptance.
6. Run actual anonymous, inactive-user, Student A/B, assigned/unassigned Teacher/Staff, and Admin tests for table, RPC, and private Storage access.
7. Complete browser/mobile, payment, email, backup/restore, and release smoke tests.

## Release status

**Not ready to merge or deploy.** PR #42 remains draft. No production or test schema changes were persisted. The successful CI runs validate source/build behavior only; they do not replace live database role-matrix testing.
