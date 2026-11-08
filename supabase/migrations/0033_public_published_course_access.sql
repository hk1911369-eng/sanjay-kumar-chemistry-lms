-- 0033: allow anonymous visitors to read only published courses and their public teacher names.

grant select on public.courses to anon;

drop policy if exists "public can read published courses" on public.courses;
create policy "public can read published courses"
on public.courses
for select
to anon
using (is_published is true and archived_at is null);

create or replace function public.get_public_course_teachers(p_course_id uuid)
returns table(id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
as $function$
  select p.id, p.full_name
  from public.courses c
  join public.course_assignments a on a.course_id = c.id
  join public.profiles p on p.id = a.teacher_id
  where c.id = p_course_id
    and c.is_published is true
    and c.archived_at is null
    and p.role::text in ('teacher','staff')
  order by p.full_name;
$function$;

revoke all on function public.get_public_course_teachers(uuid) from public;
grant execute on function public.get_public_course_teachers(uuid) to anon, authenticated;
