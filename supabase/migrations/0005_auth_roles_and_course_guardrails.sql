-- Authentication milestone: public registration is always student-only.
-- Role grants must be performed by trusted server-side administration, never user metadata.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name, phone, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''),
    nullif(trim(new.raw_user_meta_data->>'phone'), ''),
    'student'
  );
  return new;
end;
$$;

-- The prior self-update policy's role comparison is not sufficient protection
-- against SECURITY DEFINER evaluation order. This trigger blocks self-promotion.
create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and new.role is distinct from old.role then
    raise exception 'Role changes require trusted administrator provisioning';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before update of role on public.profiles
for each row execute function public.prevent_self_role_change();

-- Restrict the catalogue to the three agreed Chemistry programmes and the fixed fee.
update public.courses set is_published = false where slug not in
  ('hsc-2027-chemistry','hsc-2028-chemistry','admission-chemistry');
-- Legacy unsupported rows remain unpublished to avoid breaking historical foreign keys.
update public.courses set price_bdt = 700
where slug in ('hsc-2027-chemistry','hsc-2028-chemistry','admission-chemistry');

create or replace function public.enforce_supported_chemistry_courses()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.slug not in ('hsc-2027-chemistry','hsc-2028-chemistry','admission-chemistry') then
    raise exception 'Only HSC 2027, HSC 2028 and Admission Chemistry are supported';
  end if;
  if new.price_bdt <> 700 then
    raise exception 'Each Chemistry course has a fixed one-time fee of BDT 700';
  end if;
  if (new.slug = 'admission-chemistry' and new.level <> 'ADMISSION')
     or (new.slug <> 'admission-chemistry' and new.level <> 'HSC') then
    raise exception 'Course level does not match the supported programme';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_supported_course_catalogue on public.courses;
create trigger enforce_supported_course_catalogue
before insert or update of slug, level, price_bdt on public.courses
for each row execute function public.enforce_supported_chemistry_courses();

-- Explicitly ensure new users never inherit privileged metadata values.
revoke all on function public.prevent_self_role_change() from public, anon, authenticated;

-- Teachers are academic staff, not payment or enrollment operators.
drop policy if exists "staff reads manual payment submissions" on public.manual_payment_submissions;
create policy "admins read all manual payment submissions"
  on public.manual_payment_submissions for select
  using (student_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "student own payment orders" on public.payment_orders;
create policy "students read own payment orders and admins read all"
  on public.payment_orders for select
  using (student_id = auth.uid() or public.current_role() = 'admin');

drop policy if exists "staff read payment events" on public.payment_events;
create policy "admins read payment events"
  on public.payment_events for select
  using (public.current_role() = 'admin');

drop policy if exists "staff manage enrollments" on public.enrollments;
create policy "admins manage enrollments"
  on public.enrollments for all
  using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');
