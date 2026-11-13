-- Prevent student-controlled payment metadata from granting future paid access
-- or overriding the course's configured delivery-mode prices at approval time.
-- The trigger runs inside the SECURITY DEFINER approval RPC as a final DB boundary.

create or replace function public.guard_manual_payment_approval()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  course_row public.courses%rowtype;
  expected_monthly integer;
  expected_admission integer;
  current_period date := date_trunc('month', now() at time zone 'Asia/Dhaka')::date;
begin
  if new.status is distinct from 'approved'::public.manual_payment_review_status
     or old.status = 'approved'::public.manual_payment_review_status then
    return new;
  end if;

  if new.billing_period > current_period then
    raise exception 'A payment cannot grant access for a future billing period'
      using errcode = '22023';
  end if;

  select * into course_row
  from public.courses
  where id = new.course_id
  for update;

  if not found then
    raise exception 'Payment course not found' using errcode = '22023';
  end if;

  if new.delivery_mode is null then
    if new.fee_monthly_bdt is not null or new.fee_admission_bdt is not null then
      raise exception 'Delivery-mode fee snapshots require a delivery mode'
        using errcode = '22023';
    end if;
    return new;
  end if;

  if not (new.delivery_mode = any(course_row.delivery_modes)) then
    raise exception 'Payment delivery mode is not enabled for this course'
      using errcode = '22023';
  end if;

  expected_monthly := case new.delivery_mode
    when 'live_recorded' then course_row.live_price_bdt
    when 'recorded_only' then course_row.recorded_price_bdt
    when 'offline' then course_row.offline_price_bdt
    else null
  end;

  if new.payment_kind = 'monthly' then
    select coalesce(e.monthly_fee_bdt, expected_monthly)
      into expected_monthly
    from public.enrollments e
    where e.student_id = new.student_id
      and e.course_id = new.course_id
      and e.status = 'active'
      and e.delivery_mode = new.delivery_mode;
    if not found then
      raise exception 'An active enrollment with the same learning format is required'
        using errcode = '42501';
    end if;
  end if;

  if expected_monthly is null
     or new.fee_monthly_bdt is distinct from expected_monthly then
    raise exception 'Payment monthly fee does not match the course delivery-mode price'
      using errcode = '22023';
  end if;

  if new.payment_kind = 'initial' then
    expected_admission := course_row.admission_fee_bdt;
    if new.fee_admission_bdt is distinct from expected_admission
       or new.amount_bdt <> expected_monthly + expected_admission then
      raise exception 'Initial payment does not match the configured course fees'
        using errcode = '22023';
    end if;

    if not exists (
      select 1 from public.course_applications ca
      where ca.student_id = new.student_id
        and ca.course_id = new.course_id
        and ca.delivery_mode = new.delivery_mode
        and ca.status = 'accepted'
    ) then
      raise exception 'An accepted application for this delivery mode is required'
        using errcode = '42501';
    end if;
  elsif new.payment_kind = 'monthly' then
    if new.fee_admission_bdt is distinct from 0
       or new.amount_bdt <> expected_monthly then
      raise exception 'Monthly payment does not match the configured course fee'
        using errcode = '22023';
    end if;
  else
    raise exception 'Unsupported payment type for delivery-mode enrollment'
      using errcode = '22023';
  end if;

  return new;
end;
$function$;

revoke all on function public.guard_manual_payment_approval() from public, anon, authenticated;

drop trigger if exists guard_manual_payment_approval on public.manual_payment_submissions;
create trigger guard_manual_payment_approval
before update of status on public.manual_payment_submissions
for each row
execute function public.guard_manual_payment_approval();
