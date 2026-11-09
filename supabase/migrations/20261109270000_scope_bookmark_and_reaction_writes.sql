-- Bookmarks and reactions are append/remove user preferences. Their IDs and
-- creation timestamps are database-owned; there is no client update workflow.

revoke insert, update on table public.lesson_bookmarks from authenticated;
grant insert (lesson_id, student_id)
  on table public.lesson_bookmarks to authenticated;

revoke insert, update on table public.lesson_discussion_reactions from authenticated;
grant insert (discussion_id, user_id, reaction)
  on table public.lesson_discussion_reactions to authenticated;
