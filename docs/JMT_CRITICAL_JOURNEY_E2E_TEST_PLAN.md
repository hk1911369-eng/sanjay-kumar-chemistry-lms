# JMT Critical Journey E2E Test Plan

**Status:** Specification only — not executed  
**Scope:** PR #42; student, teacher, admin and public learning flows  
**Environment:** Disposable non-production Supabase project with synthetic fixtures only.

## 1. Test principles

1. Exercise real browser journeys, then verify consequential persisted state through an authorized test channel.
2. Test authorization directly through protected actions/endpoints; hidden buttons are not security.
3. Assert visible outcomes and database state. A toast alone is insufficient.
4. Use unique per-run fixtures and clean up only test-owned records.
5. Stub/sandbox external payments, email and SMS. Never use real learner data or wallet transactions.
6. Never expose service-role credentials to the browser.
7. Capture Playwright traces on first retry; redact cookies, tokens, student details and payment proofs.
8. Treat source-regex tests as static guardrails, not PostgreSQL or browser execution.

## 2. Synthetic fixture model

| Fixture | Required state | Purpose |
|---|---|---|
| student_paid | Active student; active enrollment; admission fee paid; paid-through covers current Bangladesh billing period | Positive learner path |
| student_unpaid | Active student; no enrollment or pending application/payment | Deny paid access |
| student_expired | Active student; enrollment paid-through is before current period end | Expiry enforcement |
| student_inactive | Student profile with is_active=false | Account lifecycle denial |
| teacher_assigned | Active teacher assigned to Course A | Authorized teaching |
| teacher_unassigned | Active teacher not assigned to Course A | Cross-course isolation |
| admin_active | Active admin profile | Staff workflows |
| admin_inactive | Admin role but inactive profile | Fail-closed admin |
| Course A | Published, unarchived; lessons, quiz, written exam, subject and lab catalogue | Representative course |
| Course B | Separate course assigned to another teacher | Tenant/course isolation |
| Assessment | Published exam with open, future and closed schedule variants; known question IDs and answer key | Schedule/grading integrity |
| Lab notebook | Student-owned draft, returned and submitted states | Evidence lifecycle |

Use unique fixture identifiers per run. Record a fixture manifest and clean up only that run's records.

## 3. P0 critical journeys

### JMT-E2E-001 — Authentication and role boundaries

**Preconditions:** All role fixtures exist; login/logout routes available.

**Positive path**
1. Sign in as student_paid.
2. Confirm student workspace and expected synthetic identity.
3. Open a protected student route.
4. Sign out and revisit the protected route.

**Negative paths**
- Anonymous user opens student, teacher and admin routes.
- student_inactive signs in or reuses a session.
- Student invokes an admin server action directly.
- teacher_unassigned opens Course A authoring/review routes and invokes the action.
- Expired/invalid session calls a protected endpoint.

**Assertions**
- Correct redirect or 401/403/404; no protected data in HTML or response.
- Denied calls create no protected writes.
- Role and active-state checks are server-side.
- Logout invalidates subsequent protected requests.

### JMT-E2E-002 — Paid-course entitlement and expiry

**Preconditions:** Course A has a published lesson and protected quiz; paid, unpaid and expired students exist.

**Positive path**
1. student_paid opens Course A and reads a lesson.
2. Open the quiz and begin an allowed attempt.
3. Complete a lesson and reload progress.

**Negative paths**
- student_unpaid attempts direct lesson, quiz-question and progress reads.
- student_expired repeats those requests.
- Student forges course_id, student_id, enrollment status or paid-through values.
- Student replays completion for a lesson in Course B.

**Assertions**
- Entitlement is enforced at database/API boundaries on every protected read and write.
- Denied users receive no lesson body, answer key or progress data.
- Progress belongs to authenticated student and requested course/lesson.
- Repeated completion does not duplicate events or corrupt timestamps.

### JMT-E2E-003 — Payment submission, reconciliation and approval

**Preconditions:** Synthetic payment instructions and Course A pricing configured; no real wallet transaction.

**Student path**
1. Submit a valid manual-payment form with synthetic proof.
2. Confirm a pending submission in payment history.
3. Try malformed provider, amount, transaction ID, phone, MIME and oversized proof.

**Admin path**
1. admin_active uploads a synthetic wallet-statement CSV.
2. Confirm exact provider + transaction ID + amount + sender matches are candidates.
3. Confirm duplicates, cross-provider IDs, repeated senders, mismatches and reviewed rows are flagged.
4. Approve one exact match and reject one pending payment with a reason.

**Negative paths**
- Student invokes review/approval directly.
- admin_inactive invokes reconciliation or approval.
- Client alters fee, billing period, student, course or approval metadata.
- Duplicate/replayed approval request.
- CSV contains duplicate rows, malformed quotes, excess rows or invalid numbers.

**Assertions**
- Only an active admin can preview/approve/reject.
- Student cannot approve own payment or alter trusted fee metadata.
- Approval RPC revalidates pending state, fees, accepted application and enrollment.
- Replayed approval is safe and cannot double-grant access.
- Failed insert removes only the newly uploaded unreferenced proof.
- Synthetic proofs and statements remain inside isolated test environment.

### JMT-E2E-004 — Assessment integrity and written-exam recovery

**Preconditions:** Course A has a scheduled written exam with known question IDs and answer key.

**Positive path**
1. student_paid opens the exam during the allowed window.
2. Answer questions and wait for autosave acknowledgement.
3. Refresh; confirm answers and draft version restore.
4. Simulate transient save failure, recover and verify the latest acknowledged draft.
5. Submit and confirm final submission is visible.

**Negative paths**
- Start before starts_at or after ends_at.
- Save answers for unknown question IDs or another exam's questions.
- Alter score, grading status, evaluator or timestamps.
- Submit a stale draft version after another tab saves.
- Modify a final submission.
- Unpaid/expired student loads questions or drafts.

**Assertions**
- Schedule and paid access are enforced server-side.
- Stale saves conflict rather than silently overwriting newer answers.
- Final submission validates answer shape and is immutable to the student.
- Reload recovery reflects persisted state, not only local state.
- Answer keys and grading metadata are not exposed.

## 4. P1 critical journeys

### JMT-E2E-005 — Practical assignment and evidence ownership

**Preconditions:** Assigned practical for Course A; student-owned draft notebook; private evidence bucket.

**Positive path**
1. student_paid uploads valid JPEG, PNG, WebP and PDF fixtures within limits.
2. Confirm metadata listing and authenticated download.
3. teacher_assigned reviews evidence and submits a rubric-based review.
4. Student sees review and attribution.

**Negative paths**
- Student uploads to another student's notebook.
- Forged path, mismatched MIME/extension, HTML payload, oversized file or ninth file.
- teacher_unassigned requests evidence.
- Anonymous user requests evidence endpoint.
- Student changes notebook status or review fields.
- Submitted/locked notebook receives new upload.

**Assertions**
- Storage path is server-generated and bound to student/notebook.
- RLS blocks cross-student and unassigned-teacher reads.
- Signed URLs are short-lived and private/no-store.
- File count and ownership hold under concurrent requests.
- Review state and reviewer attribution persist and cannot be forged.

### JMT-E2E-006 — Teacher authoring and review scope

**Preconditions:** Two courses with distinct teacher assignments; draft and published lesson/assessment fixtures.

**Positive path**
1. teacher_assigned opens Course A and creates a draft lesson/assessment.
2. Confirm draft saved and publication follows the permitted workflow.
3. Admin reviews and publishes approved content.

**Negative paths**
- Teacher edits Course B.
- Teacher changes teacher_id, assigned course, publication state or grading fields.
- Teacher alters already-published assessment content.
- Inactive teacher invokes server actions directly.

**Assertions**
- Course assignment is checked server-side for every read/write.
- Published-content locks are enforced by database policy/trigger.
- Only authorized workflow can publish or change grading state.
- No cross-course data appears in teacher dashboards or analytics.

### JMT-E2E-007 — Practice, revision and learning analytics

**Preconditions:** Course A has practice questions and revision tasks; paid and unpaid fixtures exist.

**Positive path**
1. student_paid starts practice, answers and submits.
2. Confirm score and attempt history persist after reload.
3. Complete a revision task and verify analytics update.
4. Teacher views permitted cohort analytics.

**Negative paths**
- Student submits another student's attempt ID.
- Student alters correctness, score or ownership.
- Unpaid/expired student reads paid practice or completes paid revision.
- Teacher requests analytics for unassigned course or suppressed small cohort.

**Assertions**
- Attempt ownership, answer validation and scoring are server-side.
- Repeated submission is idempotent or explicitly rejected.
- Analytics respect role, assignment and privacy thresholds.
- Denied attempts do not emit successful learning events.

## 5. P2 accessibility and responsive checks

Run on student, teacher and admin routes:
- Keyboard-only sign-in, navigation, exam answering, file upload and review.
- Visible focus, accessible names, associated form errors and live status announcements.
- 320 px mobile width, common Android viewport, tablet and desktop.
- Bengali/English wrapping, Unicode input, number formatting and long course names.
- Zoom/reflow, contrast, reduced motion and touch targets.
- No horizontal overflow in exams, tables, lab graphs or payment reconciliation.
- Virtual-lab controls usable without mouse where applicable; chart values also available as text.

Automated accessibility scans do not replace manual WCAG review.

## 6. Automation implementation order

1. Establish disposable Supabase staging and deterministic seed/cleanup scripts.
2. Add Playwright compatible with the lockfile and CI Node version; pin dependency and lockfile.
3. Add a separate e2e script/job; keep current Node tests intact.
4. Start with JMT-E2E-001 and 002, then 003 and 004.
5. Add evidence and teacher journeys after private storage and role fixtures exist.
6. Capture trace on first retry, screenshots on failure and machine-readable JUnit report.
7. Require all P0 journeys to pass before production release review.

Suggested CI variables (secrets belong in GitHub Actions, never source):
- E2E_BASE_URL
- E2E_SUPABASE_URL
- E2E_SUPABASE_ANON_KEY
- Server-only staging bootstrap credential if required; never expose to browser bundle.

## 7. Evidence ledger

For every execution record:
- Commit SHA and workflow run URL.
- Browser/version, OS, viewport and device profile.
- Staging environment identifier and fixture manifest ID.
- Test ID, preconditions, outcome: passed/failed/blocked/not run.
- Assertion failure, trace/screenshot and redaction status.
- Database verification query/result reference without raw personal data.
- Defect link and retest commit.

## 8. Release gate

**Current state: NOT EXECUTED.** This is a test specification, not test evidence. No journey is passed until it runs against representative non-production data and both visible outcome and persisted state are verified.

Production merge/deploy remains blocked until:
- P0 journeys pass on current release candidate.
- RLS/RPC/storage tests execute against representative staging schema.
- Production/test schema and privilege drift is reconciled through reviewed migrations.
- Backup restore and rollback are rehearsed.
- Accessibility, privacy and monitoring gates are reviewed and accepted.
