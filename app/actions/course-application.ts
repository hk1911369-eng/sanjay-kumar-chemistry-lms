'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
import {normalizeBangladeshMobile} from '@/lib/validation';

export async function submitCourseApplication(fd:FormData){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(!user)redirect('/login?next=/courses');
 const courseId=String(fd.get('course_id')??'').trim();
 const mode=String(fd.get('delivery_mode')??'');
 const fullName=String(fd.get('full_name')??'').trim();
 const rawPhone=String(fd.get('phone')??'').trim();
 const phone=normalizeBangladeshMobile(rawPhone);
 const guardianName=String(fd.get('guardian_name')??'').trim();
 const rawGuardian=String(fd.get('guardian_phone')??'').trim();
 const guardianPhone=rawGuardian?normalizeBangladeshMobile(rawGuardian):null;
 const college=String(fd.get('college_name')??'').trim();
 const location=String(fd.get('location')??'').trim();
 const note=String(fd.get('student_note')??'').trim();
 if(!courseId||!['live_recorded','recorded_only','offline'].includes(mode)||fullName.length<2||fullName.length>100||!phone||(rawGuardian&&!guardianPhone)||guardianName.length>100||college.length>180||location.length>180||note.length>1500)redirect('/apply?error=invalid');
 const {data:course}=await db.from('courses').select('id,slug,is_published,enrollment_open,delivery_modes').eq('id',courseId).maybeSingle();
 if(!course?.is_published||!course.enrollment_open||!course.delivery_modes?.includes(mode))redirect('/courses');
 const {error}=await db.from('course_applications').insert({student_id:user.id,course_id:courseId,delivery_mode:mode,full_name:fullName,phone,guardian_name:guardianName||null,guardian_phone:guardianPhone,college_name:college||null,location:location||null,student_note:note||null});
 if(error)redirect('/apply?error='+(error.code==='23505'?'duplicate':'save'));
 revalidatePath('/student');revalidatePath('/admin/applications');
 redirect('/student?application_submitted=1');
}

export async function reviewCourseApplication(fd:FormData){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='admin')redirect('/portal');
 const id=String(fd.get('application_id')??'');const status=String(fd.get('status')??'');const note=String(fd.get('admin_note')??'').trim();
 if(!id||!['submitted','reviewing','accepted','rejected'].includes(status)||note.length>1000)redirect('/admin/applications?error=invalid');
 const {error}=await db.from('course_applications').update({status,admin_note:note||null,reviewed_by:user.id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
 if(error)redirect('/admin/applications?error=save');
 revalidatePath('/admin/applications');revalidatePath('/student');
 redirect('/admin/applications?saved=1');
}
