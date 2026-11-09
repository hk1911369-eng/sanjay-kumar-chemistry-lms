'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const uuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
function parseMeasurements(raw: string) {
  if (raw.length > 30000) throw new Error('measurements');
  if (!raw.trim()) return [];
  const value = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > 100) throw new Error('measurements');
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('measurement');
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? '').trim(), valueText = String(row.value ?? '').trim(), unit = String(row.unit ?? '').trim();
    if (!name || name.length > 100 || !valueText || valueText.length > 100 || unit.length > 40) throw new Error('measurement');
    return { name, value: valueText, unit };
  });
}
export async function saveLabNotebook(formData: FormData) {
  const db = await createClient();
  const {data:{user}} = await db.auth.getUser();
  if (!user) redirect('/login');
  const {data:profile} = await db.from('profiles').select('role').eq('id',user.id).single();
  if (profile?.role !== 'student') redirect('/portal');
  const entryId=String(formData.get('entry_id')??''), choice=String(formData.get('lab_choice')??''), parts=choice?choice.split(':'):[], courseId=parts.length===2?parts[0]:String(formData.get('course_id')??''), labId=parts.length===2?parts[1]:String(formData.get('lab_id')??'');
  const title=String(formData.get('title')??'').trim(), hypothesis=String(formData.get('hypothesis')??'').trim();
  const procedureNotes=String(formData.get('procedure_notes')??'').trim(), observations=String(formData.get('observations')??'').trim();
  const conclusion=String(formData.get('conclusion')??'').trim(), intent=String(formData.get('intent')??'draft');
  let measurements: {name:string;value:string;unit:string}[];
  try { measurements=parseMeasurements(String(formData.get('measurements')??'')); } catch { redirect('/student/lab-notebook?error=measurements'); }
  if ((entryId&&!uuid.test(entryId))||!uuid.test(courseId)||!uuid.test(labId)||title.length<2||title.length>180||hypothesis.length>4000||procedureNotes.length>8000||observations.length>12000||conclusion.length>6000||!['draft','submit'].includes(intent)) redirect('/student/lab-notebook?error=invalid');
  const payload={title,hypothesis,procedure_notes:procedureNotes,observations,measurements,conclusion,status:intent==='submit'?'submitted':'draft',submitted_at:intent==='submit'?new Date().toISOString():null,...(intent==='submit'?{reviewed_by:null,reviewed_at:null,teacher_feedback:null,score:null}:{})};
  let error:any;
  if (entryId) {
    const result=await db.from('lab_notebook_entries').update(payload).eq('id',entryId).eq('student_id',user.id).select('id').maybeSingle();
    error=result.error||(!result.data?{message:'Notebook unavailable'}:null);
  } else {
    const result=await db.from('lab_notebook_entries').insert({...payload,course_id:courseId,lab_id:labId,student_id:user.id,status:'draft',submitted_at:null}).select('id').single();
    error=result.error;
    if (!error&&intent==='submit') {
      const submitted=await db.from('lab_notebook_entries').update({status:'submitted',submitted_at:new Date().toISOString()}).eq('id',result.data.id).eq('student_id',user.id).select('id').maybeSingle();
      error=submitted.error||(!submitted.data?{message:'Submission was not accepted'}:null);
    }
  }
  if(error) redirect('/student/lab-notebook?error=save');
  revalidatePath('/student/lab-notebook'); revalidatePath('/teacher/lab-notebooks'); revalidatePath('/student');
  redirect('/student/lab-notebook?saved=1');
}
export async function reviewLabNotebook(formData: FormData) {
  const db=await createClient(); const {data:{user}}=await db.auth.getUser(); if(!user) redirect('/login');
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();
  if(!['admin','teacher','staff'].includes(profile?.role??'')) redirect('/portal');
  const id=String(formData.get('entry_id')??''), decision=String(formData.get('decision')??''), feedback=String(formData.get('teacher_feedback')??'').trim();
  const scoreText=String(formData.get('score')??'').trim(), score=scoreText===''?null:Number(scoreText);
  if(!uuid.test(id)||!['returned','reviewed'].includes(decision)||!feedback||feedback.length>4000||(decision==='reviewed'&&(score===null||!Number.isFinite(score)||score<0||score>100))||(decision==='returned'&&score!==null)) redirect('/teacher/lab-notebooks?error=invalid');
  const {data,error}=await db.from('lab_notebook_entries').update({status:decision,teacher_feedback:feedback,score,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq('id',id).eq('status','submitted').select('id').maybeSingle();
  if(error||!data) redirect('/teacher/lab-notebooks?error=review');
  revalidatePath('/teacher/lab-notebooks'); revalidatePath('/student/lab-notebook'); revalidatePath('/student');
  redirect('/teacher/lab-notebooks?reviewed=1');
}
