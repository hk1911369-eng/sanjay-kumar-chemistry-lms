import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {PrintButton} from '@/components/print-button';

export const metadata={title:'Payment receipt | JMT Academy',robots:{index:false,follow:false}};

function money(amount:number){return '৳'+amount.toLocaleString('en-BD');}
export default async function PaymentReceipt({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:actor}=await db.from('profiles').select('role,full_name,student_code').eq('id',user.id).single();
 const {data:payment}=await db.from('manual_payment_submissions').select('id,student_id,course_id,provider,payment_kind,billing_period,delivery_mode,amount_bdt,transaction_id,status,created_at,reviewed_at,reviewed_by').eq('id',id).maybeSingle();
 if(!payment||payment.status!=='approved'||(payment.student_id!==user.id&&actor?.role!=='admin'))notFound();
 const [{data:student},{data:course},{data:academy}]=await Promise.all([
  db.from('profiles').select('full_name,student_code').eq('id',payment.student_id).maybeSingle(),
  db.from('courses').select('title').eq('id',payment.course_id).maybeSingle(),
  db.from('academy_settings').select('academy_name,contact_phone,contact_email,physical_address').eq('id',1).maybeSingle(),
 ]);
 const mode=payment.delivery_mode==='live_recorded'?'Live + Recorded':payment.delivery_mode==='recorded_only'?'Recorded only':payment.delivery_mode==='offline'?'Offline':'Legacy';
 const type=payment.payment_kind==='initial'?'Admission + first month':payment.payment_kind==='monthly'?'Monthly tuition':'Previous payment';
 const date=payment.reviewed_at?new Date(payment.reviewed_at).toLocaleString('en-GB',{timeZone:'Asia/Dhaka',dateStyle:'long',timeStyle:'short'}):'—';
 return <main className="portal-shell receipt-shell"><header className="portal-header no-print"><Link className="brand" href="/student">JMT ACADEMY</Link><Link href="/student#payments">Back to payment history</Link></header><section className="receipt-card"><div className="receipt-top"><div><span className="auth-kicker">OFFICIAL PAYMENT RECEIPT</span><h1>{academy?.academy_name||'JMT Academy'}</h1><p className="muted">Online & Offline Learning</p></div><span className="status-approved">PAYMENT VERIFIED</span></div><div className="receipt-amount"><span>Amount received</span><strong>{money(Number(payment.amount_bdt))}</strong></div><div className="receipt-grid"><div><span>Receipt reference</span><b>{payment.id.slice(0,8).toUpperCase()}</b></div><div><span>Verified on</span><b>{date}</b></div><div><span>Student</span><b>{student?.full_name||'Student'}</b></div><div><span>Student ID</span><b>{student?.student_code||'—'}</b></div><div><span>Course</span><b>{course?.title||'Course'}</b></div><div><span>Learning format</span><b>{mode}</b></div><div><span>Payment type</span><b>{type}</b></div><div><span>Billing period</span><b>{payment.billing_period||'—'}</b></div><div><span>Payment method</span><b>{String(payment.provider).toUpperCase()}</b></div><div><span>Transaction ID</span><b>{payment.transaction_id}</b></div></div><p className="receipt-note">This receipt confirms that JMT Academy has reviewed and approved the payment reference. Keep it for your records. It is not a bank or mobile-wallet transaction statement.</p>{academy?.contact_phone&&<p className="muted">Academy phone: {academy.contact_phone}</p>}{academy?.contact_email&&<p className="muted">Email: {academy.contact_email}</p>}{academy?.physical_address&&<p className="muted">Academy: {academy.physical_address}</p>}<div className="receipt-actions no-print"><PrintButton/><Link className="quiet-button" href="/student#payments">Return to dashboard</Link></div><footer>JMT Academy · Official verified payment receipt</footer></section></main>;
}
