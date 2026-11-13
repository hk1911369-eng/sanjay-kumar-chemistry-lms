-- Keep the auth rate-limit action constraint aligned with the password-reset RPC.
ALTER TABLE public.auth_rate_limit_events
  DROP CONSTRAINT IF EXISTS auth_rate_limit_events_action_check;
ALTER TABLE public.auth_rate_limit_events
  ADD CONSTRAINT auth_rate_limit_events_action_check
  CHECK (action = ANY (ARRAY['sign_in','sign_up','password_reset']::text[]));
