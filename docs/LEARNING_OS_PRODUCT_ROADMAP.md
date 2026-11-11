# JMT Learning OS — Product Scope and Delivery Roadmap

## Product promise

JMT is intended to become a subject-agnostic Learning OS, not a conventional course-and-video LMS. It should help each learner understand what they know, identify what they do not know, choose the next best learning action, practise safely, receive useful feedback, and see measurable progress. Chemistry is an initial content domain, not an architectural limit.

This document records the full intended product scope. A feature listed here is a target, not a claim that it is already implemented or production-ready.

## Product principles

1. **All-subject architecture:** tutoring, doubt solving, mastery, revision, assessment and reporting use subject/course/concept identifiers. Do not hard-code Chemistry assumptions into shared services.
2. **Evidence before claims:** scores, mastery, predictions and recommendations must be traceable to verified learning events and disclose uncertainty.
3. **Learning before gamification:** leaderboards reward effort, improvement and consistency as well as achievement; never make public rank the only definition of success.
4. **Safe AI:** AI is an assistant, not an unquestioned answer authority. Show working, sources or lesson references where available; communicate uncertainty; refuse to fabricate syllabus facts; escalate unsafe or unresolved cases to a teacher.
5. **Privacy by design:** students control public profile/leaderboard visibility where feasible; minors' personal data and private learning records are not exposed to peers. Parent access is explicitly authorized and scoped.
6. **Affordable by design:** provider-independent AI gateway, quotas, caching, model routing and cost/latency observability. Never expose provider secrets in the browser.
7. **Teacher agency:** AI suggestions do not silently grade high-stakes work, change marks, or replace teacher decisions.
8. **Accessible and resilient:** mobile-first, low-bandwidth, keyboard/screen-reader friendly, Bengali and English support, and graceful recovery from network interruption.

## Full product scope

### A. Core learning platform
- Multi-subject courses, syllabus/chapter/concept mapping and teacher-led content.
- Lessons, notes, resources, assignments, live classes, assessments and results.
- Student, teacher, administrator and authorized-parent experiences.
- Course publishing, enrollment and payment eligibility enforced consistently at database boundaries.
- Reliable content history and assessment versioning so edits do not rewrite the meaning of past attempts.

### B. Learning intelligence and academic twin
- Per-learner concept mastery backed by evidence counts, recency and confidence.
- Knowledge graph connecting subjects, chapters, prerequisite concepts, lessons, questions and simulations.
- Mistake memory with misconception categories, correction evidence and resolved/unresolved state.
- Spaced repetition and retesting with due dates, attempt history and mastery decay/refresh rules.
- Personalized next-step recommendations with a visible reason and evidence trail.
- Exam readiness, syllabus coverage, weak-topic heat maps and score forecasts with calibrated uncertainty.
- Exam War Room: target exam/date, available study time, daily plan, completion loop and measurable readiness changes.

### C. AI Tutor
- Context-aware tutor grounded in the learner's active subject, course, syllabus, lesson and allowed learning resources.
- Step-by-step explanations, hints-first mode, worked examples, Socratic questioning and adjustable difficulty.
- Bengali and English interaction, with terminology and notation appropriate to the subject.
- Session memory scoped to the learner and course with clear controls and retention policy.
- Citations/links to the relevant lesson or source material when available; explicit uncertainty when grounding is insufficient.
- Teacher-configurable boundaries and escalation for unresolved or sensitive questions.
- Evaluation set covering correctness, syllabus alignment, hallucination, pedagogy, language quality, latency and cost before release.

### D. AI Doubt Solver
- Text question entry first; image/OCR and voice input added only with appropriate privacy and quality checks.
- Parse the question, identify subject/topic/concept, ask for missing context, and provide a structured solution.
- Offer a hint-first path and explain why each step is valid, not only the final answer.
- Link the doubt to a concept, learner mistake memory and a recommended follow-up practice item.
- Detect low-confidence or ambiguous questions and route them to a teacher rather than inventing an answer.
- Rate-limit abuse, protect uploaded media, and delete or expire temporary files according to policy.

### E. Leaderboards and social learning
- Opt-in, cohort/course/subject-scoped leaderboards; no global exposure of minors by default.
- Multiple fair dimensions: improvement, practice consistency, helpful peer contribution and mastery progress, alongside optional achievement points.
- Anti-cheat controls, duplicate/replay protection, transparent scoring rules and season boundaries.
- Avoid rewarding raw time online, spam, answer copying or high starting ability alone.
- Badges, milestones, study groups, moderated discussions and peer challenges.
- Report/block/moderation workflow and teacher oversight.

### F. AI for teachers and content teams
- Draft question and explanation generation from approved syllabus material.
- Teacher review/edit/approve workflow; generated content remains unpublished until approved.
- Misconception summaries from privacy-thresholded aggregates.
- Suggested interventions and differentiated practice, with evidence and teacher override.
- No AI-generated grade is final without an authorized teacher action.

### G. Virtual labs and simulations
- Subject-linked simulation catalogue, interactive experiments and guided investigations.
- Safe parameter exploration, explainable outputs, reflection questions and teacher-assigned tasks.
- Completion and learning evidence connected to concepts without treating simulation clicks as proof of mastery.

### H. Parent and institution experience
- Explicitly authorized parent/guardian linking and revocation.
- Progress, attendance, upcoming work, teacher feedback and support needs; no unnecessary private chat disclosure.
- Institution/tenant isolation, roles, audit trail, configurable branding and operational reporting.
- Multi-tenant SaaS only after isolation, billing, backup/restore and support operations are independently verified.

### I. Offline-first and accessibility
- Installable mobile-first experience, resumable drafts and queued low-risk actions.
- Conflict-aware synchronization; never silently overwrite exam answers or grades.
- Low-bandwidth content modes, accessible forms, keyboard operation, screen-reader labels and contrast checks.
- Bengali/English localization and consistent Bangladesh time/date handling.

## Delivery sequence and release gates

### Stage 1 — Trustworthy foundation
Security and access parity; multi-subject data model; content and assessment lifecycle; reliable autosave; student submission/feedback; verified learning events; auditability; backups and staging discipline.

**Exit gate:** authorization tests cover student/teacher/admin/parent boundaries; migrations are reviewed and rehearsed on a non-production environment; CI build, typecheck, lint and regression suite pass; no unresolved critical/high security findings.

### Stage 2 — Learning intelligence
Concept graph coverage; mastery evidence; mistake memory; spaced repetition; retesting; explainable recommendations; exam readiness and calibrated predictions.

**Exit gate:** metrics are reproducible from source events; sparse data is clearly marked; repeated attempts do not inflate mastery; recommendation and prediction quality is evaluated on held-out data.

### Stage 3 — Engagement and social learning
Opt-in cohort leaderboards, improvement-based scoring, badges, moderated groups and peer challenges.

**Exit gate:** scoring is transparent, replay-resistant and privacy-reviewed; students can opt out; minors' visibility defaults are safe; anti-bullying and moderation paths are tested.

### Stage 4 — AI platform and learner-facing AI
Provider-independent AI gateway; AI Tutor; AI Doubt Solver; grounded retrieval; teacher escalation; AI question generation with approval workflow.

**Exit gate:** no browser-held provider keys; per-user quotas and cost limits; privacy/retention controls; red-team and subject-specific evaluation; confidence-aware refusal/escalation; teacher approval for generated content.

### Stage 5 — Scale and institution operations
Parent dashboard, institution tenancy, offline-first synchronization, broader simulations, observability, support workflows and operational resilience.

**Exit gate:** tenant-isolation tests, load and recovery tests, backup restore drills, accessibility review and real student/teacher pilot feedback.

## Current implementation status

The active engineering branch has recently focused on foundational safeguards and learning workflows: parent-course publication checks for practice, written-exam draft autosave/recovery, adaptive ranking of eligible unattempted questions, and student assignment status/feedback visibility.

These changes are staged in draft PR #42. They are not a production release. No claim is made here that the AI Tutor, AI Doubt Solver, leaderboard, parent dashboard, or full spaced-repetition engine is already implemented.

## How progress must be reported

Report separate percentages for:
- foundation implementation,
- learning intelligence,
- engagement/social features,
- AI capabilities,
- scale/operations,
- verified quality and pilot readiness.

Never report a foundation-only percentage as completion of the whole Learning OS. Each percentage must be tied to a checklist and evidence (merged code, tests, staging validation or pilot results).