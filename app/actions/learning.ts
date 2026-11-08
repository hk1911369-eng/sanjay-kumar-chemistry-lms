'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole, requireAdmin, requireUser, requireCourseStaff } from '@/lib/auth/require-role';

export async function saveLesson(formData: FormData) {
  const courseId = String(formData.get('course_id') ?? '');
  const { supabase, user } = await requireCourseStaff(courseId);
  const lessonId = String(formData.get('lesson_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const videoUrl = String(formData.get('video_url') ?? '').trim();
  const published = formData.get('published') === 'on';
  const chapterId = String(formData.get('chapter_id') ?? '').trim() || null;
  if (!courseId || title.length < 2 || title.length > 180 || content.length > 100000 || (videoUrl && !/^https:\/\//i.test(videoUrl))) redirect('/teacher?lesson_error=invalid');
  const payload = { course_id: courseId, chapter_id: chapterId, title, description, content, video_url: videoUrl || null, is_published: published, updated_at: new Date().toISOString() };
  const result = lessonId
    ? await supabase.from('lessons').update({ chapter_id: chapterId, title, description, content, video_url: videoUrl || null, is_published: published, updated_at: new Date().toISOString() }).eq('id', lessonId).eq('course_id', courseId)
    : await supabase.from('lessons').insert(payload);
  if (result.error) redirect('/teacher?lesson_error=save');
  redirect('/teacher?lesson_success=1');
}

export async function markLessonComplete(formData: FormData) {
  const { supabase, user } = await requireRole(['student']);
  const lessonId = String(formData.get('lesson_id') ?? '');
  const courseId = String(formData.get('course_id') ?? '');
  if (!lessonId || !courseId) redirect('/student');
  const { data: lesson } = await supabase.from('lessons').select('id').eq('id', lessonId).eq('course_id', courseId).eq('is_published', true).maybeSingle();
  if (!lesson) redirect('/student?learning_error=unavailable');
  const { error } = await supabase.from('lesson_progress').upsert({ student_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'student_id,lesson_id' });
  redirect(error ? `/learn/${courseId}?progress_error=1` : `/learn/${courseId}?progress_saved=1`);
}

export async function assignTeacher(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const courseId = String(formData.get('course_id') ?? '');
  const teacherId = String(formData.get('teacher_id') ?? '');
  const [{ data: course }, { data: teacher }] = await Promise.all([
    supabase.from('courses').select('id').eq('id', courseId).maybeSingle(),
    supabase.from('profiles').select('id').eq('id', teacherId).in('role', ['teacher','staff']).maybeSingle()
  ]);
  if (!course || !teacher) redirect('/admin?assignment_error=invalid');
  const { error } = await supabase.from('course_assignments').upsert({ course_id: courseId, teacher_id: teacherId, assigned_by: user.id }, { onConflict: 'course_id,teacher_id' });
  redirect(error ? '/admin?assignment_error=save' : '/admin?assignment_success=1');
}

export async function publishAnnouncement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');
  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const publish = formData.get('published') === 'on';
  if (title.length < 3 || title.length > 180 || body.length < 3 || body.length > 10000) redirect('/admin?announcement_error=invalid');
  const { error } = await supabase.from('notices').insert({ title, body, created_by: user.id, published_at: publish ? new Date().toISOString() : null });
  redirect(error ? '/admin?announcement_error=save' : '/admin?announcement_success=1');
}

export async function setCoursePublication(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');
  const courseId = String(formData.get('course_id') ?? '');
  const publish = formData.get('published') === 'on';
  const { data: course } = await supabase.from('courses').select('id').eq('id', courseId).maybeSingle();
  if (!course) redirect('/admin?course_error=invalid');
  const { error } = await supabase.from('courses').update({ is_published: publish }).eq('id', courseId);
  redirect(error ? '/admin?course_error=save' : '/admin?course_success=1');
}

export async function saveChapter(formData: FormData) {
  const courseId = String(formData.get('course_id') ?? '');
  const { supabase, user } = await requireCourseStaff(courseId);
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!courseId || title.length < 1 || title.length > 180) redirect('/teacher?chapter_error=invalid');
  const { error } = await supabase.from('chapters').insert({ course_id: courseId, title, description, published: formData.get('published') === 'on' });
  redirect(error ? '/teacher?chapter_error=save' : '/teacher?chapter_success=1');
}



export async function getLessonResourceUrl(resourceId: string, mode: 'preview' | 'download') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !resourceId || !['preview','download'].includes(mode)) return { url: null, error: 'unauthorized' as const };
  const { data: resource } = await supabase.from('lesson_resources')
    .select('id,storage_path,file_name,downloadable').eq('id', resourceId).maybeSingle();
  if (!resource || (mode === 'download' && !resource.downloadable)) return { url: null, error: 'unavailable' as const };
  const downloadName = 'JMT-Academy-' + resource.file_name
    .replace(/sanjay[-_ ]*kumar[-_ ]*chemistry/ig, 'JMT-Academy')
    .replace(/[^a-zA-Z0-9._-]+/g, '-');
  const result = await supabase.storage.from('lesson-materials').createSignedUrl(
    resource.storage_path, 300, mode === 'download' ? { download: downloadName } : undefined
  );
  return result.error ? { url: null, error: 'unavailable' as const } : { url: result.data.signedUrl, error: null };
}

export async function postLessonDiscussion(formData: FormData) {
  const { supabase, user } = await requireUser();
  const lessonId = String(formData.get('lesson_id') ?? '');
  const courseId = String(formData.get('course_id') ?? '');
  const parentId = String(formData.get('parent_id') ?? '').trim() || null;
  const body = String(formData.get('body') ?? '').trim();
  if (!lessonId || !courseId || body.length < 2 || body.length > 3000) redirect('/student');
  const { data: allowed } = await supabase.rpc('consume_app_rate_limit', { p_action: 'lesson_discussion' });
  if (!allowed) redirect('/learn/' + courseId + '?discussion_error=rate_limit#discussion-' + lessonId);
  const { data: lesson } = await supabase.from('lessons').select('id,course_id').eq('id', lessonId).eq('course_id', courseId).maybeSingle();
  if (!lesson) redirect('/student');
  const { error } = await supabase.from('lesson_discussions').insert({
    lesson_id: lessonId, course_id: courseId, parent_id: parentId,
    author_id: user.id, body,
  });
  if (error) redirect('/learn/' + courseId + '?discussion_error=1#discussion-' + lessonId);
  revalidatePath('/learn/' + courseId);
  redirect('/learn/' + courseId + '#discussion-' + lessonId);
}


export async function pinLessonDiscussion(formData: FormData) {
  const discussionId = String(formData.get('discussion_id') ?? '').trim();
  const { supabase, user } = await requireCourseStaff(String(formData.get('course_id') ?? '').trim());
  const courseId = String(formData.get('course_id') ?? '').trim();
  const pinned = String(formData.get('pinned') ?? '') === 'true';
  if (!discussionId || !courseId) redirect('/student');
  const { error } = await supabase.from('lesson_discussions').update({ is_pinned: pinned })
    .eq('id', discussionId).eq('course_id', courseId);
  if (error) redirect('/learn/' + courseId + '?discussion_error=1');
  revalidatePath('/learn/' + courseId);
  redirect('/learn/' + courseId);
}

export async function toggleLessonReaction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const discussionId = String(formData.get('discussion_id') ?? '');
  const reaction = String(formData.get('reaction') ?? '');
  if (!discussionId || !['like','love','helpful'].includes(reaction)) redirect('/student');
  const { data: discussion } = await supabase.from('lesson_discussions')
    .select('id,course_id,lesson_id').eq('id', discussionId).maybeSingle();
  if (!discussion) redirect('/student');
  const { data: existing } = await supabase.from('lesson_discussion_reactions')
    .select('id').eq('discussion_id', discussionId).eq('user_id', user.id).eq('reaction', reaction).maybeSingle();
  const result = existing
    ? await supabase.from('lesson_discussion_reactions').delete().eq('id', existing.id)
    : await supabase.from('lesson_discussion_reactions').insert({ discussion_id: discussionId, user_id: user.id, reaction });
  if (result.error) redirect('/learn/' + discussion.course_id + '?reaction_error=1#discussion-' + discussion.lesson_id);
  revalidatePath('/learn/' + discussion.course_id);
  redirect('/learn/' + discussion.course_id + '#discussion-' + discussion.lesson_id);
}

export async function toggleLessonBookmark(formData: FormData) {
  const { supabase, user } = await requireRole(['student']);
  const lessonId = String(formData.get('lesson_id') ?? '');
  const courseId = String(formData.get('course_id') ?? '');
  if (!lessonId || !courseId) redirect('/student');
  const { data: existing } = await supabase.from('lesson_bookmarks')
    .select('id').eq('lesson_id', lessonId).eq('student_id', user.id).maybeSingle();
  const result = existing
    ? await supabase.from('lesson_bookmarks').delete().eq('id', existing.id)
    : await supabase.from('lesson_bookmarks').insert({ lesson_id: lessonId, student_id: user.id });
  if (result.error) redirect('/learn/' + courseId + '?bookmark_error=1');
  revalidatePath('/learn/' + courseId);
  redirect('/learn/' + courseId + '#lesson-' + lessonId);
}
