create extension if not exists pgcrypto;
create type public.app_role as enum ('student','teacher','admin');
create type public.payment_provider as enum ('bkash','nagad','rocket');
create type public.payment_status as enum ('created','pending','paid','failed','cancelled','refunded');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', phone text, role public.app_role not null default 'student',
 avatar_path text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.courses (
 id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null,
 level text not null check(level in ('SSC','HSC','ADMISSION','OTHER')),
 description text not null default '', price_bdt integer not null check(price_bdt>=0),
 is_published boolean not null default false, created_at timestamptz not null default now()
);
create table public.enrollments (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 course_id uuid not null references public.courses(id), status text not null default 'pending' check(status in ('pending','active','expired','cancelled')),
 starts_at timestamptz, ends_at timestamptz, created_at timestamptz not null default now(), unique(student_id,course_id)
);
create table public.payment_orders (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id),
 course_id uuid not null references public.courses(id), provider public.payment_provider not null,
 amount_bdt integer not null check(amount_bdt>0), currency text not null default 'BDT' check(currency='BDT'),
 status public.payment_status not null default 'created', provider_payment_id text unique,
 provider_transaction_id text unique, checkout_url text, idempotency_key text not null unique,
 verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.payment_events (
 id uuid primary key default gen_random_uuid(), order_id uuid references public.payment_orders(id),
 provider public.payment_provider not null, event_type text not null, payload jsonb not null default '{}',
 signature_valid boolean not null default false, created_at timestamptz not null default now()
);
create table public.lessons (
 id uuid primary key default gen_random_uuid(), course_id uuid not null references public.courses(id) on delete cascade,
 title text not null, description text not null default '', video_url text, resource_path text,
 position integer not null default 0, is_published boolean not null default false, created_at timestamptz not null default now()
);
create table public.notices (
 id uuid primary key default gen_random_uuid(), title text not null, body text not null,
 published_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id),
 action text not null, target_type text not null, target_id text, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);
create or replace function public.current_role() returns public.app_role language sql stable security definer set search_path=public as $$ select role from public.profiles where id=auth.uid() $$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_role() in ('teacher','admin'),false) $$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.payment_orders enable row level security;
alter table public.payment_events enable row level security;
alter table public.lessons enable row level security;
alter table public.notices enable row level security;
alter table public.audit_logs enable row level security;
create policy "profile self read" on public.profiles for select using(id=auth.uid() or public.is_staff());
create policy "profile self update safe fields" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid() and role=public.current_role());
create policy "published courses visible" on public.courses for select using(is_published or public.is_staff());
create policy "staff manage courses" on public.courses for all using(public.is_staff()) with check(public.is_staff());
create policy "student own enrollments" on public.enrollments for select using(student_id=auth.uid() or public.is_staff());
create policy "staff manage enrollments" on public.enrollments for all using(public.is_staff()) with check(public.is_staff());
create policy "student own payment orders" on public.payment_orders for select using(student_id=auth.uid() or public.is_staff());
create policy "staff read payment events" on public.payment_events for select using(public.is_staff());
create policy "published lessons visible to enrolled students" on public.lessons for select using(is_published and exists(select 1 from public.enrollments e where e.course_id=lessons.course_id and e.student_id=auth.uid() and e.status='active') or public.is_staff());
create policy "staff manage lessons" on public.lessons for all using(public.is_staff()) with check(public.is_staff());
create policy "published notices visible" on public.notices for select using(published_at is not null or public.is_staff());
create policy "staff manage notices" on public.notices for all using(public.is_staff()) with check(public.is_staff());
create policy "staff read audit" on public.audit_logs for select using(public.current_role()='admin');
-- Role changes and payment status transitions must be performed only by trusted server code using the service role.
