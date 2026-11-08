-- 0048: align URL and sender-phone validation constraints across databases.
-- Production already has these safeguards; the test database is missing them.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.lessons'::regclass
      and conname = 'lessons_video_url_https_check'
  ) then
    alter table public.lessons
      add constraint lessons_video_url_https_check
      check (video_url is null or video_url ~* '^https://') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.manual_payment_submissions'::regclass
      and conname = 'manual_payment_sender_phone_format'
  ) then
    alter table public.manual_payment_submissions
      add constraint manual_payment_sender_phone_format
      check (sender_phone is null or sender_phone ~ '^01[3-9][0-9]{8}$');
  end if;
end;
$$;
