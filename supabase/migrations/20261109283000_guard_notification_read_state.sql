-- A notification may transition from unread to read once. Clients cannot
-- reset it to unread or forge a future read timestamp.

create or replace function public.guard_notification_read_state()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $function$
begin
  if auth.uid() is not null and new.recipient_id = auth.uid() then
    if old.read_at is not null then
      raise exception 'A read notification cannot be changed'
        using errcode = '42501';
    end if;

    if new.read_at is null or new.read_at > now() + interval '30 seconds' then
      raise exception 'Notifications can only be marked read using the current time'
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.guard_notification_read_state() from public, anon, authenticated;

drop trigger if exists guard_notification_read_state on public.notifications;
create trigger guard_notification_read_state
before update of read_at on public.notifications
for each row execute function public.guard_notification_read_state();
