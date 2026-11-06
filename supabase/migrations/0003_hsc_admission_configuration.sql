-- Business configuration: HSC 2027, HSC 2028, and Admission only.
-- No SSC products are seeded.
insert into public.courses (title, slug, level, description, price_bdt, is_published)
values
 ('HSC 2027 Chemistry', 'hsc-2027-chemistry', 'HSC', 'Dedicated Chemistry batch for HSC 2027 students.', 700, false),
 ('HSC 2028 Chemistry', 'hsc-2028-chemistry', 'HSC', 'Dedicated Chemistry batch for HSC 2028 students.', 700, false),
 ('Admission Chemistry', 'admission-chemistry', 'ADMISSION', 'Separate Chemistry batch for university admission preparation.', 700, false)
on conflict (slug) do update set price_bdt = excluded.price_bdt;

-- Private merchant receiving instructions. Keep out of public landing-page content.
create table if not exists public.private_payment_settings (
  provider public.payment_provider primary key,
  receiving_number text not null,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.private_payment_settings enable row level security;
create policy "signed in students and staff can view payment instructions"
  on public.private_payment_settings for select
  to authenticated
  using (auth.uid() is not null);
create policy "admins manage private payment settings"
  on public.private_payment_settings for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

insert into public.private_payment_settings(provider, receiving_number)
values ('bkash',''),('nagad',''),('rocket','')
on conflict (provider) do update set receiving_number = excluded.receiving_number, updated_at = now();

-- Only an admin can approve/reject manual payment claims. Teachers/staff can view the queue
-- if authorized by their app UI, but cannot change the decision at database level.
drop policy if exists "staff reviews manual payment submissions" on public.manual_payment_submissions;
create policy "admins review manual payment submissions"
  on public.manual_payment_submissions for update
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Existing staff-read policy from migration 0002 remains in place.
