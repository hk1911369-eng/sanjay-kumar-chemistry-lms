-- Pinning is a moderation privilege, not an author-edit privilege.
-- Move it behind a narrowly scoped RPC and remove direct column writes.

revoke update (is_pinned) on table public.lesson_discussions from authenticated;

create or replace function public.set_lesson_discussion_pin(
  p_discussion_id uuid,
  p_course_id uuid,
  p_is_pinned boolean
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role public.app_role := public.current_role();
begin
  if v_user_id is null or v_role not in ('admin'::public.app_role, 'teacher'::public.app_role, 'staff'::public.app_role) then
    raise exception 'Not authorized to moderate lesson discussions'
      using errcode = '42501';
  end if;

  if v_role <> 'admin'::public.app_role
     and not exists (
       select 1 from public.course_assignments a
       where a.course_id = p_course_id
         and a.teacher_id = v_user_id
     ) then
    raise exception 'Not assigned to this course'
      using errcode = '42501';
  end if;

  update public.lesson_discussions
  set is_pinned = p_is_pinned
  where id = p_discussion_id
    and course_id = p_course_id;

  return found;
end;
$function$;

revoke all on function public.set_lesson_discussion_pin(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_lesson_discussion_pin(uuid, uuid, boolean) to authenticated;
