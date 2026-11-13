# JMT Learning OS — Atomic Acceptance Backlog (execution baseline)
**Date:** 2026-11-11  
**Branch:** `audit/jmt-master-prompt-follow-through`  
**Purpose:** Turn the whole-product roadmap into testable acceptance criteria. This is a work ledger, not evidence that any criterion has passed.

## Status vocabulary
- **Implemented — static evidence:** source, route, migration or test file exists; runtime behavior not proven.
- **Partially evidenced:** some implementation exists but material workflow or scope is missing.
- **Not evidenced:** no working implementation was located in the inspected repository inventory.
- **Blocked:** cannot be accepted until a named environment, data fixture, policy decision or external review exists.
- **Passed:** only after a reproducible test result on the current release candidate is attached.

A source-regex Node test is a static guardrail. It is not a PostgreSQL integration test, browser test or production acceptance result.

## P0 — Trust, access and academic-record integrity

| ID | Acceptance criterion | Current evidence / code area | Status | Required proof |
|---|---|---|---|---|
| P0-01 | Anonymous users cannot read student, teacher, finance, assessment or private evidence data. | Supabase migrations; `tests/security-workflows.test.mjs`; private lab evidence routes | Partially evidenced | Execute role matrix against representative PostgreSQL staging; verify no data in API/HTML. |
| P0-02 | Inactive accounts are denied protected reads and writes, including direct server-action/RPC calls. | Active-role migrations; `tests/active-role-*.test.mjs` | Implemented — static evidence | PostgreSQL + browser tests for student/teacher/admin inactive accounts and stale sessions. |
| P0-03 | Teachers can access only assigned courses and their permitted student records. | Teacher write-scope and staff-profile migrations/tests | Implemented — static evidence | Cross-course negative tests for every read, write, export and analytics route. |
| P0-04 | Paid entitlement is checked at the database/API boundary for all protected learning reads/writes. | Paid-access migrations; `tests/paid-learning-access.test.mjs` | Implemented — static evidence | Paid/unpaid/expired fixture tests for lessons, quizzes, practice, revision, progress and events. |
| P0-05 | Student identity, marks, correctness, payment approval and grading fields cannot be forged by clients. | Assessment/payment/assignment guard migrations and tests | Implemented — static evidence | Direct authenticated API/RPC attack tests and persisted-state assertions. |
| P0-06 | Private practical evidence is owner-scoped, type-validated and downloaded through authorized short-lived access. | `app/api/lab-notebook-evidence/[evidenceId]/route.ts`; lab evidence migrations/tests | Implemented — static evidence | Supabase Storage integration tests for cross-student, unassigned teacher, expired URL, MIME and path attacks. |
| P0-07 | Client roles cannot TRUNCATE or create triggers on exposed tables, including future tables created by actual owner roles. | `20261110263000_revoke_client_truncate_and_trigger.sql`; live audit in QA report | Blocked | Reconcile existing production grants and default ACLs for every actual object-creation role; verify in staging. |
| P0-08 | Production and test schema/migration histories are reconciled without blind replay or ledger deletion. | `docs/JMT_DATABASE_RECONCILIATION_RUNBOOK.md` | Blocked | Semantic migration map, preflight, backup, staged apply, postflight and rollback evidence. |
| P0-09 | Payment approval is authorized, idempotent and cannot grant incorrect/duplicate access. | `app/actions/payments.ts`; payment guard/reconciliation migrations and tests | Partially evidenced | Synthetic end-to-end payment submission/review/replay and entitlement assertions. |
| P0-10 | Written exam answers survive refresh/retry and concurrent edits without silent overwrite; final submission is immutable. | `app/student/exam-war-room/page.tsx`; written-exam actions/migrations/tests | Partially evidenced | Live DB + browser tests including network failure, stale version, deadline and duplicate submit. |
| P0-11 | Question edits/deletes cannot rewrite prior practice attempt history. | `20261111170100_preserve_deleted_practice_history.sql`; `tests/practice-question-delete-history.test.mjs` | Implemented — static evidence | Execute trigger behavior in PostgreSQL; test archive, metadata, versioning and historical scoring. |
| P0-12 | Database migrations are safe on an empty database and on the actual production data shape. | `supabase/migrations/*`; virtual-lab catalogue migration now seeds canonical subject slugs before resolving generated IDs; `tests/virtual-lab-catalog-subject-seed.test.mjs` | Partially evidenced | Empty-db and representative-data PostgreSQL migration rehearsal; test idempotency, existing subject preservation, foreign keys and rollback. |
| P0-13 | Backup restore and application rollback can be completed within declared recovery objectives. | `scripts/backup-db.sh`, `scripts/restore-db.sh`, deployment docs | Partially evidenced | Timed restore drill, integrity comparison, credential handling and rollback rehearsal. |

## P1 — Core learner, teacher and assessment workflows

| ID | Acceptance criterion | Current evidence / code area | Status | Required proof |
|---|---|---|---|---|
| P1-01 | Student can discover a course, apply/enrol and see accurate eligibility and status. | `app/actions/course-application.ts`; admin application route | Partially evidenced | Student/admin browser journey with pending/approved/rejected states. |
| P1-02 | Course supports multiple subjects and subject catalogue changes do not require code changes. | Academic catalogue actions; course studio; multi-subject tests | Implemented — static evidence | Create two-subject course and add a new subject through admin UI in staging. |
| P1-03 | Student can access published lessons and progress is recorded once, accurately. | `app/learn/[courseId]/page.tsx`; atomic lesson completion RPC/tests | Implemented — static evidence | Real DB idempotency, access and reload test. |
| P1-04 | Student can attempt quizzes with server-validated timing, identity and answer integrity. | Quiz attempt migrations/tests; practice workspace | Partially evidenced | Browser journey and PostgreSQL direct-call tests. |
| P1-05 | Student can complete written exam, autosave, recover and submit. | Written exam builder/attempt components and draft RPC tests | Partially evidenced | Browser + DB journey; verify draft migration exists/applied before calling live. |
| P1-06 | Student can submit assignments, attach evidence, resubmit under policy and see feedback. | Assignment actions; lab practical actions; assignment history migrations | Partially evidenced | End-to-end student/teacher lifecycle, version history and concurrency tests. |
| P1-07 | Teacher can author draft lessons/questions/assessments and only approved workflows publish. | Course studio, practice authoring, publication lock migrations/tests | Implemented — static evidence | Assigned/unassigned teacher browser tests and publish approval checks. |
| P1-08 | Teacher can grade/review work with attribution and students see only their own feedback. | Teacher learning/practical review routes; review-history migrations | Partially evidenced | Real role matrix and record visibility tests. |
| P1-09 | Payment ledger and CSV exports are accurate, permission-scoped and auditable. | Finance routes, reconciliation component, export APIs | Partially evidenced | Synthetic CSV import/export, authorization and accounting reconciliation. |
| P1-10 | Practice questions are selected based on learning need and attempt history is preserved. | Practice engine, ranking, spaced review migrations/tests | Implemented — static evidence | Learner-flow test, fairness/selection metrics and database behavior. |
| P1-11 | Spaced review only advances on verified evidence and correct due/access state. | Revision task migrations; evidence tests | Partially evidenced | PostgreSQL tests for due time, concept mapping, paid access and forged completion. |
| P1-12 | Teacher analytics are assignment-scoped and suppress small cohorts. | Practice analytics RPC/UI and tests | Implemented — static evidence | Real query/RLS tests with boundary cohort sizes and course isolation. |

## P1 — Virtual laboratories and practical learning

| ID | Acceptance criterion | Current evidence / code area | Status | Required proof |
|---|---|---|---|---|
| LAB-01 | Learner can run a simulation with meaningful controls, units, graph and reset. | `components/*-lab.tsx`; model libraries and unit tests | Implemented — static evidence | Browser interaction, numerical validation and mobile performance. |
| LAB-02 | Lab catalogue is subject/course scoped and only permitted learners/teachers can access it. | Virtual lab catalogue migrations/actions/tests | Partially evidenced | PostgreSQL RLS/RPC tests with paid/unpaid and assigned/unassigned users. |
| LAB-03 | Teacher can assign a practical and student can submit evidence/report. | Lab practical/notebook routes and migrations | Partially evidenced | Full browser lifecycle with private storage and realistic fixtures. |
| LAB-04 | Practical rubric, review history and attribution are preserved. | Rubric/review-history migrations and tests | Implemented — static evidence | DB integration test and student/teacher browser confirmation. |
| LAB-05 | Scientific correctness is reviewed against trusted academic sources and curriculum objectives. | Virtual lab model register/open-source review docs | Blocked | Subject expert review records and reproducible expected-value tests for every published model. |
| LAB-06 | Simulation interaction is not misrepresented as physical practical competence or mastery. | Learning evidence mappings and roadmap principles | Partially evidenced | Product copy review and learning-metric validation. |
| LAB-07 | ICT coding/SQL environments execute safely in isolated sandboxes. | No verified isolated execution service in inspected route/component inventory | Not evidenced | Threat model, sandbox architecture, resource limits, network isolation and abuse tests before implementation. |

## P1 — Learning intelligence

| ID | Acceptance criterion | Current evidence / code area | Status | Required proof |
|---|---|---|---|---|
| LI-01 | Every mastery score is traceable to valid learning evidence, confidence and recency. | Learning OS actions/dashboard; learning-event and concept-link migrations/tests | Partially evidenced | Recompute from source events; sparse-data and tampering tests. |
| LI-02 | Concept graph enforces valid prerequisites and prevents cycles. | Learning graph migrations/tests | Implemented — static evidence | Real concurrent transaction tests and graph integrity queries. |
| LI-03 | Mistake memory records misconception, correction and unresolved/resolved status. | Learning OS scope and current event model | Partially evidenced | Verify full data model and learner-facing workflow; tests for correction evidence. |
| LI-04 | Revision recommendations explain why a task is due and what evidence changes mastery. | Practice/revision engine and learner workspace | Partially evidenced | Learner usability test and evidence-to-recommendation trace. |
| LI-05 | Exam readiness and score predictions are calibrated on held-out historical data. | Research/evaluation requirements only; no verified predictor evidence | Not evidenced | Leakage-resistant rolling-origin backtests, baseline comparison and calibration. |
| LI-06 | Daily/weekly study plan adapts to available time and plan drift without losing completed work. | Roadmap target; no verified complete planner workflow in inspected inventory | Not evidenced | Planner data model, scheduler, conflict/replan tests and learner pilot. |

## P1 — AI tutor and doubt solver

| ID | Acceptance criterion | Current evidence / code area | Status | Required proof |
|---|---|---|---|---|
| AI-01 | Tutor answers are grounded in approved learner/course resources and cite lesson/source references. | No verified working tutor endpoint/UI in inspected branch inventory | Not evidenced | Retrieval design, corpus provenance, answer citation tests and source-ablation evaluation. |
| AI-02 | Tutor supports hints-first, worked examples, Socratic follow-up and appropriate difficulty. | Product specification only | Not evidenced | Pedagogy acceptance set reviewed by subject teachers. |
| AI-03 | Tutor supports Bangla/English subject terminology and notation correctly. | Localization target only | Not evidenced | Bilingual subject-specific benchmark and teacher scoring. |
| AI-04 | Low-confidence, out-of-syllabus or unsafe questions are refused or escalated rather than fabricated. | Safety requirement in roadmap | Not evidenced | Red-team suite, confidence calibration and teacher escalation workflow. |
| AI-05 | Doubt solver parses text/image questions, identifies missing context and links concept/practice. | No verified working doubt-solver workflow | Not evidenced | Text-first MVP, OCR privacy gate, concept mapping and evaluation set. |
| AI-06 | AI quotas, cost/latency monitoring, retention and provider secrets are server-side. | No verified AI gateway in inspected inventory | Not evidenced | Provider-independent gateway, quota enforcement, audit and cost tests. |
| AI-07 | AI-generated questions/notes remain drafts until authorized teacher approval. | Teacher authoring foundations exist; AI generation not evidenced | Not evidenced | Draft provenance, review/approve/publish lifecycle and audit test. |

## P2 — Community, parents and institution scale

| ID | Acceptance criterion | Current evidence / code area | Status | Required proof |
|---|---|---|---|---|
| COM-01 | Learners can post concept-linked doubts and receive peer/teacher answers safely. | Discussion routes/policies exist; complete learning community not yet accepted | Partially evidenced | Moderation, privacy, abuse and accepted-answer journey. |
| COM-02 | Student notes can be shared, searched, compared, versioned and downloaded with attribution. | No complete notes library workflow verified | Not evidenced | Rights/provenance, ranking rubric, abuse report and version tests. |
| COM-03 | Leaderboards are opt-in, fair, replay-resistant and safe for minors. | No verified complete leaderboard feature | Not evidenced | Scoring audit, privacy review, anti-cheat and opt-out tests. |
| PAR-01 | Guardian linking requires explicit authorization and can be revoked. | No verified parent/guardian workflow in inspected inventory | Not evidenced | Consent, identity proofing, revocation and audit tests. |
| PAR-02 | Parent sees only authorized progress/attendance/upcoming work, not private student communications. | No verified parent dashboard | Not evidenced | Negative access tests and student/guardian usability test. |
| INS-01 | Institution tenant isolation applies to data, storage, analytics and administration. | Multi-tenant SaaS is roadmap target, not verified release capability | Not evidenced | Tenant threat model and adversarial cross-tenant tests. |

## P2 — Resilience, access and release

| ID | Acceptance criterion | Current evidence / code area | Status | Required proof |
|---|---|---|---|---|
| OPS-01 | Current PR head has passing test/lint/typecheck/build/dependency-audit CI. | Quality workflow files and historical run references | Blocked pending exact-head run check | Confirm current PR head SHA and successful run for that exact SHA. |
| OPS-02 | Critical journeys execute in a real browser against representative synthetic staging data. | `docs/JMT_CRITICAL_JOURNEY_E2E_TEST_PLAN.md` | Not executed | Playwright setup, fixtures, P0 runs, traces and DB assertions. |
| OPS-03 | Production migration plan has verified backup, preflight, apply, postflight and rollback. | Database reconciliation runbook and backup/restore scripts | Blocked | Disposable rehearsal and signed release checklist. |
| OPS-04 | Bengali/English, keyboard, screen-reader, contrast and mobile reflow pass. | Locale preference and responsive CSS exist | Partially evidenced | WCAG manual audit plus automated scans and device tests. |
| OPS-05 | Offline/low-bandwidth drafts queue safely and sync without overwriting exam/grade data. | Roadmap target; no verified offline-first service worker/sync implementation | Not evidenced | Offline protocol, conflict resolution and browser network-interruption tests. |
| OPS-06 | Monitoring, incident response, alerting and cost controls are operational. | Deployment docs/CI and roadmap references | Partially evidenced | Alert drill, incident tabletop, SLO dashboard and cost-limit test. |
| OPS-07 | Content sources, editions, generated materials and imported assets have rights/provenance records. | Book/author registries and research documents | Partially evidenced | Rights/permission ledger and per-resource approval before publication. |

## Execution order
1. **P0 data/security:** privilege and migration reconciliation, staging schema, role matrix, private storage and paid entitlement.
2. **P0 learner record integrity:** written exam autosave/recovery and practice-history trigger integration tests.
3. **P1 core journeys:** student enrolment/course/lesson, payment, assessment, assignment, teacher grading/review.
4. **P1 learning evidence:** concept/mastery/revision traceability and practical rubric correctness.
5. **P1 product gaps:** annual planner, AI tutor/doubt solver and safe code/SQL labs.
6. **P2 ecosystem:** parent, community, notes, leaderboard and institution tenancy.
7. **Release quality:** browser, accessibility, offline, restore/rollback, monitoring and pilot.

## Scoring and reporting rules
- Do not count a criterion as passed because a route, table, component or source-regex test exists.
- Do not award release credit without a production release record and operational evidence.
- Re-score the whole-project scorecard only when atomic criterion evidence changes.
- Record exact commit SHA, workflow/test run, environment and fixture manifest for every pass.
- The current whole-project 36% remains a **low-confidence provisional estimate** until this backlog is fully weighted and each criterion is scored from evidence.


## Update — virtual-lab catalogue empty-database guard

The earlier P0-12 note about a fixed-UUID virtual-lab subject dependency is superseded. The PR branch now:
- Seeds five canonical subject slugs idempotently (Physics, Chemistry, Biology, Mathematics, ICT).
- Resolves generated subject IDs by slug rather than assuming UUIDs from another environment.
- Upserts catalogue records by `lab_key`, preserving editorial fields such as publication state, title, summary and principle on rerun.
- Adds `tests/virtual-lab-catalog-subject-seed.test.mjs` to guard seed order, slug resolution, UUID independence and non-destructive reruns.

This improves the empty-database migration path but does **not** establish runtime PostgreSQL success. The criterion remains Partially evidenced until the migration runs against a disposable database and an existing-data fixture, with idempotency and rollback checks.

The current-head CI run has passed the guardrail test suite, ESLint and TypeScript; production build and dependency audit were still running at the time this update was prepared. See the GitHub Actions run linked from PR #42 for final status.
