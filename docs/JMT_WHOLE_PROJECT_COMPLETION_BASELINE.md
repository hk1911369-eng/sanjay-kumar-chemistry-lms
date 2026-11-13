# JMT Learning OS — Whole-Project Completion Baseline

**Assessment date:** 2026-11-11  
**Branch:** `audit/jmt-master-prompt-follow-through`  
**Status:** Baseline framework; not a release certification.

## Why this baseline exists

A single percentage must represent the entire intended JMT product, not only research, code volume, documentation, or the number of visible screens. Earlier conversational estimates of 30–35% were not derived from a complete acceptance-criteria inventory and must therefore be treated as provisional, not audited measurements.

This document establishes a repeatable method. It deliberately does not turn unverified feature claims into completed work.

## Product scope used as the denominator

The denominator is the full product promise in `docs/LEARNING_OS_PRODUCT_ROADMAP.md`, including:

1. Core multi-subject LMS and role experiences.
2. Security, privacy, tenant boundaries and operational controls.
3. Learning intelligence: mastery, knowledge graph, mistake memory, spaced revision and recommendations.
4. AI tutor and doubt solver with grounding, evaluation and safe escalation.
5. Assessments, assignments, question bank, exam analytics and predictor.
6. Virtual labs and simulations, including practical learning workflows.
7. Teacher/content-team tools and approval workflows.
8. Parent/institution experiences.
9. Offline resilience, accessibility, Bengali/English localization and low-bandwidth support.
10. Bangladesh curriculum, textbook, publisher, cohort and admission intelligence.
11. Integrations, observability, cost controls, support operations, QA and launch readiness.

Research and documentation are enabling work. They count toward completion only where they produce an accepted product capability or a verified release prerequisite; a bibliography by itself is not a shipped learner feature.

## Scoring model

Score each atomic acceptance criterion with one state:

- **0 — Not started:** no implementation or verified evidence.
- **0.25 — Discovery/specification:** requirement and source/evidence documented; no working implementation.
- **0.50 — Implemented:** code or content exists, but integration, correctness or acceptance testing is incomplete.
- **0.75 — Verified in test:** acceptance tests pass in a controlled test environment; production readiness remains open.
- **1.00 — Released and monitored:** approved production release, operational monitoring, support and rollback/restore evidence.

For criterion *i*, assign a scope weight *wᵢ* before scoring. Overall completion is:

`100 × Σ(wᵢ × stateᵢ) / Σ(wᵢ)`

Weights must reflect user and operational importance, not implementation convenience. Security, curriculum correctness, assessment integrity and learner data protection are release-critical gates: high scores elsewhere cannot compensate for a failed critical gate.

## Evidence rules

A criterion may not be scored above 0.25 without a traceable implementation reference and testable acceptance statement. It may not be scored above 0.50 without reproducible test evidence. It may not be scored 1.00 without a production release record and operational evidence.

Evidence accepted:
- Repository path and commit SHA for implementation.
- Migration and RLS/policy tests for data/security claims.
- Automated test name, run URL and commit SHA.
- Reproducible manual test protocol and dated result for workflows not covered by automation.
- Official source/version and content QA record for curriculum claims.
- Rights/licence record for imported books, questions, media and datasets.
- Deployment, monitoring, backup/restore and rollback records for release claims.

Not accepted as completion evidence:
- A roadmap bullet, mock-up, marketing page or unverified claim.
- A passing CI run on a different commit.
- A feature mentioned in a conversation but not located in the current repository.
- A public book listing treated as proof of syllabus alignment or content quality.
- A simulation treated as proof of physical practical competence.
- A model-generated answer treated as verified academic content.

## Current evidence snapshot

The current project context establishes the following, but does not yet support a complete numeric audit:

| Area | Evidence available | What remains before a defensible score |
|---|---|---|
| Core platform | Existing repository and roadmap; prior implementation work on course, assignment and assessment flows | Current branch-wide route/API inventory, acceptance mapping and end-to-end tests |
| Security/data | Prior test-project work on RLS, RPC-only drafts and assignment history | Re-run policy tests on current head; threat model, tenant isolation and production controls |
| Learning/revision | Adaptive practice, mistake-memory and spaced-retake work described in prior engineering records | Current code trace, learner-flow tests and measurement validation |
| Virtual labs | Product requirements and external design references | Inventory actual shipped simulations, scientific review and saved-evidence tests |
| AI tutor/doubt solver | Scope and safety/evaluation requirements | Working implementation inventory, benchmark set, quality/cost/latency evaluation |
| Curriculum/books | Research registry and publisher/source tranches | Official cohort syllabus extraction, complete metadata, chapter mapping, content QA and rights review |
| Exam/admission intelligence | Initial board/admission research | Official circular extraction, rules engine tests and versioned cohort coverage |
| Predictor | Evaluation protocol defined | Historical corpus, leakage-resistant backtests, baseline comparison and calibration |
| Operations/release | Some CI history and test-project work | Current-head CI, staging E2E, observability, backup/restore, incident and rollback drills |

**Current-head caution:** CI evidence must be checked against the exact branch head being assessed. A successful historical run is not proof that later commits pass. Documentation-only commits do not validate code.

## Release-critical gates

A JMT public launch is not complete until all are true:

1. Authentication, authorization, row-level security and tenant isolation have adversarial tests.
2. Student records, parent access, teacher access and administrative actions have explicit least-privilege policies and audit trails.
3. Exam drafts, submissions, grading and result publication survive refresh, retries, concurrency and network interruption without silent data loss.
4. Curriculum facts are versioned by board, cohort, exam year, candidate type, medium and official source.
5. High-stakes AI outputs are grounded, evaluated, uncertainty-aware and teacher-escalated when needed.
6. Imported content has documented rights and attribution; generated questions have review and provenance.
7. Accessibility, Bengali/English rendering, mobile performance and low-bandwidth recovery pass defined tests.
8. Production monitoring, rate limits, cost controls, backups, restore drills, incident response and rollback are demonstrated.
9. Critical defects are closed; known limitations are documented; support and privacy policies are ready.

## Next audit sequence

1. Freeze the exact PR branch head SHA and enumerate all routes, server actions, database migrations, tables, policies, tests and integrations.
2. Convert the roadmap into atomic acceptance criteria with weights and evidence links.
3. Run current-head CI and targeted security/data tests; distinguish pass, fail, skipped and not run.
4. Walk the principal learner, teacher and admin journeys in a controlled test environment.
5. Score each criterion and calculate the weighted whole-project percentage.
6. Publish the score with a confidence level and a list of blockers; refresh it after material changes.

## Reporting rule

Until steps 1–5 are completed, report the whole-project percentage as **not yet audited**. If a provisional planning estimate is shown, label it clearly and never present it as measured completion. This avoids false precision and gives the product owner a reliable way to see whether JMT is actually approaching its full vision.
