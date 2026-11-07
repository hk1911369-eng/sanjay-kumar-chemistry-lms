'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function actor() {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) redirect('/login');
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();
 if(!profile) redirect('/portal');
 return {supabase,user,role:profile.role as string};
}
async function canTeach(supabase:any,userId:string,role:string,courseId:string) {
 if(role==='admin') return true;
 if(!['teacher','staff'].includes(role)) return false;
 const {data}=await supabase.from('course_assignments').select('id').eq('course_id',courseId).eq('teacher_id',userId).maybeSingle();
 return !!data;
}

export async function createLiveClass(formData:FormData) {
 const {supabase,user,role}=await actor();
 const courseId=String(formData.get('course_id')||'');
 const title=String(formData.get('title')||'').trim();
 const starts=String(formData.get('starts_at')||'');
 const ends=String(formData.get('ends_at')||'');
 const meeting=String(formData.get('meeting_url')||'').trim();
 if(!courseId||title.length<3||!starts||!ends||new Date(ends)<=new Date(starts)|| (meeting&&!/^https:\/\//i.test(meeting))) redirect('/academic?error=class');
 if(!await canTeach(supabase,user.id,role,courseId)) redirect('/academic?error=permission');
 const {error}=await supabase.from('live_classes').insert({course_id:courseId,title,starts_at:new Date(starts).toISOString(),ends_at:new Date(ends).toISOString(),meeting_url:meeting||null,created_by:user.id});
 redirect(error?'/academic?error=class':'/academic?saved=class');
}

export async function createAssignment(formData:FormData) {
 const {supabase,user,role}=await actor();
 const courseId=String(formData.get('course_id')||'');
 const title=String(formData.get('title')||'').trim();
 const instructions=String(formData.get('instructions')||'').trim();
 const due=String(formData.get('due_at')||'');
 const marks=Number(formData.get('max_marks')||100);
 const url=String(formData.get('attachment_url')||'').trim();
 if(!courseId||title.length<3||instructions.length>10000||!Number.isFinite(marks)||marks<=0||(url&&!/^https:\/\//i.test(url))) redirect('/academic?error=assignment');
 if(!await canTeach(supabase,user.id,role,courseId)) redirect('/academic?error=permission');
 const {error}=await supabase.from('assignments').insert({course_id:courseId,title,instructions,due_at:due?new Date(due).toISOString():null,max_marks:marks,attachment_url:url||null,published:formData.get('published')==='on',created_by:user.id});
 redirect(error?'/academic?error=assignment':'/academic?saved=assignment');
}

export async function submitAssignment(formData:FormData) {
 const {supabase,user,role}=await actor();
 if(role!=='student') redirect('/portal');
 const assignmentId=String(formData.get('assignment_id')||'');
 const answer=String(formData.get('answer_text')||'').trim();
 const url=String(formData.get('attachment_url')||'').trim();
 if(!assignmentId||(!answer&&!url)||answer.length>12000||(url&&!/^https:\/\//i.test(url))) redirect('/academic?error=submission');
 const {data:existing}=await supabase.from('assignment_submissions').select('id,marks').eq('assignment_id',assignmentId).eq('student_id',user.id).maybeSingle();
 if(existing?.marks!==null&&existing?.marks!==undefined) redirect('/academic?error=already_graded');
 const {error}=await supabase.from('assignment_submissions').upsert({assignment_id:assignmentId,student_id:user.id,answer_text:answer,attachment_url:url||null,submitted_at:new Date().toISOString()},{onConflict:'assignment_id,student_id'});
 redirect(error?'/academic?error=submission':'/academic?saved=submission');
}

export async function gradeAssignment(formData:FormData) {
 const {supabase,user,role}=await actor();
 if(!['admin','teacher','staff'].includes(role)) redirect('/portal');
 const submissionId=String(formData.get('submission_id')||'');
 const marks=Number(formData.get('marks'));
 const feedback=String(formData.get('teacher_feedback')||'').trim();
 const {data:submission}=await supabase.from('assignment_submissions').select('id,assignment_id,assignment:assignments(course_id,max_marks)').eq('id',submissionId).maybeSingle();
 const a:any=submission?.assignment;
 if(!submission||!a||!await canTeach(supabase,user.id,role,a.course_id)||!Number.isFinite(marks)||marks<0||marks>a.max_marks||feedback.length>4000) redirect('/academic?error=grading');
 const {error}=await supabase.from('assignment_submissions').update({marks,teacher_feedback:feedback,graded_by:user.id,graded_at:new Date().toISOString()}).eq('id',submissionId);
 redirect(error?'/academic?error=grading':'/academic?saved=grade');
}

export async function createQuiz(formData:FormData) {
 const {supabase,user,role}=await actor();
 const courseId=String(formData.get('course_id')||'');
 const title=String(formData.get('title')||'').trim();
 const duration=Number(formData.get('duration_minutes')||30);
 const lines=String(formData.get('questions_json')||'');
 if(!courseId||title.length<3||duration<1||duration>300||lines.length>30000||!await canTeach(supabase,user.id,role,courseId)) redirect('/academic?error=quiz');
 let questions:any[];
 try { questions=JSON.parse(lines); } catch { redirect('/academic?error=quiz_format'); }
 if(!Array.isArray(questions)||questions.length<1||questions.length>50||questions.some(q=>!q||typeof q!=='object'||typeof q.question_text!=='string'||q.question_text.trim().length<2||!Array.isArray(q.options)||q.options.length<2||q.options.length>6||!Number.isInteger(q.correct_option)||q.correct_option<0||q.correct_option>=q.options.length||!Number.isFinite(Number(q.marks))||Number(q.marks)<=0)) redirect('/academic?error=quiz_format');
 const total=questions.reduce((s,q)=>s+Number(q.marks),0);
 const {data:quiz,error}=await supabase.from('quizzes').insert({course_id:courseId,title,duration_minutes:duration,total_marks:total,published:formData.get('published')==='on',created_by:user.id}).select('id').single();
 if(error||!quiz) redirect('/academic?error=quiz');
 const rows=questions.map((q,i)=>({quiz_id:quiz.id,question_text:q.question_text.trim(),options:q.options,marks:Number(q.marks),position:i+1}));
 const inserted=await supabase.from('quiz_questions').insert(rows).select('id');
 if(inserted.error||!inserted.data) { await supabase.from('quizzes').delete().eq('id',quiz.id); redirect('/academic?error=quiz'); }
 const keys=inserted.data.map((row,i)=>({question_id:row.id,correct_option:questions[i].correct_option}));
 const keyInsert=await supabase.from('quiz_answer_keys').insert(keys);
 if(keyInsert.error) { await supabase.from('quizzes').delete().eq('id',quiz.id); redirect('/academic?error=quiz'); }
 redirect('/academic?saved=quiz');
}

export async function startQuiz(formData:FormData) {
 const {supabase,user,role}=await actor();
 if(role!=='student') redirect('/portal');
 const quizId=String(formData.get('quiz_id')||'');
 const {data:quiz}=await supabase.from('quizzes').select('id').eq('id',quizId).eq('published',true).maybeSingle();
 if(!quiz) redirect('/academic?error=quiz_unavailable');
 const {data:existing}=await supabase.from('quiz_attempts').select('id').eq('quiz_id',quizId).eq('student_id',user.id).maybeSingle();
 if(!existing) { const {error}=await supabase.from('quiz_attempts').insert({quiz_id:quizId,student_id:user.id,answers:{},started_at:new Date().toISOString()}); if(error) redirect('/academic?error=attempt_exists'); }
 redirect('/academic?attempt='+quizId);
}

export async function submitQuiz(formData:FormData) {
 const {supabase,user,role}=await actor();
 if(role!=='student') redirect('/portal');
 const quizId=String(formData.get('quiz_id')||'');
 const answers:Record<string,number>={};
 for(const [key,value] of formData.entries()) {
  if(key.startsWith('q_')) {
   const option=Number(value);
   if(!Number.isInteger(option)||option<0||option>5) redirect('/academic?error=answers');
   answers[key.slice(2)]=option;
  }
 }
 if(!quizId||Object.keys(answers).length>50) redirect('/academic?error=answers');
 const {error}=await supabase.rpc('submit_quiz_attempt',{p_quiz_id:quizId,p_answers:answers});
 redirect(error?'/academic?error=submit':'/academic?saved=result');
}
