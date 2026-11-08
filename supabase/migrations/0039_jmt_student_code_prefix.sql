-- 0039: use JMT branding for student IDs issued to new students.
-- Existing student IDs are preserved for audit/history compatibility.
create or replace function public.assign_student_code()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.role = 'student' and coalesce(trim(new.student_code), '') = '' then
    new.student_code := 'JMT-' || to_char(coalesce(new.admission_date, current_date), 'YYYY') || '-' ||
      lpad(nextval('public.student_code_seq')::text, 6, '0');
  end if;
  if new.role = 'student' and new.admission_date is null then
    new.admission_date := current_date;
  end if;
  return new;
end;
$$;
