-- 0045: return the complete student register in one admin-checked, paginatable query.
-- SECURITY INVOKER preserves the caller's RLS context; no service-role access is used.

create or replace function public.get_student_register_export()
returns table (
  student_id uuid,
  student_code text,
  full_name text,
  phone text,
  guardian_name text,
  guardian_phone text,
  college_name text,
  location text,
  admission_date date,
  course_title text,
  programme_group text,
  enrollment_status text,
  admission_fee_paid boolean,
  paid_through date,
  latest_approved_payment_bdt numeric,
  latest_payment_date timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null or (select public.current_role())::text <> 'admin' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return query
  select
    s.id,
    s.student_code,
    s.full_name,
    s.phone,
    s.guardian_name,
    s.guardian_phone,
    s.college_name,
    s.location,
    s.admission_date,
    c.title,
    c.programme_group,
    e.status,
    e.admission_fee_paid,
    e.paid_through,
    p.amount_bdt::numeric,
    p.created_at
  from public.profiles s
  left join public.enrollments e on e.student_id = s.id
  left join public.courses c on c.id = e.course_id
  left join lateral (
    select m.amount_bdt, m.created_at
    from public.manual_payment_submissions m
    where m.student_id = s.id
      and m.course_id = e.course_id
      and m.status::text = 'approved'
    order by m.created_at desc
    limit 1
  ) p on true
  where s.role::text = 'student'
  order by s.created_at desc, c.title nulls last;
end;
$$;

revoke all on function public.get_student_register_export() from public, anon;
grant execute on function public.get_student_register_export() to authenticated;
