import Link from 'next/link';
import {createPublicClient} from '@/lib/supabase/public';

export const revalidate = 300;

export default async function Contact(){
 const db=createPublicClient();const {data:settings}=await db.from('academy_settings').select('academy_name,contact_phone,whatsapp_phone,contact_email,physical_address,google_maps_url,facebook_url,support_hours').eq('id',1).maybeSingle();
 const whatsappDigits=(settings?.whatsapp_phone??'').replace(/\D/g,'').replace(/^0/,'880');
 const hasContact=!!(settings?.contact_phone||settings?.whatsapp_phone||settings?.contact_email||settings?.physical_address||settings?.facebook_url);
 return <main className="portal-shell"><header className="portal-header"><Link className="brand" href="/"><span className="logo">J</span> JMT ACADEMY</Link></header><section className="portal-content"><span className="auth-kicker">JMT ACADEMY · SUPPORT</span><h1>Contact and visit the academy</h1><p className="muted">For course applications, online learning and offline class enquiries, use the official details below.</p>
 {!hasContact?<p className="portal-card">Official phone, email and academy location have not yet been configured. The academy administrator can add them from the Academy Profile page.</p>:<div className="portal-grid">
 {settings?.contact_phone&&<article className="portal-card"><h3>Phone</h3><p><a href={'tel:'+settings.contact_phone}>{settings.contact_phone}</a></p></article>}
 {settings?.whatsapp_phone&&<article className="portal-card"><h3>WhatsApp</h3><p><a href={'https://wa.me/'+whatsappDigits} target="_blank" rel="noreferrer">Message JMT Academy</a></p></article>}
 {settings?.contact_email&&<article className="portal-card"><h3>Email</h3><p><a href={'mailto:'+settings.contact_email}>{settings.contact_email}</a></p></article>}
 {settings?.facebook_url&&<article className="portal-card"><h3>Facebook</h3><p><a href={settings.facebook_url} target="_blank" rel="noreferrer">Visit our Facebook page</a></p></article>}
 {settings?.support_hours&&<article className="portal-card"><h3>Support hours</h3><p>{settings.support_hours}</p></article>}
 {settings?.physical_address&&<article className="portal-card"><h3>Offline academy location</h3><p>{settings.physical_address}</p>{settings.google_maps_url&&<p><a href={settings.google_maps_url} target="_blank" rel="noreferrer">Open location in Google Maps →</a></p>}</article>}
 </div>}
 <p><Link href="/courses">Browse courses →</Link> · <Link href="/help">Help centre</Link></p></section></main>;
}
