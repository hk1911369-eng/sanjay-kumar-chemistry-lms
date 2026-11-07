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
