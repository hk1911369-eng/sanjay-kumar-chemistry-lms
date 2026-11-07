-- Keep the auth profile bootstrap trigger internal. It must not be callable as an API function.
-- The trigger itself continues to run with the function owner's privileges.
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

comment on function public.handle_new_user() is
  'Internal auth.users trigger only. Direct API execution is revoked; the auth trigger runs under its owner privileges.';
