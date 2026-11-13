-- Preserve every teacher review round as an append-only audit record.

create table if not exists public.lab_notebook_review_history (
  id uuid primary key default gen_random_uuid(),
  notebook_id uuid not null references public.lab_notebook_entries(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  review_round integer not null check (review_round between 1 and 1000),
  decision text not null check (decision in ('returned','reviewed')),
  feedback text not null check (length(btrim(feedback)) between 1 and 4000),
  score numeric(5,2),
  submitted_at timestamptz not null,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint lab_notebook_review_history_score_check check (
    (decision = 'returned' and score is null)
    or (decision = 'reviewed' and score is not null and score between 0 and 100)
  ),
  constraint lab_notebook_review_history_round_unique unique (notebook_id, review_round)
);

create index if not exists lab_notebook_review_history_student_idx
  on public.lab_notebook_review_history(student_id, reviewed_at desc);
create index if not exists lab_notebook_review_history_reviewer_idx
  on public.lab_notebook_review_history(reviewer_id, reviewed_at desc);
create index if not exists lab_notebook_review_history_notebook_idx
  on public.lab_notebook_review_history(notebook_id, review_round desc);

alter table public.lab_notebook_review_history enable row level security;

drop policy if exists "notebook review history scoped read" on public.lab_notebook_review_history;
create policy "notebook review history scoped read"
on public.lab_notebook_review_history for select to authenticated
using (
  (
    student_id = (select auth.uid())
    and (select public.current_role()) = 'student'::public.app_role
  )
  or (select public.current_role()) = 'admin'::public.app_role
  or (
    (select public.current_role()) in ('teacher'::public.app_role,'staff'::public.app_role)
    and exists (
      select 1
      from public.lab_notebook_entries n
      join public.course_assignments ca on ca.course_id = n.course_id
      where n.id = lab_notebook_review_history.notebook_id
        and ca.teacher_id = (select auth.uid())
    )
  )
);

revoke all on public.lab_notebook_review_history from public, anon, authenticated;
grant select on public.lab_notebook_review_history to authenticated;

create or replace function public.record_lab_notebook_review_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_round integer;
begin
  if old.status = 'submitted' and new.status in ('returned','reviewed') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.id::text, 0)
    );

    select coalesce(max(h.review_round), 0) + 1
      into v_round
    from public.lab_notebook_review_history h
    where h.notebook_id = new.id;

    insert into public.lab_notebook_review_history (
      notebook_id,
      student_id,
      reviewer_id,
      review_round,
      decision,
      feedback,
      score,
      submitted_at,
      reviewed_at
    ) values (
      new.id,
      new.student_id,
      new.reviewed_by,
      v_round,
      new.status,
      new.teacher_feedback,
      new.score,
      new.submitted_at,
      pg_catalog.now()
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists record_lab_notebook_review_history on public.lab_notebook_entries;
create trigger record_lab_notebook_review_history
after update of status on public.lab_notebook_entries
for each row execute function public.record_lab_notebook_review_history();

revoke all on function public.record_lab_notebook_review_history() from public, anon, authenticated;
