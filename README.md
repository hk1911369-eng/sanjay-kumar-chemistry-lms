# JMT Academy

JMT Academy is a Bangladesh-focused, multi-subject Learning Operating System for students, teachers and education institutes. Chemistry is one supported subject—not a product boundary. The platform is designed to support Physics, Chemistry, Biology, Mathematics, Bangla, English, ICT, business studies, humanities, vocational subjects and future additions.

## Platform

- Next.js 15, React 19 and TypeScript.
- Supabase Auth, Postgres with row-level security, and private Storage.
- Student, Teacher, Staff and Admin workspaces.
- Subject-independent subject catalogue, course-subject mapping and concept prerequisite graph.
- Learning activity ledger, learner profiles, concept mastery, mistake memory, revision tasks and weekly study goals.
- Student Learning OS dashboard with goals, revision queue and evidence-based topic mastery indicators.
- Course applications, learning-format selection, lesson content, quizzes, assignments, written exams, attendance, discussions and notifications.
- Manual bKash, Nagad and Rocket payment submission with Admin verification.
- Finance ledger, student register and CSV exports.
- Bengali and English locale preference.

## Course model

Administrators organise courses under the currently configured programme groups: HSC 2027, HSC 2028 and Admission Batch. Each course can cover one or more subjects; course subjects are synchronized into the universal subject catalogue. Each course can offer Live + Recorded, Recorded-only and/or Offline learning, with its own published fee settings. Payment verification is manual; the platform does not claim to verify wallet transfers automatically.

## Local development

Requirements: Node.js 22 and npm.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run dev
```

Create a local `.env.local` using the variable names documented in `DEPLOYMENT.md`. Never commit secrets or paste them into chat.

## Database

Apply numbered SQL files in `supabase/migrations` in order to a separate test project first. Verify the applied migration history before deploying code that depends on a migration. Production migrations must be reviewed and applied deliberately; do not reset production or delete records to resolve schema drift.

## Hosting

Production runs on Render. The Render Blueprint is described in `render.yaml`; read `DEPLOYMENT.md` before syncing it. The Blueprint declares variable names only and contains no secret values.
