import Link from 'next/link';
import {createPublicClient} from '@/lib/supabase/public';
import {CourseCatalogue} from '@/components/course-catalogue';

export const revalidate = 300;

export default async function Courses(){
 const db=createPublicClient();
 const {data}=await db.from('courses').select('id,title,slug,description,programme_group,subjects,cover_image_path,delivery_modes,live_price_bdt,recorded_price_bdt,offline_price_bdt,admission_fee_bdt,teaching_method,schedule_text,enrollment_open').eq('is_published',true).is('archived_at',null).order('sort_order').order('title');
 const courses=(data??[]).map(c=>({...c,cover_image_url:c.cover_image_path?db.storage.from('jmt-course-media').getPublicUrl(c.cover_image_path,{transform:{width:960,height:540,resize:'cover',quality:80}}).data.publicUrl:null}));
 return <main className="portal-shell"><header className="portal-header"><Link className="brand" href="/">JMT ACADEMY</Link><Link href="/login">Log in</Link></header><section className="portal-content catalogue-page"><span className="auth-kicker">JMT ACADEMY · COURSE CATALOGUE</span><h1>Find your learning programme</h1><p className="muted">Search by course, subject or topic. Filter by programme and choose live, recorded or offline learning.</p><CourseCatalogue courses={courses as any}/></section></main>;
}
