# JMT Learning OS — Whole-Project Weighted Completion Scorecard
**Assessment date:** 2026-11-11  
**Assessed branch:** `audit/jmt-master-prompt-follow-through`  
**Evidence boundary:** repository PR #42 file inventory and documentation available at assessment time; this is a provisional scope-level score, not a release certification.

## Headline
**Provisional whole-project completion: 36% (low confidence; planning estimate only).**

This is the first weighted estimate across the full intended product, rather than a research-progress percentage. It is deliberately conservative. It is not an audited acceptance-criterion score because several modules lack complete acceptance inventories and live browser/staging evidence.

## Scoring method
States: 0 = not started; 0.25 = requirements/research documented; 0.50 = implementation exists but acceptance/integration incomplete; 0.75 = verified in controlled test; 1.00 = released and monitored.

Weighted score = sum(category weight × category state). Category weights total 100 and reflect product scope and launch importance. No category is scored 0.75 or 1.00 because current evidence does not establish representative staging E2E or monitored production release for the complete product capability.

## Whole-project scorecard

| Product area | Weight | Current state | Weighted points | Evidence / remaining gap |
|---|---:|---:|---:|---|
| Core LMS, identity and course delivery | 15 | 0.50 | 7.50 | Next.js/Supabase app, student/teacher/staff/admin routes, course and lesson flows exist. Need complete role-by-role browser acceptance, production parity and accessibility checks. |
| Security, privacy and data governance | 13 | 0.25 | 3.25 | Extensive migrations and source-level guardrail tests exist. Production/test drift and historical privilege findings remain; live RLS/RPC/storage adversarial tests and remediation proof are missing. |
| Learning intelligence and revision | 12 | 0.50 | 6.00 | Learning ledger, concept graph, mastery, practice ranking, spaced revision and study goals have code/migrations/tests. Need validated learner outcomes, concurrency and representative E2E. |
| AI tutor and doubt solver | 8 | 0.00 | 0.00 | No verified working, evaluated AI tutor/doubt-solver capability in the current repository evidence inventory. Research requirements exist. |
| Assessments, assignments and exam analytics | 12 | 0.50 | 6.00 | Quizzes, written exams, draft recovery, grading controls, assignments and history migrations/tests exist. Need real student/teacher journey execution, exam reliability and analytics validation. |
| Virtual labs and practical learning | 10 | 0.50 | 5.00 | Multiple simulation components, catalogue, lab notebooks, private evidence and rubric workflows exist. Need scientific review, browser testing, physical-practical boundary and teacher assessment validation. |
| Teacher and content-team operations | 8 | 0.50 | 4.00 | Teacher workspace, course/practice authoring, practical review and analytics code exist. Need complete workflow and permissions testing with realistic assigned-course data. |
| Parent and institution experiences | 5 | 0.00 | 0.00 | No verified complete parent/institution workspace or acceptance evidence in the current inventory. |
| Offline resilience, accessibility and localization | 5 | 0.25 | 1.25 | Bengali/English locale preference and responsive styling are present. Offline/low-bandwidth behavior, WCAG checks and broad device testing remain unverified. |
| Bangladesh curriculum, books and admission intelligence | 7 | 0.25 | 1.75 | Official-source boundaries, publisher/author registries and curriculum research tranches exist. Full cohort-specific extraction, chapter mapping, rights clearance and tested admission rules remain incomplete. |
| Integrations, observability, operations, QA and launch | 5 | 0.25 | 1.25 | CI, deployment documentation, backup/restore scripts and release runbooks exist. Staging E2E, monitoring/alert drills, restore/rollback rehearsal and support readiness are not evidenced. |
| **Total** | **100** |  | **36.00 / 100** | **Provisional whole-project estimate: 36%.** |

## What this percentage means
- It measures progress against the full intended JMT Learning OS scope, not just the code currently in PR #42.
- Research documents count only as requirements/evidence work; they do not count as delivered student capabilities.
- Existing code earns at most 0.50 until the relevant user journey and persisted data are verified in a controlled environment.
- No full product area is credited as released-and-monitored from the evidence available here.
- The low confidence reflects incomplete atomic acceptance mapping, lack of staging E2E evidence, and incomplete production parity verification.

## Largest remaining scope
1. Build and evaluate the AI tutor/doubt solver with source-grounding, safe escalation, quality, latency and cost benchmarks.
2. Deliver parent/institution workflows with consent, scoped access and audit trails.
3. Complete official Bangladesh cohort/curriculum/admission registry and content-rights review.
4. Validate production security and schema parity through reviewed staging migrations and adversarial tests.
5. Execute Playwright journeys for student, teacher, staff and admin; include mobile, Bengali, network interruption, retries and concurrency.
6. Demonstrate backups, restore, rollback, monitoring, incident response and operational support.

## Release blockers (independent of percentage)
The score is not a launch approval. Production release remains blocked until:
- P0 authentication, role, paid-access, payment, assessment and private-evidence journeys pass on representative staging data.
- RLS, RPC grants, storage policies and production schema/migration drift are reconciled and tested.
- Exam draft/submission/retry/concurrency behavior is verified.
- Curriculum and assessment rules are versioned to official board/cohort/candidate status.
- Content rights, privacy, accessibility, monitoring, backup/restore and rollback evidence are complete.

## How to turn this into an audited percentage
For each category, split the scope into atomic acceptance criteria; assign weights before scoring; attach repository path, commit, test run, official source or release evidence to every criterion. Then calculate the weighted result from those atomic records. Update this scorecard whenever the PR head or product scope changes.

**Confidence: Low.** Treat 36% as the best current planning estimate, not a measured engineering completion certificate.