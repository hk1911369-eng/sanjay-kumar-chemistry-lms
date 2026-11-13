-- Keep assigned teachers' profile access aligned with the payment onboarding state.
-- Approved payments create/activate an enrollment; rejected historical submissions
-- must not grant ongoing access to a student's private profile.
create or replace function public.can_staff_access_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select auth.uid() is not null
    and public.current_role()::text in ('teacher','staff')
    and (
      exists (
        select 1
        from public.enrollments e
        join public.course_assignments a on a.course_id = e.course_id
        where e.student_id = p_student_id
          and a.teacher_id = auth.uid()
      )
      or exists (
        select 1
        from public.manual_payment_submissions m
        join public.course_assignments a on a.course_id = m.course_id
        where m.student_id = p_student_id
          and a.teacher_id = auth.uid()
          and m.status = 'pending_review'
      )
    );
$function$;
