-- 0049: require the student role for student-owned learning submissions.
-- This aligns production with the already-tested test database policies.

alter policy "students submit own assignments"
on public.assignment_submissions
to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and exists (
    select 1
    from public.assignments x
    join public.enrollments e on e.course_id = x.course_id
    where x.id = assignment_submissions.assignment_id
      and x.published
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        (date_trunc('month', now() at time zone 'Asia/Dhaka')::date
          + interval '1 month - 1 day')::date
      )
  )
);

alter policy "students update own ungraded submissions"
on public.assignment_submissions
to authenticated
using (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and marks is null
)
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and marks is null
);

alter policy "students submit own course applications"
on public.course_applications
to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and status = 'submitted'
  and reviewed_by is null
  and reviewed_at is null
  and exists (
    select 1 from public.courses c
    where c.id = course_applications.course_id
      and c.is_published
      and c.enrollment_open
      and c.archived_at is null
      and course_applications.delivery_mode = any(c.delivery_modes)
  )
);

alter policy "students manage own lesson bookmarks"
on public.lesson_bookmarks
to authenticated
using (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
)
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_bookmarks.lesson_id
      and l.is_published
      and e.student_id = (select auth.uid())
      and e.status = 'active'
  )
);

alter policy "students manage own enrolled lesson progress"
on public.lesson_progress
to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id
      and l.is_published
      and e.student_id = (select auth.uid())
      and e.status = 'active'
  )
);

alter policy "students update own enrolled lesson progress"
on public.lesson_progress
to authenticated
using (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id
      and l.is_published
      and e.student_id = (select auth.uid())
      and e.status = 'active'
  )
)
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and exists (
    select 1
    from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_progress.lesson_id
      and l.is_published
      and e.student_id = (select auth.uid())
      and e.status = 'active'
  )
);

alter policy "student submits own manual payment"
on public.manual_payment_submissions
to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and status = 'pending_review'::public.manual_payment_review_status
  and reviewed_by is null
  and reviewed_at is null
  and admin_note is null
);

alter policy "students create own quiz attempts"
on public.quiz_attempts
to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and submitted_at is null
  and score is null
  and exists (
    select 1
    from public.quizzes q
    join public.enrollments e on e.course_id = q.course_id
    where q.id = quiz_attempts.quiz_id
      and q.published
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        (date_trunc('month', now() at time zone 'Asia/Dhaka')::date
          + interval '1 month - 1 day')::date
      )
  )
);

alter policy "students submit written exams"
on public.written_exam_submissions
to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and score is null
  and graded_by is null
  and graded_at is null
  and exists (
    select 1
    from public.written_exams x
    join public.enrollments e on e.course_id = x.course_id
    where x.id = written_exam_submissions.exam_id
      and x.published
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and e.admission_fee_paid is true
      and e.paid_through >= (
        (date_trunc('month', now() at time zone 'Asia/Dhaka')::date
          + interval '1 month - 1 day')::date
      )
      and (x.starts_at is null or now() >= x.starts_at)
      and (x.ends_at is null or now() <= x.ends_at)
  )
);
