-- 0049: enforce the student role on student-only submission workflows.
-- RLS still scopes every row to the authenticated user and active enrollment.

drop policy if exists "students submit own assignments" on public.assignment_submissions;
create policy "students submit own assignments"
on public.assignment_submissions for insert to authenticated
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

drop policy if exists "students update own ungraded submissions" on public.assignment_submissions;
create policy "students update own ungraded submissions"
on public.assignment_submissions for update to authenticated
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

drop policy if exists "students submit own course applications" on public.course_applications;
create policy "students submit own course applications"
on public.course_applications for insert to authenticated
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

drop policy if exists "students manage own lesson bookmarks" on public.lesson_bookmarks;
create policy "students manage own lesson bookmarks"
on public.lesson_bookmarks for all to authenticated
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

drop policy if exists "students manage own enrolled lesson progress" on public.lesson_progress;
create policy "students manage own enrolled lesson progress"
on public.lesson_progress for insert to authenticated
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

drop policy if exists "students update own enrolled lesson progress" on public.lesson_progress;
create policy "students update own enrolled lesson progress"
on public.lesson_progress for update to authenticated
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

drop policy if exists "student submits own manual payment" on public.manual_payment_submissions;
create policy "student submits own manual payment"
on public.manual_payment_submissions for insert to authenticated
with check (
  (select public.current_role()) = 'student'::public.app_role
  and student_id = (select auth.uid())
  and status = 'pending_review'
  and reviewed_by is null
  and reviewed_at is null
  and admin_note is null
);

drop policy if exists "students create own quiz attempts" on public.quiz_attempts;
create policy "students create own quiz attempts"
on public.quiz_attempts for insert to authenticated
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

drop policy if exists "students submit written exams" on public.written_exam_submissions;
create policy "students submit written exams"
on public.written_exam_submissions for insert to authenticated
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
