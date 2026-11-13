-- Remove inherited default API grants from student practical notebook records.
-- RLS remains the row-level authorization boundary for authenticated users.
revoke all on table public.lab_notebook_entries from public, anon;
grant select, insert, update on table public.lab_notebook_entries to authenticated;

revoke all on table public.lab_notebook_evidence from public, anon;
grant select, insert on table public.lab_notebook_evidence to authenticated;
