# SANJAY KUMAR CHEMISTRY LMS — v9 development release

Mobile-first Next.js 15 / React 19 / TypeScript LMS foundation for Bangladesh. The catalogue is limited to HSC 2027 Chemistry, HSC 2028 Chemistry and Admission Chemistry. Every course has a **৳1,500 one-time admission fee** and **৳700 monthly tuition**. The first payment is **৳2,200** (admission + first month). Manual bKash, Nagad and Rocket payment review is used; no wallet API or automatic payment success is implemented.

## What's in this version

- Supabase SSR email/password authentication, student-only public registration, email confirmation and password recovery.
- Server-side role routing for Student, Teacher and Admin.
- Manual payment submission with separate initial/monthly payment types, admin-only review, atomic enrollment/paid-through updates and private receiving-number settings.
- Admission and monthly fee rules enforced by database trigger and approval RPC; lessons are visible only while current-month tuition is paid.
- Additive migration `0008_admission_and_monthly_fees.sql` adds per-course pricing, billing periods, admission status and monthly access dates.\n- Additive migration `0009_student_management.sql` adds permanent Student IDs, guardian/contact/college/location details, private profile photos, Staff role, attendance, follow-up records and a permission-checked payment calendar.
- Additive migration `0007_learning_content_and_teacher_scope.sql` for teacher course assignments, chapters, lesson text and per-student progress.
- RLS scope tightened so Teachers can only read/edit assigned course content and cannot access payment review, enrollment administration or merchant settings.
- Student learning page with published lesson content, external HTTPS video links and completion tracking.
- Teacher lesson creation/editing and Admin teacher assignment / announcement forms.\n- Student management workspace at `/students/manage`: search by Student ID, student mobile, guardian mobile or name; review course enrollments and monthly paid/due/pending calendar; view student profile and guardian contact; mark attendance; log homework, attendance, academic, illness, discipline and guardian-call follow-ups; resolve follow-ups.\n- Admin can provision existing accounts as Student, Teacher or Staff and assign Teachers/Staff to courses. Assigned Teachers/Staff see only students in their assigned courses. Admin-only payment review remains separate.
- Bangla/English locale cookie and a translated public landing page; other authenticated and informational pages still need complete translation before claiming full bilingual coverage.
- Public course catalogue and course detail, About, Contact, Privacy, Terms and Help pages.

## Local setup

1. Use Node.js 20.9 or newer.
2. Create a Supabase project and configure email/password Auth.
3. Copy `.env.example` to `.env.local`; fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `APP_URL` locally.
4. Apply migrations `0001` through `0009` in numeric order to a **new/test project first**. For an existing project, review the SQL and current migration history before applying. Migrations do not reset existing records.
5. Add `/auth/confirm` to the Supabase Auth redirect allow-list.
6. Run `npm install`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run dev`.
7. Register the owner's account normally, confirm its email, then use the trusted SQL procedure in `ADMIN_PROVISIONING.md` to promote it to Admin. Never promote the first public registration automatically.

## Admin setup

- Apply migration 0007 before using teacher assignment, lesson authoring, announcements or progress tracking.
- Apply migration 0008 before accepting the new initial or monthly payment types.\n- Apply migration 0009 before opening Student Management or provisioning Staff roles. It creates a private `student-avatars` Storage bucket and RLS policies; profile photos are limited to 3 MB JPG/PNG/WebP.
- Create Teacher accounts through trusted provisioning (register and confirm first, then update the profile role in the Supabase SQL editor as documented in `ADMIN_PROVISIONING.md`).
- Assign teachers to courses from the Admin dashboard.
- Configure each receiving wallet number only after verifying account ownership and the correct account type. Each payment method starts disabled and blank after migration 0006.
- Publish the three courses only when real course details and lesson material are ready.
- Review every submitted transaction independently in the relevant wallet merchant account before approving. Approval updates enrollment or monthly access in the same database transaction.

## Security notes and limitations

- The Supabase service-role key is not needed by the current runtime and must never be exposed in browser code.
- Student registration never accepts a role. Role changes are protected by a database trigger and trusted admin provisioning.
- Payment claims are immutable to clients; approval/rejection is an Admin-only RPC. Pending/rejected submissions do not grant access.
- RLS is used for profiles, courses, enrollments, payment records, lessons, notices, assignments and lesson progress. Review migration SQL carefully before production use.
- External video URLs are links, not DRM. Screen capture and copying cannot be fully prevented. Private file uploads and signed storage URLs are not implemented yet.
- Student management now covers identity, guardian contact, search, attendance and staff follow-ups. Direct Admin editing of every student profile field, advanced analytics, audit-log viewer, comprehensive notification delivery and full course CRUD remain future work.
- The public landing page has Bangla/English switching. Complete translations throughout dashboards and all public pages remain unfinished.
- No automated browser, RLS integration, payment end-to-end or production tests have been run. The included Node tests are static source guardrails only.

## Production deployment blockers

Production deployment requires owner-controlled Supabase project credentials and an authorized hosting account. Do not paste passwords, OTPs or secret keys into chat. Set environment variables only in the provider's secure dashboard. The application is not live until migrations, auth redirects, payment configuration, real-account role tests and a public HTTPS deployment have been verified.

## Student usage

1. Register and confirm your email.
2. Choose one of the three Chemistry courses.
3. First payment: send **৳2,200** (৳1,500 admission + ৳700 first month) and submit one transaction ID.
4. Wait for Admin verification. Approval activates the course through the end of the current Bangladesh billing month.
5. Pay **৳700 each month** to keep lesson access active. A pending or rejected monthly payment does not extend access.
6. Never submit wallet PINs, OTPs or passwords.

## Teacher usage

1. Register and confirm an account as a student first.
2. Ask the owner/Admin to provision the account as Teacher and assign it to one or more courses.
3. Open the Teacher workspace to add chapters and create/edit lessons in assigned courses.
4. Publish lesson content only when it is ready. The dashboard shows aggregate completion counts for assigned lessons.
5. Teachers cannot approve payments, change prices, activate enrollments or manage merchant settings.

## Admin usage

1. Bootstrap the first Admin using `ADMIN_PROVISIONING.md`.
2. Verify each submitted transaction in the official wallet merchant account before approving or rejecting. Rejection requires a reason.
3. Initial payment approval records the admission fee and first monthly fee; each monthly approval extends access through that billing month.
4. Configure bKash/Nagad/Rocket receiving numbers only after confirming account ownership; enable only verified methods.
5. Create student announcements from the Admin dashboard.
