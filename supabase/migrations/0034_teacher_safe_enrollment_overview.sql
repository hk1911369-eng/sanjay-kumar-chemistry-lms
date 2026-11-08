-- 0034: students see only their own enrollment rows; teachers use a safe assigned-course overview.
-- Payment fields remain available to the student who owns the row and to admins, never teachers.

drop policy if exists "assigned staff read enrolled students" on public.enrollments;
drop policy if exists "student own enrollments" on public.enrollments;

create policy "students read own enrollments"
on public.enrollments
for select
to authenticated
using (student_id = (select auth.uid()));

create or replace function public.get_assigned_student_enrollments(p_student_ids uuid[] default null)
returns table(
  id uuid,
  student_id uuid,
  course_id uuid,
  status text,
  starts_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or coalesce(public.current_role()::text, '') not in ('teacher','staff') then
    raise exception 'Assigned teacher login required' using errcode = '42501';
  end if;

  return query
    select e.id, e.student_id, e.course_id, e.status, e.starts_at
    from public.enrollments e
    join public.course_assignments a
      on a.course_id = e.course_id
     and a.teacher_id = auth.uid()
    where p_student_ids is null or e.student_id = any(p_student_ids);
end;
$function$;

revoke all on function public.get_assigned_student_enrollments(uuid[]) from public, anon;
grant execute on function public.get_assigned_student_enrollments(uuid[]) to authenticated;
