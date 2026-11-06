-- Manual payment reference submission. This does NOT auto-confirm a payment.
create type public.manual_payment_review_status as enum
  ('pending_review','approved','rejected');

create table public.manual_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  provider public.payment_provider not null,
  amount_bdt integer not null check (amount_bdt > 0),
  transaction_id text not null check (length(trim(transaction_id)) between 5 and 100),
  sender_phone_last4 text check (sender_phone_last4 is null or sender_phone_last4 ~ '^[0-9]{4}$'),
  status public.manual_payment_review_status not null default 'pending_review',
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, transaction_id)
);

alter table public.manual_payment_submissions enable row level security;

-- Students may submit and view only their own requests.
create policy "student submits own manual payment"
on public.manual_payment_submissions for insert
with check (student_id = auth.uid() and status = 'pending_review'
  and reviewed_by is null and reviewed_at is null and admin_note is null);

create policy "student reads own manual payment"
on public.manual_payment_submissions for select
using (student_id = auth.uid());

-- Staff may review submissions. Role provisioning must be locked to trusted admin tooling.
create policy "staff reads manual payment submissions"
on public.manual_payment_submissions for select
using (public.is_staff());

create policy "staff reviews manual payment submissions"
on public.manual_payment_submissions for update
using (public.is_staff())
with check (public.is_staff());

-- Important:
-- Approval must be performed only after checking the provider's merchant dashboard.
-- The review API must be server-side, require an authenticated admin, use a DB transaction,
-- record an audit_logs entry, and activate the matching enrollment only on approval.
-- Never trust a student-entered transaction ID as proof of payment.
