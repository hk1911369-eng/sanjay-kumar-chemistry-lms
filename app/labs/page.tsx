import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { VirtualLabStudio } from '@/components/virtual-lab-studio';
import { createClient } from '@/lib/supabase/server';
import { billingMonthEnd, currentBangladeshBillingPeriod } from '@/lib/pricing';

export default async function VirtualLabsPage({ searchParams }: { searchParams: Promise<{ completed?: string; error?: string }> }) {
  const params = await searchParams;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'student') redirect('/portal');

  const periodEnd = billingMonthEnd(currentBangladeshBillingPeriod());
  const { data: enrollments, error } = await db.from('enrollments').select('course_id')
    .eq('student_id', user.id).eq('status', 'active')
    .eq('admission_fee_paid', true).gte('paid_through', periodEnd);
  if (error || !enrollments?.length) redirect('/student?learning_error=labs_access');

  const courseIds = [...new Set(enrollments.map(item => item.course_id))];
  const [{ data: courses }, { data: mappings }, { data: catalogue }] = await Promise.all([
    db.from('courses').select('id,title').in('id', courseIds).is('archived_at', null),
    db.from('course_subjects').select('course_id,subject_id,academic_subjects(id,name)')
      .in('course_id', courseIds),
    db.from('virtual_lab_catalog').select('id,lab_key,subject_id,title,summary,principle,simulation_type,academic_subjects(name)')
      .eq('is_published', true).order('sort_order').order('title'),
  ]);

  const subjectNames = new Map<string, string>();
  for (const mapping of mappings ?? []) {
    const subject = mapping.academic_subjects as unknown as { name: string } | null;
    if (subject?.name) subjectNames.set(mapping.subject_id, subject.name);
  }
  const subjects = [...subjectNames.values()].sort();

  const labCourses = (courses ?? []).map(course => ({
    id: course.id,
    title: course.title,
    subjectIds: (mappings ?? []).filter(mapping => mapping.course_id === course.id).map(mapping => mapping.subject_id),
  }));
  const enrolledSubjectIds = new Set((mappings ?? []).map(mapping => mapping.subject_id));
  const labCatalogue = (catalogue ?? []).flatMap(lab => {
    const subject = lab.academic_subjects as unknown as { name: string } | null;
    return subject && enrolledSubjectIds.has(lab.subject_id) ? [{ ...lab, lab_key: lab.lab_key, subject_name: subject.name }] : [];
  });

  return <PortalLayout role="student" active="labs" title="Virtual labs" returnTo="/student">
    <section className="portal-content virtual-labs-page">
      <span className="auth-kicker">JMT ACADEMY · EXPERIENTIAL LEARNING</span>
      <h1>Virtual labs & simulations</h1>
      <p className="muted">Interactive learning environments mapped to your enrolled academic subjects. Change variables, observe outcomes and understand the principle behind each result.</p>
      <p className="virtual-labs-subjects"><b>Your enrolled subjects:</b> {subjects.length ? subjects.join(' · ') : 'Your courses'}</p>
      {params.completed && <p className="form-success">Simulation recorded in your learning history.</p>}
      {params.error && <p className="form-error">The simulation could not be recorded. Check your course access and try again.</p>}
      <VirtualLabStudio courses={labCourses} catalogue={labCatalogue} />
    </section>
  </PortalLayout>;
}
