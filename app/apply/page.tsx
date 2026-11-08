export const metadata = { title: 'Apply', robots: { index: false, follow: false } };
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {submitCourseApplication} from '@/app/actions/course-application';
const labels:Record<string,string>={live_recorded:'Live classes + recordings',recorded_only:'Recorded-only access',offline:'Offline academy classes'};
export default async function ApplyPage({searchParams}:{searchParams:Promise<{course?:string;mode?:string;error?:string}>}){
 const p=await searchParams;const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login?next=/courses');
 const [{data:profile},{data:course}]=await Promise.all([
 db.from('profiles').select('full_name,phone,guardian_name,guardian_phone,college_name,location').eq('id',user.id).maybeSingle(),
 db.from('courses').select('id,title,slug,programme_group,delivery_modes,enrollment_open,is_published,live_price_bdt,recorded_price_bdt,offline_price_bdt').eq('slug',p.course??'').maybeSingle()]);
 if(!course?.is_published||!course.enrollment_open||!p.mode||!course.delivery_modes?.includes(p.mode))redirect('/courses');
 const price=p.mode==='live_recorded'?course.live_price_bdt:p.mode==='recorded_only'?course.recorded_price_bdt:course.offline_price_bdt;
 return <main className="auth-shell"><section className="auth-card application-card"><Link href={'/courses/'+course.slug} className="back-link">← Course details</Link><span className="auth-kicker">JMT ACADEMY · APPLICATION</span><h1>Apply for {course.title}</h1><p className="muted">{course.programme_group} · {labels[p.mode]??p.mode} · {price===null?'Contact academy':'৳'+price}</p><p className="muted">Submit your details. The academy team will review your application and contact you about admission and payment.</p>{p.error&&<p className="form-error">{p.error==='duplicate'?'You already have an open application for this course format.':'Please check your details and try again.'}</p>}
 <form action={submitCourseApplication} className="auth-form"><input type="hidden" name="course_id" value={course.id}/><input type="hidden" name="delivery_mode" value={p.mode}/>
 <label>Student full name<input name="full_name" defaultValue={profile?.full_name??''} minLength={2} maxLength={100} required/></label>
 <label>Student mobile number<input name="phone" defaultValue={profile?.phone??''} type="tel" pattern="(?:\+?88)?01[3-9][0-9]{8}" required/></label>
 <label>Guardian name<input name="guardian_name" defaultValue={profile?.guardian_name??''} maxLength={100}/></label>
 <label>Guardian mobile number<input name="guardian_phone" defaultValue={profile?.guardian_phone??''} type="tel" pattern="(?:\+?88)?01[3-9][0-9]{8}"/></label>
 <label>College / institution<input name="college_name" defaultValue={profile?.college_name??''} maxLength={180}/></label>
 <label>Area / location<input name="location" defaultValue={profile?.location??''} maxLength={180} placeholder="Your area, district"/></label>
 <label>Additional information<textarea name="student_note" rows={3} maxLength={1500} placeholder="Anything the academy should know?"/></label>
 <button className="auth-submit">Submit application</button></form><p className="muted small-note">Submitting an application does not activate course access or confirm payment. Access begins after the academy completes admission and payment review.</p></section></main>;
}
