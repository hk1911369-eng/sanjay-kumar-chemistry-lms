-- Harden manual payment submission and make review decisions atomic.
-- Students can submit claims, but cannot edit or delete them after submission.
-- Only admins can approve/reject; approval and enrollment activation happen atomically.

create or replace function public.validate_manual_payment_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  course_price integer;
  course_is_published boolean;
  wallet_enabled boolean;
begin
  if auth.uid() is null or new.student_id <> auth.uid() then
    raise exception 'A student may submit payment only for their own account';
  end if;
  if new.status <> 'pending_review' or new.reviewed_by is not null
     or new.reviewed_at is not null or new.admin_note is not null then
    raise exception 'New payment submissions must be pending review';
  end if;

  select price_bdt, is_published into course_price, course_is_published
  from public.courses where id = new.course_id;
  if not found or not course_is_published then
    raise exception 'This course is not accepting enrollment yet';
  end if;
  if new.amount_bdt <> course_price then
    raise exception 'Submitted amount does not match the course fee';
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

create trigger validate_manual_payment_before_insert
before insert on public.manual_payment_submissions
for each row execute function public.validate_manual_payment_submission();

-- Remove direct update/delete privileges. Decisions must go through the RPCs below.
revoke update, delete on public.manual_payment_submissions from anon, authenticated;
drop policy if exists "admins review manual payment submissions" on public.manual_payment_submissions;

create or replace function public.approve_manual_payment_submission(p_submission_id uuid, p_admin_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.manual_payment_submissions%rowtype;
  course_is_published boolean;
begin
  if auth.uid() is null or public.current_role() <> 'admin' then
    raise exception 'Only an admin can approve payments';
  end if;

  select * into payment_row
  from public.manual_payment_submissions
  where id = p_submission_id
  for update;
  if not found then raise exception 'Payment submission not found'; end if;
  if payment_row.status <> 'pending_review' then
    raise exception 'Only pending submissions can be approved';
  end if;

  select is_published into course_is_published
  from public.courses where id = payment_row.course_id;
  if coalesce(course_is_published, false) is not true then
    raise exception 'Course is not published; enrollment cannot be activated';
  end if;

  update public.manual_payment_submissions
  set status = 'approved', admin_note = nullif(trim(p_admin_note), ''),
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_submission_id;

  insert into public.enrollments(student_id, course_id, status, starts_at)
  values(payment_row.student_id, payment_row.course_id, 'active', now())
  on conflict (student_id, course_id)
  do update set status = 'active', starts_at = coalesce(public.enrollments.starts_at, now());

  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values(auth.uid(), 'manual_payment_approved', 'manual_payment_submission',
         p_submission_id::text,
         jsonb_build_object('student_id', payment_row.student_id,
                            'course_id', payment_row.course_id,
                            'provider', payment_row.provider,
                            'amount_bdt', payment_row.amount_bdt));
end;
$$;

create or replace function public.reject_manual_payment_submission(p_submission_id uuid, p_admin_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_row public.manual_payment_submissions%rowtype;
begin
  if auth.uid() is null or public.current_role() <> 'admin' then
    raise exception 'Only an admin can reject payments';
  end if;
  if nullif(trim(p_admin_note), '') is null then
    raise exception 'A reason is required when rejecting a payment';
  end if;

  select * into payment_row
  from public.manual_payment_submissions
  where id = p_submission_id
  for update;
  if not found then raise exception 'Payment submission not found'; end if;
  if payment_row.status <> 'pending_review' then
    raise exception 'Only pending submissions can be rejected';
  end if;

  update public.manual_payment_submissions
  set status = 'rejected', admin_note = trim(p_admin_note),
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_submission_id;

  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values(auth.uid(), 'manual_payment_rejected', 'manual_payment_submission',
         p_submission_id::text,
         jsonb_build_object('student_id', payment_row.student_id,
                            'course_id', payment_row.course_id,
                            'provider', payment_row.provider,
                            'amount_bdt', payment_row.amount_bdt,
                            'reason', trim(p_admin_note)));
end;
$$;

revoke all on function public.approve_manual_payment_submission(uuid, text) from public, anon;
revoke all on function public.reject_manual_payment_submission(uuid, text) from public, anon;
grant execute on function public.approve_manual_payment_submission(uuid, text) to authenticated;
grant execute on function public.reject_manual_payment_submission(uuid, text) to authenticated;

-- No payment approval occurs automatically. Admin must verify the merchant dashboard first.
