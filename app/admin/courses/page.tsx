import Link from 'next/link';
import {redirect} from 'next/navigation';
import {PortalLayout} from '@/components/portal-layout';
import {createClient} from '@/lib/supabase/server';
import {saveAcademyCourse} from '@/app/actions/course-studio';
export default async function CourseStudio({searchParams}:{searchParams:Promise<{saved?:string;error?:string}>}){
 const p=await searchParams;const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');
 const {data:me}=await db.from('profiles').select('role').eq('id',user.id).single();if(me?.role!=='admin')redirect('/portal');
 const [{data:courses},{data:teachers},{data:assignments}]=await Promise.all([
 db.from('courses').select('id,title,programme_group,subjects,cover_image_path,teaching_method,schedule_text,delivery_modes,live_price_bdt,recorded_price_bdt,offline_price_bdt,enrollment_open,is_published,capacity').is('archived_at',null).order('programme_group').order('title'),
 db.from('profiles').select('id,full_name,role').in('role',['teacher','staff']).order('full_name'),
 db.from('course_assignments').select('course_id,teacher_id')]);
 const assigned=new Map<string,string[]>();for(const a of assignments??[])assigned.set(a.course_id,[...(assigned.get(a.course_id)??[]),a.teacher_id]);
 const photo=(path:string|null)=>path?db.storage.from('jmt-course-media').getPublicUrl(path).data.publicUrl:null;
 return <PortalLayout role="admin" active="courses" title="Course studio" returnTo="/admin/courses"><section className="portal-content course-studio">
 <div className="studio-heading"><div><span className="auth-kicker">JMT ACADEMY · ADMIN CONTROL</span><h1>Course studio</h1><p className="muted">Create courses, choose subjects, upload cover photos, set schedules and prices, and assign several teachers.</p></div><Link className="quiet-button" href="/admin">Back to admin</Link></div>
 {p.saved&&<p className="form-success">Course created and teacher team assigned.</p>}{p.error&&<p className="form-error">Could not save ({p.error}). Check the fields and try again.</p>}
 <article className="portal-card studio-create"><h2>Create a course</h2><form action={saveAcademyCourse} className="auth-form studio-form">
 <label>Course name<input name="title" required minLength={3} maxLength={140} placeholder="e.g. HSC 2027 Physics Complete Course"/></label>
 <div className="studio-two"><label>Programme group<select name="programme_group"><option>HSC 2027</option><option>HSC 2028</option><option>Admission Batch</option></select></label><label>Seat capacity (optional)<input name="capacity" type="number" min="1" placeholder="Unlimited"/></label></div>
 <label>Subjects (comma separated)<input name="subjects" required placeholder="Physics, Chemistry, Biology"/></label><label>Course description<textarea name="description" rows={3} maxLength={5000}/></label>
 <label>Course cover photo<input name="cover_image" type="file" accept="image/jpeg,image/png,image/webp"/></label>
 <div className="studio-two"><label>Teaching method<input name="teaching_method" placeholder="Live teaching, practice, doubt solving"/></label><label>Class days and schedule<input name="schedule_text" placeholder="Sun, Tue, Thu · 7:00 PM"/></label></div>
 <fieldset><legend>Available formats</legend><label className="toggle-label"><input type="checkbox" name="delivery_modes" value="live_recorded" defaultChecked/> Live classes + recordings</label><label className="toggle-label"><input type="checkbox" name="delivery_modes" value="recorded_only" defaultChecked/> Recorded-only (no live interaction)</label><label className="toggle-label"><input type="checkbox" name="delivery_modes" value="offline" defaultChecked/> Offline academy</label></fieldset>
 <div className="studio-prices"><label>Live + recorded price (৳)<input name="live_price_bdt" type="number" min="0" defaultValue="0"/></label><label>Recorded-only price (৳)<input name="recorded_price_bdt" type="number" min="0" defaultValue="0"/></label><label>Offline price (৳)<input name="offline_price_bdt" type="number" min="0" defaultValue="0"/></label></div>
 <fieldset><legend>Publication and enrolment</legend><label className="toggle-label"><input type="checkbox" name="is_published"/> Show on public website</label><label className="toggle-label"><input type="checkbox" name="enrollment_open"/> Accept enrolments</label></fieldset>
 <fieldset><legend>Teacher team (choose multiple)</legend>{(teachers??[]).map(t=><label className="toggle-label" key={t.id}><input type="checkbox" name="teacher_ids" value={t.id}/>{t.full_name||'Unnamed'} · {t.role}</label>)}{!teachers?.length&&<p className="muted">Add teacher accounts before assigning them.</p>}</fieldset>
 <button className="auth-submit">Create course</button></form></article>
 <h2>Existing courses ({courses?.length??0})</h2><div className="studio-course-list">{(courses??[]).map(c=><article className="portal-card studio-course" key={c.id}>{photo(c.cover_image_path)&&<img src={photo(c.cover_image_path)!} alt="" className="studio-cover"/>}<div><span className="auth-kicker">{c.programme_group}</span><h3>{c.title}</h3><p>{(c.subjects??[]).join(' · ')}</p><p>{c.teaching_method} · {c.schedule_text}</p><div className="studio-tags">{(c.delivery_modes??[]).map((m:string)=><span key={m}>{m==='live_recorded'?'Live + recorded':m==='recorded_only'?'Recorded only':'Offline'}</span>)}</div><p>Live ৳{c.live_price_bdt??'—'} · Recorded ৳{c.recorded_price_bdt??'—'} · Offline ৳{c.offline_price_bdt??'—'}</p><p>Teachers: {(teachers??[]).filter(t=>(assigned.get(c.id)??[]).includes(t.id)).map(t=>t.full_name).join(', ')||'None assigned'}</p><span className={c.is_published?'status-approved':'status-pending'}>{c.is_published?'Published':'Draft'}</span> <span className={c.enrollment_open?'status-approved':'status-pending'}>{c.enrollment_open?'Enrolment open':'Closed'}</span></div></article>)}</div>
 <p className="muted small-note">Course creation, cover uploads and multiple teacher assignment are included in this first course-studio release. Editing and online checkout are subsequent stages.</p>
 </section></PortalLayout>;
}
