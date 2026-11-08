import Link from 'next/link';
import {redirect} from 'next/navigation';
import {PortalLayout} from '@/components/portal-layout';
import {createClient} from '@/lib/supabase/server';
import {saveAcademyProfile} from '@/app/actions/academy-settings';

export default async function AcademySettings({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
 const params=await searchParams;const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:actor}=await db.from('profiles').select('role').eq('id',user.id).single();if(actor?.role!=='admin')redirect('/portal');
 const {data:settings}=await db.from('academy_settings').select('academy_name,tagline,contact_phone,whatsapp_phone,contact_email,physical_address,google_maps_url,facebook_url,support_hours').eq('id',1).maybeSingle();
 return <PortalLayout role="admin" active="academy-settings" title="Academy profile" returnTo="/admin/settings"><section className="portal-content">
 <div className="studio-heading"><div><span className="auth-kicker">JMT ACADEMY · PUBLIC PROFILE</span><h1>Academy details and location</h1><p className="muted">Set the official contact details shown to students and families. These details also help students understand where offline classes take place.</p></div><Link className="quiet-button" href="/admin">Back to admin</Link></div>
 {params.saved&&<p className="form-success">Academy profile updated.</p>}{params.error&&<p className="form-error">{params.error==='invalid'?'Check the phone numbers, email address, Facebook page, map link and text lengths.':'Could not save. Confirm the latest academy profile database migration has been applied.'}</p>}
 <form action={saveAcademyProfile} className="auth-form portal-card">
 <label>Academy name<input name="academy_name" defaultValue={settings?.academy_name??'JMT Academy'} required minLength={2} maxLength={100}/></label>
 <label>Tagline<input name="tagline" defaultValue={settings?.tagline??'Online & Offline Learning'} maxLength={180}/></label>
 <div className="studio-two"><label>Official phone number<input name="contact_phone" type="tel" defaultValue={settings?.contact_phone??''} placeholder="01XXXXXXXXX"/></label><label>WhatsApp number<input name="whatsapp_phone" type="tel" defaultValue={settings?.whatsapp_phone??''} placeholder="01XXXXXXXXX"/></label></div>
 <label>Official email<input name="contact_email" type="email" defaultValue={settings?.contact_email??''} placeholder="support@example.com"/></label>
 <label>Facebook page link<input name="facebook_url" type="url" defaultValue={settings?.facebook_url??''} placeholder="https://www.facebook.com/your-page/"/></label>
 <label>Full academy address<input name="physical_address" defaultValue={settings?.physical_address??''} maxLength={500} placeholder="Building, road, area, upazila, district"/></label>
 <label>Google Maps link<input name="google_maps_url" type="url" defaultValue={settings?.google_maps_url??''} placeholder="https://maps.google.com/..."/></label>
 <label>Office and support hours<input name="support_hours" defaultValue={settings?.support_hours??''} maxLength={180} placeholder="Saturday–Thursday, 9:00 AM–6:00 PM"/></label>
 <p className="muted small-note">Only publish contact details and locations that JMT Academy controls. These details appear on the public Contact page.</p>
 <button className="auth-submit">Save academy profile</button>
 </form>
 </section></PortalLayout>;
}
