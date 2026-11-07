-- 0008: recurring monthly tuition and one-time admission fee.
-- Existing active students are treated as already admitted; they owe the monthly fee
-- for the current Bangladesh billing month, but are not charged admission retroactively.
alter table public.courses
  add column if not exists monthly_fee_bdt integer not null default 700,
  add column if not exists admission_fee_bdt integer not null default 1500;
update public.courses set monthly_fee_bdt = 700, admission_fee_bdt = 1500
where slug in ('hsc-2027-chemistry','hsc-2028-chemistry','admission-chemistry');
alter table public.courses drop constraint if exists courses_monthly_fee_bdt_check;
alter table public.courses add constraint courses_monthly_fee_bdt_check check (monthly_fee_bdt = 700);
alter table public.courses drop constraint if exists courses_admission_fee_bdt_check;
alter table public.courses add constraint courses_admission_fee_bdt_check check (admission_fee_bdt = 1500);

alter table public.enrollments
  add column if not exists admission_fee_paid boolean not null default false,
  add column if not exists paid_through date;
update public.enrollments
set admission_fee_paid = true,
    paid_through = (date_trunc('month', (now() at time zone 'Asia/Dhaka'))::date - 1)
where status = 'active' and admission_fee_paid = false and paid_through is null;

alter table public.manual_payment_submissions
  add column if not exists payment_kind text not null default 'legacy',
  add column if not exists billing_period date;
update public.manual_payment_submissions
set billing_period = date_trunc('month', created_at)::date
where billing_period is null;
alter table public.manual_payment_submissions
  alter column billing_period set not null;
alter table public.manual_payment_submissions
  drop constraint if exists manual_payment_payment_kind_check;
alter table public.manual_payment_submissions
  add constraint manual_payment_payment_kind_check
  check (payment_kind in ('legacy','initial','monthly'));
alter table public.manual_payment_submissions
  drop constraint if exists manual_payment_billing_period_check;
alter table public.manual_payment_submissions
  add constraint manual_payment_billing_period_check
  check (extract(day from billing_period) = 1);

create unique index if not exists manual_payment_one_initial_per_course
  on public.manual_payment_submissions(student_id, course_id)
  where payment_kind = 'initial' and status in ('pending_review','approved');
create unique index if not exists manual_payment_one_monthly_per_period
  on public.manual_payment_submissions(student_id, course_id, billing_period)
  where payment_kind = 'monthly' and status in ('pending_review','approved');

create or replace function public.validate_manual_payment_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  course_monthly_fee integer;
  course_admission_fee integer;
  course_is_published boolean;
  wallet_enabled boolean;
  enrollment_row public.enrollments%rowtype;
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
  select monthly_fee_bdt, admission_fee_bdt, is_published
    into course_monthly_fee, course_admission_fee, course_is_published
    from public.courses where id = new.course_id;
  if not found or not course_is_published then
    raise exception 'This course is not accepting enrollment yet';
  end if;
  current_period := date_trunc('month', now() at time zone 'Asia/Dhaka')::date;
  if new.billing_period <> current_period then
    raise exception 'Payment must be submitted for the current Bangladesh billing month';
  end if;
  select * into enrollment_row from public.enrollments
    where student_id = new.student_id and course_id = new.course_id;
  if new.payment_kind = 'initial' then
    if found and enrollment_row.admission_fee_paid then
      raise exception 'Admission and first-month fees have already been paid';
    end if;
    if new.amount_bdt <> course_admission_fee + course_monthly_fee then
      raise exception 'Initial payment must include admission fee and first monthly fee';
    end if;
  elsif new.payment_kind = 'monthly' then
    if not found or enrollment_row.status <> 'active' or not enrollment_row.admission_fee_paid then
      raise exception 'Complete admission payment before paying monthly tuition';
    end if;
    if new.amount_bdt <> course_monthly_fee then
      raise exception 'Monthly payment amount does not match the course fee';
    end if;
    if enrollment_row.paid_through >= (current_period + interval '1 month - 1 day')::date then
      raise exception 'The current month is already paid';
    end if;
  else
    raise exception 'New payment must be an initial or monthly payment';
  end if;
  select is_enabled into wallet_enabled from public.private_payment_settings where provider = new.provider;
  if coalesce(wallet_enabled, false) is not true then
    raise exception 'This payment method is currently unavailable';
  end if;
  new.transaction_id := upper(trim(new.transaction_id));
  return new;
end;
$$;

drop trigger if exists validate_manual_payment_submission on public.manual_payment_submissions;
create trigger validate_manual_payment_submission
before insert on public.manual_payment_submissions
for each row execute function public.validate_manual_payment_submission();

create or replace function public.approve_manual_payment_submission(p_submission_id uuid, p_admin_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.manual_payment_submissions%rowtype;
  course_row public.courses%rowtype;
  period_end date;
begin
  if auth.uid() is null or public.current_role() <> 'admin' then
    raise exception 'Only an admin can approve payments';
  end if;
  select * into payment_row from public.manual_payment_submissions where id = p_submission_id for update;
  if not found then raise exception 'Payment submission not found'; end if;
  if payment_row.status <> 'pending_review' then raise exception 'Only pending submissions can be approved'; end if;
  select * into course_row from public.courses where id = payment_row.course_id for update;
  if not found or not course_row.is_published then raise exception 'Course is not published; enrollment cannot be activated'; end if;
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
    set status = 'approved', admin_note = nullif(trim(p_admin_note), ''), reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_submission_id;
  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
    values(auth.uid(), 'manual_payment_approved', 'manual_payment_submission', p_submission_id::text,
      jsonb_build_object('student_id', payment_row.student_id, 'course_id', payment_row.course_id,
        'provider', payment_row.provider, 'amount_bdt', payment_row.amount_bdt,
        'payment_kind', payment_row.payment_kind, 'billing_period', payment_row.billing_period));
end;
$$;
revoke all on function public.approve_manual_payment_submission(uuid, text) from public, anon;
grant execute on function public.approve_manual_payment_submission(uuid, text) to authenticated;

-- Lesson and chapter access is active only while the current month's tuition is paid.
drop policy if exists "published lessons visible to enrolled students and assigned teachers" on public.lessons;
drop policy if exists "lessons visible by enrollment or assignment" on public.lessons;
create policy "lessons visible by enrollment or assignment" on public.lessons for select
using (
  public.current_role() = 'admin'
  or (public.current_role() = 'teacher' and exists (
    select 1 from public.course_assignments a where a.course_id = lessons.course_id and a.teacher_id = auth.uid()
  ))
  or (is_published and exists (
    select 1 from public.enrollments e
    where e.course_id = lessons.course_id and e.student_id = auth.uid() and e.status = 'active'
      and e.admission_fee_paid = true
      and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
  ))
);

drop policy if exists "chapters visible to enrolled students and assigned teachers" on public.chapters;
create policy "chapters visible to enrolled students and assigned teachers" on public.chapters for select
using (
  public.current_role() = 'admin'
  or (public.current_role() = 'teacher' and exists (
    select 1 from public.course_assignments a where a.course_id = chapters.course_id and a.teacher_id = auth.uid()
  ))
  or (published and exists (
    select 1 from public.enrollments e
    where e.course_id = chapters.course_id and e.student_id = auth.uid() and e.status = 'active'
      and e.admission_fee_paid = true
      and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
  ))
);
