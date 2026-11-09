# JMT Academy — North-Star Product & Engineering Standard

**Status:** Product direction and acceptance standard  
**Applies to:** Every subject, programme, learning mode, role, and future academy tenant  
**Product principle:** JMT Academy is a multi-subject learning operating system, not a subject-specific coaching website.

This document sets the bar for future implementation. It is not a claim that every capability below is already shipped. Each capability must be implemented, tested, measured, and marked complete only after acceptance criteria pass.

## 1. Product ambition

Build a category-leading education platform for Bangladesh that combines the best parts of a modern learning experience platform, adaptive tutoring system, assessment engine, teacher operating workspace, academy administration suite, and offline/online learning network.

The standard is not “more features” or “prettier cards.” The standard is a coherent system that helps each learner understand what to learn next, why they are struggling, how to improve, and whether they are becoming exam-ready—while giving teachers and administrators useful, explainable controls.

Initial programmes:
- HSC 2027
- HSC 2028
- Admission preparation

Every programme must support every relevant subject. Chemistry is one subject among Bangla, English, Physics, Biology, Mathematics, Higher Mathematics, ICT, and future subjects. Subjects must be data-driven and administratively configurable, never hard-coded as the product boundary.

## 2. Experience quality bar

### Visual and interaction system
- Establish one coherent design system: typography, spacing, color tokens, motion, surfaces, navigation, charts, forms, empty states, loading states, and error states.
- Design mobile-first but deliver a rich desktop workspace. No clipped headings, broken layouts, overflow, inconsistent spacing, placeholder-looking illustrations, or dead-end screens.
- Use clear information hierarchy and task-oriented navigation for students, teachers, guardians, and administrators.
- Provide accessible keyboard navigation, visible focus, semantic controls, readable contrast, reduced-motion support, and screen-reader labels.
- Use realistic content states and polished skeleton/empty/error states. Never disguise missing functionality with decorative mock data.
- Establish performance budgets for route transitions, largest contentful paint, interaction latency, image delivery, and bundle size; measure on representative low- and mid-range Android devices and constrained networks.

### Product coherence
A feature is not complete merely because its page renders. It must connect to the underlying data, permissions, notifications, analytics, and relevant user journeys. Every important flow must be testable end-to-end.

## 3. Academic knowledge graph

Represent learning as a reusable graph:

Programme → subject → syllabus/version → chapter → topic → concept → prerequisite relationships → learning objectives → lesson/resources → practice/questions → assessment evidence → mastery state → recommended next action.

Requirements:
- Support subject-specific structures without assuming all subjects use identical chapter or question formats.
- Track curriculum and syllabus versions so historical results remain interpretable.
- Support Bengali and English labels, explanations, terminology, and search.
- Allow authorised academic administrators to manage mappings and prerequisites without code changes.
- Track provenance and review status for academic content. AI-generated content must not become authoritative course material until reviewed by an authorised educator.
- Preserve concept-level evidence across lessons, practice, quizzes, exams, and teacher assessments.

## 4. Adaptive learner experience

Build a learner model from evidence, not opaque scores:
- Concept mastery with confidence and evidence count.
- Forgetting/revision estimates and spaced retrieval schedules.
- Misconception and recurring-error patterns.
- Prerequisite gaps and concept dependencies.
- Pace, consistency, engagement, and assessment trends.
- Recommended next lesson, question set, revision session, or teacher intervention.

Recommendations must explain the reason (“revise mole concept: repeated stoichiometry errors”) and provide a way to correct or dismiss them. Do not present predictions as guarantees. Calibrate readiness estimates against real exam outcomes before using them for consequential decisions.

## 5. AI learning and teaching layer

### Learner AI tutor
- Bilingual Bengali/English tutoring with subject-aware terminology.
- Curriculum-grounded answers using approved JMT materials and cited lesson/source references.
- Socratic hints, worked examples, step-by-step explanations, alternative explanations, and practice generation.
- Image/question input where supported, with explicit uncertainty when OCR or interpretation is unclear.
- Safe refusal/escalation for requests outside the educational role.
- No fabricated citations, answer keys, or syllabus claims.

### Teacher copilot
- Draft lesson plans, question variants, rubrics, explanations, and revision plans from approved syllabus material.
- Suggest likely misconceptions and students needing support.
- Keep educator approval in control of publishing, grading decisions, and student interventions.
- Maintain an audit trail of generated, edited, approved, and published material.

### AI quality controls
- Version prompts, models, retrieval sources, and evaluation sets.
- Evaluate factual correctness, syllabus alignment, Bengali language quality, bias, safety, latency, and cost.
- Add human review queues and feedback capture.
- Protect student data; minimise what is sent to external model providers.

## 6. Assessment and exam intelligence

- Configurable question bank with subject-specific question types, marks, difficulty, tags, concept mapping, syllabus version, provenance, and review workflow.
- Secure exam delivery with server-authoritative timing, attempt state, autosave, reconnect recovery, and auditable submission.
- Randomisation and paper assembly with blueprint constraints and duplicate detection.
- Practice mode, chapter tests, full mock exams, timed admission drills, and teacher-assigned assessments.
- Rich feedback: solution steps, misconception, concept gap, and recommended follow-up.
- Item analysis: difficulty, discrimination, distractor performance, and reliability where sample sizes justify it.
- Exam readiness reports must show evidence, uncertainty, and topic-level strengths/gaps.

## 7. Teacher operating system

- Unified class/course calendar and lesson preparation.
- Attendance and engagement records for online and offline classes.
- Assignment, marking, rubric, feedback, and re-submission workflows.
- Cohort and individual progress with actionable intervention queues.
- Teacher-created content, review, publishing, and version history.
- Communication with students and guardians using role-appropriate privacy.
- Workload-aware dashboards; avoid vanity metrics.

## 8. Guardian and student support

- Verified guardian-student relationship and consent-aware access.
- Attendance, progress, upcoming work, fee status, and teacher-approved reports.
- Alerts that are actionable and configurable, not noisy.
- Student wellbeing safeguards and escalation processes appropriate to an education platform.
- Clear separation between academic indicators and sensitive personal information.

## 9. Virtual labs and interactive learning

- Subject-specific simulations for Physics, Chemistry, Biology, Mathematics, and ICT, with future subjects supported through an extensible activity interface.
- Activities must include learning objectives, instructions, safe interaction constraints, checkpoints, and evidence of completion.
- Where scientifically relevant, show units, assumptions, uncertainty, and model limitations.
- Support low-bandwidth delivery and accessible alternatives to interaction-heavy activities.
- Do not label a static animation as an interactive lab.

## 10. Social and collaborative learning

- Course discussions, study groups, peer explanation, moderated Q&A, and teacher-led sessions.
- Report/block/moderation tools, abuse prevention, rate limits, and clear community standards.
- Age-appropriate privacy and safe defaults for minors.
- Reputation or gamification must reward helpful learning behaviour, not spam or superficial activity.

## 11. Online, offline, and low-bandwidth delivery

Support three course models:
1. Live + recorded
2. Recorded-only
3. Offline classroom with authorised recorded make-up access

Requirements:
- Resumable video playback and adaptive media delivery where available.
- Download/offline access only for explicitly authorised materials, with expiry and revocation controls where technically feasible.
- Low-bandwidth mode, compressed assets, deferred loading, and resilient reconnect handling.
- Attendance and progress must reconcile safely across online and offline sessions.
- Offline synchronisation must handle conflicts explicitly and never silently overwrite exam submissions or payment records.

## 12. Academy operations and commercial controls

- Dynamic subjects, programmes, batches, courses, schedules, teachers, pricing, discounts, enrolments, and capacity.
- Multiple teachers per course with explicit permissions.
- Payment instructions, proof submission, reconciliation, approval/rejection, refunds/adjustments where applicable, and immutable audit events.
- Student lifecycle: enquiry → application → admission → enrolment → learning → completion/alumni.
- Notifications, announcements, support cases, and operational reporting.
- Financial records must be auditable; never treat a client-side success screen as proof of payment.

## 13. Multi-academy SaaS architecture (future scale)

Design for tenant isolation from the start, but do not expose tenant switching or sell multi-tenancy until it is implemented and independently tested:
- Tenant-scoped data access enforced in the database.
- Tenant-aware roles, branding, domains, billing, feature entitlements, and audit logs.
- No cross-tenant reads through APIs, storage, search, analytics, exports, or background jobs.
- Automated isolation tests and security review before enabling a second tenant.

## 14. Security, privacy, and reliability

- Least privilege, deny-by-default authorization, server-side validation, and RLS coverage.
- MFA for privileged roles where supported; secure recovery and session management.
- Rate limits, abuse controls, secrets hygiene, dependency scanning, and safe file handling.
- Audit trails for role changes, payment decisions, exam events, content publication, and sensitive exports.
- Backups with tested restore drills and documented recovery objectives.
- Monitoring for errors, latency, queue failures, suspicious access, and payment/exam anomalies.
- Data retention, export, correction, and deletion policies appropriate to student data.
- Never run destructive production migrations or deploy unreviewed changes.

## 15. Quality gates — definition of done

A module is complete only when:
1. Its student, teacher, and admin journeys (where applicable) work end-to-end.
2. Permission tests cover allowed and denied cases, including cross-user access.
3. Mobile, desktop, keyboard, accessibility, and low-bandwidth behaviour are checked.
4. Loading, empty, error, retry, and recovery states are implemented.
5. Automated unit, integration, and end-to-end tests pass.
6. Analytics and audit events are correct and privacy-aware.
7. Performance is measured against agreed budgets.
8. Documentation and support/admin operating notes are updated.
9. No unresolved critical/high security or data-integrity issue remains.
10. The feature is verified in staging before release.

## 16. Delivery order

**P0 — Trustworthy foundation:** audit current routes and journeys; close security gaps; reliable identity/roles; academic graph; multi-subject catalogue; course/enrolment/payment correctness; responsive design system; end-to-end test harness.

**P1 — Exceptional learning core:** student workspace; teacher workspace; assessment engine; concept mastery; revision and misconception workflows; course authoring and publishing; notifications.

**P2 — Intelligence and differentiation:** grounded bilingual AI tutor; teacher copilot; adaptive practice; calibrated readiness analytics; interactive simulations; intervention recommendations.

**P3 — Ecosystem and scale:** guardian portal; moderated social learning; offline sync; richer analytics; multi-academy tenancy; operational automation.

This order is a dependency plan, not permission to omit later capabilities. Each phase must meet the definition of done before being represented as complete.

## 17. Product scorecard

Track real outcomes:
- Activation: admitted students who successfully begin learning.
- Learning: concept mastery gain and retention after spaced intervals.
- Assessment: improvement by concept and exam type, with sample-size context.
- Support: time from detected learning difficulty to teacher intervention.
- Reliability: successful lesson playback, exam submission recovery, and payment reconciliation.
- Experience: task completion, accessibility defects, mobile performance, and support burden.
- Trust: authorization failures caught in tests, security incidents, and recovery drill results.
- AI quality: groundedness, factuality, syllabus alignment, Bengali quality, latency, and cost per useful learning session.

Never optimise a single vanity metric at the expense of learning, safety, or trust.
