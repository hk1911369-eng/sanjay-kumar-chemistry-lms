-- 0028: scope discussion reactions to the same course access as discussions.
-- Prevent authenticated users outside a course from enumerating or reacting to its discussions.
drop policy if exists "course members read discussion reactions" on public.lesson_discussion_reactions;
drop policy if exists "users add own discussion reactions" on public.lesson_discussion_reactions;

create policy "course members read discussion reactions"
on public.lesson_discussion_reactions for select to authenticated
using (
  exists (
    select 1
    from public.lesson_discussions d
    join public.lessons l on l.id = d.lesson_id and l.course_id = d.course_id
    where d.id = lesson_discussion_reactions.discussion_id
      and (
        (select public.current_role()) = 'admin'
        or (
          (select public.current_role())::text in ('teacher','staff')
          and exists (
            select 1 from public.course_assignments a
            where a.course_id = d.course_id and a.teacher_id = (select auth.uid())
          )
        )
        or (
          l.is_published
          and exists (
            select 1 from public.enrollments e
            where e.course_id = d.course_id
              and e.student_id = (select auth.uid())
              and e.status = 'active'
              and e.admission_fee_paid = true
              and e.paid_through >= (
                (date_trunc('month', now() at time zone 'Asia/Dhaka')::date
                  + interval '1 month - 1 day')::date
              )
          )
        )
      )
  )
);

create policy "course members add own discussion reactions"
on public.lesson_discussion_reactions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.lesson_discussions d
    join public.lessons l on l.id = d.lesson_id and l.course_id = d.course_id
    where d.id = lesson_discussion_reactions.discussion_id
      and (
        (select public.current_role()) = 'admin'
        or (
          (select public.current_role())::text in ('teacher','staff')
          and exists (
            select 1 from public.course_assignments a
            where a.course_id = d.course_id and a.teacher_id = (select auth.uid())
          )
        )
        or (
          l.is_published
          and exists (
            select 1 from public.enrollments e
            where e.course_id = d.course_id
              and e.student_id = (select auth.uid())
              and e.status = 'active'
              and e.admission_fee_paid = true
              and e.paid_through >= (
                (date_trunc('month', now() at time zone 'Asia/Dhaka')::date
                  + interval '1 month - 1 day')::date
              )
          )
        )
      )
  )
);
