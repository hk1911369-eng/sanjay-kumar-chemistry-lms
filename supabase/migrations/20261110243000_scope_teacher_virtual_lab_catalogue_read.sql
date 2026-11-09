-- Give assigned teaching staff read-only access to published experiments mapped to their courses.
-- Keep admin catalogue writes separate and ensure one consolidated SELECT policy per role.

drop policy if exists "admins manage virtual lab catalogue" on public.virtual_lab_catalog;
drop policy if exists "paid students read mapped virtual lab catalogue" on public.virtual_lab_catalog;

create policy "virtual lab catalogue scoped read"
on public.virtual_lab_catalog for select to authenticated
using (
  (select public.current_role()) = 'admin'::public.app_role
  or (
    (select public.current_role()) = 'student'::public.app_role
    and is_published is true
    and exists (
      select 1
      from public.course_subjects cs
      join public.enrollments e on e.course_id = cs.course_id
      join public.courses c on c.id = e.course_id
      where cs.subject_id = virtual_lab_catalog.subject_id
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
    (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
    and is_published is true
    and exists (
      select 1
      from public.course_subjects cs
      join public.course_assignments ca on ca.course_id = cs.course_id
      where cs.subject_id = virtual_lab_catalog.subject_id
        and ca.teacher_id = (select auth.uid())
    )
  )
);

create policy "admins insert virtual lab catalogue"
on public.virtual_lab_catalog for insert to authenticated
with check ((select public.current_role()) = 'admin'::public.app_role);

create policy "admins update virtual lab catalogue"
on public.virtual_lab_catalog for update to authenticated
using ((select public.current_role()) = 'admin'::public.app_role)
with check ((select public.current_role()) = 'admin'::public.app_role);

create policy "admins delete virtual lab catalogue"
on public.virtual_lab_catalog for delete to authenticated
using ((select public.current_role()) = 'admin'::public.app_role);

grant select, insert, update, delete on public.virtual_lab_catalog to authenticated;
