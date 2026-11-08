-- 0027: cache auth identity and role helper calls once per statement in RLS policies.
-- This preserves every policy predicate; only stable caller-context function calls are wrapped in scalar SELECTs.
do $migration$
declare
  p record;
  new_qual text;
  new_check text;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~* 'auth\.uid\(\)|"current_role"\(\)|current_role\(\)|is_staff\(\)'
        or coalesce(with_check, '') ~* 'auth\.uid\(\)|"current_role"\(\)|current_role\(\)|is_staff\(\)'
      )
  loop
    new_qual := p.qual;
    new_check := p.with_check;

    if new_qual is not null then
      new_qual := regexp_replace(new_qual, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
      new_qual := regexp_replace(new_qual, '"current_role"\(\)', '(select public.current_role())', 'gi');
      new_qual := regexp_replace(new_qual, '(^|[^.[:alnum:]_])current_role\(\)', '\1(select public.current_role())', 'gi');
      new_qual := regexp_replace(new_qual, '(^|[^.[:alnum:]_])is_staff\(\)', '\1(select public.is_staff())', 'gi');
    end if;

    if new_check is not null then
      new_check := regexp_replace(new_check, 'auth\.uid\(\)', '(select auth.uid())', 'gi');
      new_check := regexp_replace(new_check, '"current_role"\(\)', '(select public.current_role())', 'gi');
      new_check := regexp_replace(new_check, '(^|[^.[:alnum:]_])current_role\(\)', '\1(select public.current_role())', 'gi');
      new_check := regexp_replace(new_check, '(^|[^.[:alnum:]_])is_staff\(\)', '\1(select public.is_staff())', 'gi');
    end if;

    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if p.cmd in ('SELECT', 'UPDATE', 'DELETE', 'ALL') and new_qual is not null then
      stmt := stmt || format(' using (%s)', new_qual);
    end if;
    if p.cmd in ('INSERT', 'UPDATE', 'ALL') and new_check is not null then
      stmt := stmt || format(' with check (%s)', new_check);
    end if;
    execute stmt;
  end loop;
end
$migration$;
