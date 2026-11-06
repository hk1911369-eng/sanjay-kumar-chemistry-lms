# Trusted role provisioning

Public registration is student-only. Never add a role selector to the signup form and never trust `user_metadata.role`.

To grant a teacher or the first administrator, use the Supabase SQL Editor while signed in as the project owner. First register the account normally and confirm its email. Then run one statement using that account's exact email:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where lower(email) = lower('OWNER_EMAIL_HERE'));
```

For a teacher, replace `'admin'` with `'teacher'`. Verify exactly one row was updated. Do not expose role provisioning through a public API or client-side form. Keep the Supabase service-role key server-side only.
