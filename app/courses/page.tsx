import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
const catalogue = [
  {slug:'hsc-2027-chemistry',title:'HSC 2027 Chemistry',description:'Dedicated Chemistry course for HSC 2027 students.'},
  {slug:'hsc-2028-chemistry',title:'HSC 2028 Chemistry',description:'Dedicated Chemistry course for HSC 2028 students.'},
  {slug:'admission-chemistry',title:'Admission Chemistry',description:'Chemistry preparation for university admission candidates.'},
];
export default async function Courses(){
 const supabase=await createClient();
 const {data}=await supabase.from('courses').select('id,title,slug,description,price_bdt').eq('is_published',true).order('title');
 const published=new Map<string,{id:string;title:string;slug:string;description:string;price_bdt:number}>((data??[]).map((c:any)=>[c.slug,c] as [string,{id:string;title:string;slug:string;description:string;price_bdt:number}]));
 return <main className="portal-shell"><header className="portal-header"><Link className="brand" href="/">⚗ SANJAY KUMAR CHEMISTRY</Link><Link href="/login">Log in</Link></header><section className="portal-content"><span className="auth-kicker">COURSE CATALOGUE</span><h1>Choose your Chemistry course</h1><p className="muted">Exactly three programmes. Each course has a one-time fee of ৳700.</p><div className="portal-grid">{catalogue.map(c=>{const live=published.get(c.slug);return <article className="portal-card" key={c.slug}><h3>{c.title}</h3><p>{live?.description??c.description}</p><b>৳700</b><p>{live?<Link href={`/courses/${c.slug}`}>Course details →</Link>:<span className="status-pending">Enrollment not open yet</span>}</p></article>})}</div></section></main>
}
