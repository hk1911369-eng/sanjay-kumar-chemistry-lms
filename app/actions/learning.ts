'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { normalizeBangladeshMobile } from '@/lib/validation';

export async function saveLesson(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const courseId = String(formData.get('course_id') ?? '');
  const lessonId = String(formData.get('lesson_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const videoUrl = String(formData.get('video_url') ?? '').trim();
  const published = formData.get('published') === 'on';
  const chapterId = String(formData.get('chapter_id') ?? '').trim() || null;
  if (!courseId || title.length < 2 || title.length > 180 || content.length > 100000 || (videoUrl && !/^https:\/\//i.test(videoUrl))) redirect('/teacher?lesson_error=invalid');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher' && profile?.role !== 'staff') redirect('/portal');
  const { data: assignment } = await supabase.from('course_assignments').select('id').eq('course_id', courseId).eq('teacher_id', user.id).maybeSingle();
  if (profile.role !== 'admin' && !assignment) redirect('/teacher?lesson_error=forbidden');
  const { data: last } = await supabase.from('lessons').select('position').eq('course_id', courseId).order('position', { ascending: false }).limit(1).maybeSingle();
  const payload = { course_id: courseId, chapter_id: chapterId, title, description, content, video_url: videoUrl || null, is_published: published, updated_at: new Date().toISOString(), position: (last?.position ?? 0) + 1 };
  const result = lessonId
    ? await supabase.from('lessons').update({ chapter_id: chapterId, title, description, content, video_url: videoUrl || null, is_published: published, updated_at: new Date().toISOString() }).eq('id', lessonId).eq('course_id', courseId)
    : await supabase.from('lessons').insert(payload);
  if (result.error) redirect('/teacher?lesson_error=save');
  redirect('/teacher?lesson_success=1');
}

export async function markLessonComplete(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const lessonId = String(formData.get('lesson_id') ?? '');
  const courseId = String(formData.get('course_id') ?? '');
  if (!lessonId || !courseId) redirect('/student');
  const { data: lesson } = await supabase.from('lessons').select('id').eq('id', lessonId).eq('course_id', courseId).eq('is_published', true).maybeSingle();
  if (!lesson) redirect('/student?learning_error=unavailable');
  const { error } = await supabase.from('lesson_progress').upsert({ student_id: user.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'student_id,lesson_id' });
  redirect(error ? `/learn/${courseId}?progress_error=1` : `/learn/${courseId}?progress_saved=1`);
}

export async function assignTeacher(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');
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

export async function updateStudentProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const fullName = String(formData.get('full_name') ?? '').trim();
  const rawPhone = String(formData.get('phone') ?? '').trim();
  const phone = rawPhone ? normalizeBangladeshMobile(rawPhone) : null;
  if (fullName.length < 2 || fullName.length > 100 || (rawPhone && !phone)) redirect('/student?profile_error=invalid');
  const { error } = await supabase.from('profiles').update({ full_name: fullName, phone: phone || null, updated_at: new Date().toISOString() }).eq('id', user.id);
  redirect(error ? '/student?profile_error=save' : '/student?profile_success=1');
}

export async function setCoursePublication(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');
  const courseId = String(formData.get('course_id') ?? '');
  const publish = formData.get('published') === 'on';
  const { data: course } = await supabase.from('courses').select('slug,price_bdt').eq('id', courseId).maybeSingle();
  if (!course || !['hsc-2027-chemistry','hsc-2028-chemistry','admission-chemistry'].includes(course.slug) || course.price_bdt !== 700) redirect('/admin?course_error=invalid');
  const { error } = await supabase.from('courses').update({ is_published: publish }).eq('id', courseId);
  redirect(error ? '/admin?course_error=save' : '/admin?course_success=1');
}

export async function saveChapter(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher' && profile?.role !== 'staff') redirect('/portal');
  const courseId = String(formData.get('course_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  if (!courseId || title.length < 1 || title.length > 180) redirect('/teacher?chapter_error=invalid');
  const { data: assignment } = await supabase.from('course_assignments').select('id').eq('course_id', courseId).eq('teacher_id', user.id).maybeSingle();
  if (profile.role !== 'admin' && !assignment) redirect('/teacher?chapter_error=forbidden');
  const { data: last } = await supabase.from('chapters').select('sort_order').eq('course_id', courseId).order('sort_order', {ascending:false}).limit(1).maybeSingle();
  const { error } = await supabase.from('chapters').insert({ course_id: courseId, title, description, sort_order: (last?.sort_order ?? 0)+1, published: formData.get('published') === 'on' });
  redirect(error ? '/teacher?chapter_error=save' : '/teacher?chapter_success=1');
}
