# JMT Learning OS — Expanded Platform Scope

**Status:** Product/engineering acceptance backlog  
**Baseline:** Derived from the JMT master acceptance backlog and November 2026 database/release audit  
**Rule:** A feature is not complete because a route, table, mock, or static test exists. Completion requires end-to-end acceptance evidence.

## Product direction

JMT is to become a dependable, mobile-first, bilingual learning platform for structured academic teaching, practice, experimentation, tutoring, assessment, and measurable learning progress. It must work well on constrained networks and low-end Android devices.

This document expands the existing atomic acceptance backlog. It does not mark any new capability as implemented.

## Architecture and priority

1. Security, identity, data integrity, and reliable platform foundations
2. Admissions, enrolment, billing, and finance
3. Academic administration and curriculum/content operations
4. Student learning workspace and lesson delivery
5. Assessment, examinations, grading, and recovery
6. Practice engine, concept graph, mastery and revision intelligence
7. **Virtual Labs and AI Tutor as adjacent, first-class learning systems**
8. Offline learning foundation and synchronisation
9. Video Library and media delivery
10. Teacher, parent, communication and community workspaces
11. Accessibility, localisation, analytics, operations and release quality

Offline capability is an architectural concern from the beginning: content identity/versioning, entitlement checks, local persistence, progress events and sync contracts must be designed before a late offline feature sprint.

---

## A. AI Tutor and Doubt Solver (AI) — elevated priority

**Product role:** A guided academic tutor beside Virtual Labs, not a generic chatbot.

| ID | Acceptance criterion | Priority | Dependencies / proof |
|---|---|---:|---|
| AI-01 | Answers are grounded in approved course materials, textbook editions, teacher notes and lessons, with precise source references. | P1 | Content provenance, retrieval evaluation, citation verification |
| AI-02 | Hints-first, Socratic questioning, worked examples and stepwise explanations are supported. | P1 | Teacher-reviewed pedagogy benchmark |
| AI-03 | Bangla and English are supported, including subject terminology, equations, units and notation. | P1 | Bilingual subject benchmark and teacher scoring |
| AI-04 | The tutor detects uncertainty, missing context, out-of-syllabus requests and unsafe prompts; it qualifies, asks, refuses or escalates instead of inventing. | P1 | Red-team suite, uncertainty calibration, escalation tests |
| AI-05 | Text and image doubts can be submitted; OCR/image interpretation is privacy-aware and user-confirmed when ambiguous. | P1 | Image evaluation set, consent/retention and deletion tests |
| AI-06 | A doubt can link to the relevant concept, prerequisite, lesson, video, practice set and lab. | P1 | Stable concept/content IDs and end-to-end navigation |
| AI-07 | Learner context personalises difficulty and explanation without exposing another learner's records. | P1 | Row-level isolation, consent and profile-minimisation tests |
| AI-08 | Tutor conversation history can be saved, searched, resumed and deleted under clear retention controls. | P1 | Retention policy and privacy tests |
| AI-09 | AI-generated questions, notes and lesson content remain drafts until authorised teacher review and publication. | P1 | Provenance, approval workflow and audit trail |
| AI-10 | Provider credentials, prompts, quotas, rate limits and cost controls remain server-side. | P0 | Secret scan, abuse tests, quota and billing tests |
| AI-11 | The tutor never claims to have read a source it did not retrieve; source excerpts and references are auditable. | P1 | Retrieval trace and source-ablation tests |
| AI-12 | Teacher handoff, report-answer and feedback controls are available. | P2 | Teacher workflow and moderation tests |
| AI-13 | AI evaluation covers chemistry, physics, mathematics, exam explanations and misconception correction. | P1 | Versioned gold dataset, regression scores and human review |
| AI-14 | Graceful fallback is available when model provider, network or quota is unavailable. | P1 | Timeout, outage and offline fallback tests |

## B. Virtual Labs (LAB) — first-class practical learning

| ID | Acceptance criterion | Priority | Dependencies / proof |
|---|---|---:|---|
| LAB-01 | Every lab has curriculum alignment, objectives, prerequisites, safety notes and teacher-approved content. | P1 | Content review |
| LAB-02 | Simulations expose meaningful variables, units, controls and observable outcomes. | P1 | Scientific correctness review |
| LAB-03 | Learners can record hypotheses, procedure, observations, calculations and conclusions in a lab notebook. | P1 | Save/resume and audit tests |
| LAB-04 | Lab evidence can be submitted and reviewed by teachers with feedback and rubric. | P1 | Role/access and grading tests |
| LAB-05 | Simulations work on mobile and low-powered devices with keyboard/touch accessibility. | P1 | Device matrix and performance budgets |
| LAB-06 | Results are reproducible and explain assumptions, tolerances and limitations. | P1 | Subject expert validation |
| LAB-07 | Lab completion is evidence, not automatic mastery; concept mastery needs separate validated evidence. | P1 | Learning-event model tests |
| LAB-08 | Lab catalogue and content updates are versioned and cannot silently overwrite editorial changes. | P0 | Migration rehearsal, versioning and rollback tests |

## C. Offline Learning (OFF) — cross-cutting capability

| ID | Acceptance criterion | Priority | Dependencies / proof |
|---|---|---:|---|
| OFF-01 | Installable PWA/app shell opens the learner's previously available workspace without a network. | P1 | Service-worker lifecycle and offline browser tests |
| OFF-02 | Learners can explicitly download lessons, notes, permitted PDFs and approved learning resources. | P1 | Entitlement, storage and download tests |
| OFF-03 | Downloaded content is versioned; stale content is identified and refreshable. | P1 | Version/expiry tests |
| OFF-04 | Offline reading preserves progress locally and resumes after app restart. | P1 | Indexed persistence and crash-recovery tests |
| OFF-05 | Practice answers and written drafts can be queued locally where assessment rules permit. | P1 | Sync contract and server-side revalidation |
| OFF-06 | Sync is idempotent, ordered where required, retryable and safe against duplicate events. | P0 | Duplicate, reorder, retry and concurrency tests |
| OFF-07 | Conflicts are detected and resolved without silently overwriting newer work. | P0 | Multi-device conflict tests |
| OFF-08 | Downloads survive interrupted connections and can resume or safely restart. | P2 | Network-throttle and interruption tests |
| OFF-09 | Learners can see download, sync, conflict, expiry and storage status. | P1 | UX acceptance |
| OFF-10 | User-controlled storage management supports remove, retry and storage estimates. | P2 | Device storage tests |
| OFF-11 | Logout, account disablement, revoked access and entitlement expiry trigger defined local-data cleanup or lockout. | P0 | Security lifecycle tests |
| OFF-12 | Private learner data is protected at rest where platform capabilities permit; cached responses never expose another account. | P0 | Threat model and cross-account tests |
| OFF-13 | Offline media is available only when licensing, provider terms and content policy permit it. | P1 | Rights metadata and entitlement tests |
| OFF-14 | Online-only actions (payments, final exam submission, grades, role changes) are never falsely represented as committed offline. | P0 | State-machine and reconciliation tests |
| OFF-15 | Low-end Android, storage pressure, clock drift and intermittent mobile data are included in acceptance testing. | P1 | Real-device test matrix |

**Offline integrity rules**
- Local state is provisional until acknowledged by the server.
- Every queued mutation carries an idempotency key, actor, resource version and creation timestamp.
- Server permissions, billing, deadlines and assessment rules are rechecked at sync time.
- The client cannot set authoritative grades, payment status, roles or entitlements.
- Conflicts are visible and recoverable; no silent last-write-wins for student work.

## D. Video Library (VID) — structured media learning

| ID | Acceptance criterion | Priority | Dependencies / proof |
|---|---|---:|---|
| VID-01 | A central searchable video catalogue supports class, subject, chapter, topic, teacher and language. | P1 | Metadata schema and search tests |
| VID-02 | Videos have title, description, learning objectives, duration, language, captions, rights and publication status. | P1 | Required metadata validation |
| VID-03 | Teacher/admin upload, processing, replacement, versioning and publication are permission-controlled. | P1 | Storage policies and audit tests |
| VID-04 | Video playlists and sequenced lecture series support curriculum structure. | P1 | Playlist CRUD and ordering tests |
| VID-05 | Adaptive quality, playback speed, captions and mobile controls work reliably. | P1 | Playback/browser/device matrix |
| VID-06 | Watch history and resume position are saved across devices. | P1 | Authenticated progress and privacy tests |
| VID-07 | Bookmarks, saved lists and continue-watching are available. | P2 | Learner journey tests |
| VID-08 | Videos deep-link to concepts, lessons, quizzes, practice and labs. | P1 | Content graph and navigation tests |
| VID-09 | Watch progress is recorded as engagement evidence, never as proof of mastery by itself. | P1 | Learning analytics semantics tests |
| VID-10 | Streaming uses an appropriate provider/CDN and does not expose private origin credentials. | P1 | Delivery architecture and access tests |
| VID-11 | Download/offline availability obeys rights, subscription and device limits. | P1 | Rights and entitlement tests |
| VID-12 | Captions/transcripts are searchable and accessible; transcript quality is reviewed. | P2 | Accessibility and transcript review |
| VID-13 | Content can be reported, unpublished and corrected with an audit trail. | P1 | Moderation and rollback tests |
| VID-14 | Media processing failure, missing thumbnail, invalid format and storage outage have recoverable states. | P2 | Fault-injection tests |

## E. Content, curriculum and academic quality (CONTENT)

| ID | Acceptance criterion | Priority |
|---|---|---:|
| CONTENT-01 | Curriculum maps class, subject, chapter, topic, concept, prerequisite and learning objective. | P1 |
| CONTENT-02 | Textbook/source register records title, author/publisher, edition, language, rights and source provenance. | P1 |
| CONTENT-03 | Every authored lesson, question, video and lab has version, author, reviewer and publication status. | P1 |
| CONTENT-04 | Content review checks factual accuracy, syllabus alignment, notation, units and age suitability. | P1 |
| CONTENT-05 | Corrections create version history and do not silently alter completed assessment evidence. | P1 |
| CONTENT-06 | Copyright, licensed content and permitted excerpts are tracked. | P0 |
| CONTENT-07 | Bangla/English localisation is consistent and preserves mathematical/scientific meaning. | P1 |
| CONTENT-08 | Content import includes deduplication, validation, preview and rollback. | P2 |

## F. Learning intelligence and student success (LI)

| ID | Acceptance criterion | Priority |
|---|---|---:|
| LI-01 | Mastery is traceable to valid evidence, confidence, recency and concept coverage. | P1 |
| LI-02 | Prerequisite graph is valid, versioned and cycle-safe. | P1 |
| LI-03 | Mistake memory records misconception, correction and resolution evidence. | P1 |
| LI-04 | Revision tasks explain why they are due and what evidence changes mastery. | P1 |
| LI-05 | Study planner adapts to time available and plan drift without losing completed work. | P2 |
| LI-06 | Readiness/prediction is calibrated on held-out data and is never presented as certainty. | P2 |
| LI-07 | Learning analytics distinguish viewing, attempting, correctness, assistance and independent mastery. | P1 |
| LI-08 | Students can inspect and challenge incorrect progress records. | P2 |

## G. Student, teacher, parent and community experience (UX)

- Student dashboard: next action, deadlines, weak concepts, downloads, sync status and recent learning.
- Teacher workspace: course authoring, review queues, class insights, feedback, attendance and communication.
- Parent/guardian workspace: authorised progress, attendance, notices and billing; no access beyond explicit relationship permissions.
- Communication: announcements, reminders, discussion, moderation, reporting and notification preferences.
- Accessibility: keyboard navigation, screen readers, contrast, captions, focus states and reduced motion.
- Localisation: Bangla/English language choice, date/number formats, readable fonts and correct scientific notation.
- Support: searchable help, issue reporting, account recovery and clear service status.

## H. Platform-wide non-functional requirements (PLAT)

| ID | Acceptance criterion | Priority |
|---|---|---:|
| PLAT-01 | Role and tenant checks are enforced server-side for every sensitive read/write. | P0 |
| PLAT-02 | Client roles cannot TRUNCATE tables, create triggers, bypass RLS or mutate audit evidence. | P0 |
| PLAT-03 | Migrations are ordered, idempotent where appropriate, rehearsed on snapshots and verified against both environments. | P0 |
| PLAT-04 | Sensitive actions have immutable, attributable audit records. | P0 |
| PLAT-05 | Backups include database, media/object storage, configuration inventory and recovery instructions. | P0 |
| PLAT-06 | Restore is rehearsed; integrity checks, checksums and recovery time/data objectives are measured. | P0 |
| PLAT-07 | Monitoring covers uptime, errors, database health, queue/sync failures, media delivery and AI cost/latency. | P1 |
| PLAT-08 | Rate limits and abuse protection cover login, payment, AI, uploads, sync and public endpoints. | P0 |
| PLAT-09 | Secrets are server-side, rotated and never committed or exposed to clients/logs. | P0 |
| PLAT-10 | Dependency vulnerabilities are reviewed across production and development dependency trees. | P1 |
| PLAT-11 | Browser E2E covers student, teacher, admin and parent critical journeys. | P0 |
| PLAT-12 | Performance budgets cover low-end Android, slow networks and large media/content pages. | P1 |
| PLAT-13 | Privacy/data retention, export, deletion and incident-response procedures are documented and tested. | P0 |
| PLAT-14 | Feature flags and staged rollout support safe release and rollback. | P1 |

## Delivery slices

1. **Foundation:** close security grants/default ACLs, migration parity, RLS/RPC gaps, backup and restore rehearsal.
2. **Core academic reliability:** admissions/payment, course publication readiness, assignments, lesson progress, assessments and written-exam recovery.
3. **Learning engine:** practice, concept graph, mastery evidence, revision and teacher insights.
4. **Practical intelligence:** virtual labs plus AI tutor; approved content retrieval and evaluated subject pedagogy.
5. **Offline foundation:** cache manifest, local data model, event outbox, idempotent sync, conflict UX and revocation behaviour.
6. **Video delivery:** catalogue, media processing, streaming, playlists, progress, captions and licensed downloads.
7. **Experience and scale:** parent/community, accessibility, analytics, performance and support.
8. **Release:** staging E2E, security regression, restore drill, monitoring, rollback and production smoke test.

## Acceptance and evidence policy

- Implemented means code exists; it is not an acceptance pass.
- Partially evidenced means some relevant implementation or tests exist but a critical path is unproven.
- Not evidenced means no reliable proof has been inspected.
- Blocked means a dependency, access or safety gate prevents validation.
- Passed requires reproducible evidence at the correct layer: unit/integration, database, browser E2E, staging or production as appropriate.
- Never infer runtime correctness from a static guardrail test or a successful build.
- Never increase overall completion percentage for research, documentation, routes, mock data or unverified migrations.
- New scope is not silently declared complete. The project percentage changes only after implementation and acceptance evidence.
