-- 0047: align the profile activation flag across production and test databases.
-- Existing accounts remain active by default; no profile rows are rewritten.
alter table public.profiles
  add column if not exists is_active boolean not null default true;
