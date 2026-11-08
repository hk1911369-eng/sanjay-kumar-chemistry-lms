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
function parseDhakaDateTime(value:string):string|null {
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null;
 const normalized=value.length===16?value+':00':value;
 const parsed=new Date(normalized+'+06:00');
 return Number.isNaN(parsed.getTime())?null:parsed.toISOString();
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
 const startRaw=String(formData.get('starts_at')||'');
 const endRaw=String(formData.get('ends_at')||'');
 const startsAt=startRaw?parseDhakaDateTime(startRaw):null;
 const endsAt=endRaw?parseDhakaDateTime(endRaw):null;
 const lines=String(formData.get('questions_json')||'');
 if(!courseId||title.length<3||duration<1||duration>300||Boolean(startRaw)!==Boolean(endRaw)||(startRaw&&(!startsAt||!endsAt||new Date(endsAt)<=new Date(startsAt)))||lines.length>30000||!await canTeach(supabase,user.id,role,courseId)) redirect('/academic?error=quiz');
 let questions:any[];
 try { questions=JSON.parse(lines); } catch { redirect('/academic?error=quiz_format'); }
 if(!Array.isArray(questions)||questions.length<1||questions.length>50||questions.some(q=>!q||typeof q!=='object'||typeof q.question_text!=='string'||q.question_text.trim().length<2||!Array.isArray(q.options)||q.options.length<2||q.options.length>6||!Number.isInteger(q.correct_option)||q.correct_option<0||q.correct_option>=q.options.length||!Number.isFinite(Number(q.marks))||Number(q.marks)<=0||(q.concept_id!==undefined&&q.concept_id!==null&&(typeof q.concept_id!=='string'||! /^[0-9a-f-]{36}$/i.test(q.concept_id))))) redirect('/academic?error=quiz_format');
 const total=questions.reduce((s,q)=>s+Number(q.marks),0);
 const {data:quiz,error}=await supabase.from('quizzes').insert({course_id:courseId,title,duration_minutes:duration,starts_at:startsAt,ends_at:endsAt,total_marks:total,published:formData.get('published')==='on',created_by:user.id}).select('id').single();
 if(error||!quiz) redirect('/academic?error=quiz');
 const rows=questions.map((q,i)=>({quiz_id:quiz.id,concept_id:q.concept_id||null,question_text:q.question_text.trim(),options:q.options,marks:Number(q.marks),position:i+1}));
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
 const {data:quiz}=await supabase.from('quizzes').select('id,starts_at,ends_at').eq('id',quizId).eq('published',true).maybeSingle();
 const now=Date.now();
 if(!quiz||(quiz.starts_at&&new Date(quiz.starts_at).getTime()>now)||(quiz.ends_at&&new Date(quiz.ends_at).getTime()<now)) redirect('/academic?error=quiz_unavailable');
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

export async function createBankQuestion(formData:FormData) {
 const {supabase,user,role}=await actor();
 const courseId=String(formData.get('course_id')||'');
 const question=String(formData.get('question_text')||'').trim();
 const options=['option_a','option_b','option_c','option_d'].map(k=>String(formData.get(k)||'').trim());
 const correct=Number(formData.get('correct_option'));
 const marks=Number(formData.get('marks')||1);
 const topic=String(formData.get('topic')||'').trim();
 const chapter=String(formData.get('chapter_label')||'').trim();
 const explanation=String(formData.get('explanation')||'').trim();
 const conceptId=String(formData.get('concept_id')||'').trim()||null;
 const difficulty=String(formData.get('difficulty')||'medium');
 if(!courseId||question.length<2||options.some(x=>!x)||!Number.isInteger(correct)||correct<0||correct>3||!Number.isFinite(marks)||marks<=0||!['easy','medium','hard'].includes(difficulty)||topic.length>120||chapter.length>120||explanation.length>4000||(conceptId&&!/^[0-9a-f-]{36}$/i.test(conceptId))||!await canTeach(supabase,user.id,role,courseId)) redirect('/academic?error=bank_question');
 const {error}=await supabase.from('question_bank').insert({course_id:courseId,concept_id:conceptId,question_text:question,options,correct_option:correct,marks,topic,chapter_label:chapter,difficulty,explanation,created_by:user.id});
 redirect(error?'/academic?error=bank_question':'/academic?saved=bank_question');
}

export async function createQuizFromBank(formData:FormData) {
 const {supabase,user,role}=await actor();
 const courseId=String(formData.get('course_id')||'');
 const title=String(formData.get('title')||'').trim();
 const duration=Number(formData.get('duration_minutes')||30);
 const startRaw=String(formData.get('starts_at')||'');
 const endRaw=String(formData.get('ends_at')||'');
 const startsAt=startRaw?parseDhakaDateTime(startRaw):null;
 const endsAt=endRaw?parseDhakaDateTime(endRaw):null;
 const ids=formData.getAll('question_ids').map(x=>String(x)).filter(Boolean);
 if(!courseId||title.length<3||title.length>180||duration<1||duration>300||Boolean(startRaw)!==Boolean(endRaw)||(startRaw&&(!startsAt||!endsAt||new Date(endsAt)<=new Date(startsAt)))||ids.length<1||ids.length>50||new Set(ids).size!==ids.length||!await canTeach(supabase,user.id,role,courseId)) redirect('/academic?error=bank_quiz');
 const {data:bank,error:bankError}=await supabase.from('question_bank').select('id,question_text,options,correct_option,marks,concept_id').eq('course_id',courseId).in('id',ids);
 if(bankError||!bank||bank.length!==ids.length) redirect('/academic?error=bank_quiz');
 const byId=new Map(bank.map((q:any)=>[q.id,q]));
 const ordered=ids.map(id=>byId.get(id)).filter(Boolean) as any[];
 const total=ordered.reduce((sum,q)=>sum+Number(q.marks),0);
 const {data:quiz,error}=await supabase.from('quizzes').insert({course_id:courseId,title,duration_minutes:duration,starts_at:startsAt,ends_at:endsAt,total_marks:total,published:formData.get('published')==='on',created_by:user.id}).select('id').single();
 if(error||!quiz) redirect('/academic?error=bank_quiz');
 const inserted=await supabase.from('quiz_questions').insert(ordered.map((q:any,i:number)=>({quiz_id:quiz.id,question_bank_id:q.id,concept_id:q.concept_id,question_text:q.question_text,options:q.options,marks:q.marks,position:i+1}))).select('id');
 if(inserted.error||!inserted.data||inserted.data.length!==ordered.length){await supabase.from('quizzes').delete().eq('id',quiz.id);redirect('/academic?error=bank_quiz');}
 const keys=inserted.data.map((row:any,i:number)=>({question_id:row.id,correct_option:ordered[i].correct_option}));
 const saved=await supabase.from('quiz_answer_keys').insert(keys);
 if(saved.error){await supabase.from('quizzes').delete().eq('id',quiz.id);redirect('/academic?error=bank_quiz');}
 redirect('/academic?saved=bank_quiz');
}

export async function createWrittenExam(formData:FormData) {
 const {supabase,user,role}=await actor();
 const courseId=String(formData.get('course_id')||'');
 const title=String(formData.get('title')||'').trim();
 const instructions=String(formData.get('instructions')||'').trim();
 const start=String(formData.get('starts_at')||'');
 const end=String(formData.get('ends_at')||'');
 const raw=String(formData.get('questions_json')||'');
 if(!courseId||title.length<3||title.length>180||instructions.length>10000||raw.length>50000||(start&&end&&new Date(end)<=new Date(start))||!await canTeach(supabase,user.id,role,courseId)) redirect('/academic?error=written_exam');
 let questions:any[];
 try { questions=JSON.parse(raw); } catch { redirect('/academic?error=written_format'); }
 if(!Array.isArray(questions)||questions.length<1||questions.length>30||questions.some(q=>{
  if(!q||typeof q!=='object'||typeof q.question_text!=='string'||q.question_text.trim().length<2||q.question_text.length>5000||!['mcq','short_answer','long_answer'].includes(q.question_type)||!Number.isFinite(Number(q.marks))||Number(q.marks)<=0) return true;
  if(q.question_type==='mcq') return !Array.isArray(q.options)||q.options.length<2||q.options.length>6||q.options.some((x:any)=>typeof x!=='string'||!x.trim())||!Number.isInteger(q.correct_option)||q.correct_option<0||q.correct_option>=q.options.length;
  return (q.options&&q.options.length>0)||typeof q.model_answer!=='string'||q.model_answer.length>5000;
 })) redirect('/academic?error=written_format');
 const total=questions.reduce((sum,q)=>sum+Number(q.marks),0);
 const {data:exam,error}=await supabase.from('written_exams').insert({course_id:courseId,title,instructions,starts_at:start?new Date(start).toISOString():null,ends_at:end?new Date(end).toISOString():null,total_marks:total,published:formData.get('published')==='on',created_by:user.id}).select('id').single();
 if(error||!exam) redirect('/academic?error=written_exam');
 const rows=questions.map((q,i)=>({exam_id:exam.id,question_type:q.question_type,question_text:q.question_text.trim(),options:q.question_type==='mcq'?q.options:[],marks:Number(q.marks),position:i+1}));
 const inserted=await supabase.from('written_exam_questions').insert(rows).select('id');
 if(inserted.error||!inserted.data||inserted.data.length!==rows.length){await supabase.from('written_exams').delete().eq('id',exam.id);redirect('/academic?error=written_exam');}
 const keys=inserted.data.map((row:any,i:number)=>({question_id:row.id,correct_option:questions[i].question_type==='mcq'?questions[i].correct_option:null,model_answer:questions[i].question_type==='mcq'?'':String(questions[i].model_answer||'').trim()}));
 const saved=await supabase.from('written_exam_answer_keys').insert(keys);
 if(saved.error){await supabase.from('written_exams').delete().eq('id',exam.id);redirect('/academic?error=written_exam');}
 redirect('/academic?saved=written_exam');
}

export async function submitWrittenExam(formData:FormData) {
 const {supabase,user,role}=await actor();
 if(role!=='student') redirect('/portal');
 const examId=String(formData.get('exam_id')||'');
 const {data:exam}=await supabase.from('written_exams').select('id,starts_at,ends_at,published').eq('id',examId).eq('published',true).maybeSingle();
 const now=Date.now();
 if(!exam||(exam.starts_at&&now<new Date(exam.starts_at).getTime())||(exam.ends_at&&now>new Date(exam.ends_at).getTime())) redirect('/academic?error=written_unavailable');
 const {data:qs}=await supabase.from('written_exam_questions').select('id,question_type').eq('exam_id',examId);
 if(!qs?.length) redirect('/academic?error=written_submission');
 const answers:Record<string,string>={};
 for(const q of qs) {
  const value=String(formData.get('answer_'+q.id)||'').trim();
  if(!value||value.length>12000) redirect('/academic?error=written_answers');
  answers[q.id]=value;
 }
 const {error}=await supabase.from('written_exam_submissions').insert({exam_id:examId,student_id:user.id,answers,submitted_at:new Date().toISOString()});
 redirect(error?'/academic?error=written_duplicate':'/academic?saved=written_submission');
}

export async function gradeWrittenExam(formData:FormData) {
 const {supabase,user,role}=await actor();
 if(!['admin','teacher','staff'].includes(role)) redirect('/portal');
 const submissionId=String(formData.get('submission_id')||'');
 const score=Number(formData.get('score'));
 const feedback=String(formData.get('teacher_feedback')||'').trim();
 const {data:submission}=await supabase.from('written_exam_submissions').select('id,exam_id,exam:written_exams(course_id,total_marks)').eq('id',submissionId).maybeSingle();
 const exam:any=submission?.exam;
 if(!submission||!exam||!await canTeach(supabase,user.id,role,exam.course_id)||!Number.isFinite(score)||score<0||score>Number(exam.total_marks)||feedback.length>5000) redirect('/academic?error=written_grading');
 const {error}=await supabase.from('written_exam_submissions').update({score,teacher_feedback:feedback,graded_by:user.id,graded_at:new Date().toISOString()}).eq('id',submissionId);
 redirect(error?'/academic?error=written_grading':'/academic?saved=written_grade');
}
