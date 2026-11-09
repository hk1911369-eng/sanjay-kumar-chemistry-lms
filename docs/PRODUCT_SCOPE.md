# JMT Academy — Product Scope

## Product identity

JMT Academy is a complete, multi-subject education platform and academy operating system. It is **not a Chemistry-only website**. Chemistry is one subject department among all subjects the academy chooses to offer.

The original repository name and Chemistry-specific learning examples do not limit the platform's product scope. Chemistry-focused tools (for example chemical equations, periodic table and reaction practice) are optional subject-specific modules inside a shared platform.

## Target programmes

The initial academy cohorts are:

- HSC 2027
- HSC 2028
- Admission Batch

The programme label is data-driven and must remain extensible. Administrators can add future cohorts, admission tracks, school levels, university programmes, vocational programmes or other offerings without a schema rewrite.

## Subject catalogue

The subject catalogue is dynamic and administrator-managed. Initial examples include:

- Physics
- Chemistry
- Biology
- Mathematics
- Higher Mathematics
- English
- Bangla
- ICT

The platform must also accommodate humanities, business studies and future subjects (for example Accounting, Finance, Economics, History, Geography, Civics and other curriculum subjects). This list is illustrative, not a hard-coded limit. Adding a subject must not require a new route, table, deployment or code branch.

Each course can contain one or more subjects. Subjects, chapters, lessons, concepts, question banks, assessments, teacher assignments, progress and analytics must remain subject-aware while using shared workflows.

## Learning formats

Every course can enable one or more of these formats:

1. **Live + recorded:** scheduled teacher-led live classes plus recordings and learning materials.
2. **Recorded-only:** self-paced recorded lessons and resources.
3. **Offline academy:** in-person classes, attendance and teacher support. Active offline learners also receive the course's recorded materials for missed-class make-up, according to the academy's entitlement rules.

The format, schedule, fees and enrolment status are configured per course by administrators.

## Platform roles and workflows

- **Public visitors:** discover programmes, subjects, teachers, schedules, formats and fees; apply or register.
- **Students:** enrol, pay, attend/watch lessons, access resources, practise, take exams, submit written work, track progress and receive notices.
- **Teachers/staff:** work only within assigned courses; teach, upload lessons, manage assessments, grade, mark attendance and support assigned students.
- **Administrators:** manage the subject catalogue, cohorts, courses, teachers, students, admissions, fees, payments, finance, notices, reports and platform configuration.

## Core platform capabilities

The shared platform must support:

- Course catalogue and course studio with multi-subject mapping.
- Course applications, admission and enrolment lifecycle.
- bKash, Nagad and Rocket manual payment submission and admin verification.
- Admission fees, monthly fees, due dates, grace periods and access expiry.
- Live classes, recordings, video progress, PDFs, slides and downloadable resources.
- Quizzes, model tests, question banks, written exams and grading.
- Assignments, discussions, doubt-solving and teacher feedback.
- Online and offline attendance, guardian communication and progress reports.
- Student, teacher and administrator dashboards.
- Bangla and English interface/content support.
- Responsive Android/mobile, tablet and desktop experience.
- Secure role-based access, RLS, private storage, audit logs, backups and tested recovery.
- Evidence-based learning analytics, mastery, spaced revision and recommendations.

## Subject-specific extensions

Subject-specific tools may be added without changing the shared LMS lifecycle. Chemistry may have equation rendering, a periodic table, molecular structures and reaction practice; Physics may have formula and simulation tools; Mathematics may have symbolic notation and problem practice; Bangla and English may have reading, writing and grammar tools. These extensions must not make any subject a second-class citizen or impose a Chemistry dependency on common screens.

## Data and architecture rules

- Subject and programme names are catalogue data, not hard-coded application enums.
- Course-to-subject relationships are many-to-many.
- Lessons, concepts, questions, exams and learning analytics can be linked to a subject.
- New subjects and cohorts are created through administrator workflows.
- Existing course history, payments and student progress must not be silently rewritten when catalogue labels or prices change.
- All access remains scoped by role, assigned course and valid enrolment/payment entitlement.
- Demo/test catalogue records remain unpublished and must never be inserted into production as part of a deployment.

## Release acceptance

The platform is not considered complete merely because Chemistry works. Acceptance requires representative workflows to work for multiple subjects, including Bangla and English, across HSC 2027, HSC 2028 and Admission Batch, and across live+recorded, recorded-only and offline formats. Tests must prove that subject selection, teacher assignment, lesson access, assessment, progress and reporting are generic rather than Chemistry-specific.
