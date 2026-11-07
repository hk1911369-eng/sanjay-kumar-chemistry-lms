import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ADMISSION_FEE_BDT, MONTHLY_FEE_BDT } from '@/lib/pricing';
const approved = {
 'hsc-2027-chemistry': {title:'HSC 2027 Chemistry',description:'Dedicated Chemistry course for HSC 2027 students.'},
 'hsc-2028-chemistry': {title:'HSC 2028 Chemistry',description:'Dedicated Chemistry course for HSC 2028 students.'},
 'admission-chemistry': {title:'Admission Chemistry',description:'Chemistry preparation for university admission candidates.'},
};
export default async function CourseDetails({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const fallback=approved[slug as keyof typeof approved]; if(!fallback) return <main className="portal-shell"><section className="portal-content"><h1>Course not found</h1><Link href="/courses">Back to courses</Link></section></main>;
 const supabase=await createClient();
 const {data:course}=await supabase.from('courses').select('id,title,description,monthly_fee_bdt,admission_fee_bdt,is_published').eq('slug',slug).maybeSingle();
 const isOpen=Boolean(course?.is_published);
 const {data:{user}}=await supabase.auth.getUser();
 const {data:enrollment}=user&&course?await supabase.from('enrollments').select('status,admission_fee_paid,paid_through').eq('student_id',user.id).eq('course_id',course.id).maybeSingle():{data:null};
 const monthly=Number(course?.monthly_fee_bdt??MONTHLY_FEE_BDT);
 const admission=Number(course?.admission_fee_bdt??ADMISSION_FEE_BDT);
 return <main className="portal-shell"><header className="portal-header"><Link className="brand" href="/">⚗ SANJAY KUMAR CHEMISTRY</Link><Link href="/courses">All courses</Link></header><section className="portal-content"><span className="auth-kicker">CHEMISTRY PROGRAM</span><h1>{course?.title??fallback.title}</h1><p className="muted">{course?.description??fallback.description}</p><div className="portal-card" style={{maxWidth:650}}><h2>৳{monthly.toLocaleString('en-BD')} per month</h2><p>One-time admission fee: <b>৳{admission.toLocaleString('en-BD')}</b></p><p>First payment total: <b>৳{(monthly+admission).toLocaleString('en-BD')}</b> (admission + first month).</p>{isOpen?<><p>Payments are submitted manually and reviewed by an Admin. Course lessons unlock after payment approval and remain available while the current month's tuition is paid.</p>{enrollment?.status==='active'?<Link className="btn" href={`/student`}>Open student dashboard</Link>:<Link className="btn" href={user?'/student':'/register'}>{user?'Continue to student dashboard':'Register to enroll'}</Link>}</>:<><p className="muted">Enrollment for this course has not opened yet. The course will become available after the Admin publishes it.</p><span className="status-pending">Not open for enrollment</span></>}</div></section></main>
}
