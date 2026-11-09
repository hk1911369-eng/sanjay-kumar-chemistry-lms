-- Reapply the notebook write guard with server-time-bounded review timestamps.
create or replace function public.guard_lab_notebook_entry_write()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare v_role public.app_role := public.current_role();
begin
 if tg_op = 'INSERT' then
  if auth.uid() is null or v_role is distinct from 'student'::public.app_role or new.student_id is distinct from auth.uid()
   or new.status <> 'draft' or new.submitted_at is not null or new.reviewed_by is not null or new.reviewed_at is not null
   or new.score is not null or new.teacher_feedback is not null then
   raise exception 'A student may create only their own draft notebook' using errcode = '42501';
  end if;
  return new;
 end if;
 if v_role = 'student'::public.app_role then
  if old.student_id is distinct from auth.uid() or old.status not in ('draft','returned')
   or new.student_id is distinct from old.student_id or new.course_id is distinct from old.course_id
   or new.lab_id is distinct from old.lab_id or new.created_at is distinct from old.created_at
   or (new.status = 'draft' and (new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at
      or new.score is distinct from old.score or new.teacher_feedback is distinct from old.teacher_feedback
      or new.submitted_at is distinct from old.submitted_at))
   or (new.status = 'submitted' and (new.reviewed_by is not null or new.reviewed_at is not null or new.score is not null or new.teacher_feedback is not null))
   or new.status not in ('draft','submitted') or (new.status = 'submitted' and length(btrim(new.observations)) = 0) then
   raise exception 'Notebook is not editable or submission fields are invalid' using errcode = '42501';
  end if;
  if new.status = 'submitted' then new.submitted_at := now(); end if;
  new.updated_at := now(); return new;
 end if;
 if v_role = 'admin'::public.app_role or (v_role in ('teacher'::public.app_role,'staff'::public.app_role)
   and exists (select 1 from public.course_assignments ca where ca.course_id = old.course_id and ca.teacher_id = auth.uid())) then
  if old.status <> 'submitted' or new.student_id is distinct from old.student_id or new.course_id is distinct from old.course_id
   or new.lab_id is distinct from old.lab_id or new.title is distinct from old.title
   or new.hypothesis is distinct from old.hypothesis or new.procedure_notes is distinct from old.procedure_notes
   or new.observations is distinct from old.observations or new.measurements is distinct from old.measurements
   or new.conclusion is distinct from old.conclusion or new.submitted_at is distinct from old.submitted_at
   or new.created_at is distinct from old.created_at or new.status not in ('returned','reviewed')
   or new.reviewed_by is distinct from auth.uid() or new.reviewed_at is null
   or new.reviewed_at < now() - interval '30 seconds' or new.reviewed_at > now() + interval '30 seconds'
   or new.teacher_feedback is null or length(new.teacher_feedback) > 4000
   or (new.status = 'returned' and new.score is not null)
   or (new.status = 'reviewed' and (new.score is null or new.score < 0 or new.score > 100)) then
   raise exception 'Invalid lab notebook review' using errcode = '42501';
  end if;
  new.updated_at := now(); return new;
 end if;
 raise exception 'Not authorized to edit this lab notebook' using errcode = '42501';
end; $function$;
