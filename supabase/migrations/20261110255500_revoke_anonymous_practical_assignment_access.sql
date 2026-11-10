-- Practical assignment details are private to signed-in, authorised learners and staff.
revoke all on table public.lab_practical_assignments from public, anon;
grant select, insert, update on table public.lab_practical_assignments to authenticated;
