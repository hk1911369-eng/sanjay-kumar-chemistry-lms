import { PortalLayout } from '@/components/portal-layout';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { LessonResourceAccess } from '@/components/lesson-resource-access';
import { createClient } from '@/lib/supabase/server';
import { billingMonthEnd, currentBangladeshBillingPeriod } from '@/lib/pricing';
import {
  markLessonComplete, postLessonDiscussion, toggleLessonReaction, toggleLessonBookmark, pinLessonDiscussion,
} from '@/app/actions/learning';

type Resource = {
  id: string; lesson_id: string; file_name: string; mime_type: string; file_size: number;
  resource_type: string; caption: string; downloadable: boolean; storage_path: string;
};

export default async function LearningPage({
  params, searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ progress_saved?: string; progress_error?: string; q?: string; discussion_error?: string; reaction_error?: string; bookmark_error?: string }>;
}) {
  const { courseId } = await params;
  const query = await searchParams;
  const search = (query.q ?? '').trim().toLowerCase();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: course }, { data: enrollment }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('courses').select('id,title,description').eq('id', courseId).maybeSingle(),
    supabase.from('enrollments').select('status,delivery_mode,admission_fee_paid,paid_through').eq('student_id', user.id).eq('course_id', courseId).maybeSingle(),
  ]);
  if (!course) notFound();
  const isStaff = ['admin', 'teacher', 'staff'].includes(profile?.role ?? '');
  const currentPaidThrough = enrollment?.paid_through && enrollment.paid_through >= billingMonthEnd(currentBangladeshBillingPeriod());
  if (!isStaff && enrollment?.status !== 'active') redirect('/student?learning_error=not_enrolled');
  if (!isStaff && (!enrollment?.admission_fee_paid || !currentPaidThrough)) redirect('/student?learning_error=payment_due');
  const portalRole = profile?.role === 'admin' ? 'admin' : profile?.role === 'teacher' ? 'teacher' : profile?.role === 'staff' ? 'staff' : 'student';

  const [{ data: lessons }, { data: progress }, { data: chapters }, { data: bookmarks }] = await Promise.all([
    supabase.from('lessons').select('id,title,description,content,video_url,position,is_published,chapter_id').eq('course_id', courseId).eq('is_published', true).order('position'),
    supabase.from('lesson_progress').select('lesson_id,completed').eq('student_id', user.id),
    supabase.from('chapters').select('id,title,sort_order').eq('course_id', courseId).eq('published', true).order('sort_order'),
    supabase.from('lesson_bookmarks').select('lesson_id').eq('student_id', user.id),
  ]);
  const lessonIds = (lessons ?? []).map(l => l.id);
  const [{ data: rawResources }, { data: discussions }] = lessonIds.length ? await Promise.all([
    supabase.from('lesson_resources').select('id,lesson_id,file_name,mime_type,file_size,resource_type,caption,downloadable,storage_path').in('lesson_id', lessonIds).order('created_at'),
    supabase.from('lesson_discussions').select('id,lesson_id,parent_id,author_id,author_name,body,is_pinned,created_at').in('lesson_id', lessonIds).order('created_at'),
  ]) : [{ data: [] as Resource[] }, { data: [] as any[] }];
  const authorIds = [...new Set((discussions ?? []).map((d: any) => d.author_id))];
  const { data: authorProfiles } = authorIds.length
    ? await supabase.from('profiles').select('id,role').in('id', authorIds)
    : { data: [] as any[] };
  const authorRoles = new Map((authorProfiles ?? []).map((p: any) => [p.id, p.role]));
  const discussionIds = (discussions ?? []).map(d => d.id);
  const { data: reactions } = discussionIds.length
    ? await supabase.from('lesson_discussion_reactions').select('discussion_id,user_id,reaction').in('discussion_id', discussionIds)
    : { data: [] as any[] };

  const resources = (rawResources ?? []).map((r: Resource) => ({
    ...r, file_name: r.file_name.replace(/sanjay[-_ ]*kumar[-_ ]*chemistry/ig, 'JMT Academy'),
  }));
