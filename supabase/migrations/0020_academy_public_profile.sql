-- 0020: editable public JMT Academy contact and offline-location profile.
-- The singleton row contains only information the academy chooses to publish.

create table if not exists public.academy_settings (
  id integer primary key default 1 check (id = 1),
  academy_name text not null default 'JMT Academy',
  tagline text not null default 'Online & Offline Learning',
  contact_phone text,
  whatsapp_phone text,
  contact_email text,
  physical_address text,
  google_maps_url text,
  support_hours text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.academy_settings(id)
values (1)
on conflict (id) do nothing;

alter table public.academy_settings enable row level security;
revoke all on table public.academy_settings from anon, authenticated;
grant select on table public.academy_settings to anon, authenticated;
grant insert, update on table public.academy_settings to authenticated;

drop policy if exists "public can read academy contact profile" on public.academy_settings;
create policy "public can read academy contact profile"
  on public.academy_settings for select to anon, authenticated
  using (true);

drop policy if exists "admins create academy contact profile" on public.academy_settings;
create policy "admins create academy contact profile"
  on public.academy_settings for insert to authenticated
  with check (
    (select public.current_role()) = 'admin'
    and updated_by = (select auth.uid())
  );

drop policy if exists "admins update academy contact profile" on public.academy_settings;
create policy "admins update academy contact profile"
  on public.academy_settings for update to authenticated
  using ((select public.current_role()) = 'admin')
  with check (
    (select public.current_role()) = 'admin'
    and updated_by = (select auth.uid())
  );
