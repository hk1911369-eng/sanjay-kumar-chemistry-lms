-- Index the creator foreign key to support creator deletion and catalogue joins.

create index if not exists virtual_lab_catalog_created_by_idx
  on public.virtual_lab_catalog (created_by);
