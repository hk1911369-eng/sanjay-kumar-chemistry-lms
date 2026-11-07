alter table public.courses
 add column if not exists programme_group text not null default 'HSC 2027',
 add column if not exists subjects text[] not null default '{}',
 add column if not exists cover_image_path text,
 add column if not exists teaching_method text not null default '',
 add column if not exists schedule_text text not null default '',
 add column if not exists delivery_modes text[] not null default array['live_recorded']::text[],
 add column if not exists live_price_bdt integer,
 add column if not exists recorded_price_bdt integer,
 add column if not exists offline_price_bdt integer,
 add column if not exists enrollment_open boolean not null default false,
 add column if not exists capacity integer,
 add column if not exists sort_order integer not null default 0,
 add column if not exists archived_at timestamptz;
alter table public.courses drop constraint if exists courses_monthly_fee_bdt_check;
alter table public.courses drop constraint if exists courses_admission_fee_bdt_check;
alter table public.courses drop constraint if exists courses_programme_group_check;
alter table public.courses add constraint courses_programme_group_check check(programme_group in ('HSC 2027','HSC 2028','Admission Batch'));
alter table public.courses drop constraint if exists courses_delivery_modes_check;
alter table public.courses add constraint courses_delivery_modes_check check(cardinality(delivery_modes)>0 and delivery_modes <@ array['live_recorded','recorded_only','offline']::text[]);
alter table public.courses drop constraint if exists courses_live_price_bdt_check;
alter table public.courses add constraint courses_live_price_bdt_check check(live_price_bdt is null or live_price_bdt>=0);
alter table public.courses drop constraint if exists courses_recorded_price_bdt_check;
alter table public.courses add constraint courses_recorded_price_bdt_check check(recorded_price_bdt is null or recorded_price_bdt>=0);
alter table public.courses drop constraint if exists courses_offline_price_bdt_check;
alter table public.courses add constraint courses_offline_price_bdt_check check(offline_price_bdt is null or offline_price_bdt>=0);
alter table public.courses drop constraint if exists courses_capacity_check;
alter table public.courses add constraint courses_capacity_check check(capacity is null or capacity>0);
update public.courses set programme_group=case when slug='hsc-2027-chemistry' then 'HSC 2027' when slug='hsc-2028-chemistry' then 'HSC 2028' else 'Admission Batch' end,
 subjects=case when cardinality(subjects)=0 then array['Chemistry']::text[] else subjects end,
 live_price_bdt=coalesce(live_price_bdt,monthly_fee_bdt),
 recorded_price_bdt=coalesce(recorded_price_bdt,greatest(0,monthly_fee_bdt-100)),
 offline_price_bdt=coalesce(offline_price_bdt,monthly_fee_bdt),
 delivery_modes=array['live_recorded','recorded_only','offline']::text[],
 enrollment_open=is_published where archived_at is null;
create index if not exists courses_catalogue_idx on public.courses(programme_group,is_published,enrollment_open,sort_order,title) where archived_at is null;
drop policy if exists "staff manage courses" on public.courses;
drop policy if exists "admin manage course catalogue" on public.courses;
create policy "admin manage course catalogue" on public.courses for all to authenticated using(public.current_role()='admin') with check(public.current_role()='admin');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('jmt-course-media','jmt-course-media',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "JMT course images public read" on storage.objects;
create policy "JMT course images public read" on storage.objects for select using(bucket_id='jmt-course-media');
drop policy if exists "JMT admins upload course images" on storage.objects;
create policy "JMT admins upload course images" on storage.objects for insert to authenticated with check(bucket_id='jmt-course-media' and public.current_role()='admin');
drop policy if exists "JMT admins update course images" on storage.objects;
create policy "JMT admins update course images" on storage.objects for update to authenticated using(bucket_id='jmt-course-media' and public.current_role()='admin') with check(bucket_id='jmt-course-media' and public.current_role()='admin');
drop policy if exists "JMT admins delete course images" on storage.objects;
create policy "JMT admins delete course images" on storage.objects for delete to authenticated using(bucket_id='jmt-course-media' and public.current_role()='admin');
grant select on public.courses to anon,authenticated;
grant insert,update,delete on public.courses to authenticated;
