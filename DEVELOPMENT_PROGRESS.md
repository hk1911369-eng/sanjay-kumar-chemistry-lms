# Development progress — Version 9 work increment

## Source audit

- Extracted and inspected the supplied v8 archive (57 ZIP entries; no package lockfile was present).
- Confirmed Next.js 15, React 19, TypeScript, Supabase SSR and six existing SQL migrations.
- Confirmed v8 included student registration/login, role routing, manual payment submission and Admin review/settings UI.
- Confirmed v8 documentation explicitly marked build, typecheck, database integration, RLS tests and deployment as not yet verified.

## Implemented in this v9 increment

- Added migration `0007_learning_content_and_teacher_scope.sql` (additive; no table reset/drop of production data): course assignments, chapters, lesson text and lesson progress; teacher assignment scoping; tighter enrollment/payment-event/profile/notice RLS; course publication guard; approval-time fee/course recheck; sender mobile number for new payment claims.
- Added student course catalogue/detail and learning pages, progress updates, profile editing and announcements.
- Added teacher course-assignment workspace, chapter creation, lesson creation/editing and completion counts.
- Added Admin course publication, teacher assignment and announcement controls; payment review requires browser confirmation and remains backed by atomic database RPCs.
- Added password recovery and update flows.
- Added Bangla/English locale cookie and public homepage translations; full dashboard translation remains incomplete.
- Added static Node guardrail tests and Netlify deployment configuration/docs.
- Removed the historical receiving-number literal from the v9 seed migration; all wallet numbers remain blank/disabled until owner configuration.

## Checks actually run

- `node --test tests/*.test.mjs`: **5 passed**. These are static source guardrail tests only, not database or browser tests.
- TypeScript syntax/structural check using a temporary local shim for absent Next.js/Supabase package declarations: **no diagnostics**. This is not a substitute for the real project typecheck.
- `npm install --ignore-scripts --no-audit --no-fund`: **blocked** because npm registry DNS lookup failed (`EAI_AGAIN registry.npmjs.org`).
- `npm run typecheck`: **not run successfully**; dependencies are not installed.
- `npm run build`: **not run**; dependencies are not installed.
- SQL migration execution, Supabase RLS tests, authentication email delivery, payment end-to-end, browser/mobile tests: **not run**; no Supabase credentials or test project were supplied.
- Deployment and live URL verification: **not run**; no hosting account/repository authorization was supplied.

## Remaining implementation gaps

- Complete Bangla/English translations throughout all public pages and dashboards.
- Full Admin student/teacher management, lesson/course CRUD refinements, audit-log viewer and site-settings management.
- Private file upload/storage bucket policies and signed downloads.
- Per-student progress detail view for Teachers (current Teacher page shows aggregate completion counts).
- Automated RLS and end-to-end tests using separate Student/Teacher/Admin identities.
- Real Next.js build/typecheck after dependencies can be installed; SQL migration run on a test Supabase project; deployment and live verification.

## Deployment status

Not deployed. Netlify Free is the preferred candidate based on current official Next.js support and commercial-use information, with monthly usage limits and no free-tier availability guarantee. Supabase Free may pause after seven days of low activity. See `FREE_HOSTING_PLAN.md`.
