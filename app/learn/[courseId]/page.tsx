import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { markLessonComplete } from '@/app/actions/learning';
export default async function LearningPage({params,searchParams}:{params:Promise<{courseId:string}>;searchParams:Promise<{progress_saved?:string;progress_error?:string}>}){
 const {courseId}=await params; const query=await searchParams; const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect('/login');
 const [{data:profile},{data:course},{data:enrollment}]=await Promise.all([
  supabase.from('profiles').select('role').eq('id',user.id).single(),
  supabase.from('courses').select('id,title,description').eq('id',courseId).maybeSingle(),
  supabase.from('enrollments').select('status').eq('student_id',user.id).eq('course_id',courseId).maybeSingle()
 ]);
 if(!course) notFound();
 const adminOrTeacher=profile?.role==='admin'||profile?.role==='teacher';
 if(enrollment?.status!=='active' && !adminOrTeacher) redirect('/student?learning_error=not_enrolled');
 const [{data:lessons},{data:progress},{data:chapters}]=await Promise.all([
  supabase.from('lessons').select('id,title,description,content,video_url,position,is_published,chapter_id').eq('course_id',courseId).eq('is_published',true).order('position'),
  supabase.from('lesson_progress').select('lesson_id,completed').eq('student_id',user.id),
  supabase.from('chapters').select('id,title,sort_order').eq('course_id',courseId).eq('published',true).order('sort_order')
 ]);
 const done=new Set((progress??[]).filter(p=>p.completed).map(p=>p.lesson_id));
 const chapterNames=new Map((chapters??[]).map((ch:any)=>[ch.id,ch.title] as const));
 return <main className="portal-shell"><header className="portal-header"><Link className="brand" href="/student">⚗ SANJAY KUMAR CHEMISTRY</Link><Link href="/student">My courses</Link></header><section className="portal-content"><span className="auth-kicker">LEARNING SPACE</span><h1>{course.title}</h1><p className="muted">{course.description}</p>{query.progress_saved&&<p className="form-success">Lesson progress saved.</p>}{query.progress_error&&<p className="form-error">Progress could not be saved.</p>}<div className="portal-stats"><article><b>{done.size}</b><span>Lessons completed</span></article><article><b>{lessons?.length??0}</b><span>Published lessons</span></article><article><b>{lessons?.length?Math.round(done.size/lessons.length*100):0}%</b><span>Course progress</span></article></div>
 {(lessons??[]).length===0&&<p className="muted">No lessons have been published for this course yet.</p>}
 <div className="portal-grid">{(lessons??[]).map(l=><article className="portal-card" key={l.id}><span className="auth-kicker">{l.chapter_id?chapterNames.get(l.chapter_id)??'LESSON':'LESSON'} · {l.position}</span><h3>{l.title}</h3>{l.description&&<p>{l.description}</p>}{l.content&&<div className="lesson-content">{l.content.split('\n').map((line,i)=><p key={i}>{line}</p>)}</div>}{l.video_url&&<p><a href={l.video_url} target="_blank" rel="noreferrer">Open lesson video ↗</a></p>}<p>{done.has(l.id)?<span className="status-approved">Completed</span>:<span className="status-pending">Not completed</span>}</p>{!done.has(l.id)&&<form action={markLessonComplete}><input type="hidden" name="lesson_id" value={l.id}/><input type="hidden" name="course_id" value={courseId}/><button className="auth-submit">Mark as completed</button></form>}</article>)}</div></section></main>
}
