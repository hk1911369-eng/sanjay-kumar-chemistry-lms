-- Replace admin RPCs with fail-closed production-reviewed role guards.
CREATE OR REPLACE FUNCTION public.approve_manual_payment_submission(p_submission_id uuid, p_admin_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare
  payment_row public.manual_payment_submissions%rowtype;
  course_row public.courses%rowtype;
  enrollment_row public.enrollments%rowtype;
  period_end date;
  monthly_snapshot integer;
  admission_snapshot integer;
begin
  if auth.uid() is null or public.current_role() IS DISTINCT FROM 'admin'::public.app_role then
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
$function$


CREATE OR REPLACE FUNCTION public.reject_manual_payment_submission(p_submission_id uuid, p_admin_note text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
                                                                                                                                                                                                               DECLARE
                                                                                                                                                                                                                 payment_row public.manual_payment_submissions%ROWTYPE;
                                                                                                                                                                                                                 BEGIN
                                                                                                                                                                                                                   IF auth.uid() IS NULL OR public.current_role() IS DISTINCT FROM 'admin'::public.app_role THEN
                                                                                                                                                                                                                       RAISE EXCEPTION 'Only an admin can reject payments';
                                                                                                                                                                                                                         END IF;

                                                                                                                                                                                                                           IF NULLIF(trim(p_admin_note), '') IS NULL THEN
                                                                                                                                                                                                                               RAISE EXCEPTION 'A reason is required when rejecting a payment';
                                                                                                                                                                                                                                 END IF;

                                                                                                                                                                                                                                   SELECT * INTO payment_row
                                                                                                                                                                                                                                     FROM public.manual_payment_submissions
                                                                                                                                                                                                                                       WHERE id = p_submission_id FOR UPDATE;

                                                                                                                                                                                                                                         IF NOT FOUND THEN
                                                                                                                                                                                                                                             RAISE EXCEPTION 'Payment submission not found';
                                                                                                                                                                                                                                               END IF;

                                                                                                                                                                                                                                                 IF payment_row.status <> 'pending_review' THEN
                                                                                                                                                                                                                                                     RAISE EXCEPTION 'Only pending submissions can be rejected';
                                                                                                                                                                                                                                                       END IF;

                                                                                                                                                                                                                                                         UPDATE public.manual_payment_submissions
                                                                                                                                                                                                                                                           SET status = 'rejected',
                                                                                                                                                                                                                                                                 admin_note = trim(p_admin_note),
                                                                                                                                                                                                                                                                       reviewed_by = auth.uid(),
                                                                                                                                                                                                                                                                             reviewed_at = now()
                                                                                                                                                                                                                                                                               WHERE id = p_submission_id;

                                                                                                                                                                                                                                                                                 INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
                                                                                                                                                                                                                                                                                   VALUES(auth.uid(), 'manual_payment_rejected',
                                                                                                                                                                                                                                                                                       'manual_payment_submission', p_submission_id::text,
                                                                                                                                                                                                                                                                                           jsonb_build_object(
                                                                                                                                                                                                                                                                                                 'student_id', payment_row.student_id,
                                                                                                                                                                                                                                                                                                       'course_id', payment_row.course_id,
                                                                                                                                                                                                                                                                                                             'provider', payment_row.provider,
                                                                                                                                                                                                                                                                                                                   'amount_bdt', payment_row.amount_bdt,
                                                                                                                                                                                                                                                                                                                         'reason', trim(p_admin_note)
                                                                                                                                                                                                                                                                                                                             ));
                                                                                                                                                                                                                                                                                                                             END;
                                                                                                                                                                                                                                                                                                                             $function$


CREATE OR REPLACE FUNCTION public.set_course_archived(p_course_id uuid, p_archived boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is null or (select public.current_role())::text IS DISTINCT FROM 'admin' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.courses
  set archived_at = case when p_archived then now() else null end,
      is_published = case when p_archived then false else is_published end,
      enrollment_open = case when p_archived then false else enrollment_open end
  where id = p_course_id;

  if not found then
    raise exception 'Course not found' using errcode = '22023';
  end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    case when p_archived then 'course_archived' else 'course_restored' end,
    'course',
    p_course_id::text,
    jsonb_build_object('archived', p_archived, 'publication_reset', p_archived)
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.set_student_account_active(p_student_id uuid, p_is_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
begin
  if auth.uid() is null or (select public.current_role())::text IS DISTINCT FROM 'admin' then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.profiles
  set is_active = p_is_active, updated_at = now()
  where id = p_student_id and role::text = 'student';

  if not found then
    raise exception 'Student account not found' using errcode = '22023';
  end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    case when p_is_active then 'student_account_reactivated' else 'student_account_deactivated' end,
    'profile',
    p_student_id::text,
    jsonb_build_object('is_active', p_is_active)
  );
end;
$function$

