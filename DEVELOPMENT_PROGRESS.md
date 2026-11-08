# Development progress — Learning OS expansion

## Product direction

JMT Academy is a multi-subject Learning Operating System. Chemistry is a subject, not the product boundary. The shared subject model is designed for science, mathematics, languages, business, humanities, ICT and future curricula.

## Implemented foundation

- Added a universal subject catalogue and course-subject mapping.
- Existing course subjects are backfilled additively; course creation/edit now synchronizes the selected subjects into the catalogue.
- Added hierarchical learning concepts, prerequisite relationships and lesson-to-concept links.
- Added learning activity events with database rules preventing student-submitted assessment scores.
- Added learner profile, concept mastery, mistake memory, revision task and study goal records.
- Added student Learning OS dashboard with weekly goals, revision queue, tracked-topic count and evidence-based mastery indicators.
- Lesson completion now records a learning event.
- Staff access to learner mastery is restricted to concepts in the staff member's assigned course subjects; the global academic profile is visible only to the student and administrators.
- Added indexes for the new Learning OS foreign-key relationships.
- Added a complete subject-agnostic roadmap covering adaptive learning, AI tutoring, prediction, social learning, virtual labs, parent access, offline-first delivery and SaaS tenancy.

## Verification

- Supabase migrations for the foundation, event integrity, subject-scoped staff visibility and foreign-key indexes have been applied.
- All Learning OS tables have RLS enabled and anonymous table access revoked.
- Guardrail tests and ESLint pass on the latest tested code increment; TypeScript and production build also pass.
- Production dependency audit reports zero high-severity production vulnerabilities.
- The latest dashboard changes are committed to GitHub; deployment is gated on the verified mainline CI result.

## Important limitations — not yet complete

- No concepts or course-subject rows exist until administrators create/update courses and map concepts. The production database currently has no courses, so mastery and revision dashboards correctly show empty states.
- Mastery calculations, spaced-repetition scheduling, mistake classification and recommendation ranking still need trusted processing logic.
- AI tutor, AI question generation, validated exam predictions, social network, virtual labs, parent dashboard, voice tutor, full offline sync and multi-tenant SaaS rollout remain future implementation phases.
- HSC/admission predictions must wait for sufficient historical outcomes and calibration; no unsupported admission probabilities or guaranteed results will be shown.
- Tenant isolation must be implemented across every table, storage path, background job and query before exposing white-label institute workspaces.
- Supabase Auth leaked-password protection remains a dashboard-only setting; it has not been enabled through the available project controls.
