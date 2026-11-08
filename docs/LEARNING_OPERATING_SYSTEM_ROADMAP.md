# JMT Academy — Learning Operating System Roadmap

## Product direction

JMT Academy is evolving from a single-subject course LMS into a **multi-subject Learning Operating System (Learning OS)** for learners, teachers, parents, and education institutes.

The platform must support any subject and programme. "Chemistry" in the original proposal is a worked example, not a product boundary. The subject catalogue will support Physics, Chemistry, Biology, Mathematics, English, ICT, humanities, vocational subjects, and future additions without code changes for each subject.

## Product principles

1. **Subject-agnostic by design.** Concepts, lessons, assessments, mistakes, mastery, and recommendations are connected through a shared subject taxonomy.
2. **One learner model.** Study goals, activity history, mastery evidence, retention estimates, and preferences feed one learner profile.
3. **Evidence before prediction.** Predicted HSC, medical, and engineering outcomes must be calibrated against real exam results and clearly show confidence and limitations. Never market an unvalidated estimate as an admission probability.
4. **Explainable interventions.** Every weakness flag and revision recommendation should show the evidence and the next useful action.
5. **Privacy and safeguarding.** Students see their own data; staff see only students in their assigned courses; parent access requires a verified guardian relationship and appropriate student/guardian consent.
6. **Human oversight.** AI-generated questions, feedback, predictions, and interventions require validation and teacher controls.
7. **Bangladesh-first accessibility.** Bengali and English, low-bandwidth pages, mobile-first interaction, and an offline-safe content strategy.
8. **Tenant isolation from day one of SaaS rollout.** Each institute must have a hard data boundary, branding, domain, roles, and configuration. Do not expose tenant switching until every relevant table, file path, query, and job is tenant-scoped.

## Feature map

| Advisor feature | Platform capability |
| --- | --- |
| AI personalization / Academic Twin | Learner profile, learning preferences, response patterns, mastery and retention evidence |
| Predictive analytics | Calibrated, explainable exam-readiness estimates and intervention triggers |
| Adaptive learning paths | Concept prerequisites, mastery checks, next-best lesson and practice |
| Social learning | Profiles, moderated discussions, peer answers, reputation and mentor badges |
| LXP recommendations | Recommendations for lessons, revisions, quizzes, labs and related concepts |
| Multi-tenant SaaS | Institution workspaces, tenant-scoped data, white-label branding and domains |
| Virtual labs and simulations | Subject-specific simulation catalogue with safe, accessible interactive experiences |
| Learning analytics and intervention | Student heat maps, class insights, early-warning indicators and follow-up workflows |
| AI personal teacher | Bengali/English tutor with learner-selected HSC, admission, university and Olympiad depth |
| AI mistake memory | Longitudinal error patterns, root-cause concepts and targeted remediation |
| Parent intelligence | Verified parent/guardian access to progress, attendance, goals and intervention summaries |
| AI agent teachers | Teacher-reviewed question, quiz, lesson and rubric generation |
| Exam War Room | Goal-based exam plan, revision schedule, mock tests and weak-area practice |
| Offline-first mobile experience | Installable PWA, cached notes and approved learning assets, queued progress sync |
| Chemistry Netflix / LXP | Evidence-based next recommendation across the full learning catalogue |
| Voice tutor | Bengali speech input/output, with text fallback and accessibility controls |

## Delivery sequence

### Foundation — in progress

- Universal subject catalogue and course-subject mapping.
- Hierarchical concept graph and prerequisite edges.
- Lesson-to-concept mapping.
- Learning activity event ledger.
- Learner profile and concept mastery records.
- Mistake memory and revision task stores.
- Personal study goals.
- RLS, least-privilege grants, and assigned-course staff visibility.

### Phase 1 — Student Learning OS

- Today dashboard: goals, due revision, upcoming exams, weak concepts and next action.
- Student activity instrumentation for lessons, practice, revision and simulations.
- Personal lesson-completion goal creation and database-backed progress tracking.
- Chapter/topic heat map based on evidence, not arbitrary colors.
- Teacher intervention queue for students who need support.

### Phase 2 — Adaptive learning and academic twin

- Spaced-repetition scheduler with configurable evidence thresholds.
- Concept mastery calculation with confidence and evidence counts.
- Prerequisite-aware root-cause analysis.
- Mistake clustering by concept and error type.
- Recommendation ranking across lessons, quizzes, revision and labs.
- Learner preferences inferred only from consented and relevant learning signals.

### Phase 3 — AI teacher and teacher agents

- Bengali/English subject tutor with HSC, admission, university and Olympiad modes.
- Retrieval grounded in approved course materials and concept graph.
- AI question generation with answer keys, explanations, difficulty and curriculum tags.
- Teacher review, publish controls, cost limits, rate limits, abuse protections and evaluation suite.
- Voice tutor after text tutor quality and safety are established.

### Phase 4 — Prediction and intervention

- Readiness estimates only after sufficient historical assessment data exists.
- Separate models for HSC GPA bands and admission exam readiness.
- Calibration, confidence intervals, model versioning, fairness checks and drift monitoring.
- Never imply a guaranteed GPA, admission chance, or result from sparse quiz data.
- Teacher and parent intervention summaries with clear evidence and human review.

### Phase 5 — Community, labs and family

- Moderated social learning with reporting, blocking, age-aware defaults and anti-spam.
- Parent/guardian links with verification, consent, revocation and audit trails.
- Virtual lab framework with safe simulations, keyboard/mobile support and teacher lesson links.
- Community mentor roles and reputation that cannot be gamed through raw upvotes alone.

### Phase 6 — Multi-tenant SaaS and offline

- Institution, membership, role, subscription and tenant configuration model.
- Tenant-scoped RLS for every business table and Storage bucket; tenant isolation tests.
- White-label themes, institute logo, custom domains, locale and feature flags.
- Tenant-aware background jobs, analytics, backups and support access audit.
- Offline PWA with encrypted/limited local storage and conflict-safe sync.

## Data and model safeguards

- Assessment scores must originate from trusted grading paths, not client-submitted analytics events.
- Prediction inputs must be versioned, auditable and limited to relevant education data.
- Keep raw activity events separate from derived mastery and prediction outputs.
- Support data correction, retention limits, export and deletion workflows.
- Do not expose AI provider keys to browsers or store secrets in source control.
- AI outputs must be labeled as AI-assisted and must not replace teacher judgment.

## Current implementation status

### Implemented foundation

- Universal academic-subject catalogue and course-to-subject mapping; new courses can use any subject label supported by the catalogue.
- Hierarchical concept graph, prerequisite edges with cycle protection, and lesson-to-concept mapping with cross-subject integrity checks.
- Learner profile, concept mastery, learning-event ledger, mistake-memory and revision-task stores, all protected by RLS and least-privilege grants.
- Student study goals with database-backed progress from verified learning activity.
- Verified lesson-completion events, trusted quiz assessment events, and guarded simulation-completion events. Client analytics cannot manufacture assessment scores or arbitrary study duration.
- Concept-tagged question bank and quiz builder. Quiz grading updates mastery, schedules targeted revision, stores wrong answers, aggregates recurring mistakes for reused questions, and resolves a stored mistake after a later correct answer.
- Student Today dashboard with study goals, revision queue, topic mastery, upcoming quizzes/written exams, assignment deadlines and evidence-gated lesson recommendations.
- Teacher/admin learning insights with assigned-course and subject-scoped access to due revisions, weak concepts, goals and repeated mistake patterns.
- Initial multi-subject virtual lab catalogue: Physics (Ohm's law), Chemistry (acid-base titration), Biology (monohybrid inheritance), Mathematics (linear functions) and ICT (binary conversion). Labs are filtered to enrolled course subjects and completion is checked again by a database RPC.
- Existing moderated lesson discussions and course discussions remain available as the first social-learning layer.

### In progress

- Expand virtual labs with more curriculum-aligned simulations, diagrams, guided experiment steps and teacher lesson links.
- Improve mastery calculations, prerequisite-aware root-cause tracing and mistake clustering across more assessment types.
- Add quiz, assignment and revision recommendations to the existing lesson recommendation engine.
- Build class-level intervention summaries and evidence-based heat maps.
- Add stronger accessibility and Bengali-language support across interactive learning experiences.

### Not yet implemented

- AI tutor / academic twin with Bengali and English modes.
- AI question and lesson generation with teacher review and publishing controls.
- Calibrated HSC and admission-readiness prediction models. These remain deliberately disabled until enough verified historical outcomes exist.
- Full social network features such as student follows, reputation, mentor badges and moderation tooling.
- Verified parent/guardian portal and consent workflow.
- Exam War Room with goal-based revision plans and mock-test orchestration.
- Installable offline-first PWA with conflict-safe progress sync and approved offline assets.
- Multi-tenant SaaS, white-label themes and custom institute domains. This requires tenant-scoped RLS and Storage isolation before any tenant switching is exposed.
- Bengali voice tutor.

**Important:** This is a phased build, not a claim that every advisor feature is finished. Current analytics and recommendations are evidence-based foundations; they are not AI predictions and do not claim a guaranteed GPA or admission probability.
