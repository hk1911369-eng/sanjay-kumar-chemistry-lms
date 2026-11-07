'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
const groups=['HSC 2027','HSC 2028','Admission Batch'];
const modes=['live_recorded','recorded_only','offline'];
const money=(v:FormDataEntryValue|null)=>{if(v===null||String(v).trim()==='')return null;const n=Number(v);return Number.isSafeInteger(n)&&n>=0?n:-1};
export async function saveAcademyCourse(fd:FormData){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:me}=await db.from('profiles').select('role').eq('id',user.id).single();if(me?.role!=='admin')redirect('/portal');
 const id=String(fd.get('course_id')??'');const title=String(fd.get('title')??'').trim();const group=String(fd.get('programme_group')??'');
 const subjects=String(fd.get('subjects')??'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,20);
 const selected=fd.getAll('delivery_modes').map(String).filter(x=>modes.includes(x));
 const live=money(fd.get('live_price_bdt')),recorded=money(fd.get('recorded_price_bdt')),offline=money(fd.get('offline_price_bdt'));
 const capacityText=String(fd.get('capacity')??'').trim();const capacity=capacityText?Number(capacityText):null;
 const teachers=[...new Set(fd.getAll('teacher_ids').map(String).filter(Boolean))];
 if(title.length<3||title.length>140||!groups.includes(group)||!subjects.length||!selected.length||[live,recorded,offline].includes(-1)||(capacity!==null&&(!Number.isSafeInteger(capacity)||capacity<1))||(selected.includes('live_recorded')&&live===null)||(selected.includes('recorded_only')&&recorded===null)||(selected.includes('offline')&&offline===null))redirect('/admin/courses?error=invalid');
 let imagePath:string|undefined;const image=fd.get('cover_image');
 if(image instanceof File&&image.size){if(!['image/jpeg','image/png','image/webp'].includes(image.type)||image.size>5242880)redirect('/admin/courses?error=image');
 const ext=image.type==='image/png'?'png':image.type==='image/webp'?'webp':'jpg';imagePath=user.id+'/'+crypto.randomUUID()+'.'+ext;
 const {error}=await db.storage.from('jmt-course-media').upload(imagePath,image,{contentType:image.type});if(error)redirect('/admin/courses?error=upload');}
 const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,65)+'-'+crypto.randomUUID().slice(0,8);
 const payload={title,slug,level:group==='Admission Batch'?'ADMISSION':'HSC',description:String(fd.get('description')??'').trim(),programme_group:group,subjects,
 teaching_method:String(fd.get('teaching_method')??'').trim(),schedule_text:String(fd.get('schedule_text')??'').trim(),delivery_modes:selected,
 live_price_bdt:live,recorded_price_bdt:recorded,offline_price_bdt:offline,monthly_fee_bdt:live??recorded??offline??0,admission_fee_bdt:0,price_bdt:live??recorded??offline??0,
 capacity,enrollment_open:fd.get('enrollment_open')==='on',is_published:fd.get('is_published')==='on',...(imagePath?{cover_image_path:imagePath}:{})};
 const saved=id?await db.from('courses').update(payload).eq('id',id).select('id').maybeSingle():await db.from('courses').insert(payload).select('id').single();
 if(saved.error||!saved.data)redirect('/admin/courses?error=save');
 const courseId=saved.data.id;const {data:valid}=teachers.length?await db.from('profiles').select('id').in('id',teachers).in('role',['teacher','staff']):{data:[] as {id:string}[]};
 if(teachers.length&&(valid?.length??0)!==teachers.length)redirect('/admin/courses?error=teachers');
 const {error:delError}=await db.from('course_assignments').delete().eq('course_id',courseId);if(delError)redirect('/admin/courses?error=assignments');
 if(teachers.length){const {error}=await db.from('course_assignments').insert(teachers.map(teacher_id=>({course_id:courseId,teacher_id,assigned_by:user.id})));if(error)redirect('/admin/courses?error=assignments');}
 revalidatePath('/admin');revalidatePath('/admin/courses');revalidatePath('/courses');revalidatePath('/');
 redirect('/admin/courses?saved=1');
}
