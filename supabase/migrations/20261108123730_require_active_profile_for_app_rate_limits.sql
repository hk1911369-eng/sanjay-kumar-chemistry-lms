-- Do not allow inactive or profile-less authenticated accounts to consume app rate limits.
DO $$
DECLARE
  definition text;
  updated_definition text;
BEGIN
  SELECT pg_catalog.pg_get_functiondef(p.oid)
    INTO definition
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'consume_app_rate_limit'
    AND pg_catalog.oidvectortypes(p.proargtypes) = 'text';

  IF definition IS NULL THEN
    RAISE EXCEPTION 'consume_app_rate_limit(text) was not found';
  END IF;

  updated_definition := replace(
    definition,
    'if v_user is null then raise exception ''Authentication required'' using errcode=''42501''; end if;',
    'if v_user is null or public.current_role() is null then raise exception ''Active account required'' using errcode=''42501''; end if;'
  );

  IF updated_definition = definition THEN
    RAISE EXCEPTION 'Expected authentication guard not found in consume_app_rate_limit';
  END IF;

  EXECUTE updated_definition;
END
$$;
