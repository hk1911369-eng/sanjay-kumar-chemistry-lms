-- Consolidate permissive notebook policies and index all referencing foreign keys.
drop policy if exists "students read own lab notebooks" on public.lab_notebook_entries;
drop policy if exists "assigned teachers read lab notebooks" on public.lab_notebook_entries;
create policy "notebook entries scoped read"
on public.lab_notebook_entries for select to authenticated
using (
  (student_id = (select auth.uid()) and (select public.current_role()) = 'student'::public.app_role)
  or (
    (select public.current_role()) = 'admin'::public.app_role
    or (
      (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
      and exists (
        select 1 from public.course_assignments ca
        where ca.course_id = lab_notebook_entries.course_id
          and ca.teacher_id = (select auth.uid())
      )
    )
  )
);

drop policy if exists "students update own editable lab notebooks" on public.lab_notebook_entries;
drop policy if exists "assigned teachers review submitted lab notebooks" on public.lab_notebook_entries;
create policy "notebook entries scoped update"
on public.lab_notebook_entries for update to authenticated
using (
  (
    (select public.current_role()) = 'student'::public.app_role
    and student_id = (select auth.uid())
    and status in ('draft','returned')
  )
  or (
    status = 'submitted'
    and (
      (select public.current_role()) = 'admin'::public.app_role
      or (
        (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
        and exists (
          select 1 from public.course_assignments ca
          where ca.course_id = lab_notebook_entries.course_id
            and ca.teacher_id = (select auth.uid())
        )
      )
    )
  )
)
with check (
  (
    (select public.current_role()) = 'student'::public.app_role
    and student_id = (select auth.uid())
    and status in ('draft','submitted')
    and (status <> 'submitted' or submitted_at is not null)
    and reviewed_by is null and reviewed_at is null and score is null and teacher_feedback is null
    and exists (
      select 1
      from public.virtual_lab_catalog vl
      join public.course_subjects cs on cs.subject_id = vl.subject_id
      join public.enrollments e on e.course_id = cs.course_id
      join public.courses c on c.id = e.course_id
      where vl.id = lab_notebook_entries.lab_id
        and vl.is_published is true
        and cs.course_id = lab_notebook_entries.course_id
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
  or (
    status in ('returned','reviewed')
    and reviewed_by = (select auth.uid())
    and reviewed_at is not null
    and teacher_feedback is not null
    and (
      (select public.current_role()) = 'admin'::public.app_role
      or (
        (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
        and exists (
          select 1 from public.course_assignments ca
          where ca.course_id = lab_notebook_entries.course_id
            and ca.teacher_id = (select auth.uid())
        )
      )
    )
  )
);

create index if not exists lab_notebook_lab_id_idx on public.lab_notebook_entries(lab_id);
create index if not exists lab_notebook_reviewed_by_idx on public.lab_notebook_entries(reviewed_by);
