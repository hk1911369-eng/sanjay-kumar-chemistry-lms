import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { VirtualLabStudio } from '@/components/virtual-lab-studio';
import { createClient } from '@/lib/supabase/server';
import { billingMonthEnd, currentBangladeshBillingPeriod } from '@/lib/pricing';

export default async function VirtualLabsPage({ searchParams }: { searchParams: Promise<{ lab_completed?: string; lab_error?: string }> }) {
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
  const { data: courses } = await db.from('courses').select('id,title,subjects').in('id', courseIds);
  const subjects = [...new Set((courses ?? []).flatMap(course => course.subjects ?? []))]
    .filter((subject): subject is string => typeof subject === 'string' && subject.trim().length > 0)
    .sort();

  return <PortalLayout role="student" active="labs" title="Virtual labs" returnTo="/student">
    <section className="portal-content virtual-labs-page">
      <span className="auth-kicker">JMT ACADEMY · EXPERIENTIAL LEARNING</span>
      <h1>Virtual labs & simulations</h1>
      <p className="muted">Interactive learning environments for different subjects. Change variables, observe outcomes and understand the principle behind each result.</p>
      <p className="virtual-labs-subjects"><b>Your enrolled subjects:</b> {subjects.length ? subjects.join(' · ') : 'Your courses'}</p>
      {params.lab_completed && <p className="form-success">Simulation completion saved to your learning activity.</p>}
      {params.lab_error && <p className="form-error">The simulation activity could not be saved. Please choose an active paid course and try again.</p>}
      <VirtualLabStudio courses={courses ?? []} />
    </section>
  </PortalLayout>;
}
