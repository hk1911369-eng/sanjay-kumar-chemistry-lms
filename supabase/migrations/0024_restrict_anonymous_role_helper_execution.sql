-- 0024: keep role-inspection helpers unavailable to anonymous API callers.
-- Split the notices policy so anonymous readers need no SECURITY DEFINER helper.
drop policy if exists "published notices visible" on public.notices;
create policy "anonymous read published notices"
on public.notices for select to anon
using (published_at is not null);
create policy "authenticated read published notices and staff"
on public.notices for select to authenticated
using (published_at is not null or public.is_staff());

revoke all privileges on function public.current_role() from public, anon;
grant execute on function public.current_role() to authenticated, service_role;

revoke all privileges on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;
