# Sanjay Kumar Chemistry — Platform Rebuild Blueprint

## Product direction

Build one coherent, mobile-first Chemistry learning platform for HSC 2027, HSC 2028 and university-admission learners. Use ACS Future School as a reference for the quality and breadth of the learning experience, not as a design or content copy. Keep the product focused on Chemistry and on the needs of this coaching centre.

The platform must be organised around complete user journeys. A feature is not complete because a button or menu item exists: its database records, permissions, teacher workflow, student experience, admin controls and tests must all work together.

## Navigation and product areas

### Public website
- Home: clear course choices, learning benefits, teacher introduction, sample lesson and calls to action.
- Course catalogue: separate HSC 2027, HSC 2028 and Admission Chemistry pages with syllabus, chapter plan, teacher, class format, materials, schedule and fees.
- Free sample classes and public learning resources.
- Teacher profile, student achievements/testimonials (only real, approved content).
- Admission instructions, tuition policy, contact, help/FAQ, privacy and terms.
- Search-engine metadata, sitemap and structured data.

### Student workspace
- Dashboard: today's schedule, next live class, unfinished lessons, pending assignments, upcoming tests, announcements and fee status.
- My courses: course overview, syllabus, chapters, lesson list and progress.
- Learning room: recorded class playback, live-class joining, lesson notes, slides/PDF preview and download, worksheets and attached files.
- Study tools: bookmarked lessons, searchable resource library, formula sheets and chapter-wise revision materials.
- Practice: daily quiz, weekly quiz, question bank, timed model tests, written submissions, answer review and results.
- Doubt-solving community: lesson questions, replies, teacher answers, reactions, moderation and report controls.
- Communication: notices, class reminders and in-platform notification inbox.
- Account and fees: student ID, profile/photo, guardian details, college/institution, location, admission date, monthly payment calendar, paid-through date, pending dues and payment history.

### Teacher workspace
- Overview: assigned courses, class schedule, pending doubts, assignments to review and student progress.
- Course content studio: chapter and lesson management, draft/publish controls, ordering, recorded video, slides, PDFs, notes and downloadable resources.
- Live class planner: date/time, meeting link, reminder and attendance list.
- Assessment studio: question bank, quiz/test builder, answer key, marks, written-answer review and result publishing.
- Student support: assigned-course student search, attendance, progress, concern/follow-up notes and guardian call outcome.
- Discussion inbox: unanswered questions, replies, pinned answers and moderation.

### Staff workspace
- Student search and records within assigned courses.
- Admission enquiries, document/profile checks and follow-up queue.
- Attendance and guardian-call records.
- No ability to publish academic content unless explicitly assigned; no payment approval or role-management permission by default.

### Admin workspace
- At-a-glance operations dashboard and alerts.
- Student CRM: admission profile, guardian information, college/location, photo, course history, payment ledger and status.
- Staff and teacher accounts, role assignment and course assignment.
- Course catalogue, curriculum, syllabus, schedule, teachers and publication controls.
- Admissions, enrolments, monthly billing, payment verification, due list and payment calendar.
- Lesson/content moderation and publishing.
- Timetable, attendance, assignments, exams, question banks and result reports.
- Announcements, notification delivery, community moderation and support.
- Reports, audit log, role permissions and site/payment settings.

## Personal requirements already requested

These are core product requirements, not optional ideas:
- Record each student's admission date and permanent Student ID.
- Store student mobile, guardian name/number, college/institution, area/location and profile photo.
- Show exactly which month each student paid, their paid-through month, unpaid months and due amount.
- Track admission fee separately from monthly tuition; do not charge the one-time admission fee again to already-admitted learners.
- Let teachers upload class videos, PDFs, slides and other materials. Students should play supported videos on the site and preview/download PDFs and slides.
- Give each lesson a discussion area with comments, replies and reactions.
- Allow assigned teachers/staff to mark attendance and record guardian calls with outcomes and follow-up dates.
- Include search across students, courses, chapters, lessons and learning resources.

## Shared architecture

Use the same application shell and design system for every authenticated workspace:
- Role-aware sidebar navigation on desktop and compact horizontally scrollable navigation on mobile.
- Consistent page header, page title, content width, section spacing, forms, tables, filters, status labels and empty/loading/error states.
- Navigation must point only to working pages or working section anchors.
- Keep public pages visually separate from authenticated workspaces while using the same typography, colour tokens and components.

Keep the backend grouped by business domain:
1. Identity and access: profiles, roles, course assignments and Row Level Security.
2. Catalogue and curriculum: courses, course subjects, chapters, lessons and schedules.
3. Learning resources: private storage metadata, signed previews/downloads, progress and bookmarks.
4. Admissions and finance: enrolments, admission fee, monthly ledger, payment submissions, approvals and dues.
5. Assessment: question bank, quizzes, exams, submissions, marking and results.
6. Student operations: attendance, guardian calls, follow-ups and student records.
7. Communication: notices, discussions, replies, reactions and notifications.
8. Reporting and governance: dashboards, audit events and system settings.

## Delivery sequence

### Foundation — underway
- Preserve the live Supabase project and all existing records.
- Keep existing sign-in, role routing, admission/monthly payment logic, student management and private lesson-resource upload.
- Introduce one shared role-based workspace shell and a real navigation hierarchy.
- Document the complete feature map before adding more database tables.

### Academic core
- Course/curriculum management with chapter ordering and teacher ownership.
- Timetable and live-class records.
- Assignments and teacher feedback.
- Question bank, daily/weekly quizzes, timed model tests, written tests and marks/results.

### Student experience
- A real student home dashboard driven by schedule, learning progress, tests and dues.
- Searchable class/material library, bookmarks, progress tracking and course completion.
- Discussion inbox, announcements and notifications.

### Operations and administration
- Complete admin editing of student records.
- Teacher/staff directory and scoped permissions.
- Payment calendar and due/overdue reports.
- Attendance, guardian-call workflow, academic reports and audit log.

### Public website and quality release
- Course pages, syllabus, teacher profile, demo lessons, success stories and admission funnel.
- Full Bangla/English coverage across public and private areas.
- Mobile/browser testing and end-to-end tests using separate Student, Teacher, Staff and Admin accounts.
- RLS/security review and production verification.

## Existing implementation status

Already present in the current codebase:
- Three Chemistry course routes and public catalogue.
- Student registration/login and role-based portals.
- Manual bKash/Nagad/Rocket payment submission and Admin review.
- Admission and monthly fee tracking foundations.
- Student profile, permanent ID, guardian/contact, college/location and photo fields.
- Student search, attendance and staff follow-up records.
- Teacher course assignment, chapter/lesson editor and lesson publishing.
- Private class-resource uploads, in-page video playback, PDF preview/download, discussion comments/replies/reactions, lesson bookmarks and progress.

Not yet implemented as complete end-to-end modules:
- Scheduled live classes and calendar/reminders.
- Assignments, grading and a teacher review workflow.
- Question bank, timed quizzes, model tests, written exams and results.
- Full notification inbox/delivery.
- Advanced student/teacher/admin analytics and audit-log viewer.
- Complete admin profile editor, full course CRUD and curriculum scheduling.
- Full bilingual dashboards and end-to-end browser/RLS testing.

## Safety and change rules

- Never reset, drop or replace the production database to reorganise the interface.
- Database changes must be additive, reviewed and applied as new migrations.
- Keep payment and role permissions enforced by server actions and RLS, not by hiding buttons.
- Do not show a menu item as available until the workflow exists.
- Do not label a feature complete until it has been built and tested with the relevant user role.
- Preserve the current verified fees and admission rules unless the owner explicitly changes them.

## Reference features

ACS Future School's public pages currently present course categories, live classes, exams, materials, community, recorded classes, slides, PDFs, daily/weekly quizzes, model tests and course syllabi. These are feature references for the roadmap; Sanjay Kumar Chemistry will implement only the pieces that fit its own courses and teaching workflow.

References:
- https://acsfutureschool.com/
- https://acsfutureschool.com/courses
- https://www.acsfutureschool.com/frb/3c2913ca-d4a6-44c3-8018-a859d1f7be90
- https://www.acsfutureschool.com/master-plan
