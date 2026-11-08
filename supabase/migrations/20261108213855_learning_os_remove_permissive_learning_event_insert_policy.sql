-- Remove the earlier broad event-ingestion policy; only verified lesson completion remains client-insertable.
DROP POLICY IF EXISTS "students record own learning events" ON public.learning_events;
