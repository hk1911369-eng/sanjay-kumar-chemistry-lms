'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {createClient} from '@/lib/supabase/server';
const modes=['live_recorded','recorded_only','offline'];
const money=(v:FormDataEntryValue|null)=>{if(v===null||String(v).trim()==='')return null;const n=Number(v);return Number.isSafeInteger(n)&&n>=0?n:-1};
export async function saveAcademyCourse(fd:FormData){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:me}=await db.from('profiles').select('role,is_active').eq('id',user.id).single();if (me?.is_active !== true || me.role !== 'admin') redirect('/portal');
 const id=String(fd.get('course_id')??'');const title=String(fd.get('title')??'').trim();const group=String(fd.get('programme_group')??'');
 const subjects=[...new Set(String(fd.get('subjects')??'').split(',').map(x=>x.trim()).filter(Boolean))].slice(0,20);
 const selected=fd.getAll('delivery_modes').map(String).filter(x=>modes.includes(x));
 const live=money(fd.get('live_price_bdt')),recorded=money(fd.get('recorded_price_bdt')),offline=money(fd.get('offline_price_bdt')),admission=money(fd.get('admission_fee_bdt'));
 const capacityText=String(fd.get('capacity')??'').trim();const capacity=capacityText?Number(capacityText):null;
 const teachers=[...new Set(fd.getAll('teacher_ids').map(String).filter(Boolean))];
 if(title.length<3||title.length>140||group.length<1||group.length>80||!subjects.length||subjects.some(subject=>subject.length>100)||!selected.length||[live,recorded,offline,admission].includes(-1)||(capacity!==null&&(!Number.isSafeInteger(capacity)||capacity<1))||(selected.includes('live_recorded')&&live===null)||(selected.includes('recorded_only')&&recorded===null)||(selected.includes('offline')&&offline===null))redirect('/admin/courses?error=invalid');
 let imagePath:string|undefined;const image=fd.get('cover_image');
 if(image instanceof File&&image.size){if(!['image/jpeg','image/png','image/webp'].includes(image.type)||image.size>5242880)redirect('/admin/courses?error=image');
 const ext=image.type==='image/png'?'png':image.type==='image/webp'?'webp':'jpg';imagePath=user.id+'/'+crypto.randomUUID()+'.'+ext;
 const {error}=await db.storage.from('jmt-course-media').upload(imagePath,image,{contentType:image.type});if(error)redirect('/admin/courses?error=upload');}
 const {data:existingCourse}=id?await db.from('courses').select('id,slug').eq('id',id).maybeSingle():{data:null};
 if(id&&!existingCourse)redirect('/admin/courses?error=not_found');
 const slug=existingCourse?.slug??(title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,65)+'-'+crypto.randomUUID().slice(0,8));
 const payload={title,slug,level:/^ssc\b/i.test(group)?'SSC':/^hsc\b/i.test(group)?'HSC':/admission|medical|engineering/i.test(group)?'ADMISSION':'OTHER',description:String(fd.get('description')??'').trim(),programme_group:group,subjects,
 teaching_method:String(fd.get('teaching_method')??'').trim(),schedule_text:String(fd.get('schedule_text')??'').trim(),delivery_modes:selected,
 live_price_bdt:live,recorded_price_bdt:recorded,offline_price_bdt:offline,monthly_fee_bdt:live??recorded??offline??0,admission_fee_bdt:admission??0,price_bdt:live??recorded??offline??0,
 capacity,enrollment_open:fd.get('enrollment_open')==='on',is_published:fd.get('is_published')==='on',...(imagePath?{cover_image_path:imagePath}:{})};
 const saved=id?await db.from('courses').update(payload).eq('id',id).select('id').maybeSingle():await db.from('courses').insert(payload).select('id').single();
 if(saved.error||!saved.data)redirect('/admin/courses?error=save');
 const courseId=saved.data.id;
 const subjectRowsBySlug=new Map<string,{name:string;slug:string;description:string}>();
 for(const name of subjects){
  const base=name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const slug=base||'subject-'+Array.from(name).map(char=>char.codePointAt(0)?.toString(16)??'0').join('-');
  if(!subjectRowsBySlug.has(slug))subjectRowsBySlug.set(slug,{name,slug,description:''});
 }
 const subjectRows=[...subjectRowsBySlug.values()];
 const {error:subjectError}=await db.from('academic_subjects').upsert(subjectRows,{onConflict:'slug',ignoreDuplicates:true});
 if(subjectError)redirect('/admin/courses?error=subjects');
 const {data:catalog,error:catalogError}=await db.from('academic_subjects').select('id,slug').in('slug',subjectRows.map(row=>row.slug));
 if(catalogError||!catalog||catalog.length!==subjectRows.length)redirect('/admin/courses?error=subjects');
 const subjectIdBySlug=new Map(catalog.map(row=>[row.slug,row.id]));
 const subjectLinks=subjectRows.map((row,index)=>({course_id:courseId,subject_id:subjectIdBySlug.get(row.slug)!,is_primary:index===0}));
 const {error:subjectLinkError}=await db.from('course_subjects').upsert(subjectLinks,{onConflict:'course_id,subject_id'});
 if(subjectLinkError)redirect('/admin/courses?error=subjects');
 const {data:oldLinks}=await db.from('course_subjects').select('subject_id').eq('course_id',courseId);
 const currentIds=new Set(subjectLinks.map(row=>row.subject_id));
 const staleIds=(oldLinks??[]).map(row=>row.subject_id).filter(id=>!currentIds.has(id));
 if(staleIds.length){const {error:staleError}=await db.from('course_subjects').delete().eq('course_id',courseId).in('subject_id',staleIds);if(staleError)redirect('/admin/courses?error=subjects');}

 const {data:valid}=teachers.length?await db.from('profiles').select('id').in('id',teachers).in('role',['teacher','staff']):{data:[] as {id:string}[]};
 if(teachers.length&&(valid?.length??0)!==teachers.length)redirect('/admin/courses?error=teachers');
 const {error:assignmentError}=await db.rpc('replace_course_assignments',{p_course_id:courseId,p_teacher_ids:teachers});
 if(assignmentError)redirect('/admin/courses?error=assignments');
 revalidatePath('/admin');revalidatePath('/admin/courses');revalidatePath('/courses');revalidatePath('/');revalidatePath('/courses/'+slug);
 redirect('/admin/courses?saved=1'+(id?'&updated=1':''));
}

export async function setCourseArchived(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: me } = await db.from('profiles').select('role,is_active').eq('id', user.id).single();
  if (me?.is_active !== true || me.role !== 'admin') redirect('/portal');

  const courseId = String(formData.get('course_id') ?? '');
  const archivedValue = String(formData.get('archived') ?? '');
  if (!courseId || !['true','false'].includes(archivedValue)) redirect('/admin/courses?error=archive');

  const { error } = await db.rpc('set_course_archived', {
    p_course_id: courseId,
    p_archived: archivedValue === 'true',
  });
  if (error) redirect('/admin/courses?error=archive');
  revalidatePath('/admin');
  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  revalidatePath('/');
  redirect('/admin/courses?archive_saved=1');
}
