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

## Benchmark-driven scope expansion — November 2026

This section expands the product ambition after reviewing the student-facing experience described by the product owner and the publicly documented ACS Future School offering. These are target capabilities, not claims of current implementation. JMT should learn from the category benchmark without copying proprietary branding, visual assets, or unsupported claims.

### 1. Personal Academic Command Centre

Build a genuine annual-to-daily planner, not a simple task list.

- Annual syllabus map by board, class, subject, chapter, lesson, concept and exam; show planned teaching dates, target completion dates, revision windows and assessment dates.
- Student availability profile: school/coaching timetable, weekday and weekend availability (including Saturday/Sunday), preferred study windows, daily study capacity, sleep and wake targets, breaks, commute and recurring commitments.
- Student-defined goals: exam target, subject targets, chapter targets, habits and personal milestones.
- Generate a realistic year plan, term plan, weekly plan and daily timetable from syllabus workload, available time, prerequisite order and exam deadlines.
- Let students edit, pause, archive, duplicate and restore plans; preserve plan versions and explain what changed.
- Automatic replanning when a class is missed, a task is delayed, an exam date changes or a learner's available time changes. Protect completed work and avoid silently moving commitments.
- A catch-up engine that prioritizes prerequisite gaps and high-impact syllabus coverage without creating impossible daily workloads.
- Class attendance/completion, homework, revision, practice, tests and lab work all feed the same progress model.
- Daily check-in, completion evidence, streaks with grace rules, weekly review and end-of-term/year reports.
- Calendar/timetable views, reminders and downloadable/printable plans; low-bandwidth and offline-friendly operation.
- Optional, permission-scoped parent visibility and teacher-assigned plan templates.

### 2. JMT Learning Community

Treat the community as a first-class learning product with safety and academic quality built in.

- Topic-, subject-, chapter- and concept-linked doubt posts; text first, with image attachments and later audio/video where safe.
- Peer answers, threaded discussion, follow-up questions, accepted answers and teacher-verified answers.
- Notes marketplace/library for sharing, saving, downloading, reporting and organizing student-created notes.
- Note quality evaluation with transparent rubric signals (accuracy, syllabus alignment, clarity, completeness, originality and usefulness); ranked collections such as top notes, not popularity-only ranking.
- Compare notes side by side, annotate, suggest corrections, maintain versions and attribute original authors.
- Homework discussion spaces where teachers can publish work, review submissions, give feedback and identify common misconceptions without exposing private student work.
- Study groups, topic rooms, peer challenges, collaborative revision and class/cohort spaces.
- Reputation based on verified helpfulness and quality, not spam, raw posting volume or reciprocal vote rings.
- Moderation queue, report/block/mute, anti-harassment controls, plagiarism/copyright reporting, rate limits and teacher/admin oversight.
- Minor-safe defaults: private identity and academic records, opt-in public profiles, controlled direct messaging (off by default for minors), guardian/institution controls and auditable moderation.
- Accessibility, Bangla/English support, content search, bookmarks and export/download controls.

### 3. Curriculum-linked Virtual Lab Network

Expand the current simulation catalogue into a reviewed, multi-subject laboratory system.

- Physics lab: interactive motion and projectile-motion experiments, force, energy, waves, electricity, optics and circuits, with adjustable parameters, live graphs, prediction prompts and experiment reports.
- Chemistry lab: reaction, equilibrium, gas laws, titration, bonding, stoichiometry and safe virtual practicals, with units and safety notes.
- Mathematics lab: matrices, vectors, transformations, coordinate geometry, functions, calculus and statistics with visual manipulation and graphing.
- Biology lab: cell structures, genetics, physiology, ecology and data interpretation models.
- ICT/computing lab: HTML/CSS/JavaScript editor with live preview; SQL editor with a constrained practice database and query output; C and other curriculum-approved language exercises with compile/run output.
- Every lab maps to curriculum concepts, prerequisites, learning objectives, guided tasks, reflection questions and follow-up practice.
- Sandbox code execution with strict CPU/memory/time limits, isolated ephemeral environments, no arbitrary network access, no secret exposure and abuse controls. Never execute learner code in the application server process.
- Save experiment state, export/download reports and let teachers assign practicals and review evidence.
- Separate simulation interaction telemetry from demonstrated understanding; use prediction, explanation and assessment evidence before updating mastery.
- Teacher review, accessibility checks, device performance testing and scientific validation before a lab is published.

### 4. Student Productivity and Study Tools

- Built-in scientific calculator with standard/scientific modes, equation/history support and exam-appropriate functions; create an original implementation and interface rather than copying Casio branding or proprietary screen assets.
- Focus sessions, configurable Pomodoro/deep-work modes, distraction-light study view and session reflection.
- Optional routine modes and user-controlled appearance (classic/modern, light/dark, reduced motion, font sizing).
- Optional faith/cultural routine preferences, including user-configured prayer-time-aware scheduling where reliable local data is available; never force a mode or infer a student's religion.
- Personal notifications for classes, deadlines, revision, community replies, teacher feedback and plan changes, with quiet hours and per-category controls.
- Notes workspace, formula sheet, bookmarks, downloads and offline access to eligible content.
- Accessibility and wellbeing safeguards: breaks, realistic workload warnings, quiet hours and no punitive streak mechanics.

### 5. Unified Teacher and Parent Workspaces

- Teacher home: upcoming classes, attendance, homework to review, doubt queue, assessment marking, at-risk concept clusters and intervention suggestions.
- Teacher content studio: create/review/publish lessons, notes, questions, labs, study-plan templates and revision packs with version history.
- Assignment lifecycle: due dates, late policy, drafts, resubmissions, submission history, rubrics, feedback and pagination at scale.
- Parent dashboard: authorized progress, attendance, syllabus coverage, upcoming work, teacher feedback, wellbeing/workload indicators and actionable support guidance.
- Clear role boundaries, guardian consent/revocation, audit trails and tenant isolation.

### 6. Unified Learning Intelligence and AI

- A shared learner model connects syllabus coverage, planner execution, attendance, lessons, practice, assessments, mistakes, labs and community contribution.
- Explainable next-best-action engine: recommend a class, lesson, note, lab, doubt thread, practice set or rest/replanning action with a reason and confidence.
- Detect plan drift, prerequisite gaps, misconceptions, exam risk and overload; distinguish missing evidence from poor performance.
- AI Tutor and Doubt Solver grounded in approved course material, with hints-first pedagogy, worked steps, Bengali/English, source references, uncertainty and teacher escalation.
- AI-generated questions, notes and plan suggestions remain drafts until teacher or authorized content-owner approval.
- Predictive scores only after sufficient representative data and calibration; show uncertainty and never present forecasts as guarantees.
- Privacy-preserving community and classroom insights with minimum cohort thresholds.

### 7. Product quality bar and delivery gates

- One coherent student experience across web and mobile; fast on low-cost Android devices and weak connections.
- Search across syllabus, lessons, notes, questions, labs and community, with permission-aware results.
- Notifications, downloads, accessibility, offline recovery, localization and responsive layouts are core acceptance criteria, not polish deferred indefinitely.
- Product analytics must measure meaningful outcomes: syllabus completion, learning gains, resolved doubts, quality of peer help, plan adherence, lab understanding and student/teacher retention—not merely clicks or time spent.
- Run task-based usability tests with real students, teachers and guardians in Bangladesh before declaring a major module ready.
- Every module requires functional, authorization, abuse, accessibility, performance and data-retention tests plus a usable empty/loading/error/offline state.
- Never market a feature as complete based solely on a UI mockup or a database table. Completion requires end-to-end workflows, tests, operational controls and pilot evidence.

### Revised strategic priority

1. **Student-facing parity foundation:** annual planner, coherent syllabus calendar, student productivity tools, teacher homework workflow and notifications.
2. **Community and knowledge sharing:** moderated doubt/answer system, note library, quality evaluation, compare/download and teacher oversight.
3. **Curriculum lab platform:** physics and mathematics graphing labs first, then chemistry, biology and secure ICT coding/SQL environments.
4. **Learning intelligence:** connect all events to mastery, mistake memory, adaptive revision, plan repair and exam readiness.
5. **AI layer:** grounded tutor, doubt solver, content authoring and teacher support, introduced only with evaluation and cost/privacy controls.
6. **Parent, offline and institution scale:** deepen after student workflows and data boundaries are proven.

The product owner may provide app videos/screenshots later. Those should be treated as additional first-hand benchmark evidence and used to refine acceptance criteria. Do not delay the broader architecture waiting for those materials.
