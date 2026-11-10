import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';
import { saveVirtualLabCatalogItem } from '@/app/actions/virtual-labs';

type SearchParams = Promise<{ saved?: string; error?: string }>;

const SIMULATION_OPTIONS = [
  ['physics', 'Physics · Circuits and ray optics'],
  ['chemistry', 'Chemistry · Acid–base titration'],
  ['kinetics', 'Chemistry · Reaction kinetics'],
  ['biology', 'Biology · Inheritance'],
  ['maths', 'Mathematics · Linear functions'],
  ['ict', 'ICT · Binary converter'],
  ['quadratic', 'Higher Mathematics · Quadratic explorer'],
  ['pendulum', 'Physics · Double pendulum'],
  ['projectile', 'Physics · Projectile motion'],
  ['microscope', 'Biology · Virtual microscope'],
  ['wave-interference', 'Physics · Two-source wave interference'],
  ['equilibrium', 'Chemistry · Equilibrium and Le Chatelier'],
  ['cell-division', 'Biology · Mitosis and meiosis'],
  ['electrochemical-cell', 'Chemistry · Electrochemical cell (Nernst equation)'],
  ['photosynthesis', 'Biology · Photosynthesis and limiting factors'],
  ['spring-oscillator', 'Physics · Damped spring–mass oscillator'],
  ['dihybrid', 'Biology · Dihybrid inheritance and population genetics'],
  ['gas-laws', 'Chemistry · Ideal gas law explorer'],
] as const;

export default async function VirtualLabCatalogueAdmin({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') redirect('/portal');

  const [{ data: subjects }, { data: catalogue }] = await Promise.all([
    db.from('academic_subjects').select('id,name').order('name'),
    db.from('virtual_lab_catalog').select('id,lab_key,subject_id,title,summary,principle,simulation_type,is_published,sort_order').order('sort_order').order('title'),
  ]);

  return <PortalLayout role="admin" active="virtual-lab-catalogue" title="Simulation catalogue" returnTo="/admin/virtual-labs">
    <section className="portal-content">
      <span className="auth-kicker">ACADEMIC CONFIGURATION</span>
      <h1>Virtual lab catalogue</h1>
      <p className="muted">Map an interactive simulation template to any academic subject. Adding a subject does not require changing the course or subject model. New simulation behaviours still require a tested template implementation.</p>
      {params.saved && <p className="form-success">Simulation catalogue entry saved.</p>}
      {params.error && <p className="form-error">The entry could not be saved. Check the key, subject and field limits.</p>}
      <article className="portal-card">
        <h2>Add a simulation mapping</h2>
        <form action={saveVirtualLabCatalogItem} className="auth-form">
          <label>Unique simulation key<input name="lab_key" placeholder="higher-maths-quadratic-explorer" pattern="[a-z0-9][a-z0-9_-]{1,79}" minLength={2} maxLength={80} required/></label>
          <label>Academic subject<select name="subject_id" required defaultValue=""><option value="" disabled>Select subject</option>{(subjects ?? []).map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          <label>Simulation title<input name="title" minLength={2} maxLength={160} required/></label>
          <label>Short description<input name="summary" maxLength={500}/></label>
          <label>Learning principle<textarea name="principle" maxLength={2000} rows={3}/></label>
          <label>Interactive template<select name="simulation_type" required defaultValue="physics">{SIMULATION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Display order<input name="sort_order" type="number" min="0" max="10000" defaultValue="100"/></label>
          <label className="toggle-label"><input type="checkbox" name="is_published"/> Publish for enrolled students</label>
          <button className="auth-submit" type="submit">Save simulation mapping</button>
        </form>
      </article>
      <h2>Existing mappings</h2>
      {(catalogue ?? []).length === 0 ? <p className="muted">No simulation mappings configured.</p> : <div className="portal-grid">{(catalogue ?? []).map(lab => <article className="portal-card" key={lab.id}>
        <span className="auth-kicker">{lab.is_published ? 'PUBLISHED' : 'DRAFT'} · {lab.simulation_type.toUpperCase()}</span>
        <h3>{lab.title}</h3><p className="muted">{lab.lab_key}</p>
        <form action={saveVirtualLabCatalogItem} className="auth-form">
          <input type="hidden" name="lab_key" value={lab.lab_key}/>
          <label>Academic subject<select name="subject_id" defaultValue={lab.subject_id} required>{(subjects ?? []).map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          <label>Title<input name="title" defaultValue={lab.title} minLength={2} maxLength={160} required/></label>
          <label>Short description<input name="summary" defaultValue={lab.summary} maxLength={500}/></label>
          <label>Learning principle<textarea name="principle" defaultValue={lab.principle} maxLength={2000} rows={3}/></label>
          <label>Interactive template<select name="simulation_type" defaultValue={lab.simulation_type}>{SIMULATION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Display order<input name="sort_order" type="number" min="0" max="10000" defaultValue={lab.sort_order}/></label>
          <label className="toggle-label"><input type="checkbox" name="is_published" defaultChecked={lab.is_published}/> Published</label>
          <button className="auth-submit" type="submit">Update mapping</button>
        </form>
      </article>)}</div>}
    </section>
  </PortalLayout>;
}
