-- 0035: add the official public Facebook page to the academy profile.
alter table public.academy_settings
  add column if not exists facebook_url text;
