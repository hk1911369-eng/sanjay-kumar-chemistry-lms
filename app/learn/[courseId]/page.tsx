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
    supabase.from('profiles').select('role,is_active').eq('id', user.id).single(),
    supabase.from('courses').select('id,title,description').eq('id', courseId).maybeSingle(),
    supabase.from('enrollments').select('status,delivery_mode,admission_fee_paid,paid_through').eq('student_id', user.id).eq('course_id', courseId).maybeSingle(),
  ]);
  if (!profile || profile.is_active !== true) redirect('/portal');
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

  const done = new Set((progress ?? []).filter(p => p.completed).map(p => p.lesson_id));
  const saved = new Set((bookmarks ?? []).map(b => b.lesson_id));
  const chapterNames = new Map((chapters ?? []).map((ch: any) => [ch.id, ch.title] as const));
  const reactionSummary = (discussionId: string, reaction: string) => ({
    count: (reactions ?? []).filter((r: any) => r.discussion_id === discussionId && r.reaction === reaction).length,
    mine: (reactions ?? []).some((r: any) => r.discussion_id === discussionId && r.reaction === reaction && r.user_id === user.id),
  });
  const filteredLessons = (lessons ?? []).filter(l => {
    if (!search) return true;
    const attached = resources.filter(r => r.lesson_id === l.id).map(r => r.file_name + ' ' + r.caption).join(' ');
    return (l.title + ' ' + l.description + ' ' + l.content + ' ' + attached).toLowerCase().includes(search);
  });
  const discussionError = query.discussion_error || query.reaction_error || query.bookmark_error;

  return (
    <PortalLayout role={portalRole} active="learning" title={course.title} returnTo={isStaff ? '/teacher' : '/student'}>
      <section className="portal-content">
        <span className="auth-kicker">JMT ACADEMY · LEARNING SPACE</span>
        <h1>{course.title}</h1>
        <p className="muted">{course.description}</p>
        {query.progress_saved && <p className="form-success">Lesson progress saved.</p>}
        {query.progress_error && <p className="form-error">Progress could not be saved.</p>}
        {discussionError && <p className="form-error">{discussionError === 'rate_limit' ? 'You have posted too many comments. Please wait a minute and try again.' : 'That action could not be completed. Please try again.'}</p>}
        <div className="portal-stats">
          <article><b>{done.size}</b><span>Lessons completed</span></article>
          <article><b>{lessons?.length ?? 0}</b><span>Published lessons</span></article>
          <article><b>{lessons?.length ? Math.round(done.size / lessons.length * 100) : 0}%</b><span>Course progress</span></article>
          <article><b>{resources.length}</b><span>Study files</span></article>
        </div>

        <form method="get" className="lesson-search">
          <input name="q" defaultValue={query.q ?? ''} placeholder="Search lessons, PDFs, slides and class files…" aria-label="Search course materials"/>
          <button className="auth-submit">Search</button>
          {search && <Link href={'/learn/' + courseId}>Clear</Link>}
        </form>

        {!filteredLessons.length && <p className="muted">{search ? 'No lessons or files matched your search.' : 'No lessons have been published for this course yet.'}</p>}
        <div className="learning-list">
          {filteredLessons.map(l => {
            const lessonResources = resources.filter(r => r.lesson_id === l.id);
            const lessonDiscussions = (discussions ?? []).filter(d => d.lesson_id === l.id);
            const roots = lessonDiscussions.filter(d => !d.parent_id);
            return (
              <article className="portal-card learning-lesson" id={'lesson-' + l.id} key={l.id}>
                <span className="auth-kicker">{l.chapter_id ? chapterNames.get(l.chapter_id) ?? 'LESSON' : 'LESSON'} · {l.position}</span>
                <h2>{l.title}</h2>
                {l.description && <p>{l.description}</p>}
                {l.content && <div className="lesson-content">{l.content.split('\n').map((line: string, i: number) => <p key={i}>{line}</p>)}</div>}
                {l.video_url && <div className="lesson-video jmt-video-player"><div className="video-brand"><span>J</span><b>JMT ACADEMY</b><small>OFFICIAL LEARNING PLAYER</small></div><video controls playsInline preload="metadata" src={l.video_url}>Your browser does not support video playback.</video></div>}

                {!!lessonResources.length && <section className="lesson-materials">
                  <h3>Class videos, slides and files</h3>
                  {lessonResources.map(r => <div className="resource-card" key={r.id}>
                    <div className="resource-meta">
                      <b>{r.file_name}</b>
                      <span>{r.resource_type.toUpperCase()} · {(Number(r.file_size) / 1024 / 1024).toFixed(1)} MB</span>
                      {r.caption && <small>{r.caption}</small>}
                    </div>
                    <LessonResourceAccess resource={{ id: r.id, file_name: r.file_name, resource_type: r.resource_type, downloadable: r.downloadable }}/>
                  </div>)}
                </section>}

                <div className="lesson-actions">
                  <form action={toggleLessonBookmark}>
                    <input type="hidden" name="lesson_id" value={l.id}/>
                    <input type="hidden" name="course_id" value={courseId}/>
                    <button className="quiet-button">{saved.has(l.id) ? '★ Saved lesson' : '☆ Save lesson'}</button>
                  </form>
                  <span>{done.has(l.id) ? <span className="status-approved">Completed</span> : <span className="status-pending">Not completed</span>}</span>
                  {!done.has(l.id) && <form action={markLessonComplete}>
                    <input type="hidden" name="lesson_id" value={l.id}/>
                    <input type="hidden" name="course_id" value={courseId}/>
                    <button className="auth-submit">Mark as completed</button>
                  </form>}
                </div>

                <section className="lesson-discussion" id={'discussion-' + l.id}>
                  <h3>Class discussion & questions</h3>
                  <p className="muted">Ask a doubt, discuss this lesson or reply to your classmates. Keep comments respectful and related to your course.</p>
                  {roots.map(d => {
                    const replies = lessonDiscussions.filter(reply => reply.parent_id === d.id);
                    const like = reactionSummary(d.id, 'like');
                    const love = reactionSummary(d.id, 'love');
                    const helpful = reactionSummary(d.id, 'helpful');
                    return <div className="discussion-post" key={d.id}>
                      <div className="discussion-author"><b>{d.author_name || 'Member'}</b>{['teacher','staff'].includes(authorRoles.get(d.author_id) ?? '') && <span className="status-approved">Teacher</span>}<small>{new Date(d.created_at).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' })}{d.is_pinned ? ' · Pinned' : ''}</small>{isStaff && <form action={pinLessonDiscussion}><input type="hidden" name="discussion_id" value={d.id}/><input type="hidden" name="course_id" value={courseId}/><input type="hidden" name="pinned" value={String(!d.is_pinned)}/><button className="quiet-button">{d.is_pinned ? 'Unpin' : 'Pin comment'}</button></form>}</div>
                      <p>{d.body}</p>
                      <div className="reaction-row">
                        {(['like','love','helpful'] as const).map(kind => {
                          const item = kind === 'like' ? like : kind === 'love' ? love : helpful;
                          const label = kind === 'like' ? '👍 Like' : kind === 'love' ? '❤️ Love' : '💡 Helpful';
                          return <form action={toggleLessonReaction} key={kind}>
                            <input type="hidden" name="discussion_id" value={d.id}/>
                            <input type="hidden" name="reaction" value={kind}/>
                            <button className={item.mine ? 'reaction-active' : 'reaction-button'}>{label} · {item.count}</button>
                          </form>;
                        })}
                      </div>
                      {replies.map(reply => <div className="discussion-reply" key={reply.id}>
                        <b>{reply.author_name || 'Member'}</b>{['teacher','staff'].includes(authorRoles.get(reply.author_id) ?? '') && <span className="status-approved">Teacher</span>}<p>{reply.body}</p>
                      </div>)}
                      <details className="reply-details"><summary>Reply to this comment</summary>
                        <form action={postLessonDiscussion} className="discussion-form">
                          <input type="hidden" name="lesson_id" value={l.id}/>
                          <input type="hidden" name="course_id" value={courseId}/>
                          <input type="hidden" name="parent_id" value={d.id}/>
                          <textarea name="body" rows={2} minLength={2} maxLength={3000} required placeholder="Write a helpful reply…"/>
                          <button className="auth-submit">Post reply</button>
                        </form>
                      </details>
                    </div>;
                  })}
                  {!roots.length && <p className="muted">No comments yet. Start the discussion with your first question.</p>}
                  <form action={postLessonDiscussion} className="discussion-form">
                    <input type="hidden" name="lesson_id" value={l.id}/>
                    <input type="hidden" name="course_id" value={courseId}/>
                    <textarea name="body" rows={3} minLength={2} maxLength={3000} required placeholder="Ask a question or share a useful explanation…"/>
                    <button className="auth-submit">Post comment / question</button>
                  </form>
                </section>
              </article>
            );
          })}
        </div>
      </section>
    </PortalLayout>
  );
}
