'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { normalizeBangladeshMobile } from '@/lib/validation';

export async function saveAcademyProfile(formData: FormData) {
  const db=await createClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect('/login');
  const {data:actor}=await db.from('profiles').select('role').eq('id',user.id).single();
  if(actor?.role!=='admin') redirect('/portal');

  const academyName=String(formData.get('academy_name')??'').trim();
  const tagline=String(formData.get('tagline')??'').trim();
  const phoneRaw=String(formData.get('contact_phone')??'').trim();
  const whatsappRaw=String(formData.get('whatsapp_phone')??'').trim();
  const email=String(formData.get('contact_email')??'').trim().toLowerCase();
  const address=String(formData.get('physical_address')??'').trim();
  const mapUrl=String(formData.get('google_maps_url')??'').trim();
  const hours=String(formData.get('support_hours')??'').trim();
  const phone=phoneRaw?normalizeBangladeshMobile(phoneRaw):null;
  const whatsapp=whatsappRaw?normalizeBangladeshMobile(whatsappRaw):null;
  let validMapUrl=true;
  if(mapUrl){try{const parsed=new URL(mapUrl);validMapUrl=parsed.protocol==='https:';}catch{validMapUrl=false;}}
  if(academyName.length<2||academyName.length>100||tagline.length>180
    ||(phoneRaw&&!phone)||(whatsappRaw&&!whatsapp)
    ||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ||address.length>500||hours.length>180||!validMapUrl){
    redirect('/admin/settings?error=invalid');
  }
  const {error}=await db.from('academy_settings').upsert({
    id:1,academy_name:academyName,tagline:tagline||'Online & Offline Learning',
    contact_phone:phone,whatsapp_phone:whatsapp,contact_email:email||null,
    physical_address:address||null,google_maps_url:mapUrl||null,
    support_hours:hours||null,updated_by:user.id,updated_at:new Date().toISOString(),
  },{onConflict:'id'});
  if(error) redirect('/admin/settings?error=save');
  revalidatePath('/');revalidatePath('/about');revalidatePath('/contact');revalidatePath('/courses');
  redirect('/admin/settings?saved=1');
}
