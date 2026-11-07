# Migration 0021 — discussion security and action throttling

## What it changes
- Adds a database trigger that replaces submitted discussion author names with the matching profile name.
- Prevents users from changing discussion identity/location fields after insertion.
- Allows discussion authors to edit only the comment body.
- Restricts pin/unpin changes to admins and teachers/staff assigned to that course. Students cannot set `is_pinned` during insertion or update.
- Adds a private rate-limit event table and an authenticated RPC: 6 lesson comments per minute and 3 manual payment submissions per 15 minutes per user.
- Does not delete or rewrite existing discussion rows, courses, enrollments, payments, or files.

## Apply
Back up the Supabase test project first. Run this file only on the test project:
`supabase/migrations/0021_secure_discussions_and_rate_limits.sql`.

The application changes in the matching pull request call the new RPC. Do not merge the pull request until the migration has been tested on the test project.

## Undo (test project only)
Rollback removes only objects introduced by this migration and restores the previous discussion UPDATE policy. It also removes the rate-limit event history. This reopens the old spoofing/pinning vulnerability, so rollback is not recommended for production.

```sql
drop trigger if exists lesson_discussions_guard_fields on public.lesson_discussions;
drop function if exists public.guard_lesson_discussion_fields();

drop policy if exists "authors and assigned teachers update discussion body or pin" on public.lesson_discussions;
create policy "authors and admins update discussions"
on public.lesson_discussions for update to authenticated
using (author_id = auth.uid() or public.current_role() = 'admin')
with check (author_id = auth.uid() or public.current_role() = 'admin');

drop function if exists public.consume_app_rate_limit(text);
drop table if exists public.app_rate_limit_events;
```
