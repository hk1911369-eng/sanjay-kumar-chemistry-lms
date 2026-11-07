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

-- Students need a paid-through current Bangladesh billing month for learning access.
-- Offline students receive the recorded library as part of their paid offline fee;
-- recorded access is not a separate paid add-on.

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
      and e.admission_fee_paid = true
      and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
      and (e.delivery_mode is null or e.delivery_mode = 'live_recorded')
  )
);

drop policy if exists "chapters visible to enrolled students and assigned teachers" on public.chapters;
create policy "chapters visible to enrolled students and assigned teachers" on public.chapters
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = chapters.course_id and a.teacher_id = (select auth.uid()))
  )
  or (
    published and exists (
      select 1 from public.enrollments e
      where e.course_id = chapters.course_id and e.student_id = (select auth.uid())
        and e.status = 'active' and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);

drop policy if exists "lessons visible by enrollment or assignment" on public.lessons;
create policy "lessons visible by enrollment or assignment" on public.lessons
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = lessons.course_id and a.teacher_id = (select auth.uid()))
  )
  or (
    is_published and exists (
      select 1 from public.enrollments e
      where e.course_id = lessons.course_id and e.student_id = (select auth.uid())
        and e.status = 'active' and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);

drop policy if exists "assignments scoped read" on public.assignments;
create policy "assignments scoped read" on public.assignments
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = assignments.course_id and a.teacher_id = (select auth.uid()))
  )
  or (
    published and exists (
      select 1 from public.enrollments e
      where e.course_id = assignments.course_id and e.student_id = (select auth.uid())
        and e.status = 'active' and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);

drop policy if exists "students submit own assignments" on public.assignment_submissions;
create policy "students submit own assignments" on public.assignment_submissions
for insert to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.assignments x
    join public.enrollments e on e.course_id = x.course_id
    where x.id = assignment_submissions.assignment_id and x.published
      and e.student_id = (select auth.uid()) and e.status = 'active'
      and e.admission_fee_paid = true
      and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
  )
);

drop policy if exists "quizzes scoped read" on public.quizzes;
create policy "quizzes scoped read" on public.quizzes
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = quizzes.course_id and a.teacher_id = (select auth.uid()))
  )
  or (
    published and exists (
      select 1 from public.enrollments e
      where e.course_id = quizzes.course_id and e.student_id = (select auth.uid())
        and e.status = 'active' and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);

drop policy if exists "quiz questions scoped read" on public.quiz_questions;
create policy "quiz questions scoped read" on public.quiz_questions
for select to authenticated
using (
  exists (
    select 1 from public.quizzes q
    where q.id = quiz_questions.quiz_id
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments a where a.course_id = q.course_id and a.teacher_id = (select auth.uid()))
        )
        or (
          q.published and exists (
            select 1 from public.enrollments e
            where e.course_id = q.course_id and e.student_id = (select auth.uid())
              and e.status = 'active' and e.admission_fee_paid = true
              and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
          )
        )
      )
  )
);

drop policy if exists "students create own quiz attempts" on public.quiz_attempts;
create policy "students create own quiz attempts" on public.quiz_attempts
for insert to authenticated
with check (
  student_id = (select auth.uid()) and submitted_at is null and score is null
  and exists (
    select 1 from public.quizzes q
    join public.enrollments e on e.course_id = q.course_id
    where q.id = quiz_attempts.quiz_id and q.published
      and e.student_id = (select auth.uid()) and e.status = 'active'
      and e.admission_fee_paid = true
      and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
  )
);


drop policy if exists "written exams scoped read" on public.written_exams;
create policy "written exams scoped read" on public.written_exams
for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments ca where ca.course_id = written_exams.course_id and ca.teacher_id = (select auth.uid()))
  )
  or (
    published and exists (
      select 1 from public.enrollments e
      where e.course_id = written_exams.course_id and e.student_id = (select auth.uid())
        and e.status = 'active' and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);

drop policy if exists "written exam questions scoped read" on public.written_exam_questions;
create policy "written exam questions scoped read" on public.written_exam_questions
for select to authenticated
using (
  exists (
    select 1 from public.written_exams x
    where x.id = written_exam_questions.exam_id
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments ca where ca.course_id = x.course_id and ca.teacher_id = (select auth.uid()))
        )
        or (
          x.published and exists (
            select 1 from public.enrollments e
            where e.course_id = x.course_id and e.student_id = (select auth.uid())
              and e.status = 'active' and e.admission_fee_paid = true
              and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
          )
        )
      )
  )
);

drop policy if exists "students submit written exams" on public.written_exam_submissions;
create policy "students submit written exams" on public.written_exam_submissions
for insert to authenticated
with check (
  student_id = (select auth.uid()) and score is null and graded_by is null and graded_at is null
  and exists (
    select 1 from public.written_exams x
    join public.enrollments e on e.course_id = x.course_id
    where x.id = written_exam_submissions.exam_id and x.published
      and e.student_id = (select auth.uid()) and e.status = 'active'
      and e.admission_fee_paid = true
      and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
      and (x.starts_at is null or now() >= x.starts_at)
      and (x.ends_at is null or now() <= x.ends_at)
  )
);
