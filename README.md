# JMT Academy

JMT Academy is a mobile-first online and offline learning platform built with Next.js 15, React 19, TypeScript and Supabase.

## Programmes

The public catalogue is organised around three programme groups:

- HSC 2027
- HSC 2028
- Admission Batch

Administrators can create and edit as many courses as needed inside those groups. Courses can offer one or more learning formats:

- Live + recorded: teacher-led live sessions with access to recordings.
- Recorded-only: self-paced recorded lessons without live-class access.
- Offline: in-person academy teaching, with recordings included as make-up support for active offline learners.

Each course can have its own subjects, cover image, schedule, teacher team, monthly format prices, one-time admission fee, seat capacity and enrolment status.

## Main platform areas

- Public academy website and course catalogue.
- Student applications and admin admissions review.
- Student, teacher, staff and administrator workspaces.
- Lesson chapters, video playback, downloadable class files, PDF previews and discussion threads.
- Live classes, assignments, quizzes, written exams, results and feedback.
- Student profiles, guardian contacts, permanent student IDs, attendance and payment history.
- Manual bKash, Nagad and Rocket payment submission and administrator verification.
- Finance and accounts reporting, with an append-only cash, bank, expense and refund ledger.
- In-app notifications for academic and admissions events.

## Development and deployment

- Framework: Next.js 15 / React 19 / TypeScript.
- Database, authentication and storage: Supabase.
- Hosting: Render.
- Main branch: `main`.
- Build: `npm install --no-audit --no-fund && npm run build`.
- Start: `npm start`.

## Database migrations

Apply the numbered SQL migrations in `supabase/migrations` in order. New JMT Academy migrations are additive and are designed to preserve existing student, enrolment and payment history. Do not deploy a feature that depends on a new migration until that migration has been applied successfully.

The current platform uses manual payment verification; automatic wallet gateway integration is not enabled. Verify each payment in the merchant account before approving it.
