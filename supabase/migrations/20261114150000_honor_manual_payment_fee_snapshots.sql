-- Honor the fee accepted when a student submitted a pending manual payment.
-- Current catalogue prices may change while an administrator is reviewing the payment.
-- The immutable submission snapshot remains the source of truth for approval.
create or replace function public.guard_manual_payment_approval()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  course_row public.courses%rowtype;
  enrollment_row public.enrollments%rowtype;
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

  if not found or course_row.is_published is not true or course_row.archived_at is not null then
    raise exception 'Course is not available; enrollment cannot be activated'
      using errcode = '22023';
  end if;

  -- Older submissions without a delivery-mode snapshot keep the legacy approval
  -- checks in approve_manual_payment_submission().
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

  if new.payment_kind = 'initial' then
    if new.fee_monthly_bdt is null or new.fee_monthly_bdt <= 0
       or new.fee_admission_bdt is null or new.fee_admission_bdt < 0
       or new.amount_bdt <> new.fee_monthly_bdt + new.fee_admission_bdt then
      raise exception 'Initial payment does not match its submitted fee snapshot'
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
    if new.fee_monthly_bdt is null or new.fee_monthly_bdt <= 0
       or new.fee_admission_bdt is distinct from 0
       or new.amount_bdt <> new.fee_monthly_bdt then
      raise exception 'Monthly payment does not match its submitted fee snapshot'
        using errcode = '22023';
    end if;

    select * into enrollment_row
    from public.enrollments e
    where e.student_id = new.student_id
      and e.course_id = new.course_id
      and e.status = 'active'
      and e.delivery_mode = new.delivery_mode
    for update;

    if not found then
      raise exception 'An active enrollment with the same learning format is required'
        using errcode = '42501';
    end if;

    if coalesce(enrollment_row.monthly_fee_bdt, new.fee_monthly_bdt)
       is distinct from new.fee_monthly_bdt then
      raise exception 'Monthly payment fee does not match the enrolled fee snapshot'
        using errcode = '22023';
    end if;
  else
    raise exception 'Unsupported payment type for delivery-mode enrollment'
      using errcode = '22023';
  end if;

  return new;
end;
$function$;
