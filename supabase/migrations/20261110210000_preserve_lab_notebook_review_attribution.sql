-- Preserve reviewer attribution on notebook records; never silently null an audit reference.
-- Preserve reviewer attribution on notebook records; never silently null an audit reference.
alter table public.lab_notebook_entries
  drop constraint if exists lab_notebook_entries_reviewed_by_fkey;
alter table public.lab_notebook_entries
  add constraint lab_notebook_entries_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id) on delete restrict;
