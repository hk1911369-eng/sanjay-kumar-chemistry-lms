-- Require an active profile before consuming application rate limits.
CREATE OR REPLACE FUNCTION public.consume_app_rate_limit(p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare v_user uuid := auth.uid(); v_window interval; v_limit integer; v_count integer;
begin
 if v_user is null or public.current_role() is null then raise exception 'Active account required' using errcode='42501'; end if;
 if p_action='lesson_discussion' then v_window:=interval '1 minute'; v_limit:=6;
 elsif p_action='manual_payment' then v_window:=interval '15 minutes'; v_limit:=3;
 else raise exception 'Unsupported rate-limit action' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || p_action,0));
 select count(*) into v_count from public.app_rate_limit_events
 where user_id=v_user and action=p_action and created_at>now()-v_window;
 if v_count>=v_limit then return false; end if;
 insert into public.app_rate_limit_events(user_id,action) values(v_user,p_action);
 delete from public.app_rate_limit_events where created_at<now()-interval '24 hours';
 return true;
end; $function$;
