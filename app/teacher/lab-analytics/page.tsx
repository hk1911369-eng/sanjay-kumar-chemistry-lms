import { redirect } from 'next/navigation';
import { PortalLayout } from '@/components/portal-layout';
import { createClient } from '@/lib/supabase/server';

const criteria = [
  { key: 'average_hypothesis', label: 'Hypothesis', maximum: 15 },
  { key: 'average_method', label: 'Method and variables', maximum: 20 },
  { key: 'average_observations_measurements', label: 'Observations and measurements', maximum: 25 },
  { key: 'average_analysis_interpretation', label: 'Analysis and interpretation', maximum: 20 },
  { key: 'average_conclusion_reflection', label: 'Conclusion and reflection', maximum: 15 },
  { key: 'average_safety_integrity', label: 'Safety and integrity', maximum: 5 },
] as const;

function displayNumber(value: unknown, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
  return Number(value).toFixed(digits);
}

function scorePercent(value: unknown, maximum: number) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return Math.max(0, Math.min(100, (Number(value) / maximum) * 100));
}

export default async function TeacherLabAnalyticsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db.from('profiles').select('role,full_name').eq('id', user.id).single();
  if (!['admin', 'teacher', 'staff'].includes(profile?.role ?? '')) redirect('/portal');

  const { data: assignments } = profile?.role === 'admin'
    ? await db.from('courses').select('id,title').is('archived_at', null)
    : await db.from('course_assignments').select('course_id,courses(id,title)').eq('teacher_id', user.id);

  const courses = (assignments ?? [])
    .map((row: any) => profile?.role === 'admin' ? row : row.courses)
    .filter(Boolean);
  const courseIds = courses.map((course: any) => course.id);

  const { data: metrics, error } = courseIds.length
    ? await db.from('lab_practical_analytics').select('*').in('course_id', courseIds).order('review_month', { ascending: false }).limit(120)
    : { data: [] as any[], error: null };

  const labIds = [...new Set((metrics ?? []).map((row: any) => row.lab_id))];
  const [{ data: labs }, { data: courseRows }] = await Promise.all([
    labIds.length
      ? db.from('virtual_lab_catalog').select('id,title').in('id', labIds)
      : Promise.resolve({ data: [] as any[] }),
    courseIds.length
      ? db.from('courses').select('id,title').in('id', courseIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const courseName = new Map((courseRows ?? []).map((row: any) => [row.id, row.title]));
  const labName = new Map((labs ?? []).map((row: any) => [row.id, row.title]));

  return (
    <PortalLayout
      role={profile!.role as 'admin' | 'teacher' | 'staff'}
      active="lab-analytics"
      title="Practical performance analytics"
      returnTo="/teacher/lab-analytics"
    >
      <section className="portal-content">
        <span className="auth-kicker">PRACTICAL LEARNING · COHORT INSIGHTS</span>
        <h1>Practical performance</h1>
        <p className="muted">
          A rolling 90-day view of practical reviews, grouped by course, experiment and Bangladesh calendar month.
          This report identifies teaching opportunities without exposing individual student scores.
        </p>

        <div className="portal-grid">
          <article className="portal-card">
            <span className="auth-kicker">PRIVACY THRESHOLD</span>
            <h2>5 distinct learners</h2>
            <p className="muted">A course and experiment month is shown only after at least five different students have review records in that group.</p>
          </article>
          <article className="portal-card">
            <span className="auth-kicker">REPORTING WINDOW</span>
            <h2>Last 90 days</h2>
            <p className="muted">New review rounds enter the report as they are recorded. Earlier periods roll out automatically.</p>
          </article>
          <article className="portal-card">
            <span className="auth-kicker">DATA SCOPE</span>
            <h2>Assigned courses</h2>
            <p className="muted">Teacher and staff rows are restricted by course-assignment RLS. Administrators can inspect all active courses.</p>
          </article>
        </div>

        {error && <p className="form-error">Practical analytics are temporarily unavailable. Please reload this page.</p>}
        {!error && !metrics?.length && (
          <article className="portal-card">
            <h2>No reportable cohorts yet</h2>
            <p className="muted">
              There is not yet a course and experiment month with five distinct learners reviewed in the last 90 days.
              Small groups stay hidden to reduce the risk of identifying individual students from aggregate results.
            </p>
          </article>
        )}

        {!!metrics?.length && (
          <>
            <h2>Course and experiment results</h2>
            <div className="portal-grid">
              {metrics.map((row: any, index: number) => (
                <article className="portal-card" key={row.course_id + '-' + row.lab_id + '-' + row.review_month + '-' + index}>
                  <span className="auth-kicker">
                    {new Date(row.review_month + 'T12:00:00+06:00').toLocaleDateString('en-GB', {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'Asia/Dhaka',
                    }).toUpperCase()}
                  </span>
                  <h2>{courseName.get(row.course_id) ?? 'Course'}</h2>
                  <h3>{labName.get(row.lab_id) ?? 'Virtual practical'}</h3>

                  <div className="portal-grid">
                    <div>
                      <span className="auth-kicker">LEARNERS</span>
                      <p><strong>{row.learners_reviewed}</strong> distinct students</p>
                    </div>
                    <div>
                      <span className="auth-kicker">REVIEWS</span>
                      <p><strong>{row.review_rounds}</strong> review rounds</p>
                    </div>
                    <div>
                      <span className="auth-kicker">AVERAGE</span>
                      <p><strong>{displayNumber(row.average_score)}</strong>/100</p>
                    </div>
                    <div>
                      <span className="auth-kicker">MEDIAN</span>
                      <p><strong>{displayNumber(row.median_score)}</strong>/100</p>
                    </div>
                  </div>

                  <p className="muted">
                    {row.graded_reviews} graded · {row.returned_reviews} returned · {displayNumber(row.return_rate_percent)}% return rate
                  </p>

                  <h4>Rubric strengths and teaching opportunities</h4>
                  <div className="auth-form">
                    {criteria.map((criterion) => {
                      const value = row[criterion.key];
                      const percent = scorePercent(value, criterion.maximum);
                      return (
                        <div key={criterion.key}>
                          <div className="portal-row-between">
                            <label>{criterion.label}</label>
                            <strong>{displayNumber(value)}/{criterion.maximum}</strong>
                          </div>
                          <progress
                            value={percent ?? 0}
                            max={100}
                            aria-label={criterion.label + ' cohort average'}
                          />
                          {percent !== null && <p className="muted">{displayNumber(percent)}% of available marks</p>}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
        <p className="muted small-note">
          Cohort averages are descriptive, not predictions of an individual student&apos;s ability. Do not use this report alone for high-stakes decisions.
        </p>
      </section>
    </PortalLayout>
  );
}
