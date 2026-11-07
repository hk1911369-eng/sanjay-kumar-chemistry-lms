-- JMT Academy database update: migrations 0017 through 0020
-- Prerequisite: migrations 0001 through 0016 have already been applied.
-- Run this entire script once in the Supabase SQL Editor.
-- It is transactional: if any statement fails, the changes are rolled back.

begin;

-- ===== supabase/migrations/0017_finance_entries.sql =====
-- 0017: JMT Academy cash, bank, expense and refund ledger.
-- Additive only. Existing payment submissions and student records are preserved.

create table if not exists public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('cash_income','expense','refund')),
  category text not null check (char_length(trim(category)) between 2 and 80),
  description text not null check (char_length(trim(description)) between 2 and 500),
  amount_bdt integer not null check (amount_bdt > 0),
  payment_method text not null check (payment_method in ('cash','bank','bkash','nagad','rocket','other')),
  reference text check (reference is null or char_length(reference) <= 120),
  entry_date date not null default ((now() at time zone 'Asia/Dhaka')::date),
  course_id uuid references public.courses(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists finance_entries_date_idx
  on public.finance_entries(entry_date desc);
create index if not exists finance_entries_type_date_idx
  on public.finance_entries(entry_type, entry_date desc);
create index if not exists finance_entries_course_date_idx
  on public.finance_entries(course_id, entry_date desc);
create index if not exists finance_entries_student_date_idx
  on public.finance_entries(student_id, entry_date desc);

alter table public.finance_entries enable row level security;
revoke all on table public.finance_entries from anon, authenticated;
grant select, insert on table public.finance_entries to authenticated;

drop policy if exists "admins read finance entries" on public.finance_entries;
create policy "admins read finance entries"
  on public.finance_entries for select to authenticated
  using ((select public.current_role()) = 'admin');

drop policy if exists "admins create finance entries" on public.finance_entries;
create policy "admins create finance entries"
  on public.finance_entries for insert to authenticated
  with check (
    (select public.current_role()) = 'admin'
    and recorded_by = (select auth.uid())
  );

-- Financial entries are intentionally append-only. Correct mistakes with a
-- reversing refund/adjustment entry instead of silently editing the audit trail.

create or replace function public.audit_finance_entry_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values (
    new.recorded_by,
    'finance_entry_created',
    'finance_entry',
    new.id::text,
    jsonb_build_object(
      'entry_type', new.entry_type,
      'category', new.category,
      'amount_bdt', new.amount_bdt,
      'payment_method', new.payment_method,
      'entry_date', new.entry_date,
      'course_id', new.course_id,
      'student_id', new.student_id,
      'reference', new.reference
    )
  );
  return new;
end;
$$;
revoke all on function public.audit_finance_entry_insert() from public, anon, authenticated;
drop trigger if exists finance_entry_audit_insert on public.finance_entries;
create trigger finance_entry_audit_insert
after insert on public.finance_entries
for each row execute function public.audit_finance_entry_insert();

-- ===== supabase/migrations/0018_course_application_notifications.sql =====
-- 0018: notify students when their JMT Academy application is reviewed.
-- Notifications are written by a private trigger function; clients cannot call it.

create schema if not exists jmt_private;
revoke all on schema jmt_private from public, anon, authenticated;

create or replace function jmt_private.notify_course_application_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_body text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'accepted' then
    v_title := 'Course application accepted';
    v_body := 'Your application has been accepted. Your course access is not active yet; please follow the admission and payment instructions from JMT Academy.';
  elsif new.status = 'rejected' then
    v_title := 'Course application update';
    v_body := coalesce(nullif(trim(new.admin_note), ''), 'The academy could not accept this application. Please contact JMT Academy for more information.');
  elsif new.status = 'reviewing' then
    v_title := 'Application is being reviewed';
    v_body := 'JMT Academy has started reviewing your course application.';
  else
    v_title := 'Application status updated';
    v_body := 'Your course application status has been updated. Open your student dashboard for details.';
  end if;

  insert into public.notifications(recipient_id, category, title, body, href)
  values (new.student_id, 'system', v_title, v_body, '/student#courses');

  return new;
end;
$$;

revoke all on function jmt_private.notify_course_application_status() from public, anon, authenticated;
drop trigger if exists course_application_status_notification on public.course_applications;
create trigger course_application_status_notification
after update of status on public.course_applications
for each row
execute function jmt_private.notify_course_application_status();

-- ===== supabase/migrations/0019_mode_aware_enrolment_billing.sql =====
-- 0019: make enrolment and manual billing aware of the selected JMT learning format.
-- Existing enrollments and historic payment submissions remain valid with NULL mode;
-- new applications and payments store the chosen format and fee snapshots.

alter table public.enrollments
  add column if not exists delivery_mode text,
  add column if not exists monthly_fee_bdt integer,
  add column if not exists admission_fee_bdt integer;

alter table public.enrollments
  drop constraint if exists enrollments_delivery_mode_check,
  drop constraint if exists enrollments_monthly_fee_check,
  drop constraint if exists enrollments_admission_fee_check;
alter table public.enrollments
  add constraint enrollments_delivery_mode_check
    check (delivery_mode is null or delivery_mode in ('live_recorded','recorded_only','offline')),
  add constraint enrollments_monthly_fee_check
    check (monthly_fee_bdt is null or monthly_fee_bdt >= 0),
  add constraint enrollments_admission_fee_check
    check (admission_fee_bdt is null or admission_fee_bdt >= 0);

alter table public.manual_payment_submissions
  add column if not exists delivery_mode text,
  add column if not exists fee_monthly_bdt integer,
  add column if not exists fee_admission_bdt integer;

alter table public.manual_payment_submissions
  drop constraint if exists manual_payment_delivery_mode_check,
  drop constraint if exists manual_payment_fee_monthly_check,
  drop constraint if exists manual_payment_fee_admission_check;
alter table public.manual_payment_submissions
  add constraint manual_payment_delivery_mode_check
    check (delivery_mode is null or delivery_mode in ('live_recorded','recorded_only','offline')),
  add constraint manual_payment_fee_monthly_check
    check (fee_monthly_bdt is null or fee_monthly_bdt >= 0),
  add constraint manual_payment_fee_admission_check
    check (fee_admission_bdt is null or fee_admission_bdt >= 0);

create index if not exists enrollments_delivery_mode_idx
  on public.enrollments(delivery_mode, status);

create or replace function public.validate_manual_payment_submission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  course_row public.courses%rowtype;
  enrollment_row public.enrollments%rowtype;
  expected_monthly integer;
  expected_admission integer;
  wallet_enabled boolean;
  current_period date;
begin
  if auth.uid() is null or new.student_id <> auth.uid() then
    raise exception 'A student may submit payment only for their own account';
  end if;
  if new.status <> 'pending_review' or new.reviewed_by is not null
     or new.reviewed_at is not null or new.admin_note is not null then
    raise exception 'New payment submissions must be pending review';
  end if;
  if new.sender_phone is null or new.sender_phone !~ '^01[3-9][0-9]{8}$' then
    raise exception 'A valid Bangladesh sender mobile number is required';
  end if;

  select * into course_row from public.courses where id = new.course_id;
  if not found or not course_row.is_published then
    raise exception 'This course is not accepting payment';
  end if;
  current_period := date_trunc('month', now() at time zone 'Asia/Dhaka')::date;
  if new.billing_period <> current_period then
    raise exception 'Payment must be submitted for the current Bangladesh billing month';
  end if;

  if new.delivery_mode is not null then
    if new.delivery_mode not in ('live_recorded','recorded_only','offline')
       or not (new.delivery_mode = any(course_row.delivery_modes)) then
      raise exception 'Selected learning format is not available for this course';
    end if;

    expected_monthly := case new.delivery_mode
      when 'live_recorded' then course_row.live_price_bdt
      when 'recorded_only' then course_row.recorded_price_bdt
      when 'offline' then course_row.offline_price_bdt
      else null
    end;
    if expected_monthly is null then
      raise exception 'The academy has not configured a price for this learning format';
    end if;

    if new.payment_kind = 'initial' then
      if not course_row.enrollment_open then
        raise exception 'This course is not accepting new applications';
      end if;
      if exists (
        select 1 from public.enrollments e
        where e.student_id = new.student_id and e.course_id = new.course_id
          and e.admission_fee_paid = true
      ) then
        raise exception 'Admission has already been paid for this course';
      end if;
      if not exists (
        select 1 from public.course_applications a
        where a.student_id = new.student_id and a.course_id = new.course_id
          and a.delivery_mode = new.delivery_mode and a.status = 'accepted'
      ) then
        raise exception 'An accepted application for this learning format is required';
      end if;
      expected_admission := coalesce(course_row.admission_fee_bdt,0);
      if new.fee_monthly_bdt is distinct from expected_monthly
         or new.fee_admission_bdt is distinct from expected_admission
         or new.amount_bdt <> expected_monthly + expected_admission then
        raise exception 'Payment amount does not match the accepted course fee';
      end if;
    elsif new.payment_kind = 'monthly' then
      select * into enrollment_row from public.enrollments e
      where e.student_id = new.student_id and e.course_id = new.course_id
      for update;
      if not found or enrollment_row.status <> 'active' or not enrollment_row.admission_fee_paid then
        raise exception 'An active admitted enrollment is required for monthly tuition';
      end if;
      if enrollment_row.delivery_mode is distinct from new.delivery_mode then
        raise exception 'Payment learning format does not match the active enrollment';
      end if;
      expected_monthly := coalesce(enrollment_row.monthly_fee_bdt,expected_monthly);
      if new.fee_monthly_bdt is distinct from expected_monthly
         or coalesce(new.fee_admission_bdt,0) <> 0
         or new.amount_bdt <> expected_monthly then
        raise exception 'Monthly payment amount does not match the active course fee';
      end if;
      if enrollment_row.paid_through >= (current_period + interval '1 month - 1 day')::date then
        raise exception 'The current month is already paid';
      end if;
    else
      raise exception 'New payment must be an initial or monthly payment';
    end if;
  else
    -- Backward-compatible validation for existing accounts that have no recorded mode.
    if new.payment_kind = 'initial' then
      select * into enrollment_row from public.enrollments e
      where e.student_id = new.student_id and e.course_id = new.course_id;
      if found and enrollment_row.admission_fee_paid then
        raise exception 'Admission and first-month fees have already been paid';
      end if;
      if new.amount_bdt <> course_row.admission_fee_bdt + course_row.monthly_fee_bdt then
        raise exception 'Initial payment must include admission fee and first monthly fee';
      end if;
    elsif new.payment_kind = 'monthly' then
      select * into enrollment_row from public.enrollments e
      where e.student_id = new.student_id and e.course_id = new.course_id;
      if not found or enrollment_row.status <> 'active' or not enrollment_row.admission_fee_paid then
        raise exception 'Complete admission payment before monthly tuition';
      end if;
      if new.amount_bdt <> course_row.monthly_fee_bdt then
        raise exception 'Monthly payment amount does not match the course fee';
      end if;
      if enrollment_row.paid_through >= (current_period + interval '1 month - 1 day')::date then
        raise exception 'The current month is already paid';
      end if;
    else
      raise exception 'New payment must be an initial or monthly payment';
    end if;
  end if;

  select is_enabled into wallet_enabled
  from public.private_payment_settings where provider = new.provider;
  if coalesce(wallet_enabled, false) is not true then
    raise exception 'This payment method is currently unavailable';
  end if;
  new.transaction_id := upper(trim(new.transaction_id));
  return new;
end;
$$;
revoke all on function public.validate_manual_payment_submission() from public, anon, authenticated;

create or replace function public.approve_manual_payment_submission(p_submission_id uuid, p_admin_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_row public.manual_payment_submissions%rowtype;
  course_row public.courses%rowtype;
  enrollment_row public.enrollments%rowtype;
  period_end date;
  monthly_snapshot integer;
  admission_snapshot integer;
begin
  if auth.uid() is null or public.current_role() <> 'admin' then
    raise exception 'Only an admin can approve payments';
  end if;
  select * into payment_row from public.manual_payment_submissions
    where id = p_submission_id for update;
  if not found then raise exception 'Payment submission not found'; end if;
  if payment_row.status <> 'pending_review' then
    raise exception 'Only pending submissions can be approved';
  end if;
  select * into course_row from public.courses where id = payment_row.course_id for update;
  if not found or not course_row.is_published then
    raise exception 'Course is not published; enrollment cannot be activated';
  end if;
  period_end := (payment_row.billing_period + interval '1 month - 1 day')::date;

  if payment_row.payment_kind = 'legacy' then
    if payment_row.amount_bdt <> course_row.price_bdt then
      raise exception 'Legacy payment amount does not match its recorded course price';
    end if;
    update public.enrollments
      set status = 'active', admission_fee_paid = true,
          paid_through = greatest(coalesce(paid_through, period_end), period_end)
      where student_id = payment_row.student_id and course_id = payment_row.course_id;
    if not found then
      insert into public.enrollments(student_id, course_id, status, starts_at, admission_fee_paid, paid_through)
      values(payment_row.student_id, payment_row.course_id, 'active', now(), true, period_end);
    end if;
  elsif payment_row.delivery_mode is not null then
    monthly_snapshot := payment_row.fee_monthly_bdt;
    admission_snapshot := coalesce(payment_row.fee_admission_bdt,0);
    if monthly_snapshot is null then raise exception 'Payment fee snapshot is missing'; end if;

    if payment_row.payment_kind = 'initial' then
      if payment_row.amount_bdt <> monthly_snapshot + admission_snapshot then
        raise exception 'Initial payment does not match its recorded fee snapshot';
      end if;
      insert into public.enrollments(
        student_id, course_id, status, starts_at, admission_fee_paid, paid_through,
        delivery_mode, monthly_fee_bdt, admission_fee_bdt
      ) values (
        payment_row.student_id, payment_row.course_id, 'active', now(), true, period_end,
        payment_row.delivery_mode, monthly_snapshot, admission_snapshot
      )
      on conflict (student_id, course_id) do update
        set status = 'active',
            admission_fee_paid = true,
            starts_at = coalesce(public.enrollments.starts_at, now()),
            paid_through = greatest(coalesce(public.enrollments.paid_through, period_end), period_end),
            delivery_mode = excluded.delivery_mode,
            monthly_fee_bdt = excluded.monthly_fee_bdt,
            admission_fee_bdt = excluded.admission_fee_bdt;
    elsif payment_row.payment_kind = 'monthly' then
      if payment_row.amount_bdt <> monthly_snapshot or admission_snapshot <> 0 then
        raise exception 'Monthly payment does not match its recorded fee snapshot';
      end if;
      select * into enrollment_row from public.enrollments
        where student_id = payment_row.student_id and course_id = payment_row.course_id
        for update;
      if not found or enrollment_row.status <> 'active'
         or enrollment_row.delivery_mode is distinct from payment_row.delivery_mode then
        raise exception 'An active enrollment with the same learning format is required';
      end if;
      update public.enrollments
        set paid_through = greatest(coalesce(paid_through, period_end), period_end)
        where id = enrollment_row.id;
    else
      raise exception 'Unsupported payment type';
    end if;
  elsif payment_row.payment_kind = 'initial' then
    if payment_row.amount_bdt <> course_row.admission_fee_bdt + course_row.monthly_fee_bdt then
      raise exception 'Initial payment must include admission fee and first monthly fee';
    end if;
    insert into public.enrollments(student_id, course_id, status, starts_at, admission_fee_paid, paid_through)
      values(payment_row.student_id, payment_row.course_id, 'active', now(), true, period_end)
      on conflict (student_id, course_id) do update
        set status = 'active', admission_fee_paid = true,
            starts_at = coalesce(public.enrollments.starts_at, now()),
            paid_through = greatest(coalesce(public.enrollments.paid_through, period_end), period_end);
  elsif payment_row.payment_kind = 'monthly' then
    if payment_row.amount_bdt <> course_row.monthly_fee_bdt then
      raise exception 'Monthly payment amount does not match the course fee';
    end if;
    update public.enrollments
      set paid_through = greatest(coalesce(paid_through, period_end), period_end)
      where student_id = payment_row.student_id and course_id = payment_row.course_id
        and status = 'active' and admission_fee_paid = true;
    if not found then raise exception 'An active admitted enrollment is required for monthly payment'; end if;
  else
    raise exception 'Unsupported payment type';
  end if;

  update public.manual_payment_submissions
    set status = 'approved', admin_note = nullif(trim(p_admin_note), ''),
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_submission_id;

  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values(auth.uid(), 'manual_payment_approved', 'manual_payment_submission', p_submission_id::text,
    jsonb_build_object(
      'student_id', payment_row.student_id,
      'course_id', payment_row.course_id,
      'provider', payment_row.provider,
      'amount_bdt', payment_row.amount_bdt,
      'payment_kind', payment_row.payment_kind,
      'delivery_mode', payment_row.delivery_mode,
      'billing_period', payment_row.billing_period
    ));
end;
$$;
revoke all on function public.approve_manual_payment_submission(uuid, text) from public, anon;
grant execute on function public.approve_manual_payment_submission(uuid, text) to authenticated;

-- Only live + recorded learners (and legacy mode-less enrollments) can see live class links.
drop policy if exists "live classes scoped read" on public.live_classes;
create policy "live classes scoped read" on public.live_classes
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (
      select 1 from public.course_assignments a
      where a.course_id = live_classes.course_id and a.teacher_id = (select auth.uid())
    )
  )
  or exists (
    select 1 from public.enrollments e
    where e.course_id = live_classes.course_id
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and (e.delivery_mode is null or e.delivery_mode = 'live_recorded')
  )
);

-- ===== supabase/migrations/0020_academy_public_profile.sql =====
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

commit;
