-- Keep student assignment delivery current and prevent duplicate notebooks for one assignment.
drop policy if exists "practical assignments scoped read" on public.lab_practical_assignments;
create policy "practical assignments scoped read"
on public.lab_practical_assignments for select to authenticated
using (
  (select public.current_role()) = 'admin'::public.app_role
  or (
    (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
    and exists (
      select 1 from public.course_assignments ca
      where ca.course_id = lab_practical_assignments.course_id
        and ca.teacher_id = (select auth.uid())
    )
  )
  or (
    (select public.current_role()) = 'student'::public.app_role
    and status = 'published'
    and exists (
      select 1
      from public.virtual_lab_catalog vl
      join public.course_subjects cs on cs.subject_id = vl.subject_id
      join public.enrollments e on e.course_id = cs.course_id
      join public.courses c on c.id = e.course_id
      where vl.id = lab_practical_assignments.lab_id
        and vl.is_published is true
        and cs.course_id = lab_practical_assignments.course_id
        and e.student_id = (select auth.uid())
        and e.status = 'active'
        and e.admission_fee_paid is true
        and e.paid_through >= (
          date_trunc('month', now() at time zone 'Asia/Dhaka')::date
          + interval '1 month - 1 day'
        )::date
        and c.archived_at is null
    )
  )
);

create unique index if not exists lab_notebook_one_per_student_assignment_idx
  on public.lab_notebook_entries(student_id, assignment_id)
  where assignment_id is not null;
