-- RLS policies are permissive by default and combine with OR.
-- Remove the stale broad INSERT policy so only verified lesson completions are client-insertable.
DROP POLICY IF EXISTS "students record own learning events" ON public.learning_events;
