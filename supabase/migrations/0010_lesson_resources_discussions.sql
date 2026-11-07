-- 0010: lesson file library, private video playback, discussions, reactions and bookmarks.
-- Additive only. Existing courses, students, lessons, payments and progress are preserved.

create table if not exists public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  storage_path text not null unique,
  file_name text not null check (length(trim(file_name)) between 1 and 255),
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 104857600),
  resource_type text not null check (resource_type in ('video','pdf','slide','document','image','audio','other')),
  caption text not null default '',
  downloadable boolean not null default true,
  created_at timestamptz not null default now(),
  constraint lesson_resources_path_matches_course check (storage_path like course_id::text || '/%')
);
create index if not exists lesson_resources_lesson_idx on public.lesson_resources(lesson_id, created_at);

alter table public.lesson_resources enable row level security;
drop policy if exists "lesson resources scoped read" on public.lesson_resources;
create policy "lesson resources scoped read" on public.lesson_resources for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = lesson_resources.course_id and a.teacher_id = auth.uid())
  )
  or (
    exists (
      select 1 from public.lessons l
      join public.enrollments e on e.course_id = l.course_id
      where l.id = lesson_resources.lesson_id and l.course_id = lesson_resources.course_id
        and l.is_published and e.student_id = auth.uid() and e.status = 'active'
        and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);
drop policy if exists "assigned teachers manage lesson resources" on public.lesson_resources;
create policy "assigned teachers manage lesson resources" on public.lesson_resources for all to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = lesson_resources.course_id and a.teacher_id = auth.uid())
  )
)
with check (
  uploaded_by = auth.uid()
  and exists (select 1 from public.lessons l where l.id = lesson_resources.lesson_id and l.course_id = lesson_resources.course_id)
  and (
    public.current_role() = 'admin'
    or (
      public.current_role()::text in ('teacher','staff')
      and exists (select 1 from public.course_assignments a where a.course_id = lesson_resources.course_id and a.teacher_id = auth.uid())
    )
  )
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-materials',
  'lesson-materials',
  false,
  104857600,
  array[
    'video/mp4','video/webm','video/quicktime',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg','image/png','image/webp',
    'audio/mpeg','audio/mp4','audio/wav'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "assigned teachers upload lesson materials" on storage.objects;
create policy "assigned teachers upload lesson materials" on storage.objects for insert to authenticated
with check (
  bucket_id = 'lesson-materials'
  and exists (
    select 1 from public.lessons l
    where l.id::text = (storage.foldername(name))[2]
      and l.course_id::text = (storage.foldername(name))[1]
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments a where a.course_id = l.course_id and a.teacher_id = auth.uid())
        )
      )
  )
);
drop policy if exists "course members read lesson materials" on storage.objects;
create policy "course members read lesson materials" on storage.objects for select to authenticated
using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1 from public.lessons l
    where l.id::text = (storage.foldername(name))[2]
      and l.course_id::text = (storage.foldername(name))[1]
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments a where a.course_id = l.course_id and a.teacher_id = auth.uid())
        )
        or (
          l.is_published and exists (
            select 1 from public.enrollments e
            where e.course_id = l.course_id and e.student_id = auth.uid() and e.status = 'active'
              and e.admission_fee_paid = true
              and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
          )
        )
      )
  )
);
drop policy if exists "assigned teachers delete lesson materials" on storage.objects;
create policy "assigned teachers delete lesson materials" on storage.objects for delete to authenticated
using (
  bucket_id = 'lesson-materials'
  and exists (
    select 1 from public.lessons l
    where l.id::text = (storage.foldername(name))[2]
      and l.course_id::text = (storage.foldername(name))[1]
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments a where a.course_id = l.course_id and a.teacher_id = auth.uid())
        )
      )
  )
);

create table if not exists public.lesson_discussions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  parent_id uuid references public.lesson_discussions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default '',
  body text not null check (length(trim(body)) between 2 and 3000),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  constraint lesson_discussions_course_path check (course_id is not null)
);
create index if not exists lesson_discussions_lesson_created_idx on public.lesson_discussions(lesson_id, created_at);
create index if not exists lesson_discussions_parent_idx on public.lesson_discussions(parent_id);

alter table public.lesson_discussions enable row level security;
drop policy if exists "course members read lesson discussions" on public.lesson_discussions;
create policy "course members read lesson discussions" on public.lesson_discussions for select to authenticated
using (
  public.current_role() = 'admin'
  or (
    public.current_role()::text in ('teacher','staff')
    and exists (select 1 from public.course_assignments a where a.course_id = lesson_discussions.course_id and a.teacher_id = auth.uid())
  )
  or (
    exists (
      select 1 from public.lessons l
      join public.enrollments e on e.course_id = l.course_id
      where l.id = lesson_discussions.lesson_id and l.course_id = lesson_discussions.course_id
        and l.is_published and e.student_id = auth.uid() and e.status = 'active'
        and e.admission_fee_paid = true
        and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
    )
  )
);
drop policy if exists "course members post lesson discussions" on public.lesson_discussions;
create policy "course members post lesson discussions" on public.lesson_discussions for insert to authenticated
with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.lessons l
    where l.id = lesson_discussions.lesson_id and l.course_id = lesson_discussions.course_id
      and (
        public.current_role() = 'admin'
        or (
          public.current_role()::text in ('teacher','staff')
          and exists (select 1 from public.course_assignments a where a.course_id = l.course_id and a.teacher_id = auth.uid())
        )
        or (
          l.is_published and exists (
            select 1 from public.enrollments e
            where e.course_id = l.course_id and e.student_id = auth.uid() and e.status = 'active'
              and e.admission_fee_paid = true
              and e.paid_through >= (date_trunc('month', now() at time zone 'Asia/Dhaka')::date + interval '1 month - 1 day')::date
          )
        )
      )
  )
  and (
    parent_id is null
    or exists (
      select 1 from public.lesson_discussions parent
      where parent.id = lesson_discussions.parent_id
        and parent.lesson_id = lesson_discussions.lesson_id
        and parent.parent_id is null
    )
  )
);
drop policy if exists "authors and admins update discussions" on public.lesson_discussions;
create policy "authors and admins update discussions" on public.lesson_discussions for update to authenticated
using (author_id = auth.uid() or public.current_role() = 'admin')
with check (author_id = auth.uid() or public.current_role() = 'admin');
drop policy if exists "authors and admins delete discussions" on public.lesson_discussions;
create policy "authors and admins delete discussions" on public.lesson_discussions for delete to authenticated
using (author_id = auth.uid() or public.current_role() = 'admin');

create table if not exists public.lesson_discussion_reactions (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.lesson_discussions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like','love','helpful')),
  created_at timestamptz not null default now(),
  unique(discussion_id, user_id, reaction)
);
create index if not exists lesson_discussion_reactions_discussion_idx on public.lesson_discussion_reactions(discussion_id);
alter table public.lesson_discussion_reactions enable row level security;
drop policy if exists "course members read discussion reactions" on public.lesson_discussion_reactions;
create policy "course members read discussion reactions" on public.lesson_discussion_reactions for select to authenticated
using (
  exists (
    select 1 from public.lesson_discussions d
    where d.id = lesson_discussion_reactions.discussion_id
  )
);
drop policy if exists "users add own discussion reactions" on public.lesson_discussion_reactions;
create policy "users add own discussion reactions" on public.lesson_discussion_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.lesson_discussions d
    where d.id = lesson_discussion_reactions.discussion_id
  )
);
drop policy if exists "users remove own discussion reactions" on public.lesson_discussion_reactions;
create policy "users remove own discussion reactions" on public.lesson_discussion_reactions for delete to authenticated
using (user_id = auth.uid());

create table if not exists public.lesson_bookmarks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(lesson_id, student_id)
);
alter table public.lesson_bookmarks enable row level security;
drop policy if exists "students manage own lesson bookmarks" on public.lesson_bookmarks;
create policy "students manage own lesson bookmarks" on public.lesson_bookmarks for all to authenticated
using (student_id = auth.uid())
with check (
  student_id = auth.uid()
  and exists (
    select 1 from public.lessons l
    join public.enrollments e on e.course_id = l.course_id
    where l.id = lesson_bookmarks.lesson_id and l.is_published
      and e.student_id = auth.uid() and e.status = 'active'
  )
);

grant select, insert, update, delete on public.lesson_resources, public.lesson_discussions,
  public.lesson_discussion_reactions, public.lesson_bookmarks to authenticated;
