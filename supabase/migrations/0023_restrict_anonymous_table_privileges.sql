-- 0023: remove unnecessary anonymous table privileges.
-- Anonymous visitors need read-only access to the public academy profile and published notices.
-- All other public-schema table access remains authenticated and protected by RLS.
revoke all privileges on all tables in schema public from anon;
grant select on table public.academy_settings, public.notices to anon;

comment on table public.academy_settings is
  'Public academy contact/profile settings; sensitive payment configuration is stored separately.';
