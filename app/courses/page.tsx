import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ADMISSION_FEE_BDT, MONTHLY_FEE_BDT } from '@/lib/pricing';
const catalogue = [
  {slug:'hsc-2027-chemistry',title:'HSC 2027 Chemistry',description:'Dedicated Chemistry course for HSC 2027 students.'},
  {slug:'hsc-2028-chemistry',title:'HSC 2028 Chemistry',description:'Dedicated Chemistry course for HSC 2028 students.'},
  {slug:'admission-chemistry',title:'Admission Chemistry',description:'Chemistry preparation for university admission candidates.'},
];
export default async function Courses(){
 const supabase=await createClient();
 const {data}=await supabase.from('courses').select('id,title,slug,description,monthly_fee_bdt,admission_fee_bdt').eq('is_published',true).order('title');
 const published=new Map<string,{id:string;title:string;slug:string;description:string;monthly_fee_bdt:number;admission_fee_bdt:number}>((data??[]).map((c:any)=>[c.slug,c] as [string,{id:string;title:string;slug:string;description:string;monthly_fee_bdt:number;admission_fee_bdt:number}]));
 return <main className="portal-shell"><header className="portal-header"><Link className="brand" href="/">⚗ SANJAY KUMAR CHEMISTRY</Link><Link href="/login">Log in</Link></header><section className="portal-content"><span className="auth-kicker">COURSE CATALOGUE</span><h1>Choose your Chemistry course</h1><p className="muted">Monthly tuition: ৳{MONTHLY_FEE_BDT}. One-time admission fee: ৳{ADMISSION_FEE_BDT}. The first payment is ৳{MONTHLY_FEE_BDT + ADMISSION_FEE_BDT}.</p><div className="portal-grid">{catalogue.map(c=>{const live=published.get(c.slug);const monthly=live?.monthly_fee_bdt??MONTHLY_FEE_BDT;const admission=live?.admission_fee_bdt??ADMISSION_FEE_BDT;return <article className="portal-card" key={c.slug}><h3>{c.title}</h3><p>{live?.description??c.description}</p><b>৳{monthly} / month</b><p>Admission fee: ৳{admission} (one time)</p><p>{live?<Link href={`/courses/${c.slug}`}>Course details →</Link>:<span className="status-pending">Enrollment not open yet</span>}</p></article>})}</div></section></main>
}
