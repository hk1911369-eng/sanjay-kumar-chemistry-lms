-- Fail closed in administrator RPCs when the caller has no active profile.
-- SQL NULL comparisons are not true inside IF, so use IS DISTINCT FROM.
DO $$
DECLARE
  fn record;
  updated_definition text;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_catalog.pg_get_functiondef(p.oid) AS definition
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'approve_manual_payment_submission',
        'reject_manual_payment_submission',
        'set_course_archived',
        'set_student_account_active'
      )
  LOOP
    IF fn.proname IN ('approve_manual_payment_submission', 'reject_manual_payment_submission') THEN
      updated_definition := replace(
        fn.definition,
        'public.current_role() <> ''admin''',
        'public.current_role() IS DISTINCT FROM ''admin''::public.app_role'
      );
    ELSE
      updated_definition := replace(
        fn.definition,
        '(select public.current_role())::text <> ''admin''',
        '(select public.current_role())::text IS DISTINCT FROM ''admin'''
      );
    END IF;

    IF updated_definition = fn.definition THEN
      RAISE EXCEPTION 'Expected administrator guard not found in function %', fn.proname;
    END IF;

    EXECUTE updated_definition;
  END LOOP;
END
$$;
