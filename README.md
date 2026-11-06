# SANJAY KUMAR CHEMISTRY LMS — v9 development release

Mobile-first Next.js 15 / React 19 / TypeScript LMS foundation for Bangladesh. The business catalogue is limited to HSC 2027 Chemistry, HSC 2028 Chemistry and Admission Chemistry, each at a one-time price of **৳700**. Manual bKash, Nagad and Rocket payment review is used; no wallet API or automatic payment success is implemented.

## What's in this version

- Supabase SSR email/password authentication, student-only public registration, email confirmation and password recovery.
- Server-side role routing for Student, Teacher and Admin.
- Manual payment submission, admin-only review confirmation, atomic database approval/enrollment RPCs and private receiving-number settings.
- Additive migration `0007_learning_content_and_teacher_scope.sql` for teacher course assignments, chapters, lesson text and per-student progress.
- RLS scope tightened so Teachers can only read/edit assigned course content and cannot access payment review, enrollment administration or merchant settings.
- Student learning page with published lesson content, external HTTPS video links and completion tracking.
- Teacher lesson creation/editing and Admin teacher assignment / announcement forms.
- Bangla/English locale cookie and a translated public landing page; other authenticated and informational pages still need complete translation before claiming full bilingual coverage.
- Public course catalogue and course detail, About, Contact, Privacy, Terms and Help pages.

## Local setup

1. Use Node.js 20.9 or newer.
2. Create a Supabase project and configure email/password Auth.
3. Copy `.env.example` to `.env.local`; fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `APP_URL` locally.
4. Apply migrations `0001` through `0007` in numeric order to a **new/test project first**. For an existing project, review the SQL and current migration history before applying. Migrations do not reset existing records.
5. Add `/auth/confirm` to the Supabase Auth redirect allow-list.
6. Run `npm install`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run dev`.
7. Register the owner's account normally, confirm its email, then use the trusted SQL procedure in `ADMIN_PROVISIONING.md` to promote it to Admin. Never promote the first public registration automatically.

## Admin setup

- Apply migration 0007 before using teacher assignment, lesson authoring, announcements or progress tracking.
- Create Teacher accounts through trusted provisioning (register and confirm first, then update the profile role in the Supabase SQL editor as documented in `ADMIN_PROVISIONING.md`).
- Assign teachers to courses from the Admin dashboard.
- Configure each receiving wallet number only after verifying account ownership and the correct account type. Each payment method starts disabled and blank after migration 0006.
- Publish the three courses only when real course details and lesson material are ready.
- Review every submitted transaction independently in the relevant wallet merchant account before approving. Approval activates enrollment in the same database transaction.

## Security notes and limitations

- The Supabase service-role key is not needed by the current runtime and must never be exposed in browser code.
- Student registration never accepts a role. Role changes are protected by a database trigger and trusted admin provisioning.
- Payment claims are immutable to clients; approval/rejection is an Admin-only RPC. Pending/rejected submissions do not grant access.
- RLS is used for profiles, courses, enrollments, payment records, lessons, notices, assignments and lesson progress. Review migration SQL carefully before production use.
- External video URLs are links, not DRM. Screen capture and copying cannot be fully prevented. Private file uploads and signed storage URLs are not implemented yet.
- The current teacher interface can create and edit lesson metadata/text, but chapter CRUD, file upload, course CRUD, student administration, audit-log viewer, complete profile/admin settings and comprehensive notification delivery remain incomplete.
- The public landing page has Bangla/English switching. Complete translations throughout dashboards and all public pages remain unfinished.
- No automated browser, RLS integration, payment end-to-end or production tests have been run. The included Node tests are static source guardrails only.

## Production deployment blockers

Production deployment requires owner-controlled Supabase project credentials and an authorized hosting account. Do not paste passwords, OTPs or secret keys into chat. Set environment variables only in the provider's secure dashboard. The application is not live until migrations, auth redirects, payment configuration, real-account role tests and a public HTTPS deployment have been verified.

## Changelog — v9 work increment

- Added migration 0007: chapters, course assignments, lesson progress, lesson text, assigned-teacher RLS and stricter legacy-course publication guard.
- Added teacher course assignment and lesson authoring/editing, student lesson access and completion, Admin announcements.
- Added password recovery pages/actions and password update callback handling.
- Added public course catalogue/details and informational/legal/help pages.
- Added locale cookie and Bangla/English public home translations.
- Added Admin payment review confirmation and tightened payment-event/notice policies.
- Preserved the original Version 8 archive unchanged.

## Student usage

1. Open the public site and register with name, email and optional Bangladesh mobile number.
2. Confirm the email if Supabase email confirmation is enabled, then log in.
3. Select one of the three courses. If enrollment is not open, wait for the Admin to publish it.
4. For an enabled payment method, pay ৳700 and submit the sender mobile number and transaction ID.
5. Wait for manual Admin review. Pending/rejected claims do not unlock lessons. After approval, open the course from the Student dashboard and mark lessons complete.
6. Update your permitted profile fields from the Student dashboard. Never submit wallet PINs, OTPs or passwords.

## Teacher usage

1. Register and confirm an account as a student first.
2. Ask the owner/Admin to provision the account as Teacher and assign it to one or more courses.
3. Open the Teacher workspace to add chapters and create/edit lessons in assigned courses.
4. Publish lesson content only when it is ready. The dashboard shows aggregate completion counts for assigned lessons.
5. Teachers cannot approve payments, change prices, activate enrollments or manage merchant settings.

## Admin usage

1. Bootstrap the first Admin using `ADMIN_PROVISIONING.md`.
2. Publish each course only after its real description/content is ready. Each price remains fixed at ৳700.
3. Provision Teachers and assign them to the correct courses.
4. Configure bKash/Nagad/Rocket receiving numbers only after confirming account ownership; enable only verified methods.
5. Check each transaction in the official merchant account before approving or rejecting. Rejection requires a reason. Approval activates enrollment atomically.
6. Create student announcements from the Admin dashboard.

## Project documents

- `AUDIT_REPORT.md` — Version 8 findings and v9 changes.
- `DEVELOPMENT_PROGRESS.md` — actual checks and blockers.
- `SECURITY_REVIEW.md` — implemented controls and outstanding risks.
- `DEPLOYMENT.md` — owner-controlled deployment steps.
- `FREE_HOSTING_PLAN.md` — current plan/cost comparison.
- `CHANGELOG.md` — version changes.
