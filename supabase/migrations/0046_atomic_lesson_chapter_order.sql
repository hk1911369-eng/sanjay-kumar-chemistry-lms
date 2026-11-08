-- 0046: serialize automatic chapter and lesson ordering per course.
-- Explicit positive positions remain available for controlled reordering/imports.

create index if not exists lessons_course_position_idx
  on public.lessons(course_id, position desc);
create index if not exists chapters_course_sort_order_idx
  on public.chapters(course_id, sort_order desc);

create or replace function public.assign_next_lesson_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.position <= 0 then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.course_id::text, 0));
    select coalesce(max(l.position), 0) + 1
      into new.position
    from public.lessons l
    where l.course_id = new.course_id;
  end if;
  return new;
end;
$$;

create or replace function public.assign_next_chapter_sort_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sort_order <= 0 then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.course_id::text, 0));
    select coalesce(max(c.sort_order), 0) + 1
      into new.sort_order
    from public.chapters c
    where c.course_id = new.course_id;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_next_lesson_position on public.lessons;
create trigger assign_next_lesson_position
before insert on public.lessons
for each row execute function public.assign_next_lesson_position();

drop trigger if exists assign_next_chapter_sort_order on public.chapters;
create trigger assign_next_chapter_sort_order
before insert on public.chapters
for each row execute function public.assign_next_chapter_sort_order();

revoke all on function public.assign_next_lesson_position() from public, anon, authenticated;
revoke all on function public.assign_next_chapter_sort_order() from public, anon, authenticated;
