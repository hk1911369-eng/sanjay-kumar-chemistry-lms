-- Store a point-in-time reviewer name so students can identify who reviewed work
-- without granting them broad access to teaching-staff profile rows.

alter table public.lab_notebook_review_history
  add column if not exists reviewer_display_name text not null default 'Teaching staff'
  check (length(btrim(reviewer_display_name)) between 1 and 100);

create or replace function public.record_lab_notebook_review_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_round integer;
  v_reviewer_name text := 'Teaching staff';
begin
  if old.status = 'submitted' and new.status in ('returned','reviewed') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(new.id::text, 0)
    );

    select coalesce(max(h.review_round), 0) + 1
      into v_round
    from public.lab_notebook_review_history h
    where h.notebook_id = new.id;

    select coalesce(nullif(pg_catalog.btrim(p.full_name), ''), 'Teaching staff')
      into v_reviewer_name
    from public.profiles p
    where p.id = new.reviewed_by;

    insert into public.lab_notebook_review_history (
      notebook_id,
      student_id,
      reviewer_id,
      reviewer_display_name,
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
      v_reviewer_name,
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

revoke all on function public.record_lab_notebook_review_history() from public, anon, authenticated;
