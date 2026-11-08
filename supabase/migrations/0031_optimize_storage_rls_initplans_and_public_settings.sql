-- 0031: optimize Storage policy role lookups and scope public academy settings to its singleton row.
-- The role helper remains evaluated once per statement instead of once per storage row.

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
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') like '%"current_role"()%'
        or coalesce(with_check, '') like '%"current_role"()%'
      )
  loop
    new_qual := p.qual;
    new_check := p.with_check;

    if new_qual is not null then
      new_qual := replace(new_qual, '"current_role"()', '(select public.current_role())');
    end if;
    if new_check is not null then
      new_check := replace(new_check, '"current_role"()', '(select public.current_role())');
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

-- academy_settings is a singleton row (id = 1); keep public read access scoped to that row.
alter policy "public can read academy contact profile"
on public.academy_settings
using (id = 1);
